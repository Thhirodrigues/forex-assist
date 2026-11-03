// Publica lab/firestore.rules no projeto forex-assist-lab (SÓ o projeto do laboratório).
// Mesmo efeito de colar as regras no Console do Firebase.
// O bloco `xm_conta` (escrita pelo exportador MT5, com token) só entra se XM_INGEST_TOKEN estiver definido;
// o token vem do secret do GitHub e NUNCA fica no repositório.
const fs = require("fs");
const path = require("path");

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{16,128}$/;

function montarRegras(fonte, token) {
    const re = /[ \t]*\/\/XM_INICIO[\s\S]*?\/\/XM_FIM\n?/;
    if (!re.test(fonte)) throw new Error("marcadores XM_INICIO/XM_FIM não encontrados nas regras");
    if (!token) return fonte.replace(re, "");                      // sem token: o bloco sai e tudo continua bloqueado
    if (!TOKEN_VALIDO.test(token)) throw new Error("XM_INGEST_TOKEN inválido: use 16 a 128 caracteres entre letras, números, '-' e '_'");
    return fonte.replace(/__XM_TOKEN__/g, token).replace(/[ \t]*\/\/XM_(INICIO|FIM)\n/g, "");
}

module.exports = { montarRegras, TOKEN_VALIDO };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const app = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab");
        const bruto = fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8");
        const token = (process.env.XM_INGEST_TOKEN || "").trim();
        const fonte = montarRegras(bruto, token);
        console.log(token ? "Bloco xm_conta: INCLUÍDO (token do secret)." : "Bloco xm_conta: ausente (sem XM_INGEST_TOKEN) - nada pode ser gravado pelo exportador.");
        const resp = await admin.securityRules(app).releaseFirestoreRulesetFromSource(fonte);
        console.log(`Regras publicadas: ${resp.name} (criadas em ${resp.createTime})`);
    })().catch(e => { console.error("ERRO ao publicar regras:", e.message); process.exit(1); });
}
