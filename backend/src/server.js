// SCQ Verdelandia - v2.1
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

const allowedOrigins = [
  'https://sistema-controle-qualidade-verdelan.vercel.app',
  'http://localhost:5173',
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/analises', require('./routes/analises'));
app.use('/api/fichas', require('./routes/fichas'));
app.use('/api/coletas', require('./routes/coletas'));
app.use('/api/lotes', require('./routes/lotes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/logs', require('./routes/logs'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', sistema: 'SCQ Verdelândia' }));

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`\n✅ SCQ Backend rodando em http://localhost:${PORT}\n`)
);
