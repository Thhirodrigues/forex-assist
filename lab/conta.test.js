// Testes da conta simulada e das políticas de margem (6.31, Fase B).
const assert = require("assert");
const { valorPipUSD, nocionalUSD, construirPrecos, simularConta, janelasMoveis, POLITICAS } = require("./conta");

const T0 = Date.UTC(2026, 9, 13, 10, 0);
const passo = 300000;
const serie = (par, n, f) => Array.from({ length: n }, (_, i) => { const p = f(i); return { ts: T0 + i * passo, o: p, h: p, l: p, c: p }; });
const trade = (id, par, t, extra = {}) => ({ id, par, direcao: "BUY", t, precoEntrada: 1.1, spreadPips: 0, resultado: "ABERTA", pips: 0, swapPips: 0, tFechamento: undefined, ...extra });

// valor do pip e nocional
assert.ok(Math.abs(valorPipUSD("EUR/USD", 2000, {}) - 0.2) < 1e-9);
assert.ok(Math.abs(valorPipUSD("USD/JPY", 2000, { "USD/JPY": 150 }) - 2000 * 0.01 / 150) < 1e-9);
assert.ok(Math.abs(valorPipUSD("EUR/GBP", 2000, { "GBP/USD": 1.3 }) - 0.26) < 1e-9);
assert.ok(Math.abs(valorPipUSD("GBP/JPY", 2000, { "USD/JPY": 150 }) - 2000 * 0.01 / 150) < 1e-9);
assert.strictEqual(nocionalUSD("USD/CAD", 2000, {}), 2000);
assert.ok(Math.abs(nocionalUSD("EUR/USD", 2000, { "EUR/USD": 1.1 }) - 2200) < 1e-9);

const precos = (f) => construirPrecos({ "EUR/USD": serie("EUR/USD", 200, f) });
const FIM = T0 + 200 * passo;

// 1) trade que fecha no TP (25 pips líquidos = US$5 a 0,2/pip): saldo 105, nenhum stop-out
{
    const tr = [trade("a", "EUR/USD", T0, { resultado: "WIN", pips: 25, tFechamento: T0 + 10 * passo })];
    const r = simularConta({ trades: tr, precos: precos(() => 1.1), ini: T0, fim: FIM, conta0: 100 });
    assert.ok(Math.abs(r.saldoFinal - 105) < 0.01, `saldo ${r.saldoFinal}`);
    assert.strictEqual(r.stopOuts, 0); assert.strictEqual(r.aceitas, 1); assert.strictEqual(r.ganhos, 1);
}
// 2) swap entra no fechamento
{
    const tr = [trade("a", "EUR/USD", T0, { resultado: "WIN", pips: 25, swapPips: -5, tFechamento: T0 + 10 * passo })];
    const r = simularConta({ trades: tr, precos: precos(() => 1.1), ini: T0, fim: FIM, conta0: 100 });
    assert.ok(Math.abs(r.saldoFinal - 104) < 0.01, `saldo ${r.saldoFinal}`);
}
// 3) políticas: 1 por par, máximo de 4, nível de margem
{
    const tr = [trade("a", "EUR/USD", T0), trade("b", "EUR/USD", T0 + passo), trade("c", "EUR/USD", T0 + 2 * passo)];
    const r0 = simularConta({ trades: tr, precos: precos(() => 1.1), ini: T0, fim: FIM, conta0: 100, politica: POLITICAS.P0 });
    assert.strictEqual(r0.aceitas, 3);
    const r1 = simularConta({ trades: tr, precos: precos(() => 1.1), ini: T0, fim: FIM, conta0: 100, politica: POLITICAS.P1 });
    assert.strictEqual(r1.aceitas, 1); assert.strictEqual(r1.rejeitadas, 2);
    const cinco = Array.from({ length: 5 }, (_, i) => trade("t" + i, "EUR/USD", T0 + i * passo));
    const r2 = simularConta({ trades: cinco, precos: precos(() => 1.1), ini: T0, fim: FIM, conta0: 100, politica: POLITICAS.P2 });
    assert.strictEqual(r2.aceitas, 4); assert.strictEqual(r2.rejeitadas, 1);
    // margem por posição = 2000 x 1,1 / 1000 = 2,2; conta de 10: 1 posição = 454%, 2 = 227% (< 300 -> rejeita a 2ª)
    const r3 = simularConta({ trades: tr, precos: precos(() => 1.1), ini: T0, fim: FIM, conta0: 10, politica: POLITICAS.P3 });
    assert.strictEqual(r3.aceitas, 1);
}
// 4) stop-out: conta de 10, queda de 100 pips (-US$20 flutuante) -> liquida a posição (nível < 50%)
{
    const tr = [trade("a", "EUR/USD", T0)];
    const p = precos((i) => (i < 20 ? 1.1 : 1.09));
    const r = simularConta({ trades: tr, precos: p, ini: T0, fim: FIM, conta0: 10 });
    assert.strictEqual(r.stopOuts, 1);
    assert.ok(r.saldoFinal < 0 || r.saldoFinal < 1, `saldo após stop-out ${r.saldoFinal}`);
    assert.strictEqual(r.abertasNoFim, 0);
    assert.ok(r.nivelMin !== null);
}
// 5) conta grande aguenta a mesma queda: sem stop-out, posição marcada a mercado no patrimônio final
{
    const tr = [trade("a", "EUR/USD", T0)];
    const p = precos((i) => (i < 20 ? 1.1 : 1.09));
    const r = simularConta({ trades: tr, precos: p, ini: T0, fim: FIM, conta0: 100 });
    assert.strictEqual(r.stopOuts, 0); assert.strictEqual(r.abertasNoFim, 1);
    assert.ok(Math.abs(r.equityFinal - 80) < 0.01, `equity ${r.equityFinal}`);   // 100 - 100 pips x 0,2
    assert.ok(Math.abs(r.equityMin - 80) < 0.01);
}
// 6) entradas fora da janela são ignoradas; janelas móveis geram uma conta nova por janela
{
    const tr = [trade("a", "EUR/USD", T0 + 5 * passo, { resultado: "WIN", pips: 25, tFechamento: T0 + 8 * passo })];
    const r = simularConta({ trades: tr, precos: precos(() => 1.1), ini: T0 + 100 * passo, fim: FIM, conta0: 100 });
    assert.strictEqual(r.aceitas, 0);
    const dia = 86400000;
    const longa = construirPrecos({ "EUR/USD": Array.from({ length: 12 * 288 }, (_, i) => ({ ts: T0 + i * passo, o: 1.1, h: 1.1, l: 1.1, c: 1.1 })) });
    const jan = janelasMoveis({ trades: [], precos: longa, ini: T0, fim: T0 + 12 * dia, diasJanela: 5, passoDias: 2, conta0: 100 });
    assert.strictEqual(jan.length, 4);   // inícios 0, 2, 4, 6 (6+5 = 11 <= 12)
}
// 7) conta zerada: depois do stop-out que leva o saldo a <= 0 a simulação PARA (não continua com saldo negativo)
{
    const tr = [trade("a", "EUR/USD", T0), trade("b", "EUR/USD", T0 + 100 * passo)];
    const p = precos((i) => (i < 20 ? 1.1 : 1.0));   // -1000 pips: zera qualquer conta pequena
    const r = simularConta({ trades: tr, precos: p, ini: T0, fim: FIM, conta0: 10 });
    assert.ok(r.quebrouEm !== null && r.quebrouEm > T0, "marca quando quebrou");
    assert.strictEqual(r.aceitas, 1, "a segunda entrada nem foi processada");
}
console.log("TODOS OS TESTES DA CONTA SIMULADA PASSARAM");
