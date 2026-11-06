const assert = require("assert");
const { normalizarComando, extrairComandos } = require("./comandos");
const { marco } = require("./montar");
const { ZERAR } = require("../marco/regra625");

// ---- normalização
assert.strictEqual(normalizarComando("/hoje"), "hoje");
assert.strictEqual(normalizarComando("/Hoje@MeuBot"), "hoje");
assert.strictEqual(normalizarComando("  /semana agora "), "semana");
assert.strictEqual(normalizarComando("hoje"), null);
assert.strictEqual(normalizarComando("forex-nov26"), null);
assert.strictEqual(normalizarComando(""), null);
assert.strictEqual(normalizarComando(null), null);

// ---- só o dono, só chat privado
const msg = (id, chatId, texto, tipo = "private") => ({ update_id: id, message: { chat: { id: chatId, type: tipo }, text: texto, date: 1 } });
let r = extrairComandos([msg(10, 111, "/hoje"), msg(11, 999, "/marco"), msg(12, 111, "/Hoje"), msg(13, 111, "/semana"), msg(14, -5, "/hoje", "group")], 111);
assert.deepStrictEqual(r.comandos, ["hoje", "semana"], "só o dono, sem repetir, grupo ignorado");
assert.strictEqual(r.maxId, 14, "descarta também o que foi ignorado");
assert.deepStrictEqual(extrairComandos([msg(1, 111, "/marco")], null).comandos, [], "sem destino gravado, ninguém é atendido");
assert.deepStrictEqual(extrairComandos([msg(1, 111, "/marco")], undefined).comandos, []);
assert.deepStrictEqual(extrairComandos([msg(1, 111, "/qualquer")], 111).comandos, ["ajuda"], "comando desconhecido vira ajuda");
assert.deepStrictEqual(extrairComandos([msg(1, 111, "oi")], 111).comandos, [], "texto sem barra não é comando");
assert.deepStrictEqual(extrairComandos([], 111), { comandos: [], maxId: null });
assert.deepStrictEqual(extrairComandos([{ update_id: 3, edited_message: {} }], 111), { comandos: [], maxId: 3 });
assert.strictEqual(extrairComandos([msg(1, "111", "/hoje")], 111).comandos.length, 1, "chat_id texto x número");
assert.strictEqual(extrairComandos(Array.from({ length: 5 }, (_, i) => msg(i, 111, ["/hoje", "/semana", "/marco", "/ajuda", "/x"][i])), 111).comandos.length, 3, "no máximo 3 por ciclo");

// ---- /marco
const mk = (i, res) => ({ id: "s" + i, timestamp: ZERAR + 3600e3 * (i + 1), fimOperacao: ZERAR + 3600e3 * (i + 1) + 1800e3, par: "EUR/USD", status: "ENCERRADA", resultado: res, resultadoFinanceiro: res === "WIN" ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 } });
const h = Array.from({ length: 120 }, (_, i) => mk(i, i % 2 ? "WIN" : "LOSS"));
const m = marco({ historico: h, agoraMs: ZERAR + 33 * 86400000 });
assert.match(m.title, /Marco das 400/);
assert.match(m.body, /Fechadas: 120\/400 \(faltam 280\) · dias desde 04\/10: 33\/30/);
assert.match(m.body, /Marco ainda não atingido/);
assert.match(m.body, /100 primeiras: n=100/); assert.match(m.body, /TODAS \(120\): n=120/);
assert.ok(!/200 primeiras/.test(m.body), "janela de 200 só aparece com 200 fechadas");
assert.ok(!m.body.includes("NaN") && !m.body.includes("undefined"));
const m400 = marco({ historico: Array.from({ length: 400 }, (_, i) => mk(i, i % 2 ? "WIN" : "LOSS")), agoraMs: ZERAR + 33 * 86400000 });
assert.match(m400.body, /MARCO ATINGIDO/);
assert.match(marco({ historico: [], agoraMs: ZERAR + 1000 }).body, /Fechadas: 0\/400 \(faltam 400\)/);
console.log("TODOS OS TESTES DOS COMANDOS DO TELEGRAM PASSARAM");
