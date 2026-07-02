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

    const batch = db.batch();

    snapshot.forEach(doc => {

        batch.delete(doc.ref);

    });

    await batch.commit();

    console.log("------------------------------------");
    console.log(`Registros removidos: ${snapshot.size}`);
    console.log("LIMPEZA CONCLUÍDA");
    console.log("------------------------------------");

}

limparHistorico()
.then(() => process.exit(0))
.catch(err => {

    console.error(err);

    process.exit(1);

});
