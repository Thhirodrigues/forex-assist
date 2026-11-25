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
const mk = (n, real, oposta) => Array.from({ length: n }, (_, k) => ({ ativo: "GOLD", pol: "P1", k: 1, T: 3, adapt: true, r: real + (k % 2 ? 0.1 : -0.1), rOposta: oposta, ms: Date.UTC(2026, 10, 25 + (k % 30)) + k, dia: "d" + (k % 30), real: real + (k % 2 ? 0.1 : -0.1), oposta }));
assert.strictEqual(m.julgarPrimaria(mk(400, 1, -1), "GOLD", icDias).veredito, "APROVADA");
assert.strictEqual(m.julgarPrimaria(mk(400, -1, 1), "GOLD", icDias).veredito, "REPROVADA");
assert.ok(!m.julgarPrimaria(mk(100, 1, -1), "GOLD", icDias).c1, "menos de 300 reprova");
// US100Cash: alvos = múltiplos do spread mediano das primeiras 1.440 velas (índice em pontos: spread 1,5 pontos -> 12 / 22,5(arred. 22,5) / 45)
const idx = Array.from({ length: 2000 }, (_, i) => ({ ms: T0 + i * MIN, o: 20000, h: 20001, l: 19999, c: 20000, sp: i < 1440 ? 150 : 900, dig: 2 }));
const al = m.alvosDoAtivo("US100Cash", idx);
assert.deepStrictEqual(al.alvos, [12, 22.5, 45]); assert.strictEqual(al.primario, 22.5);          // só as primeiras 1.440 velas contam (spread 1,5)
assert.deepStrictEqual(m.alvosDoAtivo("GOLD", idx).alvos, [2, 3, 5]);
assert.ok(m.operacoes(idx, null, "US100Cash").every(o => !o.prim || o.adapt), "só o braço adaptativo é primário");
// o nível do veredito é Bonferroni para 3 ativos
assert.ok(Object.keys(m.ATIVOS).length === 3);
// ---- EMENDA 6.78: decisão única, dimensionamento por mercado e lote por risco ----
// candidatos() é exatamente o laço de candidatoEm() (paridade offline x ao vivo)
{
    const longa = serie(400); const viaLaco = []; let ult = -Infinity;
    for (let i = m.PARAMS.HIST_SPREAD; i < longa.length - 1; i++) { const c = m.candidatoEm(longa, i, ult); if (!c || longa[i + 1].ms - longa[i].ms !== 60000) continue; viaLaco.push({ i, j: i + 1, compra: c.compra, ms: longa[i + 1].ms }); ult = longa[i].ms; }
    assert.deepStrictEqual(m.candidatos(longa), viaLaco); assert.ok(viaLaco.length >= 1);
}
// dimensionamento: mercado calmo (amplitude de 15 min pequena) -> T = 8 x spread; mercado agitado -> T = 0,5 x amplitude de 15 min
{
    const calmo = Array.from({ length: 1500 }, (_, i) => ({ ms: T0 + i * MIN, o: 1000, h: 1000.05, l: 999.95, c: 1000, sp: 20, dig: 2 }));     // amplitude 0,10 ; spread 0,20
    const d1 = m.dimensionar(calmo, 1499); assert.ok(d1 && Math.abs(d1.T - 1.6) < 1e-9 && d1.S === d1.T, JSON.stringify(d1));                    // 8 x 0,20
    const agitado = Array.from({ length: 1500 }, (_, i) => ({ ms: T0 + i * MIN, o: 1000, h: 1000 + 2, l: 1000 - 2, c: 1000, sp: 20, dig: 2 }));    // amplitude 4,00
    const d2 = m.dimensionar(agitado, 1499); assert.ok(Math.abs(d2.T - 2.0) < 1e-9, JSON.stringify(d2));                                          // 0,5 x 4,00
    assert.strictEqual(m.dimensionar(calmo, 100), null, "sem histórico suficiente não dimensiona");
}
// lote pelo risco de US$ 1 (emenda 6.78-B; teto de US$ 7,50 inalterado)
{
    assert.strictEqual(m.ADAPT.RISCO_USD, 1); assert.strictEqual(m.ADAPT.RISCO_MAX_USD, 7.5);
    const g = m.lotePorRisco(3.9, "GOLD"); assert.deepStrictEqual([g.lote, g.riscoUsd], [0.01, 3.9]);       // 1/(3,9x100) = 0,0026 -> piso no mínimo 0,01
    assert.strictEqual(m.lotePorRisco(7.6, "GOLD"), null);                                                // mínimo já passa de US$ 7,50
    const o = m.lotePorRisco(0.4, "OILCash"); assert.deepStrictEqual([o.lote, o.riscoUsd], [0.02, 0.8]);     // 1/(0,4x100) = 0,025 -> 0,02 (nunca para cima)
    const o2 = m.lotePorRisco(0.5, "OILCash"); assert.deepStrictEqual([o2.lote, o2.riscoUsd], [0.02, 1]);    // 1/(0,5x100) = 0,02
    const u = m.lotePorRisco(22.5, "US100Cash"); assert.deepStrictEqual([u.lote, u.riscoUsd], [0.1, 2.25]);  // 1/22,5 = 0,044 -> piso no mínimo 0,10
    assert.ok(m.lotePorRisco(0.05, "OILCash").riscoUsd <= 1, "stop pequeno: lote maior, risco continua <= US$ 1");
    // ouro com passo real 0,001: nunca arredonda para cima
    const g2 = m.lotePorRisco(3.2, "GOLD"); assert.deepStrictEqual([g2.lote, g2.riscoUsd], [0.01, 3.2]);
    // US100 com lote mínimo 0,10: alvo pequeno cabe no risco de US$ 1; alvo enorme (risco no mínimo > US$ 7,50) não gera sinal
    assert.ok(m.lotePorRisco(5, "US100Cash").lote === 0.2 && m.lotePorRisco(80, "US100Cash") === null);
}
// o braço adaptativo carrega T, S, lote e R; o resultado em R é +1 no alvo e -1 no stop (stop = alvo, k = 1)
{
    const longa = serie(400), ops = m.operacoes(longa, null, "GOLD").filter(o => o.adapt && o.pol === "P1");
    for (const o of ops) { assert.ok(o.lote > 0 && o.riscoUsd <= 7.5 && Math.abs(o.r - o.real / o.S) < 1e-9); if (o.motivo === "ALVO") assert.ok(Math.abs(o.r - 1) < 1e-9); if (o.motivo === "STOP") assert.ok(Math.abs(o.r + 1) < 1e-9); }
}
// swap em USD por lote (US100Cash, OILCash): noite / contrato, não pontos x ponto
{
    const dig = 2, sb = (ms) => ({ ms, o: 0, h: 0, l: 0, c: 0, sp: 10, dig });
    const lote = { compra: -4.48, venda: 0.65, triplo: 5, offsetSeg: 7200, modo: "USD_LOTE", contrato: 1 };
    // terça 24/11 21:00Z -> quarta 23:00Z cruza 1 meia-noite do servidor (noite de terça, x1)
    const ter = [sb(Date.UTC(2026, 10, 24, 21)), sb(Date.UTC(2026, 10, 24, 23))];
    assert.ok(Math.abs(m.swapUsd(ter, 0, 1, true, lote) - (-4.48)) < 1e-9, "compra: -4,48 por unidade (contrato 1)");
    assert.ok(Math.abs(m.swapUsd(ter, 0, 1, false, lote) - 0.65) < 1e-9);
    // quinta -> sexta (dia anterior = quinta, não é o triplo do US100) e sexta -> sábado (dia anterior = sexta = triplo x3)
    const sex = [sb(Date.UTC(2026, 10, 26, 21)), sb(Date.UTC(2026, 10, 26, 23))];       // quinta 26/11 -> noite da quinta
    assert.ok(Math.abs(m.swapUsd(sex, 0, 1, true, lote) - (-4.48)) < 1e-9);
    const ouro = { compra: -69.5, venda: 15.07, triplo: 3, offsetSeg: 7200 };             // modo padrão = pontos (GOLD): -69,5 x 0,01 por unidade
    assert.ok(Math.abs(m.swapUsd(ter, 0, 1, true, ouro) - (-0.695)) < 1e-9);
    const ptsComContrato = { ...lote, modo: "PONTOS" };                                      // se fosse pontos, o US100 daria só -0,0448: a diferença que corrigimos
    assert.ok(Math.abs(m.swapUsd(ter, 0, 1, true, ptsComContrato) - (-0.0448)) < 1e-9);
    assert.strictEqual(m.ESPEC.US100Cash.swapModo, "USD_LOTE"); assert.strictEqual(m.ESPEC.GOLD.swapModo, "PONTOS");
}
console.log("materias.test.js: OK");
