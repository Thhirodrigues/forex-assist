const assert = require("assert");
const { julgarM1, primeiraDepois, noites, avaliarBraco, icDias } = require("./fase0-m1");
const M = 60000, T0 = Date.UTC(2026, 9, 6, 12);
// barras BID de EUR/USD (5 dígitos), spread 20 pontos = 2 pips
const bar = (i, o, h, l, c, sp = 20) => ({ ms: T0 + i * M, o, h, l, c, sp, dig: 5 });
// compra: entra no ask 1.10000+0.00020=1.10020; TP 10 pips = 1.10120 (bid); SL 10 = 1.09920
let b = [bar(0, 1.1, 1.1001, 1.0999, 1.1), bar(1, 1.1, 1.1013, 1.0995, 1.1012)];
let r = julgarM1(b, { t: T0 - 20000, compra: true, tp: 10, sl: 10 });
assert.strictEqual(r.estado, "WIN"); assert.strictEqual(r.entradaMs, T0);
// a primeira vela é a que abre no instante do sinal OU depois: sinal 30 s dentro da vela 0 -> entra na vela 1
r = julgarM1(b, { t: T0 + 30000, compra: true, tp: 10, sl: 10 }); assert.strictEqual(r.entradaMs, T0 + M);
// venda: entra no bid 1.10000; TP 10 => ask <= 1.09900 => low_bid + 0.0002 <= 1.099 => low <= 1.0988
b = [bar(0, 1.1, 1.1001, 1.0989, 1.0995)];
assert.strictEqual(julgarM1(b, { t: T0, compra: false, tp: 10, sl: 10 }).estado, "ABERTA");     // 1.0989+0.0002 > 1.099
b = [bar(0, 1.1, 1.1001, 1.0987, 1.0995)];
assert.strictEqual(julgarM1(b, { t: T0, compra: false, tp: 10, sl: 10 }).estado, "WIN");
// sem spread a mesma venda já ganha com low 1.0989
b = [bar(0, 1.1, 1.1001, 1.0989, 1.0995)];
assert.strictEqual(julgarM1(b, { t: T0, compra: false, tp: 10, sl: 10, comSpread: false }).estado, "WIN");
// vela que toca os dois = LOSS ambíguo
b = [bar(0, 1.1, 1.1020, 1.0980, 1.1)];
r = julgarM1(b, { t: T0, compra: true, tp: 10, sl: 10 }); assert.ok(r.estado === "LOSS" && r.ambiguo && r.pnl === -10);
// lacuna > 10 min = SEM_DADOS
assert.strictEqual(primeiraDepois([bar(20, 1, 1, 1, 1)], T0), -1);
// JPY (3 dígitos): pip 0.01
const bj = [{ ms: T0, o: 150, h: 150.2, l: 149.95, c: 150.1, sp: 20, dig: 3 }];
// entrada no ask 150.02; TP 10 pips = 150.12 <= high 150.2; SL 149.92 < low 149.95 (não toca) -> WIN
assert.strictEqual(julgarM1(bj, { t: T0, compra: true, tp: 10, sl: 10 }).estado, "WIN");
// noites: quarta conta 3; entrada terça 12Z, saída quinta 12Z (horário de verão dos EUA até 01/11: rollover 21Z)
const ter = Date.UTC(2026, 9, 6, 12), qui = Date.UTC(2026, 9, 8, 12);
assert.strictEqual(noites(ter, qui), 1 + 3);
// inverno (depois de 01/11): rollover 22Z; entrada seg 21:30Z, saída seg 23Z -> 1 noite
assert.strictEqual(noites(Date.UTC(2026, 10, 9, 21, 30), Date.UTC(2026, 10, 9, 23)), 1);
assert.strictEqual(noites(Date.UTC(2026, 10, 9, 22, 30), Date.UTC(2026, 10, 9, 23)), 0);
// avaliarBraco: 300 operações em 30 dias, real sempre +5, aleatório 0 -> PASSOU
const ops = [];
for (let d = 0; d < 30; d++) for (let k = 0; k < 10; k++) {
    const t = T0 + d * 86400e3 + k * 3600e3, dia = new Date(t - 3 * 3600e3).toISOString().slice(0, 10);
    const w = (k + d) % 3 !== 0;            // dias com 6 ou 7 vitórias em 10: variância entre dias > 0
    ops.push({ dia, real: { estado: w ? "WIN" : "LOSS", pnl: w ? 15 : -5, entradaMs: t, fimMs: t + 3600e3 }, compra: { estado: "WIN", pnl: 10 }, venda: { estado: "LOSS", pnl: -10 } });
}
const a = avaliarBraco(ops, "teste", { nivel: 0.975 });
assert.ok(a.liquidoPipsPorOp.media > 5 && a.t >= 2, JSON.stringify(a.liquidoPipsPorOp) + ' t=' + a.t); assert.strictEqual(a.veredito, "PASSOU");
// poucos sinais -> INCONCLUSIVO
assert.strictEqual(avaliarBraco(ops.slice(0, 100), "x").veredito, "INCONCLUSIVO");
// negativo -> REPROVADO
const neg = ops.map(o => ({ ...o, real: { ...o.real, pnl: o.real.pnl - 10 } }));
assert.strictEqual(avaliarBraco(neg, "x").veredito, "REPROVADO");
console.log("fase0-m1.test.js: OK");
