require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: [
    'https://sistema-controle-qualidade-verdelan.vercel.app',
    'http://localhost:5173',
    'http://localhost:3333',
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/analises', require('./routes/analises'));
app.use('/api/fichas', require('./routes/fichas'));
app.use('/api/coletas', require('./routes/coletas'));
app.use('/api/lotes', require('./routes/lotes'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', sistema: 'SCQ Verdelândia' }));

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

const PORT = process.env.PORT || 3333;
app.listen(PORT, () =>
  console.log(`\n✅ SCQ Backend rodando em http://localhost:${PORT}\n`)
);
