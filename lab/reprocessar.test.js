const assert = require("assert");
const { reprocessar } = require("./reprocessar");
const cols = { entradas: { a: {}, b: {} }, resumo: { x: {} }, placar: { atual: {} }, controle: { rotulador: { registradoEm: 123, cursorGlobal: 9, cursorPar: { EUR_USD: 1 }, ultimoLab: {} } } };
const lab = {
  collection: (nome) => ({
    doc: () => ({ get: async () => ({ exists: !!cols[nome].rotulador, data: () => cols[nome].rotulador }),
      update: async (campos) => { for (const [k, v] of Object.entries(campos)) { if (v === "APAGAR") delete cols[nome].rotulador[k]; else cols[nome].rotulador[k] = v; } } }),
    limit: () => ({ get: async () => { const ids = Object.keys(cols[nome]); return { empty: !ids.length, size: ids.length, forEach: cb => ids.forEach(id => cb({ ref: { nome, id } })) }; } })
  }),
  batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => ops.forEach(r => delete cols[r.nome][r.id]) }; }
};
(async () => {
  await reprocessar({ lab, apagarCampo: () => "APAGAR", log: () => {} });
  assert.deepEqual(cols.entradas, {}); assert.deepEqual(cols.resumo, {}); assert.deepEqual(cols.placar, {});
  assert.equal(cols.controle.rotulador.registradoEm, 123, "a fronteira pre/pos é preservada");
  assert.ok(!("cursorGlobal" in cols.controle.rotulador) && !("cursorPar" in cols.controle.rotulador) && !("ultimoLab" in cols.controle.rotulador));
  // sem registradoEm: recusa (não apaga nada)
  const vazio = { entradas: { a: {} }, resumo: {}, placar: {}, controle: { rotulador: { cursorGlobal: 1 } } };
  Object.assign(cols, vazio);
  await assert.rejects(() => reprocessar({ lab, apagarCampo: () => "APAGAR", log: () => {} }), /registradoEm/);
  assert.ok(cols.entradas.a, "nada foi apagado");
  console.log("TESTE DO REPROCESSAMENTO PASSOU");
})().catch(e => { console.error(e); process.exit(1); });
