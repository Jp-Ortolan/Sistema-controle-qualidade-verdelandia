// Teste de integração da importação de análises por planilha.
// Sobe o servidor real com um banco em memória e monta as planilhas na hora,
// então não depende de nenhum arquivo externo.
//
// Rodar com:  npm run test:importacao

process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste-importacao';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://fake';

const path = require('path');
const fs = require('fs');
const express = require('express');
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');

const BASE_DIR = path.join(__dirname, '..');

// ── Banco falso, injetado no lugar do Prisma ─────────────────────────────
const senhaHash = bcrypt.hashSync('123456', 4);
const db = {
  User: [
    { id: 1, nome: 'Admin', email: 'admin@scq.com', senhaHash, perfil: 'ADMIN', ativo: true, permissoes: null, createdAt: new Date() },
    { id: 2, nome: 'Ana', email: 'analista@scq.com', senhaHash, perfil: 'ANALISTA', ativo: true, permissoes: null, createdAt: new Date() },
    { id: 3, nome: 'Carlos', email: 'compras@scq.com', senhaHash, perfil: 'COMPRAS', ativo: true, permissoes: null, createdAt: new Date() },
  ],
  Analise: [],
  Lote: [{ id: 1, codigo: '90', produto: 'Erva-Mate Cancheada', dataInicio: new Date(Date.UTC(2026, 8, 1, 12)), dataFim: new Date(Date.UTC(2026, 8, 7, 12)) }],
  Log: [],
};
const tabela = (nome) => ({
  findMany: async ({ where } = {}) => {
    let r = db[nome];
    if (where?.ticket?.in) { const s = new Set(where.ticket.in); r = r.filter((x) => s.has(x.ticket)); }
    return r.map((x) => ({ ...x }));
  },
  findUnique: async ({ where }) => { const k = Object.keys(where)[0]; return db[nome].find((x) => x[k] === where[k]) ?? null; },
  findFirst: async () => db[nome][0] ?? null,
  count: async () => db[nome].length,
  create: async ({ data }) => { const n = { id: db[nome].length + 1, createdAt: new Date(), ...data }; db[nome].push(n); return n; },
  createMany: async ({ data }) => { data.forEach((d) => db[nome].push({ id: db[nome].length + 1, createdAt: new Date(), ...d })); return { count: data.length }; },
  update: async ({ where, data }) => { const x = db[nome].find((y) => y.id === where.id); Object.assign(x, data); return x; },
  delete: async ({ where }) => { const i = db[nome].findIndex((y) => y.id === where.id); return db[nome].splice(i, 1)[0]; },
  deleteMany: async () => { const n = db[nome].length; db[nome] = []; return { count: n }; },
});
const prismaFake = {
  user: tabela('User'), analise: tabela('Analise'), lote: tabela('Lote'), log: tabela('Log'),
  $disconnect: async () => {},
};
const caminhoPrisma = path.join(BASE_DIR, 'src/lib/prisma.js');
require.cache[caminhoPrisma] = { id: caminhoPrisma, filename: caminhoPrisma, loaded: true, exports: prismaFake };

// ── Planilhas de teste ───────────────────────────────────────────────────
async function planilha(cabecalhos, linhas, aba = 'Análises') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(aba);
  ws.addRow(cabecalhos);
  linhas.forEach((l) => ws.addRow(l));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const CABS = ['Data', 'Ticket', 'Umidade (%)', 'Teor de Pó (%)', 'Teor de Palito (%)', 'Produtor'];
const d = (dia) => new Date(2026, 8, dia);

// ── Servidor ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.raw({
  type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
  limit: '15mb',
}));
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/analises', require('../src/routes/analises'));

const servidor = app.listen(0, async () => {
  const url = `http://127.0.0.1:${servidor.address().port}`;
  let falhas = 0;
  const ok = (c, m, extra = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  << ' + extra)); if (!c) falhas += 1; };

  const login = async (email) => (await (await fetch(`${url}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: '123456' }),
  })).json()).token;

  const importar = async (token, buffer, confirmar = false) => {
    const r = await fetch(`${url}/api/analises/importar${confirmar ? '?confirmar=1' : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Authorization: `Bearer ${token}`,
      },
      body: buffer,
    });
    return { status: r.status, body: await r.json() };
  };

  const admin = await login('admin@scq.com');
  const analista = await login('analista@scq.com');
  const compras = await login('compras@scq.com');

  console.log('\n1) Permissão');
  const simples = await planilha(CABS, [[d(1), 1001, 3.4, 3, 24, 'Sítio A']]);
  ok((await importar(compras, simples)).status === 403, 'COMPRAS não importa (perfil só de leitura)');
  ok((await importar(analista, simples)).status === 200, 'ANALISTA importa');
  const semToken = await fetch(`${url}/api/analises/importar`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: simples,
  });
  ok(semToken.status === 401, 'sem token = 401');

  console.log('\n2) Simulação não grava');
  const antes = db.Analise.length;
  const sim = await importar(admin, simples);
  ok(sim.body.simulacao === true && db.Analise.length === antes, 'sem ?confirmar=1 nada é gravado');

  console.log('\n3) Cálculo do desconto (RN01)');
  const pl = await planilha(CABS, [
    [d(1), 2001, 3.4, 3, 24, 'Sítio A'],
    [d(1), 2002, 4.1, 5, 30, 'Sítio B'],
    [d(2), 2003, 3.0, 4, 36, 'Sítio C'],
    [d(2), 2004, 3.2, 4, 47, 'Sítio D'],
  ]);
  const r3 = (await importar(admin, pl)).body;
  const desc = r3.amostra.map((a) => a.desconto);
  ok(r3.validas === 4, `4 linhas válidas (veio ${r3.validas})`);
  ok(desc[0] === 0 && desc[1] === 0, 'palito 24% e 30% não geram desconto');
  ok(Math.abs(desc[2] - 2.1) < 1e-9, 'palito 36% gera 2,1%', String(desc[2]));
  ok(Math.abs(desc[3] - 5.95) < 1e-9, 'palito 47% gera 5,95%', String(desc[3]));

  console.log('\n4) Unidade do teor de palito');
  const fracao = await planilha(CABS, [
    [d(1), 3001, 3.4, 3, 0.24, 'A'], [d(1), 3002, 3.4, 3, 0.36, 'B'], [d(1), 3003, 3.4, 3, 0.28, 'C'],
  ]);
  const rf = (await importar(admin, fracao)).body;
  ok(rf.unidadePalito === 'fracao', 'planilha em fração é detectada');
  ok(rf.amostra[0].percentualPalito === 24, '0,24 vira 24%', String(rf.amostra[0].percentualPalito));

  // Um valor absurdo no meio nao pode inverter a leitura do arquivo inteiro
  const fracaoComErro = await planilha(CABS, [
    [d(1), 3101, 3.4, 3, 0.24, 'A'], [d(1), 3102, 3.4, 3, 0.36, 'B'],
    [d(1), 3103, 3.4, 3, 3.87, 'C'], [d(1), 3104, 3.4, 3, 0.28, 'D'],
  ]);
  const rfe = (await importar(admin, fracaoComErro)).body;
  ok(rfe.unidadePalito === 'fracao', 'um valor fora da faixa não inverte a unidade do arquivo');
  ok(rfe.comProblema === 1, 'o valor absurdo vira linha com problema', `comProblema=${rfe.comProblema}`);

  console.log('\n5) Validações linha a linha');
  const ruins = await planilha(CABS, [
    [d(1), 4001, 3.4, 3, 24, 'ok'],
    [d(1), 4002.5, 3.4, 3, 24, 'ticket quebrado'],
    [d(1), 4001, 3.4, 3, 24, 'ticket repetido'],
    [null, 4003, 3.4, 3, 24, 'sem data'],
    [d(1), 4004, 483, 3, 24, 'umidade absurda'],
    [d(1), 4005, 3.4, 3, 'x', 'sem análise'],
    [d(1), 4006, 3.4, 3, null, 'sem palito'],
  ]);
  const rr = (await importar(admin, ruins)).body;
  ok(rr.validas === 1, `só 1 linha válida (veio ${rr.validas})`);
  ok(rr.semAnalise === 1, 'linha marcada com "x" é ignorada, não vira erro');
  const motivos = rr.problemas.map((p) => p.erros.join(' '));
  ok(motivos.some((m) => /inteiro/.test(m)), 'pega ticket fracionado');
  ok(motivos.some((m) => /repetido/.test(m)), 'pega ticket repetido');
  ok(motivos.some((m) => /sem data/.test(m)), 'pega linha sem data');
  ok(motivos.some((m) => /umidade/.test(m)), 'pega umidade fora da faixa');
  ok(motivos.some((m) => /palito/.test(m)), 'pega linha sem teor de palito');

  console.log('\n6) Gravação e repetição');
  const g = await planilha(CABS, [
    [d(3), 5001, 3.4, 3, 24, 'Sítio X'], [d(3), 5002, 3.4, 3, 36, 'Sítio Y'],
  ]);
  const g1 = (await importar(admin, g, true)).body;
  ok(g1.inseridas === 2, `inseriu 2 (veio ${g1.inseridas})`);
  const g2 = (await importar(admin, g, true)).body;
  ok(g2.inseridas === 0 && g2.jaNoBanco === 2, 'importar de novo não duplica');
  const gravada = db.Analise.find((a) => a.ticket === '5002');
  ok(gravada && Math.abs(gravada.desconto - 2.1) < 1e-9, 'desconto foi gravado calculado pelo servidor');
  ok(gravada && gravada.loteId === 1, 'análise foi amarrada ao lote do período', `loteId=${gravada?.loteId}`);

  console.log('\n7) Erros tratados');
  ok((await importar(admin, Buffer.from('isso não é um xlsx'))).status === 400, 'arquivo inválido devolve 400');
  const vazio = await fetch(`${url}/api/analises/importar`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${admin}` },
  });
  ok(vazio.status === 400, 'corpo vazio devolve 400');

  console.log('\n8) Modelo de planilha');
  const mod = await fetch(`${url}/api/analises/importar/modelo`, { headers: { Authorization: `Bearer ${admin}` } });
  const mb = Buffer.from(await mod.arrayBuffer());
  const wbm = new ExcelJS.Workbook(); await wbm.xlsx.load(mb);
  const wsm = wbm.worksheets[0];
  ok(mod.status === 200 && mb.length > 3000, 'modelo baixa como xlsx');
  ok(wsm.getRow(1).getCell(1).value === 'Data' && wsm.getRow(1).getCell(5).value === 'Teor de Palito (%)', 'modelo traz os cabeçalhos reconhecidos');
  const volta = (await importar(admin, mb)).body;
  ok(volta.validas === 2, 'o próprio modelo é importável (as 2 linhas de exemplo)');

  console.log('\n9) Planilha da fábrica, se estiver disponível');
  const real = [
    path.join(BASE_DIR, '..', '..', 'planilhas-importacao', 'controle-de-palitos.xlsx'),
    path.join(BASE_DIR, '..', 'planilhas-importacao', 'controle-de-palitos.xlsx'),
  ].find((p) => fs.existsSync(p));
  if (!real) {
    console.log('  – planilha real não encontrada, teste pulado');
  } else {
    const rr2 = (await importar(admin, fs.readFileSync(real))).body;
    ok(rr2.cabecalhoDetectado === true, 'reconhece o cabeçalho da planilha de palitos');
    ok(rr2.unidadePalito === 'fracao', 'lê o palito da planilha real como fração');
    ok(rr2.validas > 1000, `encontra mais de mil análises válidas (${rr2.validas})`);
  }

  console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
  servidor.close();
  process.exit(falhas ? 1 : 0);
});
