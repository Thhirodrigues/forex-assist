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

        const app = document.getElementById("app");

        let content = "";

        switch(this.currentTab){

            case "dashboard":
                content = dashboardView();
                break;

            case "scanner":
                content = scannerView();
                break;

            case "historico":
                content = historicoView();
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
            <div class="subtitle">V5 Expert Alpha</div>
        </div>

        <div class="container">
            ${content}
        </div>

        <div class="bottom-nav">

            <button class="nav-btn ${this.currentTab==="dashboard"?"nav-active":""}" data-tab="dashboard">
                Dashboard
            </button>

            <button class="nav-btn ${this.currentTab==="scanner"?"nav-active":""}" data-tab="scanner">
                Scanner
            </button>

            <button class="nav-btn ${this.currentTab==="historico"?"nav-active":""}" data-tab="historico">
                Histórico
            </button>

            <button class="nav-btn ${this.currentTab==="manual"?"nav-active":""}" data-tab="manual">
                Manual
            </button>

            <button class="nav-btn ${this.currentTab==="config"?"nav-active":""}" data-tab="config">
                Config
            </button>

        </div>
        `;
        if (this.currentTab === "historico") {

    setTimeout(() => {

        if (typeof carregarHistorico === "function") {
            carregarHistorico();
        }

    }, 100);

        }
    }

};

window.addEventListener("load", () => {
    app.init();
});
