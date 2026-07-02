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

        if (await verificarCooldown(par)) {
    console.log("Status.............COOLDOWN");
    return "COOLDOWN";
        }

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

        const rsiAtual =
    rsi(14, closes.slice(-15));

        const adxAtual = calcularADX(
    14,
    highs,
    lows,
    closes
);

        let direcao = null;

if (
    ema9 === null ||
    ema21 === null ||
    ema50 === null ||
    ema100 === null ||
    ema200 === null ||
    rsiAtual === null
) {
    console.log("Status.............CANDLES INSUFICIENTES");
return "SEM_DADOS";
}

if (ema9 > ema21 && rsiAtual > 55)
    direcao = "BUY";

if (ema9 < ema21 && rsiAtual < 45)
    direcao = "SELL";

if (!direcao) {
    console.log("Status.............SEM SINAL");
    return "SEM_SINAL";
}

const qualidade = calcularQualidade(
    ema9,
    ema21,
    ema50,
    ema100,
    ema200,
    rsiAtual,
    adxAtual
);

// ===================================================
// FILTRO INSTITUCIONAL
// ===================================================

if (qualidade.score < 75) {

    console.log(`Score............${qualidade.score}`);
    console.log("Status...........REPROVADO");

    return "SEM_QUALIDADE";

}

if (qualidade.qualidade === "CONFLITO") {

    console.log(`Score............${qualidade.score}`);
    console.log("Status...........CONFLITO");

    return "SEM_QUALIDADE";

}

if (qualidade.qualidade === "LATERAL") {

    console.log(`Score............${qualidade.score}`);
    console.log("Status...........LATERAL");

    return "SEM_QUALIDADE";

}
        
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

console.log(`Direção...........${direcao}`);
console.log(`EMA9..............${ema9.toFixed(5)}`);
console.log(`EMA21.............${ema21.toFixed(5)}`);
console.log(`RSI...............${rsiAtual.toFixed(2)}`);
console.log(`ADX...............${adxAtual.toFixed(2)}`);
console.log(`Score.............${qualidade.score}`);
console.log(`Qualidade.........${qualidade.qualidade}`);
console.log("Status............SALVO");

return "SALVO";


    } catch (e) {
console.log("Status............ERRO");
console.log(`Motivo............${e.message}`);

return "ERRO";
    }

}

module.exports = {
    analisarPar
};
