const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');

const router = express.Router();
router.use(auth);

const analiseSchema = z.object({
  produtorId: z.number().int().positive('Produtor inválido'),
  percentualPalito: z.number().min(0).max(100, 'Percentual deve ser entre 0 e 100'),
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
  if (fim) {
    const d = new Date(fim);
    d.setHours(23, 59, 59, 999);
    range.lte = d;
  }
  return range;
}

// GET: todos os perfis autenticados podem visualizar análises
router.get('/', async (req, res) => {
  try {
    const { produtorId, dataInicio, dataFim } = req.query;
    const where = {};
    if (produtorId) where.produtorId = parseInt(produtorId);
    const dateRange = buildDateRange(dataInicio, dataFim);
    if (dateRange) where.createdAt = dateRange;

    const analises = await prisma.analise.findMany({
      where,
      include: { produtor: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(analises);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar análises' });
  }
});

// POST, PUT, DELETE: apenas ANALISTA
router.post('/', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const { produtorId, percentualPalito } = analiseSchema.parse(req.body);
    const analise = await prisma.analise.create({
      data: { produtorId, percentualPalito, desconto: calcularDesconto(percentualPalito) },
      include: { produtor: { select: { nome: true } } },
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
    const { produtorId, percentualPalito } = analiseSchema.parse(req.body);
    const analise = await prisma.analise.update({
      where: { id },
      data: { produtorId, percentualPalito, desconto: calcularDesconto(percentualPalito) },
      include: { produtor: { select: { nome: true } } },
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
