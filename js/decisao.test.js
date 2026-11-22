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

// ---- limites de risco ----
const H = 3600e3, T = Date.UTC(2026, 10, 20, 15);          // 12h em Brasília
const op = (id, par, dir, ab, fim, usd, status) => ({ id, par, direcao: dir, timestamp: ab, fimOperacao: fim, resultadoFinanceiro: usd, status: status || (fim ? "ENCERRADA" : "ABERTA"), financeiro: { regimeTPSL: "CONFIG" } });
const sinal = { id: "S", par: "EUR/USD", direcao: "SELL", timestamp: T };          // EUR/USD venda = dólar forte (comprado)
assert.strictEqual(d.drLado("EUR/USD", "SELL"), "comprado"); assert.strictEqual(d.drLado("USD/JPY", "SELL"), "vendido"); assert.strictEqual(d.drLado("EUR/GBP", "BUY"), "cruzado");
// tudo livre
let av = d.drAvaliar([], sinal, T); assert.ok(av.ok && av.regras.length === 4);
// 3 abertas -> fora; o próprio sinal não conta; sinal futuro não conta
const abertas3 = [op("a", "GBP/USD", "BUY", T - 5 * H, null, null), op("b", "USD/JPY", "SELL", T - 4 * H, null, null), op("c", "AUD/USD", "BUY", T - 2 * H, null, null), op("S", "EUR/USD", "SELL", T, null, null), op("f", "NZD/USD", "BUY", T + H, null, null)];
av = d.drAvaliar(abertas3, sinal, T); assert.strictEqual(av.abertas, 3); assert.ok(!av.regras.find(r => r.chave === "abertas").ok);
// aberta que já fechou ANTES de T não conta; fechada DEPOIS de T conta como aberta em T
av = d.drAvaliar([op("x", "GBP/USD", "BUY", T - 6 * H, T - H, 5), op("y", "GBP/USD", "BUY", T - 6 * H, T + H, 5)], sinal, T); assert.strictEqual(av.abertas, 1);
// mesmo lado: 2 abertas no dólar "comprado" (USD/JPY compra e GBP/USD venda) -> fora
av = d.drAvaliar([op("a", "USD/JPY", "BUY", T - 3 * H, null), op("b", "GBP/USD", "SELL", T - 2 * H, null)], sinal, T); assert.ok(!av.regras.find(r => r.chave === "mesmoLado").ok);
// cruzado nunca viola o mesmo lado
av = d.drAvaliar([op("a", "EUR/JPY", "BUY", T - 3 * H, null), op("b", "EUR/JPY", "BUY", T - 2 * H, null)], { id: "S2", par: "EUR/GBP", direcao: "BUY", timestamp: T }, T); assert.ok(av.regras.find(r => r.chave === "mesmoLado").ok);
// perda do dia: -15 hoje -> fora; ontem não conta; ganho compensa
av = d.drAvaliar([op("a", "GBP/USD", "BUY", T - 8 * H, T - 4 * H, -5), op("b", "GBP/USD", "BUY", T - 8 * H, T - 3 * H, -5), op("c", "GBP/USD", "BUY", T - 8 * H, T - 2 * H, -5)], sinal, T);
assert.ok(!av.regras.find(r => r.chave === "perdaDia").ok);
av = d.drAvaliar([op("a", "GBP/USD", "BUY", T - 40 * H, T - 30 * H, -15)], sinal, T); assert.ok(av.regras.find(r => r.chave === "perdaDia").ok);   // ontem
av = d.drAvaliar([op("a", "GBP/USD", "BUY", T - 8 * H, T - 4 * H, -15), op("b", "GBP/USD", "BUY", T - 8 * H, T - 3 * H, 5)], sinal, T); assert.ok(av.regras.find(r => r.chave === "perdaDia").ok);
// horário: 17h e 18h de Brasília = 20h e 21h UTC
assert.ok(!d.drAvaliar([], sinal, Date.UTC(2026, 10, 20, 20, 30)).regras.find(r => r.chave === "horario").ok);
assert.ok(d.drAvaliar([], sinal, Date.UTC(2026, 10, 20, 22, 0)).regras.find(r => r.chave === "horario").ok);     // 19h
assert.ok(d.drAvaliar([], sinal, Date.UTC(2026, 10, 20, 19, 59)).regras.find(r => r.chave === "horario").ok);    // 16h59
// seleção: cooldown e regime diferente ficam de fora
assert.strictEqual(d.drSelecionar([op("a", "EUR/USD", "BUY", d.DC_EPOCA_MS + 1, null), { ...op("b", "EUR/USD", "BUY", d.DC_EPOCA_MS + 1, null), status: "COOLDOWN" }, { ...op("c", "EUR/USD", "BUY", d.DC_EPOCA_MS + 1, null), financeiro: { regimeTPSL: "X" } }]).length, 1);
const h2 = d.drHTML(d.drAvaliar(abertas3, sinal, T)); assert.ok(h2.includes("Fora dos limites") && h2.includes("não entrar"));
assert.ok(d.drHTML(d.drAvaliar([], sinal, T)).includes("Dentro dos limites"));
console.log("decisao.test.js (limites de risco): OK");

// ---- registro da decisão ----
const aberto = { id: "A1", status: "ABERTA" };
assert.ok(d.dcPodeDecidir(aberto));
assert.ok(!d.dcPodeDecidir({ ...aberto, resultado: "WIN" }) && !d.dcPodeDecidir({ ...aberto, status: "ENCERRADA" }), "só antes do desfecho");
assert.ok(!d.dcPodeDecidir({ ...aberto, decisaoUsuario: { entrei: true, em: 1 } }), "uma decisão por sinal");
assert.ok(d.dcDecisaoHTML(aberto).includes('data-decisao="entrei"') && d.dcDecisaoHTML(aberto).includes('data-decisao="nao"') && d.dcDecisaoHTML(aberto).includes("não envia ordem"));
const ja = d.dcDecisaoHTML({ ...aberto, decisaoUsuario: { entrei: false, em: Date.UTC(2026, 10, 22, 15, 5) } });
assert.ok(ja.includes("Não entrei") && !ja.includes("<button"), "depois de decidir some o botão");
assert.strictEqual(d.dcDecisaoHTML({ id: "X", status: "ENCERRADA", resultado: "WIN" }), "", "sinal encerrado: nada a decidir");
// transação: grava uma vez e nunca sobrescreve (db simulado)
const docsDb = { A1: { status: "ABERTA" }, A2: { status: "ABERTA", decisaoUsuario: { entrei: true, em: 5 } }, A3: { status: "ENCERRADA", resultado: "LOSS" } };
global.db = { collection: () => ({ doc: (id) => ({ id }) }), runTransaction: async (fn) => fn({
    get: async (ref) => ({ exists: !!docsDb[ref.id], data: () => docsDb[ref.id] }),
    update: (ref, campos) => { Object.assign(docsDb[ref.id], campos); } }) };
(async () => {
    const r1 = await d.dcRegistrarDecisao("A1", true, 111);
    assert.deepStrictEqual(docsDb.A1.decisaoUsuario, { entrei: true, em: 111 }); assert.strictEqual(r1.decisaoUsuario.entrei, true);
    const r2 = await d.dcRegistrarDecisao("A1", false, 222);                      // segunda tentativa não muda
    assert.deepStrictEqual(docsDb.A1.decisaoUsuario, { entrei: true, em: 111 }); assert.strictEqual(r2.decisaoUsuario.em, 111);
    const r3 = await d.dcRegistrarDecisao("A2", false, 333); assert.strictEqual(r3.decisaoUsuario.entrei, true);
    await assert.rejects(() => d.dcRegistrarDecisao("A3", true, 444), /já encerrou/);
    await assert.rejects(() => d.dcRegistrarDecisao("ZZ", true, 1), /não encontrado/);
    console.log("decisao.test.js (registro da decisão): OK");
})();
