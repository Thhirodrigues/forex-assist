// ===================================================
// FOREX ASSIST - LABORATÓRIO - HORIZONTE DIÁRIO (orquestração; protocolo 6.21)
//
// LAB_MODO=baixar : 1 chamada TwelveData `1day` (5000 barras, ~19 anos) por par (KEY_3) -> guarda em `diario/{par}` (binário) no projeto LAB.
// LAB_MODO=rodar  : lê os diários guardados, avalia D1-D5 (lab/diario.js) e publica `replay/diario` (só agregados).
// Nada é escrito no projeto oficial; não há push; o scanner/sinal não são tocados.
// ===================================================

const { paginaDeCandles } = require("./historico");
const { avaliarFamilia, FAMILIAS_DIARIAS } = require("./diario");
const { empacotar, desempacotar } = require("./replay-run");

const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY", "GBP/JPY", "EUR/GBP"];
const chavePar = (par) => par.replace("/", "_");
const dorme = (ms) => new Promise(r => setTimeout(r, ms));

// Limpeza decidida ANTES de ver resultado: barra de sábado descartada; barra de domingo (pregão que abre 21:00 UTC) incorporada à segunda seguinte,
// para que "252 barras" sejam ~252 dias úteis e o dia de segunda tenha a abertura real.
function limparDiarios(cs) {
    const ordenado = [...cs].filter(c => [c.o, c.h, c.l, c.c].every(Number.isFinite) && c.h >= c.l).sort((a, b) => a.ts - b.ts);
    const out = []; let domingo = null, incorporadas = 0, descartadas = 0;
    for (const c of ordenado) {
        const dia = new Date(c.ts).getUTCDay();
        if (dia === 6) { descartadas++; continue; }
        if (dia === 0) { domingo = c; continue; }
        if (dia === 1 && domingo && c.ts - domingo.ts <= 86400000 * 1.5) {
            out.push({ ts: c.ts, o: domingo.o, h: Math.max(c.h, domingo.h), l: Math.min(c.l, domingo.l), c: c.c }); incorporadas++; domingo = null; continue;
        }
        domingo = null; out.push(c);
    }
    return { candles: out, incorporadas, descartadas };
}

async function baixarDiarios({ lab, pares = PARES, chave, http, esperar = dorme, log = console.log, agora = Date.now() }) {
    let k = 0;
    for (const par of pares) {
        if (k++ > 0) await esperar(8000);
        const brutos = await paginaDeCandles({ par, endMs: agora, chave, tamanho: 5000, interval: "1day", http });
        const { candles, incorporadas, descartadas } = limparDiarios(brutos);
        const f = empacotar(candles);   // um par cabe em 1-2 pedaços de 8000
        log(`${par}: ${brutos.length} barras brutas -> ${candles.length} limpas (domingos incorporados ${incorporadas}, sábados ${descartadas}); de ${new Date(candles[0].ts).toISOString().slice(0, 10)} a ${new Date(candles[candles.length - 1].ts).toISOString().slice(0, 10)}`);
        await lab.collection("diario").doc(chavePar(par)).set({ par, n: candles.length, ini: candles[0].ts, fim: candles[candles.length - 1].ts, dados: f[0].dados, extra: f.length > 1 ? f[1].dados : null });
    }
}

async function lerDiarios({ lab, pares = PARES }) {
    const dados = {};
    for (const par of pares) {
        const s = await lab.collection("diario").doc(chavePar(par)).get();
        if (!s.exists) continue;
        const d = s.data();
        dados[par] = desempacotar([{ k: 0, dados: d.dados }, ...(d.extra ? [{ k: 1, dados: d.extra }] : [])]);
    }
    return dados;
}

async function rodarDiario({ dados, log = console.log }) {
    const pares = Object.keys(dados);
    const nuloCache = {};
    const resultados = {};
    for (const f of Object.keys(FAMILIAS_DIARIAS)) {
        const r = avaliarFamilia({ familia: f, dados, paresTodos: pares, nuloCache });
        resultados[f] = r;
        log(`${f} ${r.nome}: Sharpe líq ${r.sharpe.toFixed(2)} (bruto ${r.sharpeBruto.toFixed(2)}), IC95 ${r.ic95[0].toFixed(2)}..${r.ic95[1].toFixed(2)}, nulo p99 ${r.nulo.p99.toFixed(2)}, ` +
            `meses+ ${r.pctMesesPos.toFixed(0)}%, sem+ ${r.pctSemanasPos.toFixed(0)}%, DD ${r.drawdownMax.toFixed(0)}%, metades ${r.metades.map(x => x.toFixed(2)).join("/")}, ` +
            `lag1 ${r.robustez.lag1.toFixed(2)}, spread2x ${r.robustez.spread2x.toFixed(2)} => ${r.veredito}`);
    }
    return resultados;
}

module.exports = { limparDiarios, baixarDiarios, lerDiarios, rodarDiario, PARES };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        lab.settings({ ignoreUndefinedProperties: true });
        const modo = process.env.LAB_MODO || "ambos";
        if (modo === "baixar" || modo === "ambos") await baixarDiarios({ lab, chave: process.env.API_KEY_3 || process.env.API_KEY_1 });
        if (modo === "rodar" || modo === "ambos") {
            const dados = await lerDiarios({ lab });
            const resultados = await rodarDiario({ dados });
            const doc = { geradoEm: Date.now(), pares: Object.keys(dados), resultados };
            for (let t = 1; ; t++) {
                try { await lab.collection("replay").doc("diario").set(doc); break; }
                catch (e) { if (t >= 4) throw e; console.log(`gravação falhou (${e.message}); tentativa ${t + 1}/4`); await dorme(3000 * t); }
            }
            console.log("Resultado publicado em replay/diario.");
        }
    })().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
}
