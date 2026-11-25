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

// sinal de materia-prima: 9o campo M, lote do sinal, tp/sl em "pips" do executor; sinal de forex continua com 8 campos
{
    const fila = require("./fila");
    const agora = Date.UTC(2026, 10, 25, 15, 0), ini = agora - 120000;
    const mat = { id: `${ini}_GOLD`, par: "GOLD", direcao: "BUY", status: "ABERTA", tipo: "MATERIAS", inicioOperacao: ini, precoEntrada: 3640.55, lote: 0.01, financeiro: { tpPips: 390, slPips: 390 } };
    const fx = { id: `${ini}_EUR_USD`, par: "EUR/USD", direcao: "SELL", status: "ABERTA", inicioOperacao: ini, precoEntrada: 1.1, lote: 0.04, financeiro: { tpPips: 25, slPips: 25 } };
    const t = fila.montarFila([fx, mat], agora);
    const itens = t.split(";").slice(2);
    assert.strictEqual(itens.length, 2);
    const f = itens.find(i => i.includes("EURUSD")).split("|"), m = itens.find(i => i.includes("GOLD")).split("|");
    assert.strictEqual(f.length, 8); assert.strictEqual(m.length, 9); assert.strictEqual(m[8], "M"); assert.strictEqual(m[1], "GOLD"); assert.strictEqual(m[7], "0.01"); assert.strictEqual(m[5], "390");
    // nome EXATO do MT5 (com minúsculas): "OILCash" virava "OILCASH" e o executor não achava o símbolo (log real de 25/11/2026)
    const oil = { ...mat, id: `${ini}_OILCash`, par: "OILCash" }, nq = { ...mat, id: `${ini}_US100Cash`, par: "US100Cash" };
    const t2 = fila.montarFila([oil, nq], agora).split(";").slice(2).map(i => i.split("|")[1]);
    assert.deepStrictEqual(t2.sort(), ["OILCash", "US100Cash"]);
    console.log("fila: item de materia-prima OK");
}

