// ===================================================
// Publica as regras do Firestore do projeto OFICIAL (forex-assist). Roda só pelo workflow regras-oficial.yml.
//  MODO=proteger  UID=<uid do dono>  -> só o dono (login e-mail/senha) lê e grava; qualquer outro é negado.
//  MODO=reverter                      -> volta a abrir (emergência: "allow read, write: if true").
// Os scripts do GitHub Actions usam credencial de administrador e ignoram estas regras.
// Antes de publicar, mostra o texto das regras ATUAIS (para poder voltar exatamente ao que era) e depois confere,
// por leitura anônima na API REST, se o resultado é o esperado (negado quando protegido; liberado quando revertido).
// ===================================================

const UID_VALIDO = /^[A-Za-z0-9]{20,40}$/;

function validarUid(uid) {
    if (!UID_VALIDO.test(String(uid || ""))) throw new Error("UID inválido: copie o UID da tela Config > Segurança da conta (letras e números, 20 a 40 caracteres).");
    return String(uid);
}

function regrasProtegidas(uid) {
    const u = validarUid(uid);
    return `rules_version = '2';

// Projeto forex-assist (oficial). Só o dono, autenticado por e-mail e senha (Firebase Authentication), lê e grava.
// Os robôs do GitHub Actions usam credencial de administrador, que ignora estas regras.
service cloud.firestore {
  match /databases/{database}/documents {
    function dono() {
      return request.auth != null && request.auth.uid == '${u}';
    }
    match /{document=**} {
      allow read, write: if dono();
    }
  }
}
`;
}

function regrasAbertas() {
    return `rules_version = '2';

// EMERGÊNCIA: regras abertas (revertidas pelo workflow regras-oficial). Proteger de novo assim que possível.
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
`;
}

module.exports = { validarUid, regrasProtegidas, regrasAbertas };

if (require.main === module) {
    (async () => {
        const fs = require("fs");
        const admin = require("firebase-admin");
        const modo = process.env.MODO;
        if (modo !== "proteger" && modo !== "reverter") throw new Error('MODO deve ser "proteger" ou "reverter"');
        const fonte = modo === "proteger" ? regrasProtegidas(process.env.UID_DONO) : regrasAbertas();

        const app = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccount.json")) });
        const rules = admin.securityRules(app);

        try {
            const atual = await rules.getFirestoreRuleset();
            console.log("=== REGRAS ATUAIS (antes desta publicação) ===");
            for (const f of atual.source) console.log(`--- ${f.name} ---\n${f.content}`);
            console.log("=== fim das regras atuais ===");
        } catch (e) { console.log(`Aviso: não consegui ler as regras atuais (${e.message}); sigo com a publicação.`); }

        const resp = await rules.releaseFirestoreRulesetFromSource(fonte);
        console.log(`Regras publicadas (${modo}): ${resp.name} (criadas em ${resp.createTime})`);

        // conferência por leitura ANÔNIMA (a mesma que qualquer pessoa na internet faria)
        const cfg = fs.readFileSync(require("path").join(__dirname, "..", "js", "firebase-config.js"), "utf8");
        const chave = /apiKey:\s*"([^"]+)"/.exec(cfg)[1], projeto = /projectId:\s*"([^"]+)"/.exec(cfg)[1];
        const esperado = modo === "proteger" ? 403 : 200;
        let status = null;
        for (let i = 0; i < 12; i++) {   // as regras levam alguns segundos para propagar
            const r = await fetch(`https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/scanner/mercado?key=${chave}`);
            status = r.status;
            if (status === esperado || (esperado === 200 && status === 404)) break;
            await new Promise(res => setTimeout(res, 5000));
        }
        console.log(`Leitura anônima de scanner/mercado: HTTP ${status} (esperado ${esperado}${esperado === 200 ? " ou 404" : ""})`);
        if (!(status === esperado || (esperado === 200 && status === 404))) throw new Error("A conferência anônima não bateu com o esperado.");
        console.log(modo === "proteger" ? "OK: o banco agora NEGA leitura anônima." : "OK: o banco voltou a ficar aberto (emergência).");
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
