const assert = require("assert");
const m = require("./materias");
const MIN = 60000, T0 = Date.UTC(2026, 10, 25, 6, 0);                       // 25/11/2026 06:00Z (03:00 BRT), quarta
const bar = (i, c, extra = {}) => ({ ms: T0 + i * MIN, o: c, h: c + 0.02, l: c - 0.02, c, sp: 10, dig: 2, ...extra });
function serie(trend, passo = 0.05, ult = null) {
    const b = []; let c = 1000;
    for (let i = 0; i < 1500; i++) b.push(bar(i, c));                          // plano, fecha sempre igual
    for (let i = 0; i < trend; i++) { c += passo; b.push(bar(1500 + i, c)); }
    if (ult) for (const f of ult) { c = f(c); b.push(bar(b.length, c)); }
    return b;
}
// plano: nenhum candidato
assert.strictEqual(m.candidatos(serie(0)).length, 0);
// tendência limpa: candidato de COMPRA, entrada na vela seguinte
let b = serie(400); let cs = m.candidatos(b);
assert.ok(cs.length >= 1 && cs[0].compra && cs[0].j === cs[0].i + 1, JSON.stringify(cs.slice(0, 2)));
assert.ok(cs.every((c, k) => k === 0 || (c.ms - cs[k - 1].ms) >= 30 * MIN), "no máximo 1 candidato a cada 30 min");
// causalidade: o sinal na vela i é o mesmo se o futuro for cortado
const i0 = cs[0].i; assert.strictEqual(m.sinalEm(b.slice(0, i0 + 1), i0), m.sinalEm(b, i0));
// julgamento: tendência sobe 0,05 por vela, compra com T = 2 US$
const j = cs[0].j;
const p1 = m.julgar(b, j, true, 2, 1, "P1"); assert.strictEqual(p1.motivo, "ALVO"); assert.strictEqual(p1.pnl, 2);
const p2 = m.julgar(b, j, true, 2, 1, "P2"); assert.strictEqual(p2.motivo, "80"); assert.ok(Math.abs(p2.pnl - 1.6) < 1e-9);
const p3 = m.julgar(b, j, true, 2, 1, "P3"); assert.strictEqual(p3.motivo, "ALVO2"); assert.strictEqual(p3.pnl, 4);       // tendência segue: estende para 2T
const venda = m.julgar(b, j, false, 2, 1, "P1"); assert.strictEqual(venda.motivo, "STOP"); assert.strictEqual(venda.pnl, -2);   // lado oposto perde o stop
// subiu até 80% e virou: P1 perde (stop), P2 garante 0,8 T, P3 sem tendência encerra em 80%
const rev = serie(400); const base = rev[rev.length - 1].c;
const b2 = serie(0); { let c = 1000; for (let i = 0; i < 60; i++) { c += 0.1; b2.push(bar(b2.length, c)); } for (let i = 0; i < 40; i++) { c -= 0.15; b2.push(bar(b2.length, c)); } }
const cr = m.candidatos(b2); assert.ok(cr.length >= 1);
const r1 = m.julgar(b2, cr[0].j, true, 2, 1, "P1"), r2 = m.julgar(b2, cr[0].j, true, 2, 1, "P2");
assert.ok(r1.pnl < 0 || r1.motivo === "ALVO", JSON.stringify(r1)); assert.ok(r2.pnl >= 0 || r2.motivo === "STOP", JSON.stringify(r2));
// mesma vela toca alvo e stop = stop
const b3 = serie(0); const eb = b3.length; b3.push(bar(eb, 1000, { h: 1005, l: 995 })); b3.push(bar(eb + 1, 1000, { h: 1005, l: 995 }));
assert.strictEqual(m.julgar(b3, eb, true, 2, 1, "P1").motivo, "STOP");
// swap: quarta -> quinta cobra triplo; terça -> quarta cobra 1; sábado não cobra
const sw = { compra: -69.5, venda: 15.07, triplo: 3, offsetSeg: 7200 };
const sb = (ms) => ({ ms, o: 0, h: 0, l: 0, c: 0, sp: 10, dig: 2 });
const wedThu = m.swapUsd([sb(Date.UTC(2026, 10, 25, 21)), sb(Date.UTC(2026, 10, 25, 23))], 0, 1, true, sw);
assert.ok(Math.abs(wedThu - (-69.5 * 0.01 * 3)) < 1e-9, "triplo " + wedThu);
const tueWed = m.swapUsd([sb(Date.UTC(2026, 10, 24, 21)), sb(Date.UTC(2026, 10, 24, 23))], 0, 1, true, sw);
assert.ok(Math.abs(tueWed - (-69.5 * 0.01)) < 1e-9, "uma noite " + tueWed);
assert.ok(Math.abs(m.swapUsd([sb(Date.UTC(2026, 10, 25, 10)), sb(Date.UTC(2026, 10, 25, 12))], 0, 1, true, sw)) < 1e-12, "sem meia-noite: sem swap");
// veredito
const { icDias } = require("./fase0-m1");
const mk = (n, real, oposta) => Array.from({ length: n }, (_, k) => ({ ativo: "GOLD", pol: "P1", k: 1, T: 3, prim: true, ms: Date.UTC(2026, 10, 25 + (k % 30)) + k, dia: "d" + (k % 30), real: real + (k % 2 ? 0.1 : -0.1), oposta }));
assert.strictEqual(m.julgarPrimaria(mk(400, 1, -1), "GOLD", icDias).veredito, "APROVADA");
assert.strictEqual(m.julgarPrimaria(mk(400, -1, 1), "GOLD", icDias).veredito, "REPROVADA");
assert.ok(!m.julgarPrimaria(mk(100, 1, -1), "GOLD", icDias).c1, "menos de 300 reprova");
// US100Cash: alvos = múltiplos do spread mediano das primeiras 1.440 velas (índice em pontos: spread 1,5 pontos -> 12 / 22,5(arred. 22,5) / 45)
const idx = Array.from({ length: 2000 }, (_, i) => ({ ms: T0 + i * MIN, o: 20000, h: 20001, l: 19999, c: 20000, sp: i < 1440 ? 150 : 900, dig: 2 }));
const al = m.alvosDoAtivo("US100Cash", idx);
assert.deepStrictEqual(al.alvos, [12, 22.5, 45]); assert.strictEqual(al.primario, 22.5);          // só as primeiras 1.440 velas contam (spread 1,5)
assert.deepStrictEqual(m.alvosDoAtivo("GOLD", idx).alvos, [2, 3, 5]);
assert.ok(m.operacoes(idx, null, "US100Cash").every(o => o.prim === (o.T === 22.5)));
// o nível do veredito é Bonferroni para 3 ativos
assert.ok(Object.keys(m.ATIVOS).length === 3);
console.log("materias.test.js: OK");
