// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MARKET ANALYZER
//
// Responsabilidade:
// Avaliar tecnicamente a qualidade do mercado e
// fornecer um Score Inicial para o Scanner.
//
// FASE 05
// Estrutura preparada para evolução incremental.
// ===================================================


// ===================================================
// CONFIGURAÇÕES
// ===================================================

// (Reservado para configurações futuras)


const {

    avaliarOperacao

} = require("./decisionEngine");

const {
    analisarHistorico,
    calcularAdaptiveConfidence
} = require("./historyAnalyzer");

const {

    calcularScoreBase,

    aplicarBonusDirecao,

    aplicarConfidenceLevel,

    aplicarPenalidadeHistorico,

    aplicarNormalizacao

} = require("./scoreEngine");

// ===================================================
// ANÁLISE DAS EMAs
// ===================================================

function analisarEMAs(
  ema9,
  ema21,
  ema50,
  ema100,
  ema200
) {

  let score = 0;

  let tendencia = "LATERAL";

  // ===================================================
  // TENDÊNCIA FORTE
  // ===================================================

  if (

    ema9 > ema21 &&
    ema21 > ema50 &&
    ema50 > ema100 &&
    ema100 > ema200

  ) {

    score = 30;

    tendencia = "ALTA";

  }

  else if (

    ema9 < ema21 &&
    ema21 < ema50 &&
    ema50 < ema100 &&
    ema100 < ema200

  ) {

    score = 30;

    tendencia = "BAIXA";

  }

  // ===================================================
  // TENDÊNCIA SAUDÁVEL
  // ===================================================

  else if (

    ema9 > ema21 &&
    ema21 > ema50

  ) {

    score = 22;

    tendencia = "ALTA";

  }

  else if (

    ema9 < ema21 &&
    ema21 < ema50

  ) {

    score = 22;

    tendencia = "BAIXA";

  }

  // ===================================================
  // INÍCIO DE TENDÊNCIA
  // ===================================================

  else if (

    ema9 > ema21 &&
    ema50 > ema100

  ) {

    score = 16;

    tendencia = "ALTA";

  }

  else if (

    ema9 < ema21 &&
    ema50 < ema100

  ) {

    score = 16;

    tendencia = "BAIXA";

  }

  // ===================================================
  // COMPRESSÃO
  // ===================================================

  else if (

    Math.abs(ema9 - ema21) < 0.00030

  ) {

    score = 8;

    tendencia = "COMPRESSAO";

  }

  // ===================================================
  // CONFLITO
  // ===================================================

  else {

    score = 5;

    tendencia = "CONFLITO";

  }

  return {

    score,

    tendencia

  };

}


// ===================================================
// ANÁLISE DO RSI
// ===================================================

function analisarRSI(rsi) {

  let score = 0;
  let situacao = "NEUTRO";

  if (rsi >= 55 && rsi <= 70) {
    score = 35;
    situacao = "COMPRA";
  }

  else if (rsi <= 45 && rsi >= 30) {
    score = 35;
    situacao = "VENDA";
  }

  else if (rsi > 70) {
    score = 10;
    situacao = "SOBRECOMPRADO";
  }

  else if (rsi < 30) {
    score = 10;
    situacao = "SOBREVENDIDO";
  }

  return {
    score,
    situacao
  };

}


// ===================================================
// ANÁLISE DA TENDÊNCIA
// ===================================================

function analisarTendencia(
  emas,
  rsiInfo,
  adxInfo
) {

  let score = 0;

  let qualidade = "CONFLITO";

  // ===================================================
  // TENDÊNCIA INSTITUCIONAL
  // ===================================================

  if (

    emas.tendencia === "ALTA" &&
    rsiInfo.situacao === "COMPRA" &&
    (
      adxInfo.forca === "FORTE" ||
      adxInfo.forca === "MUITO_FORTE" ||
      adxInfo.forca === "EXTREMA"
    )

  ) {

    score = 30;

    qualidade = "INSTITUCIONAL";

  }

  // ===================================================
  // TENDÊNCIA FORTE
  // ===================================================

  else if (

    (
      emas.tendencia === "ALTA" &&
      rsiInfo.situacao === "COMPRA"
    ) ||

    (
      emas.tendencia === "BAIXA" &&
      rsiInfo.situacao === "VENDA"
    )

  ) {

    score = 20;

    qualidade = "FORTE";

  }

  // ===================================================
  // LATERAL
  // ===================================================

  else if (

    emas.tendencia === "LATERAL" ||
    emas.tendencia === "COMPRESSAO"

  ) {

    score = 8;

    qualidade = "LATERAL";

  }

  // ===================================================
  // CONFLITO
  // ===================================================

  else {

    score = 0;

    qualidade = "CONFLITO";

  }

  return {

    score,

    qualidade

  };

}

// ===================================================
// ANÁLISE DO ADX
// ===================================================

function analisarADX(adx) {

  let score = 0;
  let forca = "FRACA";

  if (adx < 15) {

    score = 0;
    forca = "MUITO_FRACA";

  }

  else if (adx < 20) {

    score = 5;
    forca = "FRACA";

  }

  else if (adx < 25) {

    score = 10;
    forca = "MODERADA";

  }

  else if (adx < 30) {

    score = 15;
    forca = "BOA";

  }

  else if (adx < 35) {

    score = 20;
    forca = "FORTE";

  }

  else if (adx < 40) {

    score = 25;
    forca = "MUITO_FORTE";

  }

  else {

    score = 30;
    forca = "EXTREMA";

  }

  return {

    score,

    forca

  };

}

// ===================================================
// ANÁLISE DO SLOPE
// ===================================================

function analisarSlope(
    ema9,
    ema21,
    ema50
) {

    const d1 = Math.abs(ema9 - ema21);
    const d2 = Math.abs(ema21 - ema50);

    if (
        d1 >= 0.0010 &&
        d2 >= 0.0010
    ) {
        return 15;
    }

    if (
        d1 >= 0.0007 &&
        d2 >= 0.0007
    ) {
        return 10;
    }

    if (
        d1 >= 0.0004 &&
        d2 >= 0.0004
    ) {
        return 5;
    }

    return 0;

}

// ===================================================
// ANÁLISE DO ALINHAMENTO DAS EMAS
// ===================================================

function analisarAlinhamento(
    ema9,
    ema21,
    ema50,
    ema100,
    ema200
) {

    const compra =
        ema9 > ema21 &&
        ema21 > ema50 &&
        ema50 > ema100 &&
        ema100 > ema200;

    const venda =
        ema9 < ema21 &&
        ema21 < ema50 &&
        ema50 < ema100 &&
        ema100 < ema200;

    if (compra || venda) {
        return {
            score: 15,
            status: "PERFEITO"
        };
    }

    let pontos = 0;

    if (
        (ema9 > ema21) ||
        (ema9 < ema21)
    ) pontos++;

    if (
        (ema21 > ema50) ||
        (ema21 < ema50)
    ) pontos++;

    if (
        (ema50 > ema100) ||
        (ema50 < ema100)
    ) pontos++;

    if (
        (ema100 > ema200) ||
        (ema100 < ema200)
    ) pontos++;

    if (pontos >= 3) {
        return {
            score: 8,
            status: "PARCIAL"
        };
    }

    return {
        score: 0,
        status: "RUIM"
    };

}

// ===================================================
// ANÁLISE DA DISTÂNCIA ENTRE EMAs
// ===================================================

function analisarDistanciaEMAs(
    ema9,
    ema21,
    ema50
) {

    const d1 = Math.abs(ema9 - ema21);
    const d2 = Math.abs(ema21 - ema50);

    if (d1 >= 0.0015 && d2 >= 0.0015) {
        return {
            score: 10,
            nivel: "IDEAL"
        };
    }

    if (d1 >= 0.0008 && d2 >= 0.0008) {
        return {
            score: 5,
            nivel: "BOA"
        };
    }

    return {
        score: 0,
        nivel: "FRACA"
    };
}

// ===================================================
// ANÁLISE DA SIMETRIA DA TENDÊNCIA
// ===================================================

function analisarSimetria(
    ema9,
    ema21,
    ema50
) {

    const d1 = Math.abs(ema9 - ema21);
    const d2 = Math.abs(ema21 - ema50);

    const diferenca = Math.abs(d1 - d2);

    if (diferenca <= 0.00010) {
        return {
            score: 10,
            simetria: "EXCELENTE"
        };
    }

    if (diferenca <= 0.00030) {
        return {
            score: 5,
            simetria: "BOA"
        };
    }

    if (diferenca <= 0.00060) {
        return {
            score: 2,
            simetria: "ACEITÁVEL"
        };
    }

    return {
        score: 0,
        simetria: "RUIM"
    };

}

// ===================================================
// CONFIRMAÇÃO MULTI-TIMEFRAME
// ===================================================

function analisarMultiTimeframe(
    tendencia5m,
    tendencia15m
) {

    if (tendencia5m === tendencia15m) {

        return {
            score: 10,
            status: "CONFIRMADO"
        };

    }

    return {
        score: 0,
        status: "DIVERGENTE"
    };

}

// ===================================================
// ANÁLISE DA VOLATILIDADE (ATR)
// ===================================================

function analisarATR(atr) {

    if (atr >= 0.0020) {

        return {
            score: 10,
            nivel: "ALTA"
        };

    }

    if (atr >= 0.0012) {

        return {
            score: 6,
            nivel: "NORMAL"
        };

    }

    return {

        score: -5,
        nivel: "BAIXA"

    };

}

// ===================================================
// PESOS DA ENGINE
// ===================================================

const ENGINE_WEIGHTS = {

    BONUS_EXCELENTE: 5,

    BONUS_BOA: 3,

    PENALIDADE_RUIM: 10,

    PENALIDADE_SEM_BASE: 5,

    PENALIDADE_DIVERGENCIA: 10

};

// ===================================================
// SMART SCORING ENGINE
// ===================================================

function calcularQualidade(
  ema9,
  ema21,
  ema50,
  ema100,
  ema200,
  rsiAtual,
  adx,
  ema9_15,
  ema21_15,
  ema50_15,
  estatisticas,
  atr
) {

  let score = 0;

  const emas = analisarEMAs(
    ema9,
    ema21,
    ema50,
    ema100,
    ema200
);
  
const rsi = analisarRSI(
    rsiAtual
);

const adxInfo = analisarADX(
    adx
);

const tendencia = analisarTendencia(
    emas,
    rsi,
    adxInfo
);

  score += emas.score;
  score += rsi.score;
  score += tendencia.score;
  score += adxInfo.score;

const slope = analisarSlope(
    ema9,
    ema21,
    ema50
);
const alinhamento =
    analisarAlinhamento(
        ema9,
        ema21,
        ema50,
        ema100,
        ema200
);

const tendencia15 =
    ema9_15 > ema21_15 &&
    ema21_15 > ema50_15

    ? "ALTA"

    : ema9_15 < ema21_15 &&
      ema21_15 < ema50_15

    ? "BAIXA"

    : "LATERAL";
  
const simetria =
    analisarSimetria(
        ema9,
        ema21,
        ema50
);
  
const distancia =
    analisarDistanciaEMAs(
        ema9,
        ema21,
        ema50
);

const multi =
    analisarMultiTimeframe(
        emas.tendencia,
        tendencia15
    );
  
const historico =
    analisarHistorico(
        estatisticas
    );

const historicoBUY =
    estatisticas.BUY;

const historicoSELL =
    estatisticas.SELL;

let direcaoAtual = null;

if (emas.tendencia === "ALTA") {

    direcaoAtual = "BUY";

}

else if (emas.tendencia === "BAIXA") {

    direcaoAtual = "SELL";

}
let historicoDirecao =
    null;

if (direcaoAtual === "BUY") {

    historicoDirecao = historicoBUY;

}

else if (direcaoAtual === "SELL") {

    historicoDirecao = historicoSELL;

}
  
const adaptive =
    calcularAdaptiveConfidence(
        historico
    );

const volatilidade =
    analisarATR(
        atr
    );
  
  
// ====================================================
// BÔNUS ADAPTATIVO
// ====================================================

let bonus = 0;

const bonusDirecao =
    aplicarBonusDirecao(historicoDirecao);

let memoriaOperacional = 0;

if (historicoDirecao) {

    const ultimos5Direcao =
        historicoDirecao.ultimos5 || [];

    const winsRecentes =
        ultimos5Direcao.filter(
            op => op.resultado === "WIN"
        ).length;

    const lossesRecentes =
        ultimos5Direcao.filter(
            op => op.resultado === "LOSS"
        ).length;

    if (winsRecentes >= 4) {

        memoriaOperacional = 4;

    }

    else if (lossesRecentes >= 4) {

        memoriaOperacional = -4;

    }
}

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

score += bonus;

score += slope;

score += alinhamento.score;

score += simetria.score;

score += distancia.score;

score += multi.score;

// Histórico adaptativo
score += adaptive.pesoHistorico;

// Bônus da direção histórica
score += bonusDirecao;

// Memória operacional
score += memoriaOperacional;

const penalidade =
    aplicarPenalidadeHistorico(
        historico,
        multi
    );

score -= penalidade;

// Volatilidade entra apenas como ajuste fino
score += Math.round(volatilidade.score * 0.5);

// =====================================================
// NORMALIZAÇÃO DO SCORE
// =====================================================

score = calcularScoreBase(score);
  
// ====================================================
// AJUSTE ADAPTATIVO DO HISTÓRICO
// ====================================================

score = aplicarConfidenceLevel(
    score,
    historico
);

return {

    score,

    tendencia: emas.tendencia,

    rsi: rsi.situacao,

    adx: adxInfo.forca,

    qualidade: tendencia.qualidade,

    slope,

    alinhamento: alinhamento.status,

    simetria: simetria.simetria,

    distancia: distancia.nivel,

    multi: multi.status,

    historico: historico.status,

    historicoBUY,

    historicoSELL,

    volatilidade: volatilidade.nivel,

    bonusDirecao,

    memoriaOperacional,

    consistencia: historico.consistencia,

    tendenciaRecente: historico.tendenciaRecente

};

}

// ===================================================
// EXPORTS
// ===================================================

module.exports = {

    analisarEMAs,

    analisarRSI,

    analisarTendencia,

    analisarADX,

    analisarSlope,

    analisarAlinhamento,

    analisarSimetria,

    analisarHistorico,

    analisarATR,

    calcularQualidade,

    analisarDistanciaEMAs,

    analisarMultiTimeframe,

    avaliarOperacao,

};
