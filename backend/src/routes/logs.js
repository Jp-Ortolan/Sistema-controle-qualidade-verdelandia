const express = require('express');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');

const router = express.Router();
router.use(auth);
router.use(requirePerfil('GESTOR'));

router.get('/', async (req, res) => {
  try {
    const { entidade, acao, pagina = '1', limite = '50' } = req.query;
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
