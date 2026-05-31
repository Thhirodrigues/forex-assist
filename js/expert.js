function dashboardView() {

    return `
    <div class="card">
        <div class="card-title">
            Scanner Status
        </div>

        <div id="scannerStatus" class="signal wait">
            Carregando...
        </div>
    </div>

    <div class="card">
        <div class="card-title">
            Modo Atual
        </div>

        <div class="big-number">
            Expert
        </div>
    </div>

    <div class="card">
        <div class="card-title">
            Sinais Hoje
        </div>

        <div id="sinaisHoje" class="big-number">
            0
        </div>
    </div>

    <div class="card">
        <div class="card-title">
            Qualidade do Mercado
        </div>

        <div id="ultimaAnalise" class="signal wait">
            Aguardando análise...
        </div>
    </div>

    <div class="card">
        <div class="card-title">
            Último Sinal
        </div>

        <div id="ultimoSinal" class="signal wait">
            Nenhum sinal
        </div>
    </div>
    `;
}

setInterval(async () => {

    const status = document.getElementById("scannerStatus");

    if (!status) return;

    try {

        const doc = await db
            .collection("scanner")
            .doc("status")
            .get();

        const dados = doc.data();

        status.innerHTML =
            dados.ativo
                ? "🟢 Online"
                : "🔴 Parado";

        document.getElementById(
            "sinaisHoje"
        ).innerHTML = dados.sinaisHoje || 0;

        document.getElementById(
            "ultimaAnalise"
        ).innerHTML =
            dados.ultimaAnalise ||
            "Aguardando análise";

        document.getElementById(
            "ultimoSinal"
        ).innerHTML =
            dados.ultimoSinal ||
            "Nenhum sinal";

    } catch (erro) {

        console.log(erro);

    }

}, 2000);
