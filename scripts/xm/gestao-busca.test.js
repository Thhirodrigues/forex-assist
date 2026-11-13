const assert = require("assert");
const { GRADE, nomeRegra, aplicar, buscar, spearman } = require("./gestao-busca");

assert.strictEqual(GRADE.length, 72);
assert.strictEqual(nomeRegra({ mult: 1, semRollover: false, semParesCaros: false, capDia: Infinity, capLado: Infinity }), "SLx1");
assert.ok(nomeRegra({ mult: 3, semRollover: true, semParesCaros: true, capDia: 3, capLado: 2 }).includes("max3/dia"));
// correlação de postos
assert.strictEqual(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
assert.strictEqual(spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1);

const H = 3600e3, d0 = Date.parse("2026-10-14T13:00:00Z");   // quarta, 10h de Brasília
const tr = (i, over = {}) => ({ t: d0 + i * H, fim: d0 + i * H + 30 * 60e3, win: i % 2 === 0, pnl: i % 2 === 0 ? 25 : -25, tp: 25, sl: 25, dia: "2026-10-14", par: "EUR/USD", direcao: "BUY", ts: d0 + i * H, ...over });
const lista = [0, 1, 2, 3, 4].map(i => tr(i));
const base = { mult: 1, semRollover: false, semParesCaros: false, capDia: Infinity, capLado: Infinity };
assert.strictEqual(aplicar(lista, base).length, 5);
assert.strictEqual(aplicar(lista, { ...base, capDia: 3 }).length, 3, "teto de 3 por dia");
// pares caros fora
assert.strictEqual(aplicar([tr(0, { par: "EUR/GBP" }), tr(1)], { ...base, semParesCaros: true }).length, 1);
// rollover (17h-19h de Brasília = 20h-22h UTC) fora
assert.strictEqual(aplicar([tr(0, { t: Date.parse("2026-10-14T21:00:00Z") }), tr(1)], { ...base, semRollover: true }).length, 1);
// teto por lado do dólar: 3 compras de EUR/USD (dólar vendido) abertas ao mesmo tempo; teto 2 deixa passar 2. Cruzados não contam.
const abertas = [0, 1, 2].map(i => tr(i, { t: d0 + i * 60e3, fim: d0 + 5 * H }));
assert.strictEqual(aplicar(abertas, { ...base, capLado: 2 }).length, 2);
assert.strictEqual(aplicar([0, 1, 2].map(i => tr(i, { t: d0 + i * 60e3, fim: d0 + 5 * H, par: "EUR/JPY" })), { ...base, capLado: 2 }).length, 3);
// só usa o que é conhecido na abertura: o teto de lado ignora posições que já fecharam
assert.strictEqual(aplicar([tr(0, { fim: d0 + 60e3 }), tr(1), tr(2)], { ...base, capLado: 1 }).length, 3);

// busca: 40 dias sintéticos, 6 operações por dia, resultado alternado: o ranking não deve ter "habilidade" estável
const trades = { 1: [], 2: [], 3: [] };
let k = 0;
for (let d = 0; d < 40; d++) for (let i = 0; i < 6; i++) {
    const t = Date.parse("2026-10-05T10:00:00Z") + d * 86400e3 + i * H, win = ((k * 7919) % 13) < 6; k++;
    for (const m of [1, 2, 3]) trades[m].push({ t, fim: t + 2 * H, win, pnl: win ? 25 : -25 * m, tp: 25, sl: 25 * m, dia: new Date(t - 3 * H).toISOString().slice(0, 10), ts: t, par: ["EUR/USD", "GBP/USD", "EUR/GBP"][i % 3], direcao: i % 2 ? "BUY" : "SELL" });
}
const b = buscar(trades);
assert.strictEqual(b.combinacoes, 72); assert.ok(b.validas > 10);
assert.strictEqual(b.diasTreino, 20); assert.strictEqual(b.diasTeste, 20);
assert.ok(b.base.treino.n > 0 && b.base.teste.n > 0);
assert.ok(b.melhoresDoTreino.length === 5 && b.persistencia.spearmanTreinoTeste !== null);
assert.ok(b.melhoresDoTreino[0].treino.pipsPorOp >= b.melhoresDoTreino[4].treino.pipsPorOp, "ordenado pelo treino");
console.log("TODOS OS TESTES DA BUSCA DE GESTÃO PASSARAM");
