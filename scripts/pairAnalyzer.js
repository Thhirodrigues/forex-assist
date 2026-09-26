// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// PAIR ANALYZER
//
// Responsabilidade:
// Realizar toda a análise técnica de um único ativo.
//
// Fluxo:
//
// 1. Receber os candles do mercado.
//
// 2. Calcular os indicadores técnicos.
//
// 3. Solicitar ao Market Analyzer o cálculo
//    do Smart Score Institucional.
//
// 4. Aplicar os filtros de aprovação.
//
// 5. Registrar a operação aprovada.
//
// O Pair Analyzer NÃO executa varredura.
//
// O Pair Analyzer NÃO acessa diretamente
// o Firestore para consultas estatísticas.
//
// Toda inteligência permanece distribuída:
//
// • marketAnalyzer.js
// • statisticsEngine.js
// • riskManager.js
// • marketData.js
//
// SPRINT 05
// Arquitetura Modular
// ===================================================

const {
    analisarFinanceiro,
    parEhCruzado,
    simboloCotacaoCruzada
} = require("./moneyManager");

const {
    avaliarOperacao
} = require("./decisionEngine");

// AJUSTE-025 (26/09/2026): detecção de padrões de candlestick (Fase 1)
// - mesmo padrão de moneyManager.js/decisionEngine.js acima (módulo
// puro, sem I/O, requerido direto - diferente de getCandles/
// existeCooldown/salvarOperacao, que são injetados por serem I/O real
// e precisarem ser mockáveis em teste).
const {
    detectarPadraoCandlestick
} = require("./candlePatterns");

// AJUSTE-032 (26/09/2026): só o montador (puro) é requerido direto; a
// gravação em si (I/O) é injetada pelo scanner, igual salvarOperacao.
const {
    montarRegistroAnalise
} = require("./analysisLogger");

// CACHE-002 (16/09/2026): candles de 15min só mudam a cada 15min, mas
// o Scanner roda a cada 5min - sem cache, 2 de cada 3 chamadas a essa
// perna traziam exatamente o mesmo candle da chamada anterior, puro
// desperdício de orçamento da TwelveData (mesma ordem de ideia do
// CACHE-001 em statisticsEngine.js, mas invalidado por JANELA DE
// TEMPO, não por evento - não existe "operação nova" que marque
// candle de mercado como desatualizado, só a passagem do tempo).
//
// Efeito esperado: ~2 chamadas/par/ciclo caem pra ~1,33 em média
// (a perna de 5min continua sendo buscada todo ciclo, sem alternativa -
// um candle novo fecha a cada 5min de verdade). Isso tira os 10 pares
// padrão de 2.688 chamadas/dia (acima do orçamento de 2.400) pra
// ~1.792/dia, abrindo margem real pra adicionar pares sem estourar
// cota - ver DOCUMENTACAO/ENGINEERING.md.
function idCacheCandles15(par) {

    return String(par).replace(/\//g, "_");

}

async function obterCandles15ComCache(db, par, getCandles) {

    const bucketAtual =
        Math.floor(Date.now() / (15 * 60 * 1000));

    // cacheRef fica null se `db` não suportar .collection() (testes com
    // db falso/vazio, por exemplo) - degrada pra "sem cache" nesse par
    // em vez de derrubar a análise inteira.
    let cacheRef = null;

    try {

        cacheRef =
            db.collection("cacheCandles15min").doc(idCacheCandles15(par));

        const cacheSnap = await cacheRef.get();

        if (cacheSnap.exists && cacheSnap.data().bucket === bucketAtual) {

            return cacheSnap.data().candles;

        }

    } catch (erro) {

        console.log(`Aviso: cache de candles 15min indisponível pra ${par}: ${erro.message}`);

    }

    const candles15 = await getCandles(par, "15min");

    // Best-effort: se a escrita do cache falhar, o ciclo atual já tem
    // os candles buscados agora - só o PRÓXIMO ciclo volta a buscar
    // de novo em vez de reaproveitar (degrada pra "sem cache" nesse
    // par, não quebra nada).
    if (cacheRef) {

        try {

            await cacheRef.set({

                candles: candles15,

                bucket: bucketAtual,

                atualizadoEm: Date.now()

            });

        } catch (erro) {

            console.log(`Aviso: não foi possível gravar cacheCandles15min/${par}: ${erro.message}`);

        }

    }

    return candles15;

}

// ===================================================
// MUD-05 (17/09/2026) — DETECÇÃO DE ORDER BLOCK (SMC)
// ===================================================
//
// Camada secundária de confirmação - NUNCA fonte primária de sinal,
// nunca gate. Um order block detectado não aprova nem reprova
// operação nenhuma sozinho (ver aplicarBonusSMC em scoreEngine.js,
// que decide o peso). Detecção mora aqui porque pairAnalyzer.js é
// quem tem os candles - calcula, não interpreta.
//
// Definição operacional (deliberadamente objetiva, pra não ficar
// ambígua): um order block de ALTA é o último candle de baixa
// (close < open) imediatamente anterior a um movimento de alta
// impulsivo; order block de BAIXA é o espelho. "Impulsivo" = candle
// candidato seguido, dentro de OB_K_CONFIRMACAO velas, por um close
// que se desloca pelo menos OB_DESLOCAMENTO_ATR × ATR na direção do
// movimento. A zona do OB é o intervalo [low, high] do próprio candle
// identificado. Varre as últimas OB_JANELA_CANDLES velas, do mais
// recente pro mais antigo, retornando o PRIMEIRO (mais recente) OB
// relevante encontrado.
const OB_JANELA_CANDLES = 50;
const OB_K_CONFIRMACAO = 3;
const OB_DESLOCAMENTO_ATR = 1.5;

function detectarOrderBlock(candles, atr, precoAtual) {

    if (!Array.isArray(candles) || candles.length < OB_K_CONFIRMACAO + 1) return null;
    if (!Number.isFinite(atr) || atr <= 0) return null;
    if (!Number.isFinite(precoAtual)) return null;

    const inicio = Math.max(0, candles.length - OB_JANELA_CANDLES);

    for (let i = candles.length - 1 - OB_K_CONFIRMACAO; i >= inicio; i--) {

        const candidato = candles[i];
        const seguintes = candles.slice(i + 1, i + 1 + OB_K_CONFIRMACAO);

        if (seguintes.length < OB_K_CONFIRMACAO) continue;

        if (candidato.close < candidato.open) {

            const maxCloseSeguinte = Math.max(...seguintes.map(c => c.close));
            const deslocamento = maxCloseSeguinte - candidato.close;

            if (deslocamento >= OB_DESLOCAMENTO_ATR * atr) {

                return avaliarZonaOrderBlock("ALTA", candidato, precoAtual);

            }

        }

        if (candidato.close > candidato.open) {

            const minCloseSeguinte = Math.min(...seguintes.map(c => c.close));
            const deslocamento = candidato.close - minCloseSeguinte;

            if (deslocamento >= OB_DESLOCAMENTO_ATR * atr) {

                return avaliarZonaOrderBlock("BAIXA", candidato, precoAtual);

            }

        }

    }

    return null;

}

// Preço "dentro ou perto" da zona: dentro do [low, high] do candle do
// OB, com uma margem de 20% do próprio tamanho da zona pra cada lado
// (zona muito estreita não deveria exigir precisão de pip).
function avaliarZonaOrderBlock(direcao, candidato, precoAtual) {

    const zonaLow = candidato.low;
    const zonaHigh = candidato.high;
    const margem = (zonaHigh - zonaLow) * 0.2;

    const naZona =
        precoAtual >= (zonaLow - margem) &&
        precoAtual <= (zonaHigh + margem);

    return { direcao, zonaLow, zonaHigh, naZona };

}

async function analisarPar({
db,
par,
configuracao,
estatisticas,

// AJUSTE-019 (24/09/2026): qual janela (scripts/scanner.js
// identificarOrigemJanela) admitiu este par agora - "asia"/
// "londres"/"novaYork"/"personalizado". Opcional/null em chamadas
// diretas (ex.: testes) que não passam por scanner.js.
janelaOrigem,

getCandles,
ema,
rsi,
calcularADX,
calcularATR,
calcularQualidade,
existeCooldown,
salvarOperacao,

// Opcional de propósito: injetado por scripts/scanner.js já vinculado
// a admin/db reais. Ausente (ex.: chamadas de teste) ou falha no
// envio nunca impede o sinal de salvar - push é um efeito colateral
// best-effort, não parte do critério de aprovação da RMI.
enviarPushAbertura,

// AJUSTE-032 (26/09/2026): opcional, mesmo princípio do push - grava
// toda análise que chega na decisão (aprovada ou não) em `analises`.
// Ausente em testes; falha nunca muda a decisão.
registrarAnalise

}) {

    try {

        if (await existeCooldown(db, par, configuracao?.cooldown)) {

    console.log("Status............COOLDOWN");
    console.log("Motivo............Operação recente");

    return {
        status: "COOLDOWN"
    };

        }

const candles =
    await getCandles(par);

// DIAGNÓSTICO temporário (16/09/2026): usuário comparou o preço de
// entrada de um sinal real com o gráfico ao vivo da própria corretora
// (XM) e encontrou aquele preço só ocorrendo de verdade ~20-38min
// DEPOIS do horário registrado pelo sinal - hipótese de atraso na
// alimentação de dados da TwelveData (o endpoint REST usado aqui não
// é o canal WebSocket de baixa latência deles, que é plano pago).
// TwelveData devolve "datetime" por candle - logar isso contra o
// horário real da requisição mede o atraso de verdade no próximo
// ciclo real, sem depender de suposição. Remover depois de confirmar/
// descartar (ver DOCUMENTACAO/ENGINEERING.md).
if (candles.length) {

    const ultimoCandle = candles[candles.length - 1];

    console.log(`[DIAG-ATRASO] Último candle (5min) de ${par}: datetime=${ultimoCandle.datetime} | agora (UTC)=${new Date().toISOString()}`);

}

const candles15 =
    await obterCandles15ComCache(db, par, getCandles);
        
const highs =
    candles.map(c => Number(c.high));

const lows =
    candles.map(c => Number(c.low));

const closes =
    candles.map(c => Number(c.close));

const closes15 =
    candles15.map(c => Number(c.close));
              
const ema9 =
            ema(9, closes.slice(-30));

const ema21 =
            ema(21, closes.slice(-50));

const ema50 =
    ema(50, closes.slice(-80));

const ema100 =
    ema(100, closes.slice(-120));

const ema200 =
    ema(200, closes);   

const ema9_15 =
    ema(9, closes15.slice(-30));

const ema21_15 =
    ema(21, closes15.slice(-50));

const ema50_15 =
    ema(50, closes15.slice(-80));
 
 const rsiAtual =
    rsi(14, closes.slice(-15));

const adxAtual = calcularADX(
    14,
    highs,
    lows,
    closes
);

 const atrAtual = calcularATR(
    14,
    highs,
    lows,
    closes
);

if (
    ema9 === null ||
    ema21 === null ||
    ema50 === null ||
    ema100 === null ||
    ema200 === null ||
    ema9_15 === null ||
    ema21_15 === null ||
    ema50_15 === null ||
    rsiAtual === null
) {
    console.log("Status.............CANDLES INSUFICIENTES");
return {
    status: "SEM_DADOS"
};
}

// AJUSTE-025 (26/09/2026): candles numéricos extraídos aqui fora (não
// só dentro do `if` do SMC como antes) - agora dois detectores
// independentes precisam deles (SMC condicional à flag, candlestick
// sempre ativo por decisão do usuário).
const candlesNumericos = candles.map(c => ({

    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close)

}));

// MUD-05 (17/09/2026): detecção de order block só roda com a flag
// explicitamente ligada (configuracao?.smcAtivo === true) - padrão
// desligada. Com a flag desligada, `smc` fica null e o score sai
// idêntico ao de antes desta mudança (ver aplicarBonusSMC).
let smc = null;

if (configuracao?.smcAtivo === true) {

    smc = detectarOrderBlock(candlesNumericos, atrAtual, closes[closes.length - 1]);

    console.log(`SMC..............${smc ? `OB ${smc.direcao}${smc.naZona ? " (preço na zona)" : " (fora da zona)"}` : "nenhum OB relevante"}`);

}

// AJUSTE-025 (26/09/2026): detecção de padrão de candlestick (Fase 1 -
// ver scripts/candlePatterns.js) - sempre ativa, sem flag de Config
// (decisão explícita do usuário, diferente do SMC que nasceu com
// opt-in). Mesmo shape de sempre (null = nenhum padrão detectado ou
// candles insuficientes) - nunca derruba a análise.
const candlestick = detectarPadraoCandlestick(candlesNumericos, atrAtual);

console.log(`Candlestick......${candlestick ? `${candlestick.padrao} (${candlestick.direcao})` : "nenhum padrão da Fase 1 detectado"}`);

const qualidade = calcularQualidade(
    ema9,
    ema21,
    ema50,
    ema100,
    ema200,
    rsiAtual,
    adxAtual,
    ema9_15,
    ema21_15,
    ema50_15,
    estatisticas,
    atrAtual,
    smc,
    candlestick

);

// ===================================================
// DIREÇÃO DEFINIDA PELO MARKET ANALYZER
// ===================================================

direcao = qualidade.tendencia;

// ===================================================
// PERFIL OPERACIONAL
//
// configuracao vem do Firestore (configuracoes/geral,
// gravado pela tela de Config); perfil normalizado em
// maiúsculas para casar com as tabelas de moneyManager.js
// e decisionEngine.js.
// ===================================================

const perfil = (configuracao?.perfil || "balanceado").toUpperCase();

const banca = configuracao?.tipoConta === "SIMULADA"
    ? (configuracao.saldoSimulado ?? configuracao.saldoInicial)
    : (configuracao?.saldoReal ?? configuracao?.saldoInicial);

// ===================================================
// MONEY MANAGER
// ===================================================

// Par cruzado (nem base nem cotação é USD - EUR/JPY, GBP/JPY,
// EUR/GBP): calcularValorPip() precisa da cotação da moeda de
// cotação contra o dólar pra converter o pip corretamente (ver
// comentário grande em moneyManager.js). Busca antes de chamar
// analisarFinanceiro - reusa o mesmo getCandles injetado pelo
// scanner, sem custo extra de configuração.
let cotacaoCruzada;

if (parEhCruzado(par)) {

    const { simbolo, inverter } = simboloCotacaoCruzada(par) || {};

    if (simbolo) {

        const candlesCruzados = await getCandles(simbolo, "1min", 1);
        const cotacao = Number(candlesCruzados[candlesCruzados.length - 1]?.close);

        if (Number.isFinite(cotacao) && cotacao > 0) {

            cotacaoCruzada = inverter ? 1 / cotacao : cotacao;

        }

    }

}

// ===================================================
// CASCATA DE APROVAÇÃO (AJUSTE-028, 26/09/2026)
// ---------------------------------------------------
// Decisão explícita do usuário (via AskUserQuestion, 26/09/2026):
// enquanto o "ovo e galinha" do CONSERVADOR (PENDENCIAS-ESTRATEGICAS-
// RMI.md, seção 6 - o gate de 30 operações do próprio perfil nunca se
// auto-alimenta, porque RIGOR_PERFIL em statisticsEngine.js só conta
// operação já aprovada NO CONSERVADOR) não tem solução definitiva, o
// app não fica em zero sinal quando o perfil CONFIGURADO é
// CONSERVADOR: tenta CONSERVADOR primeiro; se não bater, tenta
// BALANCEADO; se não bater, tenta AGRESSIVO. O primeiro nível que
// aprovar é o que vale - inclusive pra risco financeiro (lote/TP/SL):
// decisão explícita do usuário foi usar o risco do nível que REALMENTE
// aprovou (ex.: aprovou em Agressivo, lote/TP/SL do Agressivo), não
// sempre o risco mais conservador. A análise técnica (score, tendência,
// RSI, SMC, candlestick) é a MESMA pros três - só a régua de aprovação
// (scoreMinimo/multi-timeframe/expectativa) muda, exatamente como os
// perfis sempre diferiram entre si.
//
// Isso NÃO resolve o "ovo e galinha": uma operação aprovada em
// BALANCEADO continua não contando pra estatística do CONSERVADOR
// (RIGOR_PERFIL exige rigor igual ou maior, por design, e está certo -
// uma operação Balanceado não é evidência de qualidade Conservador).
// Resolve um problema diferente e complementar: não ficar parado
// enquanto a decisão de verdade (perfil interno "APRENDIZADO" ou
// equivalente, ver seção 6 do doc) não é tomada. Escopo confirmado:
// só quando o perfil CONFIGURADO é CONSERVADOR (não genérico pra
// qualquer perfil) e sempre automático (sem checkbox novo em Config).
//
// Simplificação assumida, registrada em vez de escondida: `estatisticas`
// (taxaAcerto/operacoesElegiveis) é calculada UMA VEZ upstream
// (scanner.js), filtrada pelo rigor do perfil CONFIGURADO (Conservador -
// hoje 0%/SEM_DADOS, ver AJUSTE-027). Ao tentar BALANCEADO/AGRESSIVO
// aqui, a expectativa financeira desses níveis usa essa MESMA
// taxaAcerto (a visão do Conservador), não a própria história de cada
// nível - recalcular por nível exigiria nova consulta ao Firestore
// aqui dentro (obterEstatisticasPar é assíncrono, hoje só chamado em
// scanner.js). Fora de escopo deste contorno temporário.
const ORDEM_CASCATA_CONSERVADOR = ["CONSERVADOR", "BALANCEADO", "AGRESSIVO"];

const perfisParaTentar =
    perfil === "CONSERVADOR"
        ? ORDEM_CASCATA_CONSERVADOR
        : [perfil];

let financeiro;
let decisao;
let perfilResolvido;
const tentativasCascata = [];

for (const perfilTentativa of perfisParaTentar) {

    const financeiroTentativa = analisarFinanceiro({

        probabilidade:
             estatisticas.resumo.taxaAcerto,

        adx:
            adxAtual,

        atr:
            atrAtual,

        banca,

        lote: configuracao?.lote,

        tpUSD: configuracao?.tp,

        slUSD: configuracao?.sl,

        perfil: perfilTentativa,

        par,

        precoAtual: closes[closes.length - 1],

        cotacaoCruzada

    });

    const decisaoTentativa = avaliarOperacao({

        score: qualidade.score,

        qualidade: qualidade.qualidade,

        tendencia: qualidade.tendencia,

        multi: qualidade.multi,

        confianca: qualidade.confidenceLevel,

        recomendacaoFinanceira: financeiroTentativa.recomendacao,

        expectativa: financeiroTentativa.expectativa,

        perfil: perfilTentativa,

        // MUD-02 (17/09/2026): antes usava estatisticas.operacoes (contado
        // pelo RÓTULO do perfil - travava o CONSERVADOR estruturalmente,
        // ver statisticsEngine.js). Agora usa a contagem por SCORE. Fallback
        // pro comportamento antigo (?? estatisticas.operacoes) se o campo
        // faltar por qualquer motivo, em vez de quebrar.
        operacoesHistoricas: estatisticas.operacoesElegiveis ?? estatisticas.operacoes,

        // AJUSTE-009 (24/09/2026): decisionEngine.js's avaliarOperacao()
        // passa a vetar RSI extremo contra a direção do sinal - precisa do
        // valor numérico do RSI, que já era calculado aqui mas nunca era
        // repassado pra essa chamada.
        rsi: rsiAtual

    });

    financeiro = financeiroTentativa;
    decisao = decisaoTentativa;
    perfilResolvido = perfilTentativa;

    tentativasCascata.push({
        perfil: perfilTentativa,
        aprovado: decisaoTentativa.aprovado === true,
        status: decisaoTentativa.status,
        motivo: decisaoTentativa.motivo,
        expectativa: financeiroTentativa.expectativa
    });

    if (decisao.aprovado) break;

    if (perfisParaTentar.length > 1) {
        console.log(`Cascata...........${perfilTentativa} reprovado (${decisao.motivo})`);
    }

}

const rebaixadoDaCascata = perfilResolvido !== perfil;

// AJUSTE-032 (26/09/2026): grava esta análise (aprovada OU reprovada)
// com todos os componentes do score e indicadores brutos - base pro
// "score sombra" e pra rotulagem hipotética offline (ver
// scripts/analysisLogger.js). Nunca interfere na decisão acima.
if (typeof registrarAnalise === "function") {

    try {

        await registrarAnalise(montarRegistroAnalise({
            par,
            perfilConfigurado: perfil,
            perfilResolvido,
            decisao,
            tentativasCascata,
            qualidade,
            financeiro,
            indicadores: {
                ema9, ema21, ema50, ema100, ema200,
                ema9_15, ema21_15, ema50_15,
                rsi: rsiAtual,
                adx: adxAtual,
                atr: atrAtual
            },
            precoEntrada: closes[closes.length - 1],
            ultimoCandleDatetime: candles[candles.length - 1]?.datetime,
            janelaOrigem
        }));

    } catch (erroRegistro) {

        console.log(`Aviso: falha ao registrar análise: ${erroRegistro.message}`);

    }

}

if (!decisao.aprovado) {

    // AJUSTE-027 (26/09/2026): antes disto, um sinal REPROVADO só
    // logava status+motivo - o valor numérico de qualidade.score (o
    // que decisionEngine.js realmente comparou contra o scoreMinimo
    // do perfil) nunca aparecia em lugar nenhum, nem no log nem no
    // Firestore (sinal reprovado não é salvo). Impossível de fora
    // saber se uma reprovação por "Score abaixo do mínimo" está na
    // margem (ex.: 52 contra 55) ou longe (ex.: 20 contra 55) - achado
    // testando o perfil Conservador (que só reprovou por score, 2 dias
    // seguidos, sem nenhum outro motivo aparecer). Só observabilidade,
    // não muda decisão nenhuma.
    console.log(`Score.............${qualidade.score}`);
    console.log(`Qualidade.........${qualidade.qualidade}`);
    console.log(`Status............${decisao.status}`);
    console.log(`Motivo............${decisao.motivo}`);

    return {
        status: decisao.status,
        motivo: decisao.motivo
    };

}

if (rebaixadoDaCascata) {
    console.log(`Cascata...........aprovado em ${perfilResolvido} (configurado: ${perfil})`);
}

direcao = decisao.direcao;

// ===================================================
// FILTRO DE CONFIANÇA
// ===================================================

// Apenas registra a confiança.
// Nesta fase ela não reprova operações.
// O peso já é aplicado pelo Market Analyzer.

console.log(
    `Confidence.......${qualidade.confidenceLevel}`
);
        

// ===================================================
// FILTRO ESTATÍSTICO
// ===================================================

if (qualidade.historico === "RUIM") {

    console.log(
        "Histórico.........RUIM (penalizado no score)"
    );

}
    
// ===================================================
// FILTRO INSTITUCIONAL
// ===================================================

        // ===================================================
// RISCO
// ===================================================
//
// BUG-021 (09/09/2026): o comentário original dizia "temporariamente
// vindo do Decision Engine", mas decisionEngine.js's avaliarOperacao()
// nunca chegou a devolver um campo `.risco` - decisao.risco sempre foi
// undefined, então este fallback SEMPRE era o valor usado, com
// riscoRetorno/riscoPercentual fixos em null. financeiro.rewardRisk/
// riscoPercentual (calculados corretamente por moneyManager.js) nunca
// chegavam ao documento salvo - só ficavam acessíveis via o campo
// aninhado operacao.financeiro.rewardRisk, não no nível esperado por
// quem lesse operacao.rewardRisk diretamente. Corrigido: usa os
// valores já calculados por financeiro em vez de null fixo.
const risco = decisao.risco || {
    lote: financeiro.lote,
    tpUSD: financeiro.tpUSD,
    slUSD: financeiro.slUSD,
    riscoRetorno: financeiro.rewardRisk,
    riscoPercentual: financeiro.riscoPercentual,
    aprovado: true,
    justificativas: []
};

// ===================================================
// OBJETO DE ANÁLISE
// ===================================================

const analise = {

    par,

    direcao,

    // PENTE-FINO-001 (10/09/2026): `perfil` era calculado (linha acima)
    // mas nunca persistido no documento salvo. statisticsEngine.js's
    // operacaoAtendeRigorDoPerfil() depende de `dados.perfil` pra
    // decidir se uma operação passada conta como evidência pro perfil
    // ATUAL - sem esse campo, toda operação salva sempre caía no
    // fallback "BALANCEADO" (nunca "CONSERVADOR"), fazendo o perfil
    // Conservador nunca conseguir acumular as 30 operações mínimas
    // exigidas por decisionEngine.js, para sempre - mesmo com milhares
    // de sinais reais no histórico. Confirmado com teste isolado antes
    // da correção.
    //
    // AJUSTE-028 (26/09/2026): com a cascata de aprovação, `perfil` aqui
    // passa a ser o nível que REALMENTE aprovou (perfilResolvido) - não
    // necessariamente o configurado em Config. É o valor correto pra
    // RIGOR_PERFIL (uma operação aprovada em Balanceado deve contar como
    // evidência Balanceado, não Conservador). `perfilConfigurado` guarda
    // o que estava selecionado em Config no momento, pra UI e para
    // diferenciar sinal "puro" de sinal rebaixado pela cascata.
    perfil: perfilResolvido,

    perfilConfigurado: perfil,

    rebaixadoDaCascata,

    score: qualidade.score,

    qualidade: qualidade.qualidade,

    tendencia: qualidade.tendencia,

    // MUD-01 (17/09/2026): `qualidade.multi` já era usado por
    // avaliarOperacao() pra decidir aprovar/reprovar (exigirMultiTimeframe
    // no perfil) e aparecia no log ("Multi TF..."), mas nunca era
    // persistido no documento salvo - não havia como reavaliar
    // retroativamente se um sinal passado teria satisfeito esse critério.
    multi: qualidade.multi,

    scoreTecnico: qualidade.scoreTecnico,

    emaScore: qualidade.emaScore,

    rsiScore: qualidade.rsiScore,

    adxScore: qualidade.adxScore,

    tendenciaScore: qualidade.tendenciaScore,

    confidenceLevel: qualidade.confidenceLevel,

    confidenceMultiplier: qualidade.confidenceMultiplier,

    confiabilidade: qualidade.confiabilidade,

    historico: qualidade.historico,

    pesoHistorico: qualidade.pesoHistorico,

    // AJUSTE-007 (24/09/2026): calcularQualidade() já devolvia
    // smcDetectado/smcScore desde o MUD-05 (17/09/2026), mas nunca
    // eram copiados pro objeto `analise` salvo no Firestore - o bônus/
    // penalidade de ±3 já influenciava scoreFinal corretamente, só o
    // DETALHE (qual order block, direção, se o preço estava na zona)
    // nunca ficava visível em lugar nenhum depois de salvo. Sem
    // efeito quando a flag smcAtivo está desligada ou nenhum OB
    // relevante foi encontrado (smcDetectado fica null, smcScore 0 -
    // mesmo shape de sempre, só que agora persistido).
    smcDetectado: qualidade.smcDetectado,

    smcScore: qualidade.smcScore,

    // AJUSTE-025 (26/09/2026): mesma lógica do AJUSTE-007 acima, pro
    // padrão de candlestick (Fase 1) em vez do order block SMC -
    // candlestickDetectado fica null quando nenhum dos 6 padrões foi
    // encontrado nesse ciclo (mesmo shape sempre, agora persistido).
    candlestickDetectado: qualidade.candlestickDetectado,

    candlestickScore: qualidade.candlestickScore,

    // AJUSTE-019 (24/09/2026): qual janela de horário admitiu este
    // par nesta análise - "asia"/"londres"/"novaYork"/"personalizado"
    // (null se chamado fora do fluxo real do scanner). Motivado por
    // dúvida real do usuário sobre um sinal de par JPY fora do
    // horário configurado em "Personalizado" - a janela asiática é
    // incondicional nesse modo (AJUSTE-005/006), não um bug; este
    // campo deixa isso rastreável sinal a sinal, sem precisar
    // reconstruir o raciocínio.
    janelaOrigem: janelaOrigem || null,

    estatisticas,

    financeiro,

    risco,

    // FEATURE-010 (10/09/2026): risco acima do recomendado pelo Money
    // Manager não bloqueia mais o sinal (ver decisionEngine.js) - vira
    // este aviso, salvo junto do sinal, pra aparecer na tela de
    // Histórico. O bloqueio de verdade ficou só em js/historico.js's
    // alternarOperacaoReal (não deixa marcar como operação REAL sem
    // saldo suficiente pra cobrir o SL).
    avisoRisco: decisao.avisoRisco || null,

    avisoExpectativa: decisao.avisoExpectativa || null,

    indicadores: {

        ema9,
        ema21,
        ema50,
        ema100,
        ema200,

        ema9_15,
        ema21_15,
        ema50_15,

        rsi: rsiAtual,

        adx: adxAtual,

        atr: atrAtual

    }

};

const operacao = decisao.operacao || {

    ...analise,

    status: "ABERTA",

    precoEntrada: closes[closes.length - 1],

    inicioOperacao: Date.now(),

    lote: risco.lote,

    tpUSD: risco.tpUSD,

    slUSD: risco.slUSD,

    rewardRisk: risco.riscoRetorno,

    riscoPercentual: risco.riscoPercentual,

    expectativa: financeiro.expectativa,

    aprovado: risco.aprovado,

    justificativasRisco: risco.justificativas,

    decisao: decisao.status,

    motivoDecisao: decisao.motivo,

    justificativasDecisao: decisao.justificativas,

    confiancaDecisao: decisao.confianca

};
        
        
await salvarOperacao(db, operacao);

if (enviarPushAbertura) {

    // Best-effort de verdade: sem try/catch aqui, uma falha no envio
    // (FCM fora do ar, token malformado etc.) escaparia pro try/catch
    // GERAL desta função (linha ~447) e faria analisarPar() retornar
    // status "ERRO" mesmo com a operação já salva com sucesso no
    // Firestore - um sinal real, persistido, reportado como se tivesse
    // falhado. Confirmado com teste antes de ir pra produção.
    try {

        await enviarPushAbertura(operacao);

    } catch (erroPush) {

        console.log(`Aviso: falha ao enviar push de abertura: ${erroPush.message}`);

    }

}

console.log(`Direção...........${direcao}`);
console.log(`EMA9..............${ema9.toFixed(5)}`);
console.log(`EMA21.............${ema21.toFixed(5)}`);
console.log(`RSI...............${rsiAtual.toFixed(2)}`);
console.log(`ADX...............${adxAtual.toFixed(2)}`);
console.log(`Slope............${qualidade.slope}`);
console.log(`Alinhamento......${qualidade.alinhamento}`);
console.log(`Simetria.........${qualidade.simetria}`);
console.log(`Distância........${qualidade.distancia}`);
console.log(`Multi TF.........${qualidade.multi}`);
console.log(`Histórico........${qualidade.historico}`);
console.log(`Assertividade....${estatisticas.resumo.taxaAcerto}%`);
console.log(`Confiabilidade...${qualidade.confiabilidade}%`);
console.log(`Confidence.......${qualidade.confidenceLevel}`);
console.log(`Peso Histórico...${qualidade.pesoHistorico}`);
console.log(`Wins............${estatisticas.wins}`);
console.log(`Loss............${estatisticas.loss}`);
console.log(`Operações.......${estatisticas.operacoes}`);
console.log(`EMA Score........${qualidade.emaScore}`);
console.log(`RSI Score........${qualidade.rsiScore}`);
console.log(`ADX Score........${qualidade.adxScore}`);
console.log(`Trend Score......${qualidade.tendenciaScore}`);
console.log(`Score Técnico....${qualidade.scoreTecnico}`);
console.log(`Penalização......${qualidade.penalizacao}`);
console.log(`Qualidade.........${qualidade.qualidade}`);
console.log(`Score.............${qualidade.score}`);
console.log(`Lote............${operacao.lote}`);
console.log(`TP USD..........${operacao.tpUSD}`);
console.log(`SL USD..........${operacao.slUSD}`);
console.log(`Risk/Reward.....${operacao.rewardRisk}`);
console.log(`Expectativa.....${operacao.expectativa}`);
console.log(`Financeiro......${financeiro.recomendacao.mensagem}`);
console.log("Status............SALVO");

return {
    status: "SALVO",
    operacao
};

    } catch (e) {
console.log("Status............ERRO");
console.log(`Motivo............${e.message}`);

return {
    status: "ERRO",
    motivo: e.message
};
    }

}

module.exports = {
    analisarPar,
    // MUD-05: exportado só pra teste isolado da detecção em si, sem
    // precisar montar todo o pipeline de analisarPar().
    detectarOrderBlock
};
