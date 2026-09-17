// Teste da base de demonstração.
// O ponto crítico é a remoção: ela precisa apagar só a demonstração e deixar
// os dados reais intactos. O teste semeia registros "reais" e confere isso.
//
// Rodar com:  npm run test:demo

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://fake';

const path = require('path');

// ── Banco em memória, no lugar do Prisma ─────────────────────────────────
const db = { User: [], Analise: [], Lote: [], FichaEmbalagem: [], ColetaAmostra: [] };
let seq = 1;

function bate(reg, where) {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR') { if (!v.some((c) => bate(reg, c))) return false; continue; }
    const atual = reg[k];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v && !v.in.includes(atual)) return false;
      if ('gte' in v && !(atual >= v.gte)) return false;
      if ('lte' in v && !(atual <= v.lte)) return false;
      if ('gt' in v && !(atual > v.gt)) return false;
      if ('lt' in v && !(atual < v.lt)) return false;
    } else if (atual instanceof Date && v instanceof Date) {
      if (atual.getTime() !== v.getTime()) return false;
    } else if (atual !== v) return false;
  }
  return true;
}

const tabela = (nome) => ({
  count: async ({ where } = {}) => db[nome].filter((r) => bate(r, where)).length,
  findMany: async ({ where } = {}) => db[nome].filter((r) => bate(r, where)).map((r) => ({ ...r })),
  findUnique: async ({ where }) => db[nome].find((r) => bate(r, where)) ?? null,
  create: async ({ data }) => { const n = { id: seq++, createdAt: new Date(), ...data }; db[nome].push(n); return n; },
  createMany: async ({ data }) => { data.forEach((d) => db[nome].push({ id: seq++, createdAt: new Date(), ...d })); return { count: data.length }; },
  deleteMany: async ({ where } = {}) => {
    const antes = db[nome].length;
    db[nome] = db[nome].filter((r) => !bate(r, where));
    return { count: antes - db[nome].length };
  },
});

const prismaFake = {
  user: tabela('User'), analise: tabela('Analise'), lote: tabela('Lote'),
  fichaEmbalagem: tabela('FichaEmbalagem'), coletaAmostra: tabela('ColetaAmostra'),
  $disconnect: async () => {},
};

// injeta antes de carregar o script
const mod = path.join(__dirname, '..', 'node_modules', '@prisma', 'client', 'index.js');
try {
  require.cache[require.resolve('@prisma/client')] = {
    id: mod, filename: mod, loaded: true,
    exports: { PrismaClient: function () { return prismaFake; } },
  };
} catch {
  require.cache[mod] = { id: mod, filename: mod, loaded: true,
    exports: { PrismaClient: function () { return prismaFake; } } };
}

const { criar, remover, MARCA } = require('../prisma/dados-demonstracao');

// ── Dados "reais", que não podem ser tocados ─────────────────────────────
const REAIS = { analises: 50, lotes: 5, fichas: 1, coletas: 1 };
function semearReais() {
  for (let i = 0; i < REAIS.analises; i += 1) {
    db.Analise.push({ id: seq++, ticket: String(10000 + i), nomeProdutor: `PRODUTOR REAL ${i}`,
      dataAnalise: new Date(Date.UTC(2026, 0, 5 + (i % 25), 12)), percentualPalito: 30 + (i % 15),
      desconto: 0, teorPo: 3, umidade: 3.5, loteId: null,
      observacao: 'Importado da planilha de controle de palitos', createdAt: new Date() });
  }
  for (let i = 0; i < REAIS.lotes; i += 1) {
    db.Lote.push({ id: seq++, codigo: String(46 + i), produto: 'Erva-Mate Cancheada',
      dataInicio: new Date(Date.UTC(2025, 10, 21 + i * 7, 12)), dataFim: new Date(Date.UTC(2025, 10, 27 + i * 7, 12)),
      observacao: 'Importado da planilha de lotes semanais', createdAt: new Date() });
  }
  db.FichaEmbalagem.push({ id: seq++, fornecedor: 'FORNECEDOR REAL', statusGlobal: 'CONFORME',
    observacoes: null, parametros: '[]', createdAt: new Date(Date.UTC(2026, 2, 10, 12)) });
  db.ColetaAmostra.push({ id: seq++, tipoProduto: 'Erva-Mate Cancheada', destino: 'TECPAR',
    dataColeta: new Date(Date.UTC(2026, 2, 12, 12)), createdAt: new Date() });
}

const silencioso = async (fn) => {
  const log = console.log; console.log = () => {};
  try { return await fn(); } finally { console.log = log; }
};

(async () => {
  let falhas = 0;
  const ok = (c, m, extra = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  << ' + extra)); if (!c) falhas += 1; };

  semearReais();
  console.log(`\nBanco inicial, só com dados reais: ${REAIS.analises} análises, ${REAIS.lotes} lotes`);

  console.log('\n1) Simulação');
  await silencioso(() => criar({ confirmar: false }));
  ok(db.Analise.length === REAIS.analises, 'sem --confirmar nada é criado');

  console.log('\n2) Criação da base de demonstração');
  await silencioso(() => criar({ confirmar: true }));
  const demo = db.Analise.filter((a) => a.observacao === MARCA);
  ok(demo.length > 0, `criou ${demo.length} análises de demonstração`);
  ok(db.Analise.length === REAIS.analises + demo.length, 'os dados reais continuam no banco');
  ok(db.User.some((u) => u.email === 'demo@scq.com'), 'criou o usuário demo@scq.com');
  ok(demo.every((a) => a.dataAnalise.getUTCFullYear() === 2025 && a.dataAnalise.getUTCMonth() <= 3),
    'toda análise de demonstração cai na janela jan–abr/2025');
  ok(demo.every((a) => !/PRODUTOR REAL/.test(a.nomeProdutor)), 'nenhum produtor real aparece na demonstração');
  ok(demo.every((a) => a.loteId !== null), 'toda análise de demonstração tem lote');
  ok(demo.some((a) => a.desconto > 0) && demo.some((a) => a.desconto === 0),
    'há casos com e sem desconto, para demonstrar a regra');

  console.log('\n3) Criar de novo não duplica');
  const antes = db.Analise.length;
  await silencioso(() => criar({ confirmar: true }));
  ok(db.Analise.length === antes, `continua com ${antes} análises`);

  console.log('\n4) Remoção preserva o dado real');
  await silencioso(() => remover({ confirmar: true }));
  ok(db.Analise.length === REAIS.analises, `sobraram exatamente ${REAIS.analises} análises (${db.Analise.length})`);
  ok(db.Lote.length === REAIS.lotes, `sobraram exatamente ${REAIS.lotes} lotes (${db.Lote.length})`);
  ok(db.FichaEmbalagem.length === REAIS.fichas, 'ficha real preservada');
  ok(db.ColetaAmostra.length === REAIS.coletas, 'coleta real preservada');
  ok(db.Analise.every((a) => /PRODUTOR REAL/.test(a.nomeProdutor)), 'só restaram registros reais');
  ok(db.Analise.every((a) => a.observacao !== MARCA), 'nenhum resquício de demonstração');

  console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
  process.exit(falhas ? 1 : 0);
})();
