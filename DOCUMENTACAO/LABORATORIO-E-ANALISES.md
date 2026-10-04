# Laboratório e análises de desempenho — caderno de anotações

Criado em 03/10/2026. **Caderno de trabalho, não decisão**: junta o que foi discutido
com o usuário sobre analisar por que há dias bons e dias ruins, e sobre a aba
"Laboratório". Nada aqui foi implementado no sinal (congelamento do pipeline em vigor,
ver `ESTADO_ATUAL.md` seção 0). O usuário vai ler e decidir com calma ("isso precisa de
dedicação"). Como sempre: dados reais do banco, não documentação, são a prova.

## 1. Onde estamos (resumo para retomar a conversa)

- Acerto geral desde 17/09: **44%** (116/265) com alvo 1:1 e sem spread modelado.
  Para empatar seria preciso >50%. Resultado líquido do período ≈ -US$ 87 (ainda em
  valores do modelo de fechamento antigo, inflado em candle de notícia).
- **Dia bom e dia ruim têm a mesma cara**: quase todas as operações do dia do mesmo
  lado do dólar. O app faz na prática uma aposta direcional por dia. Dias de um lado
  só foram de 13% a 100% de acerto; dias com os dois lados ficam no meio (20-48%).
- A oscilação diária normal por acaso é de ±9 a 14 pontos (13-30 operações/dia). 59%
  (01/10) x 38% (02/10) cabe nisso — não é prova de que "a análise falhou no dia".
- Detalhe, números e hipóteses: `PENDENCIAS-ESTRATEGICAS-RMI.md`, seção "Dias bons x dias
  ruins". Ferramenta só-leitura: `ferramentas/diagnostico-dias-bons-ruins.js`
  (workflow `diagnostico-dias-bons-ruins.yml`, entradas `desde` e `somente_config`).
- Já corrigido nesta rodada (AJUSTE-065/066): 429 da TwelveData tenta outra chave; mercado
  fechado (sex 17h a dom 17h, Nova York) não é consultado e candles fora do horário são
  descartados; resultado gravado no preço do alvo (marcador `modeloFechamento:
  "ALVO_EXATO_V1"`). **Atenção ao medir**: operações sem esse campo usam o modelo antigo.

## 2. A ideia do Laboratório (usuário, 03/10/2026)

Pedido original: uma aba de teste onde o mercado seria analisado só com as condições que
estão funcionando melhor, "sem seguir lógica" — o que manda no sinal são as métricas com
maior acerto (ex.: score 40-44 em vez de ≥50; ADX só abaixo de 25...).

### O que eu (Claude) apontei, para discutir
- **Risco principal: mineração de dados / sobreajuste.** ~15 tabelas x 4-6 faixas sobre
  265 operações = dezenas de comparações; algumas "ótimas" são acaso. Exemplos: score
  40-44 52% x 45-49 41% x 35-39 46% não forma uma escada (ruído); SMC "tirou" 71% tem
  14 operações. ADX é mais crível (cai de forma contínua).
- Escolher as faixas olhando o passado garante bom resultado no passado; no futuro tende a
  voltar perto dos 44%. Fontes: White (2000), "A Reality Check for Data Snooping",
  *Econometrica* 68(5); Bailey, Borwein, López de Prado, Zhu (2014), "Pseudo-Mathematics and
  Financial Charlatanism", *Notices of the AMS* 61(5); Aronson (2006), *Evidence-Based
  Technical Analysis*, Wiley.
- **Amostra**: filtros combinados deixam poucas operações/dia. Para distinguir 55% de 44%
  com confiança são precisas ~300 operações POR GRUPO (meses). Corrigi minha fala anterior:
  100 operações só servem de triagem, não de confirmação.
- O mercado muda de regime (o período é de dólar forte); a faixa vencedora de hoje pode
  não ser a de amanhã.

### Proposta (a decidir): aba "Laboratório" = placar de filtros pré-registrados
- NÃO é um segundo motor de sinais. O motor atual aprova quase tudo com score ≥35, então um
  filtro "só as melhores condições" é um SUBCONJUNTO dos sinais que já saem: basta aplicar
  as regras às operações reais e comparar quem passou x quem não passou.
- Regras congeladas com data (as hipóteses H1-H6 em `PENDENCIAS-ESTRATEGICAS-RMI.md`).
- Duas colunas por regra: "dados que geraram a regra" (em cinza, não vale como prova) e
  "operações novas depois do registro" (só estas contam, com n e margem de erro).
- Só leitura, frontend: cabe no congelamento. Não contamina a base do RMI (não grava sinais).
- Decisão de adotar uma regra: só se a diferença se repetir nos dados novos, no mesmo
  sentido, e o usuário aprovar. Reavaliar o conjunto de regras em ciclos fixos (ex.: a cada
  100-150 operações), nunca no meio.
- Alternativas citadas e descartadas por ora: segundo motor paralelo gravando em
  coleção própria (precisaria de checker próprio e dobra a complexidade); abrir operações
  "só do laboratório" (sem ganho: o conjunto já é subconjunto).

## 3. Hipóteses pré-registradas (resumo; texto completo no arquivo de pendências)

H1 score ≥50 acerta menos que 35-49 · H2 ADX ≥30 acerta menos que <30 (e se deveria vetar) ·
H3 candlestick presente acerta menos que sem padrão · H4 vendido em dólar acerta menos que
comprado (se o dólar virar e não inverter, é viés do sistema) · H5 Balanceado acerta menos que
Agressivo · H6 tirar o desconto do SMC (sem respaldo; teste inviável por amostra, decide-se
por simplicidade).

## 4. Pontas soltas e perguntas abertas (para discutir)

1. **AUD/USD de 02/10 (LOSS -US$5,18, candle falso pós-fechamento)**: continua fechado no
   histórico. Eu me ofereci para reabrir (volta a ABERTA, desfaz o saldo, -1 LOSS); o
   usuário decidiu **não reescrever nada por enquanto**. Idem as 21 operações com >1,25x o
   alvo. Se um dia for reescrever: ferramenta com simulação (dry-run) primeiro.
2. Tolerância de 10 min no horário de mercado (AJUSTE-066): mantida; 5 min cobre só uma
   execução do cron. Só muda QUANDO o último candle da sexta é visto.
3. Validar no 1º fechamento real depois da reabertura (domingo ~21:00Z): resultado gravado
   no preço do alvo e nenhum fechamento por candle fora do mercado.
4. Atraso sinal -> entrada na corretora (EUR/JPY 30/09: 4 min 49 s, 8,5 pips piores): ver
   `BACKLOG-E-VISAO.md` seção 8. Em conta real pesa mais. Medir o atraso do próprio sinal
   (candle analisado -> gravação -> push).
5. Cota da TwelveData: o checker consulta todo par pendente a cada 5 min (6 pendentes x 288
   = ~1.700 créditos/dia). Parar no fim de semana ajuda; falta decidir sobre plano/consumo
   (`BACKLOG-E-VISAO.md` seção 9).
6. Spread não modelado: com 44% de acerto e alvo 1:1 o resultado líquido é pior que o bruto.
   Medir o resultado líquido de spread offline (permitido no congelamento).
7. Exposição por lado do dólar: um teto reduz a oscilação diária, mas NÃO melhora o valor
   esperado (item já na fila de `PENDENCIAS-ESTRATEGICAS-RMI.md`).
8. Modo Balanceado (31%) x Agressivo (47%): o filtro mais estrito não melhorou o acerto —
   indício de que o score não discrimina; o Balanceado só existe desde 28/09 (confunde com época).

### 4b. Onde a conta não fecha (levantado em 03/10/2026; NÃO investigado a fundo, só anotado)

1. **Lote mudou no meio da amostra — RESPONDIDO (03/10/2026).** Foi o usuário, de propósito:
   baixou de 0,04 para 0,02 na Config na noite de 01/10 (BRT) porque, operando de verdade,
   viu que dá mais margem entre altos e baixos do par com saldo baixo. Com TP/SL fixos em
   US$ 5, a distância em pips DOBROU (AUD/USD 12,5 -> 25 pips; USD/JPY ~19,7 -> ~39). Efeitos:
   (+) o spread pesa metade em proporção ao stop; (+) ruído curto derruba menos o stop;
   (-) as operações duram mais (mais tempo exposto, mais sobreposição entre pares, risco de
   fim de semana); (-) a amostra do congelamento passa a ter dois "experimentos" — analisar
   SEPARADO por lote/distância em pips (antes e depois de 01/10 à noite).
2. **"0 de 30 operações válidas" x histórico "RUIM".** Todas as operações recentes mostram o
   aviso de histórico insuficiente (0 de 30) mesmo em pares com dezenas de operações
   fechadas, e ao mesmo tempo `historico = RUIM`, `pesoHistorico = -8`, `confidenceMultiplier
   = 0,8` em todas. São duas contagens do mesmo histórico dando respostas diferentes; o
   componente de histórico virou uma constante (-8, x0,8) que desloca todos os scores igual.
3. **`expectativa = -5,00` gravada em todas as operações.** É o valor com taxa de acerto 0%
   (sem dado), não uma estimativa; o gate a ignora, mas o número salvo engana quem ler.
4. **Resultado inflado no passado.** 21 operações dos últimos 14 dias fecharam com >1,25x o
   alvo (modelo antigo, extremo do candle). Corrigido para frente (AJUSTE-066); o passado,
   o saldo simulado e a expectativa aprendida continuam com esses valores. Mais o AUD/USD
   falso de 02/10.
5. **Acerto x break-even.** 44% de acerto com alvo 1:1 e sem spread dá resultado negativo
   por construção (≈ -US$87 no período, ainda em valores antigos).
6. **Score x acerto.** Score ≥50 acerta menos (36%) que 40-44 (52%); Balanceado (critério
   mais estrito) acerta menos (31%) que Agressivo (47%). Um filtro mais estrito deveria
   melhorar, não piorar — o score não está discriminando (AUC já medido <0,5 no AJUSTE-037).
7. **ADX ≥30 ainda sai.** Pontua 0 desde o AJUSTE-037 mas não veta: ~100 operações com 37%
   de acerto foram liberadas nessa faixa.
8. **Cota da TwelveData.** Só o checker usa ~1.700 créditos/dia (6 pendentes x 288 ciclos);
   três chaves de 800/dia = 2.400, e o scanner também consome. O consumo total nunca foi
   contado.
9. **Dispersão dos dias.** Os resultados do mesmo dia andam juntos (1,77x o esperado por
   acaso) — coerente com "uma aposta direcional por dia", mas com só 11 dias.

## 5. Próximas análises possíveis (em paralelo, só leitura)

- Repetir `diagnostico-dias-bons-ruins` a cada ~2 semanas, só com operações novas.
- Acerto por dia COM o lado do dólar (já sai na tabela por dia) e relação com o movimento
  real do dólar no dia (precisaria de candles; poucas chamadas à TwelveData).
- Resultado líquido de spread por par.
- Medir quanto dos sinais do dia nasce na mesma janela de tempo (rajada) e o acerto dela.
- Pedir ao usuário: ao decidir o Laboratório, escolher o formato (tabela simples x gráfico
  de acerto acumulado por regra) e as regras que quer acompanhar.

Cada item acima só vira trabalho quando o usuário confirmar.

## 6. Material de estudo recebido (03/10/2026) — leitura crítica

### 6.1 Documento do amigo: "IA, machine learning e trading algorítmico" (21 p., set/2026)
O que é: metodologia de pesquisa quantitativa para CRIPTO (BTC/ETH/SOL, Binance/Bybit,
spot/perp), com dados de livro de ofertas (L2), horizontes de segundos a minutos. O próprio
documento avisa que foi produzido numa conversa e que as referências não foram reverificadas
na edição (as principais existem: White 2000; Hansen 2005; Bailey & López de Prado 2014 DSR;
Bailey et al. PBO; Zhang, Zohren & Roberts, DeepLOB).
NÃO se aplica a nós (falta o dado ou a infraestrutura): livro de ofertas/microestrutura
(OBI, OFI, microprice, filas), Hawkes, cross-venue/basis, DeepLOB, market making, RL,
latência de milissegundos. Forex de varejo via XM/TwelveData não tem L2 consolidado; nosso
dado é OHLC de 5 min com cron que atrasa minutos.
SE APLICA (e confirma o caminho que já tomamos):
  a) Métrica principal = expectativa LÍQUIDA: P(win)·ganho − P(loss)·perda − custos.
     Acerto/score são auxiliares. Com 44% e alvo 1:1 já é negativa antes do spread.
  b) "NO TRADE" é resposta de primeira classe. A nossa cascata faz o oposto: se o
     Conservador reprova, procura um modo que aprove.
  c) Alvo "P(TP antes do SL)" — é EXATAMENTE o que o nosso histórico registra (WIN/LOSS).
     Dá pra treinar um modelo simples (regressão logística regularizada) sobre as
     características da hora do sinal, com validação walk-forward, contra um baseline
     ingênuo. É a versão com método da ideia do Laboratório.
  d) Barreiras em unidades de VOLATILIDADE (k·σ + custo), não em US$ fixo. O nosso TP/SL em
     US$ faz a distância em pips depender do lote (ver 4b.1) e não do mercado.
  e) Baseline ingênuo obrigatório: um modelo só ganha crédito se bater o trivial.
  f) Custo como variável, com estresse 1,25x/1,5x/2x; estratégia que some com custo um pouco
     maior é frágil.
  g) Validação: walk-forward, holdout congelado (= hipóteses pré-registradas), correção
     por múltiplos testes (DSR, PBO, Reality Check), regimes e "concept drift".
  h) Medir o "alpha decay": quanto o sinal perde se a entrada atrasa 5/10/15 min (temos atraso
     de cron + push + humano; EUR/JPY 30/09 entrou 4 min 49 s depois, 8,5 pips pior).
  i) Paper congelado -> shadow -> tiny live, com critérios de rejeição ("kill") escritos ANTES.
  j) LLM fora do loop de execução: pesquisador/engenheiro/revisor, não quem dá BUY/SELL.

### 6.2 Ebook "Forex do Zero" (Lau Américo, 11 p.) — curso introdutório de varejo
Úteis: risco/retorno mínimo 1:2 ("errando metade ainda fica positivo"), arriscar 1-2% por
operação (hoje: US$5 de ~US$600 = ~0,8%), stop definido antes, entrada a favor da tendência
no recuo, não afastar stop, sem revanche, ficar de fora também é decisão, parcial/stop no
zero a zero no meio do caminho. Cautelas: "calcule quanto quer fazer no mês e divida em dias"
(meta diária estimula excesso de operações); "não indico conta demo" e o funil de conta/lives
são parte do modelo comercial do material. Mudar para 1:2 NÃO é grátis: alvo maior é tocado
menos vezes — precisa ser medido (experimento E2).

### 6.3 Ebook XP "Análise Técnica" (59 p.) — manual clássico
Úteis/hipóteses: ADX usado pra dizer SE há tendência e se ela está crescente/decrescente
(nós usamos só o nível, não a inclinação; dado nosso: ADX alto acerta menos); candlestick
exige confirmação e localização (topo/fundo após tendência definida) — a nossa detecção dá
pontos sem esse contexto, coerente com H3; olhar periodicidade maior quando há conflito
(temos 5m/15m, não H1/H4). Não se aplica: volume/OBV (forex à vista não tem volume
centralizado). Cautela: "padrões do passado sempre se repetem" e "garantia de melhor
desempenho" não têm respaldo; a evidência acadêmica em câmbio é de regras técnicas simples
que já deram lucro e perderam força com o tempo (Neely, Weller & Ulrich 2009, JFQA; Menkhoff &
Taylor 2007, Journal of Economic Literature). Não acrescentar indicadores novos (Didi, Trix,
Bollinger...) sem teste: é mais mineração de dados.

### 6.4 Experimentos propostos (todos SÓ LEITURA/offline, cabem no congelamento; nada iniciado)
  E1 Baseline aleatório: entradas sorteadas nos mesmos pares/horários com o mesmo TP/SL.
     Pergunta: o score bate o acaso? (se 44% < acaso, a análise atrapalha).
  E2 Barreiras alternativas nas MESMAS entradas já registradas: 1:1, 1:1,5, 1:2, TP/SL em
     múltiplos de ATR, stop no zero a zero na metade do caminho. Mede acerto E expectativa.
  E3 Alpha decay: o mesmo sinal entrando 5/10/15 min depois.
  E4 Modelo P(TP antes do SL): regressão logística regularizada, walk-forward, contra
     baseline ingênuo; só como medição, nunca no sinal sem decisão.
  E5 Spread por par (valores da XM informados pelo usuário) + estresse 1,25x/1,5x/2x.
  Custo de dados: E1-E3/E5 usam candles de 5 min por par (~1 consulta por par cobre ~17 dias),
  dentro da cota.
  Também a escrever com o usuário ANTES de conta real: critérios de promoção e de rejeição
  (ex.: expectativa líquida > 0 com N operações, resiste a custo 1,5x, paper ≈ real).

### 6.5 Spreads da XM (informados pelo usuário em 03/10/2026, fonte: Gemini — NÃO conferidos)
Conta Standard/Micro (sem comissão): EUR/USD 1,6-2,0 · GBP/USD 2,0-2,3 · USD/JPY 1,8-2,1 ·
AUD/USD 1,9-2,2 · USD/CAD 2,0-2,4 · USD/CHF 2,1-2,5 · EUR/GBP 2,2-2,7 · GBP/JPY 2,8-3,5 pips.
Ultra Low: ~0,6-1,3 nos majors. Zero: ~0-0,2 + US$7/lote ida e volta (~0,7 pip). Spreads
flutuam e abrem em notícia e na virada de sessão. RESPONDIDO (03/10/2026): a conta do usuário é STANDARD (usar a coluna Standard; falta
conferir os valores no próprio app da XM).
Break-even aproximado com custo s (pips) por operação: acerto mínimo ≈ (SL + s) / (TP + SL).
Ex.: lote 0,02, TP=SL=25 pips, s=1,8 -> ~53,6%; lote 0,04 (12,5 pips) -> ~57%; TP 50/SL 25 -> ~36%.
Hoje: 44%.

### 6.6 Alavancagem 1000:1 x "1:1" do app (pergunta do usuário, 03/10/2026)
São coisas diferentes. O "1:1" do app é risco:retorno (TP do mesmo tamanho do SL). A
alavancagem só muda a MARGEM travada: com 0,02 lote de EUR/USD (~US$ 2.250 de posição), 1000:1
trava ~US$ 2,25 e 30:1 travaria ~US$ 75. O ganho/perda por pip é o mesmo (0,02 lote = ~US$
0,20/pip) e o risco por operação é o do SL (US$ 5). Nada muda na entrada do sinal. Perigo:
alavancagem alta permite abrir posições grandes ou muitas ao mesmo tempo com pouca margem
(várias operações do mesmo lado do dólar somam risco).

### 6.7 Laboratório em tempo real — desenho proposto (03/10/2026; usuário vai ler e discutir antes de começar)
Achado: a coleção `analises` (AJUSTE-032, desde 26/09) já grava TODA análise do scanner,
aprovada ou reprovada, com preço, tendência (direção), score e componentes, indicadores, TP/SL e
um campo reservado `rotuloHipotetico` que nunca foi preenchido. Ou seja, o laboratório já foi
planejado e metade da infraestrutura existe — sem mexer no scanner nem no sinal oficial.
  1. Rotulador (GitHub Action periódica, só com mercado aberto): pega análises ainda sem rótulo,
     busca 5 min por PAR (uma consulta cobre muitas análises) e calcula, para cada análise, se
     teria batido TP ou SL primeiro em várias variantes: alvo atual, 1:2, múltiplos de ATR,
     zero a zero na metade, entrada +5/+10 min, com spread descontado. Grava o rótulo.
  2. Regras do laboratório pré-registradas com data (H1-H6, "só ADX<25", oficial...). Como
     usam todas as análises, uma regra pode "aprovar" o que o oficial reprovou.
  3. Uma posição virtual por par por vez (análises do mesmo par a cada 5 min são quase a
     mesma operação; sem isso a amostra fica inflada e a confiança falsa).
  4. Aba "Laboratório": lê só documentos-resumo (nunca varre `analises`, que cresce ~1.500-2.000
     por dia — a cota grátis do Firestore já estourou uma vez): por regra, n, acerto,
     expectativa líquida de spread, margem de erro, só operações depois do registro, lado a
     lado com o oficial.
  5. Fora do sinal: não grava em `historico`, não manda push, não entra no aprendizado.
     Custo: ~1 consulta TwelveData por par por execução.
  "Tempo real" = o rótulo sai quando o alvo é tocado (horas), com atraso de até 1 execução.

### 6.8 Decisões do usuário (03/10/2026) e o que já foi construído
Decidido: (1) Laboratório em projeto Firebase SEPARADO (gratuito); (2) começar por E1 + E2;
(3) candle de 5 min que toca TP e SL = PERDA ("melhor errar do que um falso dado"); (4) spread:
usar a tabela do Gemini por enquanto, usuário confere na XM depois; (5) TwelveData: usar a
KEY_3 (a menos usada, não medido); ao primeiro 429, usuário cria a 4ª; (6) não medir consumo
antes: "só na segunda gera valor real; se a cota não der, vemos na hora"; (7) o motor oficial
segue gerando até a meta com lote 0,02; testes e implementações novas vão para o Laboratório;
(8) uma posição por par: cooldown de 30 min E bloqueio enquanto a anterior estiver aberta
(isto JÁ é a regra do oficial, `riskManager.existeCooldown` - o Laboratório copia igual para
ser comparável).
Posição sem limite de tempo (igual ao oficial: fica ABERTA, inclusive sobre o fim de semana);
o Laboratório registra a DURAÇÃO de cada operação.
Critério de confiança (usuário): acerto importa para o produto ("ninguém investe num app que
erra muito, mesmo lucrando"). Registrar SEMPRE acerto E expectativa líquida; promoção exige os
dois (acerto mínimo a definir + expectativa > 0). Cuidado: acerto alto é fácil de fabricar
com TP curto e SL largo (variante TP_CURTO existe para mostrar isso: com TP 12,5/SL 25 e
spread 1,8 o acerto mínimo sobe para ~71%).
Ideia nova (usuário): "reanalisar" a posição aberta e avisar o melhor momento de sair. NÃO entra
no oficial agora (congelamento; e criaria um 3º tipo de desfecho no histórico do RMI, fora de
TP/SL, contaminando a base). Entra como VARIANTE `REANALISE` do Laboratório: sai quando uma
análise posterior do mesmo par vem com tendência contrária (usa só a coleção `analises`, sem
chamada extra de API). Só vira recurso do app se bater "segurar até TP/SL" nos dados novos.
Construído (offline, testado, nada ligado ao scanner): `lab/simulador.js` (função pura:
TP/SL com spread nas barreiras, ambiguidade=perda, atraso de entrada, break-even, limite de
tempo, reanálise), `lab/spreads.js` (NZD/USD e EUR/JPY ESTIMADOS por mim - conferir),
`lab/simulador.test.js` (17 testes). Falta: rotulador (lê `analises` do projeto oficial, busca
candles com KEY_3, grava no projeto lab), projeto Firebase lab + Secrets, tabela/aba.
PENDENTE de confirmação: "10 operações" x as 100 do congelamento (ESTADO_ATUAL seção 0).

### 6.9 Primeira execução real do rotulador (04/10/2026 00:45Z) - ponto de partida
Projeto `forex-assist-lab` criado pelo usuário; Secret `FIREBASE_SERVICE_ACCOUNT_LAB` ok.
`controle/rotulador.registradoEm` = 2026-10-04T00:42:32Z: tudo antes disso é época `pre`
(48 h de `analises`, ~282 análises; NÃO é prova, só "dados que geraram a regra"); `pos` conta daqui.
Bug achado e corrigido na 1ª gravação real: Firestore recusa array aninhado (o falso em memória
não recusava; agora recusa). Workflow SÓ MANUAL por enquanto; cron hourly comentado.
Resultado `pre` (n pequeno, UM dia ruim: 03/10 e sexta; acerto ATUAL 31-36%, expectativa
negativa em TODAS as variantes; RR_1_2 e ATR_3X pior ainda): leitura honesta = quando a direção
está errada, nenhuma saída salva; não dá para concluir nada com n=12-18.
Pontas abertas descobertas:
 1. VALIDAÇÃO PENDENTE: a variante ATUAL das entradas OFICIAL precisa coincidir com o
    resultado real em `historico` dos mesmos sinais. Sem esse cruzamento o rotulador não está
    validado (usuário já viu o app errar fechamento antes - AJUSTE-066).
 2. `analises` NÃO é "toda análise": só 7 dos 10 pares apareceram em 48 h (USD/CAD, GBP/JPY e
    EUR/GBP: nenhuma), GBP/USD 3 e NZD/USD 1. Há portões ANTES do registro (cooldown em
    `pairAnalyzer.js`, sessões em `scanner.js`); causa dos pares ausentes NÃO verificada.
    O Laboratório herda esse viés de seleção.
 3. ATR_3X com 11% de acerto parece baixo demais para barreira simétrica: conferir a unidade
    de `indicadores.atr` por par (ferramenta `diagnostico-atr-pips.js`) antes de confiar.
 4. TP/SL em pips por análise não vêm fixos (variam por par/ATR): `ATUAL` usa o da análise.

### 6.10 Validação do rotulador contra o `historico` real (04/10/2026 00:55Z) - ponta 1 resolvida
`lab/validar.js` (só leitura; workflow `lab-validar.yml`). 19 entradas OFICIAL do lab (02/10),
15 casadas com operação real encerrada. Variante ATUAL sem spread: **14 de 15 iguais** ao
resultado real (WIN/LOSS). A única divergência é AUD/USD 02/10 13:10: real LOSS às 21:05Z
(o candle fora do mercado do AJUSTE-066) x lab ABERTA - o simulador está certo e o oficial
daquele dia estava errado. Horários de fechamento batem com 5 min de diferença (o checker
grava a hora em que DETECTA). O spread muda QUANDO fecha (ex.: USD/CHF 07:10: WIN às 08:05 sem
spread, às 11:55 com spread), não o WIN/LOSS nesta amostra. Limite: n=15, um dia; valida a
variante ATUAL, não as outras (BE, 1:2, atraso, reanálise).
Achado novo: 4 de 19 aprovações na análise NÃO viraram operação real (GBP/USD 12:45, NZD/USD
13:01, USD/CHF 20:00, EUR/USD 21:20): causa NÃO verificada (hipóteses: portão de risco/limite
diário depois da análise, ou diferença de preço no casamento). Se for portão, o oficial aprova
na análise mas não salva - conferir antes de comparar contagens oficial x lab.
Cron do rotulador LIGADO (de hora em hora, minuto 17).

### 6.11 Pontas abertas de 6.9 resolvidas (04/10/2026) - verificado nos logs reais do scanner
 - As "4 aprovações sem operação real" NÃO eram operações perdidas: eram operações ainda ABERTAS
   (o validador só olhava WIN/LOSS). Log do scanner de 02/10 12:45Z (GBP/USD) e 13:00Z
   (NZD/USD): "Status SALVO" + "OPERAÇÃO". Validador corrigido: 19 de 19 casadas, 18 iguais.
 - Pares ausentes em `analises`: o scanner roda só os pares de `configuracao.pares` (8 pares: EUR/USD,
   GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD, EUR/JPY) - GBP/JPY e EUR/GBP não estão
   configurados. Há ainda janelas por sessão (`parNaJanelaOperacional`: "fora da janela") e,
   MAIS IMPORTANTE, o COOLDOWN: par com operação aberta ou aberta há <30 min NÃO é analisado
   nem gravado em `analises`. Ou seja, `analises` só tem análises de pares LIVRES (sem posição);
   por isso GBP/USD, NZD/USD e USD/CAD aparecem pouco (ficam dias com operação aberta).
   Consequência: o universo LAB já é "análises quando o oficial estava livre", não "mercado
   inteiro" - declarar isso em qualquer conclusão do Laboratório.
 - Unidade do ATR: correta (pips = atr x 100 JPY / x 10000). ATR de 5 min: AUD/USD ~2,5,
   EUR/USD ~4,6, USD/JPY ~7, USD/CHF ~6, EUR/JPY ~15 pips. O TP real do sistema NÃO é 25 fixo:
   20-40 pips conforme o par (US$ 5-7,5 convertido). TP/ATR mediano ~5,5x. ATR_3X é barreira
   curta (não comparável ao alvo real); acrescentada a variante ATR_6X (só entradas novas).
 - Observação do mesmo log: perfil configurado Conservador; quase todo sinal sai por cascata
   como Balanceado (Conservador reprova por score <55); histórico "RUIM" (-8) e expectativa
   -5,00 constantes (já anotados em 4b).

### 6.12 Sinal invertido, prioridade por aprovação e controle de múltiplas comparações (04/10/2026)
Pergunta do usuário: não seria o caso de testar sinais invertidos e dar prioridade às análises que
"mais aprovam"? Resposta registrada (a discutir; nada mudou no sinal oficial):
 - INVERSO (mesma entrada, mesmo TP/SL em pips, lado oposto) foi acrescentado ao Laboratório junto de
   ATUAL_SPREAD_1_5X e ATUAL_SPREAD_2X (só para entradas novas a partir de 04/10). Atenção: com TP = SL
   o inverso é o ESPELHO do direto (o que o direto ganha, o inverso perde; soma dos pips = 0 antes do
   spread). Não é um segundo experimento: é a mesma medida lida ao contrário. Só traz informação
   nova nas entradas com TP != SL (ex.: 7,5/5 US$) e cruzado com os grupos (score, ADX...).
 - Conta que importa: com TP = SL = 25 pips e spread 1,8, o ponto de equilíbrio do direto é ~53,6%;
   logo o INVERSO só dá lucro se o direto acertar MENOS que ~46,4%. Medido até aqui: 44% em ~265
   operações (erro-padrão ~3 pontos; intervalo de 95% ~38% a 50%). Isso INCLUI 46,4% e 50%: não dá para
   afirmar nem que o sistema perde para o acaso. Inverter por ter perdido na amostra é o desvio clássico
   de sobreajuste (Bailey et al., 2014); só vale com hipótese de mecanismo (ex.: entrada por
   tendência/alinhamento de EMAs em 5 min num mercado que reverte) e dados novos.
 - Prioridade "por quem mais aprova": frequência de aprovação NÃO é qualidade. O perfil que mais aprova
   (Balanceado, via cascata) é o de menor acerto medido (31% x 47% Agressivo, n pequeno). Ranquear sinais
   simultâneos por score também não tem respaldo hoje (score >=50: 36% x 40-44: 52%, n pequeno).
   Critério correto = expectativa por grupo com n >= 100 (as hipóteses H1-H5). Experimento de
   priorização/um-sinal-por-lado-do-dólar fica para quando houver amostra (ver 4b e PENDENCIAS).
PRÉ-REGISTRO (04/10/2026, antes de olhar números da época `pos`): para não inflar falso positivo com
~12 variantes x ~8 grupos x 2 tipos x 2 épocas (centenas de comparações), só estes são ENDPOINTS
PRIMÁRIOS: (P1) expectativa líquida em pips/op da saída ATUAL, OFICIAL, época pos; (P2) idem do
INVERSO; (P3) H1-H5 no OFICIAL, época pos. Todo o resto é EXPLORATÓRIO (vale para gerar hipótese,
não para decidir). Evidência mínima para propor qualquer mudança: >= 300 casos fechados na época `pos`
no grupo E estatística t >= 3 da expectativa (Harvey, Liu e Zhu, 2016, sugerem t > 3 contra
comparações múltiplas) E aprovação do usuário. Antes disso: só triagem.
Dúvidas levantadas x onde estão: E2 saídas alternativas = pronto; E3 atraso = pronto; spread 1,25-2x =
pronto (1,5x e 2x); E1 baseline aleatório = o direto e o inverso juntos o cobrem (média dos dois =
acaso com custo) para TP = SL; H1-H5 = prontos, esperando amostra; score invertido/ADX veto = H1/H2;
H6 SMC = inviável por amostra; lote antes/depois de 01/10 = separar na leitura; RSI sem veto, teto de
exposição por lado do dólar = precisam de fluxo próprio no Laboratório (próximo passo).

### 6.13 Olhar para trás com simulação exata (04/10/2026, ~8 dias de `analises`; EM AMOSTRA = exploratório)
Reprocessamento (`lab-reprocessar.yml`): 157 sinais aprovados (OFICIAL) e ~200 análises (LAB) de 26/09 a
04/10, candles reais de 5 min, spread da tabela Standard, TP/SL em pips de cada análise. Tudo época `pre`.
Pergunta do usuário: 226 WIN x 338 LOSS no histórico; "invertendo, os 338 viram win e dá lucro".
Resultado medido (OFICIAL, n~151-157): direto 35,1% (-3,65 pips/op); INVERSO 42,4% (-1,15); SORTEADO
(cara ou coroa) 39,7% (-1,69); spread 2x: 28,9% (-5,29). NENHUMA saída é lucrativa; o inverso NÃO dá
64,9% (=1-35,1%) e continua negativo. Por quê: o espelho (perda de um = ganho do outro) só vale se o
caminho do preço resolvesse sempre para um dos lados; na prática, em ~20% dos casos o preço bate o stop
e VOLTA a bater o outro lado (ida e volta): perde nos dois sentidos. Diagnóstico `lab-diagnostico.yml`
(135 sinais com TP = SL; 22 com TP = 1,5 x SL): nos simétricos, direto 36,2% + inverso 43,4% = 79,6%
(deveria ser ~92% sem ida e volta e 100% sem custo). O baseline sorteado (39,7%) ficou perto do esperado
para um passeio aleatório com custo (~46%), um pouco abaixo; direto (35,1%) ficou ~4,6 pontos abaixo do
sorteado, DENTRO da margem (+-7,6 pontos): não se distingue do acaso.
Recortes (exploratórios, n pequeno, ~20 recortes - parte sai boa/ruim só por acaso): inverso fica
levemente positivo em score >=50 (n=18), com candlestick (n=36), vendido em dólar (n=42), Balanceado (n=47),
sobreposição Londres+NY (n=35); direto fica positivo só em sessão Londres (n=37, +1,5) e NY (n=12).
NENHUM passa o critério pré-registrado (>=300 casos, t>=3). Teto de exposição (1 por lado do dólar):
n=66, direto 25,8% (-6,10 pips/op) - pior que sem teto, ou seja, os sinais "extras" do mesmo lado
foram melhores que o primeiro (ruído de amostra; o teto reduz exposição, não melhora expectativa).
Contas que ajudam: o WIN/LOSS do app NÃO desconta spread. A variante ATUAL_SEM_SPREAD ("como o app mede")
deu 43,0% (OFICIAL, n=151; margem +-7,9) - coerente com os 44% reais do app em ~265 operações; com o spread
da tabela Standard o MESMO sinal cai para 35,1%: o custo da corretora tira ~8 pontos de acerto e ~2 pips por
operação (de -1,61 para -3,65 pips/op). Ou seja: o acerto que o app mostra superestima o que a XM entregaria.
Mesmo sem spread o sinal fica em -1,61 pips/op (43% < 50% com alvo = stop), mas 43% +-7,9 inclui 50%.
TP_CURTO: acerto 50% mas -3,23 pips/op (acerto alto não é lucro).

### 6.14 "E se o alvo/stop fossem maiores? E o custo menor?" (04/10/2026, mesmas 8 dias, exploratório)
OFICIAL (n~151; "+N abertos" = casos ainda sem desfecho, viés de sobrevivência nas barreiras grandes):
 sem spread (como o app mede) 43,0% / -1,61 pips/op | metade do spread 38,4% / -2,59 | spread da tabela 35,1% /
 -3,65 | alvo e stop 2x: 42,0% / -5,38 (14 abertos, duração média 8 h) | 3x: 42,9% / -9,10 (31 abertos, 17 h).
Leitura: com direção sem vantagem, aumentar a barreira NÃO ajuda em pips: o resultado bruto negativo
(-1,61 pips/op = -0,064 R por operação; acerto 43% em vez de 50%) cresce junto com a barreira. Em R
(risco) o custo relativo cai (-0,146 R -> -0,108 R no 2x), mas continua negativo. Para ficar positivo
precisa de VANTAGEM BRUTA (acerto >= ~53,6% com alvo = stop e spread 1,8), não só de custo menor: nem
com metade do spread fecha. Quem diz se existe vantagem é a direção do sinal, e com ~150 casos o acerto
bruto de 43% tem margem +-7,9 (inclui 50%). Por par (n=11 a 35, só olhar): EUR/USD 45,7% e USD/CAD 45,5%
são os melhores; EUR/JPY 18,2% e GBP/USD 28,6% os piores; com 8 pares algum sempre parece bom por acaso.
Próximo passo proposto (aguardando OK do usuário): REPLAY HISTÓRICO do pipeline real sobre candles de
5/15 min de ~100 dias (TwelveData, `end_date`, ~66 créditos uma vez; profundidade do plano grátis A TESTAR)
para obter milhares de sinais virtuais em vez de ~150, com separação temporal (explorar nos primeiros
~70 dias, validar nos últimos ~30) e hipóteses pré-registradas antes. Só leitura; nada do oficial.

### 6.15 Replay histórico do pipeline real - PROTOCOLO PRÉ-REGISTRADO (04/10/2026, antes de ver qualquer resultado)
Teste de profundidade (TwelveData, KEY_3): o plano entrega >= 90 dias de candles de 5 min (6 páginas de 5000, até
22/06) com 1 crédito por página. O replay roda o MESMO `analisarPar` do scanner (código atual) sobre candles de
~180 dias de 8 pares, barra a barra com relógio simulado (avalia a cada 15 min; ~2 ms por barra), com cooldown de
30 min + posição aberta bloqueando o par (como o oficial, fechamento "como o app mede"). NÃO reproduz: janelas de
sessão do scanner (recortes por sessão são feitos depois), limite diário/disjuntor, histórico estatístico do par
(fica SEM_DADOS, como nos logs de produção), atraso real da TwelveData. Candles de fim de semana/fora do horário
saem (mesma regra do checker). Código: `lab/replay.js`, `lab/replay-run.js`, workflow `lab-replay.yml` (modos
baixar/replay/ambos: os candles ficam guardados no projeto LAB, repetir o replay custa 0 crédito).
Divisão temporal: 70% iniciais = EXPLORAÇÃO (época `pre`), 30% finais = VALIDAÇÃO (época `pos`). Regras:
 1. Primeiro só se olha a EXPLORAÇÃO. Hipóteses candidatas saem dela e são escritas AQUI (data/hora e texto)
    antes de abrir a validação. No máximo 3 recortes candidatos, escolhidos só por: n >= 150 na exploração e maior
    expectativa líquida (pips/op, com spread) entre os recortes com n >= 150; mecanismo explicável por escrito.
 2. A validação é aberta UMA vez para os candidatos escritos. Cada olhada extra queima o dado de validação.
 3. Perguntas centrais (sem escolher recorte): Q1 o sinal tem vantagem BRUTA? (acerto sem spread vs 50% e vs o
    baseline ALEATORIO, n >= 300); Q2 a expectativa líquida (spread da tabela) é > 0? Responder em `pos`.
 4. Critérios: "propor mudança" = t >= 3 na validação, n >= 300 casos fechados no grupo, mesmo sinal da exploração,
    e aprovação do usuário. "Vale testar ao vivo" = t >= 2 e mesmo sinal. Abaixo disso: descartar, não "ajustar".
 5. Ressalva permanente: o replay não é o ao vivo (lista acima). Qualquer candidato precisa passar também na
    época `pos` do Laboratório AO VIVO (dados novos, mercado real) antes de virar mudança no oficial.

### 6.16 Replay: resultado da EXPLORAÇÃO e candidatos REGISTRADOS antes de abrir a validação (04/10/2026, 05:46 UTC, commit b59749d)
Replay: 10 pares, 07/04 a 02/10 de 2026 (~179 dias), 38.016 barras avaliadas, 1.231 sinais aprovados (OFICIAL), 3.013
entradas rotuladas. Exploração = 07/04 a 10/08 (OFICIAL n=827); validação = 10/08 a 02/10 (NÃO foi olhada até este registro;
o carregamento descarta a época `pos`).
FIDELIDADE: o replay reproduz o ao vivo - acerto sem spread 43,4% (n=827, +-3,4) contra 43,0% das últimas 8 dias reais e 44%
do histórico real. Isso valida o replay como ferramenta (não valida nenhuma estratégia).
EXPLORAÇÃO, OFICIAL (pips/op, t da expectativa): sinal direto com spread -5,55 (t=-4,70); sem spread -3,19 (t=-2,68);
sorteado -2,00 (t=-1,67); INVERSO +0,15 (t=+0,13). Ou seja: com a configuração e o código de hoje, o sinal direto PERDE de
forma estatisticamente clara na exploração (inclusive antes do spread), e o inverso fica no zero a zero depois do spread:
não é lucro. (Antes de qualquer recorte.)
RECORTES (n >= 150, melhor expectativa líquida): INVERSO em "vendido em dólar" n=281, 56,6% de acerto, +4,63 pips/op, t=+2,71
(direto neste recorte: 32,4%, -8,78, t=-5,38); INVERSO em 12-21 UTC (sobreposição + NY) n=384, 53,6%, +3,32, t=+1,88.
Os demais recortes com n >= 150 ficam entre -4 e +0,5 no inverso. Atenção ao viés de seleção: estes foram escolhidos por
serem os MELHORES de ~20; o t=+2,71 está inflado por isso (esperar encolher na validação).
CANDIDATOS REGISTRADOS (valem para a validação, que será aberta UMA vez):
 C1 "Inverso quando o sinal do app é VENDIDO em dólar" (isto é, comprar dólar onde o app vende). Mecanismo proposto: o sinal
    de tendência de curto prazo fica atrasado e é revertido; ATENÇÃO, é também uma aposta direcional no dólar - pode ser só a
    deriva do dólar no período. Controle: comparar com a deriva do dólar (comprado por buy-and-hold) em cada época.
 C2 "Inverso entre 12h e 21h UTC (sobreposição Londres+NY e NY)". Mecanismo proposto: no fim do dia de NY a liquidez cai e a
    entrada por alinhamento de EMAs é revertida.
 PERGUNTAS CENTRAIS (sem escolher recorte), na validação: Q1 o direto tem vantagem bruta? (acerto sem spread vs 50% e vs
 sorteado); Q2 a expectativa líquida do direto é > 0? Resposta esperada pela exploração: não.
SUCESSO: C1/C2 "vale testar ao vivo" = na validação mesmo sinal (inverso > 0), t >= 2 e n >= 150; "propor mudança" = t >= 3,
n >= 300 e mesmo resultado nas DUAS épocas, mais aprovação do usuário. Com 2 candidatos o limiar de significância ajustado é
t >= 2,24 (Bonferroni, 5%); abaixo disso fica como exploratório. Mesmo que passe, o inverso do app NÃO seria posto em
produção sem teste AO VIVO na época `pos` do Laboratório (dados novos, mercado real).

### 6.17 Replay: VALIDAÇÃO aberta uma vez (04/10/2026) - os achados da exploração NÃO se repetiram
Validação = 10/08 a 02/10 (OFICIAL n=399). Aberta uma única vez, só para as perguntas/candidatos de 6.16.
Q1 vantagem bruta do direto: acerto sem spread 51,4% (+-4,9), +1,25 pips/op, t=+0,69 -> NÃO há desvantagem bruta (na exploração
eram 43,4%, t=-2,68): o "sinal contra o acaso" da exploração desapareceu. Q2 expectativa líquida do direto: -1,29 pips/op, t=-0,71
(exploração -5,55). INVERSO: -3,53, t=-1,97 (exploração +0,15). Sorteado -2,81. Em AMBAS as épocas a expectativa líquida do
direto é <= 0; o spread (~2,5 pips) é maior que qualquer vantagem bruta medida (+1,25 na validação, negativa na exploração).
C1 (inverso quando o app vende dólar): REPROVADO - validação n=118, 46,6%, -1,56 pips/op, t=-0,55 (exploração +4,63, t=+2,71).
C2 (inverso 12-21 UTC): sinal e tamanho mantidos (validação n=151, 51,7%, +3,67, t=+1,34; exploração +3,32, t=+1,88), mas NÃO atinge
o critério registrado (t >= 2): fica EXPLORATÓRIO. Agrupar as duas épocas depois de olhar daria t~2,3, mas isso é contar duas
vezes; só vale acompanhar AO VIVO no Laboratório (recorte X2 "Londres+NY" e "NY") até n >= 300 nos dados novos.
Controle da deriva do dólar (comprar USD e segurar, pips médios por par): exploração -89 (2 de 7 pares positivos), validação +198
(6 de 7). Os dois períodos têm regimes OPOSTOS do dólar, e o desempenho do sinal e dos recortes mudou junto: indício de que o que
parecia padrão na exploração era do regime, não do sinal. Lição do processo: a regra de separar exploração e validação impediu
que o t=+2,71 (C1, melhor de ~20 recortes) virasse "descoberta". Para decidir algo faltam MAIS regimes, não mais recortes.
Conclusão honesta hoje: com o código e a configuração atuais não há evidência de vantagem lucrativa nem de filtro validado.
Direção possível (a decidir): testar, no mesmo replay, FAMÍLIAS de sinal independentes do pipeline atual, pré-registradas e com
parâmetros fixos (sem ajuste), para saber se EXISTE vantagem bruta > custo neste mercado/período; a literatura aponta que
regras técnicas simples de câmbio perderam o lucro fora da amostra (Neely, Weller e Ulrich, 2009, JFQA).

### 6.18 FAMÍLIAS DE SINAL no replay - PROTOCOLO PRÉ-REGISTRADO (autorizado pelo usuário em 04/10/2026; escrito ANTES de qualquer código/execução)
Objetivo: saber se existe vantagem BRUTA maior que o custo (spread) neste mercado/período, com regras clássicas e SIMPLES, independentes do
pipeline do app. Parâmetros FIXOS escolhidos agora, de convenção, sem ajuste nem escolha olhando dados (por isso, ao contrário dos recortes,
não precisam de exploração/validação para selecionar; a divisão em duas metades serve para checar CONSISTÊNCIA entre regimes).
Dados: mesmos candles de 5 min guardados (10 pares, 07/04-02/10/2026). Saída de todas: TP = SL = tamanho do stop do app por par (mediana das
entradas OFICIAL do replay; o scanner usa US$ 5 com lote 0,02), spread da tabela Standard, uma posição por par com bloqueio até fechar e >= 30 min
(igual ao oficial); avaliação "como o app mede" (sem spread) e com spread; mesmo simulador/regras (candle ambíguo = perda).
FAMÍLIAS (4 + controle):
 F1 Rompimento da faixa asiática: faixa = máxima/mínima das 00:00-07:00 UTC do dia (>= 60 candles); entre 07:00 e 12:00 UTC, o PRIMEIRO candle
    de 5 min que FECHA acima da máxima = COMPRA, abaixo da mínima = VENDA; no máximo 1 sinal por par por dia; entrada no fechamento do candle.
 F2 Reversão por RSI extremo: RSI(14, Wilder) dos fechamentos de 5 min; COMPRA no candle em que o RSI cruza para <= 30 (vindo de > 30), VENDA no
    que cruza para >= 70 (vindo de < 70).
 F3 Tendência com filtro de timeframe maior + pullback: tendência de 1 h = EMA(20) > EMA(50) dos fechamentos de 1 h (só horas COMPLETAS);
    em alta, COMPRA quando o fechamento de 5 min cruza para cima da EMA(21) de 5 min (vindo de <=); em baixa, VENDA no cruzamento para baixo.
 F4 Momentum de 1 h: no fechamento de cada hora cheia, se o retorno das últimas 12 barras de 5 min for positivo = COMPRA, negativo = VENDA
    (entrada no fechamento da barra; uma por par por hora, sujeito ao bloqueio).
 CONTROLE C0 Aleatório: direção sorteada (função determinística do par+instante) a cada 15 min, sujeito ao bloqueio. Deve dar ~ -spread por operação;
    se der muito diferente, o arcabouço tem viés e NADA da rodada vale.
 REFERÊNCIA F0: o pipeline do app (os números de 6.16/6.17).
CRITÉRIOS (por família, sobre TODO o período e por metade):
 - "Vantagem líquida": expectativa líquida (com spread) > 0, t >= 2,4 (Bonferroni para 4 famílias a 5%) no período todo E positiva nas duas metades.
 - "Vantagem bruta que o custo come": expectativa SEM spread > 0, t >= 2,4, positiva nas duas metades, mas líquida <= 0 (problema de custo, não de direção).
 - Qualquer outra coisa = sem evidência. Não há segunda rodada ajustando parâmetros de uma família "para ver se melhora": isso vira nova família com novo registro.
 - Mesmo "vantagem líquida" só vale como pista para teste AO VIVO no Laboratório (dados novos) antes de qualquer proposta ao oficial, e exige aprovação do usuário.
Ressalvas declaradas: horários fixos em UTC (o horário de verão de Londres desloca a abertura em 1 h parte do ano); o spread é constante (o real
abre em notícia e na virada de sessão, então o líquido está otimista); sem limite diário e sem janela de sessão do scanner.

### 6.19 Famílias de sinal: RESULTADO (04/10/2026, 07/04-02/10) e REPLICAÇÃO PRÉ-REGISTRADA em período independente
Resultado, critérios de 6.18 aplicados sem escolher recorte (pips/op; t da expectativa; n = operações fechadas):
 C0 controle aleatório (n=2307): bruto +0,55 (t=+0,78), líquido -1,63 -> líquido ~ -spread médio (~2,2): o arcabouço não tem viés.
 F1 faixa asiática (n=772): BRUTO +3,01 (t=+2,52; 54,3% de acerto; metades +2,84 t=+1,98 e +3,37 t=+1,55), LÍQUIDO +0,49 (t=+0,41).
 F2 RSI extremo (n=1795): bruto +0,36 (t=+0,45), líquido -1,59 (t=-1,98).   F3 tendência 1h+pullback (n=1684): bruto -0,74 (t=-0,89;
 metades -1,61 e +1,20), líquido -3,18.   F4 momentum 1h (n=2141): bruto -1,12 (t=-1,53), líquido -3,09 (t=-4,23).
Leitura honesta: só F1 cumpre os critérios de VANTAGEM BRUTA (t>=2,4 no período todo e positiva nas duas metades; t=2,52 passa por pouco o limiar
ajustado para 4 famílias). O critério escrito dizia "líquida <= 0"; o líquido deu +0,49, positivo mas indistinguível de zero (t=0,41): trato como
"vantagem bruta; líquida no zero a zero com o spread da tabela Standard". NÃO é lucro demonstrado. Ressalvas: amostra só de abril a outubro (horário
de verão: abertura de Londres ~07:00 UTC; no inverno vira ~08:00 UTC e a janela fixa 07-12 UTC desalinha); stop mediano do app varia por par (20 a 53 pips)
e o spread por par é o da tabela; o líquido está otimista porque o spread real abre em notícia; só 1 de 4 famílias passou perto do limiar (chance de
falso positivo não desprezível).
REPLICAÇÃO PRÉ-REGISTRADA (escrita antes de baixar/rodar): estender o histórico para trás (mais ~180 dias, ~out/2025 a abr/2026, 11 páginas por par,
~110 créditos da KEY_3 em dia de mercado fechado) e rodar as MESMAS 4 famílias + controle, sem mudar parâmetro nenhum (inclusive a janela fixa
UTC, que no inverno desalinha 1 h: é o teste da regra COMO REGISTRADA). Critério de replicação de F1: no período novo, bruto > 0, t >= 2,0 e n >= 500;
com o período novo + o antigo, bruto t >= 2,4. Líquido idem (>0; t >= 2,4 combinado) para "vantagem líquida". Se F1 não replicar, é descartada.
Qualquer outra família que passe só no período novo NÃO vale (seria descoberta nova: exige novo registro e outra janela). Se F1 replicar, o próximo
passo é um fluxo AO VIVO no Laboratório (sinais virtuais de F1 em tempo real, dados novos) antes de qualquer proposta ao oficial.

### 6.20 Replicação das famílias em período independente (04/10/2026): F1 NÃO replicou; o controle aleatório calibra o t
Histórico estendido para trás (KEY_3, ~110 créditos, domingo): 08/10/2025 a 02/10/2026. Mesmas 4 famílias + controle, parâmetros e barreiras
IDÊNTICOS aos de 6.18 (inclusive janela fixa em UTC, que no inverno desalinha 1 h). Período NOVO = 08/10/2025 a 06/04/2026 (inverno; nunca visto).
Resultados (pips/op, t da expectativa; "bruto" = sem spread):
 F1 faixa asiática: NOVO bruto +0,62 (t=+0,53; n=848; acerto 50,5%) | já visto +3,13 (t=+2,62) | combinado +1,82 (t=+2,19). Líquido: NOVO -1,69,
 já visto +0,53, combinado -0,63 (t=-0,75). CRITÉRIO de replicação (t >= 2,0 e n >= 500 no período novo; combinado t >= 2,4): REPROVADA. F1 é descartada.
 F2 RSI: bruto combinado +0,49 (t=+0,91), líquido -1,43 (t=-2,68).  F3 tendência 1h: bruto -0,27 (t=-0,50), líquido -2,70 (t=-5,02).
 F4 momentum 1h: bruto -1,13 (t=-2,33), líquido -2,95 (t=-6,09).
CONTROLE C0 (direção sorteada, n=5404): bruto +1,10 (t=+2,37; NOVO +1,31 t=+2,14), líquido -1,21 (t=-2,61). Um sorteio SEM nenhuma informação chegou a t=+2,4
no bruto: a estatística t ingênua (que trata cada operação como independente) SUBESTIMA o erro (operações próximas no tempo e entre pares compartilham o
fator dólar). Consequência: o limiar t >= 2,4 usado em 6.18 era frouxo; o resultado de F1 no período visto (+3,01) é do mesmo tamanho do que o acaso
produz no controle. Daqui em diante, qualquer afirmação de vantagem exige bater o CONTROLE na mesma amostra e t >= 3 com erro-padrão agrupado por dia.
Conclusão consolidada (replay do pipeline do app + 4 famílias clássicas, 12 meses, 10 pares): nenhuma regra mostrou vantagem BRUTA reproduzível; o custo
(~2,2 pips/op de spread médio) transforma um bruto ~0 em líquido negativo em TODAS (inclusive no controle: -1,2). Sem vantagem bruta, nenhuma conta,
tamanho de alvo ou filtro de sessão fecha no positivo. O que ficou NÃO provado: que o app tenha vantagem; o que ficou provado: que o Laboratório e o replay
não deixam "padrões" frágeis virarem decisão (C1 do pipeline, C2, F1: todos caíram na replicação ou no controle).
Estado do Laboratório AO VIVO: rotulador de hora em hora e recontagem diária continuam; a época `pos` ao vivo começa na reabertura (dom 21:00 UTC).

## 7. Pendente do usuário

- Material do amigo e ebooks: RECEBIDOS e lidos em 03/10 (seção 6). Falta o usuário escolher
  quais experimentos (E1-E5) quer e em que ordem.
