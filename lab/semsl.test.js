// Testes do "TP sem SL" (6.31): simulador, swap, estatística agrupada por dia, regimes do dólar.
const assert = require("assert");
const { simularSemSL, noitesCobradas, swapPips } = require("./semsl");
const { clusterMedia, regimesDolar, resumir, diferencaContraControle } = require("./semsl-analise");

const T0 = Date.UTC(2026, 9, 13, 10, 0);          // terça 13/10/2026 10:00 UTC
const c = (i, o, h, l, cl) => ({ timestamp: T0 + i * 300000, open: o, high: h, low: l, close: cl });
const plano = (n, p = 1.1) => Array.from({ length: n }, (_, i) => c(i, p, p + 0.00002, p - 0.00002, p));
const base = { par: "EUR/USD", direcao: "BUY", tEntrada: T0, precoEntrada: 1.1, tpPips: 10, spreadPips: 2 };

// 1) TP simples: alvo = entrada + (tp+spread) pips
{
    const cs = plano(5); cs[3] = c(3, 1.1, 1.10125, 1.0999, 1.1012);
    const r = simularSemSL({ ...base, candles: cs });
    assert.strictEqual(r.resultado, "WIN"); assert.strictEqual(r.pips, 10);
    assert.ok(r.mae >= 0 && r.mae < 5);
}
// 2) queda de 100 pips e volta ao TP: sem stop vence com MAE >= 100; V0 (stop de 10 pips) perde
{
    const cs = plano(3);
    cs.push(c(3, 1.1, 1.1, 1.0900, 1.0905));           // -100 pips
    for (let i = 4; i < 10; i++) cs.push(c(i, 1.0905, 1.0906, 1.0904, 1.0905));
    cs.push(c(10, 1.0905, 1.1015, 1.0905, 1.1010));    // volta e toca o alvo (1.1012)
    const sem = simularSemSL({ ...base, candles: cs });
    assert.strictEqual(sem.resultado, "WIN"); assert.ok(sem.mae >= 100, `mae ${sem.mae}`);
    const v0 = simularSemSL({ ...base, slPips: 10, candles: cs });
    assert.strictEqual(v0.resultado, "STOP"); assert.strictEqual(v0.pips, -10);
    const largo = simularSemSL({ ...base, stopMult: 3, candles: cs });        // stop em 30 pips: também perde
    assert.strictEqual(largo.resultado, "STOP"); assert.strictEqual(largo.pips, -30);
    const largo5 = simularSemSL({ ...base, stopMult: 12, candles: cs });      // stop em 120 pips: sobrevive
    assert.strictEqual(largo5.resultado, "WIN");
}
// 3) prazo: após diasMax*288 candles fecha a mercado no OPEN (perda realizada, líquida do spread)
{
    const cs = plano(400, 1.0950);                       // preço 50 pips abaixo, nunca volta
    const r = simularSemSL({ ...base, diasMax: 1, candles: cs });
    assert.strictEqual(r.resultado, "TEMPO");
    assert.strictEqual(r.pips, -52);                     // -50 do preço -2 do spread
    assert.strictEqual(r.tFechamento, cs[288].timestamp);
}
// 4) sem desfecho e sem prazo: ABERTA marcada a mercado (pips = flutuante líquido do spread)
{
    const r = simularSemSL({ ...base, candles: plano(50) });
    assert.strictEqual(r.resultado, "ABERTA"); assert.strictEqual(r.pips, -2);
}
// 5) candle que toca alvo e stop: pior caso (STOP, ambiguo)
{
    const cs = plano(3); cs[1] = c(1, 1.1, 1.1020, 1.0980, 1.1);
    const r = simularSemSL({ ...base, slPips: 10, candles: cs });
    assert.strictEqual(r.resultado, "STOP"); assert.strictEqual(r.ambiguo, true);
}
// 6) venda e inversão (controle)
{
    const cs = plano(3); cs[1] = c(1, 1.1, 1.1, 1.0987, 1.0988);   // -13 pips: bate o alvo da VENDA (tp+spread = 12)
    const venda = simularSemSL({ ...base, direcao: "SELL", candles: cs });
    assert.strictEqual(venda.resultado, "WIN");
    const inv = simularSemSL({ ...base, direcao: "BUY", inverter: true, candles: cs });
    assert.strictEqual(inv.resultado, "WIN");              // comprar invertido = vender
}
// 7) entradas inválidas
assert.strictEqual(simularSemSL({ ...base, tpPips: 0, candles: plano(2) }).resultado, "INVALIDA");
assert.strictEqual(simularSemSL({ ...base, slPips: 1, candles: plano(2) }).resultado, "INVALIDA");   // stop <= spread
assert.strictEqual(simularSemSL({ ...base, candles: [] }).resultado, "ABERTA");

// 8) noites: terça 20:00 -> quarta 22:00 UTC cruza terça 21:00 (1) e quarta 21:00 (3, tríplice) = 4
assert.strictEqual(noitesCobradas(Date.UTC(2026, 9, 13, 20), Date.UTC(2026, 9, 14, 22)), 4);
assert.strictEqual(noitesCobradas(Date.UTC(2026, 9, 13, 10), Date.UTC(2026, 9, 13, 20)), 0);
assert.strictEqual(noitesCobradas(Date.UTC(2026, 9, 15, 20), Date.UTC(2026, 9, 16, 22)), 2);   // quinta 20h -> sexta 22h cruza quinta 21h e sexta 21h
// 9) swap: EUR 2% e USD 4%; compra EUR/USD paga (-2 - 1 markup) = -3% a.a.; venda recebe (+2 - 1) = +1% a.a.
{
    const taxas = { EUR: { ts: [0], v: [2] }, USD: { ts: [0], v: [4] } };
    const t0 = Date.UTC(2026, 9, 13, 20), t1 = Date.UTC(2026, 9, 13, 22);
    const compra = swapPips({ par: "EUR/USD", direcao: "BUY", preco: 1.1, t0, t1, taxas, markupPp: 1 });
    const venda = swapPips({ par: "EUR/USD", direcao: "SELL", preco: 1.1, t0, t1, taxas, markupPp: 1 });
    assert.ok(Math.abs(compra - (-0.9)) < 0.06, `compra ${compra}`);
    assert.ok(Math.abs(venda - 0.3) < 0.06, `venda ${venda}`);
    assert.strictEqual(swapPips({ par: "EUR/USD", direcao: "BUY", preco: 1.1, t0, t1: t0 + 3600000, taxas, markupPp: 1 }), 0);   // sem cruzar a virada
    const semTaxas = swapPips({ par: "EUR/USD", direcao: "SELL", preco: 1.1, t0, t1, taxas: null, markupPp: 1 });
    assert.ok(semTaxas < 0, "sem taxas só o markup: erra contra");
}
// 10) estatística agrupada por dia: dois dias, valores iguais dentro do dia
{
    const cl = clusterMedia([{ dia: "a", v: 1 }, { dia: "a", v: 1 }, { dia: "b", v: 3 }, { dia: "b", v: 3 }]);
    assert.strictEqual(cl.n, 4); assert.strictEqual(cl.media, 2); assert.strictEqual(cl.dias, 2);
    // ep agrupado = sqrt(G/(G-1) * soma_dias(soma(v-media))^2) / n = sqrt(2 * (4+4)) / 4 = 1
    assert.strictEqual(cl.ep, 1); assert.strictEqual(cl.t, 2);
    // o ingênuo (trata cada operação como independente) daria um ep bem menor: o agrupado NÃO pode ser menor que ele
    const ing = Math.sqrt(((1 - 2) ** 2 * 2 + (3 - 2) ** 2 * 2) / 3) / Math.sqrt(4);
    assert.ok(cl.ep > ing * 0.99, "agrupado >= ingênuo");
    assert.strictEqual(clusterMedia([{ dia: "a", v: 1 }]).ep, null);
}
// 11) regime do dólar: EUR/USD caindo e USD/JPY subindo = dólar em ALTA no mês
{
    const mk = (o, ct) => [{ ts: Date.UTC(2026, 0, 5), o, c: o, h: o, l: o }, { ts: Date.UTC(2026, 0, 20), o: ct, c: ct, h: ct, l: ct }];
    const r = regimesDolar({ "EUR/USD": mk(1.1, 1.08), "USD/JPY": mk(150, 153) });
    assert.strictEqual(r["2026-01"], "alta");
    const r2 = regimesDolar({ "EUR/USD": mk(1.1, 1.13), "USD/JPY": mk(150, 146) });
    assert.strictEqual(r2["2026-01"], "baixa");
}
// 12) resumo: acerto, perda média, MAE e comparação com controle (mesmo id)
{
    const mk = (id, pips, res, mae, ctrl = false) => ({ id, dia: id.slice(0, 1), pips, pipsE: pips - 0.1, res, mae, dur: 60, ctrl, reg: "alta" });
    const reais = [mk("a1", 10, "WIN", 3), mk("a2", 10, "WIN", 50), mk("b1", -40, "TEMPO", 90), mk("b2", 10, "WIN", 5)];
    const ctrls = [mk("a1", -10, "STOP", 12, true), mk("a2", 10, "WIN", 4, true), mk("b1", -10, "STOP", 10, true), mk("b2", -10, "STOP", 11, true)];
    const r = resumir(reais);
    assert.strictEqual(r.n, 4); assert.strictEqual(r.acerto, 75); assert.strictEqual(r.perdaMedia, -40); assert.strictEqual(r.piorPerda, -40);
    assert.strictEqual(r.mae.max, 90); assert.strictEqual(r.pctTempo, 25);
    const d = diferencaContraControle(reais, ctrls);
    assert.strictEqual(d.n, 4);
    assert.strictEqual(d.media, Number(((20 + 0 + (-30) + 20) / 4).toFixed(3)));
}
console.log("TODOS OS TESTES DO TP SEM SL PASSARAM");
