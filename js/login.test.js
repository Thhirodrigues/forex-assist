// lógica pura do login (mensagens e validação)
const assert = require("assert");
const L = require("./login");
assert.strictEqual(L.EXIGIR_LOGIN, false, "etapa 1: o app ainda abre sem login (vira true junto com as regras)");
assert.strictEqual(L.validarEntrada("a@b.com", "123456").ok, true);
assert.strictEqual(L.validarEntrada(" a@b.com ", "123456").email, "a@b.com", "tira espaços");
assert.strictEqual(L.validarEntrada("sem-arroba", "123456").ok, false);
assert.strictEqual(L.validarEntrada("a@b.com", "123").ok, false);
assert.match(L.mensagemErro({ code: "auth/invalid-credential" }), /incorretos/);
assert.match(L.mensagemErro({ code: "auth/too-many-requests" }), /Muitas tentativas/);
assert.match(L.mensagemErro({ code: "auth/operation-not-allowed" }), /Sign-in method/);
assert.match(L.mensagemErro({ code: "auth/xyz" }), /auth\/xyz/);
assert.strictEqual(L.esc('<img src=x onerror="a">'), "&lt;img src=x onerror=&quot;a&quot;&gt;", "e-mail/UID nunca viram HTML");
console.log("TESTES DO LOGIN (lógica) PASSARAM");
