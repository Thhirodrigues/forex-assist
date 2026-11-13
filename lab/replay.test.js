const assert = require("assert");
const { replayPar, agregar15, agregarN } = require("./replay");
const { processarPar } = require("./nucleo");

// passeio aleatório determinístico com ciclos de tendência (para o pipeline ter o que aprovar)
function candlesSinteticos(n, t0, semente = 7) {
  let x = semente, preco = 1.1;
  const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) {
    const tendencia = Math.sin(i / 220) * 0.00006;
    const o = preco; const c = o + tendencia + (rnd() - 0.5) * 0.0004;
    out.push({ ts: t0 + i * 300000, o, h: Math.max(o, c) + rnd() * 0.0002, l: Math.min(o, c) - rnd() * 0.0002, c });
    preco = c;
  }
  return out;
}
const T0 = Date.UTC(2026, 8, 1, 0, 0, 0);
const CONFIG = { perfil: "conservador", cooldown: 30, lote: 0.02, tp: 5, sl: 5, tipoConta: "SIMULADA", saldoInicial: 1000, saldoSimulado: 1000, candles: 500 };

(async () => {
  // agregação de 15 min: só baldes completos
  const c5 = candlesSinteticos(12, T0);
  assert.equal(agregar15(c5).length, 4);
  assert.equal(agregar15(c5.slice(1)).length, 3, "balde incompleto é descartado");

  const c = candlesSinteticos(4000, T0);
  const t = Date.now();
  const r = await replayPar({ par: "EUR/USD", c5: c, configuracao: CONFIG, passo: 3 });
  const seg = (Date.now() - t) / 1000;
  console.log(`replay sintético: ${r.avaliadas} barras em ${seg.toFixed(1)} s (${(1000 * seg / r.avaliadas).toFixed(1)} ms/barra), ${r.analises.length} análises, ${r.aprovacoes} aprovadas`);
  assert.ok(r.avaliadas > 200 && r.analises.length > 100, "o pipeline real roda e registra análises");
  assert.ok(typeof Date.now() === "number" && Date.now() > 1.7e12 && Date.now() < 3e12, "Date.now restaurado");
  const a0 = r.analises[0];
  assert.ok(a0.timestamp >= T0 + 499 * 300000 && a0.par === "EUR/USD" && a0.indicadores && "aprovado" in a0, "formato de `analises`");
  assert.ok(r.analises.every((a, i) => i === 0 || a.timestamp > r.analises[i - 1].timestamp), "relógio simulado cresce");
  // cooldown: duas aprovações do par nunca ficam a menos de 30 min
  const ap = r.analises.filter(a => a.aprovado).map(a => a.timestamp);
  for (let i = 1; i < ap.length; i++) assert.ok(ap[i] - ap[i - 1] >= 30 * 60000, "cooldown respeitado");
  // alimenta o núcleo do laboratório com as análises do replay
  const cm = c.map(x => ({ timestamp: x.ts, open: x.o, high: x.h, low: x.l, close: x.c }));
  const out = processarPar({ par: "EUR/USD", analises: r.analises, abertas: [], ultimoLab: null, candles: cm, registradoEm: T0 + 2000 * 300000, agora: T0 + 5000 * 300000 });
  assert.ok(out.entradas.length > 0 && Object.keys(out.deltas).length > 0, "núcleo rotula as análises do replay");
  // ---- base de 1 minuto (pré-registro 6.45): agregação genérica e replay com baseMs = 60000 e companhia de 3 min
  assert.deepEqual(agregarN(c5, 300000, 3), agregar15(c5), "agregarN(5 min, 3) = agregar15");
  const m1 = candlesSinteticos(12, T0).map((x, i) => ({ ...x, ts: T0 + i * 60000 }));
  assert.equal(agregarN(m1, 60000, 3).length, 4, "12 velas de 1 min -> 4 de 3 min");
  assert.equal(agregarN(m1.slice(1), 60000, 3).length, 3, "balde incompleto de 3 min é descartado");
  const g = agregarN(m1, 60000, 3)[0];
  assert.ok(g.ts === T0 && g.o === m1[0].o && g.c === m1[2].c && g.h === Math.max(...m1.slice(0, 3).map(x => x.h)) && g.l === Math.min(...m1.slice(0, 3).map(x => x.l)), "OHLC do balde de 3 min");
  const c1 = candlesSinteticos(6000, T0).map((x, i) => ({ ...x, ts: T0 + i * 60000 }));
  const r1 = await replayPar({ par: "EUR/USD", c5: c1, configuracao: CONFIG, passo: 5, baseMs: 60000, razao: 3, janelaSimulacao: 20000 });
  assert.ok(r1.avaliadas > 200 && r1.analises.length > 200, "o pipeline real roda sobre velas de 1 minuto");
  assert.ok(r1.analises[0].timestamp >= T0 + 499 * 60000 && r1.analises[0].timestamp < T0 + 499 * 60000 + 6 * 60000, "relógio simulado usa a duração da vela BASE (1 min)");
  const ap1 = r1.analises.filter(a => a.aprovado).map(a => a.timestamp);
  for (let i = 1; i < ap1.length; i++) assert.ok(ap1[i] - ap1[i - 1] >= 30 * 60000, "cooldown de 30 min respeitado também em M1");
  console.log(`replay M1 sintético: ${r1.avaliadas} barras, ${r1.analises.length} análises, ${r1.aprovacoes} aprovadas`);
  console.log("TESTES DO REPLAY PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
