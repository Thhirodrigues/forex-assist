function getApiKey(API_KEYS, apiIndex) {
  const key = API_KEYS[apiIndex.value];
  apiIndex.value =
    (apiIndex.value + 1) %
    API_KEYS.length;
  return key;
}

function ema(periodo, valores) {

  const k = 2 / (periodo + 1);

  let emaAtual = valores[0];

  for (let i = 1; i < valores.length; i++) {

    emaAtual =
      valores[i] * k +
      emaAtual * (1 - k);

  }

  return emaAtual;
}

function rsi(periodo, valores) {

  let ganhos = 0;
  let perdas = 0;

  for (let i = 1; i <= periodo; i++) {

    const dif =
      valores[i] -
      valores[i - 1];

    if (dif >= 0)
      ganhos += dif;
    else
      perdas -= dif;

  }

  let avgGain =
    ganhos / periodo;

  let avgLoss =
    perdas / periodo;

  if (avgLoss === 0)
    return 100;

  const rs =
    avgGain / avgLoss;

  return 100 -
    (100 / (1 + rs));

}

module.exports = {
  getApiKey,
  ema,
  rsi
};
