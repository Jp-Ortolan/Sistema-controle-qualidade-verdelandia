// RN01 - Desconto por teor de palito (Industria Ervateira Verdelandia LTDA).
//
// O teor de palito e informado em pontos percentuais (ex.: 36 = 36%).
// Ate 30% nao ha desconto; acima disso desconta-se 35% do excedente.
//
// Fonte: planilha RELATORIO FECHAMENTO - abas PALITOS (col. G) e
// DADOS ENTRADA DE MATERIA PRIMA (col. Q): =SE(palito<=30%;0;(palito-30%)*35%)
// A planilha "controle de palitos" usa a mesma regra, so que guardando o
// palito como fracao (0,36 = 36%), por isso a importacao multiplica por 100.
//
// Regra unica do sistema: usada tanto pelo cadastro de analises quanto pela
// importacao, para as duas nunca divergirem.

const LIMITE_PALITO = 30;    // % de palito isento de desconto
const FATOR_DESCONTO = 0.35; // 35% sobre o excedente

function calcularDesconto(pct) {
  if (pct <= LIMITE_PALITO) return 0;
  return Math.round((pct - LIMITE_PALITO) * FATOR_DESCONTO * 10000) / 10000;
}

module.exports = { LIMITE_PALITO, FATOR_DESCONTO, calcularDesconto };
