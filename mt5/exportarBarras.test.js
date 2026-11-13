// Garantias estáticas do script de exportação de barras (não dá para compilar MQL5 aqui).
const assert = require("assert");
const src = require("fs").readFileSync(__dirname + "/XM_ExportarBarras.mq5", "utf8");
const codigo = src.replace(/(^|\s)\/\/.*$/gm, "$1");
// somente leitura: nenhuma negociação e nenhuma internet
for (const proibido of ["CTrade", "OrderSend", "PositionOpen", "PositionClose", "WebRequest", "trade."]) assert.ok(!codigo.includes(proibido), `não pode usar ${proibido}`);
assert.ok(/void OnStart\(\)/.test(codigo), "é um script (OnStart)");
assert.ok(codigo.includes("CopyRates(sym, Periodo"), "exporta o período escolhido");
assert.ok(/input ENUM_TIMEFRAMES Periodo\s*=\s*PERIOD_M5;/.test(codigo), "padrão M5");
assert.ok(codigo.includes("ChartOpen(sym, Periodo)") && codigo.includes("SERIES_SYNCHRONIZED") && codigo.includes("ChartClose(ch)"), "sincroniza o histórico abrindo o gráfico e fecha depois");
assert.ok(codigo.includes("ContarLacunas(") && codigo.includes("ATENCAO"), "confere lacunas e avisa");
assert.ok(codigo.includes('"xm_barras_" + rot + "_" + nomes[i]'), "um arquivo por par");
assert.ok(codigo.includes("TimeTradeServer()") && codigo.includes("TimeGMT()"), "registra o fuso do servidor");
assert.ok(codigo.includes("r[j].spread"), "exporta o spread de cada barra");
for (const id of ["ACCOUNT_LOGIN", "ACCOUNT_NAME", "ACCOUNT_SERVER"]) assert.ok(!codigo.includes(id), `não exporta ${id}`);
for (const p of ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"]) assert.ok(src.includes(p), `par ${p}`);
for (const [a, b] of [["{", "}"], ["(", ")"], ["[", "]"]]) {
    const limpo = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    assert.strictEqual(limpo.split(a).length, limpo.split(b).length, `${a}${b} desbalanceado`);
}
console.log("TODOS OS TESTES ESTÁTICOS DO EXPORTADOR DE BARRAS PASSARAM");
