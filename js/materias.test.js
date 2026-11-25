const assert = require("assert");
const m = require("./materias");
const T = Date.UTC(2026, 10, 25, 15, 0);
const aberta = { id: `${T}_GOLD`, par: "GOLD", direcao: "BUY", status: "ABERTA", timestamp: T, lote: 0.01, riscoUsd: 3.9, precoEntrada: 3640.55, flutuanteUsd: 1.25,
    financeiro: { tpPreco: 3.9, slPreco: 3.9, tpUsd: 3.9, slUsd: 3.9 } };
const win = { ...aberta, id: "w", status: "ENCERRADA", resultado: "WIN", resultadoFinanceiro: 3.9, resultadoR: 1, tempoOperacao: 95 * 60000, motivoFechamento: "ALVO",
    politicas: { P1: { estado: "WIN" }, P2: { estado: "WIN", usd: 3.12, r: 0.8 }, P3: { estado: "LOSS", usd: -3.9, r: -1 } } };
const loss = { ...aberta, id: "l", par: "OILCash", direcao: "SELL", status: "ENCERRADA", resultado: "LOSS", resultadoFinanceiro: -5, resultadoR: -1, tempoOperacao: 40 * 60000, motivoFechamento: "STOP",
    financeiro: { tpPreco: 0.5, slPreco: 0.5, tpUsd: 5, slUsd: 5 } };

const r = m.mtResumo([aberta, win, loss]);
assert.deepStrictEqual([r.total, r.abertos, r.fechados, r.win, r.loss, r.pctAcerto, r.usd, r.r, r.flutuante], [3, 1, 2, 1, 1, 50, -1.1, 0, 1.25]);
assert.deepStrictEqual(m.mtResumo([]), { total: 0, abertos: 0, fechados: 0, win: 0, loss: 0, pctAcerto: null, usd: 0, r: 0, flutuante: 0 });
// formatação em português
assert.strictEqual(m.mtUsd(-5), "−US$ 5,00"); assert.strictEqual(m.mtUsd(3.9), "+US$ 3,90"); assert.strictEqual(m.mtUsd(null), "—"); assert.strictEqual(m.mtUsd(undefined), "—"); assert.strictEqual(m.mtUsd(""), "—"); assert.strictEqual(m.mtUsd(0), "US$ 0,00"); assert.strictEqual(m.mtNum(null), "—"); assert.strictEqual(m.mtSinal(-1, 2), "−1,00");
assert.strictEqual(m.mtDuracao(95 * 60000), "1 h 35 min"); assert.strictEqual(m.mtDuracao(40 * 60000), "40 min");
// cartões
const h1 = m.mtCartaoHTML(aberta);
assert.ok(h1.includes("Ouro") && h1.includes("COMPRA") && h1.includes("EM ANDAMENTO") && h1.includes("+US$ 1,25") && h1.includes("lote 0,01") && h1.includes("3640,55"));
const h2 = m.mtCartaoHTML(win);
assert.ok(h2.includes("WIN") && h2.includes("+US$ 3,90") && h2.includes("1 h 35 min") && h2.includes("ALVO") && h2.includes("encerrasse a 80% do alvo") && h2.includes("+US$ 3,12") && h2.includes("−US$ 3,90"));
const h3 = m.mtCartaoHTML(loss);
assert.ok(h3.includes("Petróleo (WTI)") && h3.includes("VENDA") && h3.includes("LOSS") && h3.includes("−US$ 5,00") && !h3.includes("E se"));
// tela inteira: aviso de teste sempre presente; vazia mostra mensagem; texto vindo do banco é escapado
const tela = m.mtHTML([aberta, win, loss]);
assert.ok(tela.includes("TESTE · conta demo") && tela.includes("sem opção manual") && tela.includes("300 operações em 20 dias"));
assert.ok(m.mtHTML([]).includes("Ainda não há sinais"));
assert.ok(m.mtCartaoHTML({ ...aberta, flutuanteUsd: null, financeiro: { tpPreco: 3.9, slPreco: 3.9, tpUsd: null, slUsd: null } }).includes("—"), "sinal sem valores mostra traço, não zero");
assert.ok(!m.mtCartaoHTML({ ...win, motivoFechamento: '<img src=x onerror=alert(1)>' }).includes("<img"), "escapa HTML do banco");
assert.strictEqual(m.mtEsc(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
console.log("js/materias.test.js: OK");
