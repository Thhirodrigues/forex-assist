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

// LIMPEZA-005 (10/09/2026): .add() gera um ID aleatório opaco
// (letras/números sem sentido) - no Console do Firebase, sem nenhum
// where()/orderBy() aplicado manualmente, a listagem de documentos
// não segue ordem cronológica nenhuma, então "o sinal mais recente"
// aparecia em qualquer posição da lista, sem padrão. Trocado por um ID
// próprio: `${timestamp}_${par sanitizado}` - Date.now() sempre tem 13
// dígitos (até o ano ~2286), então ordena certo como STRING também,
// não só como número; o par no ID já deixa o documento identificável
// de relance no Console, sem precisar abrir cada um. par+timestamp
// juntos evitam colisão mesmo se dois pares diferentes salvarem no
// mesmo milissegundo (o mesmo par não colide - tem cooldown entre
// operações). Nenhum código lê doc.id esperando o formato antigo (só
// usa como identificador opaco em js/historico.js), então essa troca
// não quebra nada.
async function salvarOperacao(db, dados) {

    const timestamp = Date.now();

    const idDocumento =
        `${timestamp}_${String(dados.par).replace(/\//g, "_")}`;

    await db
        .collection("historico")
        .doc(idDocumento)
        .set({

            ...dados,

            horario: new Date().toLocaleString("pt-BR"),

            timestamp

        });

}

module.exports = {

    existeCooldown,

    salvarOperacao

};
