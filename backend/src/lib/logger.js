const prisma = require('./prisma');

async function auditLog(req, acao, entidade, entidadeId, detalhes) {
  try {
    await prisma.log.create({
      data: {
        userId: req.user?.id ?? 0,
        userEmail: req.user?.email ?? 'desconhecido',
        acao,
        entidade,
        entidadeId,
        detalhes: detalhes ? JSON.stringify(detalhes) : null,
      },
    });
  } catch (e) {
    console.error('[logger]', e?.message);
  }
}

module.exports = { auditLog };
