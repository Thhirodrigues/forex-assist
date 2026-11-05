const assert = require("assert");
const { ZERAR } = require("../marco/regra625");
const { slotDiario, slotSemanal } = require("./agenda");
const { diaBrt, inicioDiaBrt, resumoSimples, linhaIA, diario, semanal } = require("./montar");

// ---- agenda: diário seg-sex 21:30Z (+25 min); semanal sexta 21:40Z
const U = (s) => Date.parse(s);
assert.strictEqual(slotDiario(U("2026-11-05T21:30:00Z")), "diario_2026-11-05");          // quinta
assert.strictEqual(slotDiario(U("2026-11-05T21:54:59Z")), "diario_2026-11-05");
assert.strictEqual(slotDiario(U("2026-11-05T21:55:00Z")), null);
assert.strictEqual(slotDiario(U("2026-11-05T21:29:59Z")), null);
assert.strictEqual(slotDiario(U("2026-11-07T21:35:00Z")), null, "sábado nada");
assert.strictEqual(slotDiario(U("2026-11-08T21:35:00Z")), null, "domingo nada");
assert.strictEqual(slotDiario(U("2026-11-06T21:35:00Z")), "diario_2026-11-06", "sexta tem diário");
assert.strictEqual(slotSemanal(U("2026-11-06T21:40:00Z")), "semanal_2026-11-06");
assert.strictEqual(slotSemanal(U("2026-11-05T21:40:00Z")), null, "semanal só na sexta");
assert.strictEqual(slotSemanal(U("2026-11-06T21:39:00Z")), null);

// ---- dia de Brasília
assert.strictEqual(diaBrt(U("2026-11-06T02:59:00Z")), "2026-11-05");
assert.strictEqual(diaBrt(U("2026-11-06T03:00:00Z")), "2026-11-06");
assert.strictEqual(inicioDiaBrt("2026-11-05"), U("2026-11-05T03:00:00Z"));

// ---- dados sintéticos: 6 fechadas na quinta 05/11 (BRT), 2 na terça, 1 aberta, 1 antes do zerar
const T0 = U("2026-11-05T12:00:00Z");
const mk = (i, res, t, par = "EUR/USD", extra = {}) => ({
    id: "s" + i, timestamp: t, fimOperacao: t + 1800e3, par, status: "ENCERRADA", resultado: res,
    resultadoFinanceiro: res === "WIN" ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 }, ...extra
});
const h = [
    mk(1, "WIN", T0), mk(2, "LOSS", T0 + 3600e3), mk(3, "LOSS", T0 + 7200e3, "GBP/USD"), mk(4, "WIN", T0 + 9000e3, "GBP/USD"),
    mk(5, "LOSS", T0 + 10800e3, "USD/CHF"), mk(6, "LOSS", T0 + 14400e3, "USD/CHF"),
    mk(7, "WIN", U("2026-11-03T12:00:00Z")), mk(8, "LOSS", U("2026-11-03T13:00:00Z")),
    mk(9, "WIN", T0 + 1000, "EUR/USD", { status: "ABERTA", resultado: null, fimOperacao: null }),
    mk(10, "WIN", ZERAR - 1)
];
const AGORA = U("2026-11-05T21:30:00Z");
const d = diario({ historico: h, agoraMs: AGORA, extras: { mt5IdadeMin: 1.2, scannerConclusao: "success", iaDocs: [{ id: "gerar_2026-11-05T08:07", status: "SEM_SINAL" }, { id: "gerar_2026-11-05T16:07", status: "PRECO_DIVERGENTE" }, { id: "gerar_2026-11-05T10:07", status: "SEM_SINAL" }] } });
assert.match(d.title, /^📊 Resumo de 05\/11/);
assert.match(d.body, /Sinais emitidos: 7 · fechados hoje: 6/);           // 6 fechadas + 1 aberta emitidas hoje; o de antes do zerar fica fora
assert.match(d.body, /WIN 2 · LOSS 4 \(33%\)/);
assert.match(d.body, /Acumulado: 8\/400 fechadas/);                      // 6 de hoje + 2 de terça; o pré-zerar e a aberta não contam
assert.match(d.body, /Faltam 392 para as 400/);
assert.match(d.body, /Abertas agora: 1/);
assert.match(d.body, /MT5: enviando \(há 1 min\)/);
assert.match(d.body, /IA: 3 horário\(s\) · SEM_SINAL 2, PRECO_DIVERGENTE 1/);
assert.match(d.body, /Scanner: último ciclo = success/);
assert.match(d.body, /quase ruído/);
assert.ok(!d.body.includes("undefined") && !d.body.includes("NaN"));

// líquido do dia: 2 WIN (+25) e 4 LOSS (−25), menos spread (EUR/USD 1,8 x2; GBP/USD 2,15 x2; USD/CHF 2,3 x2)
const r = resumoSimples(h.filter(s => s.resultado && s.status === "ENCERRADA" && s.timestamp >= T0 && s.timestamp < T0 + 86400e3));
assert.strictEqual(r.n, 6);
const liq = ((25 - 1.8) + (-25 - 1.8) + (-25 - 2.15) + (25 - 2.15) + (-25 - 2.3) + (-25 - 2.3)) / 6;
assert.ok(Math.abs(r.liqPips - liq) < 1e-9);
assert.match(d.body, /Líquido do dia: −\d+,\d pips\/op \(n=6\)/);

// dia sem fechados
const vazio = diario({ historico: h, agoraMs: U("2026-11-04T21:30:00Z") });
assert.match(vazio.body, /fechados hoje: 0/); assert.match(vazio.body, /nenhum fechado/); assert.ok(!/Líquido do dia/.test(vazio.body));
// sem nenhum dado
const zero = diario({ historico: [], agoraMs: AGORA });
assert.match(zero.body, /Acumulado: 0\/400/); assert.ok(!zero.body.includes("NaN"));
// teste vem marcado
assert.match(diario({ historico: h, agoraMs: AGORA, teste: true }).title, /^TESTE: /);

// ---- semanal (sexta 06/11): semana = segunda 02/11 a sexta 06/11
const s = semanal({ historico: h, agoraMs: U("2026-11-06T21:40:00Z") });
assert.match(s.title, /Semana 02\/11–06\/11/);
assert.match(s.body, /Semana 02\/11 a 06\/11/);
assert.match(s.body, /fechados: 8/);
assert.match(s.body, /EUR\/USD: n=4/); assert.match(s.body, /GBP\/USD: n=2/); assert.match(s.body, /USD\/CHF: n=2/);
assert.match(s.body, /DESCRITIVO/); assert.match(s.body, /ALEATORIO/);
assert.ok(!s.body.includes("NaN") && !s.body.includes("undefined"));
// semanal numa quarta pega a segunda daquela semana
assert.match(semanal({ historico: h, agoraMs: U("2026-11-04T21:40:00Z") }).body, /Semana 02\/11 a 04\/11/);
// semanal num domingo (BRT) ainda pertence à semana que terminou
assert.match(semanal({ historico: h, agoraMs: U("2026-11-08T15:00:00Z") }).body, /Semana 02\/11 a 08\/11/);

// ---- linhaIA
assert.strictEqual(linhaIA([]), "IA: nenhum horário registrado");

// ---- limites do Telegram (4096 caracteres) e HTML: o título entra escapado por notificarTelegram; o corpo não contém tags
assert.ok((d.title + d.body).length < 3000 && (s.title + s.body).length < 3000);
console.log("TODOS OS TESTES DO RELATÓRIO PASSARAM");
