// Título de cada aba no cabeçalho (mesmo padrão do projeto Aurora Glass:
// "FOREX ASSIST" pequeno em cima, nome da aba embaixo).
const TITULOS_ABA = {
    dashboard: "Forex Assist",
    historico: "Histórico",
    resultados: "Resultados",
    config: "Config",
    manual: "Manual",
    laboratorio: "Laboratório"
};

// Linha de apoio sob o título nas telas secundárias (padrão do projeto:
// título grande + subtítulo). "Real Money Intelligence" é o nome da marca.
const SUBTITULOS_ABA = {
    dashboard: "Real Money Intelligence",
    historico: "Sinais e operações, dia a dia",
    resultados: "Desempenho da conta",
    config: "Preferências do assistente",
    manual: "Real Money Intelligence",
    laboratorio: "Testes em paralelo, fora do sinal oficial"
};

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

            // closest(): o clique pode cair no ícone ou no rótulo
            // dentro do botão, não só no <button> em si.
            const alvoTab = e.target.closest ? e.target.closest("[data-tab]") : null;
            const tab = alvoTab ? alvoTab.dataset.tab : undefined;

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

        // Tema "Aurora Glass" em todas as abas (css/styles.css).
        document.body.classList.add("tema-aurora");

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

            // AJUSTE-077 (04/10/2026): placar do Laboratório (só leitura). Ver js/laboratorio.js.
            case "laboratorio":
                content = laboratorioView();
                break;

            case "config":
                content = configView();
                break;

        }

        app.innerHTML = `
        
        <div class="header header--aba${this.currentTab === "dashboard" ? " header--painel" : ""}">
            <div class="header-linha">
                <div class="header-texto">
                    <div class="subtitle">${TITULOS_ABA[this.currentTab] || "Forex Assist"}</div>
                    <div class="tagline">${SUBTITULOS_ABA[this.currentTab] || ""}</div>
                </div>
                ${this.currentTab === "dashboard" ? `
                <div id="scannerStatus" class="pa-status pa-status--carregando" role="status" aria-live="polite">
                    <i class="pa-ponto" aria-hidden="true"></i><span>Carregando…</span>
                </div>` : ""}
            </div>
        </div>

        <div class="container">
            ${content}
        </div>

        <nav class="bottom-nav" aria-label="Navegação principal">
        <div class="bn-lista">
${[
    ["dashboard", "Painel",     "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"],
    ["historico", "Histórico",  "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2"],
    ["resultados","Resultados", "M5 20V11M12 20V4M19 20v-6"],
    ["config",    "Config",     "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4"],
    ["manual",    "Manual",     "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10"],
    ["laboratorio", "Lab",      "M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M8 15h8"]
].map(([id, rotulo, icone]) => `
            <button class="nav-btn ${this.currentTab===id?"nav-active":""}" data-tab="${id}" aria-label="${rotulo}"${this.currentTab===id?' aria-current="page"':""}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icone}"/></svg>
                <span>${rotulo}</span>
            </button>`).join("")}
        </div>
        </nav>
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

        if (typeof renderPainel === "function") {
            renderPainel();
        }

        if (typeof renderModoAtual === "function") {
            renderModoAtual();
        }

        // Primeira leitura do status logo ao abrir a aba (antes só o
        // setInterval de 15s preenchia, e o card ficava "Carregando..."
        // até lá). Uma leitura a mais por visita ao Dashboard.
        if (typeof atualizarStatusScanner === "function") {
            atualizarStatusScanner();
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

        if (this.currentTab === "laboratorio") {

    setTimeout(() => {

        if (typeof carregarLaboratorio === "function") {
            carregarLaboratorio();
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
