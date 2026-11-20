// ===================================================
// FOREX ASSIST - LABORATÓRIO - PRÉ-REGISTRO 6.58: MOMENTUM DE SÉRIE TEMPORAL EM VELAS DIÁRIAS (H_TSMOM). SOMENTE LEITURA.
//
// Velas D1 da XM (dia do SERVIDOR, que fecha às 17h de Nova York: não precisa converter fuso). A última vela de cada arquivo é
// descartada (dia em andamento na exportação). Amostra: da primeira data em que os 10 pares têm vela (não antes de 01/01/2005).
// Braço principal (mensal): no último dia com vela de cada mês, direção = sinal de log(C_hoje / C_fim do mês 12 meses antes);
//   posição até o último dia do mês seguinte. Braço secundário (semanal): fim de semana = último dia com vela da semana (seg-dom);
//   retrospecto de 12 semanas; posição por 1 semana.
// Resultado do par no período = direção x log(C_fim / C_ini) - spread/preço (cobrado INTEIRO todo período) + swap (sensibilidade).
// Swap: rolagens = dias com vela d tais que ini <= d < fim (quarta-feira = dia triplo da XM conta 3); valor em pontos por noite
//   (modo 1 da XM) -> fração do preço = swap x ponto / C_ini. Swap ATUAL aplicado a todo o período (aproximação declarada).
// Carteira = média dos pares com sinal no período. IC por bootstrap em BLOCOS móveis (3 meses / 12 semanas), 10.000, semente fixa,
// nível 97,5% (dois braços). PASSA: média líquida com swap > 0, limite inferior > 0, E média líquida > 0 nas duas metades.
// ===================================================
const fs = require("fs");
const { spreadDoPar } = require("./spreads");

const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];
const INICIO_MIN = Date.UTC(2005, 0, 1) / 1000;
const NIVEL = 0.975;
const r3 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const dp = (a) => { const m = media(a); return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : null; };
const pipDoPar = (par) => /JPY/.test(par) ? 0.01 : 0.0001;

function lerD1(texto) {
    const v = [];
    for (const l of String(texto).split(/\r?\n/)) {
        if (!l || l.startsWith("offset_") || l.startsWith("simbolo,")) continue;
        const c = l.split(","); if (c.length < 8) continue;
        v.push({ t: Number(c[1]), o: Number(c[2]), h: Number(c[3]), l: Number(c[4]), c: Number(c[5]) });
    }
    v.sort((a, b) => a.t - b.t);
    return v.slice(0, -1);                                 // última vela = dia em andamento na exportação
}

function lerSwaps(texto) {
    const out = {};
    for (const l of String(texto).split(/\r?\n/).slice(1)) {
        const c = l.split(","); if (c.length < 7) continue;
        out[c[0].slice(0, 3) + "/" + c[0].slice(3, 6)] = { compra: Number(c[1]), venda: Number(c[2]), modo: Number(c[3]), triplo: Number(c[4]), ponto: Number(c[5]) };
    }
    return out;
}

const chaveMes = (t) => { const d = new Date(t * 1000); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const chaveSemana = (t) => { const d = new Date(t * 1000); const dow = (d.getUTCDay() + 6) % 7; return Math.floor((t - dow * 86400) / 86400 / 7); };   // segunda como início

// fins de período: índice da última vela de cada período (mês ou semana)
function finsDePeriodo(barras, chave) {
    const fins = new Map();
    barras.forEach((b, i) => fins.set(chave(b.t), i));
    return fins;
}

function rolagens(barras, iIni, iFim, triplo) {
    let n = 0;
    for (let i = iIni; i < iFim; i++) n += new Date(barras[i].t * 1000).getUTCDay() === triplo ? 3 : 1;
    return n;
}

// gera os resultados por par e período para um braço
function braco(barrasPorPar, swaps, { chave, retro, inicio }) {
    const porPeriodo = new Map();          // chave do período de POSIÇÃO -> lista de resultados dos pares
    for (const [par, barras] of Object.entries(barrasPorPar)) {
        const fins = finsDePeriodo(barras, chave);
        const ks = [...fins.keys()].sort((a, b) => a - b);
        const spreadFrac = (preco) => spreadDoPar(par) * pipDoPar(par) / preco;
        const sw = swaps[par];
        for (let j = retro; j < ks.length - 1; j++) {
            const kSinal = ks[j], kAntes = kSinal - retro, kPos = ks[j + 1];
            if (!fins.has(kAntes) || kPos !== kSinal + 1) continue;      // precisa do fim do período de retrospecto e do período seguinte contíguo
            const iSinal = fins.get(kSinal), iAntes = fins.get(kAntes), iFim = fins.get(kPos);
            if (barras[iSinal].t < inicio) continue;
            const momento = Math.log(barras[iSinal].c / barras[iAntes].c);
            if (momento === 0) continue;
            const dir = momento > 0 ? 1 : -1;
            const bruto = dir * Math.log(barras[iFim].c / barras[iSinal].c);
            const custo = spreadFrac(barras[iSinal].c);
            const noites = rolagens(barras, iSinal, iFim, sw ? sw.triplo : 3);
            const swapFrac = sw ? (dir > 0 ? sw.compra : sw.venda) * sw.ponto * noites / barras[iSinal].c : 0;
            const swapMedio = sw ? (sw.compra + sw.venda) / 2 * sw.ponto * noites / barras[iSinal].c : 0;
            if (!porPeriodo.has(kPos)) porPeriodo.set(kPos, []);
            porPeriodo.get(kPos).push({ par, dir, bruto, liqSemSwap: bruto - custo, liq: bruto - custo + swapFrac,
                aleatorio: -custo + swapMedio, usd: usdLado(par) * Math.log(barras[iFim].c / barras[iSinal].c), tIni: barras[iSinal].t });
        }
    }
    return [...porPeriodo.entries()].sort((a, b) => a[0] - b[0]).map(([k, l]) => ({ k, n: l.length, tIni: Math.min(...l.map(x => x.tIni)), pares: l,
        bruto: media(l.map(x => x.bruto)), liqSemSwap: media(l.map(x => x.liqSemSwap)), liq: media(l.map(x => x.liq)), aleatorio: media(l.map(x => x.aleatorio)),
        usd: media(l.filter(x => x.usd !== null).map(x => x.usd)) }));
}
// "sempre comprado em dólar": +1 em USD/XXX, -1 em XXX/USD, cruzados fora
function usdLado(par) { const [b, q] = par.split("/"); return b === "USD" ? 1 : q === "USD" ? -1 : null; }

function rng(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
function quantil(s, q) { const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); }
function icBlocos(serie, { bloco, B = 10000, nivel = NIVEL, semente = 20261120 } = {}) {
    const n = serie.length, rnd = rng(semente), medias = [];
    for (let b = 0; b < B; b++) {
        let s = 0, c = 0;
        while (c < n) { const ini = Math.floor(rnd() * (n - bloco + 1)); for (let i = ini; i < ini + bloco && c < n; i++, c++) s += serie[i]; }
        medias.push(s / n);
    }
    medias.sort((a, b) => a - b);
    const a = (1 - nivel) / 2;
    return [quantil(medias, a), quantil(medias, 1 - a)];
}

function resumo(periodos, { bloco, porAno }) {
    const pct = (x) => r3(100 * x);
    const liq = periodos.map(p => p.liq), metade = Math.floor(liq.length / 2);
    const ic = icBlocos(liq, { bloco });
    let acum = 0, pico = 0, queda = 0; for (const x of liq) { acum += x; pico = Math.max(pico, acum); queda = Math.min(queda, acum - pico); }
    const anos = {}; for (const p of periodos) { const y = new Date(p.tIni * 1000).getUTCFullYear(); anos[y] = (anos[y] || 0) + p.liq; }
    const m1 = media(liq.slice(0, metade)), m2 = media(liq.slice(metade));
    const passa = media(liq) > 0 && ic[0] > 0 && m1 > 0 && m2 > 0;
    return {
        periodos: periodos.length, de: new Date(periodos[0].tIni * 1000).toISOString().slice(0, 10), ate: new Date(periodos[periodos.length - 1].tIni * 1000).toISOString().slice(0, 10),
        mediaPctPorPeriodo: { bruto: pct(media(periodos.map(p => p.bruto))), semSwap: pct(media(periodos.map(p => p.liqSemSwap))), comSwap: pct(media(liq)),
            aleatorio: pct(media(periodos.map(p => p.aleatorio))), sempreCompradoDolar: pct(media(periodos.map(p => p.usd).filter(Number.isFinite))) },
        icComSwap: ic.map(pct), nivelIc: NIVEL, metades: [pct(m1), pct(m2)],
        anualPct: pct(media(liq) * porAno), sharpe: r3(media(liq) / dp(liq) * Math.sqrt(porAno)), maiorQuedaPct: pct(queda),
        periodosPositivosPct: r3(100 * liq.filter(x => x > 0).length / liq.length),
        piorAno: Object.entries(anos).sort((a, b) => a[1] - b[1]).slice(0, 1).map(([y, v]) => [y, pct(v)])[0],
        melhorAno: Object.entries(anos).sort((a, b) => b[1] - a[1]).slice(0, 1).map(([y, v]) => [y, pct(v)])[0],
        porAnoPct: Object.fromEntries(Object.entries(anos).map(([y, v]) => [y, pct(v)])),
        veredito: passa ? "PASSOU (triagem; exige acompanhamento forward)" : "REPROVADO"
    };
}

function inicioComum(barrasPorPar) {
    return Math.max(INICIO_MIN, ...Object.values(barrasPorPar).map(b => b[0].t));
}

module.exports = { lerD1, lerSwaps, braco, resumo, icBlocos, rolagens, chaveMes, chaveSemana, inicioComum, usdLado };

if (require.main === module) {
    const dir = process.argv[2] || "DOCUMENTACAO/arquivo-xm";
    const barrasPorPar = {};
    for (const par of PARES) { const f = `${dir}/xm_barras_D1_${par.replace("/", "")}.csv`; if (fs.existsSync(f)) barrasPorPar[par] = lerD1(fs.readFileSync(f, "utf8")); }
    const swaps = lerSwaps(fs.readFileSync(`${dir}/xm_swaps.csv`, "utf8"));
    const ini = inicioComum(barrasPorPar);
    console.log(`pares: ${Object.keys(barrasPorPar).length}; início comum: ${new Date(ini * 1000).toISOString().slice(0, 10)}`);
    const mensal = braco(barrasPorPar, swaps, { chave: chaveMes, retro: 12, inicio: ini });
    const semanal = braco(barrasPorPar, swaps, { chave: chaveSemana, retro: 12, inicio: ini });
    console.log("PRINCIPAL_MENSAL = " + JSON.stringify(resumo(mensal, { bloco: 3, porAno: 12 })));
    console.log("SECUNDARIO_SEMANAL = " + JSON.stringify(resumo(semanal, { bloco: 12, porAno: 52 })));
}
