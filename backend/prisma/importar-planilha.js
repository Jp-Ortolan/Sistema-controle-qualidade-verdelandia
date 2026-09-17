// Importa para o SCQ os dados historicos das planilhas da fabrica:
//   - "controle de palitos.xlsx"        -> analises
//   - "LOTES SEMANAIS ETIQUETAS.xlsx"   -> lotes
//
// Roda em modo SIMULACAO por padrao: mostra o que entraria e o que falharia,
// sem gravar nada. So grava com --confirmar.
//
// Uso mais simples (recomendado): deixe as duas planilhas na pasta
// "planilhas-importacao" ao lado do projeto e rode sem argumento nenhum:
//   npm run db:importar
//   npm run db:importar -- --confirmar
//
// O script acha a pasta sozinho e identifica cada arquivo pelo nome (o que
// tiver "palito" e o que tiver "lote"). Isso evita caminho com espaco, que
// se quebra quando passa por railway run -> powershell -> npm -> node.
//
// Se precisar apontar o arquivo na mao:
//   node prisma/importar-planilha.js --palitos="C:\\caminho\\palitos.xlsx" --lotes="C:\\caminho\\lotes.xlsx"
//
// Opcoes:
//   --sem-projecao   nao inventa os lotes que faltam no fim da planilha
//   --todos-lotes    cadastra todos os lotes da planilha, nao so os que tem analise
//   --pasta=CAMINHO  usa outra pasta em vez de procurar sozinho
//   --limite=N       processa so as N primeiras analises (para testar)

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { lerAnalises, valor, arred, soData } = require('../src/lib/importacao');

const prisma = new PrismaClient();

// ── Argumentos ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (nome) => {
  const a = args.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : null;
};
const tem = (nome) => args.includes(`--${nome}`);

// Procura as planilhas quando o caminho nao foi informado.
const PASTAS_PADRAO = [
  opt('pasta'),
  path.resolve(process.cwd(), 'planilhas-importacao'),
  path.resolve(__dirname, '..', '..', 'planilhas-importacao'),        // raiz do repositorio
  path.resolve(__dirname, '..', '..', '..', 'planilhas-importacao'),  // uma pasta acima do repositorio
].filter(Boolean);

function procurar(termo) {
  for (const pasta of PASTAS_PADRAO) {
    let arquivos;
    try { arquivos = fs.readdirSync(pasta); } catch { continue; }
    const achado = arquivos.find(
      (f) => /\.xlsx$/i.test(f) && !f.startsWith('~$') && f.toLowerCase().includes(termo),
    );
    if (achado) return path.join(pasta, achado);
  }
  return null;
}

const CAMINHO_PALITOS = opt('palitos') || procurar('palito');
const CAMINHO_LOTES = opt('lotes') || procurar('lote');
const CONFIRMAR = tem('confirmar');
const PROJETAR = !tem('sem-projecao');
const TODOS_LOTES = tem('todos-lotes');
const LIMITE = opt('limite') ? parseInt(opt('limite')) : null;

const PRODUTO = 'Erva-Mate Cancheada';

// ── Utilidades ───────────────────────────────────────────────────────────
const chaveDia = (d) => d.toISOString().slice(0, 10);
const brDate = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

// ── Leitura dos lotes ────────────────────────────────────────────────────
async function lerLotes(caminho) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(caminho);
  const ws = wb.worksheets[0];

  const brutos = [];
  ws.eachRow((linha, n) => {
    if (n < 5) return; // cabecalho e titulo
    const num = valor(linha.getCell(1));
    const ini = valor(linha.getCell(2));
    const fim = valor(linha.getCell(3));
    const suf = valor(linha.getCell(4));
    if (!(ini instanceof Date) || !(fim instanceof Date) || num === null) return;
    const sufixo = suf === null ? '' : String(suf).trim().toUpperCase();
    brutos.push({
      linha: n,
      codigo: `${num}${sufixo}`, // so o numero; a tela ja escreve "Lote:" antes
      inicio: soData(ini),
      fim: soData(fim),
    });
  });

  // Codigo repetido na planilha: o banco nao aceita, entao esses lotes ficam de fora
  // e as analises do periodo entram sem lote.
  const contagem = {};
  for (const l of brutos) contagem[l.codigo] = (contagem[l.codigo] ?? 0) + 1;
  const conflitantes = new Set(Object.keys(contagem).filter((c) => contagem[c] > 1));

  const lotes = brutos.filter((l) => !conflitantes.has(l.codigo));
  const descartados = brutos.filter((l) => conflitantes.has(l.codigo));

  return { lotes, descartados, conflitantes: [...conflitantes] };
}

// Continua o ciclo semanal (mesmo dia da semana, 7 dias) ate cobrir a ultima analise.
function projetarLotes(lotes, ultimaData) {
  if (!PROJETAR || lotes.length === 0) return [];
  const semSufixo = lotes.filter((l) => /^\d+$/.test(l.codigo));
  if (semSufixo.length === 0) return [];

  const ultimo = semSufixo.reduce((a, b) => (a.fim > b.fim ? a : b));
  let numero = parseInt(ultimo.codigo, 10);
  let inicio = new Date(ultimo.fim.getTime() + 24 * 3600 * 1000);

  const novos = [];
  let guarda = 0;
  while (inicio <= ultimaData && guarda++ < 500) {
    numero += 1;
    const fim = new Date(inicio.getTime() + 6 * 24 * 3600 * 1000);
    novos.push({ codigo: String(numero), inicio, fim, projetado: true });
    inicio = new Date(fim.getTime() + 24 * 3600 * 1000);
  }
  return novos;
}

// ── Principal ────────────────────────────────────────────────────────────
async function main() {
  if (!CAMINHO_PALITOS) {
    console.error('Não achei a planilha de análises (nome contendo "palito").');
    console.error('Coloque os arquivos .xlsx numa pasta "planilhas-importacao" em um destes lugares:');
    for (const p of PASTAS_PADRAO) console.error(`   ${p}`);
    console.error('Ou informe o caminho: --palitos="C:\\caminho\\arquivo.xlsx"');
    process.exit(1);
  }
  for (const [rotulo, arq] of [['análises', CAMINHO_PALITOS], ['lotes', CAMINHO_LOTES]]) {
    if (arq && !fs.existsSync(arq)) {
      console.error(`Arquivo de ${rotulo} não encontrado: ${arq}`);
      process.exit(1);
    }
  }

  console.log('═'.repeat(72));
  console.log(CONFIRMAR ? '  IMPORTAÇÃO — GRAVANDO NO BANCO' : '  IMPORTAÇÃO — MODO SIMULAÇÃO (nada será gravado)');
  console.log('═'.repeat(72));
  console.log(`  análises : ${CAMINHO_PALITOS}`);
  console.log(`  lotes    : ${CAMINHO_LOTES ?? '(nenhuma — análises entrarão sem lote)'}`);

  // 1. Analises
  const { validas, problemas, avisos, vazias, semAnalise } = await lerAnalises(CAMINHO_PALITOS);
  const analises = LIMITE ? validas.slice(0, LIMITE) : validas;

  console.log(`
PLANILHA DE ANÁLISES
  linhas em branco ................. ${vazias}
  marcadas com "x" (sem análise) ... ${semAnalise}
  com problema ..................... ${problemas.length}
  prontas para importar ............ ${analises.length}`);

  if (problemas.length > 0) {
    console.log('\n  LINHAS COM PROBLEMA (não serão importadas):');
    for (const p of problemas) {
      console.log(`    linha ${String(p.linha).padStart(5)} | ticket ${p.ticket ?? '—'} | ${p.erros.join('; ')}`);
    }
  }

  if (avisos.length > 0) {
    console.log('\n  AVISOS (serão importadas assim mesmo — confira se o número está certo):');
    for (const a of avisos) {
      console.log(`    linha ${String(a.linha).padStart(5)} | ticket ${a.ticket} destoa dos vizinhos (${a.vizinhos[0]} e ${a.vizinhos[1]})`);
    }
  }

  if (analises.length === 0) {
    console.log('\nNada para importar.');
    return;
  }

  // 2. Lotes
  let lotes = [];
  let projetados = [];
  if (CAMINHO_LOTES) {
    const r = await lerLotes(CAMINHO_LOTES);
    lotes = r.lotes;
    const ultima = analises.reduce((a, b) => (a.data > b.data ? a : b)).data;
    projetados = projetarLotes(lotes, ultima);

    console.log(`
PLANILHA DE LOTES
  lotes lidos ...................... ${lotes.length + r.descartados.length}
  descartados por código repetido .. ${r.descartados.length}${r.conflitantes.length ? ` (${r.conflitantes.join(', ')})` : ''}
  lotes utilizáveis ................ ${lotes.length}
  projetados (ciclo semanal) ....... ${projetados.length}${projetados.length ? ` — de ${projetados[0].codigo} a ${projetados[projetados.length - 1].codigo}` : ''}`);
    if (r.descartados.length > 0) {
      console.log('\n  LOTES DESCARTADOS (código repetido — análises do período ficam sem lote):');
      for (const l of r.descartados) console.log(`    ${l.codigo.padEnd(8)} ${brDate(l.inicio)} a ${brDate(l.fim)}`);
    }
    lotes = [...lotes, ...projetados];
  }

  // 3. Casamento analise -> lote
  const porData = new Map();
  for (const l of lotes) {
    for (let d = new Date(l.inicio); d <= l.fim; d = new Date(d.getTime() + 24 * 3600 * 1000)) {
      const k = chaveDia(d);
      if (!porData.has(k)) porData.set(k, l);
    }
  }
  let comLote = 0;
  const semLotePorMes = {};
  for (const a of analises) {
    a.lote = porData.get(chaveDia(a.data)) ?? null;
    if (a.lote) comLote += 1;
    else {
      const m = `${a.data.getUTCFullYear()}-${String(a.data.getUTCMonth() + 1).padStart(2, '0')}`;
      semLotePorMes[m] = (semLotePorMes[m] ?? 0) + 1;
    }
  }
  console.log(`
CASAMENTO ANÁLISE → LOTE
  com lote ......................... ${comLote}
  sem lote ......................... ${analises.length - comLote}`);
  if (Object.keys(semLotePorMes).length > 0) {
    console.log('  sem lote, por mês:');
    for (const m of Object.keys(semLotePorMes).sort()) console.log(`    ${m}: ${semLotePorMes[m]}`);
  }

  const usados = new Set(analises.filter((a) => a.lote).map((a) => a.lote.codigo));
  const lotesUsados = TODOS_LOTES ? lotes : lotes.filter((l) => usados.has(l.codigo));

  // 4. O que ja existe no banco (torna a importacao repetivel sem duplicar)
  const [lotesBanco, analisesBanco] = await Promise.all([
    prisma.lote.findMany({ select: { id: true, codigo: true } }),
    prisma.analise.findMany({ select: { ticket: true } }),
  ]);
  const codigosBanco = new Map(lotesBanco.map((l) => [l.codigo, l.id]));
  const ticketsBanco = new Set(analisesBanco.map((a) => a.ticket).filter(Boolean));

  const lotesNovos = lotesUsados.filter((l) => !codigosBanco.has(l.codigo));
  const analisesNovas = analises.filter((a) => !ticketsBanco.has(a.ticket));
  const jaImportadas = analises.length - analisesNovas.length;

  console.log(`
SITUAÇÃO NO BANCO
  lotes já cadastrados ............. ${lotesBanco.length}
  lotes a criar .................... ${lotesNovos.length}${TODOS_LOTES ? ' (todos da planilha)' : ' (só os que têm análise — use --todos-lotes para cadastrar o histórico inteiro)'}
  análises já no banco (mesmo ticket, serão puladas) ... ${jaImportadas}
  análises a inserir ............... ${analisesNovas.length}`);

  const descontos = analisesNovas.filter((a) => a.desconto > 0);
  console.log(`
CONFERÊNCIA
  período .......................... ${brDate(analises.reduce((a, b) => (a.data < b.data ? a : b)).data)} a ${brDate(analises.reduce((a, b) => (a.data > b.data ? a : b)).data)}
  com desconto (palito > 30%) ...... ${descontos.length}
  sem desconto ..................... ${analisesNovas.length - descontos.length}
  com produtor preenchido .......... ${analisesNovas.filter((a) => a.nomeProdutor).length}`);
  console.log('\n  AMOSTRA (5 primeiras a inserir):');
  for (const a of analisesNovas.slice(0, 5)) {
    console.log(`    ticket ${a.ticket.padEnd(6)} ${brDate(a.data)}  palito ${String(a.percentualPalito).padStart(5)}%  desconto ${String(a.desconto).padStart(6)}%  lote ${(a.lote?.codigo ?? '—').padEnd(8)} ${a.nomeProdutor || ''}`);
  }

  if (!CONFIRMAR) {
    console.log(`
${'─'.repeat(72)}
⚠️  SIMULAÇÃO — nada foi gravado.
   Para gravar de verdade, repita o comando acrescentando --confirmar
${'─'.repeat(72)}`);
    return;
  }

  // 5. Gravacao
  console.log('\nGravando...');
  for (const l of lotesNovos) {
    const criado = await prisma.lote.create({
      data: {
        codigo: l.codigo,
        produto: PRODUTO,
        dataInicio: l.inicio,
        dataFim: l.fim,
        observacao: l.projetado ? 'Lote gerado na importação seguindo o ciclo semanal da planilha' : 'Importado da planilha de lotes semanais',
      },
    });
    codigosBanco.set(l.codigo, criado.id);
  }
  console.log(`  ${lotesNovos.length} lote(s) criado(s)`);

  let inseridas = 0;
  const lote = 200;
  for (let i = 0; i < analisesNovas.length; i += lote) {
    const bloco = analisesNovas.slice(i, i + lote);
    await prisma.analise.createMany({
      data: bloco.map((a) => ({
        nomeProdutor: a.nomeProdutor,
        loteId: a.lote ? codigosBanco.get(a.lote.codigo) ?? null : null,
        ticket: a.ticket,
        dataAnalise: a.data,
        dataFabricacao: null,
        percentualPalito: a.percentualPalito,
        teorPo: a.teorPo,
        umidade: a.umidade,
        desconto: a.desconto,
        observacao: 'Importado da planilha de controle de palitos',
      })),
    });
    inseridas += bloco.length;
    process.stdout.write(`\r  ${inseridas}/${analisesNovas.length} análises inseridas`);
  }
  console.log(`\n\n✅ Importação concluída: ${lotesNovos.length} lote(s) e ${inseridas} análise(s).`);
}

main()
  .catch((e) => { console.error('\n❌ Erro:', e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
