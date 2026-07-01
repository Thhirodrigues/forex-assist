async function analisarPar({
    db,
    par,
    getCandles,
    ema,
    rsi,
    calcularADX,
    calcularQualidade,
    verificarCooldown,
    salvarOperacao
}) {

    try {

        if (await verificarCooldown(par))
            return;

        const candles =
            await getCandles(par);

        const highs =
    candles.map(c => Number(c.high));

const lows =
    candles.map(c => Number(c.low));

const closes =
    candles.map(c => Number(c.close));
        const ema9 =
            ema(9, closes.slice(-30));

        const ema21 =
            ema(21, closes.slice(-50));

        const ema50 =
    ema(50, closes.slice(-80));

const ema100 =
    ema(100, closes.slice(-120));

const ema200 =
    ema(200, closes);

        const adxAtual = calcularADX(
    14,
    highs,
    lows,
    closes
);

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
        ema50,
        ema100,
        ema200,
        rsiAtual,
        adxAtual
    );

await salvarOperacao(db, {

    par,

    direcao,

    ema9,

    ema21,

    ema50,

    ema100,

    ema200,

    rsi: rsiAtual,

    score: qualidade.score,

    tendencia: qualidade.tendencia,

    situacaoRSI: qualidade.rsi,

    qualidade: qualidade.qualidade,

    modo: "REAL",

    origem: "scanner",

    engine: "RMI_V1",

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
