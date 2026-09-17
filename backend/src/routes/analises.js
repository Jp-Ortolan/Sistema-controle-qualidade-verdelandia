const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePermissao } = require('../middleware/permissao');
const { auditLog } = require('../lib/logger');
const { buildDateRange, LOTE_INCLUDE } = require('../lib/utils');
const { enviarPlanilha, dataBR, texto } = require('../lib/excel');
const { calcularDesconto } = require('../lib/desconto');
const { lerAnalises } = require('../lib/importacao');
const ExcelJS = require('exceljs');

const router = express.Router();
router.use(auth);

const analiseSchema = z.object({
  nomeProdutor: z.string()
    .min(2, 'Produtor deve ter pelo menos 2 caracteres')
    .max(100, 'Produtor deve ter no máximo 100 caracteres')
    // Uma carga pode vir de varios produtores; a fabrica separa por ";".
    // Ponto e virgula sao aceitos por isso, e ponto/hifen/apostrofo por causa
    // de abreviacoes e sobrenomes compostos.
    .regex(/^[a-zA-ZÀ-ú\s.,;'-]+$/, 'Produtor deve conter apenas letras, espaços e os sinais . , ; - \'')
    .optional().nullable(),
  ticket: z.string()
    .min(1, 'Ticket obrigatório')
    .max(20, 'Ticket deve ter no máximo 20 dígitos')
    .regex(/^\d+$/, 'Ticket deve conter apenas números'),
  loteId: z.number().int().positive().optional().nullable(),
  dataAnalise: z.string().optional().nullable(),
  dataFabricacao: z.string().optional().nullable(),
  percentualPalito: z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
  teorPo: z.number().min(0).max(100).optional().nullable(),
  umidade: z.number().min(0).max(100).optional().nullable(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
});

const INCLUDE = LOTE_INCLUDE;

// Filtro e ordenacao usam dataAnalise (quando a analise foi feita), e nao
// createdAt (quando o registro entrou no sistema). Sao coisas diferentes:
// na importacao do historico, 1.414 analises de 10 meses entraram no mesmo
// dia, e por createdAt todas apareciam como se fossem de hoje.
// O id entra como segundo criterio para a paginacao nao repetir nem pular
// linha quando varias analises tem a mesma data.
router.get('/', requirePermissao('analises', 'view'), async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim, page = '1', limit = '10' } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.dataAnalise = dr;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const [data, total] = await Promise.all([
      prisma.analise.findMany({ where, include: INCLUDE, orderBy: [{ dataAnalise: 'desc' }, { id: 'desc' }], skip, take }),
      prisma.analise.count({ where }),
    ]);
    return res.json({ data, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
  } catch { return res.status(500).json({ error: 'Erro ao buscar análises' }); }
});

// ── Exportar Excel ─────────────────────────────────────────────────────
router.get('/exportar/excel', requirePermissao('analises', 'export'), async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.dataAnalise = dr;
    const analises = await prisma.analise.findMany({ where, include: INCLUDE, orderBy: [{ dataAnalise: 'desc' }, { id: 'desc' }] });

    const media = (campo) => {
      const vals = analises.map((a) => a[campo]).filter((v) => typeof v === 'number');
      if (vals.length === 0) return 0;
      return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
    };

    return enviarPlanilha(res, {
      titulo: 'Relatório de Análises de Erva-Mate',
      nomeAba: 'Análises',
      filtros: [
        ['Produtor', nomeProdutor],
        ['Data inicial', dataInicio], ['Data final', dataFim],
      ],
      colunas: [
        { titulo: 'Ticket',            chave: 'ticket',     largura: 12, tipo: 'texto' },
        { titulo: 'Produtor',          chave: 'produtor',   largura: 30, tipo: 'texto' },
        { titulo: 'Lote',              chave: 'lote',       largura: 13, tipo: 'texto' },
        { titulo: 'Data da Análise',   chave: 'dtAnalise',  largura: 16, tipo: 'data' },
        { titulo: 'Data de Fabricação',chave: 'dtFabric',   largura: 18, tipo: 'data' },
        { titulo: 'Palito (%)',        chave: 'palito',     largura: 11, tipo: 'percentual' },
        { titulo: 'Pó (%)',            chave: 'po',         largura: 10, tipo: 'percentual' },
        { titulo: 'Umidade (%)',       chave: 'umidade',    largura: 12, tipo: 'percentual' },
        { titulo: 'Desconto (%)',      chave: 'desconto',   largura: 12, tipo: 'percentual' },
        { titulo: 'Observação',        chave: 'observacao', largura: 38, tipo: 'texto' },
      ],
      linhas: analises.map((a) => ({
        ticket: texto(a.ticket),
        produtor: texto(a.nomeProdutor),
        lote: texto(a.lote?.codigo),
        dtAnalise: dataBR(a.dataAnalise),
        dtFabric: dataBR(a.dataFabricacao),
        palito: a.percentualPalito,
        po: a.teorPo,
        umidade: a.umidade,
        desconto: a.desconto,
        observacao: texto(a.observacao),
      })),
      resumo: [
        ['Teor de palito médio (%)', media('percentualPalito')],
        ['Desconto médio (%)', media('desconto')],
      ],
    }, 'analises-scq.xlsx');
  } catch (err) {
    console.error('[analises/excel]', err?.message);
    return res.status(500).json({ error: 'Erro ao gerar Excel' });
  }
});

// ── Exportar PDF ────────────────────────────────────────────────────────
router.get('/exportar/pdf', requirePermissao('analises', 'export'), async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.dataAnalise = dr;
    const analises = await prisma.analise.findMany({ where, include: INCLUDE, orderBy: [{ dataAnalise: 'desc' }, { id: 'desc' }] });

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


// ── Importar planilha de análises ───────────────────────────────────────
// O arquivo chega como corpo bruto (express.raw no server.js), evitando
// dependência de upload multipart. Sem ?confirmar=1 é só simulação.
const LIMITE_PROBLEMAS = 200;
const LIMITE_AMOSTRA = 8;

router.post('/importar', requirePermissao('analises', 'write'), async (req, res) => {
  try {
    const arquivo = req.body;
    if (!Buffer.isBuffer(arquivo) || arquivo.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo recebido. Envie uma planilha .xlsx.' });
    }

    let leitura;
    try {
      leitura = await lerAnalises(arquivo);
    } catch (e) {
      console.error('[analises/importar] leitura', e?.message);
      return res.status(400).json({ error: 'Não foi possível ler a planilha. Confira se o arquivo é um .xlsx válido.' });
    }

    const { validas, problemas, avisos, vazias, semAnalise, unidadePalito, cabecalhoDetectado, aba } = leitura;

    // Tickets que já existem: a importação pode ser repetida sem duplicar nada.
    const tickets = validas.map((a) => a.ticket);
    const jaNoBanco = new Set(
      (await prisma.analise.findMany({ where: { ticket: { in: tickets } }, select: { ticket: true } }))
        .map((a) => a.ticket),
    );
    const novas = validas.filter((a) => !jaNoBanco.has(a.ticket));

    // Amarra cada análise ao lote cujo período contém a data. Não cria lote.
    const lotes = await prisma.lote.findMany({ select: { id: true, codigo: true, dataInicio: true, dataFim: true } });
    const acharLote = (d) => lotes.find((l) => d >= l.dataInicio && d <= l.dataFim) ?? null;
    for (const a of novas) a.lote = acharLote(a.data);
    const comLote = novas.filter((a) => a.lote).length;

    const periodo = novas.length
      ? { de: novas.reduce((x, y) => (x.data < y.data ? x : y)).data,
          ate: novas.reduce((x, y) => (x.data > y.data ? x : y)).data }
      : null;

    const resumo = {
      aba,
      cabecalhoDetectado,
      unidadePalito,
      totalLinhas: validas.length + problemas.length + vazias + semAnalise,
      vazias,
      semAnalise,
      comProblema: problemas.length,
      validas: validas.length,
      jaNoBanco: validas.length - novas.length,
      aInserir: novas.length,
      comLote,
      semLote: novas.length - comLote,
      comDesconto: novas.filter((a) => a.desconto > 0).length,
      periodo,
      problemas: problemas.slice(0, LIMITE_PROBLEMAS),
      problemasOcultos: Math.max(0, problemas.length - LIMITE_PROBLEMAS),
      avisos,
      amostra: novas.slice(0, LIMITE_AMOSTRA).map((a) => ({
        ticket: a.ticket, data: a.data, percentualPalito: a.percentualPalito,
        desconto: a.desconto, lote: a.lote?.codigo ?? null, nomeProdutor: a.nomeProdutor,
      })),
    };

    if (req.query.confirmar !== '1') {
      return res.json({ simulacao: true, ...resumo });
    }

    if (novas.length === 0) {
      return res.json({ simulacao: false, inseridas: 0, ...resumo });
    }

    let inseridas = 0;
    const BLOCO = 200;
    for (let i = 0; i < novas.length; i += BLOCO) {
      const bloco = novas.slice(i, i + BLOCO);
      await prisma.analise.createMany({
        data: bloco.map((a) => ({
          nomeProdutor: a.nomeProdutor,
          loteId: a.lote?.id ?? null,
          ticket: a.ticket,
          dataAnalise: a.data,
          dataFabricacao: null,
          percentualPalito: a.percentualPalito,
          teorPo: a.teorPo,
          umidade: a.umidade,
          desconto: a.desconto,
          observacao: 'Importado de planilha',
        })),
      });
      inseridas += bloco.length;
    }

    auditLog(req, 'IMPORTAR', 'ANALISE', 0, {
      inseridas, ignoradas: resumo.jaNoBanco, comProblema: problemas.length,
    });
    return res.json({ simulacao: false, inseridas, ...resumo });
  } catch (err) {
    console.error('[analises/importar]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao importar a planilha' });
  }
});

// Modelo em branco, com os cabeçalhos que a importação reconhece.
router.get('/importar/modelo', requirePermissao('analises', 'write'), async (_req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Análises');
    const cabs = ['Data', 'Ticket', 'Umidade (%)', 'Teor de Pó (%)', 'Teor de Palito (%)', 'Produtor'];
    ws.columns = cabs.map((c, i) => ({ header: c, width: [14, 12, 14, 16, 18, 30][i] }));

    const cab = ws.getRow(1);
    cabs.forEach((_, i) => {
      const cel = cab.getCell(i + 1);
      cel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      cel.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    cab.height = 22;

    const exemplos = [
      [new Date(2026, 8, 1), 10900, 3.4, 3, 24, 'Sítio Boa Esperança'],
      [new Date(2026, 8, 1), 10901, 4.1, 5, 36, 'Fazenda São José'],
    ];
    exemplos.forEach((linha, i) => {
      const r = ws.getRow(i + 2);
      linha.forEach((v, j) => {
        const cel = r.getCell(j + 1);
        cel.value = v;
        cel.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };
        if (j === 0) cel.numFmt = 'dd/mm/yyyy';
        if (j > 0) cel.alignment = { horizontal: j === 5 ? 'left' : 'center' };
      });
    });

    const nota = ws.getRow(5);
    nota.getCell(1).value = 'Apague as duas linhas de exemplo antes de importar. O desconto é calculado pelo sistema, não precisa vir na planilha.';
    nota.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } };
    ws.mergeCells('A5:F5');

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=modelo-importacao-analises.xlsx');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[analises/modelo]', err?.message);
    return res.status(500).json({ error: 'Erro ao gerar o modelo' });
  }
});

router.post('/', requirePermissao('analises', 'write'), async (req, res) => {
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

router.put('/:id', requirePermissao('analises', 'write'), async (req, res) => {
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

router.delete('/:id', requirePermissao('analises', 'delete'), async (req, res) => {
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
