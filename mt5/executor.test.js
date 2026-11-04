// Garantias estáticas do EA executor (não dá para compilar MQL5 aqui; isto só impede regressões perigosas).
const assert = require("assert");
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/XM_Executor.mq5", "utf8");
const codigo = src.replace(/(^|\s)\/\/.*$/gm, "$1");
const semTextos = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""');

// SÓ DEMO e limites de segurança
assert.ok(/ACCOUNT_TRADE_MODE\)\s*!=\s*ACCOUNT_TRADE_MODE_DEMO/.test(codigo) && codigo.includes("INIT_FAILED"), "recusa conta que não seja demo");
assert.ok(/LoteFixo\s*>\s*0\.05/.test(codigo), "teto de lote");
assert.ok(/MaxPosicoes\s*>\s*12/.test(codigo), "teto de posições");
// COMEÇA EM ENSAIO
assert.ok(/input bool\s+SoLog\s*=\s*true;/.test(codigo), "SoLog (ensaio) deve começar ligado");
assert.ok(/input double LoteFixo\s*=\s*0\.02;/.test(codigo));
assert.ok(/input string TokenIngest\s*=\s*"";/.test(codigo));
assert.ok(!src.includes("__CHAVE_WEB__"), "chave web preenchida");
// o ensaio nunca envia ordem: o retorno do ensaio vem ANTES de PositionOpen
const iEnsaio = codigo.indexOf("if(SoLog)"), iOrdem = codigo.indexOf("trade.PositionOpen");
assert.ok(iEnsaio > 0 && iOrdem > iEnsaio, "ensaio antes do envio de ordem");
assert.ok(codigo.slice(iEnsaio, iOrdem).includes("return;"), "ensaio retorna antes de abrir ordem");
// única função de negociação: abrir posição a mercado com SL e TP. Nada de fechar, modificar ou apagar
const usos = semTextos.match(/trade\.\w+\(/g) || [];
for (const u of usos) assert.ok(["trade.SetExpertMagicNumber(", "trade.SetDeviationInPoints(", "trade.SetTypeFillingBySymbol(", "trade.PositionOpen(", "trade.ResultRetcode(", "trade.ResultRetcodeDescription("].includes(u), `uso de CTrade não permitido: ${u}`);
for (const proibido of ["PositionClose", "PositionModify", "OrderDelete", "OrderSend", "trade.Buy", "trade.Sell", "OrderModify"]) assert.ok(!semTextos.includes(proibido), `não pode usar ${proibido}`);
assert.strictEqual((semTextos.match(/trade\.PositionOpen\(/g) || []).length, 1, "um único ponto de envio de ordem");
// uma por par, limite de posições, idade máxima, tentativas limitadas
assert.ok(semTextos.includes("TemPosicaoNoSimbolo(") && semTextos.includes("PositionsTotal() >= MaxPosicoes") && semTextos.includes("idade > MaxIdadeSinalSeg") && /n >= 3/.test(semTextos));
// nada que identifique a conta; só o host do Firestore; token fora de Print/Aviso
for (const id of ["ACCOUNT_LOGIN", "ACCOUNT_NAME", "ACCOUNT_SERVER", "ACCOUNT_COMPANY"]) assert.ok(!codigo.includes(id), `não usar ${id}`);
const hosts = [...codigo.matchAll(/https?:\/\/[^\/"]+/g)].map(m => m[0]);
assert.deepStrictEqual([...new Set(hosts)], ["https://firestore.googleapis.com"]);
assert.ok(!/(Print|Aviso)\([^;]*TokenIngest/.test(semTextos), "token fora do log");
// a leitura da fila é só GET
assert.ok(/WebRequest\("GET"/.test(codigo) && !/WebRequest\("(POST|PATCH|PUT|DELETE)"/.test(codigo));
for (const [a, b] of [["{", "}"], ["(", ")"], ["[", "]"]]) {
    const limpo = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    assert.strictEqual(limpo.split(a).length, limpo.split(b).length, `${a}${b} desbalanceado`);
}
console.log("TODOS OS TESTES ESTÁTICOS DO EXECUTOR PASSARAM");
