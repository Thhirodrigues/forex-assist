const {
    EMA,
    RSI,
    ADX
} = require("technicalindicators");

function getApiKey(API_KEYS, apiIndex) {

    const key = API_KEYS[apiIndex.value];

    apiIndex.value =
        (apiIndex.value + 1) %
        API_KEYS.length;

    return key;

}

function ema(periodo, valores) {

    const resultado = EMA.calculate({
        period: periodo,
        values: valores
    });

    return resultado[
        resultado.length - 1
    ];

}

function rsi(periodo, valores) {

    const resultado = RSI.calculate({
        period: periodo,
        values: valores
    });

    return resultado[
        resultado.length - 1
    ];

}

function calcularADX(
    periodo,
    highs,
    lows,
    closes
) {

    const resultado = ADX.calculate({

        period: periodo,

        close: closes,

        high: highs,

        low: lows

    });

    if (!resultado.length)
        return 0;

    return resultado[
        resultado.length - 1
    ].adx;

}

module.exports = {

    getApiKey,

    ema,

    rsi,

    calcularADX

};
