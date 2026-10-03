// AJUSTE-014 (24/09/2026): aba "Scanner" separada (antes em
// js/scanner.js) removida por pedido do usuário - a "Última Análise"
// que só existia lá não batia com o Histórico e não acrescentava
// informação nenhuma, e o card "Scanner Status" já existente aqui no
// Dashboard cobria o essencial. Botão Iniciar/Parar movido pra dentro
// deste card - único pedaço da aba antiga que valia manter.
// `verificarResetDiario()` (zera contadores diários quando muda o
// dia) e os handlers de clique também migraram pra cá, únicos lugares
// que os usavam. js/scanner.js foi apagado (nada mais o referenciava
// fora do próprio arquivo, conferido antes de remover).
// dashboardView() (montagem da tela do Painel) fica em js/painel.js.

// ===================================================
// MODO ATUAL (perfil operacional real, lido de configuracoes/geral)
// ---------------------------------------------------
// Antes deste conserto, o card mostrava sempre o texto fixo "Expert" -
// sobra de antes da reversão do perfil "Expert RMI" (ver
// DOCUMENTACAO/ENGINEERING.md). Rótulos duplicados de
// PERFIS_OPERACIONAIS em js/config.js de propósito, pra este arquivo
// não depender da ordem de carregamento dos <script> em index.html.
// ===================================================

const ROTULOS_PERFIL = {
    agressivo: "Agressivo",
    balanceado: "Balanceado",
    conservador: "Conservador"
};

// Ponto colorido (CSS) + rótulo; perfil desconhecido cai no texto cru,
// sem HTML vindo do banco (textContent via elemento temporário).
function rotuloPerfilHTML(perfil) {

    const conhecido = Object.prototype.hasOwnProperty.call(ROTULOS_PERFIL, perfil);

    const span = document.createElement("span");

    span.className = "pa-perfil" + (conhecido ? " pa-perfil--" + perfil : "");
    span.textContent = conhecido ? ROTULOS_PERFIL[perfil] : String(perfil);

    return span.outerHTML;

}

async function renderModoAtual() {

    const el = document.getElementById("modoAtual");

    if (!el) return;

    try {

        const doc = await db
            .collection("configuracoes")
            .doc("geral")
            .get();

        const perfil = (doc.exists ? doc.data().perfil : null) || "balanceado";

        el.innerHTML = rotuloPerfilHTML(perfil);

    } catch (erro) {

        console.error("Erro ao carregar modo atual:", erro);

        el.innerHTML = rotuloPerfilHTML("balanceado");

    }

}

// Intervalo 2000ms -> 15000ms (07/09/2026): rodando a cada 2s, esse
// polling sozinho podia consumir dezenas de milhares de leituras do
// Firestore por dia enquanto a aba Dashboard ficasse aberta,
// contribuindo pra estourar a cota gratuita e derrubar o Scanner real
// com RESOURCE_EXHAUSTED (confirmado no console do Firebase: 55 mil
// leituras/dia contra um teto gratuito de 50 mil). Um status que
// humano só olha de vez em quando não precisa de atualização a cada 2
// segundos.
//
// Reforço adicional (mesmo dia): parar de consultar completamente
// quando a aba não está em primeiro plano (tela apagada, outro app
// na frente, outra aba ativa) - celular com o app aberto em segundo
// plano por horas era o cenário real que mais pesava na cota.
async function atualizarStatusScanner() {

    if (document.hidden) return;

    const status =
        document.getElementById(
            "scannerStatus"
        );

    if (!status) return;

    const debug = document.getElementById("debugFirebase");

    try {

        if (debug) debug.innerHTML = "db encontrado";

        const doc =
            await window.db
                .collection("scanner")
                .doc("status")
                .get();

        const dados =
            doc.data() || {};

        if (debug) debug.innerHTML = "Firestore conectado";

        // Aurora Glass: ponto + texto (nunca só cor) e classe de estado.
        status.className =
            "pa-status " +
            (dados.ativo ? "pa-status--on" : "pa-status--off");

        status.innerHTML =
            '<i class="pa-ponto" aria-hidden="true"></i><span>' +
            (dados.ativo ? "Scanner online" : "Scanner parado") +
            // AJUSTE-068: com o mercado fechado o scanner fica "online" mas em pausa.
            (dados.ativo && window.horarioMercado && !window.horarioMercado.mercadoForexAberto() ? " · mercado fechado" : "") +
            "</span>";

        // AJUSTE-014: estado dos botões Iniciar/Parar (migrado de
        // js/scanner.js, mesma lógica de sempre) - atualizado junto
        // do mesmo polling que já lê este documento, sem consulta
        // extra.
        const startBtn = document.getElementById("startScanner");
        const stopBtn = document.getElementById("stopScanner");

        if (startBtn) startBtn.disabled = Boolean(dados.ativo);
        if (stopBtn) stopBtn.disabled = !dados.ativo;

        const cooldowns = document.getElementById("cooldownsHoje");

        if (cooldowns) cooldowns.innerHTML = dados.cooldownsHoje || 0;

    } catch (erro) {

        if (debug) debug.innerHTML = erro.message;

        // Sem resposta do Firestore (cota, rede): não deixar o card
        // eternamente em "Carregando…", mas também não afirmar Online ou
        // Parado sem saber - mantém o último estado se já havia um.
        if (status.classList.contains("pa-status--carregando")) {

            status.innerHTML =
                '<i class="pa-ponto" aria-hidden="true"></i><span>Sem conexão</span>';

        }

    }

}

setInterval(atualizarStatusScanner, 15000);

// AJUSTE-014 (24/09/2026): migrado de js/scanner.js (aba removida) -
// única lógica que valia manter de lá.
async function verificarResetDiario() {

    const hoje = new Date().toLocaleDateString("pt-BR");

    const statusRef = db.collection("scanner").doc("status");

    const statusDoc = await statusRef.get();

    const status = statusDoc.data() || {};

    if (status.ultimaData !== hoje) {

        await statusRef.set({

            sinaisHoje: 0,

            cooldownsHoje: 0,

            ultimaData: hoje

        }, {
            merge: true
        });

    }

}

document.addEventListener("click", async (e) => {

    if (e.target.id === "startScanner") {

        try {

            await verificarResetDiario();

            await db
                .collection("scanner")
                .doc("status")
                .set({

                    ativo: true

                }, {

                    merge: true

                });

        } catch (erro) {

            console.log("Erro Firebase:", erro);

        }

        app.render();

    }

    if (e.target.id === "stopScanner") {

        try {

            await db
                .collection("scanner")
                .doc("status")
                .set({

                    ativo: false

                }, {

                    merge: true

                });

        } catch (erro) {

            console.log("Erro Firebase:", erro);

        }

        app.render();

    }

});
