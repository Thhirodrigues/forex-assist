const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { montarRegras } = require("./publicar-regras");
const fonte = fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8");

// o repositório nunca contém token, só o marcador
assert.ok(fonte.includes("__XM_TOKEN__"));
// sem token: bloco removido, sem marcador, o resto continua
const sem = montarRegras(fonte, "");
assert.ok(!sem.includes("xm_conta") && !sem.includes("__XM_TOKEN__") && !sem.includes("XM_INICIO"));
assert.ok(sem.includes("match /placar/{doc}") && sem.includes("allow read, write: if false;"));
// com token: marcador trocado, leitura e exclusão negadas, comentários de marcação removidos
const T = "abcDEF0123456789_-xyz";
const com = montarRegras(fonte, T);
assert.ok(com.includes(`request.resource.data.t == '${T}'`));
assert.ok(!com.includes("__XM_TOKEN__") && !com.includes("XM_INICIO") && !com.includes("XM_FIM"));
assert.ok(/match \/xm_conta\/\{doc\}[\s\S]*allow read, delete: if false;/.test(com));
// a regra genérica de bloqueio continua DEPOIS (último recurso)
assert.ok(com.indexOf("match /{document=**}") > com.indexOf("match /xm_conta"));
// token fraco ou com aspas é recusado (evita quebrar/injetar nas regras)
assert.throws(() => montarRegras(fonte, "curto"));
assert.throws(() => montarRegras(fonte, "aaaaaaaaaaaaaaaa' || true || '"));
console.log("TODOS OS TESTES DAS REGRAS DO LAB PASSARAM");
