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
    },

    {
        id: "expert",
        nome: "🟣 Expert RMI"
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

        scannerAtivo: true,

        delay: 1500,

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

        <label>

            <input
                type="checkbox"
                id="cfgScanner"

                ${config.scannerAtivo ? "checked" : ""}

            >

            Scanner Ativo

        </label>

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

    </div>

</div>

<div class="card">

<div class="card-title">

📊 Mercado

</div>

<div class="list-item">

Quantidade de Candles

<br><br>

<select
id="cfgCandles"
style="width:100%;">

<option
value="10"
${config.candles==10?"selected":""}>
10
</option>

<option
value="20"
${config.candles==20?"selected":""}>
20
</option>

<option
value="30"
${config.candles==30?"selected":""}>
30
</option>

<option
value="50"
${config.candles==50?"selected":""}>
50
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

${renderizarPares(config)}

</div>

<div class="card">

<div class="card-title">

🔑 API TwelveData

</div>

<div class="list-item">

API Ativa

<br><br>

<select
id="cfgApi"
style="width:100%;">

<option
value="1"
${config.apiAtiva==1?"selected":""}>
API 1
</option>

<option
value="2"
${config.apiAtiva==2?"selected":""}>
API 2
</option>

<option
value="3"
${config.apiAtiva==3?"selected":""}>
API 3
</option>

</select>

</div>

<div
class="list-item"
style="
font-size:12px;
color:#8c95b3;
">

Rotação automática preparada para integração.

</div>

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

        scannerAtivo:

            document.getElementById(

                "cfgScanner"

            ).checked,

        delay:

            Number(

                document.getElementById(

                    "cfgDelay"

                ).value

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

        apiAtiva:

            Number(

                document.getElementById(

                    "cfgApi"

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
        // (Preparado para integração)
        // ------------------------------------------

        try {

            if (typeof db !== "undefined") {

                await db
                    .collection("configuracoes")
                    .doc("geral")
                    .set(config, {
                        merge: true
                    });

            }

        } catch (erro) {

            console.log(
                "Configuração salva apenas localmente.",
                erro
            );

        }

        // ------------------------------------------
        // Feedback
        // ------------------------------------------

        btn.innerHTML = "✅ Configurações Salvas";

        setTimeout(() => {

            btn.innerHTML =
                "💾 Salvar Configurações";

        }, 1800);

    };

}

// ======================================================
// AUTO BIND
// ======================================================

setTimeout(() => {

    bindConfigEvents();

}, 100);

// ======================================================
// PRÓXIMA ETAPA DA ARQUITETURA
// ======================================================
//
// scanner.js
//
// Ler:
//
// configuracoes/geral
//
// Substituir:
//
// delay
// candles
// lote
// tp
// sl
// pares
// perfil
//
// por valores vindos do Firestore.
//
// ======================================================

