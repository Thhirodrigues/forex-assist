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

perfil: "balanceado",

delay: 1500,

cooldown: 30,

// Janela padrão 07:30-18:00 (Brasília) não é arbitrária: é uma
// regra de negócio do RMI, não só um parâmetro operacional.
// 18:00 Brasília ≈ 16h EST = fechamento de Nova York (sem DST no
// Brasil desde 2019); operar depois disso significa entrar bem na
// virada de liquidez NY -> Sydney, com volatilidade mais errática.
// A intenção da RMI é buscar os "melhores mercados" (maior liquidez,
// menor volatilidade), não operar 24h só porque o mercado está aberto.
// Ver janelaSeguranca abaixo, que reforça essa mesma lógica.
horarioInicio: "07:30",

horarioFim: "18:00",

// Minutos antes de horarioFim em que o Scanner para de ABRIR novas
// operações (a janela operacional efetiva termina em
// horarioFim - janelaSeguranca). Existe pelo mesmo motivo do
// horarioFim: evitar abrir posição perto demais do fechamento de NY,
// sem tempo de desenvolver antes da liquidez cair.
janelaSeguranca: 30,

// Minimo real exigido pela analise (ver CANDLES_MINIMO_SEGURO abaixo).
candles: 250,

lote: 0.04,

tp: 5,

sl: 5,

tipoConta: "SIMULADA",

saldoInicial: 1000,

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
// PISO DE SEGURANÇA - QUANTIDADE DE CANDLES
// ---------------------------------------------------
// pairAnalyzer.js calcula ema200 sobre o array INTEIRO
// de closes (sem slice). Com menos de 200 candles, ema200
// sempre retorna null e o par cai em "CANDLES INSUFICIENTES"
// (SEM_DADOS) - ou seja, zero sinal, sempre, para qualquer par.
// Este piso protege o Scanner mesmo se `configuracoes/geral`
// tiver um valor antigo/inválido gravado (ex.: antes desta
// correção, a tela de Config oferecia 10/20/30/50, todos
// abaixo do mínimo real).
// ===================================================

const CANDLES_MINIMO_SEGURO = 200;

async function criarContextoExecucao() {

    const configuracao =
        await carregarConfiguracao();

    const outputsize = Math.max(
        Number(configuracao.candles) || configuracao.outputsize || 250,
        CANDLES_MINIMO_SEGURO
    );

    // Reflete o valor EFETIVO (já com o piso aplicado) de volta em
    // configuracao, para que logs e o resumo salvo no Firestore
    // mostrem o que realmente foi usado, não o valor bruto configurado.
    configuracao.candles = outputsize;

    configurarMarketData({

    timeframe: configuracao.timeframe || "5min",

    outputsize,

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

    foraDaJanela: 0,

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
// HORÁRIO OPERACIONAL — JANELA PADRÃO
// ===================================================
//
// Segunda a sábado: janela configurável (padrão 07:30–18:00, com
// mais janelaSeguranca minutos de corte antes do fim - ver
// CONFIG_PADRAO acima para a razão de negócio desses dois valores:
// não é um horário arbitrário, é a janela de liquidez/volatilidade
// que a RMI busca, encerrando perto do fechamento de Nova York).
// Domingo: sessão de reabertura, 18:00–23:59. É uma janela
// diferente da semanal porque o pregão só existe a partir
// das 18h nesse dia — não faz sentido aplicar o mesmo
// horarioInicio/horarioFim configurado para os outros dias.
//
// Esta é a janela PADRÃO, aplicada a todos os pares. Alguns pares
// específicos têm uma janela ADICIONAL (sessão asiática) - ver
// parNaJanelaOperacional() logo abaixo, que é quem de fato decide
// se um par pode operar agora.
// ===================================================

function dentroJanelaPadrao(context) {

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

    // Janela de segurança: para de abrir operações X minutos
    // antes do horário de fim configurado, para não iniciar uma
    // operação sem tempo de desenvolver antes do encerramento.
    const janelaSeguranca =
        Number(context.configuracao.janelaSeguranca) || 0;

    const fimComSeguranca =
        fim - janelaSeguranca;

    // Janela normal (não atravessa a meia-noite): mesma lógica de
    // sempre.
    if (fim >= inicio) {

        return (
            minutosDoDia >= inicio &&
            minutosDoDia <= fimComSeguranca
        );

    }

    // Janela atravessa a meia-noite (ex.: preset "Ásia + madrugada",
    // 21:00-04:00 do dia seguinte). "Começa" a noite (inicio) OU
    // "continua" na madrugada (até o fim com segurança).
    //
    // Sexta à noite nunca INICIA uma janela nova: o pregão real fecha
    // por volta das 19h de Brasília nesse dia, o que mercadoAberto()
    // não modela (só exclui sábado inteiro) - abrir uma janela nova
    // logo depois disso seria operar num vácuo de liquidez que nossa
    // checagem de mercado aberto não detecta. A CONTINUAÇÃO de uma
    // janela que já começou na noite de quinta (madrugada de sexta)
    // continua permitida normalmente.
    const comecaANoite =
        minutosDoDia >= inicio && diaSemana !== 5;

    const continuaNaMadrugada =
        minutosDoDia <= fimComSeguranca;

    return comecaANoite || continuaNaMadrugada;

}

// ===================================================
// JANELA ADICIONAL — SESSÃO ASIÁTICA (TÓQUIO/SYDNEY)
// ---------------------------------------------------
// Regra de negócio da RMI (07/09/2026): "buscar o melhor mercado,
// com menor volatilidade" não é uniforme entre os pares - cada
// moeda tem sua sessão de maior liquidez. Dar a MESMA janela extra
// pra todo mundo seria o oposto disso: EUR/GBP, por exemplo, fica
// rarefeito e ruidoso fora do horário de Londres, então incluí-lo
// aqui pioraria a qualidade, não melhoraria.
//
// A elegibilidade é pela MOEDA (base ou cotada é JPY, AUD ou NZD),
// não por uma lista fixa de pares - a tela de Config permite ao
// usuário escolher entre 20 pares (`TODOS_PARES` em js/config.js),
// bem além dos 10 monitorados por padrão. Se a regra fosse uma lista
// fixa de strings, ligar um par fora dessa lista (ex.: AUD/JPY,
// AUD/NZD, NZD/JPY - todos com lastro asiático tão forte quanto ou
// mais que os 4 pares padrão) cairia sempre na janela comum sem
// ninguém perceber. GBP/JPY é a ÚNICA exceção explícita: é o
// cruzamento historicamente mais volátil ("the beast") - até termos
// dados reais mostrando que compensa, menos volatilidade pesa mais
// que mais sinais.
//
// Horário de início corrigido em 07/09/2026 após checar fonte externa
// (Babypips/Dukascopy, sessão de Tóquio = 00:00-09:00 GMT): Tóquio
// abre às 21:00 de Brasília (GMT-3, sem DST), não às 19:00 como na
// primeira versão. As 19:00-21:00 são, na real, um vácuo de liquidez
// entre o fim de Nova York e a abertura de Tóquio - mantê-las na
// janela era otimismo sem base, não achado de mercado.
//
// Janela ainda simplificada de propósito: 21:00–23:59, sem virar a
// meia-noite (evita bug de rollover de dia) e só de segunda a
// quinta (sexta à noite já está perto demais do fechamento semanal
// real do mercado, por volta das 19h de Brasília, pra arriscar abrir
// operação nova). O overlap real Sydney/Tóquio vai até por volta de
// 04:00 de Brasília - essa madrugada fica de fora por enquanto (seria
// preciso tratar virada de dia/semana com cuidado). Ver recomendação
// registrada em DOCUMENTACAO/ENGINEERING.md (BUG-011).
// ===================================================

const MOEDAS_JANELA_ASIA = new Set(["JPY", "AUD", "NZD"]);

// Único par explicitamente excluído da janela asiática, mesmo tendo
// moeda elegível - ver justificativa acima.
const PARES_JANELA_ASIA_EXCLUIDOS = new Set(["GBP/JPY"]);

const JANELA_ASIA_INICIO = 21 * 60;
const JANELA_ASIA_FIM = 23 * 60 + 59;

function parElegivelJanelaAsia(par) {

    if (PARES_JANELA_ASIA_EXCLUIDOS.has(par))
        return false;

    const [moedaBase, moedaCotada] = par.split("/");

    return (
        MOEDAS_JANELA_ASIA.has(moedaBase) ||
        MOEDAS_JANELA_ASIA.has(moedaCotada)
    );

}

function parNaJanelaOperacional(par, context) {

    if (dentroJanelaPadrao(context))
        return true;

    const { diaSemana, minutosDoDia } = obterAgoraBrasil();

    const elegivelJanelaAsia =
        parElegivelJanelaAsia(par) &&
        diaSemana >= 1 &&
        diaSemana <= 4;

    if (!elegivelJanelaAsia)
        return false;

    return (
        minutosDoDia >= JANELA_ASIA_INICIO &&
        minutosDoDia <= JANELA_ASIA_FIM
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

    // Não há mais um gate único de horário aqui: cada par pode ter
    // sua própria janela (ver parNaJanelaOperacional()). A checagem
    // acontece por par, dentro do loop principal, para não abortar a
    // execução inteira quando só os pares "padrão" estão fora do
    // horário mas algum par com janela asiática ainda está dentro.

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

        if (!parNaJanelaOperacional(par, context)) {

            context.estatisticas.foraDaJanela++;

            console.log(`\n${par}: fora da janela operacional deste par no momento.`);

            return;

        }

        const estatisticas =
            await obterEstatisticasPar(
                db,
                par,
                context.configuracao?.perfil
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

    // BUG-021 (09/09/2026): este resumo chamava riskEngine.js's
    // calcularRisco() pra recalcular lote/TP/SL/risco só pra este log -
    // um SEGUNDO motor de risco, nunca gravado no Firestore, calculando
    // com premissas diferentes do moneyManager.js (que é quem de fato
    // decide o que é salvo). Na prática o log mostrava números que não
    // batiam com a operação real, silenciosamente. Removido o
    // recálculo paralelo: agora imprime os valores REAIS que foram
    // salvos em resultado.operacao (já corretamente ajustados por
    // scripts/moneyManager.js). riskEngine.js continua no repositório,
    // sem uso ativo - ver ENGINEERING.md sobre seu destino em aberto.
    const risco = {

        lote: resultado.operacao.lote,

        tpUSD: resultado.operacao.tpUSD,

        slUSD: resultado.operacao.slUSD,

        riscoPercentual: resultado.operacao.riscoPercentual,

        rewardRisk: resultado.operacao.rewardRisk,

        expectativa: resultado.operacao.expectativa

    };

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
        `Fora da janela.....${context.estatisticas.foraDaJanela}`
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

// Fallback pro saldoInicial (nunca undefined - CONFIG_PADRAO sempre
// tem esse campo) se saldoSimulado/saldoReal não existirem ainda,
// ex.: quando configuracao veio do fallback de erro em
// carregarConfiguracao(). Firestore rejeita undefined.
saldoAtual:

    (context.configuracao.tipoConta === "SIMULADA"

        ? context.configuracao.saldoSimulado

        : context.configuracao.saldoReal)

    ?? context.configuracao.saldoInicial

    ?? 0,

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

