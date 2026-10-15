// Integração do "TP sem SL" (6.31): replay sintético -> Fase A/B -> publicação, com Firestore falso.
const assert = require("assert");
const { semslETudo, imprimirSemsl, publicarSemsl } = require("./replay-run");

const base = Date.UTC(2026, 8, 7, 0, 0, 0);   // segunda
function sint(n, semente) { let x = semente, p = 1.1; const r = () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return Array.from({ length: n }, (_, i) => { const o = p, c = o + Math.sin(i / 200) * 0.00006 + (r() - 0.5) * 0.0004; p = c; return { ts: base + i * 300000, o, h: Math.max(o, c) + r() * 0.0002, l: Math.min(o, c) - r() * 0.0002, c }; }); }
const docs = {};
const lab = { collection: (nome) => ({ get: async () => ({ docs: Object.entries(docs[nome] || {}).map(([id]) => ({ ref: { delete: async () => { delete docs[nome][id]; } } })) }),
  doc: (id) => ({ set: async (v) => { (docs[nome] = docs[nome] || {})[id] = v; }, get: async () => ({ exists: false }) }) }) };
const ler = async ({ par }) => sint(3000, par === "EUR/USD" ? 3 : 9);

(async () => {
  const config = { perfil: "conservador", cooldown: 30, lote: 0.02, tp: 5, sl: 5, saldoSimulado: 1000, candles: 500 };
  const r = await semslETudo({ lab, config, pares: ["EUR/USD", "GBP/USD"], split: 0.7, passo: 3, log: () => {}, ler });
  assert.strictEqual(r.comTaxas, false, "sem diario/_taxas: só o markup");
  const vs = new Set(r.linhasA.map(l => l.v));
  for (const v of ["V0_ATUAL", "V1_TP_T3", "V2_TP_T5", "V3_TP_T10", "V4_SL_3X", "V5_SL_5X"]) assert.ok(vs.has(v), "variante " + v);
  assert.ok(r.linhasA.some(l => l.ctrl) && r.linhasA.some(l => !l.ctrl && l.contraControle), "controle e diferença contra o controle");
  assert.ok(r.linhasA.some(l => l.tipo === "OFICIAL") && r.linhasA.some(l => l.tipo === "LAB"));
  // o V0 reproduz o ATUAL: acerto coerente e pior perda limitada ao stop
  const v0 = r.linhasA.find(l => l.v === "V0_ATUAL" && l.tipo === "LAB" && !l.ctrl && l.grupo === "TODOS");
  assert.ok(v0 && v0.n > 20 && v0.acerto >= 0 && v0.acerto <= 100);
  // sem stop: pior perda existe só quando há prazo; MAE nunca negativa
  for (const l of r.linhasA) if (l.mae) assert.ok(l.mae.p50 >= 0);
  assert.ok(r.linhasA.some(l => l.grupo === "com_GBP" && l.n > 0) && r.linhasA.some(l => l.grupo === "sem_GBP" && l.n > 0) && r.linhasA.some(l => l.grupo === "par_EUR_USD"), "recortes GBP e por par");
  assert.strictEqual(r.linhasB.length, 6 * 5 * 2, "6 variantes x 5 políticas x 2 contas");
  assert.ok(r.linhasB.every(l => l.janelas >= 0 && l.periodoTodo));
  const linhas = [];
  imprimirSemsl(r, (s) => linhas.push(s));
  assert.ok(linhas.some(s => s.includes("FASE A")) && linhas.some(s => s.includes("FASE B")));
  await publicarSemsl({ lab, r, params: { split: 0.7 }, agora: 7 });
  assert.ok(docs.replay.semsl.linhasA.length === r.linhasA.length && docs.replay.semsl.geradoEm === 7);
  assert.ok(JSON.stringify(docs.replay.semsl).length < 950 * 1024, "cabe em 1 documento do Firestore");
  console.log("TESTE DE INTEGRAÇÃO DO TP SEM SL PASSOU —", r.linhasA.length, "linhas A,", r.linhasB.length, "linhas B,", JSON.stringify(docs.replay.semsl).length, "bytes");
})().catch(e => { console.error(e); process.exit(1); });
