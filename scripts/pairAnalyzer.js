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

        let direcao = null;

if (ema9 > ema21 && rsiAtual > 55)
    direcao = "BUY";

if (ema9 < ema21 && rsiAtual < 45)
    direcao = "SELL";

if (!direcao)
    return;
        const qualidade =
    calcularQualidade(
        ema9,
        ema21,
        rsiAtual
    );

await salvarOperacao(db, {
    par,

    direcao,

    ema9,

    ema21,

    rsi: rsiAtual,

    qualidade,

    modo: "REAL",

    origem: "scanner",

    precoEntrada:
        closes[
            closes.length - 1
        ],

    resultado: "PENDENTE"

});

console.log(
    `${par} ${direcao} OK`
);

    } catch (e) {
        console.log(`${par} erro`, e.message);
    }

}

module.exports = {
    analisarPar
};
