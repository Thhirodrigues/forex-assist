const assert = require("assert");
const { caminho, simularRegra } = require("./dia-caminho");
const H = 3600e3, T0 = Date.UTC(2026, 10, 9, 12);
let id = 0;
const mk = (ab, dur, win) => ({ id: "s" + id++, par: "EUR/USD", direcao: "BUY", timestamp: ab, fimOperacao: ab + dur, status: "ENCERRADA", resultado: win ? "WIN" : "LOSS", resultadoFinanceiro: win ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 } });
// dia 1: W W (+10, toca ganho) depois L ; dia 2: L L (-10, toca perda) depois W ; dia 3: W L (nenhum)
const fe = [mk(T0, H, true), mk(T0 + H, H, true), mk(T0 + 3 * H, H, false),
    mk(T0 + 24 * H, H, false), mk(T0 + 25 * H, H, false), mk(T0 + 27 * H, H, true),
    mk(T0 + 48 * H, H, true), mk(T0 + 50 * H, H, false)];
const c = caminho(fe);
assert.strictEqual(c.dias, 3);
assert.strictEqual(c.tocaPrimeiro.mais10.dias, 1); assert.strictEqual(c.tocaPrimeiro.menos10.dias, 1); assert.strictEqual(c.tocaPrimeiro.nenhum.dias, 1);
assert.strictEqual(c.tocaPrimeiro.mais10.finalMedioUsd, 5); assert.strictEqual(c.tocaPrimeiro.menos10.finalMedioUsd, -5);
assert.strictEqual(c.operacoesDepoisDoToque.depoisDeGanhar10.n, 1); assert.strictEqual(c.operacoesDepoisDoToque.depoisDePerder10.n, 1);
// regra A: no dia 1 o 3o sinal (abre em T0+3h, depois do +10 fechado) é pulado; B: no dia 2 o 3o sinal é pulado; C: ambos
assert.strictEqual(simularRegra(fe, "A").n, 7); assert.strictEqual(simularRegra(fe, "B").n, 7); assert.strictEqual(simularRegra(fe, "AB").n, 6);
// só decide com o que JÁ fechou: sinal que abre antes de o 2o ganho fechar é tomado
const fe2 = [mk(T0, 5 * H, true), mk(T0 + H, 5 * H, true), mk(T0 + 2 * H, H, false)];
assert.strictEqual(simularRegra(fe2, "A").n, 3);
console.log("dia-caminho.test.js: OK");
