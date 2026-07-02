// ===================================================
// LIMPEZA DA COLEÇÃO HISTORICO
// RMI_V1 EXPERT
// ===================================================

const { db } = require("./firebase");

async function limparHistorico() {

    console.log("======================================");
    console.log("FOREX ASSIST");
    console.log("LIMPEZA DA BASE HISTÓRICA");
    console.log("======================================");

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

    console.log("--------------------------------------");
    console.log(`Registros removidos: ${snapshot.size}`);
    console.log("Base histórica limpa com sucesso.");
    console.log("--------------------------------------");

}

limparHistorico()
    .then(() => process.exit(0))
    .catch(err => {

        console.error(err);

        process.exit(1);

    });
