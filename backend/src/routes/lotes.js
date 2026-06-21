const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');
const { auditLog } = require('../lib/logger');

const router = express.Router();
router.use(auth);

const loteSchema = z.object({
  codigo: z.string().min(1, 'Código obrigatório'),
  dataInicio: z.string().min(1, 'Data de início obrigatória'),
  dataFim: z.string().min(1, 'Data de fim obrigatória'),
  observacao: z.string().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const lotes = await prisma.lote.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(lotes);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar lotes' });
  }
});

router.post('/', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const data = loteSchema.parse(req.body);
    const existe = await prisma.lote.findUnique({ where: { codigo: data.codigo } });
    if (existe) return res.status(409).json({ error: 'Já existe um lote com esse código' });
    const lote = await prisma.lote.create({
      data: {
        codigo: data.codigo,
        produto: 'Erva-Mate Cancheada',
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        observacao: data.observacao,
      },
    });
    auditLog(req, 'CRIAR', 'LOTE', lote.id, { codigo: lote.codigo });
    return res.status(201).json(lote);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao criar lote' });
  }
});

router.put('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = loteSchema.parse(req.body);
    const existeOutro = await prisma.lote.findFirst({ where: { codigo: data.codigo, id: { not: id } } });
    if (existeOutro) return res.status(409).json({ error: 'Já existe outro lote com esse código' });
    const lote = await prisma.lote.update({
      where: { id },
      data: {
        codigo: data.codigo,
        produto: 'Erva-Mate Cancheada',
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
        observacao: data.observacao,
      },
    });
    auditLog(req, 'EDITAR', 'LOTE', lote.id, { codigo: lote.codigo });
    return res.json(lote);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lote não encontrado' });
    return res.status(500).json({ error: 'Erro ao atualizar lote' });
  }
});

router.delete('/:id', requirePerfil('ANALISTA'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.lote.delete({ where: { id } });
    auditLog(req, 'EXCLUIR', 'LOTE', id, null);
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lote não encontrado' });
    return res.status(500).json({ error: 'Erro ao excluir lote' });
  }
});

module.exports = router;
