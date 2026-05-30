document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('app').innerHTML = `
  
  <header class="topbar">
    <h1>Forex Assist</h1>
    <span class="version">V5 Expert Alpha</span>
  </header>

  <main class="container">

    <section class="card">
      <h2>Scanner Status</h2>
      <div class="status online">
        🟢 Parado
      </div>
    </section>

    <section class="card">
      <h2>Modo Atual</h2>
      <div class="mode">
        EXPERT
      </div>
    </section>

    <section class="card">
      <h2>Sinais Hoje</h2>
      <div class="big-number">
        0
      </div>
    </section>

    <section class="card">
      <h2>Qualidade do Mercado</h2>
      <div class="market-status">
        Aguardando análise...
      </div>
    </section>

    <section class="card">
      <h2>Último Sinal</h2>
      <p>Nenhum sinal disponível.</p>
    </section>

  </main>

  <nav class="bottom-nav">

    <button>Dashboard</button>

    <button>Scanner</button>

    <button>Histórico</button>

    <button>Manual</button>

    <button>Config</button>

  </nav>

  `;
});
