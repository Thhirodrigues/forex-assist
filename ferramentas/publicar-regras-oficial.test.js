const assert = require("assert");
const { validarUid, regrasProtegidas, regrasAbertas } = require("./publicar-regras-oficial");

const UID = "AbCdEfGhIjKlMnOpQrStUvWxYz12";
const r = regrasProtegidas(UID);
assert.ok(r.includes(`request.auth.uid == '${UID}'`) && r.includes("request.auth != null"), "só o UID do dono, e exige login");
assert.ok(!/if true/.test(r), "nada aberto");
assert.ok(/allow read, write: if dono\(\)/.test(r) && /match \/\{document=\*\*\}/.test(r), "cobre TODAS as coleções");
assert.strictEqual((r.match(/allow /g) || []).length, 1, "uma única regra de permissão");
for (const ruim of ["", "abc", "x".repeat(19), "a b c d e f g h i j k l", "'; allow read: if true; //".padEnd(25, "a"), "../../etc/passwd", UID + "'", undefined]) {
  assert.throws(() => regrasProtegidas(ruim), /UID inválido/, `recusa UID ruim: ${String(ruim).slice(0, 20)}`);
}
assert.strictEqual(validarUid(UID), UID);
assert.ok(/if true/.test(regrasAbertas()) && /EMERGÊNCIA/.test(regrasAbertas()));
console.log("TESTES DAS REGRAS OFICIAIS PASSARAM");
