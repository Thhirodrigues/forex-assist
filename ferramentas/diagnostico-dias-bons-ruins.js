// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do pipeline de
// análise/decisão do produto. Só dispara manualmente (workflow_dispatch). Não
// escreve nada no Firestore.
//
// AJUSTE-067 (03/10/2026): pedido do usuário - "achar o ponto da análise que está
// falhando": dias com muitos WIN e poucos LOSS x dias ruins. Agrupa as operações
// encerradas por DIA (Brasília) e procura o que se repete nos dias bons e nos ruins.
// Usa só WIN/LOSS (não o valor em US$, que foi inflado em candle de notícia pelo modelo
// de fechamento antigo). Perguntas:
//   1) os resultados de um mesmo dia andam juntos (mais do que o acaso explicaria)?
//   2) o dia segue a direção do dólar (as operações são correlacionadas)?
//   3) algo conhecido NA HORA DO SINAL (hora, sessão, par, direção, RSI, ADX, score, modo,
//      quantas operações do mesmo lado do dólar já estavam abertas) separa ganho de perda?
// Amostra pequena: tudo é indício, não prova.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SOMENTE_CONFIG = process.env.SOMENTE_CONFIG === "1";
// DESDE=AAAA-MM-DD (dia de Brasília): ignora operações anteriores. Antes de 17/09/2026 o
// score era outra escala (~100) e não havia ADX: misturar as épocas distorce tudo.
const DESDE = process.env.DESDE || "";

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const BRT = ms => new Date(ms - 3 * 3600000);
const diaBRT = ms => BRT(ms).toISOString().slice(0, 10);
const horaBRT = ms => BRT(ms).getUTCHours();
const DSEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const f1 = v => v == null ? "  - " : v.toFixed(1).padStart(5);
const pct = (w, n) => n ? `${(100 * w / n).toFixed(0).padStart(3)}% (${w}/${n})${n < 8 ? "*" : ""}` : "  -";
function pearson(x, y) {
    const n = x.length; if (n < 5) return null;
    const mx = media(x), my = media(y); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

// +1 = comprado em dólar, -1 = vendido em dólar, 0 = sem dólar no par
function exposicaoUSD(par, direcao) {
    const [b, c] = String(par).split("/"); const compra = direcao === "BUY";
    if (b === "USD") return compra ? 1 : -1;
    if (c === "USD") return compra ? -1 : 1;
    return 0;
}
function exposicaoJPY(par, direcao) {
    const [b, c] = String(par).split("/"); const compra = direcao === "BUY";
    if (c === "JPY") return compra ? -1 : 1;     // comprado em JPY = vendido no par xxx/JPY
    if (b === "JPY") return compra ? 1 : -1;
    return 0;
}

function tabela(titulo, ops, chave, ordem) {
    const g = {}; ops.forEach(o => { const k = chave(o); if (k == null) return; (g[k] = g[k] || []).push(o); });
    const ks = Object.keys(g).sort(ordem || ((a, b) => String(a).localeCompare(String(b))));
    console.log(`\n-- ${titulo}`);
    ks.forEach(k => { const w = g[k].filter(o => o.win).length; console.log(`   ${String(k).padEnd(16)} ${pct(w, g[k].length)}`); });
}

async function main() {

    const snap = await db.collection("historico").where("resultado", "in", ["WIN", "LOSS"]).get();
    let ops = [];
    snap.forEach(doc => {
        const d = doc.data(); const ind = d.indicadores || {};
        const t = num(d.timestamp) ?? (d.timestamp && d.timestamp.toMillis ? d.timestamp.toMillis() : null);
        if (!t) return;
        const par = d.par, dir = d.direcao === "CALL" ? "BUY" : d.direcao === "PUT" ? "SELL" : d.direcao;
        const rsi = num(ind.rsi ?? d.rsi);
        const rsiExt = rsi == null ? null : (dir === "BUY" ? rsi - 50 : 50 - rsi);   // >0 = a favor da direção; alto = esticado
        const pip = String(par).includes("JPY") ? 0.01 : 0.0001;
        ops.push({
            id: doc.id, t, fim: num(d.fimOperacao) ?? t, dia: diaBRT(t), hora: horaBRT(t), par, dir, win: d.resultado === "WIN",
            usd: exposicaoUSD(par, dir), jpy: exposicaoJPY(par, dir),
            res: num(d.resultadoFinanceiro), score: num(d.score), adx: num(ind.adx), rsi, rsiExt,
            atrPips: num(ind.atr) != null ? num(ind.atr) / pip : null,
            perfil: d.perfil || null, janela: d.janelaOrigem || null, qual: d.qualidade || null, multi: d.multi || null,
            smc: num(d.smcScore) ?? 0, cand: num(d.candlestickScore) ?? 0, emaScore: num(d.emaScore), adxScore: num(d.adxScore),
            regime: d.financeiro?.regimeTPSL || null
        });
    });

    if (DESDE) ops = ops.filter(o => o.dia >= DESDE);
    if (SOMENTE_CONFIG) ops = ops.filter(o => o.regime === "CONFIG");
    ops.sort((a, b) => a.t - b.t);

    console.log(`OPERAÇÕES ENCERRADAS ANALISADAS: ${ops.length}${DESDE ? ` (desde ${DESDE})` : ""}${SOMENTE_CONFIG ? " (só regime CONFIG)" : ""}  | primeiro dia ${ops[0]?.dia} | último ${ops[ops.length - 1]?.dia}`);
    const W = ops.filter(o => o.win).length;
    console.log(`ACERTO GERAL: ${pct(W, ops.length)}`);

    // carga correlacionada: quantas OUTRAS operações do mesmo lado do dólar estavam abertas quando esta abriu
    ops.forEach(o => {
        o.cargaUSD = o.usd === 0 ? null : ops.filter(p => p !== o && p.usd === o.usd && p.t <= o.t && p.fim >= o.t).length;
        o.cargaMesmaDir = ops.filter(p => p !== o && p.t <= o.t && p.fim >= o.t && p.dir === o.dir).length;
    });

    // ---- por dia
    const dias = {}; ops.forEach(o => (dias[o.dia] = dias[o.dia] || []).push(o));
    const lista = Object.keys(dias).sort();
    console.log("\n==== POR DIA (Brasília) ====");
    console.log("dia         sem   n   acerto        net$   USDlong/short  winLong winShort  score  adx  rsiExt  carga");
    const resumo = [];
    lista.forEach(dia => {
        const a = dias[dia]; const w = a.filter(o => o.win).length;
        const lg = a.filter(o => o.usd === 1), sh = a.filter(o => o.usd === -1);
        const wl = lg.filter(o => o.win).length, ws = sh.filter(o => o.win).length;
        const net = a.reduce((s, o) => s + (o.res || 0), 0);
        const r = { dia, n: a.length, w, wr: w / a.length, net, lg: lg.length, sh: sh.length, wl, ws,
            score: media(a.map(o => o.score).filter(v => v != null)), adx: media(a.map(o => o.adx).filter(v => v != null)),
            rsiExt: media(a.map(o => o.rsiExt).filter(v => v != null)), carga: media(a.map(o => o.cargaUSD).filter(v => v != null)),
            buy: a.filter(o => o.dir === "BUY").length / a.length, atr: media(a.map(o => o.atrPips).filter(v => v != null)),
            usdAlinhado: (lg.length + sh.length) ? Math.abs(lg.length - sh.length) / (lg.length + sh.length) : null };
        resumo.push(r);
        console.log(`${dia} ${DSEM[new Date(dia + "T12:00:00Z").getUTCDay()]} ${String(r.n).padStart(3)}  ${pct(w, r.n).padEnd(12)} ${net.toFixed(2).padStart(8)}   ${String(lg.length).padStart(3)}/${String(sh.length).padEnd(3)}      ${pct(wl, lg.length).padEnd(11)} ${pct(ws, sh.length).padEnd(11)} ${f1(r.score)} ${f1(r.adx)} ${f1(r.rsiExt)} ${f1(r.carga)}`);
    });
    console.log("(* = menos de 8 operações; rsiExt = RSI a favor da direção, alto = esticado; carga = média de outras operações abertas no mesmo lado do dólar)");

    // ---- 1) os resultados do dia andam juntos?
    const p = W / ops.length; let chi = 0, gl = 0;
    resumo.filter(r => r.n >= 3).forEach(r => { chi += r.n * (r.wr - p) ** 2 / (p * (1 - p)); gl++; });
    console.log(`\n==== 1) OS RESULTADOS DO MESMO DIA ANDAM JUNTOS? ====`);
    console.log(`   estatística de dispersão = ${chi.toFixed(1)} com ${gl - 1} graus de liberdade (se as operações fossem independentes, ficaria perto de ${gl - 1}). Razão = ${(chi / Math.max(1, gl - 1)).toFixed(2)} (>1,5 = forte agrupamento por dia)`);

    // ---- 2) dia bom x dia ruim
    const bons = resumo.filter(r => r.n >= 5 && r.wr >= 0.6), ruins = resumo.filter(r => r.n >= 5 && r.wr <= 0.3), meio = resumo.filter(r => r.n >= 5 && r.wr > 0.3 && r.wr < 0.6);
    console.log(`\n==== 2) DIAS BONS (>=60%, n>=5): ${bons.length} | RUINS (<=30%): ${ruins.length} | MEIO: ${meio.length} ====`);
    const cmp = (nome, f) => { const m = r => media(r.map(f).filter(v => v != null)); console.log(`   ${nome.padEnd(34)} bons=${f1(m(bons))} ruins=${f1(m(ruins))} meio=${f1(m(meio))}`); };
    cmp("operações por dia", r => r.n); cmp("score médio", r => r.score); cmp("ADX médio", r => r.adx);
    cmp("RSI esticado médio (a favor)", r => r.rsiExt); cmp("ATR médio (pips)", r => r.atr);
    cmp("fração compras", r => r.buy * 100); cmp("alinhamento no dólar (0-100)", r => r.usdAlinhado == null ? null : r.usdAlinhado * 100);
    cmp("carga média no mesmo lado do dólar", r => r.carga);
    const grandes = resumo.filter(r => r.n >= 5);
    console.log(`   correlação (entre dias, n=${grandes.length}) acerto x score=${(pearson(grandes.map(r => r.wr), grandes.map(r => r.score || 0)) ?? NaN).toFixed(2)}  x ADX=${(pearson(grandes.map(r => r.wr), grandes.map(r => r.adx || 0)) ?? NaN).toFixed(2)}  x alinhamento USD=${(pearson(grandes.map(r => r.wr), grandes.map(r => r.usdAlinhado || 0)) ?? NaN).toFixed(2)}  x carga=${(pearson(grandes.map(r => r.wr), grandes.map(r => r.carga || 0)) ?? NaN).toFixed(2)}  x nº de operações=${(pearson(grandes.map(r => r.wr), grandes.map(r => r.n)) ?? NaN).toFixed(2)}`);

    // ---- 3) o dia segue o dólar?
    console.log(`\n==== 3) O DIA SEGUE A DIREÇÃO DO DÓLAR? ====`);
    let seguem = 0, total = 0;
    resumo.filter(r => r.lg >= 2 && r.sh >= 1 || r.sh >= 2 && r.lg >= 1).forEach(r => {
        total++; if ((r.wl / Math.max(1, r.lg) >= 0.5) !== (r.ws / Math.max(1, r.sh) >= 0.5)) seguem++;
    });
    console.log(`   dias com operações dos DOIS lados do dólar: ${total}; em ${seguem} deles um lado ganhou (>=50%) e o outro perdeu - isto é, o dia decidiu "dólar sobe" ou "dólar desce".`);
    const lg = ops.filter(o => o.usd === 1), sh = ops.filter(o => o.usd === -1);
    console.log(`   acerto geral comprado em dólar: ${pct(lg.filter(o => o.win).length, lg.length)} | vendido em dólar: ${pct(sh.filter(o => o.win).length, sh.length)} | sem dólar (cruzados): ${pct(ops.filter(o => o.usd === 0 && o.win).length, ops.filter(o => o.usd === 0).length)}`);

    // ---- 4) o que se sabe na hora do sinal
    console.log(`\n==== 4) CARACTERÍSTICAS NA HORA DO SINAL x ACERTO (todas as operações) ====`);
    tabela("hora de Brasília (blocos de 3h)", ops, o => `${String(Math.floor(o.hora / 3) * 3).padStart(2, "0")}-${String(Math.floor(o.hora / 3) * 3 + 2).padStart(2, "0")}h`);
    tabela("sessão de origem", ops, o => o.janela);
    tabela("modo que aprovou", ops, o => o.perfil);
    tabela("qualidade", ops, o => o.qual);
    tabela("multi-timeframe", ops, o => o.multi);
    tabela("direção", ops, o => o.dir);
    tabela("par", ops, o => o.par);
    tabela("score (faixas)", ops, o => o.score == null ? null : o.score < 35 ? "<35" : o.score < 40 ? "35-39" : o.score < 45 ? "40-44" : o.score < 50 ? "45-49" : ">=50");
    tabela("ADX (faixas)", ops, o => o.adx == null ? null : o.adx < 15 ? "<15" : o.adx < 20 ? "15-19" : o.adx < 25 ? "20-24" : o.adx < 30 ? "25-29" : o.adx < 40 ? "30-39" : ">=40", (a, b) => parseFloat(a.replace(/[<>=]/g, "")) - parseFloat(b.replace(/[<>=]/g, "")));
    tabela("RSI a favor da direção (50=neutro)", ops, o => o.rsiExt == null ? null : o.rsiExt < 0 ? "contra (<0)" : o.rsiExt < 10 ? "0-9" : o.rsiExt < 15 ? "10-14" : o.rsiExt < 20 ? "15-19" : ">=20 esticado");
    tabela("ATR em pips", ops, o => o.atrPips == null ? null : o.atrPips < 5 ? "<5" : o.atrPips < 8 ? "5-7" : o.atrPips < 12 ? "8-11" : ">=12", (a, b) => parseFloat(a.replace(/[<>=]/g, "")) - parseFloat(b.replace(/[<>=]/g, "")));
    tabela("SMC score", ops, o => o.smc > 0 ? "somou" : o.smc < 0 ? "tirou" : "zero");
    tabela("candlestick score", ops, o => o.cand > 0 ? "somou" : o.cand < 0 ? "tirou" : "zero");
    tabela("outras ops abertas, mesmo lado do dólar", ops, o => o.cargaUSD == null ? null : o.cargaUSD >= 3 ? "3+" : String(o.cargaUSD));
    tabela("outras ops abertas, mesma direção (BUY/SELL)", ops, o => o.cargaMesmaDir >= 4 ? "4+" : String(o.cargaMesmaDir));
    tabela("dia da semana", ops, o => DSEM[new Date(o.dia + "T12:00:00Z").getUTCDay()]);

    // ---- 5) sequência
    console.log(`\n==== 5) DEPOIS DE UMA SEQUÊNCIA ====`);
    for (const k of [1, 2, 3]) {
        const seq = []; for (let i = k; i < ops.length; i++) { if (ops.slice(i - k, i).every(o => !o.win)) seq.push(ops[i]); }
        console.log(`   depois de ${k} LOSS seguidos: ${pct(seq.filter(o => o.win).length, seq.length)}`);
    }
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
