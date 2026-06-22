const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');
const { auditLog } = require('../lib/logger');
const { buildDateRange, LOTE_INCLUDE } = require('../lib/utils');

const router = express.Router();
router.use(auth);

const analiseSchema = z.object({
  nomeProdutor: z.string().optional().nullable(),
  ticket: z.string().min(1, 'Ticket obrigatório'),
  loteId: z.number().int().positive().optional().nullable(),
  dataAnalise: z.string().optional().nullable(),
  dataFabricacao: z.string().optional().nullable(),
  percentualPalito: z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
  teorPo: z.number().min(0).max(100).optional().nullable(),
  umidade: z.number().min(0).max(100).optional().nullable(),
  observacao: z.string().optional().nullable(),
});

function calcularDesconto(pct) {
  if (pct <= 0.3) return 0;
  return Math.round((pct - 0.3) * 0.35 * 10000) / 10000;
}

const INCLUDE = LOTE_INCLUDE;

router.get('/', async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim, page = '1', limit = '10' } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.createdAt = dr;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const [data, total] = await Promise.all([
      prisma.analise.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.analise.count({ where }),
    ]);
    return res.json({ data, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
  } catch { return res.status(500).json({ error: 'Erro ao buscar análises' }); }
});

// ── Exportar Excel ─────────────────────────────────────────────────────
router.get('/exportar/excel', requirePerfil('ANALISTA', 'GESTOR'), async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.createdAt = dr;
    const analises = await prisma.analise.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' } });

    const XLSX = require('xlsx');
    const rows = analises.map((a) => ({
      'Ticket': a.ticket ?? '—',
      'Produtor': a.nomeProdutor || '—',
      'Lote': a.lote?.codigo ?? '—',
      'Data Análise': a.dataAnalise ? new Date(a.dataAnalise).toLocaleDateString('pt-BR') : '—',
      'Data Fabricação': a.dataFabricacao ? new Date(a.dataFabricacao).toLocaleDateString('pt-BR') : '—',
      'Palito (%)': a.percentualPalito,
      'Pó (%)': a.teorPo ?? '',
      'Umidade (%)': a.umidade ?? '',
      'Desconto (%)': a.desconto,
      'Observação': a.observacao ?? '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Análises');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=analises.xlsx');
    return res.send(buffer);
  } catch (err) {
    console.error('[analises/excel]', err?.message);
    return res.status(500).json({ error: 'Erro ao gerar Excel' });
  }
});

// ── Exportar PDF ────────────────────────────────────────────────────────
router.get('/exportar/pdf', requirePerfil('ANALISTA', 'GESTOR', 'COMPRAS'), async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.createdAt = dr;
    const analises = await prisma.analise.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' } });

    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts;

    const emissao = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const fmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const COLS = ['Ticket', 'Produtor', 'Lote', 'Dt. Análise', 'Dt. Fabric.', 'Palito %', 'Pó %', 'Umid. %', 'Desc. %', 'Observação'];

    const headerRow = COLS.map((h) => ({
      text: h, bold: true, fillColor: '#065f46', color: '#fff',
      fontSize: 7, alignment: 'center', margin: [2, 3, 2, 3],
    }));

    const dataRows = analises.map((a, i) => {
      const bg = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
      return [
        { text: a.ticket ?? '—', fontSize: 7, alignment: 'center', fillColor: bg },
        { text: a.nomeProdutor || '—', fontSize: 7, fillColor: bg },
        { text: a.lote?.codigo ?? '—', fontSize: 7, alignment: 'center', fillColor: bg },
        { text: fmt(a.dataAnalise), fontSize: 7, alignment: 'center', fillColor: bg },
        { text: fmt(a.dataFabricacao), fontSize: 7, alignment: 'center', fillColor: bg },
        { text: `${a.percentualPalito}%`, fontSize: 7, alignment: 'center', fillColor: bg },
        { text: a.teorPo != null ? `${a.teorPo}%` : '—', fontSize: 7, alignment: 'center', fillColor: bg },
        { text: a.umidade != null ? `${a.umidade}%` : '—', fontSize: 7, alignment: 'center', fillColor: bg },
        { text: `${a.desconto}%`, fontSize: 7, alignment: 'center', fillColor: bg },
        { text: a.observacao ?? '', fontSize: 7, fillColor: bg },
      ];
    });

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [30, 40, 30, 40],
      content: [
        {
          columns: [
            { text: 'INDÚSTRIA ERVATEIRA VERDELÂNDIA LTDA', style: 'empresa', width: '*' },
            { text: `Emissão: ${emissao}`, fontSize: 8, color: '#6b7280', alignment: 'right', width: 'auto' },
          ],
          margin: [0, 0, 0, 2],
        },
        { text: 'Relatório de Análises de Erva-Mate', style: 'titulo', margin: [0, 0, 0, 6] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 780, y2: 0, lineWidth: 1, lineColor: '#065f46' }], margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: [40, '*', 42, 48, 48, 32, 28, 32, 30, '*'],
            body: [headerRow, ...dataRows],
          },
          layout: 'lightHorizontalLines',
        },
        {
          text: `Total de registros: ${analises.length}`,
          fontSize: 8, color: '#6b7280', margin: [0, 10, 0, 0], alignment: 'right',
        },
      ],
      styles: {
        empresa: { fontSize: 11, bold: true },
        titulo: { fontSize: 13, bold: true, color: '#065f46' },
      },
    };

    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=analises.pdf');
      res.end(buffer);
    });
  } catch (err) {
    console.error('[analises/pdf]', err?.message);
    if (!res.headersSent) return res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

router.post('/', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const d = analiseSchema.parse(req.body);
    const analise = await prisma.analise.create({
      data: {
        nomeProdutor: d.nomeProdutor ?? '',
        loteId: d.loteId ?? null,
        ticket: d.ticket?.trim() || null,
        dataAnalise: d.dataAnalise ? new Date(d.dataAnalise + 'T12:00:00.000Z') : new Date(),
        dataFabricacao: d.dataFabricacao ? new Date(d.dataFabricacao + 'T12:00:00.000Z') : null,
        percentualPalito: d.percentualPalito,
        teorPo: d.teorPo ?? null,
        umidade: d.umidade ?? null,
        desconto: calcularDesconto(d.percentualPalito),
        observacao: d.observacao ?? null,
      },
      include: INCLUDE,
    });
    auditLog(req, 'CRIAR', 'ANALISE', analise.id, { ticket: analise.ticket, nomeProdutor: analise.nomeProdutor });
    return res.status(201).json(analise);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao registrar análise' });
  }
});

router.put('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const d = analiseSchema.parse(req.body);
    const analise = await prisma.analise.update({
      where: { id },
      data: {
        nomeProdutor: d.nomeProdutor ?? '',
        loteId: d.loteId ?? null,
        ticket: d.ticket.trim(),
        dataAnalise: d.dataAnalise ? new Date(d.dataAnalise + 'T12:00:00.000Z') : undefined,
        dataFabricacao: d.dataFabricacao ? new Date(d.dataFabricacao + 'T12:00:00.000Z') : null,
        percentualPalito: d.percentualPalito,
        teorPo: d.teorPo ?? null,
        umidade: d.umidade ?? null,
        desconto: calcularDesconto(d.percentualPalito),
        observacao: d.observacao ?? null,
      },
      include: INCLUDE,
    });
    auditLog(req, 'EDITAR', 'ANALISE', analise.id, { ticket: analise.ticket });
    return res.json(analise);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Análise não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar análise' });
  }
});

router.delete('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.analise.delete({ where: { id } });
    auditLog(req, 'EXCLUIR', 'ANALISE', id, null);
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Análise não encontrada' });
    return res.status(500).json({ error: 'Erro ao excluir análise' });
  }
});

module.exports = router;
