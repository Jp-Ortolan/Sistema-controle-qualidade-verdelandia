const express = require('express');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (_req, res) => {
  try {
    const agora = new Date();
    const inicioDia = new Date(agora); inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(agora); fimDia.setHours(23, 59, 59, 999);
    const inicioSemana = new Date(agora); inicioSemana.setDate(agora.getDate() - 7);

    const [
      totalAnalises,
      analisesHoje,
      fichasConformes,
      fichasNaoConformes,
      lotesEstaSemana,
      coletasEstaSemana,
      agregadoDesconto,
      agregadoPalito,
      ultimasAnalises,
    ] = await Promise.all([
      prisma.analise.count(),
      prisma.analise.count({ where: { createdAt: { gte: inicioDia, lte: fimDia } } }),
      prisma.fichaEmbalagem.count({ where: { statusGlobal: 'CONFORME' } }),
      prisma.fichaEmbalagem.count({ where: { statusGlobal: 'NAO_CONFORME' } }),
      prisma.lote.count({ where: { createdAt: { gte: inicioSemana } } }),
      prisma.coletaAmostra.count({ where: { createdAt: { gte: inicioSemana } } }),
      prisma.analise.aggregate({ _avg: { desconto: true } }),
      prisma.analise.aggregate({ _avg: { percentualPalito: true } }),
      prisma.analise.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { produtor: { select: { nome: true } } },
        select: { id: true, percentualPalito: true, desconto: true, createdAt: true, produtor: { select: { nome: true } } },
      }),
    ]);

    // Análises por dia (últimos 7 dias)
    const analisesPorDia = await prisma.$queryRaw`
      SELECT DATE("createdAt")::text AS dia, COUNT(*)::int AS total
      FROM "Analise"
      WHERE "createdAt" >= ${inicioSemana}
      GROUP BY DATE("createdAt")
      ORDER BY dia ASC
    `;

    // Top 5 produtores por desconto médio
    const descontoPorProdutor = await prisma.$queryRaw`
      SELECT p.nome, ROUND(AVG(a.desconto)::numeric, 2)::float AS mediaDesconto
      FROM "Analise" a
      JOIN "Produtor" p ON p.id = a."produtorId"
      GROUP BY p.nome
      ORDER BY mediaDesconto DESC
      LIMIT 5
    `;

    return res.json({
      totalAnalises,
      analisesHoje,
      mediaDesconto: Number((agregadoDesconto._avg.desconto ?? 0).toFixed(2)),
      mediaTeorPalito: Number((agregadoPalito._avg.percentualPalito ?? 0).toFixed(2)),
      lotesEstaSemana,
      fichasConformes,
      fichasNaoConformes,
      coletasEstaSemana,
      ultimasAnalises,
      analisesPorDia,
      descontoPorProdutor,
    });
  } catch (err) {
    console.error('[dashboard]', err?.message);
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
