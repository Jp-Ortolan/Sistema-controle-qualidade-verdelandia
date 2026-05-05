const rateLimit = require("express-rate-limit");
const { loginRateLimitMax, loginRateLimitWindowMs } = require("../config/env");

/** Limita tentativas de login por IP (proteção contra força bruta). */
const loginLimiter = rateLimit({
  windowMs: loginRateLimitWindowMs,
  max: loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." },
  skipSuccessfulRequests: false,
});

/** Limite geral leve para o restante da API autenticada (reduz abuso por volume). */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Limite de requisições excedido. Tente novamente em instantes." },
});

module.exports = { loginLimiter, apiLimiter };
