const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');

const router = express.Router();
router.use(auth);

// Apenas ANALISTA acessa fichas
router.use(requirePerfil('ANALISTA'));

const parametroSchema = z.object({
  nome: z.string().min(1),
  valor: z.string().min(1),
  conforme: z.boolean(),
});

const fichaSchema = z.object({
  lote: z.string().min(1, 'Lote obrigatório'),
  fornecedor: z.string().min(1, 'Fornecedor obrigatório'),
  parametros: z.array(parametroSchema).min(1, 'Adicione ao menos um parâmetro'),
  statusGlobal: z.enum(['CONFORME', 'NAO_CONFORME']),
});

function buildDateRange(inicio, fim) {
  if (!inicio && !fim) return undefined;
  const range = {};
  if (inicio) range.gte = new Date(inicio);
  if (fim) {
    const d = new Date(fim);
    d.setHours(23, 59, 59, 999);
    range.lte = d;
  }
  return range;
}

router.get('/', async (req, res) => {
  try {
    const { status, dataInicio, dataFim, pagina = '1', limite = '10' } = req.query;
    const where = {};
    if (status) where.statusGlobal = status;
    const dateRange = buildDateRange(dataInicio, dataFim);
    if (dateRange) where.createdAt = dateRange;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    const take = parseInt(limite);

    const [fichas, total] = await Promise.all([
      prisma.fichaEmbalagem.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.fichaEmbalagem.count({ where }),
    ]);

    return res.json({ fichas, total, pagina: parseInt(pagina), limite: take });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar fichas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = fichaSchema.parse(req.body);
    const ficha = await prisma.fichaEmbalagem.create({
      data: {
        lote: data.lote,
        fornecedor: data.fornecedor,
        parametros: JSON.stringify(data.parametros),
        statusGlobal: data.statusGlobal,
      },
    });
    return res.status(201).json(ficha);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao criar ficha' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = fichaSchema.parse(req.body);
    const ficha = await prisma.fichaEmbalagem.update({
      where: { id },
      data: {
        lote: data.lote,
        fornecedor: data.fornecedor,
        parametros: JSON.stringify(data.parametros),
        statusGlobal: data.statusGlobal,
      },
    });
    return res.json(ficha);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ficha não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar ficha' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.fichaEmbalagem.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ficha não encontrada' });
    return res.status(500).json({ error: 'Erro ao excluir ficha' });
  }
});

// ─── PDF Generation ───
// FIX: pdfFonts é exportado diretamente como objeto VFS, não como { pdfMake: { vfs: ... } }
router.get('/:id/pdf', async (req, res) => {
  try {
    const ficha = await prisma.fichaEmbalagem.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!ficha) return res.status(404).json({ error: 'Ficha não encontrada' });

    const parametros = JSON.parse(ficha.parametros);
    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts; // VFS exportado direto

    const emissao = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const statusLabel = ficha.statusGlobal === 'CONFORME' ? 'CONFORME' : 'NAO CONFORME';
    const statusColor = ficha.statusGlobal === 'CONFORME' ? '#16a34a' : '#dc2626';

    const tableBody = [
      [
        { text: 'Parâmetro', bold: true, fillColor: '#065f46', color: '#ffffff', fontSize: 9, alignment: 'center' },
        { text: 'Valor', bold: true, fillColor: '#065f46', color: '#ffffff', fontSize: 9, alignment: 'center' },
        { text: 'Status', bold: true, fillColor: '#065f46', color: '#ffffff', fontSize: 9, alignment: 'center' },
      ],
      ...parametros.map((p, i) => [
        { text: p.nome, fontSize: 9, fillColor: i % 2 === 0 ? '#f0fdf4' : '#ffffff' },
        { text: p.valor, fontSize: 9, alignment: 'center', fillColor: i % 2 === 0 ? '#f0fdf4' : '#ffffff' },
        {
          text: p.conforme ? 'Conforme' : 'Nao Conforme',
          fontSize: 9,
          bold: true,
          alignment: 'center',
          color: p.conforme ? '#16a34a' : '#dc2626',
          fillColor: i % 2 === 0 ? '#f0fdf4' : '#ffffff',
        },
      ]),
    ];

    const docDefinition = {
      pageMargins: [40, 60, 40, 60],
      content: [
        // Cabeçalho
        {
          stack: [
            { text: 'INDUSTRIA ERVATEIRA VERDELANDIA LTDA', style: 'empresa' },
            { text: 'FORQSE001 - Ficha de Liberacao de Embalagens', style: 'subtitulo' },
          ],
          margin: [0, 0, 0, 4],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },

        // Informações da ficha
        {
          columns: [
            {
              stack: [
                { text: [{ text: 'Lote: ', bold: true }, ficha.lote] },
                { text: [{ text: 'Fornecedor: ', bold: true }, ficha.fornecedor] },
              ],
            },
            {
              text: `Emissao: ${emissao}`,
              alignment: 'right',
              fontSize: 9,
              color: '#6b7280',
            },
          ],
          margin: [0, 0, 0, 14],
          fontSize: 10,
        },

        // Tabela de parâmetros
        { text: 'Parametros Avaliados', style: 'secao' },
        {
          table: {
            widths: ['*', 'auto', 'auto'],
            headerRows: 1,
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },

        // Status global
        {
          text: `Status Global: ${statusLabel}`,
          fontSize: 13,
          bold: true,
          color: statusColor,
          alignment: 'center',
          margin: [0, 4, 0, 0],
        },
      ],
      styles: {
        empresa: { fontSize: 15, bold: true, alignment: 'center' },
        subtitulo: { fontSize: 11, alignment: 'center', color: '#374151', margin: [0, 2, 0, 0] },
        secao: { fontSize: 11, bold: true, color: '#065f46', margin: [0, 0, 0, 6] },
      },
    };

    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ficha-${ficha.lote}.pdf`);
      res.end(buffer);
    });
  } catch (err) {
    console.error('PDF error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
  }
});

module.exports = router;
