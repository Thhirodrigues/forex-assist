// ======================================================
// SCORE ENGINE
// Forex Assist - RMI V2
// ======================================================

const ENGINE_WEIGHTS = {
    BONUS_EXCELENTE: 5,
    BONUS_BOA: 3,
    PENALIDADE_RUIM: 10,
    PENALIDADE_SEM_BASE: 5,
    PENALIDADE_DIVERGENCIA: 10,

    // MUD-05 (17/09/2026): peso inicial deliberadamente pequeno (mesma
    // ordem do BONUS_BOA) - revisão de literatura não encontrou
    // evidência revisada por pares de vantagem estatística própria de
    // conceitos SMC/ICT testados isoladamente. Camada secundária de
    // confirmação, nunca decisora sozinha: um order block não aprova
    // nem reprova operação nenhuma por si só. Valor inicial pra
    // calibrar depois com dado real, não definitivo.
    SMC_ORDER_BLOCK: 3,

    // AJUSTE-025 (26/09/2026): padrões de candlestick clássicos
    // (Fase 1 - Martelo/Enforcado/Martelo Invertido/Estrela Cadente/
    // Engolfo de Alta/Engolfo de Baixa, ver scripts/candlePatterns.js).
    // Peso maior que o SMC por pedido explícito do usuário ("quero
    // isso como reforço de consistência do sinal") - mesma ressalva:
    // camada secundária, nunca decide sozinha, valor inicial sem
    // validação empírica própria ainda.
    CANDLESTICK_PATTERN: 5
};

// ======================================================
// SCORE BASE
// ======================================================

function calcularScoreBase(score) {

    return Math.min(
        100,
        Math.max(0, Math.round(score))
    );

}
// ======================================================
// BÔNUS DE DIREÇÃO
// ======================================================

function aplicarBonusDirecao(historicoDirecao) {

    if (!historicoDirecao) {
        return 0;
    }

    if (historicoDirecao.taxaAcerto >= 80) {
        return 5;
    }

    if (historicoDirecao.taxaAcerto >= 70) {
        return 3;
    }

    if (historicoDirecao.taxaAcerto < 50) {
        return -5;
    }

    return 0;

}
// ===================================================
// BÔNUS DO HISTÓRICO
// ===================================================

function aplicarBonusHistorico(historico) {

    let bonus = 0;

    if (historico.status === "EXCELENTE") {

        bonus += Math.round(
            ENGINE_WEIGHTS.BONUS_EXCELENTE *
            historico.confidenceMultiplier
        );

    }

    else if (historico.status === "BOA") {

        bonus += Math.round(
            ENGINE_WEIGHTS.BONUS_BOA *
            historico.confidenceMultiplier
        );

    }

    return bonus;

}

// ======================================================
// PENALIDADE HISTÓRICA
// ======================================================

function aplicarPenalidadeHistorico(
    historico,
    multi
) {

    let penalidade = 0;

    if (multi.status === "DIVERGENTE") {
        penalidade += ENGINE_WEIGHTS.PENALIDADE_DIVERGENCIA;
    }

    if (historico.status === "RUIM") {
        penalidade += ENGINE_WEIGHTS.PENALIDADE_RUIM;
    }

    // AJUSTE-023 (25/09/2026): achado escrevendo o Manual (conferindo
    // contra o código real, per CLAUDE.md) - historyAnalyzer.js's
    // analisarHistorico() (quem produz o `historico.status` real
    // recebido aqui) NUNCA retorna "SEM_BASE" - o estado "sem
    // estatística nenhuma" se chama "SEM_DADOS" lá (só no early-return
    // `if (!estatisticas)`). Essa penalidade de -5 nunca disparava
    // desde que foi escrita - corrigido pro nome real.
    if (historico.status === "SEM_DADOS") {
        penalidade += ENGINE_WEIGHTS.PENALIDADE_SEM_BASE;
    }

    return penalidade;

}

// ======================================================
// SMC — ORDER BLOCKS (MUD-05, 17/09/2026)
// ======================================================
//
// `smc` vem da detecção feita em pairAnalyzer.js (quem tem os candles
// - este arquivo só decide o PESO, não detecta nada). `tendencia` é a
// direção já calculada pelo Market Analyzer (emas.tendencia) pro
// sinal atual - comparada contra a direção do order block detectado.
//
// Regra: OB na MESMA direção do sinal, com o preço dentro/perto da
// zona -> bônus. OB na direção CONTRÁRIA, mesma condição de zona ->
// penalidade. Sem OB detectado, ou preço fora da zona -> neutro
// (nunca penaliza AUSÊNCIA de order block - só a presença de um
// contrário).
function aplicarBonusSMC(smc, tendencia) {

    if (!smc || !smc.naZona) {
        return 0;
    }

    if (tendencia !== "ALTA" && tendencia !== "BAIXA") {
        return 0;
    }

    return smc.direcao === tendencia
        ? ENGINE_WEIGHTS.SMC_ORDER_BLOCK
        : -ENGINE_WEIGHTS.SMC_ORDER_BLOCK;

}

// ======================================================
// PADRÕES DE CANDLESTICK (AJUSTE-025, 26/09/2026)
// ======================================================
//
// `candlestick` vem da detecção feita em pairAnalyzer.js (via
// scripts/candlePatterns.js - este arquivo só decide o PESO, mesma
// separação de responsabilidade do SMC acima). `tendencia` é a
// direção já calculada pelo Market Analyzer pro sinal atual.
//
// Regra igual ao SMC: padrão detectado na MESMA direção do sinal ->
// bônus. Padrão na direção CONTRÁRIA -> penalidade. Sem padrão
// detectado -> neutro (nunca penaliza a AUSÊNCIA de padrão).
function aplicarBonusCandlestick(candlestick, tendencia) {

    if (!candlestick) {
        return 0;
    }

    if (tendencia !== "ALTA" && tendencia !== "BAIXA") {
        return 0;
    }

    return candlestick.direcao === tendencia
        ? ENGINE_WEIGHTS.CANDLESTICK_PATTERN
        : -ENGINE_WEIGHTS.CANDLESTICK_PATTERN;

}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    calcularScoreBase,

    aplicarBonusDirecao,

    aplicarBonusHistorico,

    aplicarPenalidadeHistorico,

    aplicarBonusSMC,

    aplicarBonusCandlestick,

    ENGINE_WEIGHTS,

};
