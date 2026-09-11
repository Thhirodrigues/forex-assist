function dashboardView() {

    return `
    <div class="card">
        <div class="card-title">Scanner Status</div>
        <div id="scannerStatus" class="signal wait">
            Carregando...
        </div>
    </div>

    <div class="card">
        <div class="card-title">Sugestão de Agora</div>
        <div id="sugestaoAgora">
            Carregando...
        </div>
    </div>

    <div class="card">
        <div class="card-title">Modo Atual</div>
        <div id="modoAtual" class="perfil-atual">Carregando...</div>
    </div>

    <div class="card">
        <div id="desempenhoCard">Carregando...</div>
    </div>

    <div class="card">
        <div class="card-title">Cooldowns Hoje</div>
        <div id="cooldownsHoje" class="big-number">0</div>
    </div>

    <div class="card">
        <div class="card-title">Debug Firebase</div>
        <div id="debugFirebase">
            Iniciando...
        </div>
    </div>
    `;
}

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
    agressivo: "🟢 Agressivo",
    balanceado: "🔵 Balanceado",
    conservador: "🟡 Conservador"
};

async function renderModoAtual() {

    const el = document.getElementById("modoAtual");

    if (!el) return;

    try {

        const doc = await db
            .collection("configuracoes")
            .doc("geral")
            .get();

        const perfil = (doc.exists ? doc.data().perfil : null) || "balanceado";

        el.innerHTML = ROTULOS_PERFIL[perfil] || perfil;

    } catch (erro) {

        console.error("Erro ao carregar modo atual:", erro);

        el.innerHTML = "Balanceado";

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
setInterval(async () => {

    if (document.hidden) return;

    const status =
        document.getElementById(
            "scannerStatus"
        );

    if (!status) return;

    try {

        document.getElementById(
            "debugFirebase"
        ).innerHTML =
            "db encontrado";

        const doc =
            await window.db
                .collection("scanner")
                .doc("status")
                .get();

        const dados =
            doc.data() || {};

        document.getElementById(
            "debugFirebase"
        ).innerHTML =
            "Firestore conectado";

        status.innerHTML =
            dados.ativo
                ? "🟢 Online"
                : "🔴 Parado";

        document.getElementById(
            "cooldownsHoje"
        ).innerHTML =
            dados.cooldownsHoje || 0;

    } catch (erro) {

        document.getElementById(
            "debugFirebase"
        ).innerHTML =
            erro.message;

    }

}, 15000);
