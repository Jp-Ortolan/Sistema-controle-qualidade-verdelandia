const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { resolver } = require('../lib/permissoes');

// Valida o token e recarrega o usuario do banco a cada requisicao.
// Assim, mudanca de permissao ou inativacao vale na hora, sem esperar o token expirar.
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    if (user.ativo === false) {
      return res.status(403).json({ error: 'Usuário inativo. Procure o administrador do sistema.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      nome: user.nome ?? null,
      perfil: user.perfil,
      permissoes: resolver(user),
    };
    return next();
  } catch (e) {
    console.error('[auth]', e?.message ?? e);
    return res.status(500).json({ error: 'Erro ao validar a sessão' });
  }
}

module.exports = authMiddleware;
