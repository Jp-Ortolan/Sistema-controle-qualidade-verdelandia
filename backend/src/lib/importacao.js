// Leitura e validacao de planilha de analises.
// Usada pela importacao via tela (rota POST /api/analises/importar) e pelo
// script de linha de comando, para as duas seguirem exatamente as mesmas regras.

const ExcelJS = require('exceljs');
const { calcularDesconto } = require('./desconto');

// Colunas aceitas, por nome de cabecalho (sem acento, minusculo).
const COLUNAS = {
  data: [/^data/, /data.*analise/],
  ticket: [/ticket/, /^n[o°º]?\s*ticket/],
  umidade: [/umidade/],
  teorPo: [/teor.*po\b/, /^po\b/, /\bpo\s*\(/],
  palito: [/palito/],
  produtor: [/fornecedor/, /produtor/],
  lote: [/^lote/],
};

// Posicoes usadas pela planilha "controle de palitos" da fabrica, quando
// nenhum cabecalho e reconhecido.
const POSICOES_PADRAO = { data: 2, ticket: 3, umidade: 4, teorPo: 5, palito: 6, produtor: 7 };

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const ehX = (v) => typeof v === 'string' && v.trim().toLowerCase() === 'x';
const arred = (n, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas;
const soData = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));

// exceljs devolve objeto quando a celula tem formula ou texto rico
function valor(celula) {
  const v = celula?.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('text' in v) return v.text;
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    return null;
  }
  return v;
}

// Procura a linha de cabecalho nas primeiras linhas da planilha.
function acharCabecalho(ws) {
  for (let n = 1; n <= Math.min(10, ws.rowCount); n += 1) {
    const linha = ws.getRow(n);
    const mapa = {};
    for (let c = 1; c <= Math.min(30, ws.columnCount || 30); c += 1) {
      const texto = valor(linha.getCell(c));
      if (typeof texto !== 'string' || !texto.trim()) continue;
      const t = semAcento(texto);
      for (const [campo, padroes] of Object.entries(COLUNAS)) {
        if (mapa[campo]) continue;
        if (padroes.some((re) => re.test(t))) mapa[campo] = c;
      }
    }
    if (mapa.palito && (mapa.ticket || mapa.data)) {
      return { colunas: mapa, primeiraLinha: n + 1, detectado: true };
    }
  }
  return { colunas: { ...POSICOES_PADRAO }, primeiraLinha: 2, detectado: false };
}

// A planilha da fabrica guarda o palito como fracao (0,24 = 24%); um arquivo
// digitado a mao costuma trazer 24.
// Usa a mediana, e nao o maior valor: um unico numero errado na planilha
// (ex.: 3,87 no lugar de 0,387) inverteria a leitura do arquivo inteiro.
function detectarUnidade(valores) {
  if (valores.length === 0) return 'percentual';
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  const mediana = ord.length % 2 ? ord[meio] : (ord[meio - 1] + ord[meio]) / 2;
  return mediana <= 1 ? 'fracao' : 'percentual';
}

/**
 * Le a planilha e devolve as analises validas, os problemas e os avisos.
 * Nao grava nada: quem chama decide o que fazer com o resultado.
 */
async function lerAnalises(entrada) {
  const wb = new ExcelJS.Workbook();
  if (Buffer.isBuffer(entrada)) await wb.xlsx.load(entrada);
  else await wb.xlsx.readFile(entrada);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error('A planilha não tem nenhuma aba.');

  const { colunas, primeiraLinha, detectado } = acharCabecalho(ws);

  // 1a passada: junta os teores de palito para descobrir a unidade
  const brutos = [];
  ws.eachRow((linha, n) => {
    if (n < primeiraLinha) return;
    const celulas = {};
    for (const [campo, col] of Object.entries(colunas)) celulas[campo] = valor(linha.getCell(col));
    brutos.push({ n, ...celulas });
  });
  const unidade = detectarUnidade(
    brutos.map((b) => b.palito).filter((v) => typeof v === 'number' && v > 0),
  );
  const paraPercentual = (v) => arred(unidade === 'fracao' ? v * 100 : v);

  // 2a passada: valida linha a linha
  const validas = [];
  const problemas = [];
  let vazias = 0;
  let semAnalise = 0;
  const ticketsVistos = new Map();

  for (const b of brutos) {
    const campos = [b.data, b.ticket, b.umidade, b.teorPo, b.palito, b.produtor];
    if (campos.every((c) => c === null)) { vazias += 1; continue; }

    // "x" = amostra coletada sem analise feita
    if (ehX(b.palito) || ehX(b.umidade)) { semAnalise += 1; continue; }
    if (b.palito === null && b.umidade === null && b.teorPo === null) { vazias += 1; continue; }

    const erros = [];

    if (typeof b.ticket !== 'number') erros.push('ticket ausente ou não numérico');
    // Ticket quebrado (ex.: 10245,142857) aparece quando alguem arrasta a celula
    // no Excel e ele gera uma serie interpolada.
    else if (!Number.isInteger(b.ticket)) erros.push(`ticket não é um número inteiro (${b.ticket})`);
    else if (ticketsVistos.has(b.ticket)) erros.push(`ticket ${b.ticket} repetido (já apareceu na linha ${ticketsVistos.get(b.ticket)})`);

    let pct = null;
    if (typeof b.palito !== 'number') erros.push('sem teor de palito');
    else {
      pct = paraPercentual(b.palito);
      if (!(pct > 0 && pct <= 100)) erros.push(`teor de palito fora da faixa (${pct}%)`);
    }

    if (!(b.data instanceof Date)) erros.push(b.data === null ? 'sem data' : `data inválida (${String(b.data)})`);
    if (typeof b.umidade === 'number' && !(b.umidade > 0 && b.umidade <= 20)) erros.push(`umidade fora da faixa (${b.umidade})`);
    if (typeof b.teorPo === 'number' && !(b.teorPo >= 0 && b.teorPo <= 30)) erros.push(`teor de pó fora da faixa (${b.teorPo})`);

    if (Number.isInteger(b.ticket) && !ticketsVistos.has(b.ticket)) ticketsVistos.set(b.ticket, b.n);

    if (erros.length > 0) { problemas.push({ linha: b.n, ticket: b.ticket ?? null, erros }); continue; }

    validas.push({
      linha: b.n,
      ticket: String(b.ticket),
      data: soData(b.data),
      percentualPalito: pct,
      desconto: calcularDesconto(pct),
      teorPo: typeof b.teorPo === 'number' ? b.teorPo : null,
      umidade: typeof b.umidade === 'number' ? arred(b.umidade) : null,
      nomeProdutor: b.produtor ? String(b.produtor).trim().replace(/\s+/g, ' ') : '',
      loteTexto: b.lote ? String(b.lote).trim().replace(/\s+/g, ' ') : null,
    });
  }

  // Ticket muito fora da sequencia costuma ser digito digitado a mais.
  // Nao bloqueia a importacao, so avisa.
  const avisos = [];
  for (let i = 1; i < validas.length - 1; i += 1) {
    const t = Number(validas[i].ticket);
    const ant = Number(validas[i - 1].ticket);
    const prox = Number(validas[i + 1].ticket);
    if (Math.abs(t - ant) > 2000 && Math.abs(t - prox) > 2000) {
      avisos.push({ linha: validas[i].linha, ticket: validas[i].ticket, vizinhos: [ant, prox] });
    }
  }

  return {
    validas, problemas, avisos, vazias, semAnalise,
    unidadePalito: unidade,
    cabecalhoDetectado: detectado,
    colunas,
    aba: ws.name,
  };
}

module.exports = { lerAnalises, valor, ehX, arred, soData };
