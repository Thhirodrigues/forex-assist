// ===================================================
// FOREX ASSIST - LABORATÓRIO - REPROCESSAR (só no projeto LAB)
//
// Apaga os DADOS DERIVADOS do laboratório (`entradas`, `resumo`, `placar`) e zera os cursores, mantendo
// `controle/rotulador.registradoEm` (a fronteira pre/pos NÃO muda). Depois o rotulador, com backfill
// longo, refaz tudo a partir de `analises` (projeto oficial) usando o código ATUAL - útil quando se
// acrescenta variante/grupo e se quer o histórico recente com ela. Nada do projeto oficial é tocado.
// ===================================================

async function apagarColecao(lab, nome, log) {
    let total = 0;
    for (;;) {
        const snap = await lab.collection(nome).limit(400).get();
        if (snap.empty) break;
        const b = lab.batch();
        snap.forEach(d => b.delete(d.ref));
        await b.commit();
        total += snap.size;
    }
    log(`${nome}: ${total} documentos apagados`);
    return total;
}

async function reprocessar({ lab, apagarCampo, log = console.log }) {
    const ref = lab.collection("controle").doc("rotulador");
    const snap = await ref.get();
    if (!snap.exists || !snap.data().registradoEm) throw new Error("controle/rotulador sem registradoEm: nada a preservar, abortando");
    for (const nome of ["entradas", "resumo", "placar"]) await apagarColecao(lab, nome, log);
    await ref.update({ cursorGlobal: apagarCampo(), cursorPar: apagarCampo(), ultimoLab: apagarCampo() });
    log(`Cursores zerados; registradoEm mantido (${new Date(snap.data().registradoEm).toISOString()}).`);
}

module.exports = { reprocessar };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        await reprocessar({ lab, apagarCampo: () => admin.firestore.FieldValue.delete() });
    })().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
}
