const assert = require("assert");
const { empacotar, desempacotar, replayETudo, publicarReplay, sanos } = require("./replay-run");

// ida e volta da compactação (inclui mais de um pedaço)
const base = Date.UTC(2026, 8, 7, 0, 0, 0);   // segunda
const cs = Array.from({ length: 8500 }, (_, i) => ({ ts: base + i * 300000, o: 1.1 + i * 1e-6, h: 1.1002 + i * 1e-6, l: 1.0998 + i * 1e-6, c: 1.1001 + i * 1e-6 }));
const ch = empacotar(cs);
assert.equal(ch.length, 2); assert.equal(ch[0].n, 8000); assert.equal(ch[1].n, 500);
assert.ok(ch.every(c => Buffer.isBuffer(c.dados)), "binário: 1 entrada de índice, não 40 mil");
assert.deepEqual(desempacotar([ch[1], ch[0]]), cs, "ordem dos pedaços não importa; nada se perde");
assert.ok(ch[0].dados.length < 900 * 1024, "um pedaço cabe folgado em 1 MB");
// formato antigo (array de números) ainda é lido
assert.deepEqual(desempacotar([{ k: 0, dados: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }]), [{ ts: 1, o: 2, h: 3, l: 4, c: 5 }, { ts: 6, o: 7, h: 8, l: 9, c: 10 }]);
// candles fora do mercado ou quebrados saem
const sab = Date.UTC(2026, 8, 12, 12, 0, 0);
assert.equal(sanos([{ ts: sab, o: 1, h: 1, l: 1, c: 1 }, { ts: base + 36e5, o: 1, h: 1.1, l: 0.9, c: 1 }, { ts: base + 36e5, o: 1, h: 0.9, l: 1.1, c: 1 }]).length, 1);

// passeio sintético, 2 pares, replay completo com Firestore falso
function sint(n, semente) { let x = semente, p = 1.1; const r = () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return Array.from({ length: n }, (_, i) => { const o = p, c = o + Math.sin(i / 200) * 0.00006 + (r() - 0.5) * 0.0004; p = c; return { ts: base + i * 300000, o, h: Math.max(o, c) + r() * 0.0002, l: Math.min(o, c) - r() * 0.0002, c }; }); }
const docs = {};
const lab = { collection: (nome) => ({ get: async () => ({ docs: Object.entries(docs[nome] || {}).map(([id]) => ({ ref: { delete: async () => { delete docs[nome][id]; } } })) }),
  doc: (id) => ({ set: async (v) => { (docs[nome] = docs[nome] || {})[id] = v; } }) }) };
const ler = async ({ par }) => sint(3000, par === "EUR/USD" ? 3 : 9);
(async () => {
  const config = { perfil: "conservador", cooldown: 30, lote: 0.02, tp: 5, sl: 5, saldoSimulado: 1000, candles: 500 };
  const res = await replayETudo({ lab, config, pares: ["EUR/USD", "GBP/USD"], split: 0.7, passo: 3, log: () => {}, ler });
  assert.ok(res.totais.analises > 50 && res.entradas > 0 && res.linhas.length > 100);
  assert.ok(res.linhas.some(l => l.epoca === "pre") && res.linhas.some(l => l.epoca === "pos"), "as duas épocas (exploração e validação)");
  assert.ok(res.deriva && res.deriva.pre["EUR/USD"] !== undefined && res.deriva.pos["EUR/USD"] !== undefined && !("GBP/JPY" in res.deriva.pre), "deriva do dólar por época (controle)");
  assert.ok(res.linhas.some(l => l.tipo === "OFICIAL_TETO1") && res.linhas.every(l => "ab" in l));
  const n = await publicarReplay({ lab, resultado: res, params: { dias: 1 }, agora: 5 });
  assert.equal(docs.replay.atual.docsDeLinhas, n);
  const total = Object.keys(docs.replay).filter(k => k.startsWith("linhas_")).reduce((s, k) => s + docs.replay[k].linhas.length, 0);
  assert.equal(total, res.linhas.length, "nenhuma linha perdida na publicação em pedaços");
  // famílias de sinal sobre os mesmos candles
  assert.ok(res.barreiras["EUR/USD"] > 0 && res.porPar["EUR/USD"].length === 3000, "barreira por par e candles devolvidos");
  const fam = await require("./replay-run").familiasETudo({ porPar: res.porPar, barreiras: res.barreiras, splitTs: res.splitTs, fim: res.fim, log: () => {} });
  assert.deepEqual(Object.keys(fam), ["F1", "F2", "F3", "F4", "C0"]);
  assert.ok(fam.C0.nSinais > 5 && fam.C0.linhas.some(l => l.variante === "ATUAL" && l.n > 0 && Number.isFinite(l.pips2)));
  assert.ok(fam.C0.linhas.every(l => ["ATUAL", "ATUAL_SEM_SPREAD", "INVERSO", "ALEATORIO"].includes(l.variante)), "só as variantes pré-registradas");
  // estender para trás: só baixa o que falta, mescla sem duplicar e mantém a ordem
  const { estenderHistorico } = require("./replay-run");
  const guardado = {};
  const labE = { collection: () => ({ where: () => ({ get: async () => ({ docs: Object.keys(guardado).map(id => ({ ref: { delete: async () => { delete guardado[id]; } } })) }) }), doc: (id) => ({ set: async (v) => { guardado[id] = v; } }) }) };
  const base0 = Date.UTC(2026, 3, 7, 5, 0, 0);   // terça, mercado aberto
  const existentes = sint(800, 5).map((c, i) => ({ ...c, ts: base0 + i * 300000 }));
  const chamadas = [];
  const baixarFalso = async ({ agora }) => {
    chamadas.push(agora);
    const novos = Array.from({ length: 300 }, (_, i) => ({ ts: base0 - (300 - i) * 300000, o: 1, h: 1.001, l: 0.999, c: 1 }));
    return { candles: [...novos, existentes[0]], parou: "ok" };   // devolve também um candle que já existia (duplicado)
  };
  await estenderHistorico({ lab: labE, pares: ["EUR/USD"], ateDias: 400, chave: "k", agora: base0 + 800 * 300000, log: () => {}, baixar: baixarFalso, ler: async () => existentes });
  assert.equal(chamadas.length, 1); assert.equal(chamadas[0], existentes[0].ts - 1000, "pede só o que vem ANTES do que já existe");
  const mesclado = require("./replay-run").desempacotar(Object.values(guardado));
  assert.equal(mesclado.length, 800 + 300, "300 novos + 800 antigos, sem duplicar");
  assert.ok(mesclado.every((c, i) => i === 0 || c.ts > mesclado[i - 1].ts), "ordenado do mais antigo ao mais novo");
  // já cobre o período: não baixa
  chamadas.length = 0;
  await estenderHistorico({ lab: labE, pares: ["EUR/USD"], ateDias: 1, chave: "k", agora: base0 + 800 * 300000, log: () => {}, baixar: baixarFalso, ler: async () => existentes });
  assert.equal(chamadas.length, 0);
  console.log(`TESTES DO REPLAY (orquestração) PASSARAM — ${res.linhas.length} linhas, ${res.entradas} entradas`);
})().catch(e => { console.error(e); process.exit(1); });
