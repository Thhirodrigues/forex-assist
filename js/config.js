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

    // "personalizado" (padrão) mantém horarioInicio/horarioFim como
    // campos livres, exatamente como sempre foi. Os outros 3 valores
    // são atalhos que preenchem esses dois campos automaticamente -
    // ver PRESETS_HORARIO/horarioDoPreset() mais abaixo.
    presetHorario: "personalizado",

    // Só tem efeito quando presetHorario === "asia": estende o fim da
    // janela pra 04:00 do dia seguinte (atravessa a meia-noite - ver
    // suporte a isso em scripts/scanner.js's dentroJanelaPadrao()).
    asiaMadrugada: false,

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
color:#8c95b3;
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
        color:#8c95b3;
        ">

            Milissegundos

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

${renderizarPresetHorario(config)}

<div class="list-item">

Horário Inicial

<br>
<small style="opacity:.7;">Preenchido automaticamente se um mercado acima estiver selecionado</small>
<br><br>

<input
    id="cfgInicio"
    type="time"
    value="${config.horarioInicio}"
    style="width:100%;"
    ${config.presetHorario !== "personalizado" ? "disabled" : ""}>

</div>

<div class="list-item">

Horário Final

<br><br>

<input
    id="cfgFim"
    type="time"
    value="${config.horarioFim}"
    ${config.presetHorario !== "personalizado" ? "disabled" : ""}
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

Saldo Inicial

<br><br>

<input

id="cfgSaldo"

type="number"

value="${config.saldoInicial}"

style="width:100%;">

</div>

<div class="list-item">

<select

id="cfgConta"

style="width:100%;">

<option
value="simulada"
${config.conta=="simulada"?"selected":""}>

Conta Simulada

</option>

<option
value="real"
${config.conta=="real"?"selected":""}>

Conta Real

</option>

</select>

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

style="margin-top:10px; width:100%; padding:10px; border:none; border-radius:8px; background:#132852; color:white; font-size:13px; cursor:pointer;">

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
            background:rgba(0,210,106,.12);
            border:1px solid rgba(0,210,106,.3);
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
// Horários de Brasília (GMT-3, sem DST desde 2019). Cada preset só
// preenche horarioInicio/horarioFim - o backend (scripts/scanner.js)
// nunca lê presetHorario, só os dois campos resultantes. Fontes:
// Babypips/Dukascopy (ver FEATURE-001 em ENGINEERING.md).
// ======================================================

const PRESETS_HORARIO = {

    londres: { horarioInicio: "04:00", horarioFim: "13:00" },

    novaYork: { horarioInicio: "10:00", horarioFim: "19:00" },

    // "Ásia" sem madrugada fica só na sessão da noite (21h-23h59,
    // mesmo horário da janela adicional automática por par do
    // BUG-011 - aqui é a janela PADRÃO, vale pra TODOS os pares
    // monitorados, não só JPY/AUD/NZD).
    asia: { horarioInicio: "21:00", horarioFim: "23:59" },

    // Com madrugada: atravessa a meia-noite, cobre o resto do overlap
    // Sydney/Tóquio (até por volta das 04:00 de Brasília).
    asiaMadrugada: { horarioInicio: "21:00", horarioFim: "04:00" }

};

function horarioDoPreset(preset, madrugada) {

    if (preset === "asia" && madrugada)
        return PRESETS_HORARIO.asiaMadrugada;

    return PRESETS_HORARIO[preset] || null;

}

function renderizarPresetHorario(config) {

    const opcoes = [
        { id: "londres", label: "🇬🇧 Mercado de Londres (04:00–13:00)" },
        { id: "novaYork", label: "🇺🇸 Mercado de Nova York (10:00–19:00)" },
        { id: "asia", label: "🌏 Mercado Asiático (21:00–23:59)" },
        { id: "personalizado", label: "⚙️ Personalizado (definir manualmente abaixo)" }
    ];

    return `
        <div class="list-item">

            Janela de Horário

            <br><br>

            ${opcoes.map(opcao => `
                <label style="display:block; margin-bottom:8px;">
                    <input
                        type="radio"
                        name="presetHorario"
                        class="cfgPresetHorario"
                        value="${opcao.id}"
                        ${config.presetHorario === opcao.id ? "checked" : ""}
                    >
                    ${opcao.label}
                </label>
            `).join("")}

            <div
                id="cfgAsiaMadrugadaWrapper"
                style="margin:4px 0 4px 24px; ${config.presetHorario === "asia" ? "" : "display:none;"}"
            >
                <label>
                    <input
                        type="checkbox"
                        id="cfgAsiaMadrugada"
                        ${config.asiaMadrugada ? "checked" : ""}
                    >
                    Operar também de madrugada (00:00–04:00 de Brasília)
                </label>
            </div>

        </div>
    `;

}

// ======================================================
// ORÇAMENTO DE CONSULTAS - TWELVEDATA
// ---------------------------------------------------
// Orçamento real medido pelo usuário com rotação de 3 chaves:
// 2.400 consultas/dia. Cada par consultado custa 2 chamadas por
// ciclo do Scanner (candle de 5min + candle de 15min).
//
// O ciclo do Scanner (5 minutos) é definido pelo pinger externo
// (cron-job.org), fora do alcance deste app - não configurável na
// tela, então é uma CONSTANTE ASSUMIDA aqui. Se o intervalo do cron
// mudar, esta conta precisa ser atualizada manualmente.
//
// MOEDAS_JANELA_ASIA/PARES_JANELA_ASIA_EXCLUIDOS/
// parElegivelJanelaAsia() são uma 3ª cópia da mesma regra de
// scripts/scanner.js e js/pairInsights.js (ver BUG-011) - mesma
// duplicação deliberada e documentada, pra esta tela não depender da
// ordem de carregamento de outro <script>.
// ======================================================

const MINUTOS_POR_CICLO_SCANNER = 5;

const CHAMADAS_POR_PAR_POR_CICLO = 2;

const ORCAMENTO_DIARIO_TWELVEDATA = 2400;

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

function calcularConsumoEstimadoTwelveData(config) {

    const pares = config.pares || [];

    const duracaoPadrao = duracaoJanelaPadraoMinutos(
        config.horarioInicio,
        config.horarioFim,
        config.janelaSeguranca
    );

    const ciclosPadrao = Math.floor(duracaoPadrao / MINUTOS_POR_CICLO_SCANNER);

    const chamadasPadrao = ciclosPadrao * pares.length * CHAMADAS_POR_PAR_POR_CICLO;

    const duracaoAsia = (JANELA_ASIA_FIM_MIN - JANELA_ASIA_INICIO_MIN) + 1;

    const ciclosAsiaPorDia = Math.floor(duracaoAsia / MINUTOS_POR_CICLO_SCANNER);

    const paresElegiveisAsia = pares.filter(parElegivelJanelaAsiaCfg);

    // Estimativa por um dia útil "típico" (segunda a quinta, quando a
    // janela adicional automática por moeda do BUG-011 também está
    // ativa - sexta não tem essa janela extra, ver BUG-011). É o
    // cenário de maior consumo, por isso o mais relevante pra um
    // aviso de segurança - não é uma média semanal.
    //
    // A janela adicional é sempre somada por cima, mesmo que o preset
    // padrão já seja "Ásia" - isso superestima levemente nesse caso
    // específico, de propósito (fica do lado seguro, nunca subestima
    // o consumo real).
    const chamadasAsiaPorDia =
        ciclosAsiaPorDia * paresElegiveisAsia.length * CHAMADAS_POR_PAR_POR_CICLO;

    const totalEstimado = Math.round(chamadasPadrao + chamadasAsiaPorDia);

    // Custo marginal de UM par adicional de cada tipo - resposta
    // direta a "quantos pares a mais dá pra analisar".
    const custoParSemLastroAsia = ciclosPadrao * CHAMADAS_POR_PAR_POR_CICLO;

    const custoParComLastroAsia =
        custoParSemLastroAsia +
        (ciclosAsiaPorDia * CHAMADAS_POR_PAR_POR_CICLO);

    return {
        totalEstimado,
        chamadasPadrao: Math.round(chamadasPadrao),
        chamadasAsiaPorDia: Math.round(chamadasAsiaPorDia),
        paresElegiveisAsia: paresElegiveisAsia.length,
        custoParSemLastroAsia,
        custoParComLastroAsia,
        excedeOrcamento: totalEstimado > ORCAMENTO_DIARIO_TWELVEDATA,
        margem: ORCAMENTO_DIARIO_TWELVEDATA - totalEstimado
    };

}

function renderizarConsumoApi(config) {

    const consumo = calcularConsumoEstimadoTwelveData(config);

    const corFundo = consumo.excedeOrcamento
        ? "rgba(255,82,82,.12)"
        : "rgba(0,210,106,.12)";

    const corBorda = consumo.excedeOrcamento
        ? "rgba(255,82,82,.35)"
        : "rgba(0,210,106,.3)";

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
                📡 Consumo estimado de API: ${consumo.totalEstimado} / ${ORCAMENTO_DIARIO_TWELVEDATA} consultas/dia
            </div>
            <div>${linhaMargem}</div>
            <div style="margin-top:6px; opacity:.75;">
                Custo por par adicional: ~${consumo.custoParSemLastroAsia}/dia (sem lastro asiático) ou
                ~${consumo.custoParComLastroAsia}/dia (JPY/AUD/NZD, entra também na janela adicional automática).
            </div>
        </div>
    `;

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

        presetHorario:

            document.querySelector(

                '.cfgPresetHorario:checked'

            )?.value ||

            "personalizado",

        asiaMadrugada:

            document.getElementById(

                "cfgAsiaMadrugada"

            )?.checked || false,

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
    // Preset de janela horária - atualiza os campos
    // Horário Inicial/Final ao vivo, antes de salvar
    // (nada disso grava no Firestore por si só).
    // ------------------------------------------

    function aplicarPresetNaTela() {

        const presetSelecionado =
            document.querySelector('.cfgPresetHorario:checked')?.value ||
            "personalizado";

        const madrugadaEl = document.getElementById("cfgAsiaMadrugada");
        const wrapperMadrugada = document.getElementById("cfgAsiaMadrugadaWrapper");
        const inicioEl = document.getElementById("cfgInicio");
        const fimEl = document.getElementById("cfgFim");

        if (wrapperMadrugada) {
            wrapperMadrugada.style.display =
                presetSelecionado === "asia" ? "block" : "none";
        }

        if (presetSelecionado === "personalizado") {
            if (inicioEl) inicioEl.disabled = false;
            if (fimEl) fimEl.disabled = false;
            return;
        }

        const horario = horarioDoPreset(presetSelecionado, madrugadaEl?.checked);

        if (!horario) return;

        if (inicioEl) {
            inicioEl.value = horario.horarioInicio;
            inicioEl.disabled = true;
        }

        if (fimEl) {
            fimEl.value = horario.horarioFim;
            fimEl.disabled = true;
        }

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

    document.querySelectorAll(".cfgPresetHorario").forEach((radio) => {
        radio.onchange = () => {
            aplicarPresetNaTela();
            atualizarConsumoApi();
        };
    });

    const madrugadaEl = document.getElementById("cfgAsiaMadrugada");

    if (madrugadaEl) {
        madrugadaEl.onchange = () => {
            aplicarPresetNaTela();
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
                        presetHorario: config.presetHorario,
                        asiaMadrugada: config.asiaMadrugada,
                        horarioInicio: config.horarioInicio,
                        horarioFim: config.horarioFim,
                        janelaSeguranca: config.janelaSeguranca,
                        candles: config.candles,
                        lote: config.lote,
                        tp: config.tp,
                        sl: config.sl,
                        pares: config.pares,
                        tipoConta: config.conta === "real" ? "REAL" : "SIMULADA",
                        saldoInicial: config.saldoInicial

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

