// Usado apenas quando quem chama não informa um valor vindo de
// configuracoes/geral (ver configuracao.cooldown em scripts/scanner.js).
const COOLDOWN_MINUTOS_PADRAO = 30;

// PENTE-FINO-003 (10/09/2026): existeCooldown() só checava "a última
// operação deste par foi aberta há menos de X minutos?" - nunca
// checava se essa última operação ainda estava ABERTA. Como o
// cooldown conta a partir da ABERTURA (não do fechamento), um par
// cujo TP/SL demorasse mais que o cooldown pra bater (bem provável,
// com TP/SL de $3 e lote pequeno) ficava livre pra abrir uma SEGUNDA
// posição simultânea assim que o timer passasse - confirmado em
// produção no mesmo dia: USD/JPY e AUD/USD acumularam 2 operações
// ABERTA cada, simultaneamente. Cada uma calcula risco isoladamente
// contra a banca total - nada soma a exposição real quando há mais
// de uma posição aberta no mesmo par. Usuário pediu explicitamente:
// cooldown deve bloquear enquanto o sinal aprovado ainda estiver em
// andamento, não só por tempo.
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

    // Bloqueia enquanto a última operação deste par ainda não fechou,
    // não importa há quanto tempo foi aberta - evita empilhar
    // posições simultâneas no mesmo par.
    if (ultima.status === "ABERTA") {
        return true;
    }

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
