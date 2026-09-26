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

const { db, admin } = require("./firebase");

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
    existeCooldown,
    limiteDiarioAtingido
} = require("./riskManager");

const {
    enviarPushAbertura: enviarPushAberturaBase
} = require("./pushNotifier");

// Pré-vinculado a admin/db reais (scripts/firebase.js), pra
// pairAnalyzer.js poder chamar só com a operação, sem precisar saber
// de Firebase Admin - mantém pairAnalyzer.js testável sem
// credenciais reais (ver comentário no próprio parâmetro).
const enviarPushAbertura =
    (operacao) => enviarPushAberturaBase(admin, db, operacao);

// AJUSTE-032 (26/09/2026): mesmo padrão do push acima - pré-vinculado ao
// db real, injetado no pairAnalyzer.js (que continua sem saber de
// Firebase). Grava toda análise que chega na decisão em `analises`.
const {
    registrarAnalise: registrarAnaliseBase
} = require("./analysisLogger");

const registrarAnalise =
    (registro) => registrarAnaliseBase(db, registro);

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

// AJUSTE-019 (24/09/2026): extraído de dentro de dentroJanelaPadrao()
// pra virar uma função genérica, reutilizável pelas janelas fixas de
// Londres/Nova York (ver SESSAO_LONDRES/SESSAO_NOVA_YORK mais abaixo).
// Lógica de dia da semana/virada de meia-noite idêntica à de sempre -
// nenhum comportamento mudou pra quem usa o modo Personalizado.
function dentroDeJanela(horarioInicio, horarioFim, janelaSeguranca, context) {

    const { diaSemana, minutosDoDia } = obterAgoraBrasil();

    // Sábado: nunca há janela operacional
    if (diaSemana === 6) {
        return false;
    }

    if (diaSemana === 0) {
        return minutosDoDia >= (18 * 60);
    }

    const [horaInicio, minutoInicio] =
        horarioInicio
            .split(":")
            .map(Number);

    const [horaFim, minutoFim] =
        horarioFim
            .split(":")
            .map(Number);

    const inicio =
        horaInicio * 60 + minutoInicio;

    const fim =
        horaFim * 60 + minutoFim;

    // Janela de segurança: para de abrir operações X minutos
    // antes do horário de fim configurado, para não iniciar uma
    // operação sem tempo de desenvolver antes do encerramento.
    const fimComSeguranca =
        fim - (Number(janelaSeguranca) || 0);

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

// Janela PADRÃO (modo Personalizado - único horário livre configurado
// pelo usuário, vale pra todos os pares). Mantida como wrapper fino
// sobre dentroDeJanela() pra não quebrar nenhum chamador existente.
function dentroJanelaPadrao(context) {

    return dentroDeJanela(
        context.configuracao.horarioInicio,
        context.configuracao.horarioFim,
        context.configuracao.janelaSeguranca,
        context
    );

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
// AJUSTE-006 (23/09/2026): janela deixa de cortar em 23:59 - esse
// corte NUNCA teve base em dado real, era só um atalho de engenharia
// pra evitar rollover de dia (ver histórico do comentário acima,
// "seria preciso tratar virada de dia/semana com cuidado" - BUG-011).
// Passa a virar a meia-noite e ir até 04:00, cobrindo o overlap real
// Sydney/Tóquio (mesma fonte externa citada acima). Só de seg-qui
// (sexta à noite continua de fora, perto demais do fechamento
// semanal) - mas a CONTINUAÇÃO de uma janela aberta quinta à noite
// até a madrugada de sexta é permitida (é o fim de uma janela que já
// começou, não abertura nova). Conta roda em SIMULADA (ver
// CONFIG_PADRAO, sem capital real automático em jogo) - o ganho é
// acumular histórico mais rápido pros pares JPY/AUD/NZD, que é o
// gargalo real hoje (ver PENDENCIAS-ESTRATEGICAS-RMI.md seção 6).
// ===================================================

const MOEDAS_JANELA_ASIA = new Set(["JPY", "AUD", "NZD"]);

// Único par explicitamente excluído da janela asiática, mesmo tendo
// moeda elegível - ver justificativa acima.
const PARES_JANELA_ASIA_EXCLUIDOS = new Set(["GBP/JPY"]);

const JANELA_ASIA_INICIO = 21 * 60;
const JANELA_ASIA_FIM_MADRUGADA = 4 * 60;

function parElegivelJanelaAsia(par) {

    if (PARES_JANELA_ASIA_EXCLUIDOS.has(par))
        return false;

    const [moedaBase, moedaCotada] = par.split("/");

    return (
        MOEDAS_JANELA_ASIA.has(moedaBase) ||
        MOEDAS_JANELA_ASIA.has(moedaCotada)
    );

}

// Checagem BRUTA da janela asiática (Mon-Thu 21:00 -> Ter-Sex 04:00),
// sem nenhum fallback pra outra janela - extraída de
// parNaJanelaOperacional() pro modo por sessões (AJUSTE-019) poder
// reusar exatamente a mesma regra de horário/dia da semana que o modo
// Personalizado já usava internamente pra Ásia.
function dentroJanelaAsiaBruta() {

    const { diaSemana, minutosDoDia } = obterAgoraBrasil();

    // Abre janela nova às 21h de seg-qui (sexta fica de fora,
    // perto demais do fechamento semanal real do mercado).
    const abreJanelaNova =
        diaSemana >= 1 &&
        diaSemana <= 4 &&
        minutosDoDia >= JANELA_ASIA_INICIO;

    // AJUSTE-006: continuação até 04:00 do dia SEGUINTE (overlap
    // Sydney/Tóquio, ver comentário acima) - por isso o intervalo
    // de dias é deslocado em +1 em relação a abreJanelaNova (2 a
    // 5, não 1 a 4): terça de madrugada continua a janela aberta
    // segunda à noite, ..., sexta de madrugada continua a de
    // quinta à noite. Segunda de madrugada (continuação de
    // domingo) fica de fora de propósito - domingo nunca abre
    // janela asiática nova (só a reabertura padrão, 18:00+).
    const continuaMadrugada =
        diaSemana >= 2 &&
        diaSemana <= 5 &&
        minutosDoDia <= JANELA_ASIA_FIM_MADRUGADA;

    return abreJanelaNova || continuaMadrugada;

}

// ===================================================
// JANELAS FIXAS — SESSÕES DE LONDRES E NOVA YORK
// ---------------------------------------------------
// AJUSTE-019 (24/09/2026): mesma ideia da janela asiática (moeda
// define elegibilidade, não uma lista fixa de pares), pros outros dois
// mercados. Horários iguais aos presets já existentes na tela de
// Config (js/config.js PRESETS_HORARIO) - duplicação deliberada, mesmo
// padrão do BUG-011 (Node aqui, browser lá).
//
// Só entram em jogo quando o usuário marca pelo menos uma sessão na
// tela de Config (configuracao.sessoesAtivas não vazio) - com o modo
// Personalizado (sessoesAtivas vazio/ausente), o comportamento é
// idêntico ao de sempre: uma janela única, sem restrição de par por
// sessão. Ver parNaJanelaOperacional() abaixo.
// ===================================================

const SESSAO_LONDRES = { horarioInicio: "04:00", horarioFim: "13:00" };
const SESSAO_NOVA_YORK = { horarioInicio: "10:00", horarioFim: "19:00" };

const MOEDAS_SESSAO_LONDRES = new Set(["EUR", "GBP", "CHF"]);
const MOEDAS_SESSAO_NOVA_YORK = new Set(["USD", "CAD"]);

function parElegivelSessaoLondres(par) {

    const [moedaBase, moedaCotada] = par.split("/");

    return (
        MOEDAS_SESSAO_LONDRES.has(moedaBase) ||
        MOEDAS_SESSAO_LONDRES.has(moedaCotada)
    );

}

function parElegivelSessaoNovaYork(par) {

    const [moedaBase, moedaCotada] = par.split("/");

    return (
        MOEDAS_SESSAO_NOVA_YORK.has(moedaBase) ||
        MOEDAS_SESSAO_NOVA_YORK.has(moedaCotada)
    );

}

function parNaJanelaOperacional(par, context) {

    const sessoesAtivas = context.configuracao.sessoesAtivas || [];

    // Modo por sessões: só entra em vigor se o usuário marcou pelo
    // menos um checkbox na tela de Config. Ausente/vazio (todo mundo
    // que ainda não tocou nesse controle novo, ou escolheu
    // Personalizado de propósito) = comportamento INALTERADO.
    const modoSessoes = sessoesAtivas.length > 0;

    const elegivelAsia = parElegivelJanelaAsia(par);

    if (elegivelAsia) {

        // AJUSTE-005/006 preservado, inclusive no modo Personalizado:
        // a janela asiática SEMPRE foi incondicional ali, independente
        // do preset de horário escolhido (é uma regra de negócio fixa,
        // nunca esteve amarrada a presetHorario/horarioInicio/
        // horarioFim). Não regredir isso pra quem não usa o novo modo
        // por sessões é o motivo de "!modoSessoes" vir primeiro aqui.
        //
        // No modo por sessões (AJUSTE-019), passa a depender do
        // checkbox "Ásia" estar marcado - sem isso o checkbox seria
        // decorativo, e o usuário confirmou explicitamente que quer
        // controle real (Q1/Q2 da conversa de 24/09/2026).
        const asiaHabilitada =
            !modoSessoes || sessoesAtivas.includes("asia");

        if (asiaHabilitada && dentroJanelaAsiaBruta()) {
            return true;
        }

        const { diaSemana } = obterAgoraBrasil();

        // Exclusividade Mon-Thu preservada nos dois modos: fora da
        // janela asiática nesses dias, o par NUNCA cai pra Londres/NY
        // nem pra janela padrão (mesmo comportamento de sempre).
        if (diaSemana >= 1 && diaSemana <= 4) {
            return false;
        }

    }

    // Fora da exclusividade Mon-Thu da Ásia (sex/sáb/dom), ou par sem
    // nenhum lastro asiático: modo Personalizado cai na janela única
    // configurada, exatamente como sempre.
    if (!modoSessoes) {
        return dentroJanelaPadrao(context);
    }

    // Modo por sessões: Londres/Nova York, cada um com sua própria
    // janela fixa e elegibilidade por moeda (ver comentário acima).
    if (
        sessoesAtivas.includes("londres") &&
        parElegivelSessaoLondres(par) &&
        dentroDeJanela(
            SESSAO_LONDRES.horarioInicio,
            SESSAO_LONDRES.horarioFim,
            context.configuracao.janelaSeguranca,
            context
        )
    ) {
        return true;
    }

    if (
        sessoesAtivas.includes("novaYork") &&
        parElegivelSessaoNovaYork(par) &&
        dentroDeJanela(
            SESSAO_NOVA_YORK.horarioInicio,
            SESSAO_NOVA_YORK.horarioFim,
            context.configuracao.janelaSeguranca,
            context
        )
    ) {
        return true;
    }

    // Par sem nenhuma sessão marcada que o inclua (ex.: EUR/GBP com só
    // "Nova York" marcada) - fica de fora, de propósito.
    return false;

}

// AJUSTE-019 (24/09/2026): espelha parNaJanelaOperacional() ramo a
// ramo, mas devolve QUAL janela admitiu o par ("asia"/"londres"/
// "novaYork"/"personalizado") em vez de só true/false - pra poder
// gravar no sinal salvo qual foi o critério real de horário usado
// (pedido do usuário, depois de uma dúvida real sobre um sinal de
// USD/JPY às 03:55 com o modo Personalizado selecionado - a resposta
// é a janela asiática incondicional do AJUSTE-005/006, não um bug).
// Só é chamada DEPOIS de parNaJanelaOperacional() já ter confirmado
// true, então null aqui nunca deveria acontecer em uso real - a
// paridade entre as duas é validada em ferramentas/scratchpad.
function identificarOrigemJanela(par, context) {

    const sessoesAtivas = context.configuracao.sessoesAtivas || [];
    const modoSessoes = sessoesAtivas.length > 0;

    const elegivelAsia = parElegivelJanelaAsia(par);

    if (elegivelAsia) {

        const asiaHabilitada =
            !modoSessoes || sessoesAtivas.includes("asia");

        if (asiaHabilitada && dentroJanelaAsiaBruta()) {
            return "asia";
        }

        const { diaSemana } = obterAgoraBrasil();

        if (diaSemana >= 1 && diaSemana <= 4) {
            return null;
        }

    }

    if (!modoSessoes) {
        return dentroJanelaPadrao(context) ? "personalizado" : null;
    }

    if (
        sessoesAtivas.includes("londres") &&
        parElegivelSessaoLondres(par) &&
        dentroDeJanela(
            SESSAO_LONDRES.horarioInicio,
            SESSAO_LONDRES.horarioFim,
            context.configuracao.janelaSeguranca,
            context
        )
    ) {
        return "londres";
    }

    if (
        sessoesAtivas.includes("novaYork") &&
        parElegivelSessaoNovaYork(par) &&
        dentroDeJanela(
            SESSAO_NOVA_YORK.horarioInicio,
            SESSAO_NOVA_YORK.horarioFim,
            context.configuracao.janelaSeguranca,
            context
        )
    ) {
        return "novaYork";
    }

    return null;

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

    // Gate de risco diário + disjuntor de losses consecutivos
    // (prioridade nº 1 das duas auditorias estratégicas, 13-15/09/2026)
    // - checado UMA vez por ciclo, antes do loop de pares, não por
    // par: é um limite de conta inteira, não de um par específico.
    //
    // AJUSTE-001 (16/09/2026): só ativo em conta REAL. Em SIMULADA
    // (fase de teste atual, sem capital de verdade em jogo) travar o
    // Scanner aqui só reduz o volume de sinais que a RMI precisa
    // gerar pra validar o modo Agressivo antes de avançar pro
    // Conservador - o disjuntor existe pra proteger capital real, que
    // não está em risco nesta fase. Decisão do usuário (16/09/2026).
    if (context.configuracao?.tipoConta === "REAL") {

        const perfil =
            (context.configuracao?.perfil || "balanceado").toUpperCase();

        // AJUSTE-001: base do % de risco é o capital de REFERÊNCIA
        // (saldoInicial), não o saldo corrente. Usar o saldo corrente
        // faz o teto encolher conforme a conta perde (e até inverter
        // de sinal se ficar negativo) - travando o Scanner cada vez
        // MAIS cedo em vez de proteger um % fixo do capital alocado.
        // Confirmado em produção real: com saldoSimulado em -$22,47,
        // 8% dava um teto de só -$1,80 - uma única perda do dia já
        // bloqueava o resto do dia inteiro (achado do usuário,
        // 16/09/2026, ao notar que só 1 sinal tinha sido gerado no dia).
        const banca =
            context.configuracao?.saldoInicial;

        const limite = await limiteDiarioAtingido(db, perfil, banca);

        if (limite.bloqueado) {

            console.log("\n========================================");
            console.log(`LIMITE DE RISCO DIÁRIO ATINGIDO (${limite.motivo})`);
            console.log(limite.mensagem);
            console.log("========================================");

            return false;

        }

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
    const sessoesAtivasLog = context.configuracao.sessoesAtivas || [];

    console.log(
        sessoesAtivasLog.length > 0
            ? `Horário.............Sessões: ${sessoesAtivasLog.join(", ")}`
            : `Horário.............${context.configuracao.horarioInicio} - ${context.configuracao.horarioFim} (Personalizado)`
    );

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

        // AJUSTE-019: registra qual janela admitiu este par agora,
        // pra persistir no sinal (ver pairAnalyzer.js `janelaOrigem`).
        const janelaOrigem =
            identificarOrigemJanela(par, context);

        const resultado =
            await analisarPar({

                db,

                par,

                configuracao:
                    context.configuracao,

                estatisticas,

                janelaOrigem,

                getCandles,

                ema,

                rsi,

                calcularADX,

                calcularATR,

                calcularQualidade,

                existeCooldown,

                salvarOperacao,

                enviarPushAbertura,

                registrarAnalise

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

        // AJUSTE-009 (24/09/2026): SEM_VIABILIDADE não tinha case
        // próprio - caía no default abaixo, incrementando
        // `erros` e logando "Erro interno" pra um bloqueio real e
        // esperado (histórico insuficiente, expectativa negativa, ou
        // agora também o veto de RSI extremo), não um erro de
        // execução de verdade. Mesmo bug já identificado numa sessão
        // anterior (nunca confirmado/corrigido até agora) - fica mais
        // importante corrigir agora que o veto de RSI passa a usar
        // esse mesmo status com frequência maior.
        case "SEM_VIABILIDADE":

    context.estatisticas.semSinal++;

    console.log(`Resultado..........Sem viabilidade (${resultado.motivo || "motivo não informado"})`);

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
//
// AJUSTE-019 (24/09/2026): guard adicionado - main() só roda
// automaticamente quando este arquivo é executado DIRETAMENTE
// (`node scripts/scanner.js`, exatamente como forex-scanner-real.yml
// já faz - nenhuma mudança de comportamento em produção). Antes,
// main() rodava incondicionalmente mesmo se este arquivo fosse
// require()ado por outro script (ex.: uma ferramenta de validação) -
// descoberto ao escrever testes isolados pra AJUSTE-019 que precisavam
// requerer o módulo real: sem este guard, qualquer require() daqui,
// com credenciais reais presentes, dispararia um ciclo de scanner de
// verdade como efeito colateral silencioso de um import.
if (require.main === module) {
    main();
}

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = {

    main,

    carregarConfiguracao,

    validarExecucao,

    executarScanner,

    // AJUSTE-019 (24/09/2026): expostos só pra validação isolada
    // (ferramentas/scratchpad) poder testar a lógica REAL de janela
    // operacional/sessões, sem duplicar a regra numa cópia.
    obterAgoraBrasil,
    dentroDeJanela,
    dentroJanelaPadrao,
    dentroJanelaAsiaBruta,
    parElegivelJanelaAsia,
    parElegivelSessaoLondres,
    parElegivelSessaoNovaYork,
    parNaJanelaOperacional,
    identificarOrigemJanela

};

// ===================================================
// FIM DO SCANNER RMI V2
// ===================================================

