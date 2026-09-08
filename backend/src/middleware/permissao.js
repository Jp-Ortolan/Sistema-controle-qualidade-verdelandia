// Bloqueia a rota quando o usuario nao tem a permissao pedida.
// Uso: requirePermissao('lotes', 'write')
const requirePermissao = (recurso, acao = 'view') => (req, res, next) => {
  if (req.user?.permissoes?.[recurso]?.[acao] === true) return next();
  return res.status(403).json({ error: 'Você não tem permissão para esta ação' });
};

module.exports = { requirePermissao };
