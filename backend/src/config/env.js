const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const jwtSecretRaw = process.env.JWT_SECRET || "";

const devFallbackSecret = "dev-only-secret-minimum-32-characters-long-for-jwt-hs256";

if (isProduction) {
  if (!jwtSecretRaw || jwtSecretRaw.length < 32) {
    throw new Error(
      "JWT_SECRET em produção deve ter pelo menos 32 caracteres aleatórios. Defina em .env.",
    );
  }
} else if (!jwtSecretRaw || jwtSecretRaw.length < 16) {
  console.warn(
    "[SCQ] JWT_SECRET fraco ou ausente em desenvolvimento. Use um segredo longo em .env antes de expor a API.",
  );
}

const jwtSecret = isProduction ? jwtSecretRaw : jwtSecretRaw || devFallbackSecret;

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

module.exports = {
  port: Number(process.env.PORT || 3333),
  nodeEnv,
  isProduction,
  jwtSecret,
  corsOrigin,
  loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX || (isProduction ? 5 : 20)),
  loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
};
