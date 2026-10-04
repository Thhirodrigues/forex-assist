// Publica lab/firestore.rules no projeto forex-assist-lab (SÓ o projeto do laboratório).
// Mesmo efeito de colar as regras no Console do Firebase.
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

(async () => {
    const app = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab");
    const fonte = fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8");
    const resp = await admin.securityRules(app).releaseFirestoreRulesetFromSource(fonte);
    console.log(`Regras publicadas: ${resp.name} (criadas em ${resp.createTime})`);
})().catch(e => { console.error("ERRO ao publicar regras:", e.message); process.exit(1); });
