function manualView() {
  return `
    <div class="card">
      <h2>Manual Forex</h2>

      <h3>RSI</h3>
      <p>
        Mede sobrecompra e sobrevenda.
      </p>

      <h3>ADX</h3>
      <p>
        Mede força da tendência.
      </p>

      <h3>RR</h3>
      <p>
        Relação risco retorno.
      </p>

      <h3>Notificação atrasando?</h3>
      <p>
        Se o push de um sinal (abertura ou encerramento) chegar minutos
        depois do horário real da operação, o motivo mais comum é o
        Android segurando notificações do Chrome pra economizar
        bateria - o app já pede entrega imediata (alta prioridade), mas
        o sistema ainda pode restringir por app.
      </p>
      <p>
        Pra evitar: nas configurações do Android, vá em
        <strong>Bateria &gt; Chrome (ou o navegador usado) &gt; Uso da
        bateria</strong> e escolha <strong>"Sem restrições"</strong>
        (em alguns aparelhos aparece como "Irrestrito" ou "Permitir
        atividade em segundo plano"). Isso deixa o navegador acordar o
        dispositivo na hora pra entregar a notificação, em vez de
        esperar um lote.
      </p>
    </div>
  `;
}
