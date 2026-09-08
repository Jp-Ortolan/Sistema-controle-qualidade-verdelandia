const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePermissao } = require('../middleware/permissao');
const { auditLog } = require('../lib/logger');
const { enviarPlanilha, dataBR, texto } = require('../lib/excel');

const router = express.Router();
router.use(auth);

// A lista de lotes alimenta o seletor da tela de Analises,
// por isso quem enxerga Analises tambem consegue le-la.
const podeLerLotes = (req, res, next) => {
  const p = req.user?.permissoes;
  if (p?.lotes?.view === true || p?.analises?.view === true) return next();
  return res.status(403).json({ error: 'Você não tem permissão para esta ação' });
};

const loteSchema = z.object({
  codigo: z.string()
    .min(2, 'Código deve ter pelo menos 2 caracteres')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'Código deve conter apenas letras e números'),
  dataInicio: z.string().min(1, 'Data de início obrigatória'),
  dataFim: z.string().min(1, 'Data de fim obrigatória'),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional(),
});

router.get('/', podeLerLotes, async (req, res) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const [data, total] = await Promise.all([
      prisma.lote.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.lote.count(),
    ]);
    return res.json({ data, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar lotes' });
  }
});

router.get('/exportar', requirePermissao('lotes', 'export'), async (_req, res) => {
  try {
    const lotes = await prisma.lote.findMany({
      orderBy: { dataInicio: 'desc' },
      include: { _count: { select: { analises: true } } },
    });

    const contar = (l) => l._count?.analises ?? 0;
    const comAnalises = lotes.filter((l) => contar(l) > 0).length;

    return enviarPlanilha(res, {
      titulo: 'Relatório de Lotes de Erva-Mate',
      nomeAba: 'Lotes',
      colunas: [
        { titulo: 'Código',            chave: 'codigo',     largura: 14, tipo: 'texto' },
        { titulo: 'Produto',           chave: 'produto',    largura: 26, tipo: 'texto' },
        { titulo: 'Início do Período', chave: 'inicio',     largura: 17, tipo: 'data' },
        { titulo: 'Fim do Período',    chave: 'fim',        largura: 16, tipo: 'data' },
        { titulo: 'Análises no Lote',  chave: 'analises',   largura: 15, tipo: 'inteiro' },
        { titulo: 'Observação',        chave: 'observacao', largura: 40, tipo: 'texto' },
      ],
      linhas: lotes.map((l) => ({
        codigo: texto(l.codigo),
        produto: texto(l.produto),
        inicio: dataBR(l.dataInicio),
        fim: dataBR(l.dataFim),
        analises: contar(l),
        observacao: texto(l.observacao),
      })),
      resumo: [
        ['Lotes com análises lançadas', comAnalises],
        ['Lotes sem nenhuma análise', lotes.length - comAnalises],
      ],
    }, 'lotes-scq.xlsx');
  } catch (err) {
    console.error('[lotes/excel]', err?.message);
    return res.status(500).json({ error: 'Erro ao exportar lotes' });
  }
});

router.post('/', requirePermissao('lotes', 'write'), async (req, res) => {
  try {
    const data = loteSchema.parse(req.body);
    const existe = await prisma.lote.findUnique({ where: { codigo: data.codigo } });
    if (existe) return res.status(409).json({ error: 'Já existe um lote com esse código' });
    const lote = await prisma.lote.create({
      data: {
        codigo: data.codigo,
        produto: 'Erva-Mate Cancheada',
        dataInicio: new Date(data.dataInicio + 'T12:00:00.000Z'),
        dataFim: new Date(data.dataFim + 'T12:00:00.000Z'),
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

router.put('/:id', requirePermissao('lotes', 'write'), async (req, res) => {
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
        dataInicio: new Date(data.dataInicio + 'T12:00:00.000Z'),
        dataFim: new Date(data.dataFim + 'T12:00:00.000Z'),
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

router.delete('/:id', requirePermissao('lotes', 'delete'), async (req, res) => {
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
