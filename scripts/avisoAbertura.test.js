// Aviso de novo sinal: direção PRIMEIRO no título (+ bolinha colorida) e vibração longa só para abertura (sw.js).
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const { montarAvisoAbertura } = require("./pushNotifier");

const base = { par: "EUR/USD", direcao: "BUY", precoEntrada: 1.1241, score: 78, inicioOperacao: Date.UTC(2026, 10, 4, 12, 30) };
const c = montarAvisoAbertura(base, 20, 45);
assert.strictEqual(c.title, "🟢 COMPRA EUR/USD");
assert.ok(c.title.startsWith("🟢 COMPRA"), "direção no começo: cortar o fim do título não perde COMPRA/VENDA");
assert.match(c.body, /^Novo sinal \| Entrada ~1\.1241 \| Score 78% \| Janela pra agir: 20-45 min/);
assert.match(c.body, /\n🕐 Sinal emitido às /);
const v = montarAvisoAbertura({ ...base, direcao: "SELL", par: "USD/JPY" }, 10, 30);
assert.strictEqual(v.title, "🔴 VENDA USD/JPY");
assert.ok(v.title.length <= 24, "título curto o bastante para não ser cortado");
assert.ok(!/\n🕐/.test(montarAvisoAbertura({ ...base, inicioOperacao: undefined }, 1, 2).body), "sem horário, sem linha de horário");

// sw.js de verdade (sem navegador): vibra longo no push de abertura, não vibra nos outros
function rodarPush(payload) {
    const handlers = {}, mostradas = [];
    const self = {
        addEventListener: (nome, fn) => { handlers[nome] = fn; },
        registration: { showNotification: (titulo, opcoes) => { mostradas.push({ titulo, opcoes }); return Promise.resolve(); } },
        skipWaiting: () => {}, clients: { claim: () => Promise.resolve() }
    };
    const ctx = vm.createContext({ self, caches: { open: async () => ({ addAll: async () => {}, put: async () => {} }), keys: async () => [], delete: async () => true, match: async () => null }, fetch: async () => ({}), console, URL, Promise });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"), ctx);
    assert.ok(handlers.push, "sw.js registra o listener de push");
    handlers.push({ data: { json: () => payload, text: () => "" }, waitUntil: () => {} });
    return mostradas[0];
}
const abertura = rodarPush({ notification: { title: c.title, body: c.body }, data: { tipo: "abertura", url: "https://my.xm.com/pt/x", emitidoEm: "1790000000000" } });
assert.strictEqual(abertura.titulo, "🟢 COMPRA EUR/USD");
assert.deepStrictEqual(Array.from(abertura.opcoes.vibrate), [1200, 300, 1200, 300, 1200]);
assert.ok(abertura.opcoes.vibrate.reduce((a, b) => a + b, 0) >= 3000, "vibração longa (>= 3 s)");
const encerra = rodarPush({ notification: { title: "✅ Encerrado", body: "x" }, data: { tipo: "encerramento" } });
assert.strictEqual(encerra.opcoes.vibrate, undefined, "encerramento não vibra longo");
const semTipo = rodarPush({ notification: { title: "t", body: "b" } });
assert.strictEqual(semTipo.opcoes.vibrate, undefined);
console.log("TODOS OS TESTES DO AVISO DE NOVO SINAL PASSARAM");
