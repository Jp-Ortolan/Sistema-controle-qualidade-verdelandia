const express = require('express');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (_req, res) => {
  try {
    const agora = new Date();

    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - agora.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    const sete = new Date(agora);
    sete.setDate(agora.getDate() - 6);
    sete.setHours(0, 0, 0, 0);

    const [
      totalAnalises,
      analisesEstaSemana,
      fichasConformes,
      fichasNaoConformes,
      totalColetas,
      ultimasAnalises,
      recentRaw,
      top5Raw,
    ] = await Promise.all([
      prisma.analise.count(),
      prisma.analise.count({ where: { createdAt: { gte: inicioSemana } } }),
      prisma.fichaEmbalagem.count({ where: { statusGlobal: 'CONFORME' } }),
      prisma.fichaEmbalagem.count({ where: { statusGlobal: 'NAO_CONFORME' } }),
      prisma.coletaAmostra.count(),
      prisma.analise.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, ticket: true, nomeProdutor: true, percentualPalito: true, desconto: true, createdAt: true },
      }),
      prisma.analise.findMany({
        where: { createdAt: { gte: sete } },
        select: { createdAt: true },
      }),
      prisma.analise.groupBy({
        by: ['nomeProdutor'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // Monta mapa de análises por dia (7 dias)
    const dayMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora);
      d.setDate(agora.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const a of recentRaw) {
      const key = a.createdAt.toISOString().slice(0, 10);
      if (dayMap.has(key)) dayMap.set(key, dayMap.get(key) + 1);
    }
    const analisesPorDia = Array.from(dayMap.entries()).map(([dia, total]) => ({ dia, total }));

    const top5Produtores = top5Raw.map((r) => ({ nome: r.nomeProdutor, total: r._count.id }));

    return res.json({
      totalAnalises,
      analisesEstaSemana,
      fichasConformes,
      fichasNaoConformes,
      totalColetas,
      ultimasAnalises,
      analisesPorDia,
      top5Produtores,
    });
  } catch (err) {
    console.error('[dashboard]', err?.message);
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
