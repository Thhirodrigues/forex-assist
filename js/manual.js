// ======================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MÓDULO: MANUAL
//
// AJUSTE-024 (25/09/2026): reescrito do zero como Base de Conhecimento
// completa (pedido explícito do usuário: "quero um manual bem
// completo, o usuário não precisa ir na internet"). Segue o escopo do
// DT-025 (arquivado em DOCUMENTACAO/BACKLOG-E-VISAO.md), priorizando
// primeiro os dois itens que o próprio documento aponta como únicos
// que "ninguém além deste projeto pode escrever" - o que o score/
// perfil significa, e como ler um sinal salvo - antes do glossário
// genérico.
//
// Todo número/regra/limiar abaixo foi conferido DIRETO no código real
// (scripts/marketAnalyzer.js, scoreEngine.js, decisionEngine.js,
// moneyManager.js, historyAnalyzer.js, statisticsEngine.js,
// riskManager.js, js/checker.js, scripts/scanner.js) antes de
// escrever, não de memória - inclusive um bug real foi encontrado e
// corrigido nesse processo (AJUSTE-023, penalidade histórica morta em
// scoreEngine.js). Como o próprio DT-025 avisa: isso é um documento
// VIVO. O pipeline muda (mudou 3 vezes só nesta sessão) - datas de
// "conferido em" ficam registradas por seção pra saber o que pode
// estar desatualizado.
// ======================================================

function manualView() {
  return `
    <div class="card">
      <h2>📖 Manual Forex Assist</h2>
      <p style="font-size:12px; color:#8c95b3;">
        Base de conhecimento completa do app - o que cada número
        significa, como o RMI decide, e um glossário de Forex pra
        nunca precisar sair daqui. Conferido contra o código real em
        25/09/2026.
      </p>
    </div>

    ${secaoComoDecide()}
    ${secaoComoLerSinal()}
    ${secaoGestaoRisco()}
    ${secaoIndicadores()}
    ${secaoEstruturaMercado()}
    ${secaoPsicologia()}
    ${secaoNotificacoes()}
  `;
}

// ======================================================
// 1. COMO O RMI DECIDE UM SINAL
// ======================================================

function secaoComoDecide() {
  return `
    <div class="card">
      <h2>🧠 Como o RMI decide um sinal</h2>
      <p style="font-size:12px; color:#8c95b3;">
        Conferido contra scripts/marketAnalyzer.js, scoreEngine.js e
        decisionEngine.js em 25/09/2026.
      </p>

      <h3>O caminho completo</h3>
      <p>
        A cada ciclo (o Scanner roda a cada 5 minutos, disparado por um
        pinger externo), pra cada par monitorado que estiver dentro da
        janela de horário dele:
      </p>
      <ol style="padding-left:20px; font-size:14px;">
        <li>Busca candles de 5min e 15min (TwelveData).</li>
        <li>Calcula os indicadores técnicos (EMA9/21/50/100/200, RSI,
          ADX, ATR) sobre os candles de 5min - e um segundo conjunto de
          EMAs sobre os de 15min, só pra confirmação multi-timeframe.</li>
        <li><b>Market Analyzer</b> transforma esses números numa
          Tendência, uma Qualidade e um Score de 0 a 100.</li>
        <li><b>Decision Engine</b> aplica os critérios do perfil ativo
          (Agressivo/Balanceado/Conservador) e decide: aprova, recusa,
          ou marca "sem viabilidade".</li>
        <li>Se aprovado, o <b>Money Manager</b> calcula lote, TP, SL,
          risco e expectativa matemática pro tamanho de banca atual.</li>
        <li>O sinal é salvo no Histórico com TODOS esses números
          juntos - nada é decidido "no ar", tudo fica registrado.</li>
      </ol>
      <p style="font-size:11px; color:#8c95b3;">
        Importante: a análise técnica (passos 1-4) é EXATAMENTE igual
        pros três perfis - o mercado não muda de comportamento
        dependendo de quem está olhando. O que muda entre perfis é só
        a <b>barra de aprovação</b> (passo 4) e o <b>tamanho de risco</b>
        (passo 5).
      </p>

      <h3>Passo 1 - A Tendência (as 5 médias móveis)</h3>
      <p>
        O RMI usa 5 EMAs (Médias Móveis Exponenciais) de períodos
        9/21/50/100/200 sobre o preço de fechamento. Uma EMA reage mais
        rápido que uma média simples porque dá mais peso aos candles
        recentes - é por isso que o app usa EMA (Exponencial), não SMA
        (Simples).
      </p>
      <p>A tendência sai do <b>alinhamento</b> entre elas:</p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);">
          <th style="padding:6px; text-align:left;">Condição</th>
          <th style="padding:6px; text-align:left;">Tendência</th>
          <th style="padding:6px; text-align:right;">Pontos</th>
        </tr>
        <tr><td style="padding:6px;">EMA9 &gt; EMA21 &gt; EMA50 &gt; EMA100 &gt; EMA200 (alinhamento total pra cima)</td><td style="padding:6px;">ALTA</td><td style="padding:6px; text-align:right;">20</td></tr>
        <tr><td style="padding:6px;">Alinhamento total pra baixo (espelho)</td><td style="padding:6px;">BAIXA</td><td style="padding:6px; text-align:right;">20</td></tr>
        <tr><td style="padding:6px;">EMA9 &gt; EMA21 &gt; EMA50 (só as 3 curtas alinhadas)</td><td style="padding:6px;">ALTA</td><td style="padding:6px; text-align:right;">15</td></tr>
        <tr><td style="padding:6px;">Espelho pra baixo</td><td style="padding:6px;">BAIXA</td><td style="padding:6px; text-align:right;">15</td></tr>
        <tr><td style="padding:6px;">EMA9 &gt; EMA21 E EMA50 &gt; EMA100 (começo de tendência)</td><td style="padding:6px;">ALTA</td><td style="padding:6px; text-align:right;">10</td></tr>
        <tr><td style="padding:6px;">Espelho pra baixo</td><td style="padding:6px;">BAIXA</td><td style="padding:6px; text-align:right;">10</td></tr>
        <tr><td style="padding:6px;">EMA9 e EMA21 quase coladas (diferença &lt; 0,00030)</td><td style="padding:6px;">COMPRESSÃO</td><td style="padding:6px; text-align:right;">5</td></tr>
        <tr><td style="padding:6px;">Nenhuma das anteriores</td><td style="padding:6px;">CONFLITO</td><td style="padding:6px; text-align:right;">5</td></tr>
      </table>
      <p style="font-size:11px; color:#8c95b3;">
        COMPRESSÃO e CONFLITO nunca viram sinal - o Decision Engine
        bloqueia os dois ("Mercado sem tendência definida"), só ALTA
        vira COMPRA e só BAIXA vira VENDA.
      </p>

      <h3>Passo 2 - RSI e ADX somam pontos</h3>
      <p><b>RSI</b> (Índice de Força Relativa, 0-100) mede se o preço
      subiu/caiu rápido demais recentemente:</p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);"><th style="padding:6px; text-align:left;">RSI</th><th style="padding:6px; text-align:left;">Situação</th><th style="padding:6px; text-align:right;">Pontos</th></tr>
        <tr><td style="padding:6px;">55 a 70</td><td style="padding:6px;">COMPRA (força saudável de alta)</td><td style="padding:6px; text-align:right;">20</td></tr>
        <tr><td style="padding:6px;">30 a 45</td><td style="padding:6px;">VENDA (força saudável de baixa)</td><td style="padding:6px; text-align:right;">20</td></tr>
        <tr><td style="padding:6px;">acima de 70</td><td style="padding:6px;">SOBRECOMPRADO</td><td style="padding:6px; text-align:right;">5</td></tr>
        <tr><td style="padding:6px;">abaixo de 30</td><td style="padding:6px;">SOBREVENDIDO</td><td style="padding:6px; text-align:right;">5</td></tr>
        <tr><td style="padding:6px;">45 a 55 (neutro)</td><td style="padding:6px;">NEUTRO</td><td style="padding:6px; text-align:right;">0</td></tr>
      </table>
      <p><b>ADX</b> (0-100, sem sinal de direção) mede FORÇA da
      tendência, não a direção dela:</p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);"><th style="padding:6px; text-align:left;">ADX</th><th style="padding:6px; text-align:left;">Força</th><th style="padding:6px; text-align:right;">Pontos</th></tr>
        <tr><td style="padding:6px;">abaixo de 15</td><td style="padding:6px;">MUITO FRACA</td><td style="padding:6px; text-align:right;">0</td></tr>
        <tr><td style="padding:6px;">15 a 20</td><td style="padding:6px;">FRACA</td><td style="padding:6px; text-align:right;">3</td></tr>
        <tr><td style="padding:6px;">20 a 25</td><td style="padding:6px;">MODERADA</td><td style="padding:6px; text-align:right;">6</td></tr>
        <tr><td style="padding:6px;">25 a 30</td><td style="padding:6px;">BOA</td><td style="padding:6px; text-align:right;">9</td></tr>
        <tr><td style="padding:6px;">30 a 35</td><td style="padding:6px;">FORTE</td><td style="padding:6px; text-align:right;">12</td></tr>
        <tr><td style="padding:6px;">35 a 40</td><td style="padding:6px;">MUITO FORTE</td><td style="padding:6px; text-align:right;">14</td></tr>
        <tr><td style="padding:6px;">acima de 40</td><td style="padding:6px;">EXTREMA</td><td style="padding:6px; text-align:right;">15</td></tr>
      </table>
      <p style="font-size:11px; color:#8c95b3;">
        Mais um bônus de "confirmação cruzada": se EMA e RSI concordam
        na direção, +10; se ADX está moderado/bom, +5 extra; se ADX
        está forte/muito forte/extremo, +10 extra (esse é o campo
        interno "tendenciaScore").
      </p>

      <h3>Passo 3 - Score final (0 a 100)</h3>
      <p>
        A soma de EMA+RSI+ADX+confirmação acima é o "score técnico" -
        mas o score que decide a aprovação leva mais camadas em conta,
        todas somadas por cima:
      </p>
      <ul style="padding-left:20px; font-size:13px;">
        <li><b>Inclinação (slope) das EMAs</b> - 0 a 8 pontos, mede se
          a tendência está acelerando ou perdendo força.</li>
        <li><b>Alinhamento</b> - 0 a 5 pontos, quão "arrumadas" as EMAs
          estão entre si.</li>
        <li><b>Simetria e distância entre EMAs</b> - até 8 pontos
          juntos, evita marcar tendência forte quando as médias estão
          coladas demais ou distantes demais de um jeito artificial.</li>
        <li><b>Multi-timeframe</b> - +4 se a tendência do candle de
          15min concorda com a de 5min ("CONFIRMADO"), 0 se diverge.</li>
        <li><b>Histórico do par</b> - até +5 (taxa de acerto ≥80% =
          EXCELENTE) ou até +3 (≥70% = BOA), multiplicado pela
          confiabilidade da amostra (peso cheio só a partir de ~40
          operações fechadas desse par; com menos que isso, o bônus
          vale 90% ou 80% do valor cheio). RUIM (&lt;50%) tira -10. Sem
          estatística nenhuma ainda tira -5 (ver correção AJUSTE-023).</li>
        <li><b>Memória operacional</b> - até ±4 pontos conforme os
          últimos 5 resultados desse par foram majoritariamente WIN ou
          LOSS.</li>
        <li><b>Volatilidade (ATR)</b> - ATR muito baixo (mercado
          "parado") tira pontos; ATR normal/alto soma.</li>
        <li><b>SMC / Order Block</b> - ver seção própria abaixo, ±3.</li>
        <li><b>Multi-timeframe divergente</b> - -10 direto no score
          (separado do bônus de +4 acima).</li>
      </ul>
      <p>
        Tudo isso somado, multiplicado pela confiabilidade do
        histórico, e limitado entre 0 e 100 - esse é o <b>Score</b>
        que aparece no sinal salvo.
      </p>

      <h3>Qualidade (a categoria do score)</h3>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);"><th style="padding:6px; text-align:left;">Score final</th><th style="padding:6px; text-align:left;">Qualidade</th></tr>
        <tr><td style="padding:6px;">95 ou mais</td><td style="padding:6px;">🏆 INSTITUCIONAL</td></tr>
        <tr><td style="padding:6px;">90 a 94</td><td style="padding:6px;">💪 FORTE</td></tr>
        <tr><td style="padding:6px;">80 a 89</td><td style="padding:6px;">✅ BOA</td></tr>
        <tr><td style="padding:6px;">70 a 79</td><td style="padding:6px;">🆗 ACEITÁVEL</td></tr>
        <tr><td style="padding:6px;">abaixo de 70</td><td style="padding:6px;">⚠️ CONFLITO</td></tr>
      </table>

      <h3>SMC / Order Blocks (Smart Money Concepts)</h3>
      <p>
        Camada secundária de confirmação institucional, ligada por
        padrão na tela de Config. Detecta zonas de preço onde grandes
        players provavelmente deixaram ordens (order blocks) nos
        candles recentes. Se o preço atual está dentro/perto dessa
        zona: +3 no score se o order block aponta na MESMA direção do
        sinal, -3 se aponta na direção CONTRÁRIA. Sem order block
        relevante, ou preço fora da zona: não muda nada. Nunca aprova
        nem reprova um sinal sozinha - é só um peso a mais.
      </p>
      <p style="font-size:11px; color:#8c95b3;">
        Limitação conhecida (registrada em ENGINEERING.md): o app
        detecta a zona exata do order block internamente, mas hoje só
        guarda/mostra a direção e se o preço está na zona ou não - o
        preço exato da zona (zonaLow/zonaHigh) não fica salvo no sinal
        ainda. Outros conceitos SMC/ICT (Liquidity Sweeps, Fair Value
        Gaps) não estão implementados.
      </p>

      <h3>Multi-timeframe (5min vs 15min)</h3>
      <p>
        O RMI calcula a tendência (ALTA/BAIXA/LATERAL) também sobre um
        conjunto de EMAs de 15 minutos, separado do de 5 minutos.
        CONFIRMADO quando os dois concordam (+4 no score); DIVERGENTE
        quando não concordam (-10 no score, e no perfil Balanceado ou
        Conservador isso BLOQUEIA o sinal - ver tabela de perfis
        abaixo).
      </p>

      <h3>Os 3 perfis operacionais</h3>
      <p>
        A análise técnica é igual pros três. O que muda é a barra de
        aprovação e o quanto de risco cada um aceita:
      </p>
      <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0; min-width:600px;">
        <tr style="background:rgba(255,255,255,.06);">
          <th style="padding:6px; text-align:left;">Critério</th>
          <th style="padding:6px; text-align:center;">🟢 Agressivo</th>
          <th style="padding:6px; text-align:center;">🔵 Balanceado</th>
          <th style="padding:6px; text-align:center;">🟡 Conservador</th>
        </tr>
        <tr><td style="padding:6px;">Score mínimo pra aprovar</td><td style="padding:6px; text-align:center;">35</td><td style="padding:6px; text-align:center;">45</td><td style="padding:6px; text-align:center;">55</td></tr>
        <tr><td style="padding:6px;">Exige multi-timeframe confirmado</td><td style="padding:6px; text-align:center;">Não</td><td style="padding:6px; text-align:center;">Sim</td><td style="padding:6px; text-align:center;">Sim</td></tr>
        <tr><td style="padding:6px;">Mínimo de operações no histórico do par pra operar</td><td style="padding:6px; text-align:center;">0</td><td style="padding:6px; text-align:center;">0</td><td style="padding:6px; text-align:center;">30</td></tr>
        <tr><td style="padding:6px;">Expectativa matemática negativa</td><td style="padding:6px; text-align:center;">Só aviso</td><td style="padding:6px; text-align:center;">Bloqueia</td><td style="padding:6px; text-align:center;">Bloqueia</td></tr>
        <tr><td style="padding:6px;">Risco por operação (% da banca)</td><td style="padding:6px; text-align:center;">3%</td><td style="padding:6px; text-align:center;">2%</td><td style="padding:6px; text-align:center;">1%</td></tr>
        <tr><td style="padding:6px;">Risco diário máximo (% da banca)</td><td style="padding:6px; text-align:center;">8%</td><td style="padding:6px; text-align:center;">5%</td><td style="padding:6px; text-align:center;">3%</td></tr>
        <tr><td style="padding:6px;">Perdas seguidas que travam o dia</td><td style="padding:6px; text-align:center;">5</td><td style="padding:6px; text-align:center;">4</td><td style="padding:6px; text-align:center;">3</td></tr>
        <tr><td style="padding:6px;">Reward:Risk mínimo</td><td style="padding:6px; text-align:center;">1.0</td><td style="padding:6px; text-align:center;">1.0</td><td style="padding:6px; text-align:center;">1.2</td></tr>
      </table>
      </div>
      <p style="font-size:11px; color:#8c95b3;">
        O Conservador exigir 30 operações de histórico ANTES de
        confiar no par é por isso que ele demora mais pra gerar
        sinal - ele está esperando ter base suficiente pra confiar
        na estatística daquele par especificamente.
      </p>

      <h3>Veto de RSI extremo (entrada tardia)</h3>
      <p>
        Regra que vale IGUAL pros três perfis, aplicada depois do
        score: se a tendência é de ALTA mas o RSI já passou de 73
        (muito sobrecomprado), o sinal é bloqueado - comprar ali seria
        perseguir um movimento que já foi longe demais. Espelho pra
        BAIXA com RSI abaixo de 27. Diferente do score (que é sobre
        risco/tolerância, varia por perfil), isso é sobre o sinal
        técnico contradizer a própria direção que está propondo -
        por isso bloqueia igual pra todos.
      </p>

      <h3>Cooldown e circuit breaker diário</h3>
      <p>
        Além de tudo acima, dois freios de segurança, iguais pros três
        perfis:
      </p>
      <ul style="padding-left:20px; font-size:13px;">
        <li><b>Cooldown</b> - depois de um sinal num par, esse par fica
          de fora por 30 minutos (configurável na tela de Config) ou
          até a operação anterior fechar, o que vier primeiro. Evita
          empilhar sinais em cima do mesmo movimento.</li>
        <li><b>Circuit breaker diário</b> - se o resultado do dia
          (Conta Simulada) já bateu o limite de risco diário do perfil
          (tabela acima), ou se as últimas operações fechadas em
          sequência (o número também varia por perfil) foram todas
          LOSS, o Scanner para de abrir sinais novos até o dia
          seguinte. Protege contra "tentar recuperar" um dia ruim
          insistindo mais.</li>
      </ul>

      <h3>Janela de horário e sessões</h3>
      <p>
        Cada par só é analisado dentro da janela de horário
        configurada (ou da(s) sessão(ões) marcada(s), se você estiver
        usando o modo por sessões em vez de Personalizado - ver a tela
        de Config). Pares com lastro asiático (JPY/AUD/NZD, exceto
        GBP/JPY) têm uma regra própria: de segunda a quinta, eles só
        operam na sessão asiática (21h-04h), nunca disputando horário
        com os outros pares - é quando esses pares têm mais liquidez
        de verdade.
      </p>
    </div>
  `;
}

// ======================================================
// 2. COMO LER UM SINAL SALVO
// ======================================================

function secaoComoLerSinal() {
  return `
    <div class="card">
      <h2>🔍 Como ler um sinal salvo (Histórico/Resultados)</h2>
      <p style="font-size:12px; color:#8c95b3;">
        Conferido contra js/historico.js, js/checker.js e
        scripts/pairAnalyzer.js em 25/09/2026.
      </p>

      <h3>Cabeçalho da linha</h3>
      <ul style="padding-left:20px; font-size:13px;">
        <li><b>🟢/🔴</b> - verde = COMPRA (BUY), vermelho = VENDA
          (SELL).</li>
        <li><b>Resultado</b> - ⏳ PENDENTE (ainda aberta), ✅ WIN,
          ❌ LOSS, ou 🚫 COOLDOWN (não é um sinal de verdade, é só um
          registro de "esse par estava em cooldown nesse ciclo").</li>
        <li><b>⚠️</b> ao lado do resultado - tem um Aviso de Risco
          (Money Manager achou o risco alto pro saldo atual, mas não
          bloqueou - toque pra ver a mensagem completa).</li>
        <li><b>📉</b> - Aviso de Expectativa (só aparece no perfil
          Agressivo, quando a expectativa matemática do par tava
          negativa mas o Agressivo deixa passar como aviso, não
          bloqueio).</li>
      </ul>

      <h3>Ao expandir o sinal (toque na linha)</h3>
      <p><b>EMA 9 / EMA 21 / EMA 200</b> - o preço de cada média na
      hora do sinal, já formatado com as casas decimais certas (pares
      com JPY: 3 casas; outros: 5 casas - é a convenção real de
      cotação do mercado Forex, não um arredondamento nosso).</p>

      <p><b>RSI</b> - o valor do RSI na hora do sinal (ver Passo 2 na
      seção anterior pra saber o que cada faixa significa).</p>

      <p><b>ENTRADA / SAÍDA</b> - preço de abertura e (se já fechou)
      de fechamento. Editáveis só depois de clicar em "Fechei
      Manualmente na Corretora" (ver abaixo).</p>

      <p><b>🧠 SMC</b> (quando aparece) - mostra a direção do order
      block detectado, se o preço estava na zona, e quantos pontos
      isso somou/tirou do score.</p>

      <p><b>🕐 Gerado em</b> (quando aparece, sinais a partir de
      25/09/2026) - qual PERFIL estava ativo (Agressivo/Balanceado/
      Conservador) e qual JANELA de horário admitiu esse par naquele
      momento (Londres/Nova York/Ásia/Personalizado) - útil pra
      entender por que um sinal apareceu num horário que parecia
      "fora" da janela configurada (a janela asiática, por exemplo, é
      incondicional pra pares JPY/AUD/NZD, independente do que está
      selecionado na Config).</p>

      <p><b>📈 Movimento do Preço</b> (só em sinal já encerrado) -
      gráfico simples da trajetória do preço, do início até o
      fechamento, com uma linha tracejada marcando onde foi a
      entrada.</p>

      <h3>Configuração Utilizada</h3>
      <p>
        LOTE / TP / SL - o tamanho de posição e os alvos em dólar
        realmente usados nessa operação. Um aviso mostra se esses
        valores foram os configurados manualmente na tela de Config,
        ou se o Money Manager ajustou automaticamente por algum destes
        motivos:
      </p>
      <ul style="padding-left:20px; font-size:13px;">
        <li><b>REDUZIR_EXPOSICAO</b> - ADX abaixo de 20 (tendência sem
          força) - lote reduzido, TP/SL apertados pra $3.</li>
        <li><b>MERCADO_LENTO</b> - ATR abaixo de 0,0012 (baixa
          volatilidade) - TP/SL apertados pra $3.</li>
        <li><b>EXPECTATIVA_NEGATIVA</b> - expectativa matemática do
          par abaixo de zero - lote reduzido.</li>
        <li><b>MANTER</b> - nenhum ajuste, valores exatamente como
          configurados.</li>
      </ul>

      <h3>Controle Financeiro</h3>
      <p><b>SALDO ANTES / RESULTADO / SALDO DEPOIS</b> - o saldo
      simulado antes e depois dessa operação fechar, e o resultado em
      dólar dela especificamente (positivo = WIN, negativo = LOSS).</p>

      <h3>Favor / Contra (no modo tabela)</h3>
      <p>
        Quantos pips a operação chegou a ficar A FAVOR (melhor preço
        alcançado) e CONTRA (pior preço alcançado) durante toda a vida
        dela, não só no fechamento - útil pra ver operações que quase
        bateram o alvo e voltaram, ou que quase escaparam do stop.
      </p>

      <h3>Motivo de Encerramento</h3>
      <p>Como uma operação fecha automaticamente (verificado a cada 5
      minutos pelo Result Checker):</p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);"><th style="padding:6px; text-align:left;">Motivo</th><th style="padding:6px; text-align:left;">O que significa</th><th style="padding:6px; text-align:center;">WIN/LOSS</th></tr>
        <tr><td style="padding:6px;">TP_FINANCEIRO</td><td style="padding:6px;">Bateu o alvo de lucro em dólar (padrão $5, ou o TP configurado nessa operação)</td><td style="padding:6px; text-align:center;">WIN</td></tr>
        <tr><td style="padding:6px;">SL_FINANCEIRO</td><td style="padding:6px;">Bateu o limite de perda em dólar (padrão $5, ou o SL configurado)</td><td style="padding:6px; text-align:center;">LOSS</td></tr>
        <tr><td style="padding:6px;">TP_PIPS</td><td style="padding:6px;">Chegou a 50 pips a favor sem ter batido o TP em dólar ainda</td><td style="padding:6px; text-align:center;">WIN</td></tr>
        <tr><td style="padding:6px;">SL_PIPS</td><td style="padding:6px;">Chegou a 50 pips contra sem ter batido o SL em dólar ainda</td><td style="padding:6px; text-align:center;">LOSS</td></tr>
        <tr><td style="padding:6px;">MANUAL_CORRETORA</td><td style="padding:6px;">Você fechou manualmente pelo botão, com o preço real da corretora</td><td style="padding:6px; text-align:center;">Depende do valor informado</td></tr>
      </table>
      <p style="font-size:11px; color:#8c95b3;">
        Se TP e SL em dólar batem no mesmo ciclo de 5 minutos (o preço
        oscilou muito rápido), o sistema assume o cenário mais
        pessimista (SL) - não tem como saber qual bateu primeiro só
        olhando o candle de 5 minutos.
      </p>

      <h3>Fechei Manualmente na Corretora</h3>
      <p>
        Se você fechou a operação direto na XM (ou outra corretora)
        antes do app fechar sozinho, use esse botão - abre os campos
        Entrada/Saída pra editar com o preço real, e calcula o
        resultado em dólar automaticamente (pra pares sem cruzamento -
        EUR/JPY, GBP/JPY e EUR/GBP pedem o valor manual, porque o
        cálculo deles depende de uma cotação cruzada que só o servidor
        busca). Isso existe porque deixar uma operação fechada
        manualmente registrada como "ainda aberta" contaminaria as
        estatísticas que alimentam o aprendizado futuro do sistema -
        é a regra de qualidade mais importante deste projeto.
      </p>

      <h3>Operação Real</h3>
      <p>
        Checkbox separado, só aparece depois da operação fechar -
        marca se ESSA operação específica entrou de verdade na sua
        Conta Real (dinheiro de verdade), somando/subtraindo do saldo
        real. A Conta Simulada sempre soma TODO sinal fechado,
        independente disso - é o comparativo "e se eu tivesse operado
        tudo". Não deixa marcar se o SL daquela operação for maior que
        seu saldo real atual (não teria como ter executado de
        verdade).
      </p>
    </div>
  `;
}

// ======================================================
// 3. GESTÃO DE RISCO E DINHEIRO
// ======================================================

function secaoGestaoRisco() {
  return `
    <div class="card">
      <h2>💰 Gestão de risco e dinheiro</h2>
      <p style="font-size:12px; color:#8c95b3;">
        Conferido contra scripts/moneyManager.js e riskManager.js em
        25/09/2026.
      </p>

      <h3>Lote</h3>
      <p>
        O tamanho de posição (lote) parte do valor configurado na tela
        de Config, mas pode ser reduzido automaticamente pelo Money
        Manager quando ADX está fraco (mercado sem força) ou a
        expectativa matemática do par está negativa - ver "Configuração
        Utilizada" na seção anterior.
      </p>

      <h3>Reward:Risk (RR)</h3>
      <p>
        A relação entre quanto você pode ganhar (TP) e quanto pode
        perder (SL), em dólar: <code>RR = TP ÷ SL</code>. Um RR de 1.5
        significa que o alvo de lucro é 1,5× maior que o risco
        assumido. Cada perfil exige um RR mínimo pra aprovar a
        operação (Conservador é o mais exigente, 1.2 - ver tabela de
        perfis).
      </p>

      <h3>Expectativa matemática</h3>
      <p>
        A conta que decide se, EM MÉDIA, esse tipo de operação tende a
        dar lucro ou prejuízo, juntando a taxa de acerto histórica do
        par com o tamanho do TP/SL:
      </p>
      <p style="text-align:center; font-family:monospace; background:rgba(255,255,255,.05); padding:8px; border-radius:6px;">
        Expectativa = (% de acerto × TP) − (% de erro × SL), tudo ÷ 100
      </p>
      <p>
        Exemplo: par com 60% de acerto histórico, TP $5, SL $5 →
        (60×5 − 40×5) ÷ 100 = <b>+$1,00</b> de expectativa por operação,
        em média. Se desse negativo, seria dizer "esse tipo de aposta
        tende a perder dinheiro no longo prazo, mesmo que ganhe às
        vezes" - por isso Balanceado e Conservador bloqueiam
        expectativa negativa, e o Agressivo só avisa (ele aceita mais
        risco por definição).
      </p>

      <h3>Risco por operação e risco diário</h3>
      <p>
        Cada perfil limita quanto da banca pode ser arriscado numa
        operação só, e quanto pode ser perdido no dia inteiro antes do
        circuit breaker travar novos sinais (ver tabela de perfis na
        seção anterior e "Cooldown e circuit breaker diário").
      </p>

      <h3>Pip e Pipette</h3>
      <p>
        Pip é a unidade padrão de movimento de preço no Forex. Pares
        com JPY cotam com 3 casas decimais (o pip é a 2ª casa, ex:
        155.<b>50</b>; a 3ª casa é a "pipette", fração de pip). Pares
        sem JPY cotam com 5 casas (o pip é a 4ª casa, ex: 1.1000<b>0</b>
        vira 1.100<b>50</b> = +5 pips; a 5ª casa é a pipette). O
        tamanho do lote define quanto vale cada pip em dólar - um lote
        padrão (100.000 unidades) vale $10/pip num par cotado em USD
        direto; frações de lote (ex: 0,04) valem proporcionalmente
        menos.
      </p>
    </div>
  `;
}

// ======================================================
// 4. GLOSSÁRIO DE INDICADORES
// ======================================================

function secaoIndicadores() {
  return `
    <div class="card">
      <h2>📊 Glossário de indicadores técnicos</h2>

      <h3>EMA (Média Móvel Exponencial)</h3>
      <p>
        Uma média do preço ao longo de X candles, que dá mais peso aos
        candles mais recentes (diferente da SMA - Média Móvel Simples,
        que pesa todos os candles igual). Usada pra identificar
        tendência: preço e EMAs curtas acima das EMAs longas = alta;
        abaixo = baixa. O RMI usa EMA9, EMA21, EMA50, EMA100 e EMA200.
      </p>

      <h3>RSI (Índice de Força Relativa)</h3>
      <p>
        Vai de 0 a 100, mede a velocidade e a magnitude das variações
        recentes de preço. Acima de 70 costuma indicar
        "sobrecomprado" (subiu rápido demais, risco de correção);
        abaixo de 30, "sobrevendido" (caiu rápido demais). O RMI usa
        RSI 55-70 como confirmação de força de alta, 30-45 como
        confirmação de força de baixa, e bloqueia entrada quando o RSI
        já está extremo demais na direção do sinal (acima de 73 pra
        compra, abaixo de 27 pra venda - ver "Veto de RSI extremo").
      </p>

      <h3>ADX (Índice Direcional Médio)</h3>
      <p>
        Vai de 0 a 100, mede a FORÇA de uma tendência, não a direção
        dela (não diz se é alta ou baixa, só o quão forte é o
        movimento, seja ele qual for). ADX baixo = mercado sem
        direção clara (lateral); ADX alto = tendência forte, seja de
        alta ou de baixa.
      </p>

      <h3>ATR (Amplitude Média Real)</h3>
      <p>
        Mede a volatilidade - o tamanho médio da oscilação de preço
        por candle, em valor absoluto (não em %). ATR baixo = mercado
        "parado" (candles pequenos); ATR alto = mercado agitado
        (candles grandes). O RMI usa ATR baixo como motivo pra apertar
        TP/SL automaticamente (MERCADO_LENTO).
      </p>

      <h3>Reward:Risk (RR)</h3>
      <p>Ver seção "Gestão de risco e dinheiro" acima.</p>

      <h3>Spread</h3>
      <p>
        A diferença entre o preço de compra (ask) e o de venda (bid)
        que a corretora oferece - é o custo embutido de operar, cobrado
        na abertura da posição. Quanto menor o spread, menos você
        "perde" só de entrar na operação. Não é modelado explicitamente
        no cálculo de resultado do RMI hoje (o preço de entrada/saída
        usado é o preço de mercado, sem simular o spread real da
        corretora).
      </p>
    </div>
  `;
}

// ======================================================
// 5. ESTRUTURA DE MERCADO
// ======================================================

function secaoEstruturaMercado() {
  return `
    <div class="card">
      <h2>🌍 Estrutura de mercado</h2>

      <h3>Sessões de mercado (horário de Brasília)</h3>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);"><th style="padding:6px; text-align:left;">Sessão</th><th style="padding:6px; text-align:left;">Horário</th><th style="padding:6px; text-align:left;">Características</th></tr>
        <tr><td style="padding:6px;">🌏 Ásia (Tóquio/Sydney)</td><td style="padding:6px;">21:00–04:00</td><td style="padding:6px;">Maior liquidez pra JPY, AUD, NZD</td></tr>
        <tr><td style="padding:6px;">🇬🇧 Londres</td><td style="padding:6px;">04:00–13:00</td><td style="padding:6px;">Maior volume do dia, forte pra EUR, GBP, CHF</td></tr>
        <tr><td style="padding:6px;">🇺🇸 Nova York</td><td style="padding:6px;">10:00–19:00</td><td style="padding:6px;">Forte pra USD, CAD</td></tr>
      </table>
      <p style="font-size:11px; color:#8c95b3;">
        O overlap Londres+NY (10h-13h) costuma ter a maior liquidez do
        dia pros pares com USD/EUR/GBP - é por isso que o horário
        padrão do app historicamente cobre essa faixa.
      </p>

      <h3>Pares e cruzamentos</h3>
      <p>
        Um par de moedas (ex: EUR/USD) mostra quanto vale 1 unidade da
        primeira moeda (base) em unidades da segunda (cotação). Pares
        onde uma das duas é o USD são os mais líquidos/diretos. Pares
        "cruzados" (nenhuma das duas é USD - ex: EUR/JPY, GBP/JPY,
        EUR/GBP) têm cálculo de valor de pip mais complexo, porque
        precisam de uma cotação cruzada extra contra o USD.
      </p>

      <h3>Candlestick (velas) - anatomia</h3>
      <p>
        Cada candle mostra 4 preços de um intervalo de tempo: abertura,
        fechamento, máxima e mínima. O "corpo" é a distância entre
        abertura e fechamento (verde/cheio = fechou acima da abertura,
        vermelho/vazio = fechou abaixo); os "pavios" (sombras) mostram
        o quanto o preço foi além do corpo antes de voltar.
      </p>

      <h3>Os 18 principais padrões de candlestick</h3>
      <p style="font-size:11px; color:#8c95b3;">
        Conteúdo clássico de análise técnica (existem uns 40 padrões
        catalogados ao todo - estes são os 18 mais usados no mercado,
        mesma lista de referência que corretoras como a XP ensinam) -
        não é algo que o RMI detecta ou usa hoje na decisão automática
        (o app usa EMA/RSI/ADX/ATR + SMC, ver seção "Como o RMI
        decide"), é conhecimento geral pra você reconhecer
        visualmente no gráfico da corretora.
      </p>

      <p><b>Padrões de reversão de ALTA (bom momento pra considerar compra):</b></p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);">
          <th style="padding:6px; text-align:left;">#</th>
          <th style="padding:6px; text-align:left;">Padrão</th>
          <th style="padding:6px; text-align:left;">Corpo / sombras</th>
          <th style="padding:6px; text-align:left;">O que sinaliza</th>
        </tr>
        <tr><td style="padding:6px;">1</td><td style="padding:6px;"><b>Martelo</b> (Hammer)</td><td style="padding:6px;">Corpo pequeno no topo; sombra inferior longa (~2x o corpo); sombra superior mínima/ausente</td><td style="padding:6px;">Vem de queda prolongada - mercado tentando corrigir pra cima</td></tr>
        <tr><td style="padding:6px;">2</td><td style="padding:6px;"><b>Martelo Invertido</b></td><td style="padding:6px;">Corpo pequeno na base; sombra superior longa (~2x o corpo); sombra inferior mínima/ausente</td><td style="padding:6px;">Compradores testando preços mais altos, ainda sem força total - início de transição pra alta</td></tr>
        <tr><td style="padding:6px;">3</td><td style="padding:6px;"><b>Harami de Fundo</b></td><td style="padding:6px;">3 candles: baixa de corpo médio, depois um pequeno já de alta, depois um grande de alta</td><td style="padding:6px;">Vendedores perdendo força aos poucos até a tendência virar pra cima</td></tr>
        <tr><td style="padding:6px;">4</td><td style="padding:6px;"><b>Engolfo de Alta</b></td><td style="padding:6px;">Candle de baixa pequeno seguido de um de alta bem maior, cujo corpo cobre o anterior inteiro</td><td style="padding:6px;">Mudança forte e repentina de força vendedora pra compradora</td></tr>
        <tr><td style="padding:6px;">5</td><td style="padding:6px;"><b>Piercing Line</b></td><td style="padding:6px;">Candle de baixa seguido de um de alta que fecha acima da metade do corpo anterior</td><td style="padding:6px;">Recuperação parcial forte o bastante pra indicar reversão de alta</td></tr>
        <tr><td style="padding:6px;">6</td><td style="padding:6px;"><b>Chute de Alta</b> (Kicker)</td><td style="padding:6px;">Dois candles médios/longos com um gap entre eles: fecha em baixa, abre já em alta</td><td style="padding:6px;">Um fato novo (ex.: notícia) muda o preço bruscamente - reversão forte pra cima</td></tr>
      </table>

      <p><b>Padrões de reversão de BAIXA (bom momento pra considerar venda):</b></p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);">
          <th style="padding:6px; text-align:left;">#</th>
          <th style="padding:6px; text-align:left;">Padrão</th>
          <th style="padding:6px; text-align:left;">Corpo / sombras</th>
          <th style="padding:6px; text-align:left;">O que sinaliza</th>
        </tr>
        <tr><td style="padding:6px;">7</td><td style="padding:6px;"><b>Engolfo de Baixa</b></td><td style="padding:6px;">Candle de alta pequeno seguido de um de baixa bem maior, cujo corpo cobre o anterior inteiro</td><td style="padding:6px;">Mudança forte e repentina de força compradora pra vendedora</td></tr>
        <tr><td style="padding:6px;">8</td><td style="padding:6px;"><b>Estrela Cadente</b> (Shooting Star)</td><td style="padding:6px;">Corpo pequeno na base; sombra superior longa; sombra inferior mínima/ausente</td><td style="padding:6px;">Vem de sequência de altas - mercado entrando em reversão de baixa</td></tr>
        <tr><td style="padding:6px;">9</td><td style="padding:6px;"><b>Nuvem Negra</b> (Dark Cloud Cover)</td><td style="padding:6px;">Candle de alta seguido de um de baixa que fecha abaixo da metade do corpo anterior</td><td style="padding:6px;">Sinal de reversão de baixa, mas fraco (variação pequena) - vale confirmar com outros fatores antes de vender</td></tr>
        <tr><td style="padding:6px;">10</td><td style="padding:6px;"><b>Enforcado</b> (Hanging Man)</td><td style="padding:6px;">Corpo pequeno; sombra inferior longa (~2x o corpo); sombra superior mínima/ausente - no TOPO de uma alta</td><td style="padding:6px;">Movimento vendedor perdeu força ao longo do candle - possível início de queda</td></tr>
        <tr><td style="padding:6px;">11</td><td style="padding:6px;"><b>Três Corvos Pretos</b></td><td style="padding:6px;">3 candles de baixa seguidos, cada um fechando abaixo da mínima anterior</td><td style="padding:6px;">Sequência de altas perdendo força - bom momento pra vender</td></tr>
        <tr><td style="padding:6px;">12</td><td style="padding:6px;"><b>Harami de Topo</b></td><td style="padding:6px;">3 candles: alta de corpo médio, depois um pequeno já de baixa, depois um grande de baixa</td><td style="padding:6px;">Compradores ficando indecisos até a tendência virar pra baixo (espelho do Harami de Fundo)</td></tr>
        <tr><td style="padding:6px;">13</td><td style="padding:6px;"><b>Chute de Baixa</b> (Kicker)</td><td style="padding:6px;">Dois candles médios/longos com um gap entre eles: fecha em alta, abre já em baixa</td><td style="padding:6px;">Um fato novo muda o preço bruscamente - reversão forte pra baixo</td></tr>
      </table>

      <p><b>Indecisão / dependem de outros fatores pra decidir:</b></p>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
        <tr style="background:rgba(255,255,255,.06);">
          <th style="padding:6px; text-align:left;">#</th>
          <th style="padding:6px; text-align:left;">Padrão</th>
          <th style="padding:6px; text-align:left;">Corpo / sombras</th>
          <th style="padding:6px; text-align:left;">O que sinaliza</th>
        </tr>
        <tr><td style="padding:6px;">14</td><td style="padding:6px;"><b>Doji</b></td><td style="padding:6px;">Sem corpo (abertura = fechamento, ou quase)</td><td style="padding:6px;">Equilíbrio total entre compradores e vendedores - pode antecipar mudança de tendência</td></tr>
        <tr><td style="padding:6px;">15</td><td style="padding:6px;"><b>Dia Longo</b></td><td style="padding:6px;">Dois candles seguidos com corpos grandes (não importa a cor)</td><td style="padding:6px;">Variação forte nos dois dias, mas sem indicar se a tendência continua ou reverte - exige mais contexto</td></tr>
        <tr><td style="padding:6px;">16</td><td style="padding:6px;"><b>Dia Curto</b></td><td style="padding:6px;">Dois candles seguidos com corpos pequenos (não importa a cor)</td><td style="padding:6px;">Indecisão e estabilidade - pode virar reversão ou continuação, exige mais contexto</td></tr>
        <tr><td style="padding:6px;">17</td><td style="padding:6px;"><b>Marubozu</b></td><td style="padding:6px;">Corpo médio/grande, sem sombra nenhuma (abriu na máxima/mínima e fechou na mínima/máxima)</td><td style="padding:6px;">Convicção forte de um lado só naquele candle, mas sozinho não define reversão nem continuidade</td></tr>
        <tr><td style="padding:6px;">18</td><td style="padding:6px;"><b>Pião</b> (Spinning Top)</td><td style="padding:6px;">Dois candles pequenos seguidos, pouca variação entre abertura e fechamento</td><td style="padding:6px;">Pouca convicção de ninguém - observe o mercado antes de decidir</td></tr>
      </table>

      <h3>Como analisar candlestick na prática</h3>
      <ol style="padding-left:20px; font-size:13px;">
        <li>Olhe o(s) candle(s) anterior(es) pra saber se está diante de
          uma possível reversão ou continuação da tendência.</li>
        <li>Cruze com outros indicadores (médias móveis, RSI, suporte e
          resistência) antes de decidir - um padrão isolado, sem
          contexto, vale bem menos.</li>
        <li>Dê mais peso quando o padrão aparece perto de um suporte/
          resistência real e é confirmado pelo candle seguinte.</li>
      </ol>
      <p style="font-size:11px; color:#8c95b3;">
        Regra rápida de cor: candle verde (fechamento acima da
        abertura) = viés de alta; vermelho (fechamento abaixo da
        abertura) = viés de baixa; variação muito pequena entre
        abertura e fechamento = mercado indeciso, melhor esperar.
      </p>

      <h3>Dicionário rápido</h3>
      <ul style="padding-left:20px; font-size:13px;">
        <li><b>Candle Gatilho</b> - o candle que confirma a reversão
          quando o preço rompe a extremidade dele a favor da análise.</li>
        <li><b>Rompimento de Candle</b> - quando o preço fecha acima da
          máxima ou abaixo da mínima de um candle de referência.</li>
        <li><b>Candles de reversão</b> - os padrões que indicam virada
          de tendência (Harami é um exemplo clássico).</li>
      </ul>

      <h3>Suporte e resistência</h3>
      <p>
        Suporte é um nível de preço onde, historicamente, a queda tende
        a parar (mais compradores que vendedores ali). Resistência é o
        oposto - onde a subida tende a parar. Quando o preço rompe um
        desses níveis com força, ele costuma "trocar de papel" (uma
        resistência rompida vira suporte, e vice-versa).
      </p>

      <h3>Pullback e Breakout</h3>
      <p>
        <b>Pullback</b> é um recuo temporário DENTRO de uma tendência
        maior (ex: tendência de alta, mas o preço cai um pouco antes de
        continuar subindo) - não é reversão, é respiro. <b>Breakout</b>
        é o rompimento de um nível importante (suporte/resistência) com
        força, geralmente sinalizando o início de um movimento novo.
      </p>

      <h3>Order Block (SMC)</h3>
      <p>Ver seção "SMC / Order Blocks" acima, na parte de como o RMI decide.</p>
    </div>
  `;
}

// ======================================================
// 6. PSICOLOGIA DO TRADER
// ======================================================

function secaoPsicologia() {
  return `
    <div class="card">
      <h2>🧘 Psicologia do trader</h2>
      <p>
        O próprio propósito da RMI é reduzir decisão emocional -
        seguir um critério consistente é mais difícil na prática do que
        parece:
      </p>
      <ul style="padding-left:20px; font-size:13px;">
        <li><b>Não aumente o lote depois de uma sequência de perdas</b>
          tentando "recuperar rápido" - é exatamente o comportamento
          que o circuit breaker diário existe pra impedir.</li>
        <li><b>Um sinal com aviso não é um sinal ruim automaticamente</b>
          - é um sinal onde o sistema quer que VOCÊ decida com
          informação extra, não que ele decidiu esconder o risco.</li>
        <li><b>Perfil Conservador gerando poucos sinais não é bug</b> -
          é ele fazendo o trabalho de ser seletivo. Compare a
          QUALIDADE dos sinais (taxa de acerto, expectativa), não só a
          quantidade.</li>
        <li><b>Fechamento manual existe pra registrar a realidade</b>,
          não pra "salvar" um resultado ruim - o objetivo é sempre o
          histórico bater com o que realmente aconteceu na corretora,
          mesmo quando o resultado real foi pior que o esperado.</li>
      </ul>
    </div>
  `;
}

// ======================================================
// 7. NOTIFICAÇÕES (conteúdo original, mantido)
// ======================================================

function secaoNotificacoes() {
  return `
    <div class="card">
      <h2>🔔 Notificações</h2>

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
