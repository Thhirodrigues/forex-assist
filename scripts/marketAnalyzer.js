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
    analisarHistorico,
    calcularAdaptiveConfidence
} = require("./historyAnalyzer");

const {

    calcularScoreBase,

    aplicarBonusDirecao,

    aplicarBonusHistorico,

    aplicarPenalidadeHistorico,

    aplicarBonusSMC,

    aplicarBonusCandlestick


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

    score = 20;

    tendencia = "ALTA";

  }

  else if (

    ema9 < ema21 &&
    ema21 < ema50 &&
    ema50 < ema100 &&
    ema100 < ema200

  ) {

    score = 20;

    tendencia = "BAIXA";

  }

  // ===================================================
  // TENDÊNCIA SAUDÁVEL
  // ===================================================

  else if (

    ema9 > ema21 &&
    ema21 > ema50

  ) {

    score = 15;

    tendencia = "ALTA";

  }

  else if (

    ema9 < ema21 &&
    ema21 < ema50

  ) {

    score = 15;

    tendencia = "BAIXA";

  }

  // ===================================================
  // INÍCIO DE TENDÊNCIA
  // ===================================================

  else if (

    ema9 > ema21 &&
    ema50 > ema100

  ) {

    score = 10;

    tendencia = "ALTA";

  }

  else if (

    ema9 < ema21 &&
    ema50 < ema100

  ) {

    score = 10;

    tendencia = "BAIXA";

  }

  // ===================================================
  // COMPRESSÃO
  // ===================================================

  else if (

    Math.abs(ema9 - ema21) < 0.00030

  ) {

    score = 5;

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
    score = 20;
    situacao = "COMPRA";
  }

  else if (rsi <= 45 && rsi >= 30) {
    score = 20;
    situacao = "VENDA";
  }

  else if (rsi > 70) {
    score = 5;
    situacao = "SOBRECOMPRADO";
  }

  else if (rsi < 30) {
    score = 5;
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

    // EMA confirma tendência
    if (
        emas.tendencia === "ALTA" ||
        emas.tendencia === "BAIXA"
    ) {
        score += 10;
    }

    // RSI confirma direção
    if (
        (emas.tendencia === "ALTA" && rsiInfo.situacao === "COMPRA") ||
        (emas.tendencia === "BAIXA" && rsiInfo.situacao === "VENDA")
    ) {
        score += 10;
    }

    // ADX moderado
    if (
        adxInfo.forca === "MODERADA" ||
        adxInfo.forca === "BOA"
    ) {
        score += 5;
    }

    // ADX forte
    if (
        adxInfo.forca === "FORTE" ||
        adxInfo.forca === "MUITO_FORTE" ||
        adxInfo.forca === "EXTREMA"
    ) {
        score += 10;
    }

    let qualidade = "CONFLITO";

    if (score >= 30) {

        qualidade = "INSTITUCIONAL";

    } else if (score >= 20) {

        qualidade = "FORTE";

    } else if (score >= 10) {

        qualidade = "ACEITAVEL";

    } else if (score > 0) {

        qualidade = "FRACA";

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

    score = 3;
    forca = "FRACA";

  }

  else if (adx < 25) {

    score = 6;
    forca = "MODERADA";

  }

  else if (adx < 30) {

    score = 9;
    forca = "BOA";

  }

  else if (adx < 35) {

    score = 12;
    forca = "FORTE";

  }

  else if (adx < 40) {

    score = 14;
    forca = "MUITO_FORTE";

  }

  else {

    score = 15;
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
        return 8;
    }

    if (
        d1 >= 0.0007 &&
        d2 >= 0.0007
    ) {
        return 5;
    }

    if (
        d1 >= 0.0004 &&
        d2 >= 0.0004
    ) {
        return 3;
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
            score: 5,
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
            score: 3,
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
            score: 5,
            nivel: "IDEAL"
        };
    }

    if (d1 >= 0.0008 && d2 >= 0.0008) {
        return {
            score: 3,
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
            score: 3,
            simetria: "EXCELENTE"
        };
    }

    if (diferenca <= 0.00030) {
        return {
            score: 2,
            simetria: "BOA"
        };
    }

    if (diferenca <= 0.00060) {
        return {
            score: 1,
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
            score: 4,
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
// SMART SCORING ENGINE
// ===================================================

function classificarQualidade(scoreFinal) {

    if (scoreFinal >= 95) return "INSTITUCIONAL";

    if (scoreFinal >= 90) return "FORTE";

    if (scoreFinal >= 80) return "BOA";

    if (scoreFinal >= 70) return "ACEITAVEL";

    return "CONFLITO";
}

// MUD-05 (17/09/2026): `smc` é um parâmetro OPCIONAL no FIM da lista -
// preserva todas as chamadas existentes (12 posicionais) intactas.
// Vem de pairAnalyzer.js (detecção de order block, com os candles que
// só ele tem) - este arquivo só interpreta/pesa, nunca recebe o array
// de candles bruto. `null`/ausente (flag SMC desligada, ou nenhum OB
// relevante detectado) reproduz o score de antes desta mudança,
// bit a bit - ver aplicarBonusSMC() em scoreEngine.js.
//
// AJUSTE-025 (26/09/2026): `candlestick` segue o MESMO padrão - mais
// um parâmetro opcional no fim, preserva as 13 chamadas anteriores
// (12 + smc) intactas. Vem de pairAnalyzer.js também (scripts/
// candlePatterns.js - detecção sobre os candles brutos, que só
// pairAnalyzer.js tem). Nota: RMI-011 (PENDENCIAS-ESTRATEGICAS-RMI.md/
// BACKLOG-E-VISAO.md) já registra o crescimento excessivo desta
// função (agora 14 parâmetros posicionais) como dívida técnica
// conhecida - não resolvida aqui de propósito (fora do escopo deste
// ajuste, mudar a assinatura de uma função tão usada é risco
// desnecessário pra uma feature que não precisa disso).
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
  atrAtual,
  smc = null,
  candlestick = null
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

    const scoreTecnico = score;

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
    
// ===================================================
// HISTÓRICO
// ===================================================
    
const historico =
    analisarHistorico(
        estatisticas
    );

const historicoBUY =
    estatisticas.BUY || {};

const historicoSELL =
    estatisticas.SELL || {};
    
const direcaoAtual =

    emas.tendencia === "ALTA"

        ? "BUY"

        : emas.tendencia === "BAIXA"

            ? "SELL"

            : null;
    
let historicoDirecao =
    null;

if (direcaoAtual === "BUY") {

    historicoDirecao = historicoBUY;

}

else if (direcaoAtual === "SELL") {

    historicoDirecao = historicoSELL;

}

const bonusDirecao =
    aplicarBonusDirecao(
        historicoDirecao
    );

let memoriaOperacional = 0;

if (historicoDirecao) {

    const ultimos5 =
        historicoDirecao.ultimos5 || [];

    const winsRecentes =
        ultimos5.filter(
            op => op.resultado === "WIN"
        ).length;

    const lossesRecentes =
        ultimos5.filter(
            op => op.resultado === "LOSS"
        ).length;

    if (winsRecentes >= 4) {

        memoriaOperacional = 4;

    }

    else if (lossesRecentes >= 4) {

        memoriaOperacional = -4;

    }

}
    
const adaptive =
    calcularAdaptiveConfidence(
        historico
    );

const volatilidade =
    analisarATR(
        atrAtual
    );
  
  
// ====================================================
// CÁLCULO DO SCORE
// ====================================================
    
let scoreFinal = scoreTecnico;
    
scoreFinal += aplicarBonusHistorico(historico);
scoreFinal += slope;
scoreFinal += alinhamento.score;
scoreFinal += simetria.score;
scoreFinal += distancia.score;
scoreFinal += multi.score;
scoreFinal += adaptive.pesoHistorico;
scoreFinal += bonusDirecao;
scoreFinal += memoriaOperacional;

const penalidade =
    aplicarPenalidadeHistorico(
        historico,
        multi
    );
scoreFinal -= penalidade;

scoreFinal += Math.round(volatilidade.score * 0.5);

// MUD-05 (17/09/2026): bônus/penalidade de order block SMC, somado
// ANTES da normalização (mesma altura de todo o resto do score
// técnico) - camada secundária, nunca decide sozinha (ver
// aplicarBonusSMC em scoreEngine.js). smcScore fica 0 quando `smc` é
// null (flag desligada ou nenhum OB relevante) - score idêntico ao de
// antes desta mudança nesse caso.
const smcScore = aplicarBonusSMC(smc, emas.tendencia);
scoreFinal += smcScore;

// AJUSTE-025 (26/09/2026): bônus/penalidade de padrão de candlestick,
// mesmo tratamento do SMC acima - camada secundária, nunca decide
// sozinha (ver aplicarBonusCandlestick em scoreEngine.js).
// candlestickScore fica 0 quando `candlestick` é null (nenhum dos 6
// padrões da Fase 1 detectado) - score idêntico ao de antes desta
// mudança nesse caso.
const candlestickScore = aplicarBonusCandlestick(candlestick, emas.tendencia);
scoreFinal += candlestickScore;

// =====================================================
// NORMALIZAÇÃO DO SCORE
// =====================================================

scoreFinal = calcularScoreBase(scoreFinal);

// Adaptive Confidence influencia o score final
scoreFinal = Math.round(
    scoreFinal * adaptive.confidenceMultiplier
);

scoreFinal = Math.min(
    100,
    Math.max(0, scoreFinal)
);
    
// ====================================================
// AJUSTE ADAPTATIVO DO HISTÓRICO
// ====================================================

// Score já ajustado pelo Adaptive Confidence.
// Não aplicar novamente.

    
return {

    scoreTecnico,

    emaScore: emas.score,

    rsiScore: rsi.score,

    adxScore: adxInfo.score,

    tendenciaScore: tendencia.score,

    confidence: adaptive.confiabilidade,

    penalizacao: penalidade,

    scoreFinal,

    score: scoreFinal,

    tendencia: emas.tendencia,

    rsi: rsi.situacao,

    adx: adxInfo.forca,

    qualidade: classificarQualidade(scoreFinal),
    
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

    confiabilidade: adaptive.confiabilidade,

    confidenceMultiplier: adaptive.confidenceMultiplier,

    pesoHistorico: adaptive.pesoHistorico,

    confidenceLevel: adaptive.confiabilidade >= 80
        ? "ALTA"
        : adaptive.confiabilidade >= 50
        ? "MEDIA"
        : "BAIXA",

    consistencia: historico.consistencia,

    tendenciaRecente: historico.tendenciaRecente,

    // MUD-05 (17/09/2026): expõe o que a detecção de order block
    // decidiu, pra log e pra eventual persistência - smcScore é 0 quando
    // `smc` é null (flag desligada ou nenhum OB relevante encontrado).
    smcDetectado: smc ? { direcao: smc.direcao, naZona: smc.naZona } : null,

    smcScore,

    // AJUSTE-025 (26/09/2026): expõe o que a detecção de padrão de
    // candlestick decidiu, pra log e persistência - candlestickScore é
    // 0 quando `candlestick` é null (nenhum dos 6 padrões da Fase 1
    // detectado nesse ciclo).
    candlestickDetectado: candlestick ? { padrao: candlestick.padrao, direcao: candlestick.direcao } : null,

    candlestickScore

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

};
