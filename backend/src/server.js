const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { port, corsOrigin, isProduction } = require("./config/env");
const { router } = require("./routes");
const { errorHandler } = require("./middlewares/error-handler");
const { apiLimiter } = require("./middlewares/rate-limiters");

const app = express();

/** Só ative atrás de reverse proxy confiável (ex.: nginx), senão X-Forwarded-For pode ser forjado. */
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

app.use(morgan(isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "128kb" }));

app.use(
  "/api",
  (req, res, next) => {
    if (req.method === "GET" && req.path === "/health") {
      return next();
    }
    if (req.method === "POST" && req.path === "/auth/login") {
      return next();
    }
    return apiLimiter(req, res, next);
  },
  router,
);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API online em http://localhost:${port}`);
});
