const axios = require("axios");
const {
  getApiKey,
} = require("./utils");

const API_KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3
];

const apiIndex = {
    value: 0
};

function selecionarApi(apiAtiva = 1) {

    const indice = Math.max(
        0,
        Math.min(API_KEYS.length - 1, Number(apiAtiva) - 1)
    );

    apiIndex.value = indice;
}

// ===================================================
// API RESILIENCE ENGINE
// ===================================================
//
// Responsabilidade:
//
// Garantir comunicação estável com a TwelveData.
//
// Recursos:
//
// • Retry automático
// • Backoff progressivo
// • Timeout
// • Continuidade do Scanner
//
// ===================================================

let CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    timeframe: "5min",
    outputsize: 250,
    apiAtiva: 1
};

function configurarMarketData(config = {}) {
    CONFIG = {
        ...CONFIG,
        ...config
    };
}

function esperar(ms) {

    return new Promise(resolve =>

        setTimeout(resolve, ms)

    );

}

function deveTentarNovamente(error) {

    if (!error.response) {

        return true;

    }

    return [

        500,

        502,

        503,

        504

    ].includes(

        error.response.status

    );

}

async function getCandles(
    symbol,
    interval = CONFIG.timeframe,
    outputsize = CONFIG.outputsize
)
{

  selecionarApi(CONFIG.apiAtiva);
  
const url =
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${interval}` +
    `&outputsize=${outputsize}` +
    `&apikey=${getApiKey(API_KEYS, apiIndex)}`;
  
for (let tentativa = 1; tentativa <= CONFIG.maxRetries tentativa++) {

    try {

        const res = await axios.get(url, {

            timeout: CONFIG.timeout

        });

        if (!res.data.values) {

            throw new Error("Sem candles");

        }

        return res.data.values.reverse();

    }

    catch (error) {

        if (

            tentativa === CONFIG.maxRetries

            !deveTentarNovamente(error)

        ) {

            throw error;

        }

        await esperar(

            CONFIG.retryDelay * tentativa
        );
    }
}
}
module.exports = {
    configurarMarketData,
    selecionarApi,
    getCandles
};
