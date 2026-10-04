// ===================================================
// FOREX ASSIST - LABORATÓRIO - REPLAY DO PIPELINE SOBRE CANDLES HISTÓRICOS
//
// Roda o MESMO `analisarPar` do scanner (scripts/pairAnalyzer.js) sobre candles históricos, barra a
// barra (relógio simulado), e devolve as análises no formato de `analises`. Alimenta o núcleo do
// laboratório (processarPar), que rotula as saídas e conta por grupo. SÓ LEITURA/offline: não toca
// em Firestore, push, nem no oficial. Ver DOCUMENTACAO/LABORATORIO-E-ANALISES.md (6.15).
//
// O que reproduz: indicadores, score, SMC/candlestick, decisão por perfil (cascata), financeiro (lote/TP/SL
// da configuração real), cooldown de 30 min + posição aberta bloqueando o par (como o oficial, com o
// fechamento "como o app mede", sem spread).
// O que NÃO reproduz (declarado): janelas de sessão do scanner (`parNaJanelaOperacional`), limite diário/
// disjuntor, histórico estatístico do par (fica "SEM_DADOS", como nos logs de produção), atraso real da
// TwelveData, reavaliação entre execuções. Análises de TODAS as horas entram; recortes por sessão são feitos
// depois (grupos X2).
// ===================================================

const { analisarPar } = require("../scripts/pairAnalyzer");
const { ema, rsi, calcularADX, calcularATR } = require("../scripts/utils");
const { calcularQualidade } = require("../scripts/marketAnalyzer");
const { simularOperacao } = require("./simulador");

const CINCO = 300000;
const pad = (n) => String(n).padStart(2, "0");
const fmt = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
const textoCandle = (c) => ({ datetime: fmt(c.ts), open: String(c.o), high: String(c.h), low: String(c.l), close: String(c.c) });

// 15 min a partir dos de 5 min (mesmo OHLC que a TwelveData devolve): só baldes completos (3 candles)
function agregar15(c5) {
    const baldes = new Map();
    for (const c of c5) {
        const k = Math.floor(c.ts / (3 * CINCO)) * 3 * CINCO;
        if (!baldes.has(k)) baldes.set(k, []);
        baldes.get(k).push(c);
    }
    const out = [];
    for (const [ts, lista] of [...baldes.entries()].sort((a, b) => a[0] - b[0])) {
        if (lista.length !== 3) continue;
        lista.sort((a, b) => a.ts - b.ts);
        out.push({ ts, o: lista[0].o, h: Math.max(...lista.map(x => x.h)), l: Math.min(...lista.map(x => x.l)), c: lista[2].c });
    }
    return out;
}

const ESTATISTICAS_VAZIAS = {
    wins: 0, loss: 0, operacoes: 0, operacoesElegiveis: 0, winStreak: 0, lossStreak: 0, historicoSuficiente: false,
    confianca: "BAIXA", taxaAcerto: 0, pesoEstatistico: 0, status: "SEM_DADOS",
    resumo: { historico: "SEM_DADOS", confianca: "BAIXA", pesoEstatistico: 0, taxaAcerto: 0, winStreak: 0, lossStreak: 0, historicoSuficiente: false },
    BUY: { wins: 0, loss: 0, taxaAcerto: 0 }, SELL: { wins: 0, loss: 0, taxaAcerto: 0 }, ultimos5: [], ultimos10: []
};

/**
 * @param {object} p
 * @param {string} p.par
 * @param {Array} p.c5            candles de 5 min {ts,o,h,l,c}, do mais antigo ao mais novo (só horário de mercado)
 * @param {object} p.configuracao mesma forma do scanner (perfil, cooldown, lote, tp, sl, saldoSimulado...)
 * @param {number} [p.janela=500] candles na janela de análise (como o scanner)
 * @param {number} [p.passo=3]    avalia a cada N candles de 5 min (3 = 15 min)
 * @param {number} [p.atrasoSeg=30] segundos depois do fechamento do candle em que a análise "roda"
 */
async function replayPar({ par, c5, configuracao, janela = 500, passo = 3, atrasoSeg = 30, log = () => {} }) {

    const c15 = agregar15(c5);
    const cooldownMs = (Number(configuracao.cooldown) || 30) * 60000;
    const analises = [];
    const aprovacoes = [];
    let bloqueadoAte = 0;
    let avaliadas = 0;

    const dateNowOriginal = Date.now;
    const consoleLogOriginal = console.log;
    let simMs = 0;
    let capturaAnalise = null, capturaOperacao = null;

    // texto da TwelveData uma vez por candle (a formatação por chamada seria o gargalo)
    const s5 = c5.map(textoCandle), s15 = c15.map(textoCandle);
    const getCandles = async (_par, tf) => {
        if (tf === "15min") {
            // só candles de 15 min JÁ FECHADOS no instante simulado (busca binária)
            let lo = 0, hi = c15.length;
            while (lo < hi) { const m = (lo + hi) >> 1; if (c15[m].ts + 3 * CINCO > simMs) hi = m; else lo = m + 1; }
            return s15.slice(Math.max(0, lo - janela), lo);
        }
        return s5.slice(Math.max(0, idx - janela + 1), idx + 1);
    };
    let idx = 0;

    const stubs = {
        db: {},   // sem collection(): o cache de 15 min do pairAnalyzer degrada sozinho para "sem cache"
        par, configuracao, estatisticas: ESTATISTICAS_VAZIAS, janelaOrigem: "replay",
        getCandles, ema, rsi, calcularADX, calcularATR, calcularQualidade,
        existeCooldown: async () => false,                       // o bloqueio é checado ANTES, abaixo
        salvarOperacao: async (_db, operacao) => { capturaOperacao = operacao; },
        enviarPushAbertura: undefined,
        registrarAnalise: async (registro) => { capturaAnalise = registro; }
    };

    try {
        Date.now = () => simMs;
        console.log = () => {};
        for (idx = janela - 1; idx < c5.length; idx += passo) {
            simMs = c5[idx].ts + CINCO + atrasoSeg * 1000;
            if (simMs < bloqueadoAte) continue;                   // cooldown/posição aberta: o oficial nem analisa (não grava)
            capturaAnalise = null; capturaOperacao = null;
            avaliadas++;
            try { await analisarPar(stubs); } catch (e) { /* par/barra sem dados suficientes: igual ao oficial, ignora */ continue; }
            if (capturaAnalise) analises.push({ id: `${capturaAnalise.timestamp}_${par.replace("/", "_")}`, ...capturaAnalise });
            if (capturaOperacao && capturaAnalise) {
                aprovacoes.push(capturaAnalise.timestamp);
                // posição aberta bloqueia o par até FECHAR (como o app mede, sem spread) e por >= 30 min
                const r = simularOperacao({
                    par, direcao: capturaAnalise.direcao, tEntrada: simMs, precoEntrada: capturaAnalise.precoEntrada,
                    tpPips: Math.abs(capturaAnalise.tpPips), slPips: Math.abs(capturaAnalise.slPips), spreadPips: 0,
                    candles: c5.slice(idx + 1, idx + 1 + 4000).map(c => ({ timestamp: c.ts, open: c.o, high: c.h, low: c.l, close: c.c }))   // janela de ~14 dias de mercado
                });
                const fechaEm = r.resultado === "ABERTA" ? Infinity : r.tFechamento;
                bloqueadoAte = Math.max(simMs + cooldownMs, fechaEm);
            }
        }
    } finally {
        Date.now = dateNowOriginal;
        console.log = consoleLogOriginal;
    }
    log(`${par}: ${avaliadas} barras avaliadas, ${analises.length} análises registradas, ${aprovacoes.length} aprovadas`);
    return { analises, aprovacoes: aprovacoes.length, avaliadas };
}

module.exports = { replayPar, agregar15, ESTATISTICAS_VAZIAS };
