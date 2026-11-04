const assert = require("assert");
const { montarFila, docIdDaFila, simbolo } = require("./fila");
const conta = (f) => f.split(";").slice(2).filter(Boolean).length;
const AGORA = Date.UTC(2026, 10, 4, 12, 0);
const sig = (id, minAtras, extra = {}) => ({ id, par: "EUR/JPY", direcao: "SELL", status: "ABERTA", inicioOperacao: AGORA - minAtras * 60000, precoEntrada: 177.20757, lote: 0.02, financeiro: { tpPips: 39.38698, slPips: 39.38698 }, ...extra });

assert.strictEqual(simbolo("EUR/JPY"), "EURJPY");
let f = montarFila([sig("A1", 5)], AGORA);
assert.strictEqual(f, `v1;${AGORA / 1000};A1|EURJPY|S|${(AGORA - 300000) / 1000}|177.20757|39.4|39.4|0.02`);
assert.ok(!/["\\]/.test(f), "formato sem aspas nem barra invertida (o EA lê sem biblioteca de JSON)");

// só ABERTA, recente (<= 30 min), a partir do marco, direção válida, dados completos
f = montarFila([sig("a", 5), sig("velho", 31), sig("enc", 5, { status: "ENCERRADA" }), sig("futuro", -5), sig("dir", 5, { direcao: "X" }), sig("semtp", 5, { financeiro: {} }), sig("sempreco", 5, { precoEntrada: undefined }), sig("pre", 5, { inicioOperacao: AGORA - 300000 })], AGORA, { marcoMs: AGORA - 60000 });
assert.strictEqual(conta(f), 0, "tudo é descartado: antigo, encerrado, futuro, direção inválida, incompleto ou anterior ao marco");
f = montarFila([sig("a", 5), sig("velho", 31), sig("enc", 5, { status: "ENCERRADA" }), sig("futuro", -5), sig("dir", 5, { direcao: "X" }), sig("semtp", 5, { financeiro: {} }), sig("sempreco", 5, { precoEntrada: undefined })], AGORA);
assert.strictEqual(conta(f), 1); assert.match(f, /;a\|EURJPY\|S\|/);
// ordem cronológica e caractere perigoso no id
f = montarFila([sig("B", 1), sig("A", 10), sig("a|b", 2)], AGORA);
const ids = f.split(";").slice(2).map(x => x.split("|")[0]);
assert.deepStrictEqual(ids, ["A", "B"], "do mais antigo para o mais novo; id com '|' descartado");
// fila vazia continua sendo um texto válido (o EA lê "nenhum sinal")
assert.strictEqual(montarFila([], AGORA), `v1;${AGORA / 1000};`);
assert.strictEqual(docIdDaFila("tok_123"), "fila_tok_123");
console.log("TODOS OS TESTES DA FILA DO EXECUTOR PASSARAM");
