// Teste de integração do SCQ.
// Sobe o servidor Express real com um banco em memória no lugar do Prisma e
// valida login, permissões por aba, troca de senha e exportação de todos os módulos.
//
// Rodar com:  npm run test:api

process.env.JWT_SECRET = 'teste-secret';
process.env.DATABASE_URL = 'postgresql://fake';
const path = require('path');
const BASE = path.join(__dirname, '..');

// ── Banco falso em memória, injetado no lugar do Prisma ──────────────────
const bcrypt = require('bcryptjs');
const senhaHash = bcrypt.hashSync('123456', 4);

const db = {
  User: [
    { id: 1, nome: 'Administrador', email: 'admin@scq.com', senhaHash, perfil: 'ADMIN', ativo: true, permissoes: null, createdAt: new Date('2026-01-01') },
    { id: 2, nome: 'Ana Analista', email: 'analista@scq.com', senhaHash, perfil: 'ANALISTA', ativo: true, permissoes: null, createdAt: new Date('2026-01-02') },
    { id: 3, nome: 'Carlos Compras', email: 'compras@scq.com', senhaHash, perfil: 'COMPRAS', ativo: true, permissoes: null, createdAt: new Date('2026-01-03') },
    { id: 4, nome: 'Beto Bloqueado', email: 'inativo@scq.com', senhaHash, perfil: 'ANALISTA', ativo: false, permissoes: null, createdAt: new Date('2026-01-04') },
    // Permissão personalizada: só enxerga Análises, sem editar nada.
    { id: 5, nome: 'Vera Visitante', email: 'visita@scq.com', senhaHash, perfil: 'ANALISTA', ativo: true,
      permissoes: JSON.stringify({ dashboard: { view: true }, analises: { view: true, export: true } }), createdAt: new Date('2026-01-05') },
  ],
  Lote: [{ id: 1, codigo: 'L2026001', produto: 'Erva-Mate Cancheada', dataInicio: new Date('2026-01-10'), dataFim: new Date('2026-01-17'), observacao: null, createdAt: new Date(), _count: { analises: 2 } }],
  Analise: [
    { id: 1, nomeProdutor: 'Sítio Boa Esperança', loteId: 1, lote: { codigo: 'L2026001', produto: 'Erva-Mate Cancheada' }, ticket: '1001', dataAnalise: new Date('2026-01-12'), dataFabricacao: null, percentualPalito: 36, teorPo: 12.5, umidade: 11.2, desconto: 2.1, observacao: 'Lote úmido', createdAt: new Date() },
    { id: 2, nomeProdutor: 'Fazenda São José', loteId: 1, lote: { codigo: 'L2026001', produto: 'Erva-Mate Cancheada' }, ticket: '1002', dataAnalise: new Date('2026-02-18'), dataFabricacao: null, percentualPalito: 28, teorPo: 8, umidade: 9.5, desconto: 0, observacao: null, createdAt: new Date() },
  ],
  FichaEmbalagem: [{ id: 1, fornecedor: 'Ervateira Central Ltda', statusGlobal: 'CONFORME', observacoes: null, createdAt: new Date(),
    parametros: JSON.stringify([
      { resultado: '0.85', unidade: 'g/cm3', padrao: '0.80-0.90', unidadePadrao: 'g/cm3', conforme: true },
      { resultado: '15x10', unidade: 'cm', padrao: '15x10', unidadePadrao: 'cm', conforme: true },
      { resultado: 'OK', unidade: '', padrao: 'Sem defeitos', unidadePadrao: '', conforme: true },
      { resultado: '7898901234560', unidade: '', padrao: '7898901234560', unidadePadrao: '', conforme: false }]) }],
  ColetaAmostra: [{ id: 1, tipoProduto: 'Erva-Mate Cancheada', destino: 'TECPAR', dataColeta: new Date('2026-05-15'), createdAt: new Date() }],
  Log: [{ id: 1, userId: 2, userEmail: 'analista@scq.com', acao: 'CRIAR', entidade: 'ANALISE', entidadeId: 1, detalhes: '{"ticket":"1001"}', createdAt: new Date() }],
};

const tabela = (nome) => ({
  findMany: async ({ where, take, skip } = {}) => { let r = db[nome].slice(); if (skip) r = r.slice(skip); if (take) r = r.slice(0, take); return r; },
  findUnique: async ({ where }) => {
    const chave = Object.keys(where)[0];
    return db[nome].find((x) => x[chave] === where[chave]) ?? null;
  },
  findFirst: async ({ where }) => db[nome].find((x) => where.email ? x.email === where.email && x.id !== where.id?.not : true) ?? null,
  count: async () => db[nome].length,
  create: async ({ data }) => { const novo = { id: db[nome].length + 100, createdAt: new Date(), ativo: true, _count: { analises: 0 }, ...data }; db[nome].push(novo); return novo; },
  update: async ({ where, data }) => { const x = db[nome].find((y) => y.id === where.id); Object.assign(x, data); return x; },
  delete: async ({ where }) => { const i = db[nome].findIndex((y) => y.id === where.id); return db[nome].splice(i, 1)[0]; },
  deleteMany: async () => { const n = db[nome].length; db[nome] = []; return { count: n }; },
  groupBy: async () => [],
});

const prismaFake = {
  user: tabela('User'), lote: tabela('Lote'), analise: tabela('Analise'),
  fichaEmbalagem: tabela('FichaEmbalagem'), coletaAmostra: tabela('ColetaAmostra'), log: tabela('Log'),
  $executeRawUnsafe: async () => 0, $disconnect: async () => {},
};

// Injeta o banco falso no lugar de src/lib/prisma.js
const caminhoPrisma = path.join(BASE, 'src/lib/prisma.js');
require.cache[caminhoPrisma] = { id: caminhoPrisma, filename: caminhoPrisma, loaded: true, exports: prismaFake };

// ── Sobe o servidor real ─────────────────────────────────────────────────
const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/analises', require('../src/routes/analises'));
app.use('/api/fichas', require('../src/routes/fichas'));
app.use('/api/coletas', require('../src/routes/coletas'));
app.use('/api/lotes', require('../src/routes/lotes'));
app.use('/api/logs', require('../src/routes/logs'));
app.use('/api/usuarios', require('../src/routes/usuarios'));

const servidor = app.listen(0, async () => {
  const porta = servidor.address().port;
  const url = (p) => `http://127.0.0.1:${porta}${p}`;
  let falhas = 0;
  const ok = (c, m, extra = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  << ' + extra)); if (!c) falhas++; };

  const login = async (email, senha = '123456') => {
    const r = await fetch(url('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
    return { status: r.status, body: await r.json() };
  };
  const req = (metodo, caminho, token, corpo) => fetch(url(caminho), {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  console.log('\n1) Login');
  const admin = await login('admin@scq.com');
  ok(admin.status === 200 && admin.body.permissoes?.usuarios?.write === true, 'admin loga e recebe as permissões', JSON.stringify(admin.body).slice(0,120));
  ok(admin.body.nome === 'Administrador', 'login devolve o nome do usuário');
  const analista = await login('analista@scq.com');
  const compras = await login('compras@scq.com');
  const visita = await login('visita@scq.com');
  const inativo = await login('inativo@scq.com');
  ok(inativo.status === 403, 'usuário INATIVO é barrado no login', 'status ' + inativo.status);
  const senhaErrada = await login('admin@scq.com', 'errada');
  ok(senhaErrada.status === 401, 'senha errada é rejeitada');

  console.log('\n2) Permissões por aba');
  ok((await req('GET', '/api/usuarios', admin.body.token)).status === 200, 'admin lista usuários');
  ok((await req('GET', '/api/usuarios', analista.body.token)).status === 403, 'analista NÃO acessa usuários');
  ok((await req('GET', '/api/logs', compras.body.token)).status === 403, 'compras NÃO acessa os logs');
  ok((await req('POST', '/api/lotes', compras.body.token, { codigo: 'X1', dataInicio: '2026-01-01', dataFim: '2026-01-08' })).status === 403, 'compras NÃO cria lote');
  ok((await req('POST', '/api/lotes', analista.body.token, { codigo: 'X1', dataInicio: '2026-01-01', dataFim: '2026-01-08' })).status === 201, 'analista CRIA lote');
  ok((await req('GET', '/api/analises', visita.body.token)).status === 200, 'permissão personalizada: vê Análises');
  ok((await req('GET', '/api/coletas', visita.body.token)).status === 403, 'permissão personalizada: NÃO vê Coletas');
  ok((await req('DELETE', '/api/analises/1', visita.body.token)).status === 403, 'permissão personalizada: NÃO exclui análise');
  ok((await req('GET', '/api/lotes', visita.body.token)).status === 200, 'quem vê Análises consegue ler os lotes (seletor do formulário)');
  ok((await req('GET', '/api/analises', null)).status === 401, 'sem token = 401');

  console.log('\n3) Trocar a própria senha');
  ok((await req('PUT', '/api/auth/senha', analista.body.token, { senhaAtual: 'errada', novaSenha: 'novasenha1' })).status === 401, 'senha atual errada é rejeitada');
  ok((await req('PUT', '/api/auth/senha', analista.body.token, { senhaAtual: '123456', novaSenha: '123' })).status === 400, 'nova senha curta é rejeitada');
  ok((await req('PUT', '/api/auth/senha', analista.body.token, { senhaAtual: '123456', novaSenha: '123456' })).status === 400, 'nova senha igual à atual é rejeitada');
  ok((await req('PUT', '/api/auth/senha', null, { senhaAtual: '123456', novaSenha: 'nova123' })).status === 401, 'trocar senha exige login');
  ok((await req('PUT', '/api/auth/senha', analista.body.token, { senhaAtual: '123456', novaSenha: 'novaSenha123' })).status === 200, 'analista troca a própria senha');
  ok((await login('analista@scq.com', 'novaSenha123')).status === 200, 'a senha nova realmente funciona no login');
  ok((await login('analista@scq.com', '123456')).status === 401, 'a senha antiga deixa de funcionar');

  console.log('\n4) Exportação Excel de cada módulo');
  const ExcelJS = require('exceljs');
  for (const [nome, caminho, token] of [
    ['Análises', '/api/analises/exportar/excel', admin.body.token],
    ['Lotes',    '/api/lotes/exportar',          admin.body.token],
    ['Coletas',  '/api/coletas/exportar',        admin.body.token],
    ['Fichas',   '/api/fichas/exportar',         admin.body.token],
    ['Logs',     '/api/logs/exportar',           admin.body.token],
    ['Usuários', '/api/usuarios/exportar',       admin.body.token],
  ]) {
    const r = await req('GET', caminho, token);
    if (r.status !== 200) { ok(false, `${nome}: exporta`, 'status ' + r.status + ' ' + (await r.text()).slice(0, 120)); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    const cab = ws.getRow(6).values.slice(1).filter(Boolean);
    const temDados = ws.getRow(7).values.slice(1).filter(Boolean).length > 0;
    ok(ws.getCell('A1').value === 'INDÚSTRIA ERVATEIRA VERDELÂNDIA LTDA'
       && ws.getCell('A6').fill?.fgColor?.argb === 'FF065F46'
       && cab.length >= 5 && temDados,
       `${nome}: planilha com cabeçalho, ${cab.length} colunas e dados`, JSON.stringify({ cab: cab.length, temDados }));
  }
  ok((await req('GET', '/api/logs/exportar', compras.body.token)).status === 403, 'compras NÃO exporta logs');
  ok((await req('GET', '/api/analises/exportar/excel', compras.body.token)).status === 200, 'compras EXPORTA análises');

  console.log('\n5) Travas da gestão de usuários');
  ok((await req('PATCH', '/api/usuarios/1/ativo', admin.body.token, { ativo: false })).status === 400, 'admin não inativa a si mesmo');
  ok((await req('DELETE', '/api/usuarios/1', admin.body.token)).status === 400, 'admin não exclui a si mesmo');
  const r2 = await req('PUT', '/api/usuarios/1', admin.body.token, { nome: 'Adm', email: 'admin@scq.com', perfil: 'ANALISTA' });
  ok(r2.status === 400, 'não dá pra rebaixar o único admin (ficaria sem ninguém gerenciando acessos)', 'status ' + r2.status);
  ok((await req('POST', '/api/usuarios', admin.body.token, { nome: 'Novo', email: 'novo@scq.com', senha: '123456', perfil: 'GESTOR' })).status === 201, 'admin cria usuário');
  ok((await req('POST', '/api/usuarios', admin.body.token, { nome: 'Dup', email: 'admin@scq.com', senha: '123456', perfil: 'GESTOR' })).status === 409, 'e-mail duplicado é bloqueado');

  console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
  servidor.close();
  process.exit(falhas ? 1 : 0);
});
