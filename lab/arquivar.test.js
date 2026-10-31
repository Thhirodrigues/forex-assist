const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exportar, plano } = require("./arquivar");

assert.deepStrictEqual(plano({ a: 1, b: [1, { c: Buffer.from("oi") }], d: { toDate: () => new Date(0) }, e: null }), { a: 1, b: [1, { c: { _bytes: Buffer.from("oi").toString("base64") } }], d: "1970-01-01T00:00:00.000Z", e: null });

const dados = { entradas: [{ id: "x", data: { a: 1 } }, { id: "y", data: { a: 2 } }], resumo: [], controle: [{ id: "c", data: { ok: true } }], diario: [{ id: "d", data: { k: "v" } }] };
const lab = { collection: (n) => ({ get: async () => ({ forEach: (f) => (dados[n] || []).forEach(d => f({ id: d.id, data: () => d.data })) }) }) };
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "arq-"));
(async () => {
    const r = await exportar({ lab, pasta, log: () => {} });
    assert.deepStrictEqual(r, { entradas: 2, resumo: 0, controle: 1, diario: 1 });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(pasta, "entradas.json"))), [{ id: "x", a: 1 }, { id: "y", a: 2 }]);
    assert.ok(JSON.parse(fs.readFileSync(path.join(pasta, "_resumo.json"))).exportadoEm);
    console.log("TESTES DO ARQUIVO DO LAB PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
