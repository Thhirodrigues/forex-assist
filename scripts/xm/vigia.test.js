const assert = require("assert");
const { avaliar, mercadoAberto, montarAviso } = require("./vigia");
const U = (y, m, d, h, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const TER = U(2026, 11, 3, 15), SAB = U(2026, 11, 7, 12), DOM_CEDO = U(2026, 11, 8, 10), DOM_TARDE = U(2026, 11, 8, 22, 30), SEX_TARDE = U(2026, 11, 6, 23);

assert.strictEqual(mercadoAberto(TER), true); assert.strictEqual(mercadoAberto(SAB), false);
assert.strictEqual(mercadoAberto(DOM_CEDO), false); assert.strictEqual(mercadoAberto(DOM_TARDE), true);
assert.strictEqual(mercadoAberto(SEX_TARDE), false); assert.strictEqual(mercadoAberto(U(2026, 11, 6, 21)), true);

const gmt = (agora, minAtras) => agora / 1000 - minAtras * 60;
// dado fresco: nada
let r = avaliar({ agoraMs: TER, estadoGmtSeg: gmt(TER, 2) });
assert.strictEqual(r.acao, "NENHUMA"); assert.strictEqual(r.idadeMin, 2);
// parou (25 min): alerta uma vez e guarda o estado
r = avaliar({ agoraMs: TER, estadoGmtSeg: gmt(TER, 25) });
assert.strictEqual(r.acao, "ALERTAR"); assert.strictEqual(r.novo.parado, true); assert.strictEqual(r.novo.avisos, 1);
// 15 min depois ainda parado: NÃO repete (reenvio só a cada 60 min)
let prox = avaliar({ agoraMs: TER + 15 * 60000, estadoGmtSeg: gmt(TER, 25), anterior: r.novo });
assert.strictEqual(prox.acao, "NENHUMA");
// 60 min depois: repete (aviso 2)
prox = avaliar({ agoraMs: TER + 60 * 60000, estadoGmtSeg: gmt(TER, 25), anterior: r.novo });
assert.strictEqual(prox.acao, "ALERTAR"); assert.strictEqual(prox.novo.avisos, 2);
// teto de avisos
prox = avaliar({ agoraMs: TER + 600 * 60000, estadoGmtSeg: gmt(TER, 25), anterior: { parado: true, desdeMs: TER, ultimoAvisoMs: TER, avisos: 6 } });
assert.strictEqual(prox.acao, "NENHUMA", "no máximo 6 avisos");
// voltou: avisa uma vez e zera
prox = avaliar({ agoraMs: TER + 30 * 60000, estadoGmtSeg: gmt(TER + 30 * 60000, 1), anterior: r.novo });
assert.strictEqual(prox.acao, "RECUPEROU"); assert.strictEqual(prox.novo.parado, false); assert.strictEqual(prox.novo.avisos, 0);
// fim de semana: dado velho NÃO gera alerta
r = avaliar({ agoraMs: SAB, estadoGmtSeg: gmt(SAB, 600) });
assert.strictEqual(r.acao, "NENHUMA"); assert.strictEqual(r.aberto, false);
// sem nenhum estado gravado em horário de mercado: alerta
r = avaliar({ agoraMs: TER, estadoGmtSeg: null });
assert.strictEqual(r.acao, "ALERTAR"); assert.strictEqual(r.idadeMin, null);
// textos
let t = montarAviso("ALERTAR", { idadeMin: 25.4, ultimoEstadoMs: TER - 25 * 60000 });
assert.match(t.title, /^⚠️ MT5 parou de enviar/); assert.match(t.body, /há 25 min/);
assert.match(montarAviso("RECUPEROU", {}).title, /voltou a enviar/);
assert.match(montarAviso("ALERTAR", { idadeMin: null, ultimoEstadoMs: null, simulado: true }).title, /^TESTE: /);
console.log("TODOS OS TESTES DO VIGIA DO MT5 PASSARAM");
