function scannerView() {

    const scannerAtivo =
        localStorage.getItem("scannerAtivo") === "true";

    return `
    <div class="card">

        <div class="card-title">
            Scanner Expert
        </div>

        <div class="signal ${scannerAtivo ? "buy" : "wait"}">
            ${scannerAtivo
                ? "Scanner Online"
                : "Scanner aguardando início"}
        </div>

        <button
            class="button start-btn"
            id="startScanner">

            Iniciar Scanner

        </button>

        <button
            class="button stop-btn"
            id="stopScanner">

            Parar Scanner

        </button>

    </div>

    <div class="card">

        <div class="card-title">
            Última Análise
        </div>

        <div class="list-item">
            ${scannerAtivo
                ? "Scanner ativo e monitorando mercado."
                : "Nenhuma análise executada."}
        </div>

    </div>
    `;
}

document.addEventListener("click", async (e) => {

    if (e.target.id === "startScanner") {

        localStorage.setItem(
            "scannerAtivo",
            "true"
        );

        try {

            await db.collection("scanner")
                .doc("status")
                .update({
                    ativo: true
                });

        } catch (erro) {

            console.log("Erro Firebase:", erro);

        }

        app.render();
    }

    if (e.target.id === "stopScanner") {

        localStorage.setItem(
            "scannerAtivo",
            "false"
        );

        try {

            await db.collection("scanner")
                .doc("status")
                .update({
                    ativo: false
                });

        } catch (erro) {

            console.log("Erro Firebase:", erro);

        }

        app.render();
    }

});
