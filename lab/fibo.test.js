const assert = require("assert");
const f = require("./fibo");
const M5 = 300000, T0 = Date.UTC(2026, 10, 9, 12), PIP = 0.0001;
const bar = (i, o, h, l, c, sp = 10) => ({ ms: T0 + i * M5, o, h, l, c, sp, dig: 5 });          // spread 10 pontos = 1 pip
// série: plano -> perna de ALTA de 1,1000 a 1,1100 (20 velas) -> recuo gradual até ~55% (>= K velas depois do topo) -> vela de alta (gatilho) -> sobe até o alvo
function serie(final = "alvo") {
    const b = []; let i = 0, p = 1.1;
    for (; i < 30; i++) { const ruido = (i % 2 ? 1 : -1) * 0.2 * PIP; b.push(bar(i, p, p + 1 * PIP, p - (i === 15 ? 1.5 : 1) * PIP, p + ruido)); }
    for (let k = 0; k < 20; k++, i++) { const o = p, c = p + 5 * PIP; b.push(bar(i, o, c + 0.5 * PIP, o - 0.5 * PIP, c)); p = c; }               // +100 pips em 20 velas
    const topoIdx = i - 1, topo = p + 0.5 * PIP;
    for (let k = 0; k < 14; k++, i++) { const o = p, c = p - 4 * PIP; b.push(bar(i, o, o + 0.3 * PIP, c - 0.3 * PIP, c)); p = c; }               // recua 56 pips (56%)
    const gatilho = i; b.push(bar(i, p, p + 2 * PIP, p - 0.5 * PIP, p + 1.5 * PIP)); i++;                                                 // vela de alta no 56%
    const alvoPreco = topo;
    for (let k = 0; k < 30; k++, i++) {
        const o = b[i - 1].c, c = final === "alvo" ? o + 4 * PIP : o - 4 * PIP;
        b.push(bar(i, o, Math.max(o, c) + 0.3 * PIP, Math.min(o, c) - 0.3 * PIP, c));
    }
    return { b, gatilho, topoIdx, alvoPreco };
}
let { b, gatilho, alvoPreco } = serie("alvo");
let s = f.gerarSinais(b);
assert.strictEqual(s.length, 1, "um sinal por perna: " + JSON.stringify(s.map(x => x.i)));
assert.strictEqual(s[0].i, gatilho); assert.ok(s[0].compra); assert.ok(s[0].r >= 0.5 && s[0].r <= 0.618, "r=" + s[0].r);
assert.ok(Math.abs(s[0].alvo - alvoPreco) < 1e-9);
const op = f.operacao(b, s[0]);
assert.ok(op && op.real.estado === "WIN" && op.real.pnl > 0, JSON.stringify(op && op.real));
assert.strictEqual(op.oposta.estado, "LOSS", "o lado oposto da mesma geometria perde");
// vira contra: LOSS
({ b } = serie("stop")); s = f.gerarSinais(b);
const op2 = f.operacao(b, s[0]); assert.ok(op2.real.estado === "LOSS" && op2.real.pnl < 0);
// CAUSAL: o sinal da vela do gatilho é o mesmo com a série cortada logo depois dele (nada do futuro entra)
const cheia = serie("alvo"); const corte = cheia.b.slice(0, cheia.gatilho + 2);
const sc = f.gerarSinais(corte); assert.strictEqual(sc.length, 1); assert.strictEqual(sc[0].i, cheia.gatilho);
// e SEM as K velas depois do topo, o pivô ainda não estaria confirmado: nada de sinal
assert.strictEqual(f.gerarSinais(cheia.b.slice(0, cheia.topoIdx + 6)).length, 0, "pivô só vale K velas depois");
// perna pequena (abaixo de 4 x ATR) não gera sinal
const pequena = []; for (let i = 0; i < 120; i++) pequena.push(bar(i, 1.1, 1.1 + 3 * PIP, 1.1 - 3 * PIP, 1.1 + (i % 2 ? 1 : -1) * PIP));
assert.strictEqual(f.gerarSinais(pequena).length, 0);
// spread alto relativo ao risco bloqueia (risco < 3 x spread)
const caro = cheia.b.map(x => ({ ...x, sp: 200 })); assert.strictEqual(f.gerarSinais(caro).length, 0);
// VENDA simétrica: espelha a série em torno de 1,1
const esp = cheia.b.map(x => ({ ...x, o: 2.2 - x.o, c: 2.2 - x.c, h: 2.2 - x.l, l: 2.2 - x.h }));
const se = f.gerarSinais(esp); assert.strictEqual(se.length, 1); assert.ok(!se[0].compra);
const ope = f.operacao(esp, se[0]); assert.ok(ope.real.estado === "WIN", JSON.stringify(ope.real));
console.log("fibo.test.js: OK");
// veredito: lógica dos critérios com operações sintéticas (nada de dado real)
{
    const { icDias } = require("./fase0-m1");
    const mk = (n, pnl, opostaPnl) => Array.from({ length: n }, (_, k) => ({ ms: Date.UTC(2026, 9, 5 + (k % 40)) + k, dia: "d" + (k % 40), real: { estado: pnl > 0 ? "WIN" : "LOSS", pnl }, oposta: { estado: opostaPnl > 0 ? "WIN" : "LOSS", pnl: opostaPnl } }));
    const bom = f.julgarFibo(mk(200, 5, -5), icDias); assert.strictEqual(bom.veredito, "APROVADA", JSON.stringify(bom));
    const ruim = f.julgarFibo(mk(200, -5, 5), icDias); assert.strictEqual(ruim.veredito, "REPROVADA");
    const pouco = f.julgarFibo(mk(100, 5, -5), icDias); assert.ok(!pouco.c1 && pouco.veredito === "REPROVADA", "menos de 150 operações reprova");
    console.log("fibo veredito: OK");
}
