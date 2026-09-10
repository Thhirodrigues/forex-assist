// ===================================================
// LIMPEZA DA COLEÇÃO HISTORICO
// ===================================================

const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(
    fs.readFileSync(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        "utf8"
    )
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function limparHistorico() {

    console.log("====================================");
    console.log("FOREX ASSIST");
    console.log("LIMPANDO FIRESTORE");
    console.log("====================================");

    const snapshot =
        await db.collection("historico").get();

    if (snapshot.empty) {

        console.log("Coleção já está vazia.");
        return;

    }

    // LIMPEZA-006 (10/09/2026): db.batch() aceita no máximo 500
    // operações por commit - com o histórico crescendo (450+ hoje),
    // rodar isso sem dividir em lotes ia começar a falhar assim que
    // passasse de 500 documentos. Processa em lotes de até 500,
    // um commit por lote.
    const TAMANHO_LOTE = 500;
    const docs = snapshot.docs;
    let removidos = 0;

    for (let i = 0; i < docs.length; i += TAMANHO_LOTE) {

        const lote = docs.slice(i, i + TAMANHO_LOTE);
        const batch = db.batch();

        lote.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        removidos += lote.length;

        console.log(`Lote ${Math.floor(i / TAMANHO_LOTE) + 1}: ${lote.length} removidos (${removidos}/${docs.length})`);

    }

    console.log("------------------------------------");
    console.log(`Registros removidos: ${removidos}`);
    console.log("LIMPEZA CONCLUÍDA");
    console.log("------------------------------------");

}

limparHistorico()
.then(() => process.exit(0))
.catch(err => {

    console.error(err);

    process.exit(1);

});
