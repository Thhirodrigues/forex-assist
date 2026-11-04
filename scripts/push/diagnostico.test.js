const assert = require("assert");
const { resumirTokens, navegador, curto } = require("./diagnostico");
const ts = (ms) => ({ toMillis: () => ms });
const AGORA = Date.UTC(2026, 10, 4, 15, 0);
const r = resumirTokens([
    { id: "TOKEN_A_SECRETO", ativo: true, criadoEm: ts(AGORA - 30 * 60000), dispositivo: "Mozilla/5.0 (Linux; Android 14; 23113RKC6G) AppleWebKit Chrome/120.0 Mobile Safari/537.36 HyperOS" },
    { id: "TOKEN_B", ativo: false, criadoEm: ts(AGORA - 10 * 60000), dispositivo: "Mozilla/5.0 (Windows NT 10.0) Chrome/120" },
    { id: "TOKEN_C", ativo: true, dispositivo: "" }
], AGORA);
assert.strictEqual(r.total, 3); assert.strictEqual(r.ativos, 2);
assert.strictEqual(r.dispositivos[0].registradoHaMin, 10, "mais recente primeiro");
assert.strictEqual(r.dispositivos[2].registradoHaMin, null, "sem data de registro");
assert.ok(!JSON.stringify(r).includes("TOKEN_A_SECRETO"), "o token nunca aparece, só o hash curto");
assert.strictEqual(r.dispositivos.find(d => d.id === curto("TOKEN_A_SECRETO")).dispositivo, "Android/Chrome/Xiaomi");
assert.strictEqual(navegador("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/605"), "iOS/Safari");
assert.strictEqual(navegador(undefined), "?/?");
console.log("TODOS OS TESTES DO DIAGNÓSTICO DE PUSH PASSARAM");
