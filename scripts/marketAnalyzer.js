// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MARKET ANALYZER
//
// Responsabilidade:
// Avaliar tecnicamente a qualidade do mercado e
// fornecer um Score Inicial para o Scanner.
//
// FASE 05
// Estrutura preparada para evolução incremental.
// ===================================================


// ===================================================
// CONFIGURAÇÕES
// ===================================================

// (Reservado para configurações futuras)


// ===================================================
// ANÁLISE DAS EMAs
// ===================================================

function analisarEMAs(ema9, ema21, ema50, ema100, ema200) {

  let score = 0;
  let tendencia = "LATERAL";

  if (
    ema9 > ema21 &&
    ema21 > ema50 &&
    ema50 > ema100 &&
    ema100 > ema200
  ) {
    score = 30;
    tendencia = "ALTA";
  }

  else if (
    ema9 < ema21 &&
    ema21 < ema50 &&
    ema50 < ema100 &&
    ema100 < ema200
  ) {
    score = 30;
    tendencia = "BAIXA";
  }

  return {
    score,
    tendencia
  };

}


// ===================================================
// ANÁLISE DO RSI
// ===================================================

function analisarRSI(rsi) {

  let score = 0;
  let situacao = "NEUTRO";

  if (rsi >= 55 && rsi <= 70) {
    score = 35;
    situacao = "COMPRA";
  }

  else if (rsi <= 45 && rsi >= 30) {
    score = 35;
    situacao = "VENDA";
  }

  else if (rsi > 70) {
    score = 10;
    situacao = "SOBRECOMPRADO";
  }

  else if (rsi < 30) {
    score = 10;
    situacao = "SOBREVENDIDO";
  }

  return {
    score,
    situacao
  };

}


// ===================================================
// ANÁLISE DA TENDÊNCIA
// ===================================================

function analisarTendencia(emas, rsiInfo) {

  let score = 0;
  let qualidade = "NEUTRA";

  if (
    emas.tendencia === "ALTA" &&
    rsiInfo.situacao === "COMPRA"
  ) {
    score = 20;
    qualidade = "FORTE";
  }

  else if (
    emas.tendencia === "BAIXA" &&
    rsiInfo.situacao === "VENDA"
  ) {
    score = 20;
    qualidade = "FORTE";
  }

  else if (
    emas.tendencia === "LATERAL"
  ) {
    score = 5;
    qualidade = "LATERAL";
  }

  else {

    score = 0;
    qualidade = "CONFLITO";

  }

  return {

    score,
    qualidade

  };

}


// ===================================================
// SMART SCORING ENGINE
// ===================================================

function calcularQualidade(ema9, ema21, rsiAtual) {

  let score = 0;

  const distancia = Math.abs(ema9 - ema21);

  if (distancia > 0.00020)
    score += 30;
  else if (distancia > 0.00010)
    score += 20;
  else
    score += 10;

  if (rsiAtual > 55 && rsiAtual < 70)
    score += 35;

  if (rsiAtual < 45 && rsiAtual > 30)
    score += 35;

  if (distancia > 0.00030)
    score += 20;

  if (score > 100)
    score = 100;

  return score;

}


// ===================================================
// EXPORTS
// ===================================================

module.exports = {
  calcularQualidade
};
