const assert = require("assert");
const d = require("./decisao");
// Wilson: 50/100 -> ~40,4% a 59,6%
const [lo, hi] = d.dcWilson(50, 100);
assert.ok(Math.abs(lo - 40.4) < 0.2 && Math.abs(hi - 59.6) < 0.2, `${lo} ${hi}`);
assert.deepStrictEqual(d.dcWilson(0, 0), [null, null]);
// empate com custo: TP=SL=25, spread 2,3 -> 54,6%
assert.ok(Math.abs(d.dcEmpate(25, -25, 2.3) - 54.6) < 0.01);
// veredito
assert.strictEqual(d.dcVeredito(40, 52, 100, 54.6).chave, "abaixo");
assert.strictEqual(d.dcVeredito(56, 70, 100, 54.6).chave, "acima");
assert.strictEqual(d.dcVeredito(45, 60, 100, 54.6).chave, "indef");
assert.strictEqual(d.dcVeredito(45, 60, 10, 54.6).chave, "pequena");
// seleção: só época atual, CONFIG, ENCERRADA, WIN/LOSS
const base = { financeiro: { regimeTPSL: "CONFIG" }, status: "ENCERRADA", timestamp: d.DC_EPOCA_MS + 1 };
const docs = [{ ...base, resultado: "WIN" }, { ...base, resultado: "LOSS" }, { ...base, resultado: "WIN", timestamp: d.DC_EPOCA_MS - 1 },
    { ...base, resultado: "WIN", status: "ABERTA" }, { ...base, resultado: "WIN", financeiro: { regimeTPSL: "OUTRO" } }];
assert.strictEqual(d.dcSelecionar(docs).length, 2);
// resumo: par, horário ±1 h (Brasília), geral
const t12 = Date.UTC(2026, 10, 16, 15);            // 12h em Brasília
const mk = (par, h, win) => ({ ...base, par, resultado: win ? "WIN" : "LOSS", timestamp: Date.UTC(2026, 10, 16, h + 3) });
const fech = [mk("EUR/USD", 12, true), mk("EUR/USD", 3, false), mk("GBP/USD", 11, true), mk("GBP/USD", 13, false), mk("USD/JPY", 20, true)];
const r = d.dcResumo(fech, { par: "EUR/USD", timestamp: t12, financeiro: { tpPips: 25, slPips: 25 } }, 1.8);
assert.deepStrictEqual(r.linhas.map(l => l.n), [2, 3, 5]);
assert.ok(r.linhas[1].rotulo.startsWith("Das 11h às 14h"), r.linhas[1].rotulo);
assert.ok(Math.abs(r.empate - 53.6) < 0.01);
const html = d.dcHTML(r);
assert.ok(html.includes("Histórico real") && html.includes("Amostra pequena") && html.includes("não previsão"));
console.log("decisao.test.js: OK");
