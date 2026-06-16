async function analisarPar({
  db,
  par,
  getCandles,
  ema,
  rsi,
  calcularQualidade,
  verificarCooldown,
  salvarOperacao
}) {

}

module.exports = {
  analisarPar
  try {

    if (await verificarCooldown(par))
        return;

    const candles =
        await getCandles(par);

    const closes =
        candles.map(c => Number(c.close));

    const ema9 =
        ema(9, closes.slice(-30));

    const ema21 =
        ema(21, closes.slice(-50));

    const rsiAtual =
        rsi(14, closes.slice(-15));

} catch (e) {
    console.log(`${par} erro`, e.message);
}
};
