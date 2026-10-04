// ===================================================
// FOREX ASSIST - LABORATÓRIO - HISTÓRICO DE CANDLES (TwelveData, paginado para trás)
//
// Baixa candles de 5 min de vários dias, página a página (outputsize 5000 + end_date), para o REPLAY
// do pipeline (lab/replay.js). Cada página custa 1 crédito. Só leitura da API; não grava nada aqui.
// ===================================================

const axios = require("axios");

const pad = (n) => String(n).padStart(2, "0");
const fmt = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
// "YYYY-MM-DD HH:MM:SS" (intradiário) ou "YYYY-MM-DD" (diário, meia-noite UTC)
const paraMs = (dt) => { const s = String(dt).replace(" ", "T"); return new Date((s.length === 10 ? s + "T00:00:00" : s) + "Z").getTime(); };
const dorme = (ms) => new Promise(r => setTimeout(r, ms));

async function paginaDeCandles({ par, endMs, chave, tamanho = 5000, http = axios, interval = "5min" }) {
    const url = "https://api.twelvedata.com/time_series" +
        `?symbol=${encodeURIComponent(par)}&interval=${interval}&outputsize=${tamanho}&timezone=UTC` +
        `&end_date=${encodeURIComponent(fmt(endMs))}&apikey=${chave}`;
    const res = await http.get(url, { timeout: 30000 });
    const d = res.data;
    if (d && d.status === "error") throw new Error(`TwelveData: ${d.code || ""} ${d.message || "erro"}`);
    if (!d || !Array.isArray(d.values)) throw new Error("TwelveData: resposta sem values");
    return d.values.map(v => ({ ts: paraMs(v.datetime), o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close) }));
}

/**
 * @returns {Promise<{candles: Array, paginas: number, parou: string}>} candles do mais antigo ao mais novo
 */
async function baixarHistorico({ par, dias, chave, agora = Date.now(), http = axios, esperar = dorme, esperaMs = 8000, log = console.log, maxPaginas = 40 }) {
    const alvo = agora - dias * 86400000;
    let fim = agora;
    const porTs = new Map();
    let paginas = 0, parou = "chegou ao período pedido";
    while (paginas < maxPaginas) {
        if (paginas > 0) await esperar(esperaMs);
        let pag;
        try { pag = await paginaDeCandles({ par, endMs: fim, chave, http }); }
        catch (e) { parou = `erro: ${e.message}`; break; }
        paginas++;
        if (!pag.length) { parou = "API sem mais candles (fim do histórico disponível)"; break; }
        for (const c of pag) porTs.set(c.ts, c);
        const maisAntigo = Math.min(...pag.map(c => c.ts));
        log(`  ${par} pág ${paginas}: ${pag.length} candles, de ${fmt(maisAntigo)} a ${fmt(Math.max(...pag.map(c => c.ts)))}`);
        if (maisAntigo <= alvo) break;
        if (maisAntigo >= fim) { parou = "sem mais candles (a paginação não avançou: fim do histórico disponível)"; break; }
        fim = maisAntigo - 1000;
    }
    const candles = [...porTs.values()].filter(c => c.ts >= alvo).sort((a, b) => a.ts - b.ts);
    return { candles, paginas, parou };
}

module.exports = { baixarHistorico, paginaDeCandles, fmt, paraMs };

if (require.main === module) {
    // teste de profundidade: 1 par, poucas páginas, só imprime
    (async () => {
        const chave = process.env.API_KEY_3 || process.env.API_KEY_1;
        const par = process.env.LAB_PAR || "EUR/USD";
        const dias = Number(process.env.LAB_DIAS || 90);
        console.log(`Teste de profundidade: ${par}, pedindo ${dias} dias de 5 min (máx. ${Math.ceil(dias * 288 / 5000)} páginas)`);
        const r = await baixarHistorico({ par, dias, chave });
        const dias_ok = r.candles.length ? (r.candles[r.candles.length - 1].ts - r.candles[0].ts) / 86400000 : 0;
        console.log(`Resultado: ${r.candles.length} candles, ${dias_ok.toFixed(1)} dias corridos, ${r.paginas} páginas; parou: ${r.parou}`);
        if (r.candles.length) console.log(`De ${fmt(r.candles[0].ts)} a ${fmt(r.candles[r.candles.length - 1].ts)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
