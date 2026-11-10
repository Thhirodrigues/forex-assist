const assert = require("assert");
const { ZERAR } = require("../marco/regra625");
const { analisar, ladoDolar } = require("./analise400");

assert.strictEqual(ladoDolar("EUR/USD", "BUY"), "vendido");
assert.strictEqual(ladoDolar("EUR/USD", "SELL"), "comprado");
assert.strictEqual(ladoDolar("USD/JPY", "BUY"), "comprado");
assert.strictEqual(ladoDolar("USD/CHF", "SELL"), "vendido");
assert.strictEqual(ladoDolar("EUR/JPY", "SELL"), "cruzado");

// 10 operações sintéticas (segunda 05/10/2026 em diante), TP=SL=25, EUR/USD com spread 1,8
const seg = Date.parse("2026-10-05T13:00:00Z");
const mk = (i, res, par = "EUR/USD", dir = "BUY", extra = {}) => ({ id: "s" + i, par, direcao: dir, timestamp: seg + i * 3600e3, inicioOperacao: seg + i * 3600e3,
    fimOperacao: seg + i * 3600e3 + 1800e3, status: "ENCERRADA", resultado: res, resultadoFinanceiro: res === "WIN" ? 5 : -5,
    financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 }, score: 40 + i, indicadores: { adx: 20 + i, rsi: 50, atr: 0.001 }, janelaOrigem: "londres", ...extra });
const h = [];
for (let i = 0; i < 10; i++) h.push(mk(i, i < 4 ? "WIN" : "LOSS"));
h.push(mk(20, "WIN", "EUR/USD", "BUY", { timestamp: ZERAR - 1 }));   // antes do zerar: fora
const a = analisar(h);
assert.strictEqual(a.total.n, 10); assert.strictEqual(a.win.n, 4); assert.strictEqual(a.loss.n, 6);
assert.strictEqual(a.total.acertoPct, 40);
assert.strictEqual(a.win.pipsBrutos, 100); assert.strictEqual(a.loss.pipsBrutos, -150);
assert.strictEqual(a.win.usdApp, 20); assert.strictEqual(a.loss.usdApp, -30);
assert.strictEqual(a.total.pipsLiquidos, -50 - 18);
// invertido: 6 LOSS viram WIN => 60%; bruto invertido +5 pips/op; líquido +5 - 1,8 = 3,2
assert.strictEqual(a.invertido.simetricas, 10); assert.strictEqual(a.invertido.acertoInvertidoPct, 60);
assert.strictEqual(a.invertido.brutoInvertidoPorOp, 5); assert.strictEqual(a.invertido.liquidoInvertidoPorOp, 3.2);
assert.strictEqual(a.invertido.acertoParaEmpatarPct, 53.6);   // (25 + 1,8) / 50
// horas em Brasília: 13Z = 10h
assert.strictEqual(a.porHora[0].chave, 10);
assert.strictEqual(a.porDiaSemana[0].chave, "seg");
assert.ok(a.dias.melhores.length >= 1 && a.dias.piores.length >= 1);
assert.strictEqual(a.perfilWin.n, 4); assert.strictEqual(a.perfilLoss.n, 6);
assert.strictEqual(a.porLadoDolar[0].chave, "vendido");
// limite: só as N primeiras por ordem de fechamento
assert.strictEqual(analisar(h, { limite: 3 }).total.n, 3);

// ---- sequências
const { sequencias } = require("./analise400");
const q = sequencias(h);                       // WWWW LLLLLL na ordem de fechamento: 2 rachas
assert.strictEqual(q.n, 10); assert.strictEqual(q.rachas.observadas, 2);
assert.strictEqual(q.rachas.maiorSequenciaWin, 4); assert.strictEqual(q.rachas.maiorSequenciaLoss, 6);
assert.ok(q.rachas.z < 0, "resultados agrupados dão z negativo");
assert.deepStrictEqual(q.rachas.tamanhos, { W: { 4: 1 }, L: { 6: 1 } });
const pd = Object.fromEntries(q.padroes.map(x => [x.padrao, x]));
assert.strictEqual(pd.W.n, 4); assert.strictEqual(pd.W.winPct, 75);       // depois de W: W,W,W,L
assert.strictEqual(pd.L.n, 5); assert.strictEqual(pd.L.winPct, 0);
assert.strictEqual(pd.WWW.n, 2); assert.strictEqual(pd.WWW.winPct, 50);
// utilizável: cada operação fecha 30 min depois de abrir e a seguinte abre 1 h depois => a anterior já estava fechada
assert.strictEqual(q.utilizavel.aposW.n, 4); assert.strictEqual(q.utilizavel.aposW.winPct, 75);
assert.strictEqual(q.utilizavel.aposL.n, 5); assert.strictEqual(q.utilizavel.aposL.winPct, 0);
assert.strictEqual(q.utilizavel.mesmoParAposW.n, 4);
// se as operações se sobrepõem (todas abrem antes de qualquer uma fechar), nada é "utilizável"
const sobre = h.slice(0, 10).map((s, i) => ({ ...s, timestamp: seg + i * 60e3, inicioOperacao: seg + i * 60e3, fimOperacao: seg + 86400e3 + i * 60e3 }));
assert.strictEqual(sequencias(sobre).utilizavel.aposW.n, 0);
// alternância perfeita: z positivo
const alt = h.slice(0, 10).map((s, i) => ({ ...s, resultado: i % 2 ? "WIN" : "LOSS" }));
assert.ok(sequencias(alt).rachas.z > 0); assert.strictEqual(sequencias(alt).rachas.observadas, 10);
assert.strictEqual(q.assimetricas.length, 0);
assert.strictEqual(sequencias([mk(1, "WIN", "EUR/USD", "BUY", { financeiro: { regimeTPSL: "CONFIG", tpPips: 20, slPips: 30 } }), mk(2, "LOSS")]).assimetricas.length, 1);
assert.strictEqual(q.custoPorPar[0].spreadPctDoSl, 7.2);   // 1,8 / 25
assert.strictEqual(q.blocos50[0].winPct, 40);
console.log("TODOS OS TESTES DO RELATÓRIO DAS 400 PASSARAM");
