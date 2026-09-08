// Geracao das planilhas do SCQ com um layout unico para todos os modulos.
// Mesma identidade visual dos PDFs do sistema (verde #065f46, zebra #f0fdf4).
//
// Estrutura de toda planilha exportada:
//   linha 1  nome da empresa
//   linha 2  titulo do relatorio
//   linha 3  data/hora de emissao + sistema
//   linha 4  filtros aplicados
//   linha 5  (em branco)
//   linha 6  cabecalho das colunas  <- painel congelado e autofiltro aqui
//   linha 7+ dados, com zebra
//   final    linha em branco + totais

const ExcelJS = require('exceljs');

const EMPRESA = 'INDÚSTRIA ERVATEIRA VERDELÂNDIA LTDA';
const SISTEMA = 'SCQ — Sistema de Controle de Qualidade';

const VERDE = 'FF065F46';
const VERDE_CLARO = 'FFF0FDF4';
const CINZA = 'FF6B7280';
const BORDA = 'FFD1D5DB';

const LINHA_CABECALHO = 6;

const FORMATOS = {
  texto: null,
  inteiro: '0',
  numero: '0.00',
  percentual: '0.00"%"',
  data: 'dd/mm/yyyy',
  datahora: 'dd/mm/yyyy hh:mm',
};

const ALINHAMENTO = {
  texto: 'left',
  inteiro: 'center',
  numero: 'center',
  percentual: 'center',
  data: 'center',
  datahora: 'center',
};

const borda = {
  top: { style: 'thin', color: { argb: BORDA } },
  left: { style: 'thin', color: { argb: BORDA } },
  bottom: { style: 'thin', color: { argb: BORDA } },
  right: { style: 'thin', color: { argb: BORDA } },
};

function agora() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function textoFiltros(filtros) {
  const usados = (filtros || []).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  if (usados.length === 0) return 'Filtros: nenhum (todos os registros)';
  return 'Filtros: ' + usados.map(([r, v]) => `${r} = ${v}`).join('   |   ');
}

/**
 * colunas: [{ titulo, chave, largura, tipo }]
 *   tipo: texto | inteiro | numero | percentual | data | datahora
 * linhas: array de objetos usando as chaves das colunas
 * resumo: [[rotulo, valor], ...] impresso no rodape
 */
async function gerarPlanilha({ titulo, nomeAba, colunas, linhas, filtros = [], resumo = [] }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = SISTEMA;
  wb.created = new Date();

  const ws = wb.addWorksheet(nomeAba || 'Dados', {
    views: [{ state: 'frozen', ySplit: LINHA_CABECALHO }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: colunas.length > 6 ? 'landscape' : 'portrait',
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const ultimaColuna = colunas.length;
  const letraFinal = ws.getColumn(ultimaColuna).letter;

  ws.columns = colunas.map((c) => ({ key: c.chave, width: c.largura ?? 18 }));

  // ── Cabecalho do documento ───────────────────────────────────────────
  const mesclar = (linha) => ws.mergeCells(`A${linha}:${letraFinal}${linha}`);

  mesclar(1);
  const cEmpresa = ws.getCell('A1');
  cEmpresa.value = EMPRESA;
  cEmpresa.font = { name: 'Calibri', size: 14, bold: true, color: { argb: VERDE } };
  cEmpresa.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 22;

  mesclar(2);
  const cTitulo = ws.getCell('A2');
  cTitulo.value = titulo;
  cTitulo.font = { name: 'Calibri', size: 12, bold: true };
  ws.getRow(2).height = 18;

  mesclar(3);
  const cEmissao = ws.getCell('A3');
  cEmissao.value = `${SISTEMA}   •   Emitido em ${agora()}`;
  cEmissao.font = { name: 'Calibri', size: 9, italic: true, color: { argb: CINZA } };

  mesclar(4);
  const cFiltros = ws.getCell('A4');
  cFiltros.value = textoFiltros(filtros);
  cFiltros.font = { name: 'Calibri', size: 9, color: { argb: CINZA } };

  ws.getRow(5).height = 6;

  // ── Cabecalho das colunas ────────────────────────────────────────────
  const linhaCab = ws.getRow(LINHA_CABECALHO);
  colunas.forEach((c, i) => {
    const cel = linhaCab.getCell(i + 1);
    cel.value = c.titulo;
    cel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    cel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cel.border = borda;
  });
  linhaCab.height = 24;

  // ── Dados ────────────────────────────────────────────────────────────
  linhas.forEach((item, idx) => {
    const linha = ws.getRow(LINHA_CABECALHO + 1 + idx);
    colunas.forEach((c, i) => {
      const cel = linha.getCell(i + 1);
      const tipo = c.tipo ?? 'texto';
      const valor = item[c.chave];

      cel.value = valor === undefined || valor === null || valor === '' ? '—' : valor;
      cel.font = { name: 'Calibri', size: 10 };
      cel.alignment = {
        horizontal: ALINHAMENTO[tipo] ?? 'left',
        vertical: 'middle',
        wrapText: tipo === 'texto',
      };
      cel.border = borda;
      if (FORMATOS[tipo] && typeof valor === 'number') cel.numFmt = FORMATOS[tipo];
      if (FORMATOS[tipo] && valor instanceof Date) cel.numFmt = FORMATOS[tipo];
      if (idx % 2 === 0) {
        cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_CLARO } };
      }
    });
  });

  // Filtro automatico no cabecalho (so faz sentido com dados)
  if (linhas.length > 0) {
    ws.autoFilter = {
      from: { row: LINHA_CABECALHO, column: 1 },
      to: { row: LINHA_CABECALHO + linhas.length, column: ultimaColuna },
    };
  } else {
    const vazia = ws.getRow(LINHA_CABECALHO + 1);
    ws.mergeCells(`A${LINHA_CABECALHO + 1}:${letraFinal}${LINHA_CABECALHO + 1}`);
    const cel = vazia.getCell(1);
    cel.value = 'Nenhum registro encontrado para os filtros informados.';
    cel.font = { name: 'Calibri', size: 10, italic: true, color: { argb: CINZA } };
    cel.alignment = { horizontal: 'center' };
    cel.border = borda;
  }

  // ── Rodape ───────────────────────────────────────────────────────────
  const inicioResumo = LINHA_CABECALHO + Math.max(linhas.length, 1) + 2;
  const totais = [['Total de registros', linhas.length], ...resumo];
  totais.forEach(([rotulo, valor], i) => {
    const linha = ws.getRow(inicioResumo + i);
    const celR = linha.getCell(1);
    celR.value = rotulo;
    celR.font = { name: 'Calibri', size: 10, bold: true, color: { argb: VERDE } };
    const celV = linha.getCell(2);
    celV.value = valor;
    celV.font = { name: 'Calibri', size: 10, bold: true };
    celV.alignment = { horizontal: 'left' };
  });

  return wb.xlsx.writeBuffer();
}

// Manda a planilha pronta para o navegador.
async function enviarPlanilha(res, config, nomeArquivo) {
  const buffer = await gerarPlanilha(config);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${nomeArquivo}`);
  return res.send(Buffer.from(buffer));
}

// Helpers de formatacao usados pelas rotas.
const dataBR = (d) => (d ? new Date(d) : null);
const texto = (v) => (v === null || v === undefined || v === '' ? null : String(v));

module.exports = { gerarPlanilha, enviarPlanilha, dataBR, texto, EMPRESA, SISTEMA };
