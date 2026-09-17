const admin = require("firebase-admin");
const { getCandles } = require("../scripts/marketData");
const { idCacheDoPar } = require("../scripts/statisticsEngine");
const { calcularValorPip, parEhCruzado, simboloCotacaoCruzada } = require("../scripts/moneyManager");
const { enviarPushEncerramento } = require("../scripts/pushNotifier");

console.log("KEY 1:", !!process.env.API_KEY_1);
console.log("KEY 2:", !!process.env.API_KEY_2);
console.log("KEY 3:", !!process.env.API_KEY_3);

const serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const configuracaoRef = db
    .collection("configuracoes")
    .doc("geral");

// ===================================================
// CONFIGURAÇÕES
// ===================================================

const CONFIG = {
    INTERVALO_MONITORAMENTO_MINUTOS: 5,

    LIMITES: {
        TP_USD: 5,
        SL_USD: -5,
        TP_PIPS: 50,
        SL_PIPS: -50
    }
};

const LIMITES = CONFIG.LIMITES;

// =====================================================
// UTILITÁRIOS
// =====================================================

function calcularPips(par, entrada, fechamento) {

    const fator = par.includes("JPY") ? 100 : 10000;

    return Number(
        ((fechamento - entrada) * fator).toFixed(1)
    );

}

// BUG-025 (10/09/2026): "10 * lote" e o mesmo bug do BUG-024
// (scripts/moneyManager.js), so que numa copia separada, do lado do
// FECHAMENTO da operacao em vez da abertura - so acertava o valor do
// pip pros pares onde USD e a moeda de cotacao (EUR/USD, AUD/USD).
// Reusa calcularValorPip() de moneyManager.js (mesma fonte da
// verdade, nao uma 3a copia da formula) - par e precoAtual precisam
// ser passados por quem chama.
function calcularLucroUSD(pips, lote, par, precoAtual, cotacaoCruzada) {

    const valorPip = calcularValorPip(lote, par, precoAtual, cotacaoCruzada);

    return Number(
        (pips * valorPip).toFixed(2)
    );

}

// BUG-007: o P&L (movimentoPips/lucroAtual) era calculado sempre como
// (preco - entrada), ignorando a direcao. Numa SELL, queda de preco e lucro
// real, mas isso aparecia como prejuizo (e vice-versa) - inverte o sinal
// financeiro de toda operacao SELL encerrada por este checker. As checagens
// de maxPipsFavor/maxPipsContra ja eram corretas (ja tratavam a direcao);
// só o P&L financeiro estava errado.
function calcularMovimentoPips(sinal, preco) {

    return sinal.direcao === "BUY"
        ? calcularPips(sinal.par, sinal.precoEntrada, preco)
        : calcularPips(sinal.par, preco, sinal.precoEntrada);

}

// O cron do result-checker (5 em 5 min, na teoria) sofre atrasos reais de
// horas por limitação do próprio agendador do GitHub Actions em contas
// gratuitas. buscarCandlesDesde() reconstrói TODOS os candles de 5min desde
// a abertura da operação (ou desde a última checagem persistida), em vez de
// olhar só o candle mais recente — senão um TP/SL tocado e revertido no
// meio do intervalo nunca seria visto.
//
// AJUSTE-003 (17/09/2026): "datetime" da TwelveData agora vem
// garantidamente em UTC - scripts/marketData.js passa "&timezone=UTC"
// explicitamente na chamada. Antes disso, a suposição registrada aqui
// (API para Forex responde em UTC por padrão quando o parâmetro não é
// informado) estava ERRADA: medido em produção um offset de ~9h54-55min
// entre o "datetime" retornado e o horário real, o que fazia o filtro
// `timestamp >= desde` logo abaixo nunca cortar o buffer de 10 candles
// extras do outputsize - deixando até 50min de candles de ANTES da
// abertura da operação entrarem na reconstrução do caminho de preço.
async function buscarCandlesDesde(par, desde) {

    const agora = Date.now();

    const minutosDecorridos = Math.max(
        5,
        Math.ceil((agora - desde) / (5 * 60 * 1000))
    );

    const outputsize = Math.min(5000, minutosDecorridos + 10);

    const candles = await getCandles(par, "5min", outputsize);

    return candles
        .map(c => ({
            timestamp: new Date(c.datetime.replace(" ", "T") + "Z").getTime(),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close)
        }))
        .filter(c => c.timestamp >= desde)
        .sort((a, b) => a.timestamp - b.timestamp);

}

// Usuário pediu pra poder analisar o movimento completo do preço,
// da entrada até o encerramento, depois que a operação fecha.
// buscarCandlesDesde() já busca TODOS os candles desde
// sinal.inicioOperacao EM TODO CICLO (não incremental) - no ciclo que
// fecha a operação, `candles` já contém o caminho inteiro, sem
// nenhuma chamada extra à API. Amostra com teto de 300 pontos (em vez
// de gravar o array inteiro) pra não deixar o documento crescer sem
// fim em operações que ficam abertas por horas - mesmo princípio de
// "por um teto no que é ilimitado" já usado em CACHE-001/LIMPEZA-006/
// BUG-017. Sempre inclui o último candle (o do fechamento), mesmo
// quando isso significa passar de 300 por 1.
function amostrarCaminhoPrecos(candles, maxPontos = 300) {

    if (!candles.length) return [];

    if (candles.length <= maxPontos) {

        return candles.map(c => ({ t: c.timestamp, c: c.close }));

    }

    const passo = candles.length / maxPontos;
    const amostra = [];

    for (let i = 0; i < maxPontos; i++) {

        const indice = Math.floor(i * passo);
        amostra.push({ t: candles[indice].timestamp, c: candles[indice].close });

    }

    const ultimo = candles[candles.length - 1];

    if (amostra[amostra.length - 1].t !== ultimo.timestamp) {

        amostra.push({ t: ultimo.timestamp, c: ultimo.close });

    }

    return amostra;

}

// BUG-025 (10/09/2026): antes disto, TP_USD/SL_USD/TP_PIPS/SL_PIPS
// eram SEMPRE $5/$5/50 pips fixos (CONFIG.LIMITES), lidos de
// "configuracao?.limites" - campo que nunca existiu em
// configuracoes/geral (js/config.js nunca grava "limites"), ou seja
// esse fallback sempre era usado, pra QUALQUER TP/SL/lote que o
// usuario configurasse na tela. O fechamento da operacao (WIN/LOSS/
// quanto ganhou-perdeu) ignorava completamente o que a analise
// decidiu na abertura (pairAnalyzer.js/moneyManager.js), inclusive
// depois de decidirConfiguracaoMercado() ajustar TP/SL pra 3 (ADX
// fraco/mercado lento) - o checker fechava mesmo assim em $5/$5.
// Corrigido: le tpUSD/slUSD/tpPips/slPips do PROPRIO sinal salvo
// (o que realmente foi decidido quando essa operacao abriu - nao o
// que a config diz agora, que pode ja ter mudado entre a abertura e
// o fechamento). CONFIG.LIMITES vira só o fallback pra sinais
// salvos antes desta correcao, que nao tem esses campos.
function limitesDoSinal(sinal) {

    return {

        TP_USD: sinal.tpUSD ?? LIMITES.TP_USD,

        SL_USD: -Math.abs(sinal.slUSD ?? Math.abs(LIMITES.SL_USD)),

        TP_PIPS: sinal.financeiro?.tpPips ?? LIMITES.TP_PIPS,

        SL_PIPS: -Math.abs(sinal.financeiro?.slPips ?? Math.abs(LIMITES.SL_PIPS))

    };

}

function calcularResultadoOperacao({

    sinal,
    candles,
    configuracao,
    cotacaoCruzada

}) {

    const limites = limitesDoSinal(sinal);
    const lote = sinal.lote ?? 0.01;

    let precoMaximo = sinal.precoMaximo ?? sinal.precoEntrada;
    let precoMinimo = sinal.precoMinimo ?? sinal.precoEntrada;
    let maxPipsFavor = sinal.maxPipsFavor ?? 0;
    let maxPipsContra = sinal.maxPipsContra ?? 0;

    let motivoEncerramento = null;
    let candleEncerramento = null;

    // MUD-03 (17/09/2026): o critério de pips já usava os extremos
    // intrabar corretos (precoMaximo/precoMinimo, acumulados abaixo),
    // mas o critério FINANCEIRO (o que fecha a maioria das operações
    // reais) media o lucro só no `close` da vela de 5min - o preço
    // atravessava o SL no meio da vela, voltava um pouco, e a operação
    // só encerrava quando o FECHAMENTO já tinha passado muito do
    // limite. Confirmado com dado real de produção: SL combinado de
    // $3-5 fechando com prejuízo de $6,88-$10,04 (81% a 235% acima do
    // combinado). Corrigido: mede TP no extremo FAVORÁVEL e SL no
    // extremo ADVERSO da vela (mesmos precoMaximo/precoMinimo já
    // usados pelos pips), não mais os dois contra o mesmo `close`.
    let precoExtremoEncerramento = null;

    // Percorre os candles em ordem cronológica, atualizando os extremos e
    // checando as condições de saída a cada passo - assim, um TP/SL tocado
    // no meio do caminho é detectado mesmo que candles posteriores já
    // tenham revertido o preço.
    for (const candle of candles) {

        precoMaximo = Math.max(precoMaximo, candle.high);
        precoMinimo = Math.min(precoMinimo, candle.low);

        // MUD-03: preço favorável/adverso desta vela, conforme a
        // direção - mesma lógica que maxPipsFavor/maxPipsContra já
        // aplicam, reaproveitada aqui pro critério financeiro.
        const precoFavoravel = sinal.direcao === "BUY" ? precoMaximo : precoMinimo;
        const precoAdverso = sinal.direcao === "BUY" ? precoMinimo : precoMaximo;

        if (sinal.direcao === "BUY") {

            maxPipsFavor = Math.max(
                maxPipsFavor,
                calcularPips(sinal.par, sinal.precoEntrada, precoMaximo)
            );

            maxPipsContra = Math.min(
                maxPipsContra,
                calcularPips(sinal.par, sinal.precoEntrada, precoMinimo)
            );

        } else {

            maxPipsFavor = Math.max(
                maxPipsFavor,
                calcularPips(sinal.par, precoMinimo, sinal.precoEntrada)
            );

            maxPipsContra = Math.min(
                maxPipsContra,
                calcularPips(sinal.par, precoMaximo, sinal.precoEntrada)
            );

        }

        const lucroNoExtremoFavoravel = calcularLucroUSD(
            calcularMovimentoPips(sinal, precoFavoravel),
            lote,
            sinal.par,
            precoFavoravel,
            cotacaoCruzada
        );

        const lucroNoExtremoAdverso = calcularLucroUSD(
            calcularMovimentoPips(sinal, precoAdverso),
            lote,
            sinal.par,
            precoAdverso,
            cotacaoCruzada
        );

        const tpFinanceiroAtingido = lucroNoExtremoFavoravel >= limites.TP_USD;
        const slFinanceiroAtingido = lucroNoExtremoAdverso <= limites.SL_USD;

        // MUD-03: regra de desempate - com candles OHLC não dá pra
        // saber se o preço tocou primeiro a máxima ou a mínima dentro
        // da mesma vela. Se a MESMA vela satisfaz TP e SL ao mesmo
        // tempo, assume-se SL primeiro (hipótese pessimista) - convenção
        // padrão em backtest pra não superestimar resultado. Fora desse
        // empate específico, a ordem de checagem original (TP -> SL ->
        // TP_PIPS -> SL_PIPS) é preservada.
        if (tpFinanceiroAtingido && slFinanceiroAtingido) {
            motivoEncerramento = "SL_FINANCEIRO";
            precoExtremoEncerramento = precoAdverso;
        } else if (tpFinanceiroAtingido) {
            motivoEncerramento = "TP_FINANCEIRO";
            precoExtremoEncerramento = precoFavoravel;
        } else if (slFinanceiroAtingido) {
            motivoEncerramento = "SL_FINANCEIRO";
            precoExtremoEncerramento = precoAdverso;
        } else if (maxPipsFavor >= limites.TP_PIPS) {
            motivoEncerramento = "TP_PIPS";
            precoExtremoEncerramento = precoFavoravel;
        } else if (maxPipsContra <= limites.SL_PIPS) {
            motivoEncerramento = "SL_PIPS";
            precoExtremoEncerramento = precoAdverso;
        }

        if (motivoEncerramento) {
            candleEncerramento = candle;
            break;
        }

    }

    const candleFinal = candleEncerramento ?? candles[candles.length - 1];

    // AJUSTE-002 (17/09/2026): o MUD-03 corrigiu o extremo gravado pro
    // fechamento FINANCEIRO, mas deixou TP_PIPS/SL_PIPS usando
    // candleFinal.close por engano - achando que esses dois critérios
    // eram "só contagem de pips", sem valor em dólar associado.
    // Confirmado com dado real (NZD/USD 16/09 15:11): motivoEncerramento
    // SL_PIPS (rompeu -13 pips no extremo intrabar), mas
    // resultadoFinanceiro gravado saiu +$0,74 porque usava o close da
    // vela, que tinha recuado - LOSS com valor em dólar positivo.
    // Agora TP_PIPS/SL_PIPS também gravam precoExtremoEncerramento
    // (precoFavoravel/precoAdverso), igual ao caminho financeiro -
    // se o critério que fechou foi o extremo intrabar, o valor em
    // dólar gravado precisa vir do mesmo extremo, não do close.
    const precoAtual = precoExtremoEncerramento ?? candleFinal.close;

    const movimentoPips = calcularMovimentoPips(sinal, precoAtual);

    const lucroAtual = calcularLucroUSD(
        movimentoPips,
        lote,
        sinal.par,
        precoAtual,
        cotacaoCruzada
    );

    // BUG-020 (09/09/2026): saldoAntes/saldoDepois só eram calculados
    // (e configuracoes/geral.saldoSimulado só era incrementado, mais
    // abaixo) quando tipoConta === "SIMULADA" - um switch global único,
    // mutuamente exclusivo com o fluxo de marcação manual da Conta Real
    // (js/historico.js). Isso significava que a Conta Simulada - pensada
    // pra somar TODOS os sinais fechados, sempre, servindo de
    // comparação "quanto eu teria ganho seguindo tudo" - parava de ser
    // atualizada assim que o usuário mudasse pra modo Real (justamente
    // o modo necessário pra usar a marcação manual da Conta Real).
    // Agora ela sempre acompanha todo sinal fechado, independente do
    // tipoConta ativo. Conta Real continua responsabilidade exclusiva
    // da marcação manual em js/historico.js (alternarOperacaoReal),
    // nunca tocada por aqui.
    const saldoAntes =
        configuracao.saldoSimulado ?? configuracao.saldoInicial ?? 0;

    const saldoDepois =
        Number((saldoAntes + lucroAtual).toFixed(2));

const resultadoFinanceiro =
    Number(lucroAtual.toFixed(2));

const agora =
    candleEncerramento ? candleFinal.timestamp : Date.now();

const tempoOperacao =
    agora - sinal.inicioOperacao;

    const operacaoFinalizada =
        motivoEncerramento !== null &&
        sinal.status !== "ENCERRADA";

    const resultado =

    motivoEncerramento === "TP_FINANCEIRO" ||
    motivoEncerramento === "TP_PIPS"

        ? "WIN"

        : "LOSS";

    return {

precoAtual,
precoMaximo,
precoMinimo,
movimentoPips,
maxPipsFavor,
maxPipsContra,
lucroAtual,
resultadoFinanceiro,
motivoEncerramento,
resultado,
saldoAntes,
saldoDepois,
agora,
tempoOperacao,
operacaoFinalizada

    };

}

// =====================================================
// PROCESSAMENTO
// =====================================================

async function verificarSinais() {

    console.log("====================================");
    console.log("Forex Assist Result Checker");
    console.log("====================================");

    // BUG-014: estas duas leituras (config + operações pendentes)
    // nunca tiveram proteção contra erro - diferente de
    // scripts/scanner.js, que sempre isolou a leitura de config e
    // cada par num try/catch próprio. Quando a cota do Firestore
    // estoura, essas duas leituras falham e, sem captura, o processo
    // quebra sem tratamento - o GitHub Actions marca a execução
    // inteira como "failed" (diferente do Scanner, que sempre
    // aparece verde mesmo com o mesmo erro, porque ele já se
    // protegia). Isso gerava uma enchente de e-mails de "Run failed"
    // a cada 5 minutos.
    let configuracaoSnap;
    let snapshot;

    try {

        configuracaoSnap = await configuracaoRef.get();

        snapshot = await db
            .collection("historico")
            .where("status", "==", "ABERTA")
            .get();

    } catch (erro) {

        console.log(
            `Erro ao ler Firestore (configuração/operações pendentes): ${erro.message}`
        );
        console.log("Abortando esta execução do Result Checker.");

        return;

    }

    console.log(`Pendentes: ${snapshot.size}`);


    for (const documento of snapshot.docs) {

        const sinal = documento.data();

        if (
            !sinal.inicioOperacao ||
            !sinal.precoEntrada ||
            !sinal.par
        ) {
            continue;
        }

        try {

const desde = sinal.inicioOperacao;

const candles =
    await buscarCandlesDesde(sinal.par, desde);

if (!candles.length) {

    console.log(
        `${sinal.par}: nenhum candle novo desde a abertura, pulando.`
    );

    continue;

}

// Par cruzado (nem base nem cotação é USD - EUR/JPY, GBP/JPY,
// EUR/GBP): calcularValorPip() precisa da cotação da moeda de
// cotação contra o dólar. Busca uma vez por sinal pendente aqui
// (não dentro do loop de velas em calcularResultadoOperacao) pra
// não multiplicar chamada de API à toa.
let cotacaoCruzada;

if (parEhCruzado(sinal.par)) {

    const { simbolo, inverter } = simboloCotacaoCruzada(sinal.par) || {};

    if (simbolo) {

        const candlesCruzados = await getCandles(simbolo, "1min", 1);
        const cotacao = Number(candlesCruzados[candlesCruzados.length - 1]?.close);

        if (Number.isFinite(cotacao) && cotacao > 0) {

            cotacaoCruzada = inverter ? 1 / cotacao : cotacao;

        }

    }

}

const {

    precoAtual,
    precoMaximo,
    precoMinimo,
    movimentoPips,
    maxPipsFavor,
    maxPipsContra,
    lucroAtual,
    resultadoFinanceiro,
    saldoAntes,
    saldoDepois,
    resultado,
    agora,
    tempoOperacao,
    motivoEncerramento,
    operacaoFinalizada

} = calcularResultadoOperacao({

    sinal,
    candles,
    configuracao: configuracaoSnap.data(),
    cotacaoCruzada

});


    if (operacaoFinalizada) {

    await db.runTransaction(async (transaction) => {

        const operacaoRef = documento.ref;

        const operacaoSnap = await transaction.get(operacaoRef);

        if (!operacaoSnap.exists)
            return;

        const operacao = operacaoSnap.data();

        // Outro processo já encerrou esta operação
        if (operacao.status !== "ABERTA")
            return;


        transaction.update(operacaoRef, {

            precoAtual,

            precoMaximo,

            precoMinimo,

            maxPipsFavor,

            maxPipsContra,

            lucroAtual,

            resultadoFinanceiro,

            saldoAntes,

            saldoDepois,

            status: "ENCERRADA",
            
            resultado,

            motivoEncerramento,

            precoFechamento: precoAtual,

            fimOperacao: agora,

            tempoOperacao,

            caminhoPrecos: amostrarCaminhoPrecos(candles)

        });

        transaction.update(configuracaoRef, {

            saldoSimulado: saldoDepois

        });

        // CACHE-001 (10/09/2026): invalida o cache de estatísticas
        // deste par (scripts/statisticsEngine.js) assim que uma
        // operação dele fecha - o próximo ciclo do Scanner que pedir
        // estatísticas deste par vai buscar de novo no historico
        // (incluindo esta operação recém-fechada) e repovoar o cache,
        // em vez de continuar servindo dados desatualizados.
        transaction.delete(
            db.collection("cacheEstatisticas").doc(idCacheDoPar(sinal.par))
        );

    });

    // Best-effort: enviarPushEncerramento() já engole os próprios
    // erros (ver scripts/pushNotifier.js) e nunca deveria lançar, mas
    // envolvido aqui mesmo assim - uma falha no push nunca pode
    // impedir o restante do ciclo do Result Checker de continuar
    // pros próximos sinais pendentes.
    try {

        await enviarPushEncerramento(admin, db, {
            par: sinal.par,
            resultado,
            resultadoFinanceiro,
            motivoEncerramento
        });

    } catch (erroPush) {

        console.log(`Aviso: falha ao enviar push de encerramento: ${erroPush.message}`);

    }

}
    else {

    await documento.ref.update({

        precoAtual,

        precoMaximo,

        precoMinimo,

        maxPipsFavor,

        maxPipsContra,

        lucroAtual,

        resultadoFinanceiro,
    });

    }

    if (operacaoFinalizada) {

    console.log(
        `Operação encerrada: ${sinal.par} -> ${motivoEncerramento}`
    );

            }

    const resumoOperacao = [
    sinal.par,
    operacaoFinalizada ? "ENCERRADA" : "ABERTA",
    `Atual: ${precoAtual}`,
    `Máx: ${precoMaximo}`,
    `Mín: ${precoMinimo}`,
    `Favor: ${maxPipsFavor} pips`,
    `Contra: ${maxPipsContra} pips`,
    `USD: ${lucroAtual.toFixed(2)}`,
    operacaoFinalizada ? motivoEncerramento : null
]
.filter(Boolean)
.join(" | ");

console.log(resumoOperacao);

        } catch (erro) {

            console.log(
                `Erro em ${sinal.par}: ${erro.message}`
            );

        }

    }

    console.log("Finalizado.");

}

verificarSinais().catch((erro) => {

    // Rede de segurança final: qualquer erro que escape dos
    // try/catch internos (ex.: bug novo, não a cota já tratada acima)
    // ainda derruba a execução com sinal de erro real - não queremos
    // mascarar um bug genuíno, só parar a enchente de "Run failed"
    // causada especificamente pela cota do Firestore.
    console.log(`Erro fatal no Result Checker: ${erro.message}`);
    process.exit(1);

});
