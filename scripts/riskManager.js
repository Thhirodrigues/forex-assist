const { obterPerfilFinanceiro } = require("./moneyManager");

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

            // MUD-04 (17/09/2026): toLocaleString("pt-BR") formata no
            // padrão brasileiro mas usa o fuso do RUNTIME - no GitHub
            // Actions é UTC, não Brasília. O campo "horario" parecia
            // horário de Brasília mas ficava consistentemente 3h
            // adiantado (confirmado comparando com o `timestamp` epoch,
            // esse sempre correto, do mesmo documento). Não era atraso
            // de execução - era rótulo errado.
            horario: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),

            timestamp

        });

}

// ===================================================
// LIMITE DE RISCO DIÁRIO / DISJUNTOR DE LOSSES CONSECUTIVOS
// ===================================================
//
// PERFIL_FINANCEIRO (moneyManager.js) já define, por perfil,
// `riscoDiario` (% da banca) e `perdasConsecutivas` desde a sprint
// original - mas nenhum gate os lia. Busquei em todo o repositório:
// não existia nada que impedisse o sistema de continuar abrindo
// operações depois de uma sequência de losses, nem depois que a
// perda acumulada do dia já tivesse passado do teto do perfil. Um
// dia ruim (a manhã real de 6x0 do modo Agressivo, por exemplo) não
// tinha nenhum freio estrutural - só parava quando a janela
// operacional fechava ou o saldo acabava. Prioridade nº 1 apontada
// em ambos os relatórios de auditoria estratégica (13-15/09/2026).
//
// ===================================================

// Formata um timestamp (epoch ms, UTC real) como "YYYY-MM-DD" no
// fuso de Brasília - usado só pra COMPARAR datas por igualdade de
// string, nunca pra fazer aritmética de epoch entre fusos (mesmo
// cuidado de obterAgoraBrasil() em scripts/scanner.js - misturar
// epoch com componentes de wall-clock de outro fuso já causou bug
// neste projeto antes).
function diaBrasiliaDe(timestampMs) {

    return new Date(timestampMs).toLocaleDateString(
        "en-CA",
        { timeZone: "America/Sao_Paulo" }
    );

}

// Quantos fechamentos recentes olhar pra decidir perda diária +
// streak. Uma ÚNICA consulta cobre os dois: "1 igualdade (status) +
// 1 orderBy (fimOperacao)" é o mesmo formato de existeCooldown() -
// única combinação já confirmada funcionando neste projeto sem
// índice composto manual no Firestore. A primeira versão desta
// função usava `where("fimOperacao", ">=", desde)` junto - isso
// PARECIA correto e passou limpo no teste isolado com db falso, mas
// falhou em produção de verdade com "FAILED_PRECONDITION: The query
// requires an index" (13-15/09/2026) - índice composto que não
// existe e que este projeto não gerencia como código. Corrigido
// trocando o filtro por range por um LIMIT generoso, com o corte por
// dia feito em JS (mesma técnica seletiva por string de data já
// usada em diaBrasiliaDe). 200 cobre o volume atual (36 operações
// fechadas em TODO o histórico até agora) com folga enorme - revisar
// se o volume diário real algum dia se aproximar disso.
const LIMITE_CONSULTA_RECENTES = 200;

async function limiteDiarioAtingido(db, perfil, banca) {

    const { riscoDiario, perdasConsecutivas } =
        obterPerfilFinanceiro(perfil);

    const snapshot = await db
        .collection("historico")
        .where("status", "==", "ENCERRADA")
        .orderBy("fimOperacao", "desc")
        .limit(LIMITE_CONSULTA_RECENTES)
        .get();

    const fechadasRecentes = snapshot.docs
        .map(doc => doc.data())
        .filter(d => typeof d.fimOperacao === "number");

    // --- 1. Perda líquida acumulada HOJE (Brasília) ---
    const hojeBrasilia = diaBrasiliaDe(Date.now());

    const fechadosHoje = fechadasRecentes.filter(d =>
        diaBrasiliaDe(d.fimOperacao) === hojeBrasilia
    );

    // Líquido, não só a soma dos LOSS - um WIN no mesmo dia abate a
    // perda acumulada, igual qualquer limite de perda diária real de
    // gestão de risco (não é "perdeu X vezes", é "o saldo do dia caiu
    // X%").
    const resultadoLiquidoHoje = fechadosHoje.reduce((soma, d) => {

        const rf = d.resultadoFinanceiro ?? d.lucroAtual;

        return soma + (typeof rf === "number" ? rf : 0);

    }, 0);

    const limiteRiscoDiarioUSD =
        -Math.abs((riscoDiario / 100) * Number(banca || 0));

    if (resultadoLiquidoHoje <= limiteRiscoDiarioUSD) {

        return {

            bloqueado: true,

            motivo: "RISCO_DIARIO_ATINGIDO",

            mensagem:
                `Perda líquida do dia (US$ ${resultadoLiquidoHoje.toFixed(2)}) ` +
                `atingiu o limite de ${riscoDiario}% da banca ` +
                `(US$ ${limiteRiscoDiarioUSD.toFixed(2)}) do perfil ${perfil}. ` +
                `Novas operações bloqueadas até virar o dia (horário de Brasília).`

        };

    }

    // --- 2. Losses consecutivos (entre TODOS os pares) ---
    const ultimasFechadas = fechadasRecentes.slice(0, perdasConsecutivas);

    const streakCompleto =
        ultimasFechadas.length === perdasConsecutivas &&
        ultimasFechadas.every(d => d.resultado === "LOSS");

    if (streakCompleto) {

        return {

            bloqueado: true,

            motivo: "LOSSES_CONSECUTIVOS",

            mensagem:
                `${perdasConsecutivas} operações fechadas em sequência ` +
                `resultaram em LOSS (perfil ${perfil}). Novas operações ` +
                `bloqueadas até essa sequência ser quebrada por um WIN.`

        };

    }

    return { bloqueado: false };

}

module.exports = {

    existeCooldown,

    salvarOperacao,

    limiteDiarioAtingido,

    diaBrasiliaDe

};
