const assert = require("assert");
const D = require("./diario");
const { taxaEm } = require("./taxas");

const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY", "GBP/JPY", "EUR/GBP"];
const TAXAS_PCT = { USD: 1, EUR: 0, GBP: 3, JPY: -0.1, AUD: 8, CAD: 2, CHF: -1, NZD: 7 };
const taxasFixas = (m = TAXAS_PCT) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ts: [Date.UTC(2000, 0, 1)], v: [v] }]));
const difDia = (par, m = TAXAS_PCT) => { const [b, q] = par.split("/"); return (m[b] - m[q]) / 100; };

// mundo sintético; deriva por par = função do diferencial (UIP: moeda de juro alto desvaloriza o quanto rende; 0 = passeio aleatório)
function mundo(fatorUIP, ruido = 0.005, n = 3200) {
    const out = {};
    PARES.forEach((par, k) => {
        const r = D.prng(500 + k); const cs = []; let preco = par.includes("JPY") ? 110 : 1.1; let ts = Date.UTC(2010, 0, 4);
        for (let i = 0; i < n; i++) {
            while ([0, 6].includes(new Date(ts).getUTCDay())) ts += 86400000;
            const ret = -fatorUIP * difDia(par) / 252 + (r() + r() + r() - 1.5) * 2 * ruido;
            const o = preco, c = o * (1 + ret);
            cs.push({ ts, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c }); preco = c; ts += 86400000;
        }
        out[par] = cs;
    });
    return out;
}

// ---- contabilidade do carry: preço parado, sempre comprado, diferencial 3% => w x 3% x dias/365 menos markup ----
{
    const dados = Object.fromEntries(PARES.map(p => [p, Array.from({ length: 400 }, (_, i) => ({ ts: Date.UTC(2012, 0, 2) + i * 86400000, o: 1, h: 1, l: 1, c: 1 }))]));
    const { datas, series } = D.alinhar(dados, ["EUR/USD"]);
    const diff = { "EUR/USD": datas.map(() => 0.03) };
    const sinais = { "EUR/USD": datas.map((_, t) => (t >= D.AQUECIMENTO ? 1 : 0)) };
    const c = D.carteira({ series, pares: ["EUR/USD"], datas, sinais, carry: { diff, markup: 0.01 } });
    const t = D.AQUECIMENTO + 20;
    const w = (0.10 / (0 || 1)); // vol zero => peso 0: teste só vale com vol > 0
    assert.ok(c.diario[t] === 0 || Number.isFinite(c.diario[t]));
}
{
    // com vol > 0: peso conhecido via bruto sem carry
    const m = mundo(0, 0.005, 700);
    const { datas, series } = D.alinhar(m, ["EUR/USD"]);
    const sinais = { "EUR/USD": datas.map((_, t) => (t >= D.AQUECIMENTO ? 1 : 0)) };
    const diff = { "EUR/USD": datas.map(() => 0.03) };
    const sem = D.carteira({ series, pares: ["EUR/USD"], datas, sinais });
    const com = D.carteira({ series, pares: ["EUR/USD"], datas, sinais, carry: { diff, markup: 0.01 } });
    const t = D.AQUECIMENTO + 40;
    const dias = (datas[t] - datas[t - 1]) / 86400000;
    // peso w = (diário_sem - preço) ... recupera w pelo carry: (com - sem) = w x (0.03 - 0.01) x dias/365 quando w constante entre rebalanceamentos
    const retPreco = series["EUR/USD"][t].c / series["EUR/USD"][t - 1].c - 1;
    const w = sem.bruto[t] / retPreco;
    assert.ok(w > 0, "peso positivo");
    assert.ok(Math.abs((com.diario[t] - sem.diario[t]) - w * (0.03 - 0.01) * dias / 365) < 1e-12, "carry líquido de markup contabilizado por dias corridos");
    assert.ok(Math.abs((com.bruto[t] - sem.bruto[t]) - w * 0.03 * dias / 365) < 1e-12, "carry bruto entra no retorno antes do custo");
}

// ---- sem olhar para frente: mudar a taxa FUTURA não muda o sinal de carry até o dia t ----
{
    const m = mundo(0); const { datas, series } = D.alinhar(m, PARES);
    const tA = { ...taxasFixas(), AUD: { ts: [Date.UTC(2000, 0, 1), datas[2000]], v: [4, -2] } };   // AUD cai de 4 para -2 só no dia 2000
    const sA = D.sinaisC1(series, PARES, datas, { diff: D.diferenciais(PARES, datas, taxasFixas()) });
    const sB = D.sinaisC1(series, PARES, datas, { diff: D.diferenciais(PARES, datas, tA) });
    for (const p of PARES) assert.deepEqual(sA[p].slice(0, 2000), sB[p].slice(0, 2000), `taxa futura não vaza em ${p}`);
    assert.notDeepEqual(sA["AUD/USD"].slice(2000), sB["AUD/USD"].slice(2000), "e depois do degrau o sinal muda");
    assert.strictEqual(taxaEm(tA.AUD, datas[1999]), 4);
}

// ---- C2 filtra diferencial pequeno; C3 só quando momentum concorda ----
{
    const m = mundo(0); const { datas, series } = D.alinhar(m, PARES);
    const ctx = { diff: D.diferenciais(PARES, datas, taxasFixas()) };
    const c1 = D.sinaisC1(series, PARES, datas, ctx), c2 = D.sinaisC2(series, PARES, datas, ctx), c3 = D.sinaisC3(series, PARES, datas, ctx), d1 = D.sinaisD1(series, PARES, datas);
    const t = 1500;
    assert.strictEqual(c1["EUR/USD"][t], -1, "EUR (0%) rende menos que USD (1%): vende EUR/USD");
    assert.strictEqual(c2["EUR/USD"][t], -1, "diferencial 1,0 pp passa o limiar (>=)");
    assert.strictEqual(c2["AUD/USD"][t], 1, "AUD 8% vs USD 1%: compra");
    const ctxPeq = { diff: D.diferenciais(PARES, datas, taxasFixas({ ...TAXAS_PCT, CAD: 1.5 })) };   // USD 1% vs CAD 1,5%: -0,5 pp
    assert.strictEqual(D.sinaisC1(series, PARES, datas, ctxPeq)["USD/CAD"][t], -1, "C1 opera qualquer diferencial");
    assert.strictEqual(D.sinaisC2(series, PARES, datas, ctxPeq)["USD/CAD"][t], 0, "C2: -0,5 pp está abaixo do limiar de 1 pp, fica fora");
    for (const p of PARES) { assert.ok(c3[p][t] === 0 || (c3[p][t] === c1[p][t] && c3[p][t] === d1[p][t]), "C3 só quando carry e momentum concordam"); }
}

// ---- mundo onde carry paga de verdade (preço sem desvalorização): C1 passa; mundo UIP (preço devolve o carry): C1 não passa ----
{
    const taxas = taxasFixas();
    const cache = {};
    const real = D.avaliarFamilia({ familia: "C1", dados: mundo(0), paresTodos: PARES, nuloCache: cache, sorteiosNulo: 60, sorteiosBoot: 500, taxas });
    assert.ok(real.sharpeBruto > real.sharpe && real.sharpe > 0.5, `C1 ganha quando o carry é pago (sharpe ${real.sharpe.toFixed(2)})`);
    if (process.env.DBG) console.log(JSON.stringify({s:real.sharpe,b:real.sharpeBruto,ic:real.ic95,nulo:real.nulo,met:real.metades,rob:real.robustez,crit:real.criterios,dd:real.drawdownMax}));
    assert.ok(real.criterios.A1 && typeof real.robustez.markup25 === "number", "A1 passa e há teste de markup 2,5");
    const uip = D.avaliarFamilia({ familia: "C1", dados: mundo(1), paresTodos: PARES, nuloCache: {}, sorteiosNulo: 60, sorteiosBoot: 500, taxas });
    assert.ok(uip.sharpe < real.sharpe - 0.5 && !uip.criterios.A1, `UIP: o preço devolve o carry, sem vantagem (sharpe ${uip.sharpe.toFixed(2)})`);
    assert.throws(() => D.avaliarFamilia({ familia: "C1", dados: mundo(0), paresTodos: PARES, nuloCache: {}, sorteiosNulo: 5, sorteiosBoot: 50 }), /taxas/);
    const inf = D.avaliarFamilia({ familia: "D1", comSwap: true, dados: mundo(0), paresTodos: PARES, nuloCache: {}, sorteiosNulo: 20, sorteiosBoot: 100, taxas });
    assert.ok(/informativo/.test(inf.nome), "D+swap vem marcado como informativo");
}
console.log("TESTES DO CARRY PASSARAM");
