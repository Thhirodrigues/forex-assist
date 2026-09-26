// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// ANALYSIS LOGGER
//
// AJUSTE-032 (26/09/2026): registra TODA análise que chega na decisão
// (aprovada OU reprovada) na coleção `analises` - item 3 do
// planejamento estratégico, priorizado depois do AJUSTE-031 mostrar que
// o score atual não discrimina WIN de LOSS (nos dados limpos, AUC 0,417
// - levemente invertido, puxado por ADX/força de tendência).
//
// Por que existe: até aqui, só o sinal APROVADO era salvo (historico).
// Isso tem dois defeitos pra quem quer calibrar o motor:
// 1. Viés de seleção - só se vê o resultado do que o score atual já
//    escolheu; não dá pra saber como teria ido o que ele reprovou.
// 2. Sem os componentes do score gravados de forma uniforme, qualquer
//    fórmula alternativa ("score sombra") exigiria novo deploy e esperar
//    dias de dado novo pra cada hipótese.
//
// Com cada análise gravada com TODOS os componentes e indicadores
// brutos, qualquer fórmula alternativa pode ser calculada DEPOIS,
// offline, sobre o mesmo conjunto - o "score sombra" vira uma
// consulta, não uma mudança de produção. O resultado hipotético de
// cada análise (teria batido TP ou SL primeiro?) é rotulado depois, em
// lote, por uma ferramenta avulsa usando candles históricos (poucas
// chamadas de API - uma busca de 5min por par cobre dias), não aqui -
// este módulo não faz chamada de API nenhuma.
//
// Não participa da decisão: gravar ou falhar em gravar nunca muda o
// que o scanner aprova/reprova. Falha só loga um aviso (best-effort,
// mesmo padrão do push de abertura).
// ===================================================

function numeroOuNull(valor) {

    const n = Number(valor);

    return Number.isFinite(n) ? n : null;

}

function montarRegistroAnalise({

    par,
    perfilConfigurado,
    perfilResolvido,
    decisao,
    tentativasCascata,
    qualidade,
    financeiro,
    indicadores,
    precoEntrada,
    ultimoCandleDatetime,
    janelaOrigem,
    agora = Date.now()

}) {

    return {

        timestamp: agora,

        par,

        perfilConfigurado: perfilConfigurado || null,

        perfilResolvido: perfilResolvido || null,

        aprovado: decisao?.aprovado === true,

        status: decisao?.status || null,

        motivo: decisao?.motivo || null,

        direcao: decisao?.aprovado ? decisao.direcao : null,

        tendencia: qualidade?.tendencia || null,

        tentativasCascata: Array.isArray(tentativasCascata) ? tentativasCascata : [],

        precoEntrada: numeroOuNull(precoEntrada),

        ultimoCandleDatetime: ultimoCandleDatetime || null,

        janelaOrigem: janelaOrigem || null,

        score: numeroOuNull(qualidade?.score),

        scoreTecnico: numeroOuNull(qualidade?.scoreTecnico),

        emaScore: numeroOuNull(qualidade?.emaScore),

        rsiScore: numeroOuNull(qualidade?.rsiScore),

        adxScore: numeroOuNull(qualidade?.adxScore),

        tendenciaScore: numeroOuNull(qualidade?.tendenciaScore),

        multi: qualidade?.multi || null,

        historico: qualidade?.historico || null,

        confidenceMultiplier: numeroOuNull(qualidade?.confidenceMultiplier),

        smcScore: numeroOuNull(qualidade?.smcScore),

        smcDetectado: qualidade?.smcDetectado || null,

        candlestickScore: numeroOuNull(qualidade?.candlestickScore),

        candlestickDetectado: qualidade?.candlestickDetectado || null,

        indicadores: {

            ema9: numeroOuNull(indicadores?.ema9),
            ema21: numeroOuNull(indicadores?.ema21),
            ema50: numeroOuNull(indicadores?.ema50),
            ema100: numeroOuNull(indicadores?.ema100),
            ema200: numeroOuNull(indicadores?.ema200),
            ema9_15: numeroOuNull(indicadores?.ema9_15),
            ema21_15: numeroOuNull(indicadores?.ema21_15),
            ema50_15: numeroOuNull(indicadores?.ema50_15),
            rsi: numeroOuNull(indicadores?.rsi),
            adx: numeroOuNull(indicadores?.adx),
            atr: numeroOuNull(indicadores?.atr)

        },

        tpPips: numeroOuNull(financeiro?.tpPips),

        slPips: numeroOuNull(financeiro?.slPips),

        tpUSD: numeroOuNull(financeiro?.tpUSD),

        slUSD: numeroOuNull(financeiro?.slUSD),

        lote: numeroOuNull(financeiro?.lote),

        expectativa: numeroOuNull(financeiro?.expectativa),

        // Preenchido depois, em lote, pela ferramenta de rotulagem
        // (resultado hipotético: teria batido TP ou SL primeiro).
        rotuloHipotetico: null

    };

}

async function registrarAnalise(db, registro) {

    try {

        const id = `${registro.timestamp}_${String(registro.par).replace(/\//g, "_")}`;

        await db.collection("analises").doc(id).set(registro);

        console.log(`Análise...........registrada (${id})`);

    } catch (erro) {

        console.log(`Aviso: não foi possível registrar a análise de ${registro?.par}: ${erro.message}`);

    }

}

module.exports = {

    montarRegistroAnalise,

    registrarAnalise

};
