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

// (Sprint futura)


// ===================================================
// ANÁLISE DO RSI
// ===================================================

// (Sprint futura)


// ===================================================
// ANÁLISE DA TENDÊNCIA
// ===================================================

// (Sprint futura)


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
