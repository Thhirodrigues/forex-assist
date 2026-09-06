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
    configurarMarketData,
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

tipoConta: "SIMULADA",

saldoInicial: 1000,

apiAtiva: 1,

timeframe: "5min",

outputsize: 250,

timeout: 10000,

maxRetries: 3,

retryDelay: 1000,

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

async function criarContextoExecucao() {

    const configuracao =
        await carregarConfiguracao();

    configurarMarketData({

    apiAtiva: configuracao.apiAtiva,

    timeframe: configuracao.timeframe || "5min",

    outputsize: configuracao.outputsize || 250,

    timeout: configuracao.timeout || 10000,

    maxRetries: configuracao.maxRetries || 3,

    retryDelay: configuracao.retryDelay || 1000

});
    
    return {

    iniciadoEm: Date.now(),

    configuracao,

    pares: [...configuracao.pares],

    ambiente: {

    scannerAtivo: null,

    mercadoAberto: null,

    horarioOperacional: null,

    ultimaExecucao: null

        },

    estatisticas: {

    operacoes: 0,

    semSinal: 0,

    cooldown: 0,

    erros: 0,

    tempoExecucao: 0

        }

    };
}
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
// DATA/HORA EM HORÁRIO DE BRASÍLIA
// ===================================================
//
// mercadoAberto() e horarioOperacional() precisam
// concordar sobre qual dia da semana e qual hora "é
// agora". Calculamos os dois SEMPRE a partir do relógio
// de America/Sao_Paulo (nunca do fuso do runner, que no
// GitHub Actions é UTC), para não abrir uma janela de
// horas de diferença entre os dois filtros perto da
// virada do dia.
// ===================================================

function obterAgoraBrasil() {

    const agora = new Date();

    const brasiliaStr = agora.toLocaleString(
        "en-US",
        { timeZone: "America/Sao_Paulo" }
    );

    const brasilia = new Date(brasiliaStr);

    return {
        diaSemana: brasilia.getDay(), // 0=domingo ... 6=sábado
        minutosDoDia: brasilia.getHours() * 60 + brasilia.getMinutes()
    };

}

// ===================================================
// MERCADO ABERTO
// ===================================================
//
// O Forex fecha na sexta à noite e reabre no domingo às
// 18h (horário de Brasília), quando a sessão de Sydney
// começa. Sábado é sempre fechado. Domingo só é
// considerado aberto a partir das 18h.
// ===================================================

function mercadoAberto() {

    const { diaSemana, minutosDoDia } = obterAgoraBrasil();

    // Sábado: sempre fechado
    if (diaSemana === 6)
        return false;

    // Domingo: fechado até 18h, quando o mercado reabre
    if (diaSemana === 0)
        return minutosDoDia >= (18 * 60);

    return true;

}

// ===================================================
// HORÁRIO OPERACIONAL
// ===================================================
//
// Segunda a sábado: janela configurável (padrão 07:30–18:00).
// Domingo: sessão de reabertura, 18:00–23:59. É uma janela
// diferente da semanal porque o pregão só existe a partir
// das 18h nesse dia — não faz sentido aplicar o mesmo
// horarioInicio/horarioFim configurado para os outros dias.
// ===================================================

function horarioOperacional(context) {

    const { diaSemana, minutosDoDia } = obterAgoraBrasil();

    // Sábado: nunca há janela operacional
    if (diaSemana === 6) {
        return false;
    }

    if (diaSemana === 0) {
        return minutosDoDia >= (18 * 60);
    }

    const [horaInicio, minutoInicio] =
        context.configuracao
            .horarioInicio
            .split(":")
            .map(Number);

    const [horaFim, minutoFim] =
        context.configuracao
            .horarioFim
            .split(":")
            .map(Number);

    const inicio =
        horaInicio * 60 + minutoInicio;

    const fim =
        horaFim * 60 + minutoFim;

    return (
        minutosDoDia >= inicio &&
        minutosDoDia <= fim
    );

}

// ===================================================
// VALIDAÇÕES GERAIS
// ===================================================

async function validarExecucao(context){

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

    if (!horarioOperacional(context)) {

        console.log("\n========================================");
        console.log("FORA DO HORÁRIO OPERACIONAL");
        console.log(
            `${context.configuracao.horarioInicio} às ${context.configuracao.horarioFim}`
        );
        console.log("========================================");

        return false;

    }

       if (!context.pares.length) {

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

function imprimirCabecalho(context) {

    console.clear();

    console.log("========================================");
    console.log("FOREX ASSIST - REAL MONEY INTELLIGENCE");
    console.log("SCANNER RMI V2");
    console.log("========================================");

    console.log(`Perfil..............${context.configuracao.perfil}`);
    console.log(`Conta...............${context.configuracao.tipoConta}`);

    if (context.configuracao.tipoConta === "SIMULADA") {

    console.log(
        `Saldo Simulado.....R$ ${Number(
            context.configuracao.saldoSimulado || 1000
        ).toFixed(2)}`
    );

} else {

    console.log(
        `Saldo Real.........R$ ${Number(
            context.configuracao.saldoReal || 0
        ).toFixed(2)}`
    );

    }
    
    console.log(`Pares...............${context.pares.length}`);
    console.log(`Candles.............${context.configuracao.candles}`);
    console.log(`Delay...............${context.configuracao.delay} ms`);
    console.log(`Cooldown............${context.configuracao.cooldown} min`);
    console.log(`Horário.............${context.configuracao.horarioInicio} - ${context.configuracao.horarioFim}`);

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

async function executarAnalisePar(context,par) {

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
                    context.configuracao,

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
            context,

            par,

            resultado,

            estatisticas

        );

    }

    catch (erro) {

        context.estatisticas.erros++;

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

    context,

    par,

    resultado,

    estatisticas

){

    if (!resultado)
        return;

    switch (resultado.status) {

        case "SALVO":

            await processarOperacaoSalva(

                resultado,

                estatisticas

            );

            context.estatisticas.operacoes++;

            break;

        case "SEM_SINAL":

            context.estatisticas.semSinal++;

            console.log("Resultado..........Sem sinal");

            break;

        case "SEM_QUALIDADE":

            context.estatisticas.semSinal++;

            console.log("Resultado..........Qualidade insuficiente");
            break;

        case "COOLDOWN":

            context.estatisticas.cooldown++;

            console.log("Resultado..........Cooldown");

            break;


         case "REPROVADO":

    context.estatisticas.semSinal++;

    console.log("Resultado..........Reprovado");

    break;

        default:

    context.estatisticas.erros++;

    console.log("Resultado..........Erro interno");

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

async function executarScanner(context) {

    for (const par of context.pares) {

        await executarAnalisePar(
    context,
    par
);

        await aguardarDelay(context);

    }

}

// ===================================================
// DELAY ENTRE PARES
// ===================================================

async function aguardarDelay(context) {

    return new Promise(resolve => {

        setTimeout(

            resolve,

            context.configuracao.delay

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

function finalizarEstatisticas(context) {

    context.estatisticas.tempoExecucao = (

        (Date.now() - context.iniciadoEm)

        / 1000

    ).toFixed(1);

}

// ===================================================
// RESUMO FINAL
// ===================================================

function imprimirResumoFinal(context) {

    console.log("");

    console.log("========================================");
    console.log("SCANNER FINALIZADO");
    console.log("========================================");

    console.log(
        `Operações..........${context.estatisticas.operacoes}`
    );

    console.log(
        `Sem sinal..........${context.estatisticas.semSinal}`
    );

    console.log(
        `Cooldown...........${context.estatisticas.cooldown}`
    );

    console.log(
        `Erros..............${context.estatisticas.erros}`
    );

    console.log(
        `Tempo..............${context.estatisticas.tempoExecucao}s`
    );

    console.log("========================================");

}

// ===================================================
// ATUALIZA STATUS DO SCANNER
// ===================================================

async function registrarExecucao(context) {

    try {

        await db

            .collection("scanner")

            .doc("ultimaExecucao")

            .set({

                executadoEm:

                    new Date(),

                tempo:

                    Number(
                        context.estatisticas.tempoExecucao
                    ),

                operacoes:

                    context.estatisticas.operacoes,

                semSinal:

                    context.estatisticas.semSinal,

                cooldown:

                    context.estatisticas.cooldown,

                erros:

                    context.estatisticas.erros,

                perfil:

                    context.configuracao.perfil,
                

                tipoConta: context.configuracao.tipoConta,

saldoAtual:

    context.configuracao.tipoConta === "SIMULADA"

        ? context.configuracao.saldoSimulado

        : context.configuracao.saldoReal,

                pares:

                    context.pares.length,

                candles:

                    context.configuracao.candles

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

        const context =
    await criarContextoExecucao();

const valido =
    await validarExecucao(context);

if (!valido)
    return;

imprimirCabecalho(context);

await executarScanner(context);

finalizarEstatisticas(context);

imprimirResumoFinal(context);

await registrarExecucao(context);
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

    validarExecucao,

    executarScanner

};

// ===================================================
// FIM DO SCANNER RMI V2
// ===================================================

