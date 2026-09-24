const app = {

    currentTab:
localStorage.getItem("ultimaAba")
|| "dashboard",

    init() {
        this.render();
        this.bindEvents();
    },

    bindEvents() {

        document.addEventListener("click", (e) => {

            const tab = e.target.dataset.tab;

            if(tab){

    this.currentTab = tab;

    localStorage.setItem(
        "ultimaAba",
        tab
    );

    this.render();

            }

        });

    },

    render(){

        // AJUSTE-014 (24/09/2026): aba "Scanner" removida (botão
        // Iniciar/Parar migrou pro Dashboard, ver js/expert.js) -
        // quem tiver "scanner" salvo em localStorage de uma sessão
        // anterior cairia numa aba que não existe mais (tela em
        // branco). Normaliza pra "dashboard" e já corrige o valor
        // salvo, pra não repetir o problema na próxima visita.
        if (this.currentTab === "scanner") {
            this.currentTab = "dashboard";
            localStorage.setItem("ultimaAba", "dashboard");
        }

        const app = document.getElementById("app");

        let content = "";

        switch(this.currentTab){

            case "dashboard":
                content = dashboardView();
                break;

            case "historico":
                content = historicoView();
                break;

            // AJUSTE-021 (24/09/2026): aba nova - resultados/placar/
            // comparação de sinais, separada do Histórico (que fica só
            // monitoramento). Ver js/resultados.js.
            case "resultados":
                content = resultadosView();
                break;

            case "manual":
                content = manualView();
                break;

            case "config":
                content = configView();
                break;

        }

        app.innerHTML = `
        
        <div class="header">
            <div class="logo">Forex Assist</div>
            <div class="subtitle">Real Money Intelligence</div>
        </div>

        <div class="container">
            ${content}
        </div>

        <div class="bottom-nav">

            <button class="nav-btn ${this.currentTab==="dashboard"?"nav-active":""}" data-tab="dashboard">
                Dashboard
            </button>

            <button class="nav-btn ${this.currentTab==="historico"?"nav-active":""}" data-tab="historico">
                Histórico
            </button>

            <button class="nav-btn ${this.currentTab==="resultados"?"nav-active":""}" data-tab="resultados">
                Resultados
            </button>

            <button class="nav-btn ${this.currentTab==="config"?"nav-active":""}" data-tab="config">
                Config
            </button>

            <button class="nav-btn ${this.currentTab==="manual"?"nav-active":""}" data-tab="manual">
                Manual
            </button>

        </div>
        `;
        if (this.currentTab === "dashboard") {

    setTimeout(() => {

        // AJUSTE-014 (24/09/2026): "Sugestão de Agora" removida do
        // Dashboard por pedido do usuário - com pares fixos (não o
        // universo completo), o card não agrega valor agora. Lógica
        // (js/pairInsights.js, incluindo o cache do AJUSTE-013) fica
        // intacta, só não é mais chamada - reativar quando o app
        // passar a rotacionar entre todos os pares (ver
        // PENDENCIAS-ESTRATEGICAS-RMI.md, seção 6).

        if (typeof renderModoAtual === "function") {
            renderModoAtual();
        }

        if (typeof renderDesempenho === "function") {
            renderDesempenho();
        }

    }, 100);

        }

        if (this.currentTab === "historico") {

    setTimeout(() => {

        if (typeof carregarHistorico === "function") {
            carregarHistorico();
        }

    }, 100);

        }

        if (this.currentTab === "resultados") {

    setTimeout(() => {

        if (typeof carregarResultados === "function") {
            carregarResultados();
        }

    }, 100);

        }

        if (this.currentTab === "config") {

    setTimeout(() => {

        if (typeof bindConfigEvents === "function") {
            bindConfigEvents();
        }

    }, 100);

        }
    }

};

window.addEventListener("load", () => {
    app.init();
});
