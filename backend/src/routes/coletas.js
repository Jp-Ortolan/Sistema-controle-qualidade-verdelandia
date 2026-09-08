const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePermissao } = require('../middleware/permissao');
const { auditLog } = require('../lib/logger');
const { buildDateRange } = require('../lib/utils');
const { enviarPlanilha, dataBR, texto } = require('../lib/excel');

const router = express.Router();
router.use(auth);

const coletaSchema = z.object({
  dataColeta: z.string().min(1, 'Data obrigatória'),
  destino: z.string()
    .min(3, 'Destino deve ter pelo menos 3 caracteres')
    .max(100, 'Destino deve ter no máximo 100 caracteres'),
});

router.get('/exportar', requirePermissao('coletas', 'export'), async (req, res) => {
  try {
    const { destino, dataInicio, dataFim } = req.query;
    const where = {};
    if (destino) where.destino = { contains: destino };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.dataColeta = dr;
    const coletas = await prisma.coletaAmostra.findMany({ where, orderBy: { dataColeta: 'desc' } });

    // Quantas coletas por destino, para o rodape.
    const porDestino = {};
    for (const c of coletas) porDestino[c.destino] = (porDestino[c.destino] ?? 0) + 1;
    const resumo = Object.entries(porDestino)
      .sort((a, b) => b[1] - a[1])
      .map(([d, n]) => [`Coletas enviadas para ${d}`, n]);

    return enviarPlanilha(res, {
      titulo: 'Relatório de Coletas de Amostra',
      nomeAba: 'Coletas',
      filtros: [['Destino', destino], ['Data inicial', dataInicio], ['Data final', dataFim]],
      colunas: [
        { titulo: 'Nº',                chave: 'id',        largura: 8,  tipo: 'inteiro' },
        { titulo: 'Tipo de Produto',   chave: 'produto',   largura: 26, tipo: 'texto' },
        { titulo: 'Destino',           chave: 'destino',   largura: 30, tipo: 'texto' },
        { titulo: 'Data da Coleta',    chave: 'dtColeta',  largura: 16, tipo: 'data' },
        { titulo: 'Cadastrado em',     chave: 'dtCadastro',largura: 18, tipo: 'datahora' },
      ],
      linhas: coletas.map((c) => ({
        id: c.id,
        produto: texto(c.tipoProduto),
        destino: texto(c.destino),
        dtColeta: dataBR(c.dataColeta),
        dtCadastro: dataBR(c.createdAt),
      })),
      resumo,
    }, 'coletas-scq.xlsx');
  } catch (err) {
    console.error('[coletas/excel]', err?.message);
    return res.status(500).json({ error: 'Erro ao exportar coletas' });
  }
});

router.get('/', requirePermissao('coletas', 'view'), async (req, res) => {
  try {
    const { tipoProduto, destino, dataInicio, dataFim, page = '1', limit = '10' } = req.query;
    const where = {};
    if (tipoProduto) where.tipoProduto = { contains: tipoProduto };
    if (destino) where.destino = { contains: destino };
    const dr = buildDateRange(dataInicio, dataFim);
    if (dr) where.dataColeta = dr;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const [data, total] = await Promise.all([
      prisma.coletaAmostra.findMany({ where, orderBy: { dataColeta: 'desc' }, skip, take }),
      prisma.coletaAmostra.count({ where }),
    ]);
    return res.json({ data, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
  } catch { return res.status(500).json({ error: 'Erro ao buscar coletas' }); }
});

router.post('/', requirePermissao('coletas', 'write'), async (req, res) => {
  try {
    const data = coletaSchema.parse(req.body);
    const coleta = await prisma.coletaAmostra.create({
      data: { tipoProduto: 'Erva-Mate Cancheada', destino: data.destino, dataColeta: new Date(data.dataColeta + 'T12:00:00.000Z') },
    });
    auditLog(req, 'CRIAR', 'COLETA', coleta.id, { destino: coleta.destino });
    return res.status(201).json(coleta);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao registrar coleta' });
  }
});

router.put('/:id', requirePermissao('coletas', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = coletaSchema.parse(req.body);
    const coleta = await prisma.coletaAmostra.update({
      where: { id },
      data: { tipoProduto: 'Erva-Mate Cancheada', destino: data.destino, dataColeta: new Date(data.dataColeta + 'T12:00:00.000Z') },
    });
    auditLog(req, 'EDITAR', 'COLETA', coleta.id, { destino: coleta.destino });
    return res.json(coleta);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coleta não encontrada' });
    return res.status(500).json({ error: 'Erro ao atualizar coleta' });
  }
});

router.delete('/:id', requirePermissao('coletas', 'delete'), async (req, res) => {
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
