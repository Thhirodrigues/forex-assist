function historicoView() {

    return `

        <div class="card">

            <div
                id="historicoHeader"
                style="
                    position:sticky;
                    top:0;
                    z-index:999;
                    background:#081733;
                    padding-bottom:12px;
                "
            >

                <div class="card-title">

                    Histórico de Sinais

                </div>

                <div
                    id="historicoStats"
                    style="margin-bottom:15px;"
                >

                    Carregando estatísticas...

                </div>

            </div>

            <div id="historicoLista">

                Carregando histórico...

            </div>

        </div>

    `;

}



//==================================================
// ESTADO DOS SINAIS ABERTOS
//==================================================

function obterSinaisAbertos() {

    try {

        return JSON.parse(

            localStorage.getItem("sinaisAbertos") ||

            "[]"

        );

    } catch {

        return [];

    }

}

function salvarSinalAberto(id) {

    const lista = obterSinaisAbertos();

    if (!lista.includes(id)) {

        lista.push(id);

        localStorage.setItem(

            "sinaisAbertos",

            JSON.stringify(lista)

        );

    }

}

function removerSinalAberto(id) {

    const lista = obterSinaisAbertos()

        .filter(item => item !== id);

    localStorage.setItem(

        "sinaisAbertos",

        JSON.stringify(lista)

    );

}



//==================================================
// ESTADO DAS DATAS
//==================================================

function obterDatasAbertas() {

    try {

        return JSON.parse(

            localStorage.getItem("datasAbertas") ||

            "[]"

        );

    } catch {

        return [];

    }

}

function salvarDataAberta(id) {

    const lista = obterDatasAbertas();

    if (!lista.includes(id)) {

        lista.push(id);

        localStorage.setItem(

            "datasAbertas",

            JSON.stringify(lista)

        );

    }

}

function removerDataAberta(id) {

    const lista = obterDatasAbertas()

        .filter(item => item !== id);

    localStorage.setItem(

        "datasAbertas",

        JSON.stringify(lista)

    );

}

//==================================================
// PARTE 02/20
// Substituir desde:
//
// async function carregarHistorico() {
//
// até imediatamente antes de:
//
// const card = `
//==================================================

async function carregarHistorico() {

    const lista = document.getElementById("historicoLista");
    const stats = document.getElementById("historicoStats");

    if (!lista) return;

    try {

        const snapshot = await db
            .collection("historico")
            .orderBy("timestamp", "desc")
            .limit(300)
            .get();

        let wins = 0;
        let losses = 0;

        const gruposPorData = {};

        const hoje = new Date().toLocaleDateString(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo"
            }
        );

        const sinaisAbertos = obterSinaisAbertos();
        const datasAbertas = obterDatasAbertas();

        app.sinalParaDestacar =
            app.sinalParaDestacar || null;

        snapshot.forEach((doc) => {

            const sinal = doc.data();

            let dataObj = null;

            if (sinal.timestamp) {

                let ts = sinal.timestamp;

                if (ts.toDate) {

                    ts = ts.toDate();

                } else if (
                    typeof ts === "number" &&
                    ts < 1000000000000
                ) {

                    ts *= 1000;

                }

                const d = new Date(ts);

                if (!isNaN(d.getTime())) {

                    dataObj = d;

                }

            }

            if (!dataObj && (sinal.horario || sinal.data)) {

                const texto = sinal.horario || sinal.data;

                const partes =
                    texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);

                if (partes) {

                    dataObj = new Date(

                        Number(partes[3]),
                        Number(partes[2]) - 1,
                        Number(partes[1])

                    );

                }

            }

            if (sinal.resultado === "WIN") wins++;
            if (sinal.resultado === "LOSS") losses++;

            const dataSinal = dataObj

                ? dataObj.toLocaleDateString(
                    "pt-BR",
                    {
                        timeZone:
                            "America/Sao_Paulo"
                    }
                )

                : "Data Indefinida";

            const horaSinal = dataObj

                ? dataObj
                    .toLocaleTimeString(
                        "pt-BR",
                        {
                            timeZone:
                                "America/Sao_Paulo"
                        }
                    )
                    .substring(0, 5)

                : "--:--";

            const isCooldown =

                sinal.status === "COOLDOWN" ||

                sinal.origem === "cooldown";

            const isDestaque =

                app.sinalParaDestacar === doc.id;

            const estaAberto =

                sinaisAbertos.includes(doc.id) ||

                isDestaque;

            const detalheId =

                `detalhe-${doc.id}`;

            const borderStyle =

                isDestaque

                    ? "border:2px solid #00ff88;background:rgba(0,255,136,.08);"

                    : "";

            const direcao =

                (sinal.direcao || "-")

                    .replace("CALL", "COMPRA")
                    .replace("PUT", "VENDA");

            const iconeDirecao =

                isCooldown

                    ? "🚫"

                    : (

                        sinal.direcao === "BUY" ||

                        sinal.direcao === "CALL"

                    )

                        ? "🟢"

                        : "🔴";

            const statusTexto =

                isCooldown

                    ? "COOLDOWN"

                    : sinal.resultado === "WIN"

                        ? "✅ WIN"

                        : sinal.resultado === "LOSS"

                            ? "❌ LOSS"

                            : "⏳ PENDENTE";

            const card = `

    //==================================================
// PARTE 03/20
// Continuação EXATA da Parte 02/20
//==================================================

            <div
                class="list-item"
                id="sinal-${doc.id}"
                data-sinal-id="${doc.id}"
                style="${borderStyle}"
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        font-size:14px;
                        font-weight:bold;
                    "
                >

                    <span>

                        ${iconeDirecao}

                        ${sinal.par || "-"}

                        |

                        ${direcao}

                    </span>

                    <span>

                        ${statusTexto}

                    </span>

                </div>

                <div
                    style="
                        margin-top:6px;
                        font-size:12px;
                        color:#8c95b3;
                    "
                >

                    ${sinal.loteUtilizado
                        ? `💳 Lote <b>${sinal.loteUtilizado}</b> | `
                        : ""
                    }

                    ${dataSinal}

                    &nbsp;

                    ${horaSinal}

                    ${!isCooldown

                        ? ` | Qualidade ${sinal.qualidade ?? "-"}%`

                        : ""

                    }

                </div>

                ${sinal.movimentoPips !== undefined

                    ? `

                        <div
                            style="
                                margin-top:8px;
                                font-size:12px;
                                font-weight:bold;
                                color:${

                                    sinal.resultado === "WIN"

                                        ? "#00ff88"

                                        : "#ff5252"

                                };
                            "
                        >

                            📊

                            ${sinal.movimentoPips > 0 ? "+" : ""}

                            ${sinal.movimentoPips}

                            pips

                        </div>

                    `

                    : ""

                }

                <div
                    id="${detalheId}"
                    style="
                        display:${estaAberto ? "block" : "none"};
                        margin-top:12px;
                        padding-top:12px;
                        border-top:1px solid rgba(255,255,255,.10);
                        font-size:12px;
                        color:#8c95b3;
                    "
                >

                    <div
                        style="
                            display:grid;
                            grid-template-columns:repeat(2,1fr);
                            gap:10px;
                            margin-bottom:14px;
                        "
                    >

  //==================================================
// PARTE 04/20
// Continuação EXATA da Parte 03/20
//==================================================

                        <div
                            class="infoCard"
                        >

                            <div class="infoTitulo">

                                📉 RSI

                            </div>

                            <div
                                class="infoValor"
                                style="color:#4fc3f7;"
                            >

                                ${sinal.rsi
                                    ? Number(sinal.rsi).toFixed(2)
                                    : "--"}

                            </div>

                        </div>

                        <div
                            class="infoCard"
                        >

                            <div class="infoTitulo">

                                📈 EMA 9

                            </div>

                            <div class="infoValor">

                                ${sinal.ema9
                                    ? Number(sinal.ema9).toFixed(5)
                                    : "--"}

                            </div>

                        </div>

                        <div
                            class="infoCard"
                        >

                            <div class="infoTitulo">

                                📊 EMA 21

                            </div>

                            <div class="infoValor">

                                ${sinal.ema21
                                    ? Number(sinal.ema21).toFixed(5)
                                    : "--"}

                            </div>

                        </div>

                        <div
                            class="infoCard"
                        >

                            <div class="infoTitulo">

                                🏠 EMA 200

                            </div>

                            <div class="infoValor">

                                ${sinal.ema200
                                    ? Number(sinal.ema200).toFixed(5)
                                    : "--"}

                            </div>

                        </div>

                    </div>

                    <div
                        style="
                            display:flex;
                            gap:10px;
                            margin-bottom:16px;
                        "
                    >

                        <div
                            class="infoCard"
                            style="flex:1;"
                        >

                            <div class="infoTitulo">

                                💰 ENTRADA

                            </div>

                            <div class="infoValor">

                                ${sinal.precoEntrada ?? "--"}

                            </div>

                        </div>

                        <div
                            class="infoCard"
                            style="flex:1;"
                        >

                            <div class="infoTitulo">

                                🏁 SAÍDA

                            </div>

                            <div class="infoValor">

                                ${sinal.precoSaida ??
                                  sinal.precoFechamento ??
                                  "--"}

                            </div>

                        </div>

                    </div>

                    <div
                        style="margin-top:14px;"
                    >
//==================================================
// PARTE 05/20
// Continuação EXATA da Parte 04/20
//==================================================

                        <div
                            style="
                                font-weight:bold;
                                color:#9aa4b5;
                                margin-bottom:12px;
                            "
                        >

                            ⚙️ Configuração Utilizada

                        </div>

                        <div
                            class="infoCard"
                            style="margin-bottom:14px;"
                        >

                            <div class="infoTitulo">

                                LOTE

                            </div>

                            <div
                                style="
                                    margin-top:8px;
                                    font-size:24px;
                                    font-weight:bold;
                                    color:#ffffff;
                                "
                            >

                                ${sinal.lote ?? "--"}

                            </div>

                        </div>

                        <div
                            style="
                                display:flex;
                                gap:12px;
                                margin-bottom:18px;
                            "
                        >

                            <div
                                class="infoCard"
                                style="flex:1;"
                            >

                                <div class="infoTitulo">

                                    🎯 TP

                                </div>

                                <div
                                    class="infoValor"
                                    style="color:#00d26a;"
                                >

                                    $${sinal.tpUSD ?? "--"}

                                </div>

                            </div>

                            <div
                                class="infoCard"
                                style="flex:1;"
                            >

                                <div class="infoTitulo">

                                    🛑 SL

                                </div>

                                <div
                                    class="infoValor"
                                    style="color:#ff5252;"
                                >

                                    $${sinal.slUSD ?? "--"}

                                </div>

                            </div>

                        </div>

                    </div>

                    <div
                        style="
                            display:grid;
                            grid-template-columns:repeat(2,1fr);
                            gap:12px;
                            margin:18px 0;
                        "
                    >

  //==================================================
// PARTE 06/20
// Continuação EXATA da Parte 05/20
//==================================================

                        <div
                            class="infoCard"
                        >

                            <div class="infoTitulo">

                                💼 SALDO ANTES

                            </div>

                            <div
                                class="infoValor"
                                style="color:#b8b8b8;"
                            >

                                ${sinal.saldoAntes == null
                                    ? "--"
                                    : "$" + Number(sinal.saldoAntes).toFixed(2)}

                            </div>

                        </div>

                        <div
                            class="infoCard"
                        >

                            <div class="infoTitulo">

                                💰 SALDO DEPOIS

                            </div>

                            <div
                                class="infoValor"
                                style="
                                    color:${

                                        sinal.saldoDepois > sinal.saldoAntes

                                            ? "#00d26a"

                                            : sinal.saldoDepois < sinal.saldoAntes

                                                ? "#ff5252"

                                                : "#ffffff"

                                    };
                                "
                            >

                                ${sinal.saldoDepois == null

                                    ? "--"

                                    : "$" + Number(sinal.saldoDepois).toFixed(2)}

                            </div>

                        </div>

                    </div>

                    <label
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            margin-top:16px;
                            padding-top:12px;
                            border-top:1px solid rgba(255,255,255,.10);
                            cursor:pointer;
                        "
                    >

                        <span>

                            💲 Operação Real

                        </span>

                        <input
                            type="checkbox"
                            ${sinal.operacaoReal ? "checked" : ""}
                            ${sinal.status !== "ENCERRADA" ? "disabled" : ""}
                            onchange="event.stopPropagation(); alternarOperacaoReal('${doc.id}', this.checked);"
                        >

                    </label>

                    ${sinal.status !== "ENCERRADA"

                        ? `

                            <div
                                style="
                                    margin-top:8px;
                                    font-size:11px;
                                    color:#999;
                                "
                            >

                                Disponível após o encerramento da operação

                            </div>

                        `

                        : ""

                    }

  //==================================================
// PARTE 07/20
// Continuação EXATA da Parte 06/20
//==================================================

                    ${sinal.movimentoPips !== undefined

                        ? `

                        <div
                            style="
                                margin-top:12px;
                                padding:10px;
                                border-radius:8px;
                                background:rgba(255,255,255,.05);
                                text-align:center;
                            "
                        >

                            <div
                                style="
                                    font-weight:bold;
                                    color:${

                                        sinal.resultado === "WIN"

                                            ? "#00d26a"

                                            : sinal.resultado === "LOSS"

                                                ? "#ff5252"

                                                : "#ffffff"

                                    };
                                "
                            >

                                VARIAÇÃO

                                ${sinal.movimentoPips > 0 ? "+" : ""}

                                ${sinal.movimentoPips}

                                PIPS

                            </div>

                            ${sinal.lucroEstimado !== undefined

                                ? `

                                <div
                                    style="
                                        margin-top:12px;
                                        padding:12px;
                                        border-radius:8px;
                                        background:${

                                            sinal.resultado === "WIN"

                                                ? "rgba(0,210,106,.12)"

                                                : sinal.resultado === "LOSS"

                                                    ? "rgba(255,82,82,.12)"

                                                    : "rgba(255,255,255,.05)"

                                        };
                                    "
                                >

                                    <div
                                        style="
                                            font-size:11px;
                                            color:#999;
                                            letter-spacing:1px;
                                        "
                                    >

                                        RESULTADO FINANCEIRO

                                    </div>

                                    <div
                                        style="
                                            margin-top:8px;
                                            font-size:24px;
                                            font-weight:bold;
                                            color:${

                                                sinal.resultado === "WIN"

                                                    ? "#00d26a"

                                                    : sinal.resultado === "LOSS"

                                                        ? "#ff5252"

                                                        : "#ffffff"

                                            };
                                        " 
                                        >

//==================================================
// PARTE 08/20
// Continuação EXATA da Parte 07/20
//==================================================

                                        ${

                                            sinal.resultadoFinanceiro ??

                                            (

                                                (sinal.lucroEstimado >= 0 ? "+" : "")

                                                +

                                                "$"

                                                +

                                                Number(sinal.lucroEstimado).toFixed(2)

                                            )

                                        }

                                    </div>

                                </div>

                            `

                            : ""

                            }

                        </div>

                    `

                    : ""

                    }

                </div>

            </div>

            `;

            if (!gruposPorData[dataSinal]) {

                gruposPorData[dataSinal] = "";

            }

            gruposPorData[dataSinal] += card;

        });

        //==================================================
        // ESTATÍSTICAS
        //==================================================

        const total = wins + losses;

        const taxa =

            total > 0

                ? ((wins / total) * 100).toFixed(1)

                : "0";

        if (stats) {

            stats.innerHTML = `

                <div
                    class="card"
                    style="padding:10px;"
                >

                    <div
                        style="
                            text-align:center;
                            font-size:17px;
                            font-weight:bold;
                        "
                    >

                        ✅ ${wins}

                        &nbsp;&nbsp;

                        ❌ ${losses}

                        &nbsp;&nbsp;

                        🎯 ${taxa}%

                    </div>

                    <button
                        id="btnMinimizarTudo"
                        style="
                            margin-top:10px;
                            width:100%;
                            padding:8px;
                            border:none;
                            border-radius:8px;
                            background:#132852;
                            color:#fff;
                            cursor:pointer;
                        "
                    >

                        Minimizar Tudo

                    </button>

                </div>

            `;
        }

//==================================================
// PARTE 09/20
// Continuação EXATA da Parte 08/20
//==================================================

        //==================================================
        // RENDERIZAÇÃO DOS GRUPOS
        //==================================================

        let finalHtml = "";

        const datasOrdenadas = Object.keys(gruposPorData).sort((a, b) => {

            if (a === "Data Indefinida") return 1;
            if (b === "Data Indefinida") return -1;

            const [da, ma, aa] = a.split("/");
            const [db, mb, ab] = b.split("/");

            return new Date(ab, mb - 1, db) -

                   new Date(aa, ma - 1, da);

        });

        datasOrdenadas.forEach((data) => {

            const idData = data.replaceAll("/", "");

            const isHoje = data === hoje;

            const titulo = isHoje

                ? `HOJE (${data})`

                : data;

            const grupoDestacado =

                app.sinalParaDestacar &&

                gruposPorData[data].includes(

                    `id="sinal-${app.sinalParaDestacar}"`

                );

            const grupoAberto =

                datasAbertas.includes(idData) ||

                grupoDestacado;

            finalHtml += `

                <div

                    onclick="

                        const grupo=document.getElementById('data${idData}');

                        const seta=this.querySelector('span');

                        if(grupo.style.display==='none'){

                            grupo.style.display='block';

                            seta.innerHTML='▼';

                            salvarDataAberta('${idData}');

                        }else{

                            grupo.style.display='none';

                            seta.innerHTML='▶';

                            removerDataAberta('${idData}');

                        }

                    "

                    style="
                        margin-top:20px;
                        margin-bottom:10px;
                        font-size:12px;
                        color:#8c95b3;
                        font-weight:bold;
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                    "

                >

                    <span style="margin-right:8px;">

                        ${grupoAberto ? "▼" : "▶"}

                    </span>

                    ${titulo}

                </div>

                <div

                    id="data${idData}"

                    style="display:${grupoAberto ? "block" : "none"};"

                >

                    ${gruposPorData[data]}

                </div>

            `;

        });

        lista.innerHTML =

            finalHtml ||

            '<div class="list-item">Nenhum sinal encontrado.</div>';


//==================================================
// PARTE 10/20
// Continuação EXATA da Parte 09/20
//==================================================

        //==================================================
        // EVENTOS DOS CARDS
        //==================================================

        setTimeout(() => {

            document
                .querySelectorAll("[data-sinal-id]")
                .forEach((el) => {

                    el.onclick = null;

                    el.addEventListener("click", function (e) {

                        e.stopPropagation();

                        const sinalId = this.dataset.sinalId;

                        const detalhe = document.getElementById(

                            `detalhe-${sinalId}`

                        );

                        if (!detalhe) return;

                        const aberto =

                            detalhe.style.display !== "none";

                        detalhe.style.display =

                            aberto

                                ? "none"

                                : "block";

                        if (aberto) {

                            removerSinalAberto(sinalId);

                        } else {

                            salvarSinalAberto(sinalId);

                        }

                    });

                });

        }, 80);

        //==================================================
        // DESTACAR SINAL
        //==================================================

        if (app.sinalParaDestacar) {

            const destaque = document.getElementById(

                `sinal-${app.sinalParaDestacar}`

            );

            if (destaque) {

                destaque.scrollIntoView({

                    behavior: "smooth",

                    block: "center"

                });

            }

            app.sinalParaDestacar = null;

        }

        //==================================================
        // BOTÃO MINIMIZAR TUDO
        //==================================================

        const btn = document.getElementById(

            "btnMinimizarTudo"

        );

        if (btn) {

            btn.onclick = () => {

                document
                    .querySelectorAll("[id^='data']")
                    .forEach((grupo) => {

                        grupo.style.display = "none";

                    });

                document
                    .querySelectorAll("[data-sinal-id]")
                    .forEach((card) => {

                        const detalhe = card.querySelector(

                            "[id^='detalhe-']"

                        );

                        if (detalhe) {

                            detalhe.style.display = "none";

                        }

                    });

                localStorage.removeItem("datasAbertas");

                localStorage.removeItem("sinaisAbertos");

            };

        }

    } catch (erro) {

        console.error(

            "Erro ao carregar histórico:",

            erro

        );

        lista.innerHTML = `

            <div class="list-item">

                ${erro.message}

            </div>

        `;

    }

}

//==================================================
// PARTE 11/20
// Substituir a função alternarOperacaoReal()
//==================================================

window.alternarOperacaoReal = async function (id, marcado) {

    const db = firebase.firestore();

    const docRef = db
        .collection("historico")
        .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {

        carregarHistorico();

        return;

    }

    const sinal = doc.data();

    const jaMarcado = Boolean(sinal.operacaoReal);

    if (jaMarcado === marcado) {

        carregarHistorico();

        return;

    }

    const configRef = db
        .collection("configuracoes")
        .doc("geral");

    const configDoc = await configRef.get();

    if (!configDoc.exists) {

        carregarHistorico();

        return;

    }

    const config = configDoc.data();

    let saldoReal = Number(config.saldoReal || 0);

    let resultado = 0;

    if (typeof sinal.resultadoFinanceiro === "number") {

        resultado = sinal.resultadoFinanceiro;

    } else {

        resultado = Number(

            String(sinal.resultadoFinanceiro || 0)
                .replace("$", "")
                .replace("+", "")

        );

        if (sinal.resultado === "LOSS") {

            resultado = -Math.abs(resultado);

        }

    }

    if (marcado) {

        saldoReal += resultado;

    } else {

        saldoReal -= resultado;

    }

    await configRef.update({

        saldoReal

    });

    await docRef.update({

        operacaoReal: marcado

    });

    carregarHistorico();

};

//==================================================
// PARTE 12/20
// Continuação EXATA da Parte 11/20
//==================================================

//==================================================
// COMPONENTES VISUAIS
//==================================================

function infoCard(
    titulo,
    valor,
    cor = "#ffffff"
) {

    return `

        <div
            style="
                background:rgba(255,255,255,.04);
                border:1px solid rgba(255,255,255,.08);
                border-radius:10px;
                padding:12px;
                text-align:center;
            "
        >

            <div
                style="
                    font-size:11px;
                    color:#999;
                    letter-spacing:.5px;
                "
            >

                ${titulo}

            </div>

            <div
                style="
                    margin-top:8px;
                    font-size:20px;
                    font-weight:bold;
                    color:${cor};
                "
            >

                ${valor}

            </div>

        </div>

    `;

}



//==================================================
// HELPERS FINANCEIROS
//==================================================

function formatarMoeda(valor) {

    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {

        return "--";

    }

    return "$" + Number(valor).toFixed(2);

}

function formatarPreco(valor) {

    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {

        return "--";

    }

    return Number(valor).toFixed(5);

}

function corResultado(resultado) {

    if (resultado === "WIN") {

        return "#00d26a";

    }

    if (resultado === "LOSS") {

        return "#ff5252";

    }

    return "#ffffff";

}


//==================================================
// PARTE 13/20
// Continuação EXATA da Parte 12/20
//==================================================

//==================================================
// HELPERS DE DATA
//==================================================

function obterDataSinal(sinal) {

    let dataObj = null;

    if (sinal.timestamp) {

        let ts = sinal.timestamp;

        if (ts.toDate) {

            ts = ts.toDate();

        } else if (
            typeof ts === "number" &&
            ts < 1000000000000
        ) {

            ts *= 1000;

        }

        const d = new Date(ts);

        if (!isNaN(d.getTime())) {

            dataObj = d;

        }

    }

    if (!dataObj && (sinal.horario || sinal.data)) {

        const texto = sinal.horario || sinal.data;

        const partes = texto.match(
            /(\d{2})\/(\d{2})\/(\d{4})/
        );

        if (partes) {

            dataObj = new Date(

                Number(partes[3]),
                Number(partes[2]) - 1,
                Number(partes[1])

            );

        }

    }

    return dataObj;

}

function formatarData(dataObj) {

    if (!dataObj) {

        return "Data Indefinida";

    }

    return dataObj.toLocaleDateString(

        "pt-BR",

        {

            timeZone: "America/Sao_Paulo"

        }

    );

}

function formatarHora(dataObj) {

    if (!dataObj) {

        return "--:--";

    }

    return dataObj
        .toLocaleTimeString(

            "pt-BR",

            {

                timeZone: "America/Sao_Paulo"

            }

        )
        .substring(0, 5);

}

//==================================================
// PARTE 14/20
// Continuação EXATA da Parte 13/20
//==================================================

//==================================================
// HELPERS DE STATUS
//==================================================

function textoResultado(resultado) {

    switch (resultado) {

        case "WIN":
            return "WIN";

        case "LOSS":
            return "LOSS";

        case "PENDENTE":
            return "PENDENTE";

        default:
            return "--";

    }

}

function corQualidade(score) {

    if (score >= 90) {

        return "#00d26a";

    }

    if (score >= 80) {

        return "#00bcd4";

    }

    if (score >= 70) {

        return "#ffc107";

    }

    return "#ff5252";

}

function formatarScore(score) {

    if (
        score === undefined ||
        score === null ||
        Number.isNaN(score)
    ) {

        return "--";

    }

    return `${Math.round(score)}%`;

}



//==================================================
// HELPERS DE PIPS
//==================================================

function formatarPips(valor) {

    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {

        return "--";

    }

    const numero = Number(valor);

    return `${numero >= 0 ? "+" : ""}${numero.toFixed(1)} pips`;

}

function corPips(valor) {

    if (
        valor === undefined ||
        valor === null ||
        Number.isNaN(Number(valor))
    ) {

        return "#ffffff";

    }

    return Number(valor) >= 0

        ? "#00d26a"

        : "#ff5252";

}


//==================================================
// PARTE 15/20
// Continuação EXATA da Parte 14/20
//==================================================

//==================================================
// HELPERS DE INDICADORES
//==================================================

function formatarRSI(valor) {

    if (
        valor === undefined ||
        valor === null ||
        Number.isNaN(Number(valor))
    ) {

        return "--";

    }

    return Number(valor).toFixed(1);

}

function formatarEMA(valor) {

    if (
        valor === undefined ||
        valor === null ||
        Number.isNaN(Number(valor))
    ) {

        return "--";

    }

    return Number(valor).toFixed(5);

}

function formatarADX(valor) {

    if (
        valor === undefined ||
        valor === null ||
        Number.isNaN(Number(valor))
    ) {

        return "--";

    }

    return Number(valor).toFixed(1);

}

function corADX(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {

        return "#ffffff";

    }

    valor = Number(valor);

    if (valor >= 35) {

        return "#00d26a";

    }

    if (valor >= 25) {

        return "#ffc107";

    }

    return "#ff5252";

}



//==================================================
// HELPERS GERAIS
//==================================================

function valorOuTraco(valor) {

    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {

        return "--";

    }

    return valor;

}

//==================================================
// PARTE 16/20
// Continuação EXATA da Parte 15/20
//==================================================

//==================================================
// ORDENAÇÃO DOS SINAIS
//==================================================

function ordenarHistorico(lista) {

    return [...lista].sort((a, b) => {

        const dataA = obterDataSinal(a);
        const dataB = obterDataSinal(b);

        const tempoA = dataA
            ? dataA.getTime()
            : 0;

        const tempoB = dataB
            ? dataB.getTime()
            : 0;

        return tempoB - tempoA;

    });

}



//==================================================
// FILTROS
//==================================================

function aplicarFiltroResultado(

    lista,

    resultado

) {

    if (

        !resultado ||

        resultado === "TODOS"

    ) {

        return lista;

    }

    return lista.filter(

        (item) =>

            item.resultado === resultado

    );

}

function aplicarFiltroPar(

    lista,

    par

) {

    if (

        !par ||

        par === "TODOS"

    ) {

        return lista;

    }

    return lista.filter(

        (item) =>

            item.par === par

    );

}

function aplicarBusca(

    lista,

    texto

) {

    if (

        !texto ||

        !texto.trim()

    ) {

        return lista;

    }

    texto = texto.toLowerCase();

    return lista.filter((item) => {

        return JSON.stringify(item)

            .toLowerCase()

            .includes(texto);

    });

}

//==================================================
// PARTE 17/20
// Continuação EXATA da Parte 16/20
//==================================================

//==================================================
// UTILITÁRIOS
//==================================================

function normalizarNumero(valor) {

    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {

        return 0;

    }

    if (typeof valor === "number") {

        return valor;

    }

    return Number(
        String(valor)
            .replace("$", "")
            .replace(",", ".")
            .replace("+", "")
            .trim()
    ) || 0;

}

function gerarIdUnico() {

    return (

        Date.now().toString(36) +

        Math.random()

            .toString(36)

            .substring(2, 10)

    );

}

function existeValor(valor) {

    return !(
        valor === undefined ||
        valor === null ||
        valor === ""
    );

}

function bool(valor) {

    return Boolean(valor);

}



//==================================================
// EXPORTS GLOBAIS
//==================================================

window.carregarHistorico = carregarHistorico;

window.salvarSinalAberto = salvarSinalAberto;

window.removerSinalAberto = removerSinalAberto;

window.salvarDataAberta = salvarDataAberta;

window.removerDataAberta = removerDataAberta;

//==================================================
// PARTE 18/20
// Continuação EXATA da Parte 17/20
//==================================================

window.obterSinaisAbertos = obterSinaisAbertos;

window.obterDatasAbertas = obterDatasAbertas;

window.formatarMoeda = formatarMoeda;

window.formatarPreco = formatarPreco;

window.formatarPips = formatarPips;

window.formatarRSI = formatarRSI;

window.formatarEMA = formatarEMA;

window.formatarADX = formatarADX;

window.formatarScore = formatarScore;

window.obterDataSinal = obterDataSinal;

window.formatarData = formatarData;

window.formatarHora = formatarHora;

window.ordenarHistorico = ordenarHistorico;

window.aplicarFiltroResultado = aplicarFiltroResultado;

window.aplicarFiltroPar = aplicarFiltroPar;

window.aplicarBusca = aplicarBusca;

window.infoCard = infoCard;

window.normalizarNumero = normalizarNumero;

window.valorOuTraco = valorOuTraco;

window.corResultado = corResultado;

window.corPips = corPips;

window.corQualidade = corQualidade;

window.corADX = corADX;

window.textoResultado = textoResultado;

window.gerarIdUnico = gerarIdUnico;

window.existeValor = existeValor;

window.bool = bool;

//==================================================
// PARTE 19/20
// Continuação EXATA da Parte 18/20
//==================================================

//==================================================
// INICIALIZAÇÃO
//==================================================

document.addEventListener(

    "DOMContentLoaded",

    () => {

        if (

            document.getElementById(

                "historicoLista"

            )

        ) {

            carregarHistorico();

        }

    }

);



//==================================================
// ATUALIZAÇÃO EXTERNA
//==================================================

window.addEventListener(

    "focus",

    () => {

        if (

            document.getElementById(

                "historicoLista"

            )

        ) {

            carregarHistorico();

        }

    }

);

document.addEventListener(

    "visibilitychange",

    () => {

        if (

            !document.hidden &&

            document.getElementById(

                "historicoLista"

            )

        ) {

            carregarHistorico();

        }

    }

);



//==================================================
// FIM DO ARQUIVO
//==================================================
  





