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

// LIMPEZA (09/09/2026): antes disto, o ponto de partida do rodízio vinha
// do campo "API Ativa" no Config (configuracao.apiAtiva), quase sempre
// deixado no valor padrão (1) - getApiKey() já gira sozinho a cada
// chamada dentro de uma mesma execução, então o campo só decidia quem
// pegava a chamada "extra" quando o total de chamadas do ciclo não é
// múltiplo de 3. Deixado fixo em 1, a Chave 1 acumulava essa sobra em
// TODO ciclo, para sempre - um desbalanceamento pequeno por ciclo, mas
// somado ao longo de meses. Substituído por um ponto de partida que
// gira sozinho a cada janela de 5 minutos (mesmo intervalo do cron do
// Scanner), sem precisar de nenhum campo manual no Config.
function indiceInicialRotativo() {

    const cicloDeCincoMinutos =
        Math.floor(Date.now() / (5 * 60 * 1000));

    return cicloDeCincoMinutos % API_KEYS.length;

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
    outputsize: 250
};

function configurarMarketData(config = {}) {
    CONFIG = {
        ...CONFIG,
        ...config
    };

    // Chamado UMA vez por execução do Scanner (não a cada getCandles()
    // - ver comentário dentro de getCandles() sobre por que isso
    // importa). Define apenas o PONTO DE PARTIDA do rodízio round-robin
    // desta execução (agora automático - ver indiceInicialRotativo());
    // getApiKey() continua girando normalmente a cada requisição a
    // partir daí.
    apiIndex.value = indiceInicialRotativo();
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

// AJUSTE-065 (03/10/2026): 429 (limite da TwelveData) agora tenta a PRÓXIMA chave.
// Antes a URL (com UMA chave) era montada uma vez, fora do laço, e o 429 não
// estava na lista de erros que repetem: o par falhava e ficava sem consulta até
// o ciclo seguinte (5 min). No Result Check de 02/10, AUD/USD e USD/CAD deram 429
// em todo ciclo por ~3h (a posição do par na fila caía sempre nas mesmas chaves),
// e o stop do AUD/USD, tocado às 18:05 BRT, só foi visto às 21:00 BRT. Agora:
//  - a chave é escolhida a cada tentativa (getApiKey gira sozinho);
//  - 429 (status HTTP 429 OU corpo {code:429}, que a TwelveData às vezes manda
//    com HTTP 200) pula pra próxima chave na hora, sem esperar; depois de passar
//    por TODAS as chaves sem sucesso, desiste (erro 429 como antes - o próximo
//    ciclo tenta de novo);
//  - 5xx/erro de rede continuam com o retry/backoff de antes.
function ehLimiteDeRequisicoes(error, data) {
    return (error && error.response && error.response.status === 429) ||
        (data && Number(data.code) === 429);
}

async function getCandles(
    symbol,
    interval = null,
    outputsize = null
){

interval = interval || CONFIG.timeframe;

outputsize = outputsize || CONFIG.outputsize;

// NÃO chamar selecionarApi() aqui: ela reseta apiIndex.value a cada
// requisição, o que anula a rotação round-robin feita por getApiKey().

// "&timezone=UTC" (AJUSTE-003): sem ele o "datetime" vem no fuso "Exchange".
const montarUrl = () =>
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${interval}` +
    `&outputsize=${outputsize}` +
    `&timezone=UTC` +
    `&apikey=${getApiKey(API_KEYS, apiIndex)}`;

let tentativasPorErro = 0;
let chavesLimitadas = 0;

while (true) {

    try {

        const res = await axios.get(montarUrl(), {

            timeout: CONFIG.timeout

        });

        if (ehLimiteDeRequisicoes(null, res.data)) {
            const e = new Error(res.data.message || "Request failed with status code 429");
            e.response = { status: 429 };
            throw e;
        }

        if (!res.data.values) {

            throw new Error("Sem candles");

        }

        return res.data.values.reverse();

    }

    catch (error) {

        if (ehLimiteDeRequisicoes(error)) {

            chavesLimitadas++;

            if (chavesLimitadas >= API_KEYS.length) {
                throw error;
            }

            console.log(`Aviso: 429 em ${symbol} - tentando a próxima chave (${chavesLimitadas}/${API_KEYS.length - 1})`);

            continue;
        }

        tentativasPorErro++;

        if (
    tentativasPorErro >= CONFIG.maxRetries ||
    !deveTentarNovamente(error)
) {
    throw error;
        }

        await esperar(

            CONFIG.retryDelay * tentativasPorErro
        );
    }
}
}

module.exports = {
    configurarMarketData,
    selecionarApi,
    getCandles
};
