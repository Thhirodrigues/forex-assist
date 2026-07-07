const {
    EMA,
    RSI,
    ADX,
    ATR
} = require("technicalindicators");

function getApiKey(API_KEYS, apiIndex) {

    const key = API_KEYS[apiIndex.value];

    apiIndex.value =
        (apiIndex.value + 1) %
        API_KEYS.length;

    return key;

}

function ema(periodo, valores) {

    if (!valores || valores.length < periodo)
        return null;

    const resultado = EMA.calculate({
        period: periodo,
        values: valores
    });

    if (!resultado.length)
        return null;

    return resultado[resultado.length - 1];

}

function rsi(periodo, valores) {

    if (!valores || valores.length < periodo)
        return null;

    const resultado = RSI.calculate({
        period: periodo,
        values: valores
    });

    if (!resultado.length)
        return null;

    return resultado[resultado.length - 1];

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

function calcularATR(periodo, highs, lows, closes) {

    const resultado = ATR.calculate({

        period: periodo,

        high: highs,

        low: lows,

        close: closes

    });

    return resultado.at(-1) || 0;

}

module.exports = {

    getApiKey,

    ema,

    rsi,

    calcularADX,

    calcularATR

};
