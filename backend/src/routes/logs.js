const express = require('express');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePermissao } = require('../middleware/permissao');
const { enviarPlanilha, dataBR, texto } = require('../lib/excel');

const router = express.Router();
router.use(auth);
router.use(requirePermissao('logs', 'view'));

router.get('/exportar', requirePermissao('logs', 'export'), async (req, res) => {
  try {
    const { entidade, acao } = req.query;
    const where = {};
    if (entidade) where.entidade = entidade;
    if (acao) where.acao = acao;
    const logs = await prisma.log.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Legivel: {"codigo":"L2026001"} -> codigo: L2026001
    const legivel = (json) => {
      if (!json) return null;
      try {
        const o = JSON.parse(json);
        return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ');
      } catch { return json; }
    };

    const porAcao = {};
    for (const l of logs) porAcao[l.acao] = (porAcao[l.acao] ?? 0) + 1;

    return enviarPlanilha(res, {
      titulo: 'Relatório de Logs de Auditoria',
      nomeAba: 'Auditoria',
      filtros: [['Entidade', entidade], ['Ação', acao]],
      colunas: [
        { titulo: 'Data e Hora', chave: 'quando',   largura: 19, tipo: 'datahora' },
        { titulo: 'Usuário',     chave: 'usuario',  largura: 30, tipo: 'texto' },
        { titulo: 'Ação',        chave: 'acao',     largura: 18, tipo: 'texto' },
        { titulo: 'Entidade',    chave: 'entidade', largura: 16, tipo: 'texto' },
        { titulo: 'Registro nº', chave: 'registro', largura: 12, tipo: 'inteiro' },
        { titulo: 'Detalhes',    chave: 'detalhes', largura: 46, tipo: 'texto' },
      ],
      linhas: logs.map((l) => ({
        quando: dataBR(l.createdAt),
        usuario: texto(l.userEmail),
        acao: texto(l.acao),
        entidade: texto(l.entidade),
        registro: l.entidadeId,
        detalhes: legivel(l.detalhes),
      })),
      resumo: Object.entries(porAcao).sort((a, b) => b[1] - a[1]).map(([a, n]) => [`Ações do tipo ${a}`, n]),
    }, 'logs-auditoria-scq.xlsx');
  } catch (err) {
    console.error('[logs/excel]', err?.message);
    return res.status(500).json({ error: 'Erro ao exportar logs' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { entidade, acao, pagina = '1', limite = '10' } = req.query;
    const where = {};
    if (entidade) where.entidade = entidade;
    if (acao) where.acao = acao;
    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    const take = parseInt(limite);
    const [logs, total] = await Promise.all([
      prisma.log.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.log.count({ where }),
    ]);
    return res.json({ logs, total, pagina: parseInt(pagina), limite: take });
  } catch (e) {
    console.error('[logs]', e?.message);
    return res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

module.exports = router;
