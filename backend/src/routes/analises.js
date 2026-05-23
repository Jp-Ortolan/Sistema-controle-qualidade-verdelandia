const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');

const router = express.Router();
router.use(auth);

const analiseSchema = z.object({
  nomeProdutor: z.string().optional().nullable(),
  ticket: z.string().optional().nullable(),
  loteId: z.number().int().positive().optional().nullable(),
  dataAnalise: z.string().optional().nullable(),
  dataFabricacao: z.string().optional().nullable(),
  percentualPalito: z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
  teorPo: z.number().min(0).max(100).optional().nullable(),
  umidade: z.number().min(0).max(100).optional().nullable(),
  observacao: z.string().optional().nullable(),
});

function calcularDesconto(pct) {
  if (pct <= 5) return 0;
  if (pct <= 10) return 5;
  if (pct <= 15) return 10;
  return 15;
}

function buildDateRange(inicio, fim) {
  if (!inicio && !fim) return undefined;
  const range = {};
  if (inicio) range.gte = new Date(inicio);
  if (fim) { const d = new Date(fim); d.setHours(23, 59, 59, 999); range.lte = d; }
  return range;
}

const INCLUDE = { lote: { select: { codigo: true, produto: true } } };

router.get('/', async (req, res) => {
  try {
    const { nomeProdutor, dataInicio, dataFim } = req.query;
    const where = {};
    if (nomeProdutor) where.nomeProdutor = { contains: nomeProdutor, mode: 'insensitive' };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.createdAt = dr;
    const analises = await prisma.analise.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' } });
    return res.json(analises);
  } catch { return res.status(500).json({ error: 'Erro ao buscar análises' }); }
});

router.post('/', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const d = analiseSchema.parse(req.body);
    const analise = await prisma.analise.create({
      data: {
        nomeProdutor: d.nomeProdutor ?? '',
        loteId: d.loteId ?? null,
        ticket: d.ticket?.trim() || null,
        dataAnalise: d.dataAnalise ? new Date(d.dataAnalise) : new Date(),
        dataFabricacao: d.dataFabricacao ? new Date(d.dataFabricacao) : null,
        percentualPalito: d.percentualPalito,
        teorPo: d.teorPo ?? null,
        umidade: d.umidade ?? null,
        desconto: calcularDesconto(d.percentualPalito),
        observacao: d.observacao ?? null,
      },
      include: INCLUDE,
    });
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
        ticket: d.ticket?.trim() || null,
        dataAnalise: d.dataAnalise ? new Date(d.dataAnalise) : undefined,
        dataFabricacao: d.dataFabricacao ? new Date(d.dataFabricacao) : null,
        percentualPalito: d.percentualPalito,
        teorPo: d.teorPo ?? null,
        umidade: d.umidade ?? null,
        desconto: calcularDesconto(d.percentualPalito),
        observacao: d.observacao ?? null,
      },
      include: INCLUDE,
    });
    return res.json(analise);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Análise não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar análise' });
  }
});

router.delete('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    await prisma.analise.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Análise não encontrada' });
    return res.status(500).json({ error: 'Erro ao excluir análise' });
  }
});

module.exports = router;
