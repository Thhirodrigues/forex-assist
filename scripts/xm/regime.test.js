const assert = require("assert");
const { antes, diferenca, quantil } = require("./regime");
const H = 3600e3;
// níveis: 30 horas subindo 0,1 por hora (tendência limpa)
const niveis = Array.from({ length: 30 }, (_, i) => ({ h: 1000 + i, lvl: i * 0.1 }));
// no instante do fim da hora 1000+29 (=(1030)*H) os 30 níveis estão fechados; usa os 24 últimos
const a = antes(niveis, 1030 * H, 24);
assert.ok(Math.abs(a.deriva - 2.3) < 1e-9 && Math.abs(a.er - 1) < 1e-9, JSON.stringify(a));
// no meio da hora 1029 o nível 1029 AINDA não fechou: o último usado é 1028
const b = antes(niveis, 1029 * H + 1800e3, 24);
assert.ok(Math.abs(b.deriva - 2.3) < 1e-9 && b !== null);
assert.ok(Math.abs(antes(niveis, 1029 * H + 1800e3, 24).deriva - (2.8 - 0.5)) < 1e-9);
assert.strictEqual(antes(niveis, 1010 * H, 24), null);           // menos de 24 horas antes
// vai e volta: ER perto de 0
const zz = Array.from({ length: 30 }, (_, i) => ({ h: 2000 + i, lvl: (i % 2) * 0.2 }));
assert.ok(antes(zz, 2030 * H, 24).er < 0.05);
// diferença: A ganha 10, B perde 10 em todos os dias => dif 20 e IC estreito acima de 0
const t0 = Date.UTC(2026, 9, 6, 12), tr = [];
for (let d = 0; d < 20; d++) for (const g of ["A", "B"]) tr.push({ g, pnl: g === "A" ? 10 : -10, win: g === "A", dia: "d" + d, ts: t0 + d * 86400e3 });
const r = diferenca(tr, x => x.g, { B: 500 });
assert.strictEqual(r.diferenca, 20); assert.ok(r.ic[0] === 20 && r.passa);
assert.strictEqual(quantil([1, 2, 3, 4], 0.5), 2.5);
console.log("regime.test.js: OK");
