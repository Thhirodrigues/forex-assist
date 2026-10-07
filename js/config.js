// ======================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MÓDULO: CONFIGURAÇÕES
//
// Central de Configuração do Sistema
//
// Sprint 09
// RMI V2
// ======================================================

// ======================================================
// PERFIS OPERACIONAIS
// ======================================================

const PERFIS_OPERACIONAIS = [

    {
        id: "agressivo",
        nome: "🟢 Agressivo"
    },

    {
        id: "balanceado",
        nome: "🔵 Balanceado"
    },

    {
        id: "conservador",
        nome: "🟡 Conservador"
    }

];

// ======================================================
// PARES DISPONÍVEIS
// ======================================================

const TODOS_PARES = [

    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "AUD/USD",
    "USD/CAD",

    "USD/CHF",
    "NZD/USD",
    "EUR/JPY",
    "GBP/JPY",
    "EUR/GBP",

    "EUR/AUD",
    "EUR/CAD",
    "EUR/CHF",
    "GBP/CHF",
    "GBP/CAD",

    "AUD/JPY",
    "CAD/JPY",
    "CHF/JPY",
    "AUD/NZD",
    "NZD/JPY"

];

// ======================================================
// CONFIGURAÇÃO PADRÃO
// ======================================================

function configuracaoPadrao() {

    return {

    perfil: "balanceado",

    delay: 1500,

    cooldown: 30,

    // AJUSTE-019 (24/09/2026): substitui presetHorario (radio, uma
    // janela por vez). Vazio = modo Personalizado, horarioInicio/
    // horarioFim livres valem pra todo par (comportamento de sempre).
    // Não-vazio = modo por sessões: cada sessão marcada ("londres",
    // "novaYork", "asia") usa sua própria janela fixa, e só os pares
    // daquela sessão (por moeda) operam nela - ver
    // scripts/scanner.js parNaJanelaOperacional().
    sessoesAtivas: [],

    horarioInicio: "07:30",

    horarioFim: "18:00",

    janelaSeguranca: 30,

    // Minimo real exigido pela analise (EMA200 usa o array
    // inteiro de closes - abaixo de 200 velas o indicador
    // sempre retorna null e o par cai em CANDLES INSUFICIENTES).
    // Ver CANDLES_MINIMO_SEGURO em scripts/scanner.js.
    candles: 250,

    lote: 0.04,

    tp: 5,

    sl: 5,

    conta: "simulada",

    saldoInicial: 1000,

    // AJUSTE-007 (24/09/2026): scripts/pairAnalyzer.js lê
    // configuracao.smcAtivo pra decidir se roda a detecção de order
    // block (MUD-05, 17/09/2026) - até aqui essa flag só existia no
    // Firestore, sem nenhum campo nesta tela (só dava pra ligar
    // escrevendo direto no Console do Firebase). Padrão ligado: já
    // validado com 21 cenários isolados antes de existir controle de
    // tela nenhum, camada secundária que nunca decide sozinha (±3 no
    // score, só quando o preço está na zona do order block).
    smcAtivo: true,

    // 07/10/2026 (pedido do usuário): aviso de lucro parcial. Quando o lucro
    // aberto de um sinal chega a avisoParcialPct % do TP, o verificador manda um
    // push ("encerrar agora ou esperar o TP? você decide") e grava
    // `avisoParcial` no sinal. SÓ AVISA: o fechamento continua sendo do TP/SL
    // (js/checker.js); quem decide encerrar é o usuário, na corretora. Padrão ligado.
    avisoParcialAtivo: true,

    avisoParcialPct: 60,

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
}
// ======================================================
// CARREGAR CONFIGURAÇÕES
// ======================================================

function carregarConfiguracoes() {

    try {

        const dados =
            localStorage.getItem("forexConfig");

        if (!dados)
            return configuracaoPadrao();

        return {

            ...configuracaoPadrao(),

            ...JSON.parse(dados)

        };

    } catch (e) {

        console.error(e);

        return configuracaoPadrao();

    }

}

// ======================================================
// SALVAR CONFIGURAÇÕES
// ======================================================

function salvarConfiguracoes(config) {

    localStorage.setItem(

        "forexConfig",

        JSON.stringify(config)

    );

}

// ======================================================
// RESTAURAR ÚLTIMA CONFIGURAÇÃO SALVA
// ---------------------------------------------------
// Descarta qualquer edição não salva na tela (manual ou vinda do
// botão "Aplicar esses pares" da Sugestão de Agora) e volta pro que
// está de fato gravado em configuracoes/geral no Firestore - a tela
// nunca lia isso automaticamente antes (carregarConfiguracoes() só
// lia o rascunho local), então esta é a primeira vez que a tela pode
// re-sincronizar com o que está realmente salvo.
// ======================================================

async function restaurarConfiguracaoSalva() {

    if (typeof db === "undefined") return null;

    const doc = await db
        .collection("configuracoes")
        .doc("geral")
        .get();

    if (!doc.exists) return null;

    const dados = doc.data();

    const configRestaurado = {

        ...configuracaoPadrao(),

        ...dados,

        // tipoConta no Firestore é MAIÚSCULO ("SIMULADA"/"REAL"); a
        // tela usa conta minúsculo - mesma tradução inversa do save.
        conta: dados.tipoConta === "REAL" ? "real" : "simulada"

    };

    salvarConfiguracoes(configRestaurado);

    return configRestaurado;

}

// ======================================================
// VIEW
// ======================================================

function configView() {

    const config =
        carregarConfiguracoes();

    return `

<div class="card">

<div class="card-title">

⚙️ Configurações RMI

</div>

<div
style="
font-size:12px;
color:#bcc4d5;
margin-bottom:20px;
">

Central de Configuração do
Forex Assist

</div>

<div class="card">

    <div class="card-title">
        🎯 Perfil Operacional
    </div>

    ${renderizarPerfil(config)}

</div>

<div class="card">

    <div class="card-title">
        🤖 Scanner
    </div>

    <div class="list-item">

        Delay entre análises

        <br><br>

        <input

            id="cfgDelay"

            type="number"

            value="${config.delay}"

            style="width:100%;"

        >

        <div
        style="
        margin-top:6px;
        font-size:11px;
        color:#bcc4d5;
        ">

            Milissegundos

    </div>

</div>

<div class="list-item">

Cooldown entre sinais

<br><br>

<input
    id="cfgCooldown"
    type="number"
    value="${config.cooldown}"
    style="width:100%;">

</div>

${renderizarSessoesHorario(config)}

<div class="list-item">

Horário Inicial

<br>
<small style="opacity:.7;">Ignorado quando pelo menos uma sessão está marcada acima - cada sessão usa seu próprio horário fixo. Só vale com Personalizado marcado.</small>
<br><br>

<input
    id="cfgInicio"
    type="time"
    value="${config.horarioInicio}"
    style="width:100%;"
    ${(config.sessoesAtivas || []).length > 0 ? "disabled" : ""}>

</div>

<div class="list-item">

Horário Final

<br><br>

<input
    id="cfgFim"
    type="time"
    value="${config.horarioFim}"
    ${(config.sessoesAtivas || []).length > 0 ? "disabled" : ""}
    style="width:100%;">

</div>

<div class="list-item">

Janela de Segurança (min)

<br>
<small style="opacity:.7;">Nao abre operacao nos ultimos X minutos antes do horario de fim</small>
<br><br>

<input
    id="cfgJanela"
    type="number"
    value="${config.janelaSeguranca}"
    style="width:100%;">

</div>
</div>

<div class="card">
<div class="card-title">

📊 Mercado

</div>

<div class="list-item">

Quantidade de Candles

<br>
<small style="opacity:.7;">Minimo 200 - abaixo disso a analise (EMA200) nao roda</small>
<br><br>

<select
id="cfgCandles"
style="width:100%;">

<option
value="200"
${config.candles==200?"selected":""}>
200 (minimo)
</option>

<option
value="250"
${config.candles==250?"selected":""}>
250 (recomendado)
</option>

<option
value="350"
${config.candles==350?"selected":""}>
350
</option>

<option
value="500"
${config.candles==500?"selected":""}>
500
</option>

</select>

</div>

</div>

<div class="card">

<div class="card-title">

💰 Gerenciamento de Risco

</div>

<div class="list-item">

Lote

<br><br>

<input

id="cfgLote"

type="number"

step="0.01"

value="${config.lote}"

style="width:100%;">

</div>

<div class="list-item">

Take Profit (USD)

<br><br>

<input

id="cfgTP"

type="number"

step="1"

value="${config.tp}"

style="width:100%;">

</div>

<div class="list-item">

Stop Loss (USD)

<br><br>

<input

id="cfgSL"

type="number"

step="1"

value="${config.sl}"

style="width:100%;">

</div>

</div>

<div class="card">

<div class="card-title">

🧠 Análise Institucional (SMC)

</div>

<div class="list-item">

    <label>

        <input

            type="checkbox"

            id="cfgSmcAtivo"

            ${config.smcAtivo ? "checked" : ""}

        >

        Detectar Order Blocks (Smart Money Concepts)

    </label>

    <div style="font-size:11px; color:#bcc4d5; margin-top:6px;">

        Camada secundária de confirmação - nunca aprova nem reprova um
        sinal sozinha. Quando o preço está na zona de um order block
        recente, soma ou subtrai até 3 pontos no score (a favor se o
        OB está na mesma direção do sinal, contra se está na direção
        oposta). Sem order block relevante, não muda nada.

    </div>

</div>

</div>

<div class="card">

<div class="card-title">

💰 Aviso de lucro parcial

</div>

<div class="list-item">

    <label>

        <input

            type="checkbox"

            id="cfgAvisoParcialAtivo"

            ${config.avisoParcialAtivo !== false ? "checked" : ""}

        >

        Avisar quando o lucro chegar a uma parte do alvo

    </label>

    <div style="margin-top:8px;">

        <label for="cfgAvisoParcialPct" style="display:block; margin-bottom:4px;">Percentual do TP (%)</label>

        <input

            type="number"

            id="cfgAvisoParcialPct"

            min="10"

            max="95"

            step="5"

            value="${Number.isFinite(Number(config.avisoParcialPct)) ? config.avisoParcialPct : 60}"

            style="width:100%;">

    </div>

    <div style="font-size:11px; color:#bcc4d5; margin-top:6px;">

        O app só AVISA (uma vez por sinal): "já está em 60% do alvo, quer
        encerrar agora ou esperar o TP?". Ele não fecha nada sozinho; o
        fechamento continua sendo o TP/SL, e encerrar antes é decisão sua,
        na corretora. Cuidado: embolsar cedo costuma aumentar a taxa de
        acerto sem aumentar o lucro total (testado no Laboratório, 360
        dias), e o prejuízo (SL) continua inteiro. O aviso fica gravado no
        sinal para medirmos depois o que teria acontecido.

    </div>

</div>

</div>

<div class="card">

<div class="card-title">

📈 Pares Monitorados

</div>

${avisoSugestaoAplicada()}

<div id="cfgConsumoApi">${renderizarConsumoApi(config)}</div>

${renderizarPares(config)}

</div>

<div class="card">

<div class="card-title">

🏦 Conta

</div>

<div class="list-item">

Saldo Inicial (USD)

<br><br>

<input

id="cfgSaldo"

type="number"

value="${config.saldoInicial}"

style="width:100%;">

<br><br>

<button

id="btnDefinirSaldoReal"

class="button"

style="width:100%; padding:8px; border:none; border-radius:8px; background:rgba(255,152,145,.25); color:white; font-size:12px; cursor:pointer;">

💰 Definir Saldo Inicial da Conta Real Agora

</button>

<div style="font-size:11px; color:#bcc4d5; margin-top:4px;">

Usa o valor acima como saldo atual da Conta Real (o que você tem depositado na corretora hoje). Ação única - use só na primeira vez, ou você vai sobrescrever o saldo já acumulado por WIN/LOSS/aportes. Depois disso, registre aportes futuros pelo Dashboard.

</div>

<br>

<button

id="btnDefinirSaldoSimulada"

class="button"

style="width:100%; padding:8px; border:none; border-radius:8px; background:rgba(58,224,232,.22); color:white; font-size:12px; cursor:pointer;">

🧪 Definir Saldo Inicial da Conta Simulada Agora

</button>

<div style="font-size:11px; color:#bcc4d5; margin-top:4px;">

Usa o valor acima como saldo atual da Conta Simulada (dinheiro fictício, pra testar o app sem risco real). <b>Substitui</b> o saldo atual - não soma nem desconta (ex.: pra ficar com $500, digite 500). A confirmação mostra o saldo atual antes de gravar. Lembre de deixar "Base de Cálculo de Risco" abaixo em "Conta Simulada" enquanto estiver testando, senão isso aqui não afeta o dimensionamento dos sinais.

</div>

</div>

<div class="list-item">

Base de Cálculo de Risco

<br><br>

<select

id="cfgConta"

style="width:100%;">

<option
value="simulada"
${config.conta=="simulada"?"selected":""}>

Usar saldo da Conta Simulada

</option>

<option
value="real"
${config.conta=="real"?"selected":""}>

Usar saldo da Conta Real

</option>

</select>

<div style="font-size:11px; color:#bcc4d5; margin-top:4px;">

Conta Simulada e Conta Real são sempre atualizadas juntas (ver Dashboard) - isso aqui só decide qual das duas é usada como referência pro cálculo de risco por operação (ex: SL de $5 é X% de qual saldo). Use "Conta Real" quando já estiver operando com dinheiro de verdade na corretora.

</div>

</div>

</div>

<button

id="btnSalvarConfig"

class="button start-btn"

style="margin-top:20px;">

💾 Salvar Configurações

</button>

<button

id="btnRestaurarConfig"

class="button"

style="margin-top:10px; width:100%; padding:10px; border:1px solid rgba(255,255,255,.18); border-radius:8px; background:rgba(255,255,255,.10); color:white; font-size:13px; cursor:pointer;">

↩️ Voltar para a Última Configuração Salva

</button>

`;

}

// ======================================================
// RENDERIZA PERFIL OPERACIONAL
// ======================================================

function renderizarPerfil(config) {

    return PERFIS_OPERACIONAIS.map(perfil => `

        <div class="list-item">

            <label>

                <input

                    type="radio"

                    name="perfilOperacional"

                    value="${perfil.id}"

                    ${config.perfil === perfil.id ? "checked" : ""}

                >

                ${perfil.nome}

            </label>

        </div>

    `).join("");

}

// ======================================================
// AVISO - PARES PRÉ-SELECIONADOS PELA "SUGESTÃO DE AGORA"
// ---------------------------------------------------
// Setado por js/pairInsights.js (botão "Aplicar esses pares") antes
// de trocar pra esta aba. Lido e apagado aqui na primeira renderização
// - aparece só uma vez, não persiste em visitas futuras da tela.
// Os pares em si já foram gravados no rascunho local (localStorage)
// pelo botão; nada foi enviado ao Firestore ainda - só o clique em
// "Salvar Configurações" confirma a mudança de verdade.
// ======================================================

function avisoSugestaoAplicada() {

    const veioDaSugestao =
        sessionStorage.getItem("sugestaoAplicada");

    if (!veioDaSugestao) return "";

    sessionStorage.removeItem("sugestaoAplicada");

    return `
        <div style="
            background:rgba(94,248,183,.12);
            border:1px solid rgba(94,248,183,.3);
            border-radius:8px;
            padding:10px 12px;
            margin-bottom:12px;
            font-size:12px;
        ">
            ☝️ Pares pré-selecionados a partir da "Sugestão de Agora"
            do Dashboard. Nada foi salvo ainda - revise abaixo e clique
            em "Salvar Configurações" pra confirmar.
        </div>
    `;

}

// ======================================================
// PRESETS DE JANELA HORÁRIA (mercados)
// ---------------------------------------------------
// Horários de Brasília (GMT-3, sem DST desde 2019). Fontes:
// Babypips/Dukascopy (ver FEATURE-001 em ENGINEERING.md).
//
// AJUSTE-019 (24/09/2026): diferente do preset antigo (só preenchia
// horarioInicio/horarioFim, nunca lido pelo backend por nome), o
// backend agora LÊ configuracao.sessoesAtivas diretamente (ver
// scripts/scanner.js parNaJanelaOperacional()) - os horários fixos
// abaixo (SESSAO_LONDRES/SESSAO_NOVA_YORK/janela asiática) são
// duplicados lá, não lidos daqui.
// ======================================================

// AJUSTE-018 (24/09/2026): preset "asia" corrigido pra refletir o
// horário REAL (usuário: "no horário asiático deve ficar o horário
// que ele funciona realmente, até às 4") - antes ia só até 23:59,
// exigindo um checkbox extra ("Operar também de madrugada") pra
// cobrir o resto do overlap Sydney/Tóquio. Removido o checkbox: a
// janela até 04:00 (atravessando a meia-noite, suportado desde sempre
// por horarioDoPreset()/duracaoJanelaPadraoMinutos() - mesmo padrão
// do AJUSTE-006 no scanner.js real) passa a ser o próprio preset, sem
// opt-in.
//
// AJUSTE-019 (24/09/2026): PRESETS_HORARIO deixa de ser um radio
// (uma janela única por vez) e vira a base de um modo por SESSÕES -
// o usuário marca 1+ checkboxes (Londres/Nova York/Ásia) e cada par
// monitorado só opera dentro da(s) sessão(ões) marcada(s) A QUE ELE
// PERTENCE (por moeda - ver MOEDAS_SESSAO_* abaixo), não mais numa
// janela única igual pra todo mundo. "Personalizado" continua
// existindo, mas agora como alternativa EXCLUSIVA (não combinável com
// as sessões) - volta a ser a janela única livre de sempre
// (horarioInicio/horarioFim). Ver scripts/scanner.js
// parNaJanelaOperacional() pra a implementação real que este UI
// alimenta (configuracao.sessoesAtivas).
//
// Decisão explícita do usuário (24/09/2026): se nenhuma sessão marcada
// cobre o horário atual (ex.: só Londres + Ásia marcadas, sem Nova
// York - buraco das 13h às 21h), o scanner fica parado nesse
// intervalo, de propósito - cada sessão roda só no seu horário
// próprio, sem tentar preencher o buraco com outra janela.
const PRESETS_HORARIO = {

    londres: { horarioInicio: "04:00", horarioFim: "13:00" },

    novaYork: { horarioInicio: "10:00", horarioFim: "19:00" },

    // Vai até 04:00 do dia seguinte, cobrindo o overlap Sydney/Tóquio -
    // mesma janela (fixa, incondicional) que scripts/scanner.js já usa
    // pra pares JPY/AUD/NZD independente deste checkbox estar marcado
    // ou não quando o modo é Personalizado (AJUSTE-005/006); só passa
    // a depender deste checkbox quando pelo menos uma sessão está
    // marcada (modo por sessões).
    asia: { horarioInicio: "21:00", horarioFim: "04:00" }

};

// Elegibilidade por moeda - mesma regra e mesmos nomes de sessão que
// scripts/scanner.js (MOEDAS_SESSAO_LONDRES/MOEDAS_SESSAO_NOVA_YORK) -
// duplicação deliberada, mesmo padrão do BUG-011 (esta tela não pode
// fazer require() do script Node). A Ásia usa MOEDAS_JANELA_ASIA_CFG/
// PARES_JANELA_ASIA_EXCLUIDOS_CFG, já existentes mais abaixo neste
// arquivo (seção "Orçamento de Consultas").
const MOEDAS_SESSAO_LONDRES_CFG = new Set(["EUR", "GBP", "CHF"]);
const MOEDAS_SESSAO_NOVA_YORK_CFG = new Set(["USD", "CAD"]);

function parElegivelSessaoLondresCfg(par) {
    const [moedaBase, moedaCotada] = par.split("/");
    return (
        MOEDAS_SESSAO_LONDRES_CFG.has(moedaBase) ||
        MOEDAS_SESSAO_LONDRES_CFG.has(moedaCotada)
    );
}

function parElegivelSessaoNovaYorkCfg(par) {
    const [moedaBase, moedaCotada] = par.split("/");
    return (
        MOEDAS_SESSAO_NOVA_YORK_CFG.has(moedaBase) ||
        MOEDAS_SESSAO_NOVA_YORK_CFG.has(moedaCotada)
    );
}

function horarioDoPreset(preset) {

    return PRESETS_HORARIO[preset] || null;

}

function renderizarSessoesHorario(config) {

    const sessoesAtivas = config.sessoesAtivas || [];
    const personalizadoAtivo = sessoesAtivas.length === 0;

    const opcoesSessao = [
        { id: "londres", label: "🇬🇧 Mercado de Londres (04:00–13:00)" },
        { id: "novaYork", label: "🇺🇸 Mercado de Nova York (10:00–19:00)" },
        { id: "asia", label: "🌏 Mercado Asiático (21:00–04:00)" }
    ];

    return `
        <div class="list-item">

            Janela de Horário

            <br>
            <small style="opacity:.7;">
                Marque uma ou mais sessões - cada par monitorado opera
                só na(s) sessão(ões) marcada(s) a que ele pertence
                (por moeda). Sem cobertura de nenhuma sessão marcada
                num horário (ex.: buraco entre Londres e Ásia sem Nova
                York), o scanner fica parado nesse intervalo.
            </small>
            <br><br>

            ${opcoesSessao.map(opcao => `
                <label style="display:block; margin-bottom:8px;">
                    <input
                        type="checkbox"
                        class="cfgSessao"
                        value="${opcao.id}"
                        ${sessoesAtivas.includes(opcao.id) ? "checked" : ""}
                    >
                    ${opcao.label}
                </label>
            `).join("")}

            <label style="display:block; margin-top:12px;">
                <input
                    type="checkbox"
                    id="cfgPersonalizado"
                    ${personalizadoAtivo ? "checked" : ""}
                >
                ⚙️ Personalizado (definir manualmente abaixo)
            </label>
            <small style="opacity:.7;">
                Exclusivo - marcar Personalizado desmarca as sessões
                acima, e vice-versa.
            </small>

        </div>
    `;

}

// ======================================================
// ORÇAMENTO DE CONSULTAS - TWELVEDATA
// ---------------------------------------------------
// Orçamento: cada chave do plano grátis dá 800 consultas/dia (conferido
// em 06/10/2026 pelo endpoint /api_usage: plan_daily_limit = 800). O
// rodízio tem 4 chaves (a 4ª entra em scripts/marketData.js quando o
// secret TWELVEDATA_KEY_4 existe) = 3.200/dia. O dia da TwelveData vira
// às 00:00 UTC (21:00 de Brasília), junto com a abertura da janela Ásia.
//
// MODELO (recalibrado em 06/10/2026 contra o consumo REAL medido):
//  - por par e por ciclo do Scanner: 1 chamada de 5 min + 1 de 15 min a
//    cada 3 ciclos (CACHE-002: o candle de 15 min fica em cache por 15
//    min) = 4/3 de chamada. Antes eram 2 fixas, o que superestimava.
//  - um par que está em MAIS DE UMA sessão (ex.: EUR/USD em Londres e em
//    Nova York, que se sobrepõem 10:00-12:30) é consultado UMA vez por
//    ciclo, não uma por sessão: conta-se a UNIÃO das janelas do par.
//  - soma o resumo de mercado do detalhe do sinal (AJUSTE-087): até 2
//    consultas por par/hora para os pares parados (48/dia por par, pior
//    caso).
//  - NÃO soma o verificador de resultados (js/checker.js): ele consulta
//    1 chamada por posição aberta por ciclo, mas um par com posição
//    aberta está em cooldown e o Scanner não o consulta - uma coisa
//    troca a outra (4 posições abertas no dia da medida).
// Conferência: 8 pares, 3 sessões => modelo 1.792 + 384 de resumo; real
// medido às 21:03 UTC de 06/10 = 1.930 (3 chaves, 4 posições abertas).
//
// O ciclo do Scanner é definido pelo pinger externo (cron-job.org),
// fora do alcance deste app - não configurável na tela, então é uma
// CONSTANTE ASSUMIDA aqui. Se o intervalo do pinger mudar, esta conta
// precisa ser atualizada manualmente.
//
// CORREÇÃO DE UMA CORREÇÃO (15/09/2026): esta constante já foi trocada
// de 5 pra 15 um dia antes (BUG-028), lendo só o `cron: '*/15 * * * *'`
// declarado em forex-scanner-real.yml, sem checar o histórico real de
// execuções - exatamente o erro que este projeto documenta não fazer.
// Conferido depois, direto no GitHub Actions: quem dispara de verdade é
// o pinger externo via `workflow_dispatch`, rodando A CADA 5 MINUTOS,
// de forma contínua e sem lacunas (centenas de execuções reais
// checadas) - o `schedule:` nativo do YAML está ali mas não é o que
// governa o cadence real. Revertido pra 5, que é o valor original E o
// valor real - as duas "correções" anteriores desta linha estavam
// erradas em direções opostas por não confirmar contra o log de
// execução real antes de mudar.
//
// MOEDAS_JANELA_ASIA/PARES_JANELA_ASIA_EXCLUIDOS/
// parElegivelJanelaAsia() são uma 3ª cópia da mesma regra de
// scripts/scanner.js e js/pairInsights.js (ver BUG-011) - mesma
// duplicação deliberada e documentada, pra esta tela não depender da
// ordem de carregamento de outro <script>.
// ======================================================

const MINUTOS_POR_CICLO_SCANNER = 5;

const CHAMADAS_POR_PAR_POR_CICLO = 4 / 3;

const CHAVES_TWELVEDATA = 4;

const LIMITE_DIARIO_POR_CHAVE_TWELVEDATA = 800;

const ORCAMENTO_DIARIO_TWELVEDATA = CHAVES_TWELVEDATA * LIMITE_DIARIO_POR_CHAVE_TWELVEDATA;

const CHAMADAS_RESUMO_MERCADO_POR_PAR_POR_DIA = 48;

const MOEDAS_JANELA_ASIA_CFG = new Set(["JPY", "AUD", "NZD"]);

const PARES_JANELA_ASIA_EXCLUIDOS_CFG = new Set(["GBP/JPY"]);

const JANELA_ASIA_INICIO_MIN = 21 * 60;

const JANELA_ASIA_FIM_MIN = 23 * 60 + 59;

function parElegivelJanelaAsiaCfg(par) {

    if (PARES_JANELA_ASIA_EXCLUIDOS_CFG.has(par))
        return false;

    const [moedaBase, moedaCotada] = par.split("/");

    return (
        MOEDAS_JANELA_ASIA_CFG.has(moedaBase) ||
        MOEDAS_JANELA_ASIA_CFG.has(moedaCotada)
    );

}

function duracaoJanelaPadraoMinutos(horarioInicio, horarioFim, janelaSeguranca) {

    const [horaInicio, minutoInicio] = horarioInicio.split(":").map(Number);
    const [horaFim, minutoFim] = horarioFim.split(":").map(Number);

    const inicio = horaInicio * 60 + minutoInicio;
    const fimBruto = horaFim * 60 + minutoFim;
    const fim = fimBruto - (Number(janelaSeguranca) || 0);

    if (fim >= inicio)
        return Math.max(0, fim - inicio);

    // Atravessa a meia-noite (ex.: preset Ásia + madrugada).
    return Math.max(0, (24 * 60 - inicio) + fim);

}

// Janela em minutos do dia (horário de Brasília) -> conjunto de ciclos de 5 min que ela cobre. Atravessa a meia-noite se fim < início.
function ciclosDaJanela(inicioMin, duracaoMin) {

    const ciclos = new Set();
    const n = Math.floor(Math.max(0, duracaoMin) / MINUTOS_POR_CICLO_SCANNER);

    for (let k = 0; k < n; k++) {
        ciclos.add(Math.floor(((inicioMin + k * MINUTOS_POR_CICLO_SCANNER) % 1440) / MINUTOS_POR_CICLO_SCANNER));
    }

    return ciclos;

}

function inicioDaJanelaMinutos(horarioInicio) {
    const [h, m] = horarioInicio.split(":").map(Number);
    return h * 60 + m;
}

// Janelas (início + duração) em que o par é consultado, conforme o modo da configuração.
function janelasDoPar(par, config) {

    const sessoesAtivas = config.sessoesAtivas || [];
    const janelas = [];

    if (sessoesAtivas.length > 0) {

        const defsSessao = {
            londres: { janela: PRESETS_HORARIO.londres, elegivel: parElegivelSessaoLondresCfg },
            novaYork: { janela: PRESETS_HORARIO.novaYork, elegivel: parElegivelSessaoNovaYorkCfg },
            asia: { janela: PRESETS_HORARIO.asia, elegivel: parElegivelJanelaAsiaCfg }
        };

        sessoesAtivas.forEach((sessaoId) => {
            const def = defsSessao[sessaoId];
            if (!def || !def.elegivel(par)) return;
            janelas.push({
                sessaoId,
                inicio: inicioDaJanelaMinutos(def.janela.horarioInicio),
                duracao: duracaoJanelaPadraoMinutos(def.janela.horarioInicio, def.janela.horarioFim, config.janelaSeguranca)
            });
        });

        return janelas;

    }

    // Modo Personalizado: janela única de todo par + janela asiática incondicional (21:00-23:59) para JPY/AUD/NZD.
    janelas.push({
        sessaoId: "padrao",
        inicio: inicioDaJanelaMinutos(config.horarioInicio),
        duracao: duracaoJanelaPadraoMinutos(config.horarioInicio, config.horarioFim, config.janelaSeguranca)
    });

    if (parElegivelJanelaAsiaCfg(par)) {
        janelas.push({ sessaoId: "asiaFixa", inicio: JANELA_ASIA_INICIO_MIN, duracao: (JANELA_ASIA_FIM_MIN - JANELA_ASIA_INICIO_MIN) + 1 });
    }

    return janelas;

}

// Ciclos/dia em que o par é consultado (UNIÃO das janelas: sobreposição conta uma vez).
function ciclosPorDiaDoPar(par, config) {

    const uniao = new Set();

    janelasDoPar(par, config).forEach(j => ciclosDaJanela(j.inicio, j.duracao).forEach(c => uniao.add(c)));

    return uniao.size;

}

// Custo diário (consultas) de UM par nesta configuração: análise + resumo de mercado. Independe dos outros pares.
function custoDiarioDoParCfg(par, config) {

    return Math.round(ciclosPorDiaDoPar(par, config) * CHAMADAS_POR_PAR_POR_CICLO + CHAMADAS_RESUMO_MERCADO_POR_PAR_POR_DIA);

}

function calcularConsumoEstimadoTwelveData(config) {

    const pares = config.pares || [];
    const sessoesAtivas = config.sessoesAtivas || [];

    const analise = Math.round(pares.reduce((soma, par) => soma + ciclosPorDiaDoPar(par, config) * CHAMADAS_POR_PAR_POR_CICLO, 0));
    const resumo = pares.length * CHAMADAS_RESUMO_MERCADO_POR_PAR_POR_DIA;
    const totalEstimado = analise + resumo;

    const comum = {
        totalEstimado,
        analise,
        resumo,
        excedeOrcamento: totalEstimado > ORCAMENTO_DIARIO_TWELVEDATA,
        margem: ORCAMENTO_DIARIO_TWELVEDATA - totalEstimado
    };

    // Modo por sessões (AJUSTE-019): detalhe por sessão (antes de descontar a sobreposição entre sessões).
    if (sessoesAtivas.length > 0) {

        const detalhePorSessao = [];
        let somaPorSessao = 0;

        sessoesAtivas.forEach((sessaoId) => {

            const paresDaSessao = pares.filter(par => janelasDoPar(par, config).some(j => j.sessaoId === sessaoId));
            const j0 = paresDaSessao.length ? janelasDoPar(paresDaSessao[0], config).find(j => j.sessaoId === sessaoId) : null;
            const ciclos = j0 ? ciclosDaJanela(j0.inicio, j0.duracao).size : 0;
            const chamadas = Math.round(ciclos * paresDaSessao.length * CHAMADAS_POR_PAR_POR_CICLO);

            somaPorSessao += chamadas;
            detalhePorSessao.push({ sessaoId, pares: paresDaSessao.length, chamadas });

        });

        return { modoSessoes: true, ...comum, detalhePorSessao, sobreposicao: Math.max(0, somaPorSessao - analise) };

    }

    // Modo Personalizado: custo marginal de UM par adicional de cada tipo.
    const custoParSemLastroAsia = Math.round(ciclosPorDiaDoPar("EUR/USD", config) * CHAMADAS_POR_PAR_POR_CICLO);
    const custoParComLastroAsia = Math.round(ciclosPorDiaDoPar("AUD/USD", config) * CHAMADAS_POR_PAR_POR_CICLO);

    return { modoSessoes: false, ...comum, custoParSemLastroAsia, custoParComLastroAsia };

}

function renderizarConsumoApi(config) {

    const consumo = calcularConsumoEstimadoTwelveData(config);

    const corFundo = consumo.excedeOrcamento
        ? "rgba(255,152,145,.12)"
        : "rgba(94,248,183,.12)";

    const corBorda = consumo.excedeOrcamento
        ? "rgba(255,152,145,.35)"
        : "rgba(94,248,183,.3)";

    const linhaMargem = consumo.excedeOrcamento
        ? `⚠️ Limite de pares excedido: ${Math.abs(consumo.margem)} consultas/dia acima do orçamento da TwelveData (${ORCAMENTO_DIARIO_TWELVEDATA}). Alguns ciclos podem falhar com "Quota exceeded" e nenhum par ser analisado nesse ciclo - remova pares ou reduza a janela de horário.`
        : `✅ Dentro do orçamento - ${consumo.margem} consultas/dia de folga.`;

    return `
        <div style="
            background:${corFundo};
            border:1px solid ${corBorda};
            border-radius:8px;
            padding:10px 12px;
            margin-bottom:12px;
            font-size:12px;
        ">
            <div style="font-weight:bold; margin-bottom:4px;">
                📡 Consumo estimado de API: ${consumo.totalEstimado} / ${ORCAMENTO_DIARIO_TWELVEDATA} consultas/dia (${CHAVES_TWELVEDATA} chaves × ${LIMITE_DIARIO_POR_CHAVE_TWELVEDATA})
            </div>
            <div>${linhaMargem}</div>
            <div style="margin-top:6px; opacity:.75;">
                ${
                    consumo.modoSessoes
                        ? renderizarDetalheSessoes(consumo.detalhePorSessao) + (consumo.sobreposicao > 0 ? ` · janelas que se sobrepõem contadas uma vez (−${consumo.sobreposicao})` : "") + ` · resumo de mercado ~${consumo.resumo}/dia`
                        : `Custo por par adicional: ~${consumo.custoParSemLastroAsia}/dia (sem lastro asiático) ou
                           ~${consumo.custoParComLastroAsia}/dia (JPY/AUD/NZD, entra também na janela adicional automática).`
                }
            </div>
        </div>
    `;

}

const NOMES_SESSAO_CFG = {
    londres: "Londres",
    novaYork: "Nova York",
    asia: "Ásia"
};

function renderizarDetalheSessoes(detalhePorSessao) {

    if (!detalhePorSessao || detalhePorSessao.length === 0) return "";

    return detalhePorSessao
        .map(d => `${NOMES_SESSAO_CFG[d.sessaoId] || d.sessaoId}: ${d.pares} par(es), ~${d.chamadas}/dia`)
        .join(" · ");

}

// ======================================================
// RENDERIZA PARES
// ======================================================

function renderizarPares(config) {

    return TODOS_PARES.map((par, index) => `

        <div class="list-item">

            <label>

                <input

                    class="cfgPar"

                    type="checkbox"

                    value="${par}"

                    ${config.pares.includes(par) ? "checked" : ""}

                >

                ${index < 10 ? "⭐" : "➕"}

                ${par}

                <span style="margin-left:6px; font-size:11px; opacity:.6;">~${custoDiarioDoParCfg(par, config)}/dia</span>

            </label>

        </div>

    `).join("");

}

// ======================================================
// LER CONFIGURAÇÕES DA TELA
// ======================================================

function obterConfiguracoesTela() {

    return {

        perfil:

            document.querySelector(

                'input[name="perfilOperacional"]:checked'

            )?.value ||

            "balanceado",

        sessoesAtivas:

            Array.from(

                document.querySelectorAll(

                    ".cfgSessao:checked"

                )

            ).map(

                item => item.value

            ),

        delay:

            Number(

                document.getElementById(

                    "cfgDelay"

                ).value

            ),

        cooldown: Number(
    document.getElementById("cfgCooldown").value
),

horarioInicio:
    document.getElementById("cfgInicio").value,

horarioFim:
    document.getElementById("cfgFim").value,

janelaSeguranca: Number(
    document.getElementById("cfgJanela").value
),
        
        candles:

            Number(

                document.getElementById(

                    "cfgCandles"

                ).value

            ),

        lote:

            Number(

                document.getElementById(

                    "cfgLote"

                ).value

            ),

        tp:

            Number(

                document.getElementById(

                    "cfgTP"

                ).value

            ),

        sl:

            Number(

                document.getElementById(

                    "cfgSL"

                ).value

            ),

        conta:

            document.getElementById(

                "cfgConta"

            ).value,

        smcAtivo:

            document.getElementById(

                "cfgSmcAtivo"

            )?.checked ?? true,

        avisoParcialAtivo:

            document.getElementById(

                "cfgAvisoParcialAtivo"

            )?.checked ?? true,

        avisoParcialPct:

            Math.min(95, Math.max(10, Math.round(Number(document.getElementById("cfgAvisoParcialPct")?.value) || 60))),

        saldoInicial:

            Number(

                document.getElementById(

                    "cfgSaldo"

                ).value

            ),

        pares:

            Array.from(

                document.querySelectorAll(

                    ".cfgPar:checked"

                )

            ).map(

                item => item.value

            )

    };

      }

// ======================================================
// EVENTOS
// ======================================================

function bindConfigEvents() {

    // ------------------------------------------
    // AJUSTE-019: sessões (checkbox, 1+) x Personalizado (checkbox,
    // exclusivo) - marcar um lado desmarca o outro. Horário Inicial/
    // Final só ficam livres/editáveis com Personalizado marcado; no
    // modo por sessões cada sessão usa sua própria janela fixa (não
    // aparece nesses dois campos). Nada disso grava no Firestore por
    // si só - só o clique em "Salvar Configurações".
    // ------------------------------------------

    function aplicarSessoesNaTela(origem) {

        const inicioEl = document.getElementById("cfgInicio");
        const fimEl = document.getElementById("cfgFim");
        const personalizadoEl = document.getElementById("cfgPersonalizado");
        const sessaoEls = document.querySelectorAll(".cfgSessao");

        if (origem === "personalizado" && personalizadoEl?.checked) {
            sessaoEls.forEach(el => { el.checked = false; });
        }

        if (origem === "sessao" && Array.from(sessaoEls).some(el => el.checked)) {
            if (personalizadoEl) personalizadoEl.checked = false;
        }

        const modoPersonalizado =
            personalizadoEl?.checked ||
            !Array.from(sessaoEls).some(el => el.checked);

        // Nenhuma sessão marcada e Personalizado também desmarcado
        // (usuário desmarcou tudo) - volta pro Personalizado sozinho,
        // pra nunca deixar a tela sem nenhuma opção ativa.
        if (modoPersonalizado && personalizadoEl) {
            personalizadoEl.checked = true;
        }

        if (inicioEl) inicioEl.disabled = !modoPersonalizado;
        if (fimEl) fimEl.disabled = !modoPersonalizado;

    }

    // ------------------------------------------
    // Consumo estimado de API - recalcula ao vivo sempre que algo
    // que afeta a conta muda (pares marcados, preset de horário,
    // horário manual, janela de segurança). Puramente leitura da
    // tela + Math - nada disso grava em lugar nenhum.
    // ------------------------------------------

    function atualizarConsumoApi() {

        const elConsumo = document.getElementById("cfgConsumoApi");

        if (!elConsumo) return;

        const configAtual = obterConfiguracoesTela();

        elConsumo.innerHTML = renderizarConsumoApi(configAtual);

    }

    document.querySelectorAll(".cfgSessao").forEach((checkbox) => {
        checkbox.onchange = () => {
            aplicarSessoesNaTela("sessao");
            atualizarConsumoApi();
        };
    });

    const personalizadoEl = document.getElementById("cfgPersonalizado");

    if (personalizadoEl) {
        personalizadoEl.onchange = () => {
            aplicarSessoesNaTela("personalizado");
            atualizarConsumoApi();
        };
    }

    document.querySelectorAll(".cfgPar").forEach((checkbox) => {
        checkbox.onchange = atualizarConsumoApi;
    });

    const janelaEl = document.getElementById("cfgJanela");

    if (janelaEl) {
        janelaEl.oninput = atualizarConsumoApi;
    }

    const inicioManualEl = document.getElementById("cfgInicio");

    if (inicioManualEl) {
        inicioManualEl.onchange = atualizarConsumoApi;
    }

    const fimManualEl = document.getElementById("cfgFim");

    if (fimManualEl) {
        fimManualEl.onchange = atualizarConsumoApi;
    }

    const btn = document.getElementById("btnSalvarConfig");

    if (!btn) return;

    btn.onclick = async () => {

        const config = obterConfiguracoesTela();

        // ------------------------------------------
        // Salva Localmente
        // ------------------------------------------

        salvarConfiguracoes(config);

        // ------------------------------------------
        // Firestore
        //
        // Nomes traduzidos para o que scripts/scanner.js
        // e scripts/checker.js realmente leem de
        // configuracoes/geral. tipoConta é MAIÚSCULO lá
        // ("SIMULADA"/"REAL"), diferente do valor do
        // <select> ("simulada"/"real"). saldoSimulado e
        // saldoReal (o saldo corrente, usado pelo checker)
        // NUNCA são sobrescritos aqui - só saldoInicial,
        // que é informativo; resetar o saldo em uso é uma
        // ação separada, não uma consequência de salvar
        // configuração.
        // ------------------------------------------

        let salvouNaNuvem = false;

        try {

            if (typeof db !== "undefined") {

                await db
                    .collection("configuracoes")
                    .doc("geral")
                    .set({

                        perfil: config.perfil,
                        delay: config.delay,
                        cooldown: config.cooldown,
                        sessoesAtivas: config.sessoesAtivas,
                        horarioInicio: config.horarioInicio,
                        horarioFim: config.horarioFim,
                        janelaSeguranca: config.janelaSeguranca,
                        candles: config.candles,
                        lote: config.lote,
                        tp: config.tp,
                        sl: config.sl,
                        pares: config.pares,
                        tipoConta: config.conta === "real" ? "REAL" : "SIMULADA",
                        saldoInicial: config.saldoInicial,
                        smcAtivo: config.smcAtivo,
                        avisoParcialAtivo: config.avisoParcialAtivo !== false,
                        avisoParcialPct: Number.isFinite(Number(config.avisoParcialPct)) ? Number(config.avisoParcialPct) : 60

                    }, {
                        merge: true
                    });

                salvouNaNuvem = true;

            }

        } catch (erro) {

            console.log(
                "Configuração salva apenas localmente.",
                erro
            );

        }

        // ------------------------------------------
        // Feedback (reflete o que realmente aconteceu)
        // ------------------------------------------

        btn.innerHTML = salvouNaNuvem
            ? "✅ Configurações Salvas"
            : "⚠️ Salvo só neste aparelho (sem conexão com o servidor)";

        setTimeout(() => {

            btn.innerHTML =
                "💾 Salvar Configurações";

        }, salvouNaNuvem ? 1800 : 3500);

    };

    const btnRestaurar = document.getElementById("btnRestaurarConfig");

    if (btnRestaurar) {

        btnRestaurar.onclick = async () => {

            btnRestaurar.innerHTML = "Carregando...";

            const restaurado = await restaurarConfiguracaoSalva();

            if (restaurado) {

                app.render();

            } else {

                btnRestaurar.innerHTML =
                    "⚠️ Não foi possível carregar a configuração salva";

                setTimeout(() => {

                    btnRestaurar.innerHTML =
                        "↩️ Voltar para a Última Configuração Salva";

                }, 3000);

            }

        };

    }

    // FEATURE-006 (09/09/2026): ação única e separada do "Salvar
    // Configurações" de propósito - grava saldoReal diretamente,
    // sobrescrevendo o que já estiver acumulado. Confirmação explícita
    // porque é destrutivo se usado por engano depois da primeira vez.
    // AJUSTE-041 (28/09/2026): usuário digitou 643,07 achando que o
    // botão SOMAVA ao saldo simulado (-143,07) pra chegar em 500 - mas
    // ele SUBSTITUI. A tela nunca mostrava o saldo atual, então o texto
    // "substitui o que estiver lá" não bastava. Agora a confirmação lê o
    // saldo gravado e mostra "atual -> novo". Leitura best-effort: se
    // falhar, a confirmação segue sem o valor atual (mesmo fluxo de antes).
    async function textoConfirmacaoSaldo(campo, nomeConta, valor, extra) {

        let atual = null;

        try {
            const doc = await db.collection("configuracoes").doc("geral").get();
            const v = Number(doc.data()?.[campo]);
            if (Number.isFinite(v)) atual = v;
        } catch (erro) {
            console.error("Não foi possível ler o saldo atual:", erro);
        }

        const linhaAtual = atual === null
            ? `Saldo atual da ${nomeConta}: (não foi possível ler)\n`
            : `Saldo atual da ${nomeConta}: $${atual.toFixed(2)}\n`;

        const avisoZero = valor === 0
            ? `\nCom saldo $0 não dá pra calcular o risco - todo sinal vai mostrar aviso de risco.\n`
            : "";

        return linhaAtual +
            `Novo saldo: $${valor.toFixed(2)}\n\n` +
            `ATENÇÃO: o valor digitado SUBSTITUI o saldo atual - não soma nem desconta.\n` +
            avisoZero +
            (extra ? `${extra}\n` : "") +
            `\nConfirma?`;

    }

    const btnDefinirSaldoReal = document.getElementById("btnDefinirSaldoReal");

    if (btnDefinirSaldoReal) {

        btnDefinirSaldoReal.onclick = async () => {

            const valor = Number(document.getElementById("cfgSaldo")?.value);

            if (!Number.isFinite(valor) || valor < 0) {
                alert("Informe um valor de Saldo Inicial válido antes de definir a Conta Real.");
                return;
            }

            const confirmado = confirm(await textoConfirmacaoSaldo(
                "saldoReal", "Conta Real", valor,
                "Isso apaga qualquer WIN/LOSS/aporte já acumulado. Use só na primeira vez."
            ));

            if (!confirmado) return;

            btnDefinirSaldoReal.innerHTML = "Salvando...";

            try {

                await db.collection("configuracoes").doc("geral").set({
                    saldoReal: valor
                }, { merge: true });

                btnDefinirSaldoReal.innerHTML = "✅ Saldo da Conta Real definido";

            } catch (erro) {

                btnDefinirSaldoReal.innerHTML = "⚠️ Erro ao salvar";
                console.error("Erro ao definir saldo da Conta Real:", erro);

            }

            setTimeout(() => {
                btnDefinirSaldoReal.innerHTML = "💰 Definir Saldo Inicial da Conta Real Agora";
            }, 3000);

        };

    }

    // Espelha btnDefinirSaldoReal, mas grava saldoSimulado - o campo
    // que pairAnalyzer.js realmente lê como banca quando a Base de
    // Cálculo de Risco está em "Conta Simulada" (saldoSimulado ??
    // saldoInicial). Sem este botão não havia como definir esse valor
    // pela tela: o "Salvar Configurações" normal só grava
    // saldoInicial (informativo), e saldoSimulado, uma vez zerado
    // (0, não null/undefined), não cai mais no fallback de
    // saldoInicial - toda operação seria reprovada com banca=$0.
    const btnDefinirSaldoSimulada = document.getElementById("btnDefinirSaldoSimulada");

    if (btnDefinirSaldoSimulada) {

        btnDefinirSaldoSimulada.onclick = async () => {

            const valor = Number(document.getElementById("cfgSaldo")?.value);

            if (!Number.isFinite(valor) || valor < 0) {
                alert("Informe um valor de Saldo Inicial válido antes de definir a Conta Simulada.");
                return;
            }

            const confirmado = confirm(await textoConfirmacaoSaldo(
                "saldoSimulado", "Conta Simulada", valor,
                "Isso apaga qualquer WIN/LOSS já acumulado na Conta Simulada."
            ));

            if (!confirmado) return;

            btnDefinirSaldoSimulada.innerHTML = "Salvando...";

            try {

                await db.collection("configuracoes").doc("geral").set({
                    saldoSimulado: valor
                }, { merge: true });

                btnDefinirSaldoSimulada.innerHTML = "✅ Saldo da Conta Simulada definido";

            } catch (erro) {

                btnDefinirSaldoSimulada.innerHTML = "⚠️ Erro ao salvar";
                console.error("Erro ao definir saldo da Conta Simulada:", erro);

            }

            setTimeout(() => {
                btnDefinirSaldoSimulada.innerHTML = "🧪 Definir Saldo Inicial da Conta Simulada Agora";
            }, 3000);

        };

    }

}

// ======================================================
// AUTO BIND
// ======================================================

setTimeout(() => {

    bindConfigEvents();

}, 100);

// ======================================================
// INTEGRAÇÃO COM O SCANNER (concluída em 07/09/2026)
// ======================================================
//
// scripts/scanner.js já lê configuracoes/geral e mescla
// sobre CONFIG_PADRAO (delay, candles, lote, tp, sl, pares,
// perfil incluídos). O elo que faltava era só este botão:
// o clique nunca era religado ao trocar de aba (corrigido
// em js/app.js, chamando bindConfigEvents() após renderizar
// a view de Config) e o payload gravado aqui usava nomes
// diferentes dos que o backend lê (conta/tipoConta).
//
// perfil chega em scripts/pairAnalyzer.js e é repassado,
// já em maiúsculas, para moneyManager.js (gestão de risco)
// e decisionEngine.js (rigor de aprovação por perfil).
// ======================================================

