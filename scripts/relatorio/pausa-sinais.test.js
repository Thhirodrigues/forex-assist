const assert = require("assert");
const p = require("./pausa-sinais");
const H = 3600e3, T0 = Date.UTC(2026, 10, 9, 12);
let id = 0;
const sig = (abreH, fimH, win, par = "EUR/USD") => ({ id: "s" + (id++), par, direcao: "BUY", timestamp: T0 + abreH * H, fimOperacao: T0 + fimH * H, status: "ENCERRADA", resultado: win ? "WIN" : "LOSS",
    resultadoFinanceiro: win ? 5 : -5, spreadAplicadoPips: 1, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25, lote: 0.02 } });
const fe = [sig(0, 1, true), sig(0.5, 2, false), sig(3, 4, true), sig(3.5, 5, true), sig(4, 6, true), sig(10, 11, true), sig(11, 12, false)];
// ZERAR da regra 6.25 é 04/10: as datas acima (09/11) valem
// A perda fecha em h=2. Sinais que ABREM depois disso: h=3, 3,5, 4 (N=2 pausa os dois primeiros); h=10 e 11 já estão livres
let est = p.estadoPausa(fe, 2).map(s => ({ abre: (s.abre - T0) / H, pausa: s.pausa }));
assert.deepStrictEqual(est.map(s => s.pausa), [false, false, true, true, false, false, false], JSON.stringify(est));
est = p.estadoPausa(fe, 3).map(s => s.pausa); assert.deepStrictEqual(est, [false, false, true, true, true, false, false]);
// uma perda dentro da pausa reinicia (não acumula)
const fe2 = [sig(0, 1, false), sig(2, 2.5, false), sig(3, 4, true), sig(3.2, 5, true), sig(3.4, 6, true)];
assert.deepStrictEqual(p.estadoPausa(fe2, 2).map(s => s.pausa), [false, true, true, true, false]);   // a perda do 2º (fecha em 2,5, em pausa) reinicia a contagem em N: o 3º e o 4º também ficam em pausa
// sinal que abre ANTES de a perda fechar não é afetado (só o que já estava fechado vale)
const fe3 = [sig(0, 5, false), sig(1, 2, true), sig(6, 7, true)];
assert.deepStrictEqual(p.estadoPausa(fe3, 2).map(s => s.pausa), [false, false, true]);
// corridas e dias
const c = p.corridas([1, 1, 1, -1, -1, 1, -1, 1, 1]);
assert.strictEqual(c.dias, 9); assert.strictEqual(c.maiorSequenciaGanho, 3); assert.strictEqual(c.maiorSequenciaPerda, 2); assert.strictEqual(c.corridas, 6); assert.strictEqual(c.alternancias, 5);
assert.deepStrictEqual(c.tamanhosGanho, { 3: 1, 1: 1, 2: 1 });
assert.strictEqual(c.proximoGanhaDepoisDePerda.n, 3);
const d = p.dias([sig(0, 1, true), sig(1, 2, true), sig(30, 31, false), sig(55, 56, true)]);
assert.strictEqual(d.totalDias, 3); assert.strictEqual(d.porUsd.ganhos, 2); assert.strictEqual(d.porUsd.perdas, 1);
// regra de pausa com amostra pequena nunca aprova
const r = p.regraPausa(fe, 2); assert.strictEqual(r.veredito, "SEM EVIDÊNCIA"); assert.strictEqual(r.empausa, 2);
console.log("pausa-sinais.test.js: OK");
