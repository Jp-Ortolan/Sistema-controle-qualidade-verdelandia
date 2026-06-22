const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');
const { auditLog } = require('../lib/logger');
const { buildDateRange } = require('../lib/utils');

const router = express.Router();
router.use(auth);
router.use(requirePerfil('ANALISTA', 'COMPRAS'));

const paramSchema = z.object({
  resultado: z.string(),
  unidade: z.string(),
  padrao: z.string(),
  unidadePadrao: z.string(),
  conforme: z.boolean(),
});

const fichaSchema = z.object({
  fornecedor: z.string()
    .min(3, 'Fornecedor deve ter pelo menos 3 caracteres')
    .max(100, 'Fornecedor deve ter no máximo 100 caracteres'),
  parametros: z.array(paramSchema).length(4, 'São necessários exatamente 4 parâmetros'),
  observacoes: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
  statusGlobal: z.enum(['CONFORME', 'NAO_CONFORME']),
});

router.get('/', async (req, res) => {
  try {
    const { status, dataInicio, dataFim, pagina = '1', limite = '10' } = req.query;
    const where = {};
    if (status) where.statusGlobal = status;
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.createdAt = dr;
    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    const take = parseInt(limite);
    const [fichas, total] = await Promise.all([
      prisma.fichaEmbalagem.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.fichaEmbalagem.count({ where }),
    ]);
    return res.json({ fichas, total, pagina: parseInt(pagina), limite: take });
  } catch { return res.status(500).json({ error: 'Erro ao buscar fichas' }); }
});

router.post('/', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const data = fichaSchema.parse(req.body);
    const ficha = await prisma.fichaEmbalagem.create({
      data: {
        fornecedor: data.fornecedor,
        parametros: JSON.stringify(data.parametros),
        observacoes: data.observacoes ?? null,
        statusGlobal: data.statusGlobal,
      },
    });
    auditLog(req, 'CRIAR', 'FICHA', ficha.id, { fornecedor: ficha.fornecedor, status: ficha.statusGlobal });
    return res.status(201).json(ficha);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao criar ficha' });
  }
});

router.put('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = fichaSchema.parse(req.body);
    const ficha = await prisma.fichaEmbalagem.update({
      where: { id },
      data: {
        fornecedor: data.fornecedor,
        parametros: JSON.stringify(data.parametros),
        observacoes: data.observacoes ?? null,
        statusGlobal: data.statusGlobal,
      },
    });
    auditLog(req, 'EDITAR', 'FICHA', ficha.id, { fornecedor: ficha.fornecedor, status: ficha.statusGlobal });
    return res.json(ficha);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ficha não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar ficha' });
  }
});

router.delete('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.fichaEmbalagem.delete({ where: { id } });
    auditLog(req, 'EXCLUIR', 'FICHA', id, null);
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ficha não encontrada' });
    return res.status(500).json({ error: 'Erro ao excluir ficha' });
  }
});

router.get('/:id/pdf', async (req, res) => {
  try {
    const ficha = await prisma.fichaEmbalagem.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!ficha) return res.status(404).json({ error: 'Ficha não encontrada' });

    const parametros = JSON.parse(ficha.parametros);
    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts;

    const emissao = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const NOMES = ['Densidade', 'Dimensões', 'Visual / Impressões', 'Código de Barras'];
    const statusLabel = ficha.statusGlobal === 'CONFORME' ? 'CONFORME' : 'NÃO CONFORME';
    const statusColor = ficha.statusGlobal === 'CONFORME' ? '#16a34a' : '#dc2626';

    const tabelaBody = [
      [
        { text: 'Parâmetro', bold: true, fillColor: '#065f46', color: '#fff', fontSize: 8, alignment: 'center' },
        { text: 'Resultado', bold: true, fillColor: '#065f46', color: '#fff', fontSize: 8, alignment: 'center' },
        { text: 'UN', bold: true, fillColor: '#065f46', color: '#fff', fontSize: 8, alignment: 'center' },
        { text: 'Padrão', bold: true, fillColor: '#065f46', color: '#fff', fontSize: 8, alignment: 'center' },
        { text: 'UN', bold: true, fillColor: '#065f46', color: '#fff', fontSize: 8, alignment: 'center' },
        { text: 'Status', bold: true, fillColor: '#065f46', color: '#fff', fontSize: 8, alignment: 'center' },
      ],
      ...parametros.map((p, i) => {
        const bg = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
        const sColor = p.conforme ? '#16a34a' : '#dc2626';
        return [
          { text: NOMES[i] ?? `Parâmetro ${i + 1}`, fontSize: 8, fillColor: bg },
          { text: p.resultado, fontSize: 8, alignment: 'center', fillColor: bg },
          { text: p.unidade, fontSize: 8, alignment: 'center', fillColor: bg },
          { text: p.padrao, fontSize: 8, alignment: 'center', fillColor: bg },
          { text: p.unidadePadrao, fontSize: 8, alignment: 'center', fillColor: bg },
          { text: p.conforme ? 'C' : 'NC', fontSize: 8, bold: true, alignment: 'center', color: sColor, fillColor: bg },
        ];
      }),
    ];

    const docDefinition = {
      pageMargins: [40, 50, 40, 50],
      content: [
        {
          columns: [
            { text: 'INDÚSTRIA ERVATEIRA VERDELANDIA LTDA', style: 'empresa', width: '*' },
            { text: 'FORQSE001\nFicha de Liberação de Embalagens', style: 'codigo', width: 'auto' },
          ],
          margin: [0, 0, 0, 4],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#065f46' }], margin: [0, 0, 0, 8] },
        {
          columns: [
            { text: [{ text: 'Fornecedor: ', bold: true }, ficha.fornecedor], fontSize: 10 },
            { text: `Emissão: ${emissao}`, fontSize: 9, color: '#6b7280', alignment: 'right' },
          ],
          margin: [0, 0, 0, 12],
        },
        { text: 'Parâmetros Avaliados', style: 'secao' },
        { table: { widths: ['*', 50, 30, 50, 30, 40], headerRows: 1, body: tabelaBody }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 14] },
        { text: `Status Global: ${statusLabel}`, fontSize: 13, bold: true, color: statusColor, alignment: 'center', margin: [0, 4, 0, 16] },
        ficha.observacoes ? { text: [{ text: 'Observações: ', bold: true }, ficha.observacoes], fontSize: 9, margin: [0, 0, 0, 16] } : {},
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' }], margin: [0, 0, 0, 12] },
        {
          columns: [
            { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: '#374151' }] }, { text: 'Analista Responsável', fontSize: 8, color: '#6b7280', margin: [0, 2, 0, 0] }] },
            { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: '#374151' }] }, { text: 'Aprovação / Qualidade', fontSize: 8, color: '#6b7280', margin: [0, 2, 0, 0] }] },
            { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: '#374151' }] }, { text: 'Data', fontSize: 8, color: '#6b7280', margin: [0, 2, 0, 0] }] },
          ],
          columnGap: 10,
          margin: [0, 10, 0, 0],
        },
      ],
      styles: {
        empresa: { fontSize: 13, bold: true },
        codigo: { fontSize: 10, bold: true, alignment: 'right', color: '#065f46' },
        secao: { fontSize: 10, bold: true, color: '#065f46', margin: [0, 0, 0, 4] },
      },
    };

    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=FORQSE001-${String(ficha.id).padStart(4, '0')}.pdf`);
      res.end(buffer);
    });
  } catch (err) {
    console.error('[fichas/pdf]', err?.message);
    if (!res.headersSent) return res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

module.exports = router;
