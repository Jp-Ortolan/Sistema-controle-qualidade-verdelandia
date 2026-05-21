/**
 * Middleware de controle de acesso por perfil.
 * Deve ser usado APÓS o middleware de autenticação JWT.
 */
const requirePerfil = (...perfis) => (req, res, next) => {
  if (!perfis.includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso não autorizado para este perfil' });
  }
  next();
};

module.exports = { requirePerfil };
