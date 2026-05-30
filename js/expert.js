function dashboardView() {
    return `

    <div class="card">
        <div class="card-title">
            Scanner Status
        </div>

        <div class="status-offline">
            🔴 Parado
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

        <div class="big-number">
            0
        </div>
    </div>

    <div class="card">
        <div class="card-title">
            Qualidade do Mercado
        </div>

        <div class="signal wait">
            Aguardando análise...
        </div>
    </div>

    <div class="card">
        <div class="card-title">
            Último Sinal
        </div>

        <div class="signal wait">
            Nenhum sinal disponível
        </div>
    </div>

    `;
}

function historicoView() {
    return `

    <div class="card">

        <div class="card-title">
            Histórico
        </div>

        <div class="list-item">
            Nenhum sinal registrado
        </div>

    </div>

    `;
}

function configView() {
    return `

    <div class="card">

        <div class="card-title">
            Configurações
        </div>

        <div class="list-item">
            Modo: Expert
        </div>

        <div class="list-item">
            Intervalo Principal: 60s
        </div>

        <div class="list-item">
            Multiplicador Secundário: 3x
        </div>

        <div class="list-item">
            Cooldown: 30 min
        </div>

    </div>

    `;
}
