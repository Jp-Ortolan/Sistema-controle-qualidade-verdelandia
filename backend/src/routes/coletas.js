const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');
const XLSX = require('xlsx');

const router = express.Router();
router.use(auth);

// Apenas ANALISTA acessa coletas
router.use(requirePerfil('ANALISTA'));

const coletaSchema = z.object({
  produtorId: z.number().int().positive('Produtor inválido'),
  tipoProduto: z.string().min(1, 'Tipo de produto obrigatório'),
  destino: z.string().min(1, 'Destino obrigatório'),
  dataColeta: z.string().min(1, 'Data de coleta obrigatória'),
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

// IMPORTANTE: /exportar deve vir antes de /:id para não ser capturado como ID
router.get('/exportar', async (_req, res) => {
  try {
    const coletas = await prisma.coletaAmostra.findMany({
      include: { produtor: { select: { nome: true } } },
      orderBy: { dataColeta: 'desc' },
    });

    const rows = coletas.map((c) => ({
      ID: c.id,
      Produtor: c.produtor.nome,
      'Tipo de Produto': c.tipoProduto,
      Destino: c.destino,
      'Data da Coleta': new Date(c.dataColeta).toLocaleDateString('pt-BR'),
      'Data de Cadastro': new Date(c.createdAt).toLocaleDateString('pt-BR'),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Coletas');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=coletas-scq.xlsx');
    return res.send(buffer);
  } catch {
    return res.status(500).json({ error: 'Erro ao exportar coletas' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { tipoProduto, destino, dataInicio, dataFim } = req.query;
    const where = {};
    if (tipoProduto) where.tipoProduto = { contains: tipoProduto };
    if (destino) where.destino = { contains: destino };
    const dateRange = buildDateRange(dataInicio, dataFim);
    if (dateRange) where.dataColeta = dateRange;

    const coletas = await prisma.coletaAmostra.findMany({
      where,
      include: { produtor: { select: { nome: true } } },
      orderBy: { dataColeta: 'desc' },
    });
    return res.json(coletas);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar coletas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = coletaSchema.parse(req.body);
    const coleta = await prisma.coletaAmostra.create({
      data: {
        produtorId: data.produtorId,
        tipoProduto: data.tipoProduto,
        destino: data.destino,
        dataColeta: new Date(data.dataColeta),
      },
      include: { produtor: { select: { nome: true } } },
    });
    return res.status(201).json(coleta);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao registrar coleta' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = coletaSchema.parse(req.body);
    const coleta = await prisma.coletaAmostra.update({
      where: { id },
      data: {
        produtorId: data.produtorId,
        tipoProduto: data.tipoProduto,
        destino: data.destino,
        dataColeta: new Date(data.dataColeta),
      },
      include: { produtor: { select: { nome: true } } },
    });
    return res.json(coleta);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coleta não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar coleta' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.coletaAmostra.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coleta não encontrada' });
    return res.status(500).json({ error: 'Erro ao excluir coleta' });
  }
});

module.exports = router;
