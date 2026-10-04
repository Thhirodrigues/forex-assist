// Teste de fumaça do rotulador com um Firestore falso em memória (sem rede, sem credencial).
const assert = require("assert");
const { executar } = require("./rotulador");

function criarFake(dadosIniciais = {}) {
    const cols = JSON.parse(JSON.stringify(dadosIniciais));
    const inc = (n) => ({ __inc: n });
    const merge = (alvo, fonte) => {
        for (const [k, v] of Object.entries(fonte)) {
            if (v && v.__inc !== undefined) alvo[k] = Number(((alvo[k] || 0) + v.__inc).toFixed(4));
            else if (v && typeof v === "object" && !Array.isArray(v)) merge(alvo[k] = alvo[k] || {}, v);
            else alvo[k] = v;
        }
    };
    // o Firestore real recusa array dentro de array (e valor undefined): o falso também
    const validar = (v, caminho = "") => {
        if (Array.isArray(v)) v.forEach((x, i) => { if (Array.isArray(x)) throw new Error(`3 INVALID_ARGUMENT: Nested arrays are not allowed (${caminho}[${i}])`); validar(x, `${caminho}[${i}]`); });
        else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (x === undefined) throw new Error(`undefined em ${caminho}.${k}`); validar(x, `${caminho}.${k}`); }
    };
    const ref = (col, id) => ({ col, id, async get() { const d = (cols[col] || {})[id]; return { exists: !!d, data: () => JSON.parse(JSON.stringify(d)) }; },
        async set(v, o) { validar(v, `${col}/${id}`); cols[col] = cols[col] || {}; if (o && o.merge) merge(cols[col][id] = cols[col][id] || {}, v); else { cols[col][id] = {}; merge(cols[col][id], v); } } });
    const consulta = (col, filtros = [], ord = null, lim = 1e9) => ({
        where: (f, op, v) => consulta(col, [...filtros, [f, op, v]], ord, lim),
        orderBy: (f) => consulta(col, filtros, f, lim), limit: (n) => consulta(col, filtros, ord, n),
        async get() {
            let docs = Object.entries(cols[col] || {}).map(([id, d]) => ({ id, d }));
            for (const [f, op, v] of filtros) docs = docs.filter(x => op === ">" ? x.d[f] > v : x.d[f] === v);
            if (ord) docs.sort((a, b) => a.d[ord] - b.d[ord]);
            docs = docs.slice(0, lim);
            return { size: docs.length, forEach: (cb) => docs.forEach(x => cb({ id: x.id, data: () => JSON.parse(JSON.stringify(x.d)) })) };
        }
    });
    return { cols, inc, collection: (col) => Object.assign(consulta(col), { doc: (id) => ref(col, id) }),
        batch: () => { const ops = []; return { set: (r, v, o) => ops.push(() => r.set(v, o)), async commit() { for (const f of ops) await f(); } }; } };
}

const T0 = Date.UTC(2026, 9, 7, 12, 0);
const dt = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const an = (id, par, min, extra = {}) => ({ timestamp: T0 + min * 60000, par, aprovado: false, tendencia: "ALTA", precoEntrada: 1.1,
    tpPips: 25, slPips: 25, perfilResolvido: "AGRESSIVO", score: 45, indicadores: { adx: 20, rsi: 55, atr: 0.0008 }, ...extra });
const candles = (n, alvoNo) => Array.from({ length: n }, (_, i) => ({ datetime: dt(T0 + i * 300000),
    open: "1.1", high: i === alvoNo ? "1.1030" : "1.1004", low: "1.0996", close: "1.1" }));

(async () => {
    const ofic = criarFake({ analises: { a1: an("a1", "EUR/USD", 0, { aprovado: true, direcao: "BUY" }), a2: an("a2", "EUR/USD", 10), a3: an("a3", "GBP/USD", 5, { tendencia: "LATERAL" }) } });
    const lab = criarFake();
    const chamadas = [];
    const getCandles = async (par, intervalo, tam) => { chamadas.push([par, tam]); return candles(30, 3); };
    const logs = [];
    const args = { ofic, lab, getCandles, increment: lab.inc, agora: T0 + 3 * 3600e3, esperar: async () => {}, log: m => logs.push(m) };

    let r = await executar({ ...args, dry: true });
    assert.deepEqual(lab.cols, {}, "DRY não grava nada");
    assert.equal(chamadas.length, 1, "só EUR/USD precisa de candles (GBP/USD só tem LATERAL)");

    r = await executar(args);
    assert.equal(r.falhas, 0);
    const ids = Object.keys(lab.cols.entradas).sort();
    assert.deepEqual(ids, ["LAB_a1", "OFICIAL_a1"], "a2 cai no cooldown virtual de 30 min");
    assert.equal(lab.cols.entradas.LAB_a1.variantes.ATUAL.r, "WIN");
    // 1ª execução: registradoEm = agora (T0+3h) -> análises de T0 são PRÉ-registro
    const res = lab.cols.resumo["OFICIAL__ATUAL__pre__TODOS"];
    assert.equal(res.n, 1); assert.equal(res.pos, 1); assert.equal(res.pips, 25);
    assert.equal(lab.cols.resumo["OFICIAL__RR_1_2__pre__TODOS"], undefined, "1:2 pede 50 pips: ainda aberta");
    assert.equal(lab.cols.controle.rotulador.cursorGlobal, T0 + 10 * 60000);
    assert.ok(lab.cols.controle.rotulador.registradoEm);
    const antes = JSON.stringify(lab.cols.resumo);

    // 2ª execução idêntica: nada novo, contadores NÃO dobram
    await executar(args);
    assert.equal(JSON.stringify(lab.cols.resumo), antes, "reexecução não pode contar duas vezes");

    // par que falha: cursor segura e outras análises não se perdem
    const ofic2 = criarFake({ analises: { z1: an("z1", "EUR/USD", 0), z2: an("z2", "GBP/USD", 0) } });
    const lab2 = criarFake();
    const falha = async (par) => { if (par === "GBP/USD") throw new Error("429 simulado"); return candles(30, 3); };
    const r2 = await executar({ ...args, ofic: ofic2, lab: lab2, getCandles: falha, increment: lab2.inc });
    assert.equal(r2.falhas, 1);
    assert.ok(lab2.cols.entradas.LAB_z1 && !lab2.cols.entradas.LAB_z2);
    assert.ok(lab2.cols.controle.rotulador.cursorPar.GBP_USD < T0, "GBP/USD segurado no cursor antigo");
    const ok = async () => candles(30, 3);
    await executar({ ...args, ofic: ofic2, lab: lab2, getCandles: ok, increment: lab2.inc });
    assert.ok(lab2.cols.entradas.LAB_z2, "na tentativa seguinte o par que falhou é recuperado");
    assert.equal(Object.keys(lab2.cols.entradas).filter(x => x === "LAB_z1").length, 1);
    console.log("TODOS OS TESTES DO ROTULADOR PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
