// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// CANDLE PATTERNS (padrões de candlestick clássicos)
//
// AJUSTE-025 (26/09/2026): camada secundária de confirmação, no MESMO
// espírito do SMC/Order Block (MUD-05) - detecta um padrão de
// candlestick clássico no candle mais recente e devolve só a
// DETECÇÃO (padrão + direção que ele sugere). Quem decide o peso
// disso no score é scoreEngine.js's aplicarBonusCandlestick(), não
// este arquivo - mesma separação de responsabilidade que já existe
// entre detectarOrderBlock() (pairAnalyzer.js) e aplicarBonusSMC()
// (scoreEngine.js).
//
// FASE 1 (pedido do usuário, 26/09/2026, depois de perguntar sobre os
// 18 padrões do Manual - AJUSTE-024): só os 6 padrões de 1-2 candles,
// geometricamente mais simples e confiáveis de detectar. Os de 3
// candles (Harami, Três Corvos, Estrela da Manhã/Tarde) e os de gap
// (Chute/Kicker) ficam registrados como Fase 2, não implementados
// aqui - decisão explícita do usuário via AskUserQuestion, não um
// corte silencioso de escopo.
//
// Limitação conhecida, aceita conscientemente (mesmo nível de
// simplificação que o SMC): o Manual (js/manual.js) explica que um
// padrão de candlestick "vale mais" perto de um suporte/resistência
// real, confirmado pelo candle seguinte - este projeto não tem
// detecção de suporte/resistência implementada ainda, então a
// detecção aqui avalia o padrão ISOLADO, sem esse contexto. Mais
// ruidoso que o ideal, registrado como pendência (não bloqueia a
// Fase 1, mas explica por que o peso é pequeno - ver AJUSTE-025 no
// ENGINEERING.md).
// ===================================================

// Limiares calibrados em relação ao ATR do par (não em valor de preço
// fixo) - mesma cautela do SMC (OB_DESLOCAMENTO_ATR em pairAnalyzer.js):
// "corpo pequeno" e "sombra longa" precisam ser relativos à
// volatilidade normal daquele par naquele momento, senão a mesma
// regra numérica que funciona no EUR/USD quebra num par mais volátil
// (ou nem dispara nunca num par mais parado). Valores iniciais, sem
// validação empírica própria ainda - mesma ressalva de sempre nesta
// base de código (ex.: RSI_VETO_SOBRECOMPRADO/SOBREVENDIDO em
// decisionEngine.js, SMC_ORDER_BLOCK em scoreEngine.js).
const CANDLE_PATTERNS = {

    CORPO_PEQUENO_MAX_ATR: 0.3,      // corpo <= 30% do ATR conta como "pequeno"
    SOMBRA_LONGA_MULTIPLICADOR: 2,   // sombra longa >= 2x o corpo
    SOMBRA_LONGA_MIN_ATR: 0.4,       // e >= 40% do ATR (evita "2x de quase nada")
    SOMBRA_CURTA_MAX_ATR: 0.15,      // sombra do lado oposto <= 15% do ATR (mínima/ausente)
    ENGOLFO_CORPO_MIN_ATR: 0.2,      // corpo do candle que engole >= 20% do ATR (evita engolfo trivial)
    TENDENCIA_RECENTE_PERIODOS: 5    // candles pra trás, pra saber "de onde veio" o movimento

};

function corpoDoCandle(c) {
    return Math.abs(c.close - c.open);
}

function sombraSuperior(c) {
    return c.high - Math.max(c.close, c.open);
}

function sombraInferior(c) {
    return Math.min(c.close, c.open) - c.low;
}

// "De onde veio" o movimento nos N candles ANTES do candle candidato
// (não inclui o candidato em si) - proxy simples de tendência recente,
// só pra decidir se um corpo-pequeno-com-sombra-longa é um Martelo
// (vem de queda) ou um Enforcado (vem de alta) - geometricamente são
// o MESMO candle, o que diferencia os dois é só o contexto anterior.
function tendenciaRecente(candles, indiceCandidato) {

    const periodos = CANDLE_PATTERNS.TENDENCIA_RECENTE_PERIODOS;
    const indiceAnterior = indiceCandidato - 1;
    const indiceAntes = indiceAnterior - periodos;

    if (indiceAntes < 0) return null;

    const closeAntes = candles[indiceAntes].close;
    const closeRecente = candles[indiceAnterior].close;

    if (closeRecente > closeAntes) return "ALTA";
    if (closeRecente < closeAntes) return "BAIXA";
    return null;

}

// Martelo (reversão de alta, vem de queda) / Enforcado (reversão de
// baixa, vem de alta) - mesma forma geométrica (corpo pequeno no
// topo do candle, sombra inferior longa, sombra superior mínima), só
// o contexto anterior diferencia qual dos dois é.
function detectarMarteloOuEnforcado(candles, indice, atr) {

    const c = candles[indice];
    const corpo = corpoDoCandle(c);
    const sInf = sombraInferior(c);
    const sSup = sombraSuperior(c);

    const corpoTopo = Math.min(c.close, c.open) >= (c.low + c.high) / 2;

    const formaValida =
        corpo <= CANDLE_PATTERNS.CORPO_PEQUENO_MAX_ATR * atr &&
        sInf >= CANDLE_PATTERNS.SOMBRA_LONGA_MULTIPLICADOR * corpo &&
        sInf >= CANDLE_PATTERNS.SOMBRA_LONGA_MIN_ATR * atr &&
        sSup <= CANDLE_PATTERNS.SOMBRA_CURTA_MAX_ATR * atr &&
        corpoTopo;

    if (!formaValida) return null;

    const tendencia = tendenciaRecente(candles, indice);

    if (tendencia === "BAIXA") {
        return { padrao: "MARTELO", direcao: "ALTA" };
    }

    if (tendencia === "ALTA") {
        return { padrao: "ENFORCADO", direcao: "BAIXA" };
    }

    return null;

}

// Martelo Invertido (reversão de alta, vem de queda) / Estrela
// Cadente (reversão de baixa, vem de alta) - espelho do par acima:
// corpo pequeno na base, sombra superior longa, sombra inferior
// mínima.
function detectarMarteloInvertidoOuEstrelaCadente(candles, indice, atr) {

    const c = candles[indice];
    const corpo = corpoDoCandle(c);
    const sSup = sombraSuperior(c);
    const sInf = sombraInferior(c);

    const corpoBase = Math.max(c.close, c.open) <= (c.low + c.high) / 2;

    const formaValida =
        corpo <= CANDLE_PATTERNS.CORPO_PEQUENO_MAX_ATR * atr &&
        sSup >= CANDLE_PATTERNS.SOMBRA_LONGA_MULTIPLICADOR * corpo &&
        sSup >= CANDLE_PATTERNS.SOMBRA_LONGA_MIN_ATR * atr &&
        sInf <= CANDLE_PATTERNS.SOMBRA_CURTA_MAX_ATR * atr &&
        corpoBase;

    if (!formaValida) return null;

    const tendencia = tendenciaRecente(candles, indice);

    if (tendencia === "BAIXA") {
        return { padrao: "MARTELO_INVERTIDO", direcao: "ALTA" };
    }

    if (tendencia === "ALTA") {
        return { padrao: "ESTRELA_CADENTE", direcao: "BAIXA" };
    }

    return null;

}

// Engolfo de Alta/Baixa - dois candles, o segundo (mais recente)
// "engolindo" o corpo inteiro do primeiro, na direção oposta. Não
// depende de tendência anterior pra decidir QUAL dos dois é (a cor
// dos dois candles já determina isso sozinha), só exige um corpo
// mínimo pra não contar um engolfo trivial entre dois candles quase
// parados.
function detectarEngolfo(candles, indice, atr) {

    if (indice < 1) return null;

    const anterior = candles[indice - 1];
    const atual = candles[indice];

    const anteriorEhBaixa = anterior.close < anterior.open;
    const anteriorEhAlta = anterior.close > anterior.open;
    const atualEhAlta = atual.close > atual.open;
    const atualEhBaixa = atual.close < atual.open;

    const corpoAtual = corpoDoCandle(atual);
    const corpoMinimo = corpoAtual >= CANDLE_PATTERNS.ENGOLFO_CORPO_MIN_ATR * atr;

    if (anteriorEhBaixa && atualEhAlta && corpoMinimo) {

        const engolfa = atual.open <= anterior.close && atual.close >= anterior.open;

        if (engolfa) {
            return { padrao: "ENGOLFO_ALTA", direcao: "ALTA" };
        }

    }

    if (anteriorEhAlta && atualEhBaixa && corpoMinimo) {

        const engolfa = atual.open >= anterior.close && atual.close <= anterior.open;

        if (engolfa) {
            return { padrao: "ENGOLFO_BAIXA", direcao: "BAIXA" };
        }

    }

    return null;

}

// ===================================================
// DETECÇÃO PRINCIPAL
// ---------------------------------------------------
// Roda os 6 padrões da Fase 1 sobre o candle mais recente (e o
// anterior, no caso do Engolfo) e devolve o PRIMEIRO detectado -
// ordem de checagem não é hierarquia de importância, é só a ordem de
// implementação; na prática as formas são mutuamente exclusivas
// (corpo pequeno no topo vs na base vs corpo grande engolindo o
// anterior não se sobrepõem no mesmo candle).
// ===================================================

function detectarPadraoCandlestick(candles, atr) {

    if (!Array.isArray(candles) || candles.length < CANDLE_PATTERNS.TENDENCIA_RECENTE_PERIODOS + 3) {
        return null;
    }

    if (!Number.isFinite(atr) || atr <= 0) {
        return null;
    }

    const indice = candles.length - 1;

    const marteloOuEnforcado = detectarMarteloOuEnforcado(candles, indice, atr);
    if (marteloOuEnforcado) return marteloOuEnforcado;

    const martInvOuEstrela = detectarMarteloInvertidoOuEstrelaCadente(candles, indice, atr);
    if (martInvOuEstrela) return martInvOuEstrela;

    const engolfo = detectarEngolfo(candles, indice, atr);
    if (engolfo) return engolfo;

    return null;

}

module.exports = {

    detectarPadraoCandlestick,

    // Exportados só pra validação isolada (scratchpad) poder testar
    // cada padrão em separado, sem duplicar a regra numa cópia.
    detectarMarteloOuEnforcado,
    detectarMarteloInvertidoOuEstrelaCadente,
    detectarEngolfo,
    tendenciaRecente,

    CANDLE_PATTERNS

};
