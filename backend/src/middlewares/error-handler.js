const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const { isProduction } = require("../config/env");

function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    if (isProduction) {
      return res.status(400).json({
        message: "Dados inválidos ou incompletos.",
      });
    }
    return res.status(400).json({
      message: "Erro de validação.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Registo duplicado (restrição única na base de dados)." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Registo não encontrado." });
    }
  }

  return res.status(500).json({
    message: "Erro interno no servidor.",
    detail: isProduction ? undefined : error.message,
  });
}

module.exports = { errorHandler };
