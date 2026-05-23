const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');
const { auditLog } = require('../lib/logger');
const XLSX = require('xlsx');

const router = express.Router();
router.use(auth);
router.use(requirePerfil('ANALISTA', 'COMPRAS'));

const TIPOS = ['Natural', 'Abacaxi', 'Menta & Limão', 'Limão'];

const coletaSchema = z.object({
  dataColeta: z.string().min(1, 'Data obrigatória'),
  tipoProduto: z.string().min(1, 'Tipo de produto obrigatório'),
  destino: z.string().min(1, 'Destino obrigatório'),
});

function buildDateRange(inicio, fim) {
  if (!inicio && !fim) return undefined;
  const range = {};
  if (inicio) range.gte = new Date(inicio);
  if (fim) { const d = new Date(fim); d.setHours(23, 59, 59, 999); range.lte = d; }
  return range;
}

router.get('/exportar', async (_req, res) => {
  try {
    const coletas = await prisma.coletaAmostra.findMany({ orderBy: { dataColeta: 'desc' } });
    const rows = coletas.map((c) => ({
      ID: c.id,
      'Tipo de Produto': c.tipoProduto,
      Destino: c.destino,
      'Data da Coleta': new Date(c.dataColeta).toLocaleDateString('pt-BR'),
      'Data de Cadastro': new Date(c.createdAt).toLocaleDateString('pt-BR'),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Coletas');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=coletas-scq.xlsx');
    return res.send(buffer);
  } catch { return res.status(500).json({ error: 'Erro ao exportar coletas' }); }
});

router.get('/', async (req, res) => {
  try {
    const { tipoProduto, destino, dataInicio, dataFim } = req.query;
    const where = {};
    if (tipoProduto) where.tipoProduto = { contains: tipoProduto };
    if (destino) where.destino = { contains: destino };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.dataColeta = dr;
    const coletas = await prisma.coletaAmostra.findMany({ where, orderBy: { dataColeta: 'desc' } });
    return res.json(coletas);
  } catch { return res.status(500).json({ error: 'Erro ao buscar coletas' }); }
});

router.post('/', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const data = coletaSchema.parse(req.body);
    const coleta = await prisma.coletaAmostra.create({
      data: { tipoProduto: data.tipoProduto, destino: data.destino, dataColeta: new Date(data.dataColeta) },
    });
    auditLog(req, 'CRIAR', 'COLETA', coleta.id, { tipoProduto: coleta.tipoProduto, destino: coleta.destino });
    return res.status(201).json(coleta);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao registrar coleta' });
  }
});

router.put('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = coletaSchema.parse(req.body);
    const coleta = await prisma.coletaAmostra.update({
      where: { id },
      data: { tipoProduto: data.tipoProduto, destino: data.destino, dataColeta: new Date(data.dataColeta) },
    });
    auditLog(req, 'EDITAR', 'COLETA', coleta.id, { tipoProduto: coleta.tipoProduto, destino: coleta.destino });
    return res.json(coleta);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coleta não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar coleta' });
  }
});

router.delete('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.coletaAmostra.delete({ where: { id } });
    auditLog(req, 'EXCLUIR', 'COLETA', id, null);
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coleta não encontrada' });
    return res.status(500).json({ error: 'Erro ao excluir coleta' });
  }
});

module.exports = router;
