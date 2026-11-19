const assert = require("assert");
const { t3, tercos, t5, veredito } = require("./rodada2");
const D = 86400e3, T0 = Date.UTC(2026, 9, 5, 12);       // segunda 05/10 (BRT)
const dia = (ms) => new Date(ms - 3 * 3600e3).toISOString().slice(0, 10);
// veredito bilateral
assert.strictEqual(veredito({ ic: [-5, -1], diferenca: -3, diferencaSemSemana0911: -2 }).passa, true);
assert.strictEqual(veredito({ ic: [-5, 1], diferenca: -3, diferencaSemSemana0911: -2 }).passa, false);
assert.strictEqual(veredito({ ic: [1, 5], diferenca: 3, diferencaSemSemana0911: -2 }).passa, false);
// T3: 5 pares; P1-P3 sempre ganham, P4-P5 sempre perdem => A ganha, B perde
const pares = ["P1", "P2", "P3", "P4", "P5"], tr = [];
for (let w = 0; w < 4; w++) for (let d = 0; d < 5; d++) for (let k = 0; k < 3; k++) pares.forEach((p, i) => {
    const t = T0 + w * 7 * D + d * D + k * 3 * 3600e3 + i * 60e3;
    tr.push({ t, ts: t, fim: t + 3600e3, pnl: i < 3 ? 10 : -10, win: i < 3, par: p, dia: dia(t) });
});
const r3 = t3(tr);
assert.ok(r3.elegiveis > 0 && r3.A.pipsPorOp === 10 && r3.B.pipsPorOp === -10, JSON.stringify(r3).slice(0, 200));
// sem informação ex ante: os 2 primeiros sinais da semana não podem ser classificados
assert.ok(r3.elegiveis < tr.length);
// terços
const tt = tercos(tr.map((x, i) => ({ ...x, v: i })), x => x.v, "teste");
assert.strictEqual(tt.n, tr.length);
// T5: semana boa e semana ruim separadas => efeito de semana; sem diferença => não
const tw = []; for (let w = 0; w < 4; w++) for (let d = 0; d < 5; d++) for (let k = 0; k < 6; k++) { const t = T0 + w * 7 * D + d * D + k * 3600e3; tw.push({ t, ts: t, pnl: (w % 2 ? 5 : -5) + (k % 2 ? 1 : -1), dia: dia(t) }); }
assert.strictEqual(t5(tw, { P: 2000 }).efeitoDeSemana, true);
const tn = tw.map((x, i) => ({ ...x, pnl: (i % 2 ? 5 : -5) }));
assert.strictEqual(t5(tn, { P: 2000 }).efeitoDeSemana, false);
console.log("rodada2.test.js: OK");
