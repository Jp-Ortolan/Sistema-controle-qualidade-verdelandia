// Base de demonstração para ensaiar o sistema sem expor os dados reais da Verdelândia.
//
// Os registros ficam numa janela de datas própria (jan a mar/2025), separada dos
// dados reais (nov/2025 em diante). É isso que torna a remoção segura: nada é
// apagado fora dessa janela.
//
// Uso:
//   npm run db:demo                  simulação, não grava nada
//   npm run db:demo -- --confirmar   cria a base de demonstração
//   npm run db:demo -- --remover     apaga só a base de demonstração

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { calcularDesconto } = require('../src/lib/desconto');

const prisma = new PrismaClient();


const MARCA = 'Dados de demonstração';
const JANELA_INICIO = new Date(Date.UTC(2025, 0, 1, 0, 0, 0));
const JANELA_FIM = new Date(Date.UTC(2025, 3, 30, 23, 59, 59));

const PRODUTO = 'Erva-Mate Cancheada';
const USUARIO_DEMO = { email: 'demo@scq.com', nome: 'Usuário de Demonstração', senha: 'demo1234', perfil: 'ADMIN' };

// Nomes inventados. Nenhum produtor real da Verdelândia aparece aqui.
const PRODUTORES = [
  'Sítio Aurora', 'Fazenda Três Pinheiros', 'Chácara Bom Retiro', 'Sítio Santa Clara',
  'Fazenda Vale do Mate', 'Sítio Recanto Verde', 'Chácara São Bento', 'Fazenda Alto da Serra',
  'Sítio Águas Claras', 'Fazenda Campo Alegre',
];

const dia = (mes, d) => new Date(Date.UTC(2025, mes, d, 12, 0, 0));
const brDate = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

// Sequência fixa, sem aleatoriedade: rodar duas vezes gera o mesmo resultado.
function montarLotes() {
  const lotes = [];
  let inicio = dia(0, 3); // sexta, 03/01/2025
  for (let i = 0; i < 8; i += 1) {
    const fim = new Date(inicio.getTime() + 6 * 24 * 3600 * 1000);
    lotes.push({ codigo: String(901 + i), produto: PRODUTO, dataInicio: inicio, dataFim: fim, observacao: MARCA });
    inicio = new Date(fim.getTime() + 24 * 3600 * 1000);
  }
  return lotes;
}

// Teores escolhidos para haver caso sem desconto, no limite e acima dele.
const PALITOS = [22, 25, 28, 30, 31, 33, 36, 38, 41, 44, 26, 29, 32, 35, 24, 27];

function montarAnalises(lotes) {
  const analises = [];
  let ticket = 90001;
  lotes.forEach((lote, iLote) => {
    const quantas = 6 + (iLote % 3); // 6 a 8 por lote
    for (let i = 0; i < quantas; i += 1) {
      const palito = PALITOS[(iLote * 3 + i) % PALITOS.length];
      const data = new Date(lote.dataInicio.getTime() + (i % 5) * 24 * 3600 * 1000);
      analises.push({
        ticket: String(ticket),
        nomeProdutor: PRODUTORES[(iLote * 2 + i) % PRODUTORES.length],
        dataAnalise: data,
        percentualPalito: palito,
        desconto: calcularDesconto(palito),
        teorPo: 2 + ((iLote + i) % 6),
        umidade: Math.round((2.4 + ((iLote * 7 + i * 3) % 22) / 10) * 100) / 100,
        observacao: MARCA,
        codigoLote: lote.codigo,
      });
      ticket += 1;
    }
  });
  return analises;
}

function montarFichas() {
  const base = [
    ['Embalagens Aurora Ltda', true], ['Plásticos Bom Retiro', true],
    ['Embalagens Vale Verde', false], ['Indústria Santa Clara', true],
    ['Plásticos Campo Alegre', false], ['Embalagens Três Rios', true],
  ];
  return base.map(([fornecedor, conforme], i) => ({
    fornecedor,
    statusGlobal: conforme ? 'CONFORME' : 'NAO_CONFORME',
    observacoes: MARCA,
    createdAt: dia(i % 3, 6 + i * 3),
    parametros: JSON.stringify([
      { resultado: conforme ? '0.85' : '0.71', unidade: 'g/cm3', padrao: '0.80-0.90', unidadePadrao: 'g/cm3', conforme },
      { resultado: '15x10', unidade: 'cm', padrao: '15x10', unidadePadrao: 'cm', conforme: true },
      { resultado: conforme ? 'OK' : 'Impressão borrada', unidade: '', padrao: 'Sem defeitos', unidadePadrao: '', conforme },
      { resultado: '7890000000001', unidade: '', padrao: '7890000000001', unidadePadrao: '', conforme: true },
    ]),
  }));
}

function montarColetas() {
  const destinos = ['Laboratório Interno', 'TECPAR', 'Laboratório Interno', 'TECPAR', 'Laboratório Interno', 'TECPAR', 'Laboratório Interno', 'TECPAR'];
  return destinos.map((destino, i) => ({
    tipoProduto: PRODUTO,
    destino,
    dataColeta: dia(Math.floor(i / 3), 8 + (i % 3) * 7),
  }));
}

async function contarDemo() {
  const [analises, lotes, fichas, coletas] = await Promise.all([
    prisma.analise.count({ where: { dataAnalise: { gte: JANELA_INICIO, lte: JANELA_FIM }, observacao: MARCA } }),
    prisma.lote.count({ where: { dataInicio: { gte: JANELA_INICIO, lte: JANELA_FIM }, observacao: MARCA } }),
    prisma.fichaEmbalagem.count({ where: { createdAt: { gte: JANELA_INICIO, lte: JANELA_FIM }, observacoes: MARCA } }),
    prisma.coletaAmostra.count({ where: { dataColeta: { gte: JANELA_INICIO, lte: JANELA_FIM } } }),
  ]);
  return { analises, lotes, fichas, coletas };
}

async function contarTudo() {
  const [analises, lotes, fichas, coletas] = await Promise.all([
    prisma.analise.count(), prisma.lote.count(), prisma.fichaEmbalagem.count(), prisma.coletaAmostra.count(),
  ]);
  return { analises, lotes, fichas, coletas };
}

async function remover({ confirmar = false } = {}) {
  const antes = await contarDemo();
  console.log('Registros de demonstração encontrados:');
  console.log(`  análises ${antes.analises} · lotes ${antes.lotes} · fichas ${antes.fichas} · coletas ${antes.coletas}`);

  if (!confirmar) {
    console.log('\n⚠️  Nada foi apagado. Rode com --remover --confirmar para apagar de verdade.');
    return;
  }

  // Analises primeiro: elas apontam para Lote.
  await prisma.analise.deleteMany({ where: { dataAnalise: { gte: JANELA_INICIO, lte: JANELA_FIM }, observacao: MARCA } });
  await prisma.lote.deleteMany({ where: { dataInicio: { gte: JANELA_INICIO, lte: JANELA_FIM }, observacao: MARCA } });
  await prisma.fichaEmbalagem.deleteMany({ where: { createdAt: { gte: JANELA_INICIO, lte: JANELA_FIM }, observacoes: MARCA } });
  await prisma.coletaAmostra.deleteMany({ where: { dataColeta: { gte: JANELA_INICIO, lte: JANELA_FIM } } });

  const depois = await contarTudo();
  console.log('\n✅ Base de demonstração removida.');
  console.log(`   Continuam no banco: análises ${depois.analises} · lotes ${depois.lotes} · fichas ${depois.fichas} · coletas ${depois.coletas}`);
  console.log('   O usuário demo@scq.com foi mantido. Para tirá-lo, exclua pela tela de Usuários.');
}

async function criar({ confirmar = false } = {}) {
  const lotes = montarLotes();
  const analises = montarAnalises(lotes);
  const fichas = montarFichas();
  const coletas = montarColetas();

  const foraDaJanela = await prisma.analise.count({
    where: { OR: [{ dataAnalise: { lt: JANELA_INICIO } }, { dataAnalise: { gt: JANELA_FIM } }] },
  });

  console.log('═'.repeat(68));
  console.log(confirmar ? '  BASE DE DEMONSTRAÇÃO — GRAVANDO' : '  BASE DE DEMONSTRAÇÃO — SIMULAÇÃO (nada será gravado)');
  console.log('═'.repeat(68));
  console.log(`
  janela de datas .......... ${brDate(JANELA_INICIO)} a ${brDate(JANELA_FIM)}
  lotes .................... ${lotes.length}  (códigos ${lotes[0].codigo} a ${lotes[lotes.length - 1].codigo})
  análises ................. ${analises.length}  (tickets ${analises[0].ticket} a ${analises[analises.length - 1].ticket})
    com desconto ........... ${analises.filter((a) => a.desconto > 0).length}
  fichas de embalagem ...... ${fichas.length}  (${fichas.filter((f) => f.statusGlobal === 'CONFORME').length} conformes)
  coletas .................. ${coletas.length}
  usuário .................. ${USUARIO_DEMO.email} / ${USUARIO_DEMO.senha}
`);

  if (foraDaJanela > 0) {
    console.log(`  ⚠️  ATENÇÃO: há ${foraDaJanela} análise(s) fora da janela de demonstração no banco.`);
    console.log('      Provavelmente são os dados reais da Verdelândia, que continuam visíveis.');
    console.log('      Para escondê-los, rode antes:  npm run db:limpar -- --confirmar\n');
  }

  if (!confirmar) {
    console.log('  Rode de novo com --confirmar para gravar.');
    console.log('─'.repeat(68));
    return;
  }

  const criados = {};
  for (const l of lotes) {
    const existe = await prisma.lote.findUnique({ where: { codigo: l.codigo } });
    criados[l.codigo] = existe ? existe.id : (await prisma.lote.create({ data: l })).id;
  }

  const jaTem = new Set(
    (await prisma.analise.findMany({ where: { ticket: { in: analises.map((a) => a.ticket) } }, select: { ticket: true } }))
      .map((a) => a.ticket),
  );
  const novas = analises.filter((a) => !jaTem.has(a.ticket));
  if (novas.length > 0) {
    await prisma.analise.createMany({
      data: novas.map(({ codigoLote, ...a }) => ({ ...a, loteId: criados[codigoLote] ?? null, dataFabricacao: null })),
    });
  }

  if ((await prisma.fichaEmbalagem.count({ where: { observacoes: MARCA } })) === 0) {
    for (const f of fichas) await prisma.fichaEmbalagem.create({ data: f });
  }
  if ((await prisma.coletaAmostra.count({ where: { dataColeta: { gte: JANELA_INICIO, lte: JANELA_FIM } } })) === 0) {
    for (const c of coletas) await prisma.coletaAmostra.create({ data: c });
  }

  const existente = await prisma.user.findUnique({ where: { email: USUARIO_DEMO.email } });
  if (!existente) {
    await prisma.user.create({
      data: {
        nome: USUARIO_DEMO.nome, email: USUARIO_DEMO.email,
        senhaHash: await bcrypt.hash(USUARIO_DEMO.senha, 10),
        perfil: USUARIO_DEMO.perfil, ativo: true, permissoes: null,
      },
    });
  }

  console.log(`  ✅ Pronto. ${novas.length} análise(s) e ${lotes.length} lote(s) de demonstração no sistema.`);
  console.log(`     Entre com ${USUARIO_DEMO.email} / ${USUARIO_DEMO.senha}`);
  console.log('─'.repeat(68));
}

module.exports = { criar, remover, MARCA, JANELA_INICIO, JANELA_FIM, USUARIO_DEMO };

if (require.main === module) {
  const args = process.argv.slice(2);
  const opcoes = { confirmar: args.includes('--confirmar') };
  (args.includes('--remover') ? remover(opcoes) : criar(opcoes))
    .catch((e) => { console.error('\n❌ Erro:', e?.message ?? e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
