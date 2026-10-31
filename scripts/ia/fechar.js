// ===================================================
// FOREX ASSIST - SINAL POR IA - FECHAMENTO (pré-registro 6.38)
//
// Fecha os sinais ABERTOS de `historico_ia` com candles de 5 min (TwelveData) usando o simulador do Laboratório (mesmas regras:
// candle que toca TP e SL = perda; candles só a partir da entrada). Grava para cada sinal:
//   resultadoApp / pipsApp : como o app mede (sem spread: WIN +TP, LOSS -SL)
//   resultado / pips       : com spread da tabela do Lab (a métrica primária)
//   controle               : MESMA hora, par e barreiras com a direção SORTEADA pelo id (ALEATORIO)
// Nada aqui toca em `historico`, no scanner nem no checker oficial.
// ===================================================

const CFG = require("./config");
const { simularOperacao } = require("../../lab/simulador");
const { paridadeDoId } = require("../../lab/nucleo");

const MIN5 = 5 * 60000;

const numericos = (cs) => cs.map(c => ({
    timestamp: new Date(String(c.datetime).replace(" ", "T") + "Z").getTime(),
    open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close)
})).filter(c => [c.timestamp, c.open, c.high, c.low, c.close].every(Number.isFinite));

const dorme = (ms) => new Promise(r => setTimeout(r, ms));

// Preço de entrada = fechamento do ÚLTIMO candle de 5 min JÁ FECHADO em `agora` (nunca o candle em formação: sem olhar o futuro).
// `t` = instante em que esse candle fechou; a simulação do sinal começa no candle seguinte.
function ultimoFechado(candlesNumericos, agora) {
    for (let i = candlesNumericos.length - 1; i >= 0; i--) {
        const c = candlesNumericos[i];
        if (c.timestamp + MIN5 <= agora) return { preco: c.close, t: c.timestamp + MIN5 };
    }
    return null;
}

function resolver(sinal, candles) {
    const base = { par: sinal.par, direcao: sinal.direcao, tEntrada: sinal.tEntrada, precoEntrada: sinal.precoEntrada, tpPips: sinal.tpPips, slPips: sinal.slPips, candles };
    const app = simularOperacao({ ...base, spreadPips: 0 });
    if (app.resultado === "ABERTA" || app.resultado === "INVALIDA") return null;
    const liq = simularOperacao({ ...base, spreadPips: sinal.spreadPips });
    const ctrl = simularOperacao({ ...base, spreadPips: sinal.spreadPips, opcoes: { inverter: paridadeDoId(sinal.id) } });
    return {
        resultadoApp: app.resultado, pipsApp: app.pips,
        resultado: liq.resultado, pips: liq.pips, ambiguo: liq.ambiguo === true, duracaoMin: liq.duracaoMin ?? app.duracaoMin, fechadoEm: liq.tFechamento ?? app.tFechamento,
        controle: { resultado: ctrl.resultado, pips: ctrl.pips }
    };
}

async function fecharAbertos({ ofic, getCandles, agora = Date.now(), dry = true, esperar = dorme, log = console.log }) {
    const snap = await ofic.collection("historico_ia").where("status", "==", "ABERTA").get();
    const abertos = [];
    snap.forEach(d => abertos.push(d.data()));
    const porPar = {};
    for (const s of abertos) (porPar[s.par] = porPar[s.par] || []).push(s);
    const pares = Object.keys(porPar);
    log(`Sinais de IA abertos: ${abertos.length} em ${pares.length} par(es)`);

    let fechados = 0, expirados = 0, falhas = 0, buscas = 0;
    for (const par of pares) {
        const maisAntigo = Math.min(...porPar[par].map(s => s.tEntrada));
        const barras = Math.min(5000, Math.ceil((agora - maisAntigo) / MIN5) + 12);
        let candles;
        try {
            if (buscas++ > 0) await esperar(8000);   // 8 requisições por minuto por chave (plano grátis)
            candles = numericos(await getCandles(par, "5min", barras));
        } catch (e) { falhas++; log(`${par}: ERRO ao buscar candles: ${String(e.message).slice(0, 120)}`); continue; }

        for (const s of porPar[par]) {
            const r = resolver(s, candles);
            if (!r) {
                if (agora - s.tEntrada > CFG.MAX_DIAS_ABERTA * 86400000) {
                    expirados++;
                    if (!dry) await ofic.collection("historico_ia").doc(s.id).update({ status: "EXPIRADA", expiradoEm: agora });
                }
                continue;
            }
            fechados++;
            log(`${s.id}: ${r.resultado} (${r.pips} pips líquidos; app ${r.resultadoApp}; controle ${r.controle.resultado} ${r.controle.pips})`);
            if (!dry) await ofic.collection("historico_ia").doc(s.id).update({ status: "ENCERRADA", ...r });
        }
    }
    return { abertos: abertos.length, fechados, expirados, falhas, buscas };
}

module.exports = { fecharAbertos, resolver, numericos, ultimoFechado };
