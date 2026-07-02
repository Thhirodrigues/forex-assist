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
// SMART SCORING ENGINE
// ===================================================

function calcularQualidade(
  ema9,
  ema21,
  ema50,
  ema100,
  ema200,
  rsiAtual,
  adx
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

const distancia =
    analisarDistanciaEMAs(
        ema9,
        ema21,
        ema50
    );
  
score += slope;
score += alinhamento.score;
score += distancia.score;


if (
    adx >= 35 &&
    rsiAtual >= 58 &&
    emas.tendencia !== "LATERAL"
) {

    score += 5;

}
  score = Math.max(
    0,
    Math.min(score, 100)
);
  return {

    score,

    tendencia: emas.tendencia,

    rsi: rsi.situacao,

    adx: adxInfo.forca,

    qualidade: tendencia.qualidade,

    slope,

    alinhamento: alinhamento.status,

    distancia: distancia.nivel,

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

    calcularQualidade,

    analisarDistanciaEMAs,

};
