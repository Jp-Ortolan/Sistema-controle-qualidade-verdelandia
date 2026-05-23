const requirePerfil = (...perfis) => (req, res, next) => {
  if (!perfis.includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso não autorizado para este perfil' });
  }
  next();
};

module.exports = { requirePerfil };
