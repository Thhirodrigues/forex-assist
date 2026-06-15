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

module.exports = {
  calcularQualidade
};
