// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// SCANNER RMI V2
// ---------------------------------------------------
// PARTE 01
// Estrutura Base + Inicialização
// ===================================================

// ===================================================
// DEPENDÊNCIAS
// ===================================================

const { db } = require("./firebase");

const {
    analisarPar
} = require("./pairAnalyzer");

const {
    obterEstatisticasPar
} = require("./statisticsEngine");

const {
    calcularRisco
} = require("./riskEngine");

const {
    getCandles
} = require("./marketData");

const {
    calcularQualidade
} = require("./marketAnalyzer");

const {
    ema,
    rsi,
    calcularADX,
    calcularATR
} = require("./utils");

const {
    salvarOperacao,
    existeCooldown
} = require("./riskManager");

// ===================================================
// CONFIGURAÇÃO PADRÃO
// (Fallback caso Firestore esteja indisponível)
// ===================================================

const CONFIG_PADRAO = {

    scannerAtivo: true,

    perfil: "balanceado",

    delay: 1500,

    cooldown: 30,

    horarioInicio: "07:30",

    horarioFim: "18:00",

    janelaSeguranca: 30,

    candles: 20,

    lote: 0.04,

    tp: 5,

    sl: 5,

    conta: "simulada",

    saldoInicial: 1000,

    apiAtiva: 1,

    pares: [
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "AUD/USD",
        "USD/CAD",
        "USD/CHF",
        "NZD/USD",
        "EUR/JPY",
        "GBP/JPY",
        "EUR/GBP"
    ]
};

// ===================================================
// ESTADO GLOBAL DO SCANNER
// ===================================================

const SCANNER = {

    iniciadoEm: null,

    configuracao: null,

    pares: [],

    estatisticas: {

        operacoes: 0,

        semSinal: 0,

        cooldown: 0,

        erros: 0,

        tempoExecucao: 0

    }

};

// ===================================================
// CARREGA CONFIGURAÇÃO
// Firestore → Fallback
// ===================================================

async function carregarConfiguracao() {

    try {

        const doc = await db
            .collection("configuracoes")
            .doc("geral")
            .get();

        if (!doc.exists) {

            console.log(
                "Configuração não encontrada. Utilizando padrão."
            );

            return {
                ...CONFIG_PADRAO
            };

        }

        return {

            ...CONFIG_PADRAO,

            ...doc.data()

        };

    }

    catch (erro) {

        console.log(
            "Erro ao carregar configuração.",
            erro.message
        );

        return {

            ...CONFIG_PADRAO

        };

    }

}

// ===================================================
// INICIALIZA ESTADO
// ===================================================

async function inicializarScanner() {

    SCANNER.iniciadoEm = Date.now();

    SCANNER.configuracao =
        await carregarConfiguracao();

    SCANNER.pares =
        [...SCANNER.configuracao.pares];

    SCANNER.estatisticas = {

        operacoes: 0,

        semSinal: 0,

        cooldown: 0,

        erros: 0,

        tempoExecucao: 0

    };

}

// ===================================================
// Continua na PARTE 02
// Validações
// Mercado
// Horário
// Status
// Logs
// ===================================================

// ===================================================
// PARTE 02
// Validações do Ambiente
// ===================================================

// ===================================================
// STATUS DO SCANNER
// ===================================================

async function scannerAtivo() {

    try {

        const doc = await db
            .collection("scanner")
            .doc("status")
            .get();

        if (!doc.exists)
            return true;

        return doc.data()?.ativo !== false;

    }

    catch (erro) {

        console.log(
            "Não foi possível verificar o status do Scanner."
        );

        return true;

    }

}

// ===================================================
// MERCADO ABERTO
// ===================================================

function mercadoAberto() {

    const agora = new Date();

    const diaSemana = agora.getDay();

    // Domingo
    if (diaSemana === 0)
        return false;

    // Sábado
    if (diaSemana === 6)
        return false;

    return true;

}

// ===================================================
// HORÁRIO OPERACIONAL
// ===================================================

function horarioOperacional() {

    const agora = new Date();

    const horaAtual = agora.toLocaleTimeString(
        "pt-BR",
        {
            timeZone: "America/Sao_Paulo",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit"
        }
    );

    const [hora, minuto] =
        horaAtual
            .split(":")
            .map(Number);

    const minutosAgora =
        hora * 60 + minuto;

    const [horaInicio, minutoInicio] =
        SCANNER.configuracao
            .horarioInicio
            .split(":")
            .map(Number);

    const [horaFim, minutoFim] =
        SCANNER.configuracao
            .horarioFim
            .split(":")
            .map(Number);

    const inicio =
        horaInicio * 60 + minutoInicio;

    const fim =
        horaFim * 60 + minutoFim;

    return (
        minutosAgora >= inicio &&
        minutosAgora <= fim
    );

}

// ===================================================
// VALIDAÇÕES GERAIS
// ===================================================

async function validarExecucao() {

    if (!await scannerAtivo()) {

        console.log("\n========================================");
        console.log("SCANNER DESATIVADO");
        console.log("========================================");

        return false;

    }

    if (!mercadoAberto()) {

        console.log("\n========================================");
        console.log("MERCADO FECHADO");
        console.log("========================================");

        return false;

    }

    if (!horarioOperacional()) {

        console.log("\n========================================");
        console.log("FORA DO HORÁRIO OPERACIONAL");
        console.log(
            `${SCANNER.configuracao.horarioInicio} às ${SCANNER.configuracao.horarioFim}`
        );
        console.log("========================================");

        return false;

    }

    if (!SCANNER.pares.length) {

        console.log("\n========================================");
        console.log("NENHUM PAR CONFIGURADO");
        console.log("========================================");

        return false;

    }

    return true;

}

// ===================================================
// LOG DE INICIALIZAÇÃO
// ===================================================

function imprimirCabecalho() {

    console.clear();

    console.log("========================================");
    console.log("FOREX ASSIST - REAL MONEY INTELLIGENCE");
    console.log("SCANNER RMI V2");
    console.log("========================================");

    console.log(`Perfil..............${SCANNER.configuracao.perfil}`);
    console.log(`Conta...............${SCANNER.configuracao.conta}`);
    console.log(`Pares...............${SCANNER.pares.length}`);
    console.log(`Candles.............${SCANNER.configuracao.candles}`);
    console.log(`Delay...............${SCANNER.configuracao.delay} ms`);
    console.log(`Cooldown............${SCANNER.configuracao.cooldown} min`);
    console.log(`Horário.............${SCANNER.configuracao.horarioInicio} - ${SCANNER.configuracao.horarioFim}`);

    console.log("========================================");

}

// ===================================================
// LOG POR PAR
// ===================================================

function iniciarAnalisePar(par, estatisticas) {

    console.log("\n========================================");

    console.log(`Par.................${par}`);

    console.log(
        `Histórico...........${estatisticas.wins}W/${estatisticas.loss}L`
    );

    console.log(
        `Assertividade.......${estatisticas.taxaAcerto}%`
    );

    console.log(
        `Confiabilidade......${estatisticas.status}`
    );

    console.log("========================================");

}

// ===================================================
// Continua na PARTE 03
// Núcleo da execução
// Loop principal
// PairAnalyzer
// Risk Engine
// Tratamento dos resultados
// ===================================================

// ===================================================
// PARTE 03
// Núcleo da Execução
// ===================================================

// ===================================================
// EXECUTA A ANÁLISE DE UM PAR
// ===================================================

async function executarAnalisePar(par) {

    try {

        const estatisticas =
            await obterEstatisticasPar(
                db,
                par
            );

        iniciarAnalisePar(
            par,
            estatisticas
        );

        const resultado =
            await analisarPar({

                db,

                par,

                configuracao:
                    SCANNER.configuracao,

                estatisticas,

                getCandles,

                ema,

                rsi,

                calcularADX,

                calcularATR,

                calcularQualidade,

                existeCooldown,

                salvarOperacao

            });

        await tratarResultado(

            par,

            resultado,

            estatisticas

        );

    }

    catch (erro) {

        SCANNER.estatisticas.erros++;

        console.log("");

        console.log("ERRO");

        console.log(par);

        console.log(erro.message);

    }

}

// ===================================================
// PROCESSA O RESULTADO
// ===================================================

async function tratarResultado(

    par,

    resultado,

    estatisticas

) {

    if (!resultado)
        return;

    switch (resultado.status) {

        case "SALVO":

            await processarOperacaoSalva(

                resultado,

                estatisticas

            );

            SCANNER.estatisticas.operacoes++;

            break;

        case "SEM_SINAL":

            SCANNER.estatisticas.semSinal++;

            console.log("Resultado..........Sem sinal");

            break;

        case "SEM_QUALIDADE":

            SCANNER.estatisticas.semSinal++;

            console.log("Resultado..........Sem qualidade");

            break;

        case "COOLDOWN":

            SCANNER.estatisticas.cooldown++;

            console.log("Resultado..........Cooldown");

            break;

        default:

            SCANNER.estatisticas.erros++;

            console.log("Resultado..........Erro");

            break;

    }

    console.log("");

    console.log(`${par} finalizado.`);

}

// ===================================================
// PROCESSA OPERAÇÃO SALVA
// ===================================================

async function processarOperacaoSalva(

    resultado,

    estatisticas

) {

    const risco = calcularRisco({

        score:
            resultado.operacao.score,

        historico:
            estatisticas,

        atr:
            resultado.operacao.atr,

        loteBase:
            resultado.operacao.lote,

        tpBase:
            resultado.operacao.tpUSD,

        slBase:
            resultado.operacao.slUSD

    });

    console.log("");

    console.log("========== OPERAÇÃO ==========");

    console.log(
        `Par...............${resultado.operacao.par}`
    );

    console.log(
        `Direção...........${resultado.operacao.direcao}`
    );

    console.log(
        `Score.............${resultado.operacao.score}`
    );

    console.log(
        `Lote..............${risco.lote}`
    );

    console.log(
        `TP................${risco.tpUSD} USD`
    );

    console.log(
        `SL................${risco.slUSD} USD`
    );

 console.log(
        `Risco.............${risco.riscoPercentual}%`
    );

    console.log(
        `R/R...............${risco.rewardRisk}`
    );

    console.log(
        `Expectativa.......${risco.expectativa}`
    );

    console.log("==============================");

}

// ===================================================
// LOOP PRINCIPAL
// ===================================================

async function executarScanner() {

    for (const par of SCANNER.pares) {

        await executarAnalisePar(par);

        await aguardarDelay();

    }

}

// ===================================================
// DELAY ENTRE PARES
// ===================================================

async function aguardarDelay() {

    return new Promise(resolve => {

        setTimeout(

            resolve,

            SCANNER.configuracao.delay

        );

    });

}

// ===================================================
// Continua na PARTE 04
// Finalização
// Estatísticas
// Atualização do status
// main()
// module.exports
// ===================================================

// ===================================================
// PARTE 04
// Finalização
// ===================================================

// ===================================================
// CALCULA TEMPO TOTAL
// ===================================================

function finalizarEstatisticas() {

    SCANNER.estatisticas.tempoExecucao = (

        (Date.now() - SCANNER.iniciadoEm)

        / 1000

    ).toFixed(1);

}

// ===================================================
// RESUMO FINAL
// ===================================================

function imprimirResumoFinal() {

    console.log("");

    console.log("========================================");
    console.log("SCANNER FINALIZADO");
    console.log("========================================");

    console.log(
        `Operações..........${SCANNER.estatisticas.operacoes}`
    );

    console.log(
        `Sem sinal..........${SCANNER.estatisticas.semSinal}`
    );

    console.log(
        `Cooldown...........${SCANNER.estatisticas.cooldown}`
    );

    console.log(
        `Erros..............${SCANNER.estatisticas.erros}`
    );

    console.log(
        `Tempo..............${SCANNER.estatisticas.tempoExecucao}s`
    );

    console.log("========================================");

}

// ===================================================
// ATUALIZA STATUS DO SCANNER
// ===================================================

async function registrarExecucao() {

    try {

        await db

            .collection("scanner")

            .doc("ultimaExecucao")

            .set({

                executadoEm:

                    new Date(),

                tempo:

                    Number(
                        SCANNER.estatisticas.tempoExecucao
                    ),

                operacoes:

                    SCANNER.estatisticas.operacoes,

                semSinal:

                    SCANNER.estatisticas.semSinal,

                cooldown:

                    SCANNER.estatisticas.cooldown,

                erros:

                    SCANNER.estatisticas.erros,

                perfil:

                    SCANNER.configuracao.perfil,

                conta:

                    SCANNER.configuracao.conta,

                pares:

                    SCANNER.pares.length,

                candles:

                    SCANNER.configuracao.candles

            });

    }

    catch (erro) {

        console.log(

            "Falha ao registrar execução.",

            erro.message

        );

    }

}

// ===================================================
// FLUXO PRINCIPAL
// ===================================================

async function main() {

    try {

        await inicializarScanner();

        const valido =

            await validarExecucao();

        if (!valido)

            return;

        imprimirCabecalho();

        await executarScanner();

        finalizarEstatisticas();

        imprimirResumoFinal();

        await registrarExecucao();

        process.exit(0);

    }

    catch (erro) {

        console.error("");

        console.error("========================================");

        console.error("ERRO FATAL DO SCANNER");

        console.error("========================================");

        console.error(erro);

        process.exit(1);

    }

}

// ===================================================
// INICIALIZAÇÃO
// ===================================================

main();

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = {

    main,

    carregarConfiguracao,

    inicializarScanner,

    validarExecucao,

    executarScanner

};

// ===================================================
// FIM DO SCANNER RMI V2
// ===================================================

