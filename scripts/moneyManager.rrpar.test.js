// AJUSTE-090: GBP/USD deixou de ter TP 1,5x; todos os pares usam o TP/SL da Config.
const assert = require("assert");
const { decidirConfiguracaoMercado } = require("./moneyManager");

const entrada = (par) => decidirConfiguracaoMercado({ score: 40, adx: 29, atr: 0.0004, expectativa: -5, lote: 0.02, tpUSD: 5, slUSD: 5, par });

for (const par of ["GBP/USD", "EUR/USD", "USD/JPY", "AUD/USD", "GBP/JPY"]) {
  const c = entrada(par);
  assert.strictEqual(c.tpUSD, 5, `${par}: TP = Config`);
  assert.strictEqual(c.slUSD, 5, `${par}: SL = Config`);
  assert.strictEqual(c.lote, 0.02, `${par}: lote = Config`);
  assert.strictEqual(c.decisao, "MANTER", `${par}: sem rótulo RR_PAR`);
}
// a Config é respeitada em qualquer valor (não só 5/5)
const c = decidirConfiguracaoMercado({ score: 40, adx: 29, atr: 0.0004, expectativa: -5, lote: 0.04, tpUSD: 8, slUSD: 6, par: "GBP/USD" });
assert.deepStrictEqual([c.tpUSD, c.slUSD, c.lote], [8, 6, 0.04], "GBP/USD com TP 8 / SL 6 na Config: sai 8 / 6");
console.log("TESTES DO RR_PAR (extinto) PASSARAM");
