// ======================================================
// SCORE ENGINE
// Forex Assist - RMI V2
// ======================================================

const { calcularPesoAmostra } = require("./historyAnalyzer");

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
// PESO DA AMOSTRA (AJUSTE-037)
// ======================================================

// AJUSTE-037: objeto `historico` sem pesoAmostra (chamada antiga/
// externa) cai no confidenceMultiplier antigo, pra não quebrar.
function pesoAmostraDe(historico) {

    if (typeof historico.pesoAmostra === "number") {
        return historico.pesoAmostra;
    }

    return typeof historico.confidenceMultiplier === "number"
        ? historico.confidenceMultiplier
        : 1;

}

// ======================================================
// BÔNUS DE DIREÇÃO
// ======================================================

// AJUSTE-037 (28/09/2026): statisticsEngine.js devolve taxaAcerto 0
// quando a direção não tem NENHUMA operação (historicoBUY.length === 0)
// - e aqui `0 < 50` virava -5 automático. Todo par sem histórico
// naquela direção perdia 5 pontos por uma "taxa de acerto ruim" que
// não existia. Agora: sem operação na direção = 0; com operação, o
// bônus/penalidade escala com o tamanho da amostra daquela direção
// (mesma régua do histórico do par, historyAnalyzer.js
// calcularPesoAmostra).
function aplicarBonusDirecao(historicoDirecao) {

    if (!historicoDirecao) {
        return 0;
    }

    const operacoesDirecao =
        (Number(historicoDirecao.wins) || 0) +
        (Number(historicoDirecao.loss) || 0);

    if (operacoesDirecao === 0) {
        return 0;
    }

    let bonus = 0;

    if (historicoDirecao.taxaAcerto >= 80) {
        bonus = 5;
    }

    else if (historicoDirecao.taxaAcerto >= 70) {
        bonus = 3;
    }

    else if (historicoDirecao.taxaAcerto < 50) {
        bonus = -5;
    }

    // `|| 0` normaliza o -0 de Math.round(-0,4).
    return Math.round(bonus * calcularPesoAmostra(operacoesDirecao)) || 0;

}
// ===================================================
// BÔNUS DO HISTÓRICO
// ===================================================

// AJUSTE-037 (28/09/2026): escala pelo tamanho da amostra (pesoAmostra,
// 0 a 1) em vez do confidenceMultiplier (0,8 a 1,0) - com 3 operações a
// 100%, o bônus era 80% do cheio; agora é 10%.
function aplicarBonusHistorico(historico) {

    let bonus = 0;

    const peso = pesoAmostraDe(historico);

    if (historico.status === "EXCELENTE") {

        bonus += Math.round(
            ENGINE_WEIGHTS.BONUS_EXCELENTE *
            peso
        );

    }

    else if (historico.status === "BOA") {

        bonus += Math.round(
            ENGINE_WEIGHTS.BONUS_BOA *
            peso
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

    const peso = pesoAmostraDe(historico);

    // AJUSTE-037 (28/09/2026): RUIM escala com o tamanho da amostra -
    // antes eram -10 cheios com qualquer amostra (inclusive 0
    // operações, que caíam em RUIM por taxaAcerto 0 - ver
    // historyAnalyzer.js). Com 30+ operações continua -10.
    //
    // Nota registrada, NÃO alterada aqui (fora do escopo): com amostra
    // cheia, taxa < 50% é contada TRÊS vezes - pesoHistorico -10
    // (historyAnalyzer), esta penalidade -10, e aplicarBonusDirecao -5.
    // Decisão pendente com o usuário (ENGINEERING.md, AJUSTE-037).
    if (historico.status === "RUIM") {
        penalidade += Math.round(ENGINE_WEIGHTS.PENALIDADE_RUIM * peso);
    }

    // AJUSTE-023 (25/09/2026): achado escrevendo o Manual (conferindo
    // contra o código real, per CLAUDE.md) - historyAnalyzer.js's
    // analisarHistorico() (quem produz o `historico.status` real
    // recebido aqui) NUNCA retorna "SEM_BASE" - o estado "sem
    // estatística nenhuma" se chama "SEM_DADOS" lá.
    //
    // AJUSTE-037 (28/09/2026): mesmo com o nome corrigido, SEM_DADOS
    // nunca chegava aqui (historyAnalyzer.js só devolvia SEM_DADOS com
    // `estatisticas` null, o que não acontece). Agora devolve pra 0
    // operações, e a penalidade vira "de amostra insuficiente": -5 com
    // 0 operações, diminuindo até 0 com 30+ (15 operações = -3, 24 =
    // -1). Garante que ter POUCO histórico nunca pontua melhor que não
    // ter nenhum só porque o peso da taxa ainda é pequeno - e que
    // histórico ausente é só "pontuação menor", como definido com o
    // usuário.
    penalidade += Math.round(ENGINE_WEIGHTS.PENALIDADE_SEM_BASE * (1 - peso));

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
