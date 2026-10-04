const assert = require("assert");
const { diagnosticar } = require("./diagnostico-espelho");
const e = (tp, sl, d, i, a) => ({ tipo: "OFICIAL", tpPips: tp, slPips: sl, variantes: { ATUAL: { p: d }, INVERSO: { p: i }, ALEATORIO: { p: a } } });
const docs = [e(25, 25, 25, -25, 25), e(25, 25, -25, 25, -25), e(37.5, 25, -25, -25, 37.5), e(37.5, 25, 37.5, -25, -25)];
const lab = { collection: () => ({ where: () => ({ get: async () => ({ forEach: cb => docs.forEach(d => cb({ data: () => d })) }) }) }) };
(async () => {
  const logs = [];
  const r = await diagnosticar({ lab, log: m => logs.push(m) });
  assert.equal(r.simetricas, 2); assert.equal(r.assimetricas, 2);
  const t = logs.join("\n");
  assert.ok(/TP = SL \(simétricas\)\s+n=\s*2 \| direto 50.0%.*inverso 50.0%.*direto\+inverso = 100.0%/.test(t), t);
  assert.ok(/TP != SL \(assimétricas\)\s+n=\s*2 \| direto 50.0%.*inverso 0.0%.*direto\+inverso = 50.0%/.test(t), t);
  console.log("TESTE DO DIAGNÓSTICO DO ESPELHO PASSOU");
})().catch(e => { console.error(e); process.exit(1); });
