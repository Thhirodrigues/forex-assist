const COOLDOWN_MINUTOS = 30;

async function existeCooldown(db, par) {

    const snapshot = await db
        .collection("historico")
        .where("par", "==", par)
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

    if (snapshot.empty)
        return false;

    const ultima = snapshot.docs[0].data();

    const limite =
        Date.now() - COOLDOWN_MINUTOS * 60 * 1000;

    return Number(ultima.timestamp) > limite;

}

async function salvarOperacao(db, dados) {

    await db
        .collection("historico")
        .add({

            ...dados,

            horario: new Date().toLocaleString("pt-BR"),

            timestamp: Date.now()

        });

}

module.exports = {

    existeCooldown,

    salvarOperacao

};
