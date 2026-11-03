// Garantias estáticas do exportador MT5 (não dá para compilar MQL5 aqui; isto só impede regressões perigosas).
const assert = require("assert");
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/XM_Exporter.mq5", "utf8");
const codigo = src.replace(/(^|\s)\/\/.*$/gm, "$1");   // ignora comentários

// SOMENTE LEITURA: nenhuma função de negociação
for (const proibido of ["OrderSend", "OrderSendAsync", "CTrade", "PositionClose", "PositionModify", "OrderCalcMargin", "#include <Trade", "trade.Buy", "trade.Sell"]) {
    assert.ok(!codigo.includes(proibido), `exportador não pode usar ${proibido}`);
}
// nada que identifique a conta
for (const id of ["ACCOUNT_LOGIN", "ACCOUNT_NAME", "ACCOUNT_SERVER", "ACCOUNT_COMPANY"]) assert.ok(!codigo.includes(id), `não enviar ${id}`);
// só demo; token obrigatório; só o host do Firestore
assert.ok(codigo.includes("ACCOUNT_TRADE_MODE_REAL") && codigo.includes("INIT_FAILED"));
assert.ok(/StringLen\(TokenIngest\) < 16/.test(codigo));
const hosts = [...codigo.matchAll(/https?:\/\/[^\/"]+/g)].map(m => m[0]);
assert.deepStrictEqual([...new Set(hosts)], ["https://firestore.googleapis.com"]);
// o token não pode aparecer em Print/Aviso; e o valor padrão do token é vazio
assert.ok(/input string TokenIngest\s*=\s*"";/.test(codigo));
const semTextos = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""');   // o nome do parâmetro pode aparecer em mensagens; o VALOR não
assert.ok(!/(Print|Aviso)\([^;]*TokenIngest/.test(semTextos));
// chaves/parênteses balanceados (sanidade mínima, sem compilador)
for (const [a, b] of [["{", "}"], ["(", ")"], ["[", "]"]]) {
    const limpo = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    assert.strictEqual(limpo.split(a).length, limpo.split(b).length, `${a}${b} desbalanceado`);
}
console.log("TODOS OS TESTES ESTÁTICOS DO EXPORTADOR PASSARAM");
