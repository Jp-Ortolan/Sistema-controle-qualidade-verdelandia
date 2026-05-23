// SCQ Verdelandia - v2.1
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'https://sistema-controle-qualidade-verdelan.vercel.app',
      'https://sistema-controle-qualidade-verdelandia.vercel.app',
      'http://localhost:5173',
      'http://localhost:3333',
    ];
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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
