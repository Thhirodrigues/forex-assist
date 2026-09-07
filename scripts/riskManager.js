// Usado apenas quando quem chama não informa um valor vindo de
// configuracoes/geral (ver configuracao.cooldown em scripts/scanner.js).
const COOLDOWN_MINUTOS_PADRAO = 30;

async function existeCooldown(db, par, minutos) {

    const cooldownMinutos =
        Number(minutos) || COOLDOWN_MINUTOS_PADRAO;

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
        Date.now() - cooldownMinutos * 60 * 1000;

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
