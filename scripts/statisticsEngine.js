// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// STATISTICS ENGINE
//
// Responsabilidade:
// Calcular estatísticas históricas para auxiliar
// a Engine RMI.
//
// SPRINT 05
// ===================================================

// Amostra mínima para o histórico influenciar o score com confiança.
// Elevado de 10 para 30 em 07/09/2026: auditoria do histórico de julho
// mostrou pares com 1-5 operações recebendo peso significativo no score
// (bônus/penalidade de até 15 pontos) com base estatisticamente
// insignificante. Ver BUG-007/achado de saldo em DOCUMENTACAO/ENGINEERING.md.
const OPERACOES_MINIMAS_HISTORICO = 30;

// BUG-017 (08/09/2026): amostra máxima buscada/considerada. Igual ao
// denominador da fórmula de confiabilidade em historyAnalyzer.js
// (confiabilidade = min(100, operacoes/50*100)) - com essa amostra
// menor que 50, a confiabilidade nunca chegaria a 100%, não importa
// quanto histórico real existisse. Também resolve, na prática, o
// mínimo de 30 acima: antes a amostra usada nos cálculos era
// SEMPRE 10 (ver correção abaixo), tornando >=30 estruturalmente
// impossível de atingir, mesmo com histórico real muito maior.
const AMOSTRA_MAXIMA_HISTORICO = 50;

// Hierarquia de rigor entre perfis operacionais (ver PERFIL_ANALISE em
// scripts/decisionEngine.js). Cada operação salva em "historico" é
// gravada com o perfil que a aprovou (scripts/pairAnalyzer.js). Sem
// filtro, o pool estatístico de um par ficava compartilhado entre os 3
// perfis: uma operação aberta pelo Agressivo (barra mais baixa, sem
// exigir multi-timeframe) virava "evidência" também para o Balanceado e
// o Conservador, que nunca teriam aprovado aquele mesmo sinal.
//
// Regra: uma operação só conta como evidência para o perfil ATUAL se
// foi aprovada por um perfil igualmente ou mais rigoroso. Conservador só
// aprende com o que o próprio Conservador aprovou; Agressivo aprende com
// tudo (é o mais permissivo, então qualquer evidência mais rigorosa
// ainda é válida pra ele).
const RIGOR_PERFIL = {
    AGRESSIVO: 1,
    BALANCEADO: 2,
    CONSERVADOR: 3
};

function operacaoAtendeRigorDoPerfil(perfilOperacao, perfilAtual) {

    const rigorOperacao =
        RIGOR_PERFIL[(perfilOperacao || "BALANCEADO").toUpperCase()] ||
        RIGOR_PERFIL.BALANCEADO;

    const rigorAtual =
        RIGOR_PERFIL[(perfilAtual || "BALANCEADO").toUpperCase()] ||
        RIGOR_PERFIL.BALANCEADO;

    return rigorOperacao >= rigorAtual;

}

async function obterEstatisticasPar(
    db,
    par,
    perfilAtual
) {
    // BUG-017: a consulta buscava TODO o histórico do par, sem limite
    // - Firestore cobra 1 leitura por documento retornado, então isso
    // crescia (e custava mais) a cada operação nova salva, para
    // sempre. Com orderBy + limit, a consulta reusa o mesmo índice
    // composto (par + timestamp) que scripts/riskManager.js's
    // existeCooldown() já usa em produção há tempos, e o custo por
    // consulta se estabiliza em no máximo AMOSTRA_MAXIMA_HISTORICO
    // leituras, para sempre, não importa quanto histórico se acumule.
    //
    // O filtro por perfil (operacaoAtendeRigorDoPerfil, abaixo) é
    // aplicado nesta amostra já buscada, não como where() adicional na
    // consulta - um novo where("perfil","in",[...]) aqui exigiria um
    // índice composto novo (par + perfil + timestamp) ainda não
    // provisionado no Firestore, e a primeira execução em produção
    // quebraria com erro de índice faltando até alguém criar
    // manualmente pelo link do console. Filtrar em memória evita esse
    // risco sem aumentar o custo de leitura (mesmo limit de sempre).
    const snapshot =
    await db
        .collection("historico")
        .where("par", "==", par)
        .orderBy("timestamp", "desc")
        .limit(AMOSTRA_MAXIMA_HISTORICO)
        .get();

    let wins = 0;
    let loss = 0;

    const operacoesHistorico = [];

snapshot.forEach(doc => {

    const dados = doc.data();

    if (
        (
            dados.resultado === "WIN" ||
            dados.resultado === "LOSS"
        ) &&
        operacaoAtendeRigorDoPerfil(dados.perfil, perfilAtual)
    ) {

        operacoesHistorico.push(dados);

    }

});

// BUG-017: antes disto havia um .sort() aqui, ordenando por
// "dataHora" - campo que NUNCA é gravado em lugar nenhum do código
// (confirmado por busca em todo o repositório). Comparando
// `undefined || 0` para todo documento, o sort sempre recebia 0 de
// diferença e nunca reordenava nada - as "últimas operações" usadas
// em todo o cálculo estatístico, desde sempre, eram uma ordem
// arbitrária do Firestore, não as mais recentes de verdade. Já não é
// mais necessário: orderBy("timestamp", "desc") acima já entrega os
// documentos ordenados corretamente, usando o campo que é
// efetivamente gravado por scripts/riskManager.js's salvarOperacao().
const ultimasOperacoes =
    operacoesHistorico;

// ===================================================
// STREAKS
// ===================================================

let winStreak = 0;
let lossStreak = 0;

for (const op of ultimasOperacoes) {

    if (op.resultado === "WIN") {

        if (lossStreak > 0) break;

        winStreak++;

    }

    else if (op.resultado === "LOSS") {

        if (winStreak > 0) break;

        lossStreak++;

    }

}
    
const historicoBUY =
    ultimasOperacoes.filter(
        op => op.direcao === "BUY"
    );

const historicoSELL =
    ultimasOperacoes.filter(
        op => op.direcao === "SELL"
    );
    
ultimasOperacoes.forEach(dados => {

    if (dados.resultado === "WIN")
        wins++;

    if (dados.resultado === "LOSS")
        loss++;

});

    const operacoes =
        wins + loss;

    const winsBUY =
    historicoBUY.filter(
        op => op.resultado === "WIN"
    ).length;

const lossBUY =
    historicoBUY.filter(
        op => op.resultado === "LOSS"
    ).length;

const taxaBUY =
    historicoBUY.length === 0
        ? 0
        : Number(
            (
                winsBUY * 100 /
                historicoBUY.length
            ).toFixed(1)
        );

const winsSELL =
    historicoSELL.filter(
        op => op.resultado === "WIN"
    ).length;

const lossSELL =
    historicoSELL.filter(
        op => op.resultado === "LOSS"
    ).length;

const taxaSELL =
    historicoSELL.length === 0
        ? 0
        : Number(
            (
                winsSELL * 100 /
                historicoSELL.length
            ).toFixed(1)
        );
// ===================================================
// CONFIABILIDADE DO HISTÓRICO
// ===================================================

const historicoSuficiente =
    operacoes >= OPERACOES_MINIMAS_HISTORICO;
    
    const taxaAcerto =
        operacoes === 0
            ? 0
            : Number(
                (
                    wins * 100 /
                    operacoes
                ).toFixed(1)
            );

// ===================================================
// CONFIANÇA ESTATÍSTICA
//
// Nota (BUG-017): `confianca` (ALTA/MÉDIA/BAIXA) não é lido em
// nenhum lugar do pipeline de decisão (confirmado por busca no
// repositório) - é campo informativo/morto. Com
// AMOSTRA_MAXIMA_HISTORICO=50, o patamar ALTA (>=100) ficou
// estruturalmente inatingível; não corrigido agora por não afetar
// nenhuma decisão real, só deixado registrado pra quem for mexer
// aqui no futuro.
// ===================================================

let confianca = "BAIXA";

if (operacoes >= 100) {

    confianca = "ALTA";

}

else if (operacoes >= 50) {

    confianca = "MÉDIA";

}

// ===================================================
// PESO ESTATÍSTICO
// ===================================================

let pesoEstatistico = taxaAcerto;

pesoEstatistico +=
    Math.min(
        operacoes,
        50
    ) * 0.4;

pesoEstatistico +=
    winStreak * 2;

pesoEstatistico -=
    lossStreak * 2;

pesoEstatistico =
    Math.max(
        0,
        Math.min(
            100,
            Number(
                pesoEstatistico.toFixed(1)
            )
        )
    );
    
// ===================================================
// CLASSIFICAÇÃO DO HISTÓRICO
// ===================================================

let status = "SEM_DADOS";

if (operacoes >= OPERACOES_MINIMAS_HISTORICO) {

    if (taxaAcerto >= 80) {

        status = "EXCELENTE";

    }

    else if (taxaAcerto >= 70) {

        status = "BOM";

    }

    else if (taxaAcerto >= 55) {

        status = "NEUTRO";

    }

    else {

        status = "RUIM";

    }

}
    
    return {

    wins,

    loss,

    operacoes,

    winStreak,

    lossStreak,

    historicoSuficiente,

    confianca,

    taxaAcerto,

    pesoEstatistico,

    status,

    resumo: {

    historico: status,

    confianca,

    pesoEstatistico,

    taxaAcerto,

    winStreak,

    lossStreak,

    historicoSuficiente

},

    BUY: {

    wins: winsBUY,

    loss: lossBUY,

    taxaAcerto: taxaBUY

},

SELL: {

    wins: winsSELL,

    loss: lossSELL,

    taxaAcerto: taxaSELL
},

    ultimos5: ultimasOperacoes.slice(0, 5),

    // BUG-017: antes era so `ultimasOperacoes` (que ja era o corte
    // de 10). Agora que ultimasOperacoes pode ter ate
    // AMOSTRA_MAXIMA_HISTORICO (50) itens, precisa do .slice(0, 10)
    // explicito pra continuar significando de verdade "ultimas 10".
    ultimos10: ultimasOperacoes.slice(0, 10),

};

}

module.exports = {

    obterEstatisticasPar,

    operacaoAtendeRigorDoPerfil

};
