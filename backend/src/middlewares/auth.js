const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { prisma } = require("../config/prisma");

/**
 * Valida JWT (apenas HS256) e recarrega o utilizador na base de dados,
 * para que tokens antigos não continuem válidos após remoção ou alteração de perfil.
 */
async function ensureAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== "string") {
      return res.status(401).json({ message: "Token não informado." });
    }

    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!bearer || bearer.split(".").length !== 3) {
      return res.status(401).json({ message: "Token inválido." });
    }

    let payload;
    try {
      payload = jwt.verify(bearer, jwtSecret, {
        algorithms: ["HS256"],
      });
    } catch {
      return res.status(401).json({ message: "Token expirado ou inválido." });
    }

    const userId = Number(payload.id ?? payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ message: "Token inválido." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Sessão inválida." });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso não autorizado." });
    }
    return next();
  };
}

module.exports = { ensureAuth, allowRoles };
