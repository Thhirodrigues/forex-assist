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

### 6.21 HORIZONTE DIÁRIO (projeto novo) - PROTOCOLO PRÉ-REGISTRADO (autorizado pelo usuário em 04/10/2026; escrito ANTES de baixar/rodar)
Decisões do usuário: (1) "constância" = SEMANAS/MESES POSITIVOS (não acerto por operação); (2) baixar candles DIÁRIOS e registrar o protocolo; (3) tentar
risco menor por operação - vale para o PROJETO NOVO (o scanner oficial segue congelado, inclusive o lote). Regra de risco do projeto novo: no máximo 1% da
banca em risco por operação (stop = 2 x ATR(14) diário; tamanho = 1% / distância do stop).
Por quê: o custo fixo (~2 pips) pesa ~8% de um alvo de 25 pips mas ~1,5% de um movimento diário; a literatura relevante (momentum/tendência em câmbio:
Moskowitz-Ooi-Pedersen 2012; Menkhoff et al. 2012; Hsu-Taylor-Wang 2016, evidência MISTA) é de horizonte diário a mensal; sinal 1x/dia após o fechamento de NY
tolera atraso humano. Dados: TwelveData `1day`, outputsize 5000 (~19 anos), 10 pares, `timezone=UTC` (limitação: o "dia" da TwelveData corta em 00:00 UTC, não no
fechamento de NY). Janela de aquecimento: primeiros 260 candles fora da avaliação. Rebalanceamento: último dia útil de cada mês (exceto D5, diário).
FAMÍLIAS (parâmetros FIXOS, de convenção; nada será ajustado depois de ver resultado; família nova = novo registro):
 D1 Momentum de série temporal 12 meses: sinal por par = sinal do retorno dos últimos 252 dias; compra se > 0, vende se < 0.
 D2 Momentum de série temporal 3 meses: idem com 63 dias.
 D3 Momentum entre moedas (cortes transversais, só os 7 pares com USD): força da moeda contra o USD nos últimos 63 dias (par com USD na cotação: retorno do par;
    par com USD na base: retorno invertido); compra as 2 moedas mais fortes e vende as 2 mais fracas contra o USD.
 D4 Dólar como fator único: índice do dólar = média dos retornos log (sinal ajustado) dos 7 pares com USD; sinal = sinal da variação do índice em 126 dias;
    posição única "dólar sobe/desce" aplicada igualmente aos 7 pares.
 D5 Rompimento de Donchian 55/20 (diário, por par): compra se fechar acima da máxima dos 55 dias anteriores, vende abaixo da mínima; sai da compra abaixo da
    mínima de 20 dias, da venda acima da máxima de 20 dias.
 CONTROLE: 500 sorteios de posição aleatória (sinal sorteado por par a cada mês) com a MESMA máquina de pesos/custos: distribuição nula do Sharpe.
Carteira: peso por par = sinal x (10% a.a. / (volatilidade EWMA de 60 dias do par x raiz de 252)) / N de pares da família, teto de alavancagem 3x (a priori, sem olhar
adiante). Retorno do dia seguinte ao sinal (sem atraso); robustez com atraso de 1 dia. Custo: spread da tabela Standard x |mudança de posição| em fração do preço;
estresse de 2x o spread. SWAP/rolagem NÃO modelado (dado indisponível): ressalva permanente, sensibilidade de -0,5 pip/dia por unidade de posição.
Medidas: Sharpe líquido, % de meses e de semanas positivos, pior drawdown, retorno por ano; intervalo de confiança por bootstrap em BLOCOS mensais (3.000 sorteios).
CRITÉRIOS (por família; todas reportadas, inclusive as reprovadas):
 A1 Sharpe líquido > 0, limite inferior do IC de 95% (bootstrap mensal) > 0 E Sharpe >= percentil 99 da distribuição nula (Bonferroni para 5 famílias).
 A2 Sharpe líquido > 0 na primeira E na segunda metade da amostra e em >= 3 de 4 blocos iguais.
 A3 Sharpe líquido > 0 também com atraso de 1 dia e com spread 2x.
 A4 (uso no app) >= 55% dos meses positivos e drawdown máximo <= 25% no alvo de 10% a.a.
 "Vantagem demonstrada" = A1+A2+A3. "Utilizável" = A1+A2+A3+A4. Resto = sem evidência (e se algo parecer bom só em um critério, é ruído).
Ressalvas declaradas: horário de corte do dia, swap ausente, sem stops (a regra de 1% de risco por operação é fase seguinte, só se houver vantagem), regimes
(2008, 2015, 2020, 2022 estão na amostra: é de propósito).

### 6.22 RESULTADO do horizonte diário (04/10/2026, run 37190227061; protocolo 6.21 aplicado SEM ajuste de parâmetros)
Dados: 10 pares, TwelveData `1day`, ~4.850 barras limpas por par (2008-03 a 2026-10-02; EUR/USD 2007-11, GBP/USD 2007-12). Sábados descartados, domingos
incorporados à segunda. Todas as 5 famílias reportadas:
 D1 Momentum 12m (série temporal): Sharpe líq 0,08 (bruto 0,10), IC95 -0,40..0,56, nulo p99 0,50, meses+ 53%, DD 13%, metades 0,07/0,09, lag1 0,09, spread2x 0,06 => SEM EVIDÊNCIA (falha A1)
 D2 Momentum 3m: Sharpe líq -0,11, IC95 -0,57..0,37, meses+ 45%, DD 35%, metades 0,31/-0,49 => SEM EVIDÊNCIA
 D3 Momentum entre moedas (63d, 2x2): Sharpe líq -0,17, IC95 -0,68..0,25, nulo p99 0,56, meses+ 46% => SEM EVIDÊNCIA
 D4 Dólar como fator (126d): Sharpe líq -0,41, DD 75%, metades 0,28/-0,99 => SEM EVIDÊNCIA
 D5 Donchian 55/20: Sharpe líq -0,24, IC95 -0,71..0,23, metades 0,16/-0,61 => SEM EVIDÊNCIA
Leitura: nenhuma família passa A1 (a única com Sharpe líquido positivo, D1, tem 0,08 contra um limiar de 0,50 do nulo e IC que atravessa o zero). A literatura de
momentum em moedas (Menkhoff et al. 2012; Moskowitz-Ooi-Pedersen 2012) usa universos maiores (dezenas de moedas, incl. emergentes) e períodos mais antigos; neste
universo de 10 pares líquidos, em 2008-2026, o efeito não aparece de forma distinguível do acaso. Ressalvas: swap ausente (carry é a parte relevante do retorno de
moedas e este teste não a captura), universo pequeno e muito correlacionado (poucos graus de liberdade), 1 só definição de lookback por família (pré-registrada).
Nada foi ajustado depois de ver o resultado. Veredito do protocolo: nenhuma família "vantagem demonstrada"; fase de stops/1% de risco e sinal diário NÃO inicia.

### 6.23 CARRY / SWAP - PROTOCOLO PRÉ-REGISTRADO (autorizado pelo usuário em 06/10/2026; escrito ANTES de implementar e rodar)
Motivo: em 6.22 o swap não foi modelado, e o carry (diferencial de juros) é a parte do retorno de moedas que a literatura mais associa a prêmio persistente
(Lustig-Roussanov-Verdelhan 2011; Koijen et al. 2018 "Carry", JFE) e que não entrava nos testes. Pergunta: com o carry contabilizado, alguma família mostra vantagem?
Dados: taxas de política diárias do BIS (WS_CBPOL; US, XM=euro, GB, JP, AU, CA, CH, NZ), degraus em `diario/_taxas`; cobertura conferida (todas desde 2007).
A taxa vigente na data t é usada para o sinal em t e para o carry de t+1 em diante (sem olhar para frente). Proxy: taxa de política, NÃO o swap real da corretora.
Mecânica (única, definida a priori): por par com posição de peso w (fração do patrimônio, mesma máquina de 6.21), carry do dia = w x (taxa_base - taxa_cotada) x dias/365,
menos custo de swap da corretora = |w| x MARKUP x dias/365, com dias = dias corridos entre as barras (fim de semana e quarta tripla já contam). MARKUP base = 1,0 ponto
percentual ao ano sobre o nocional (premissa não verificada: o usuário conferirá a tabela de swap da XM; se divergir, refaz-se como sensibilidade).
Famílias novas (3, todas reportadas; mesmas regras de peso/vol 10%/custos/nulo/bootstrap/A1-A4 de 6.21):
 C1 Carry por par: posição = sinal(taxa_base - taxa_cotada), 10 pares, refeita todo fim de mês (peso por vol alvo).
 C2 Carry com limiar: igual a C1, mas só opera se |diferencial| >= 1,0 ponto percentual; senão fica fora.
 C3 Carry com filtro de tendência: igual a C1, mas só opera se o sinal de momentum 12 meses (D1) concorda com o carry; senão fica fora.
Também reexecutadas, a título INFORMATIVO (não entram no veredito nem na contagem de famílias): D1-D5 de 6.21 agora COM carry/swap.
Critérios: os de 6.21 (A1-A4) sem alteração, com UMA adição só para C1-C3: A3 exige também Sharpe líquido > 0 com MARKUP de 2,5 pp (estresse de swap pior).
Nulo: 500 sorteios com posição aleatória por par/mês pela mesma máquina, INCLUINDO carry e markup (assim o nulo paga o mesmo custo de swap).
Limite declarado do nulo: posições de carry são concentradas (compra AUD/NZD, vende JPY/CHF) e o nulo sorteia por par, então o p99 subestima a variância de uma carteira
concentrada; por isso o IC por bootstrap mensal também é exigido (A1 exige os dois). Bonferroni: p99 mantido (3 famílias novas).
Ressalvas: taxa de política != swap real; carry tem risco de cauda (2008, 2015, 2020: estão na amostra de propósito); sem stops (1% de risco é fase seguinte, só se houver vantagem).
Nada será ajustado (limiar, markup, lookbacks) depois de ver o resultado: variações viram família nova com novo registro.

### 6.24 RESULTADO do carry/swap (06/10/2026, run 37394638692; protocolo 6.23 aplicado SEM ajuste)
Taxas BIS diárias das 8 moedas desde 2007 (cobertura conferida); markup base 1,0 pp a.a.; estresse 2,5 pp.
 C1 Carry por par: Sharpe líq 0,22 (bruto 0,47), IC95 -0,26..0,72, nulo p99 0,12, meses+ 55%, sem+ 52%, DD 16%, metades 0,09/0,36, lag1 0,24, spread2x 0,21, swap pior -0,14 => SEM EVIDÊNCIA (falha A1 pelo IC e A3 pelo swap pior)
 C2 Carry com limiar 1 pp: Sharpe líq 0,17 (bruto 0,33), IC95 -0,30..0,67, meses+ 50%, DD 10%, metades -0,12/0,36, swap pior -0,04 => SEM EVIDÊNCIA
 C3 Carry com filtro de tendência: Sharpe líq 0,23 (bruto 0,43), IC95 -0,26..0,75, meses+ 54%, DD 8%, metades 0,12/0,33, swap pior -0,05 => SEM EVIDÊNCIA
 [informativo] D1-D5 com swap: todas pioram (Sharpe líq -0,10 a -0,59): o swap líquido de markup custa mais do que o carry devolve em posições de tendência.
Leitura: o carry aparece com o SINAL certo (bruto 0,4-0,5, as três famílias positivas e acima do p99 do nulo), mas o IC atravessa o zero e o resultado não sobrevive ao swap pior.
Erro-padrão do Sharpe em ~18,6 anos ~ 1/raiz(18,6) = 0,23: um Sharpe verdadeiro de 0,2-0,3 não é detectável nesta amostra; só se provaria com ~40-70 anos. O teste não consegue
nem confirmar nem descartar um carry pequeno. Em 10% a.a. de vol, 0,22 de Sharpe ~ 2,2% a.a. de retorno líquido, com 45% dos meses negativos: sem utilidade como "constância".
A premissa que decide tudo é o markup do swap da corretora (1 pp -> 0,22; 2,5 pp -> -0,14): precisa da tabela real de swap da XM para fechar essa questão.
Veredito do protocolo: nenhuma família com vantagem demonstrada; fase de sinal diário NÃO inicia.

### 6.25 REGRA DE DECISÃO PARA AS 100 OPERAÇÕES DO OFICIAL (proposta em 06/10/2026; escrita ANTES de existirem os 100; vetável pelo usuário antes de 50)
Contexto medido: até 05/10 22:37 UTC, 9 fechadas na época pós-zerar (3W/6L). Na época anterior (157 ops, regimes misturados, só indicativo): acerto 41% e -2,5 pips/op com spread ZERO,
-4,5 pips/op com o spread da tabela. Break-even de acerto com TP~SL e spread ~2 pips fica perto de 53-55% (50% + spread/(2 x TP)); o resultado líquido em pips já resume isso.
Métrica primária ÚNICA: pips líquidos por operação (variante ATUAL do OFICIAL, época pós-zerar, só `regimeTPSL=CONFIG`), IC 95% por bootstrap em BLOCOS DE DIA (operações do mesmo dia/moeda
não são independentes). Comparação obrigatória com o controle ALEATORIO do Lab (mesmas entradas, direção sorteada), pelo `estatisticaT` calibrado.
Decisão (uma vez só, ao fechar a 100a; congelar a contagem com data/hora antes de abrir os números):
 R1 PERDE: limite superior do IC < 0 (ou não supera o ALEATORIO). Conclusão: o sinal atual não tem vantagem demonstrada. Dinheiro real fora. A fila de 9 ajustes NÃO é "otimizada" em cima
    desses mesmos 100 (seria dentro da amostra); o próximo passo é decisão de produto com o usuário e, se houver nova premissa, teste no Lab com período separado (exploração x validação).
 R2 INDETERMINADO: IC contém 0 e não perde para o ALEATORIO. Estende-se a 200 operações sem mudar nada; reaplica a mesma regra.
 R3 GANHA: limite inferior do IC > 0 E supera o ALEATORIO. Ainda sem dinheiro real: segunda amostra independente (forward) de 100, depois micro-lote com risco <= 1% por operação.
Descritivos (acerto, por par, sessão, grupos H1-H5/X1-X4, lote): servem só para formular hipóteses da próxima amostra, nunca para ajustar o sinal (Bonferroni; mais de 20 cortes = 1 falso positivo esperado).
Ritmo e prazo: ver ESTADO_ATUAL §0; estimativa de 06/10 = 91 faltando, 2 a 4,5 semanas, baseada em 1 dia de dados.

### 6.26 Observações reais da XM enviadas pelo usuário (prints de 06/10/2026 ~16:25 UTC; dado de 1 instante, conta com saldo ~US$100, lote 0,02 = 2.000 unidades)
Spread ao vivo (diferença venda/compra no gráfico, horário líquido Londres/NY): AUD/USD 2,3 pips (tabela do Lab: 2,05), NZD/USD 2,5 (tabela: 2,3, estimado), USD/CAD 2,8-2,9 (tabela: 2,2).
A tabela do Lab erra A FAVOR nesses 3 pares (o oposto da regra "errar contra"); o "1,6" da conta Standard é o piso de EUR/USD, não a média. Não alterada ainda: trocar uma vez só, com mais pares/horários, e rodar `lab-reprocessar`.
Posições abertas (4), TODAS vendidas em dólar (USDJPY venda, NZDUSD compra, AUDUSD compra, USDCAD venda): uma aposta direcional só, risco somado ~US$22 (SL ~US$5,4-5,5 cada; TP +US$5,00).
Barreiras reais: TP = +US$5,00 e SL = -US$5,4 a -5,5 (R:R ~0,92; break-even de acerto ~52-53% só por isso, antes do spread da entrada).
Swaps = US$0,00 nas 4 (abertas depois da virada anterior). Após a primeira virada (servidor 00:00 = 21:00 UTC), o campo "Swaps" dá o swap REAL: pedir print para estimar o markup (swap = nocional x (+/-tom-next - markup)/365).
Hipótese NOVA a pré-registrar se o usuário quiser (X5): sinais contra a tendência diária (63 dias) perdem mais? Nos 3 gráficos diários enviados, 3 de 3 sinais eram contra a tendência de semanas (anedota, n=3).

### 6.27 PRÉ-REGISTRO: direção do MERCADO por par, concordância de moeda e saída parcial (pedido do usuário em 06/10/2026; escrito ANTES de implementar e rodar)
Origem (usuário): (a) não basta ver o que o sinal mandou fazer; é preciso ver PARA ONDE O MERCADO ESTÁ INDO em cada par e se o sinal está a favor ou contra isso; o sinal "diferente" dos outros pode ser o que está certo;
(b) comparar com os outros pares da mesma moeda (4 apostas em "dólar cai" e uma em "dólar sobe" = divergência); (c) se o lucro aberto estiver em 40-60% do alvo no fechamento de um candle, avisar e deixar o usuário embolsar em vez de esperar o alvo cheio.
Só análise no Lab; nada muda no scanner oficial (congelado). Contexto calculado só com dados ATÉ o instante da entrada (sem olhar para frente), nos candles de 5 min:
 X5 Tendência do PAR em ~10 dias de mercado (2.880 candles de 5 min): retorno do fechamento de 2.880 candles antes até a entrada. |ret| >= 0,8% = "forte"; BUY com ret>0 (ou SELL com ret<0) = a_favor,
    o oposto = contra, |ret| < 0,8% = fraca. Grupos X5_10d_a_favor / X5_10d_contra / X5_10d_fraca.
 X7 Tendência do PAR nas últimas 24h (288 candles): mesma lógica, limiar 0,25%. Grupos X7_24h_a_favor / _contra / _fraca.
 X6 Cesta do dólar (MERCADO): média dos retornos de 24h dos 7 pares com USD, em termos de dólar (par com USD na cotação: retorno do par; com USD na base: retorno invertido). Só para entradas com lado do dólar (não cruzados).
    |cesta| >= 0,15% = forte. Entrada "dólar comprado" com cesta>0 (ou "vendido" com cesta<0) = a_favor, oposto = contra, fraca = |cesta| < 0,15%. Grupos X6_cesta_a_favor / _contra / _fraca.
 X8 Concordância de SINAIS (o que o app mandou nos outros pares): entre os OUTROS pares com USD, a última análise com direção (aprovada ou tendência ALTA/BAIXA, até 30 min antes da entrada) vota no lado do dólar.
    "concorda" = >= 2 votantes e todos no mesmo lado da entrada; "diverge" = >= 2 votantes e todos no lado oposto; "misto" = >= 2 votantes divididos; "sem_dados" = < 2. Grupos X8_sinais_concorda / _diverge / _misto / _sem_dados.
 S1/S2 Saída por fechamento de candle de 15 min: se, no FECHAMENTO de um candle de 15 min (xx:00/15/30/45), o lucro aberto líquido do spread >= 40% (S1: SAIDA_40_FECH) ou >= 60% (S2: SAIDA_60_FECH) do TP em pips, sai ali
    (no fechamento, pagando o spread); senão segue o TP/SL normal (SL igual ao ATUAL; TP inalterado como teto). Reportadas: pips por operação, % de acerto (WIN = pips > 0) e tamanho médio de ganho e perda.
Amostra: replay histórico de 360 dias (já guardado), exploração = primeiros 70%, validação = últimos 30% (aberta uma única vez, só para o que passar na exploração). Universos: LAB (fluxo virtual, base) e OFICIAL (aprovadas, confirmação).
Critério para X5/X6/X7/X8 (contrastes a_favor x contra, concorda x diverge; 4 famílias x 1 contraste = 4 contrastes, Bonferroni, alvo p<0,0125 => |t| >= 2,5): diferença de pips por operação (variante ATUAL, líquido de spread) >= 1,0 pip a favor de "a_favor"/"concorda",
 com t de Welch calibrado pelo controle ALEATORIO (mesmos grupos, direção sorteada), e MESMO SINAL na validação. Se a diferença for no sentido OPOSTO, também é achado (reportado), mas não vira regra sem validação.
Critério para S1/S2 contra ATUAL: pips por operação maior em >= 0,5 pip, no mesmo sinal nas duas partes (exploração e validação). A taxa de acerto vai SEMPRE junto com os pips: acerto sobe quase por construção; o que decide é a esperança em pips
 (efeito disposição: cortar ganho cedo e deixar a perda correr piora a esperança mesmo subindo o acerto; Shefrin-Statman 1985; Odean 1998, J. Finance). O aviso ao usuário (notificação) NÃO é implementado agora: muda o comportamento das operações medidas, só depois das 100 (caderno 6.25).
Limites: grupos feitos com limiar escolhido a priori (0,8%/0,25%/0,15%), sem ajuste; 10 dias de mercado != "3 semanas" do gráfico diário visto pelo usuário; o histórico de 360 dias tem uma tendência de dólar própria (confundidor, como em 6.20).

### 6.28 RESULTADO do pré-registro 6.27 (06/10/2026, run 37503516470, replay de 360 dias: 08/10/2025 a 02/10/2026, exploração até 17/06/2026, validação depois; 6.981 entradas)
Critérios de 6.27 aplicados sem ajuste. Diferença de pips/op (a_favor menos contra; concorda menos diverge), variante ATUAL líquida de spread, t de Welch, controle ALEATORIO ao lado:
 LAB  X5 (10 d): explor. -3,65 (t -2,2; n 799/544) | valid. -0,33 (t -0,1)  => não passa (|t| < 2,5; "contra" melhor na exploração, sem confirmação)
 LAB  X7 (24 h): explor. +2,28 (t 1,2)                | valid. -0,55 (t -0,1)  => não passa (sinal inverte)
 LAB  X6 (cesta): explor. +0,32 (t 0,2)               | valid. +3,47 (t 1,1)   => não passa
 LAB  X8 (votos): explor. +1,22 (t 0,2; diverge n=40) | valid. -15,41 (t -1,9; diverge n=16, 63% de acerto) => não passa; amostra "diverge" minúscula
 OFICIAL (aprovadas): todos os |t| <= 1,0; nenhum contraste passa. O ALEATORIO produziu t de 2,2 (LAB X8 exploração) e 1,3, ou seja, |t| de 2 aparece por acaso neste desenho.
 Resultado: NENHUMA das hipóteses X5-X8 mostra efeito reprodutível. "Concordância/divergência de moeda" e "sinal a favor/contra a tendência" não separaram operações boas de ruins.
 SAÍDAS PARCIAIS (grupo TODOS, pips/op e acerto; LAB explor./valid.): ATUAL -2,67 (43%) / -3,10 (43%); SAIDA_40_FECH -2,91 (56%) / -2,79 (56%); SAIDA_60_FECH -2,86 (50%) / -2,45 (51%); sem spread -0,61 / -0,33; ALEATORIO -1,44 / -2,86.
  OFICIAL: ATUAL -1,96 / -2,61; SAIDA_40 -2,30 / -2,09; SAIDA_60 -2,36 / -2,31.
  Critério (>= +0,5 pip a mais e mesmo sinal nas duas partes): reprovado (a diferença troca de sinal entre exploração e validação, +-0,3 a 0,5). O acerto sobe 13 pontos (43% -> 56-58%) e os pips por operação NÃO melhoram:
  é a ilusão de "mais acertos" sem lucro (efeito disposição), com o sinal ainda perdendo ~2 a 3 pips por operação líquido de spread (e ~0 a -0,6 sem spread).
 Observação: o ATUAL fica pior ou igual ao ALEATORIO no mesmo custo (LAB explor. -2,67 x -1,44; valid. -3,10 x -2,86): o score não separa melhor que o acaso neste período.
Limites: 360 dias com uma tendência de dólar própria; entradas LAB correlacionadas (t ingênuo otimista, por isso o controle); X6 só existe no replay; "10 dias de mercado" != 3 semanas do gráfico diário.
Veredito: nada para propor ao oficial. A ideia de aviso de embolsar NÃO será implementada (não melhora a esperança). Nenhum dos filtros candidatos entra na fila pós-100 como melhoria; ficam como "testado e reprovado".

### 6.29 CONTAGEM OFICIAL LIDA DIRETO DO FIRESTORE (08/10/2026 ~01:00 UTC; leitura pública `historico` com a chave web do app) e o que ela muda na regra 6.25
`financeiro.regimeTPSL = CONFIG`: 151 documentos = 144 fechados (66 WIN / 78 LOSS, 45,8%) + 7 abertos. Por lote: 81 com 0,04 e 63 com 0,02. Desde o zerar (04/10 00:42Z): 37 fechados, 19 WIN / 18 LOSS (51%, medida do app, SEM spread),
7 abertos; por perfil que aprovou: CONSERVADOR 0, BALANCEADO 17 (8 WIN), AGRESSIVO 20 (11 WIN). Por dia de abertura (BRT): 04/10 6 ops 4 WIN +US$10; 05/10 11 ops 3 WIN -US$25; 06/10 10 ops 4 WIN -US$7,50; 07/10 10 ops 8 WIN +US$30.
Total do app no período: +US$ 7,50 sem spread; com ~2,2 pips de spread x US$ 0,20/pip x 37 ops ~ -US$ 16, o líquido estimado é ~ -US$ 9 (coerente com o placar do Lab, que mede COM spread: 34 fechados, 14 WIN, 41%).
Primeiro (e único, em todo o histórico) sinal CONSERVADOR: USD/CHF BUY, 07/10 13:05 BRT (16:05 UTC), score 55 (o mínimo), aprovado direto no perfil configurado (`rebaixadoDaCascata=false`), TP/SL US$ 5/5, aberto.
Lição para a regra 6.25: os resultados vêm em BLOCOS DE DIA muito correlacionados (3 de 11 num dia, 8 de 10 em outro; os pares abertos quase sempre apostam no mesmo lado do dólar). Com ~10 operações/dia, 100 operações = ~10 dias =
~10 blocos: o IC por bootstrap em blocos de dia será largo e o desfecho mais provável é R2 (INDETERMINADO: estender para 200 ou ~20 dias de mercado), não R1 nem R3. Acrescentar à regra: reportar também o NÚMERO DE DIAS e não concluir R1/R3 com menos de ~15 dias.
Segurança (achado): `historico` e `scanner` são legíveis publicamente pela chave web do app (sem login). Não vaza credencial; expõe histórico/saldo simulado. Correção (Firebase Auth + regras) fora do escopo agora.

### 6.30 Cruzamento do histórico da conta demo XM (29 operações fechadas, 30/09 a 13/10/2026) com o `historico` do app (14/10/2026)

Fonte: planilha exportada pelo usuário (histórico da conta demo; horário do servidor da XM = UTC+3) e leitura pública do `historico` oficial. Pareamento por par + direção + horário (sinal do app até 48 h antes da entrada). 28 de 29 pareadas; 1 sem sinal (USD/CHF VENDA 12/10 16:25 UTC). Atraso de entrada: mediana 10 min; 21 de 28 em até 25 min.
Notas de leitura: operações manuais do usuário, não é amostra do app; só mostra operações FECHADAS (as sem SL que foram contra ficam abertas e não aparecem aqui).

- Líquido real (lucro + swap): +US$0,45 (swap total -1,69; sem swap, +2,14). Taxa de acerto 15/29 = 51,7%; ganho médio 5,00, perda média 5,32 -> ponto de equilíbrio ~51,6%. Nada distinguível de zero.
- SEM SL no TP/SL da corretora: 7 operações, 7 ganhos, +33,75. COM SL: 22 operações, 8 ganhos (36%), -33,30. Todo o lucro vem das sem SL, que só entram no histórico quando fecham; perdedoras sem SL ficam abertas. Não é evidência de habilidade: é viés de sobrevivência (efeito disposição) até que as posições ABERTAS sejam somadas. Pendente: usuário enviar as abertas.
- Concordância de desfecho app x XM: 23 de 28 (82%). Divergentes (5): 1 por falta de SL (EUR/USD COMPRA 08/10, o app deu SL em 40 min e a XM segurou 11 h e ganhou), 2 por entrada atrasada em preço melhor após recuo (EUR/USD e GBP/USD VENDA 01/10, TP da XM em minutos; no app, SL no dia seguinte), 1 por entrada 3 min depois com preço 16 pips diferente e TP recalculado a partir do preenchimento (USD/JPY VENDA 08/10), 1 hipótese de spread (USD/JPY COMPRA 01/10, mesmo preço de entrada; app TP no preço médio, XM SL depois; TP da XM exige o bid). Nenhum caso é erro claro de detecção do app.
- Atrito: nas 23 concordantes, XM -7,71 x app +0,63 = -0,36 por operação (spread + swap + deslizamento), ~7% do valor arriscado de US$5.
- App no período (sinais encerrados desde 30/09, 12 dias): 164 sinais, 43,9% de acerto, -US$73,90 (BALANCEADO 45: 37,8%, -57,61; AGRESSIVO 118: 46,6%, -11,29; CONSERVADOR 1). Escolhidos pelo usuário: 28, 46,4%, -5,96; não escolhidos: 136, 43,4%, -67,94. Diferença sem significância (n pequeno, dias correlacionados). Recorte de data diferente da contagem oficial desde 04/10; não substitui a regra 6.25.
- O "+US$18 em 7 dias" citado pelo usuário não bate com o fechado (fechadas desde 07/10 UTC: 16 operações, -14,27); pode incluir lucro flutuante das abertas.
Implicações (nada implementado): (a) R/R 1 com atrito ~7% exige acerto > ~53%; (b) copiar do app os PREÇOS de TP/SL, não recalcular a partir do preenchimento; (c) somar as abertas antes de qualquer conclusão sobre as sem SL; (d) a janela entre sinal e entrada importa e pode ser testada no Laboratório (entrada em recuo), com pré-registro.

Atualização 6.30 (14/10/2026 ~03:30 UTC, posições ABERTAS enviadas pelo usuário, snapshot 00:29 de São Paulo): 11 posições abertas, TODAS sem SL, P/L flutuante líquido -US$43,66 (4 positivas, 7 negativas; piores: GBP/USD VENDA 09/10 -13,58; USD/CAD COMPRA 09/10 -10,90; AUD/USD VENDA 12/10 -9,55; EUR/JPY VENDA 12/10 -7,41). Saldo informado US$45,03 (ver pendência abaixo).
- Das 11, 7 já tinham sido ENCERRADAS pelo app (6 por SL, -5 cada; 1 por TP) e 4 seguem abertas no app. Soma no app para essas 11: -22,12; na XM, flutuante -43,66. Ou seja, segurar sem SL piorou ~21,5 em relação ao plano do app, até agora (não realizado: ainda podem voltar ao TP).
- Sem SL, as 17 operações com sinal do app (6 fechadas + 11 abertas): XM -13,46 x app -1,80. As 7 fechadas ganharam 7/7 (+33,75) e as 11 abertas estão -43,66: o "7 de 7" era viés de sobrevivência. Perfil típico: muitos ganhos pequenos limitados ao TP e perdas sem teto (até -13,58 contra risco planejado de -5).
- Fechadas + abertas (40 operações): -43,21 (soma das operações). CORRIGIDO em 15/10: o "Saldo" da planilha da página web da XM é o EQUITY (patrimônio), não o balance. Em 14/10 00:29: equity 45,03, balance = 45,03 + 43,66 = 88,69 (100 + 0,45 das fechadas = 100,45; diferença de -11,76 ainda sem explicação). A leitura anterior ("equity ~US$1,37, risco de stop-out") estava ERRADA.
- USD/CHF VENDA 12/10 (sem sinal): aberta sem querer, segundo o usuário; excluir das estatísticas.
- Observação do usuário: "os melhores ganhos foram com GBP e EUR". Checagem fora da amostra no `historico` do app: ANTES de 30/09, GBP n53 acerto 32% -54,7 e EUR n76 38% -48,2 (os piores depois do JPY); DEPOIS, GBP n46 48% +10,4 e EUR n52 50% +6,7. O padrão inverte entre períodos; GBP e EUR contam pares com USD e cruzados, e USD aparece em 129 dos 164 sinais pós-30/09 (-76,2). Tratar como ruído até teste pré-registrado (muitos recortes: 10 pares, 8 moedas, n de 1 a 7 por recorte).

Atualização 2 de 6.30 (15/10/2026, nova leva de abertas; CORRIGIDA após print do app da XM às 18:51): 14 posições abertas, todas sem SL. Print do app (Detalhes de conta): balance US$130,30; P/L não realizado -56,40; equity 73,90; margem 21,68; margem livre 52,22; nível de margem 340,87%; alavancagem 1000:1 (equity - margem = 52,22 e equity/margem = 340,87%, conferem). A planilha da página web mostrava "Saldo 77,56" = equity naquele instante (77,56 + 52,74 = 130,30). Portanto: resultado real sobre os US$100 iniciais = -26% (equity), não -75%; balance +30,3 realizado, perdas abertas -56,4. Equity variou de ~12 (14/10 ~10h, relato do usuário) a ~74-90 em dois dias: a oscilação do patrimônio é o dado de risco. Nocional aberto ~US$28,3 mil contra equity ~74: ~380x; stop-out (50% de margem) só ocorreria com equity ~10,8, ou seja, perda adicional de ~63. Lição de método: rótulos "Saldo" diferem entre site (equity) e app (balance); usar sempre o painel "Detalhes de conta" do app. 9 das 14 no vermelho; piores: USD/CAD COMPRA 14/10 -15,07, USD/CAD COMPRA 09/10 -12,69, GBP/JPY COMPRA 14/10 -8,65, EUR/GBP VENDA 14/10 -8,35, GBP/JPY VENDA 14/10 -6,09.
- 9 das 14 são sinais que o app já ENCERROU (8 por SL, 1 por TP) e a XM segue aberta; 5 são sinais ainda abertos no app. Mesmos 14 no app (fechado ou flutuante): -27,75; XM: -49,99.
- Posições repetidas no mesmo par NÃO vêm do scanner: `existeCooldown` (riskManager.js) bloqueia novo sinal enquanto o último do par está ABERTA ("evita empilhar posições simultâneas no mesmo par"); no app só há 1 aberta por par (7 abertas em 7 pares). A duplicação na XM é o usuário segurar o sinal antigo depois que o app fechou e pegar o novo. Não é martingale (lote constante), é acúmulo de perdedoras sem stop + correlação (EUR em 6 posições, USD em 3 de USD/CAD).
- O app NÃO tem teto de exposição entre pares (já listado em PENDENCIAS-ESTRATEGICAS-RMI.md).
- App desde 04/10 (118 encerrados, critério simples de data): 44,1% de acerto, -US$67,50. Por dia de fechamento: 14/10 n22 9W -20,0; 15/10 (parcial) n8 6W +20,0. Dia bom isolado não muda a leitura.

Atualização 3 de 6.30 (15/10/2026 ~22:30 UTC; histórico COMPLETO fechado + abertas às 19:23 de São Paulo, arquivos enviados pelo usuário; conta demo, lote 0,02 = 2.000 unidades, alavancagem 1000:1):
- Histórico completo: 40 operações fechadas (30/09 a 15/10), líquido +51,39 (bruto +58,50, swap -7,11 = 12% do bruto), 26 ganhos (65%), ganho médio 4,84, perda média -5,32. Sem SL: 17 operações, 17 ganhos, +80,28. Com SL: 23 operações, 9 ganhos (39%), -28,89.
- Conta às 19:23: balance 130,30; "Capital" (equity) 87,82; P/L não realizado -42,48; margem 21,68; nível de margem 405%; 14 abertas, todas sem SL.
- Conciliação: balance 130,30 = 100 + 51,39 - 21,09. A diferença de -21,09 é CONSTANTE em 14/10 00:29, 15/10 18:37 e 19:23, ou seja, aconteceu antes da primeira operação listada (30/09 21:29) ou não está na lista (operações anteriores? ajuste? saldo inicial de 78,91?). PENDENTE: usuário confirmar.
- Cruzamento com o `historico` do app (53 de 54 pareadas; USD/CHF VENDA 12/10, aberta sem querer, excluída): XM marcado a mercado +5,53 contra +app -38,65 nos mesmos sinais. Sem SL (30): XM +34,42 x app -17,37. Com SL (23): XM -28,89 x app -21,28.
- CONFUSÃO DE PERÍODO: as 23 operações com SL abriram todas entre 01/10 e 08/10; 29 das 30 sem SL abriram depois de 08/10 12:00 UTC. SL x sem SL está confundido com o regime de mercado: não dá para atribuir o resultado ao SL.
- Dos sinais que o app fechou em SL e que a XM manteve sem SL (15): 7 já fecharam em TP (+31,60) e 8 seguem abertas (-41,97 flutuante); no app essas 15 somam -75, na XM -10,37 marcado a mercado. Evidência a favor de "TP sem SL" na janela, com 8 posições ainda não resolvidas (algumas abertas há 6 dias; swap acumulando).
- Revisão: a leitura do dia 14/10 00:29 (grupo sem SL -9,91) e a de hoje (+34,42) mostram que o resultado depende da data da medição. A tese "sem SL ajuda" é testável: variante "TP sem SL" com limite de tempo no replay de 360 dias (pré-registrar antes de rodar; medir acerto, pior prejuízo aberto, tempo até fechar, uso de margem e swap).
- Risco real da janela: equity chegou a ~12 em 14/10 de manhã (relato do usuário) com margem ~17-22: nível de margem estimado 55-70%, perto do stop-out de 50% da XM.

### 6.31 PRÉ-REGISTRO: "TP SEM SL" e política de margem (pedido do usuário em 15/10/2026; escrito ANTES de implementar e rodar; vetável antes da execução)

Origem: na conta demo da XM, 30 operações sem SL (+34,42 marcado a mercado) contra 23 com SL (-28,89), mas com confusão de período (6.30: todas as com SL abriram até 08/10; 29 das 30 sem SL depois). Pergunta do usuário: o resultado sem SL é real, e qual política de margem o torna seguro?
Pergunta 1 (expectativa): com as MESMAS entradas do replay de 360 dias (08/10/2025 a 02/10/2026; exploração até 17/06/2026, validação depois; entradas OFICIAL e LAB), uma saída "só TP" (sem stop) tem expectativa líquida (spread + swap) melhor que o TP/SL atual e melhor que o controle ALEATORIO?
Pergunta 2 (risco): qual a distribuição de prejuízo aberto (MAE) e de uso de margem, e que teto de exposição mantém a conta fora do stop-out?
Expectativa registrada ANTES de rodar (prior do autor): em preço sem deriva, TP sem SL com prazo máximo tem acerto alto (~85-95%) e expectativa líquida ~ -(spread + swap), com cauda esquerda grossa; ou seja, espero NÃO rejeitar H0 (expectativa <= 0). Se vier positivo, a explicação a testar primeiro é a deriva do dólar (6.17: regimes opostos entre exploração e validação), não o SL.
Variantes (mesmas entradas, mesmo TP em pips da Config; spread como em `lab/simulador.js`; regra fixa 1 do simulador mantida: candle ambíguo = pior caso):
 V0 ATUAL (TP/SL, R/R 1) - base.
 V1 TP_T3, V2 TP_T5, V3 TP_T10: sem SL; se o TP não for batido em N dias de mercado (3, 5, 10), fecha a mercado no open do candle seguinte (perda realizada). Swap por noite pelo módulo de taxas de 6.23 (markup base 1,0 pp; estresse 2,5 pp), tríplice na quarta.
 V4 SL_3X, V5 SL_5X: stop largo de 3x e 5x o TP, sem limite de tempo (meio-termo comum; mede se a cauda é paga).
 C  ALEATORIO: direção sorteada, mesmos V0-V5 (calibra o t, como em 6.20).
Métricas por variante x época x grupo (TODOS, sem fatiar por par/sessão): n, acerto, pips/op líquido, perda média dos perdedores, pior perda, MAE (p50, p90, p99, máximo), tempo até o TP (mediana, p90), % que bateu o prazo, expectativa por bloco de dia (bootstrap em blocos de dia, IC95) e t agrupado por dia.
Fase B - conta simulada (política de margem): processa as entradas OFICIAL em ordem cronológica numa conta de US$100 (também 1.000), lote 0,02 (2.000 unidades), alavancagem 1000:1, margem = nocional/alavancagem, stop-out em nível de margem 50% (valor da XM; conferir) liquidando a pior posição. Políticas (grade fechada, sem ajuste depois): P0 aceita tudo; P1 no máx. 1 posição por par (como o scanner); P2 no máx. 4 posições abertas; P3 não abre se nível de margem < 300%; P4 = P1 + P3. Por política x variante: equity final, equity mínimo, nível de margem mínimo, nº de stop-outs, % de janelas móveis de 30 dias sem stop-out, tempo abaixo de 200% e de 100%.
Critério de "plausível" (todos juntos, nas DUAS épocas): (a) pips/op líquido >= +0,5; (b) melhor que o ALEATORIO na mesma variante com t agrupado por dia >= 3; (c) em P1 ou P4, >= 95% das janelas de 30 dias sem stop-out e equity mínimo >= 50% do inicial; (d) o sinal não inverte quando o replay é separado em regimes de dólar (alta x baixa). Qualquer falha = "testado e reprovado" para o pipeline oficial; permanece como escolha manual do usuário com o risco registrado.
Limites já conhecidos: 1 ano com uma tendência de dólar; swap por modelo (não a tabela real da XM); operações correlacionadas (por isso blocos de dia); a amostra real do usuário (6.30) NÃO entra como evidência, só como caso.
Nada será mudado no pipeline oficial nem no scanner. Implementação: variantes no `lab/simulador.js` (MAE e prazo), runner em `lab/` e workflow manual; testes antes do run.

### 6.32 Hipótese H_GBP (pedido do usuário em 15/10/2026: "dar atenção maior aos grupos com GBP, 100% de win desde 30/09"); verificação descritiva e PRÉ-REGISTRO, escritos antes da execução
Verificação (dados de 15/10, descritiva, NÃO é teste): XM, GBP fechadas 10 de 10 (+51,76), mas as 17 operações fechadas sem SL ganharam todas (GBP 6/6, outras 11/11): o "100%" aparece em qualquer par sem SL. Das 10 GBP fechadas, 4 tinham SL e ganharam (01/10 x2, 04/10, 07/10); 5 GBP seguem abertas (-14,86). GBP fechadas+abertas: +36,90 em 15; demais pares: -27,82 em 39.
App, sinais encerrados desde 30/09: com GBP 61, 50,8% de acerto, +25,4 (GBP/USD 31, 45,2%; GBP/JPY 21, 52,4%); sem GBP 132, 41,7%, -104,3. Diferença de ~9 pontos, z ~1,2 sem agrupar por dia (não significativa). ANTES de 30/09 o app tinha GBP entre os piores (GBP/USD 53 sinais, 32%, -54,7).
Replay de 360 dias (06/10, 8 pares; GBP/JPY e EUR/GBP NÃO estavam): GBP/USD OFICIAL acerto 35% na exploração (n=404, -3,03 pips/op líquido) e 35% na validação (n=115, -3,26), um dos piores pares nas duas épocas. Ressalva: esse replay é anterior ao AJUSTE-090 (07/10), então o GBP/USD tinha TP = 1,5x o SL (35% de acerto com R/R 1,5 não é o mesmo que com R/R 1).
Leitura: GBP/USD parece o melhor em 15 dias e é um dos piores em 12 meses; sinal clássico de regime/janela curta. Não há base para tratar GBP como "onde está a vantagem" ainda; há base para TESTAR, agora com os dois pares GBP que faltavam.
PRÉ-REGISTRO H_GBP (escrito antes de baixar os candles e rodar):
 Dados: baixar 360 dias de candles de 5 min de GBP/JPY e EUR/GBP (previsto: modo `baixar`, ~44 créditos da KEY_3). [16/10: desnecessário; os candles dos dois já estavam guardados (359 dias) e o run de 6.31 já os usou]. Repetir o replay com os 10 pares e o código atual (GBP/USD já sem a exceção do TP 1,5x), agora com as linhas por par e com_GBP/sem_GBP.
 Hipótese: os pares com GBP (GBP/USD, GBP/JPY, EUR/GBP) têm expectativa líquida (spread, V0 TP/SL atual) maior que os demais, nas DUAS épocas (exploração até 17/06/2026, validação depois).
 Critério (todos juntos): (a) pips/op de "com_GBP" menos "sem_GBP" >= +1,0 nas duas épocas; (b) "com_GBP" melhor que o controle ALEATORIO, t agrupado por dia >= 3, nas duas épocas; (c) o sinal da diferença não inverte entre regimes de dólar (alta x baixa); (d) vale também em pelo menos 2 dos 3 pares GBP isoladamente. Falhou qualquer um = "testado e reprovado"; GBP continua só como observação.
 Também vale para as variantes sem SL do 6.31 (V3_TP_T10 como referência), porque é onde o 100% apareceu.
 Execução: o replay `semsl` do 6.31 (8 pares, em curso) fica como o protocolo original; a repetição com 10 pares é a execução da H_GBP, com as linhas por par e "com_GBP"/"sem_GBP" que passaram a sair em `replay/semsl` (grupos por par e por moeda foram acrescentados à saída em 15/10/2026, depois de iniciada a primeira execução e antes de qualquer resultado).

### 6.33 RESULTADO do pré-registro 6.31 (run 38823903979, 15/10/2026, replay de 360 dias, 10 pares: 08/10/2025 a 02/10/2026, exploração até 17/06/2026; 8.582 entradas; com taxas BIS) - critérios aplicados SEM ajuste
Leitura pelos critérios escritos antes: (a) pips/op líquido >= +0,5 nas DUAS épocas; (b) melhor que o ALEATORIO com t agrupado por dia >= 3 nas duas épocas; (c) conta com política P1/P4: >= 95% das janelas de 30 dias sem stop-out e equity mínimo >= 50%; (d) sinal estável entre regimes de dólar.
Fase A, OFICIAL, pips/op líquido de spread e swap base (exploração | validação), acerto, t agrupado:
 V0 ATUAL (TP/SL)   -2,74 (t -3,3) | -2,67 (t -1,7)   acerto 45,5% | 45,6%   vs controle -0,84 (t -0,9) | +1,23 (t 0,7)
 V1 TP prazo 3 d    -3,04 (t -1,7) | -2,26 (t -0,8)   acerto 68,8% | 65,9%   31% fecham no prazo; vs controle -1,17 | +6,44 (t 1,5)
 V2 TP prazo 5 d    -3,40 (t -1,5) | -5,44 (t -1,5)   acerto 75,9% | 72,1%   24% no prazo;       vs controle -2,59 | +7,74 (t 1,6)
 V3 TP prazo 10 d   -1,21 (t -0,5) | -9,44 (t -1,9)   acerto 83,2% | 79,0%   17% no prazo;       vs controle -2,32 | +4,36 (t 0,9)
 V4 stop 3x         -4,21 (t -3,0) | -2,17 (t -0,9)   acerto 72,2% | 72,7%   vs controle -2,02 | +3,40
 V5 stop 5x         -3,16 (t -1,6) | -4,58 (t -1,3)   acerto 82,2% | 79,6%   vs controle -1,71 | +4,31
 LAB: mesmo desenho e mesmos sinais (V0 -3,05/-3,16; V3 -0,36/-7,26).
Resultado: NENHUMA variante cumpre (a) (todas negativas nas duas épocas) nem (b) (maior t = 1,6). Em (c) e (d) já não importa, mas: o "vs controle" troca de sinal entre épocas em todas as variantes (negativo na exploração, positivo na validação) e o recorte por regime do dólar também (V0 dólar em alta: -4,21 na exploração e +0,97 na validação). Veredito: TESTADO E REPROVADO para o pipeline oficial.
O palpite registrado antes se confirmou em parte: acerto subiu muito (45% -> 66-83%) SEM melhorar a expectativa (ilusão do efeito disposição, como em 6.28: saída parcial subiu o acerto sem mudar os pips); mas o acerto ficou abaixo dos 85-95% que eu esperava porque 17-31% das operações chegam ao prazo sem bater o TP e fecham no prejuízo. A validação foi pior que a exploração nos prazos mais longos (V3: -9,44) e o controle aleatório foi ainda pior na validação (-13,8): o regime do dólar domina.
Cauda (OFICIAL, pips): MAE p90 129-209, p99 290-688, máximo ~1.040 na validação; pior perda individual -500 a -910 pips nas variantes sem stop (com lote 0,02 em par com USD cotado, 0,20 US$/pip: -US$100 a -US$180 por operação contra TP de US$5). Tempo até o TP: mediana 7 a 20 h; p90 de 2,5 a 6,7 dias.
Checagem do motor: V0 reproduz o app ao vivo (acerto 45,5% x 44% real; -2,7 pips/op x -US$6/dia ao vivo desde 04/10 contra -US$6/dia no replay).
Fase B (conta, lote 0,02, 1000:1, stop-out 50%, janelas de 30 dias): conta de US$100 com TODAS as entradas (P0): 2% a 10% das janelas sem stop-out e mediana final -91 a -210 em qualquer variante: a expectativa negativa a ~12 operações por dia esgota a conta (~-US$6/dia). Só políticas que rejeitam muitas entradas (P2: máx. 4 abertas; P3/P4: margem >= 300%) sobrevivem (56-69% das janelas sem stop-out), por operarem MENOS, não por ter vantagem. Conta de US$1.000: sem stop-out em ~100% das janelas em P1/P2/P4, porque o lote 0,02 usa pouco da margem (nível mínimo mediano 3.000-9.700%); mesmo assim o ano termina em 204-331 (P2 em V0, V1, V4) ou 246-473 em P1/P2 das variantes sem stop, ou seja, -50% a -80%. Única combinação acima de 1.000 no ano: V3 + P2 (1.103, +10%, 4 posições abertas no fim), mas a mediana das janelas de 30 dias é 967 e o P10 é 875; um caminho só, com 31 entradas por janela e entradas de expectativa negativa: tratar como acaso do caminho.
Limites: (1) CORREÇÃO (16/10/2026): este run já usou os 10 pares (`params.pares` do doc `replay/semsl` lista GBP/JPY e EUR/GBP; os candles dos dois já estavam guardados, o download de 16/10 pulou tudo: 'já guardado (359 dias)', 0 crédito). O cabeçalho deste item dizia '8 pares' por engano meu; o que tinha 8 pares era o replay de 06/10 (6.28), anterior à chegada dos candles desses dois. Este run não trazia linhas por par/GBP; a repetição de 16/10 (código com candles quebrados descartados e recortes por par) é a execução da H_GBP; (2) um candle com dado quebrado (MAE de 11.324 pips; provavelmente mínima 0) estava nos dados; afeta poucas entradas e foi tratado depois (AJUSTE-095: candles com preço <= 0 ou amplitude > 3% em 5 min são descartados; a repetição mostrará a sensibilidade); (3) o replay de 06/10 aplicava TP 1,5x ao GBP/USD (removido em 07/10): a repetição já usa o código atual; (4) a conta simulada marca o patrimônio no close e não soma o swap acumulado; (5) 1 ano, 1 regime de dólar por época.
Implicação para a observação do usuário (XM): o desfecho de 17 de 17 sem SL fechadas é o que o modelo prevê para "TP sem prazo" (acerto de 66-83% com as perdedoras ainda abertas), sem mudar a expectativa; a protegida pelo prazo ou pelo stop é a conta, não o lucro. Nada muda no pipeline oficial. O 6.31 fica como "testado e reprovado"; o uso manual sem SL continua sendo decisão do usuário, com o risco de cauda (pior perda de centenas de pips) registrado.

### 6.34 RESULTADO da H_GBP (6.32) e sensibilidade ao candle quebrado (run de 16/10/2026 00:19 UTC, 10 pares, mesmos 8.582 entradas, código do AJUSTE-095) - critérios aplicados SEM ajuste
Sensibilidade: 1 candle quebrado descartado. V0 (TP/SL atual) IDÊNTICO (-2,74 e -2,67 pips/op; acerto 45,5%/45,6%); variantes sem stop mudaram no máximo 0,05 pip/op; o MAE máximo caiu de 11.324 para 186 (V0) e 755 (V3, exploração). O resultado de 6.33 é robusto a esse dado.
H_GBP, OFICIAL, pips/op líquido (exploração | validação):
 V0 com_GBP -4,56 (t -3,7; n=973) | -2,42 (t -1,1; n=326)   sem_GBP -1,92 | -2,77   diferença com-sem -2,64 | +0,34   vs controle -1,78 (t -1,1) | +1,50 (t 0,5)
 V3 (TP até 10 d) com_GBP +0,56 | -15,02   sem_GBP -2,06 | -7,18   diferença +2,62 | -7,84   vs controle -1,82 | +9,10
 Por par (V0, exploração | validação): GBP/USD -3,26 | -3,56; GBP/JPY -5,58 | -2,30; EUR/GBP -9,19 | +4,41 (n=24).
Critérios: (a) diferença >= +1,0 nas duas épocas: FALHOU (V0 -2,64 | +0,34; V3 +2,62 | -7,84); (b) melhor que o controle com t >= 3: FALHOU (|t| <= 1,5); (d) 2 de 3 pares GBP isolados: FALHOU (nenhum par GBP é positivo nas duas épocas; GBP/USD e GBP/JPY são negativos nas duas). H_GBP REPROVADA. Na exploração, os pares com GBP foram o PIOR grupo do V0.
Todos os pares (V0, exploração | validação): EUR/USD -3,78 | -4,92; GBP/USD -3,26 | -3,56; USD/JPY +2,24 | -6,13; AUD/USD -2,53 | -3,38; USD/CAD +1,20 | +2,83; USD/CHF -2,13 | -2,04; NZD/USD -2,98 | -0,97; EUR/JPY -4,77 | -1,07; GBP/JPY -5,58 | -2,30; EUR/GBP -9,19 | +4,41. O único par positivo nas duas épocas é USD/CAD (n=183 e 66, acerto 53% e 55%), sem significância; é hipótese nova a pré-registrar, NÃO é achado (e na XM do usuário o USD/CAD foi o par das maiores perdas presas).
Leitura: o "100% de win" do GBP na XM e o bom desempenho de GBP nos 15 dias do app (50,8% de acerto) são janela curta/regime e efeito de operar sem SL (17 de 17 fechadas sem SL ganharam, GBP ou não); em 12 meses o sinal de GBP não é melhor, é pior. Nada a propor ao oficial.

### 6.35 Conta XM em 16/10/2026 (mercado fechado) e APLICAÇÃO DA REGRA 6.25: a 100a operação oficial fechou em 14/10 12:40 UTC
Conta XM (19:13 de São Paulo, planilhas do usuário): balance 176,88; equity ("Capital") 119,89; P/L não realizado -56,99; margem 7,54; nível de margem 1.590%; 4 posições abertas, todas sem SL. Fechadas: 50, líquido +97,97 (bruto +107,26; swap -9,29), 36 ganhos; sem SL 27 de 27 ganhos (+126,86), com SL 9 de 23 (-28,89). Conciliação: balance = 78,91 + 97,97 = 176,88 (a diferença constante de -21,09 em relação a 100 segue sem explicação; o usuário não lembra o que houve antes de 30/09: a conta foi criada com 1.000 e depois mudada para 100). Equity: +19,9% sobre 100, +51,9% sobre 78,91.
As 10 fechadas desde 15/10 19:18 foram todas TP (+46,58), entre 00:25 e 06:03 de 16/10 (sessão asiática/Londres); as 4 abertas restantes são as perdedoras: USD/CAD COMPRA 14/10 -22,22 e 09/10 -19,71 (TP a +177/+194 pips do preço atual), GBP/JPY VENDA 1.000 GBP -13,14 (TP a 266 pips), EUR/GBP VENDA -1,92. Duas delas estão do lado OPOSTO do sinal atual do app (app aberto: USD/CAD VENDA, GBP/JPY COMPRA). O usuário não entrou em nenhum sinal em 16/10; no app, os sinais de 16/10 (BRT) somaram 23, 9 WIN, 7 LOSS, 7 abertos, ~ -US$1 marcado a mercado: abster-se não custou nem economizou.
Sem SL (30 operações com sinal do app, fechadas+abertas): XM +66,32 contra app +0,32 nos mesmos sinais; dos 15 sinais que o app fechou em SL e o usuário manteve, 12 já bateram TP (+54,87) e 3 seguem abertos (-43,85). Mesmo padrão previsto pelo 6.33 (acerto alto, cauda nas que ficam).
REGRA 6.25 (contagem congelada ANTES de abrir os números: `regimeTPSL=CONFIG`, desde o zerar de 04/10 00:42Z, fechadas, ordem de fechamento; a 100a fechou em 14/10 12:40:00Z). Falha de processo registrada: o marco passou em 14/10 e eu não avisei na hora; antes do congelamento eu já tinha visto agregados (118 fechadas, -US$67,5, e 143, -US$22,5) em outras análises; o cálculo abaixo é mecânico e nada do pipeline foi alterado.
 Métrica primária (pips líquidos por operação, ATUAL, spread da tabela do Lab, IC 95% por bootstrap em BLOCOS DE DIA de abertura, 10.000 reamostragens): as 100 primeiras: n=100, 10 dias, acerto 41,0%, bruto -5,95 pips/op, LÍQUIDO -8,27 (IC95 -13,96 a -2,80). Metades: 50 primeiras -8,44 (IC -22,2 a +3,6); 50 seguintes -8,11 (IC -15,4 a -3,8). Controle ALEATORIO (placar do Lab, OFICIAL pós, cumulativo de 143): ATUAL -4,55 pips/op (t -1,8) contra ALEATORIO -5,24 (t -2,0): não supera o acaso. Saída mecânica da 6.25: R1 (limite superior do IC < 0 e não supera o ALEATORIO).
 Ressalva já registrada em 6.29 (reportar nº de dias; não concluir R1/R3 com menos de ~15 dias): as 100 têm 10 dias de abertura. Pela ressalva, a classificação vigente é R2 (INDETERMINADO por prazo): estender a 200 operações E >= 15 dias sem mudar nada e reaplicar a MESMA regra. Estimativa: 143 fechadas em 12 dias (~12/dia); 200 em ~5 dias de mercado, ou seja, por volta de 21/10; 15 dias completos em ~19/10.
 Descritivos (hipóteses, não decisões): as 43 fechadas após a 100a: acerto 65,1%, +7,03 pips/op líquido (IC 0,49 a 13,75; 3 dias). Por lado do dólar: 100 primeiras: cruzados 50% (n=34), dólar vendido 35% (n=37), comprado 38% (n=29); 43 seguintes: cruzados 83% (n=12), vendido 65% (n=23), comprado 38% (n=8). A melhora recente vem de dias de dólar fraco e dos cruzados: regime, 3 blocos de dia.
 Nota: o app mede SEM spread (143 fechadas: 48,3% e -US$22,5); com o atrito da corretora (~US$0,36 por operação na amostra da XM, 6.30) o líquido estimado fica na casa de -US$74.
Pergunta do usuário (16/10): "os resultados melhoraram depois das 100? o app aprendeu?" Verificação: (1) nenhum código de sinal mudou desde 04/10 (só o TP do GBP/USD em 07/10 e o quadro de mercado em 06/10); (2) as ENTRADAS do score são as mesmas: score médio 41,8 (100 primeiras) x 41,4 (43 seguintes), `pesoHistorico` médio -7,6 x -8,0, `historico` = RUIM em 96 de 100 e em 43 de 43 (o único mecanismo "adaptativo" do app, `historyAnalyzer`, é regra de ajuste de score pelo histórico do par, não aprendizado de mercado, e segue marcando "RUIM"); (3) os mesmos sinais de score baixo (0-44) passaram de 42% (n=72) para 69% (n=32) de acerto: o sinal não ficou mais seletivo, o mercado ajudou; (4) taxas diárias de acerto: 67, 27, 40, 59, 31, 33, 33, 45, 42, 53, 79, 56%; últimos 3 dias contra os 9 anteriores = +20,7 pontos, p = 0,029 por permutação de dias, mas o corte "últimos 3 dias" foi escolhido depois de ver os dados (janela mais favorável), então o p está inflado; 3 blocos de dia não separam regime de melhora real. Leitura: melhora real do resultado nos últimos 3 dias, SEM evidência de que o app tenha aprendido; coerente com dólar fraco (6.35, por lado do dólar).

### 6.36 Conta XM em 30/10/2026 (histórico de 85 operações, planilhas do usuário) e APLICAÇÃO da regra 6.25 às 200 operações (200a fechou em 22/10 11:00 UTC; não avisada na hora)
Conta (17:39 de São Paulo): balance = equity = US$11,88; 0 posições abertas; fechadas 85, líquido -67,03 (swap -16,83). Balance = 78,91 - 67,03 = 11,88 (a base de 78,91 segue sem explicação). De 176,88 (16/10) para 11,88: -93%; o pico de equity foi 119,89 em 16/10.
Desde 16/10 (35 operações, 15 ganhos, 42,9%): -165,00. TP: 15 ganhos, +75,23 (média +5,02); SL: 17 perdas, -175,97 (média -10,35); manuais: 3 perdas, -64,26 (as 3 posições presas de 16/10: 2 USD/CAD e 1 GBP/JPY, fechadas dias depois por -21,96, -24,47 e -17,83; o flutuante de 16/10 era -56,99). Perda média -5,32 -> -12,01; payoff 0,90 -> 0,42; acerto necessário para empatar 52,6% -> 70,5%; acerto real 42,9%.
O usuário ESTICOU o stop para ~US$10 (distância do SL = 1,99x a do TP; antes 1,04x) e fez 7 operações sem SL (4 ganhos, -43,69 com as 3 manuais). Grupos: SL ~2x: 28 operações, 11 ganhos, -121,31; sem SL: 7, -43,69; nenhuma com SL ~1x.
Mesmos sinais no app (33 de 35 pareadas): app -65,00 (5/5) contra XM -150,78 (a diferença a favor da XM de 6.30/6.35, +37 contra -21, inverteu). Nos 26 pareados com SL ~2x: XM -107,09 contra app -50,00; em 18 o app fechou em SL (-5) e o stop largo salvou 6 (TP) mas converteu 12 em perdas de ~-10 a -14 (gaps de reabertura de domingo: -13,58 e -11,41). JPY: 14 operações, 4 ganhos, -86,89 (52,7% do prejuízo); 22/10 EUR/JPY, EUR/JPY, USD/JPY vendidos: -28,21; 23/10 13:43-13:46 EUR/JPY, USD/JPY, GBP/JPY vendidos: -35,64 (3 apostas na mesma moeda abertas em 3 min). 19 das 35 entradas vieram em lotes de >= 2 em 10 min (-66,41); as 16 isoladas deram -98,59, ou seja, o stop largo pesa mais que o agrupamento. Pico de posições simultâneas das 35: 15 (23/10 14:48). O Lab já havia medido (6.33) que stop largo (3x) sobe o acerto (72%) sem melhorar a expectativa (-4,21 e -2,17 pips/op); a conta demo repetiu o padrão.
REGRA 6.25 às 200 (mesma metodologia de 6.35: `regimeTPSL=CONFIG`, desde 04/10 00:42Z, ordem de fechamento, spread da tabela do Lab, bootstrap em blocos de dia): as 200 primeiras: 17 dias, acerto 48,5%, bruto -0,83, LÍQUIDO -3,15 pips/op, IC95 [-8,89; +2,27] (contém zero). Controle (placar do Lab, OFICIAL pós, cumulativo de ~295): ATUAL -3,71 (t -2,0) x ALEATORIO -5,37 (t -3,0): não perde para o acaso. Classificação: R2 (INDETERMINADO) de novo. Faixas: 101a-200a: 56,0%, +1,98 pips/op (IC [-7,61; 10,78]); 201a-299a: 49,5%, -3,96 (IC [-7,04; +1,55]). Todas as 299 (24 dias): 48,8%, -3,42 (IC [-7,39; +0,17], o limite superior só encosta em zero); US$ do app (sem spread) -32,5. A melhora de 15-16/10 NÃO se sustentou (confirma a leitura de regime de 6.35: o app não "aprendeu").
Falha de processo registrada: o marco das 200 (e dos 15 dias) passou em 22/10 sem aviso meu; a regra não define o que fazer se o resultado de 200 for R2 de novo. PROPOSTA (precisa de decisão do usuário): fixar o desfecho final em 400 fechadas E >= 30 dias (por volta de 08-10/11), mesma métrica; R1 ou R3 mecânicos nesse ponto; R2 de novo = encerrar o experimento como "sem vantagem demonstrada nem refutada" e decidir o produto com o usuário.

### 6.37 DECISÕES DE 31/10/2026: conta XM nova, checagens mecânicas, arquivo do Laboratório ao vivo e pré-registro do SINAL POR IA
Decisões do usuário (31/10/2026): (1) nova conta demo XM com US$1.000, lote 0,02, TP/SL 5/5 dólares como o app mostra; (2) "seguir o que o app pede" = pegar os sinais sem olhar o gráfico; (3) checagens com decisão MECÂNICA sempre (400 fechadas E >= 30 dias, por volta de 08-10/11; ~700; 1.000 como teto), mesma métrica e mesmas regras de 6.25; (4) arquivar o Laboratório ao vivo e desligar o rotulador; (5) criar o sinal por IA (item abaixo), com os cuidados 1-6 combinados.
Nota do usuário: "nem sempre consigo entrar no sinal na hora, às vezes não vejo". Regra para a conta nova: a conta XM mede o ATRITO real (spread, swap, deslizamento) e a execução; o desempenho do SINAL é o que o app grava no `historico` (não depende de o usuário ter entrado). Entrar até ~15 min depois do aviso, no preço do mercado, sem olhar o gráfico; se perdeu o sinal, pular e anotar (não escolher sinais pelo humor). Sem esticar o stop, sem fechar à mão (exceção anotada), sem duplicar par.
Sobre restringir a IA "aos pares que mais acertaram": NÃO. Evidência: no oficial (299 fechadas), o ranking dos 10 pares por pips/op líquido entre a 1a e a 2a metade tem correlação de postos de Spearman 0,19 (sem relação): EUR/GBP, AUD/USD e USD/CHF lideravam na 1a e a 2a metade trocou quase tudo (EUR/JPY de 0,0 para -14,4; USD/CAD de -11,9 para +7,4). Escolher pares pelo passado é escolher ruído (mesmo vício de GBP em 6.32/6.34). A IA vê todos os pares, ou uma lista fixada ANTES por regra independente do resultado.
ARQUIVO do Laboratório ao vivo (nada foi apagado): `placar/*` e `replay/*` (públicos) copiados para `DOCUMENTACAO/arquivo-lab/2026-10-31/` (2,3 MB; `replay/familias`, `familias_rep` e `diario` já haviam sido sobrescritos por republicações do replay: os números de 6.18-6.24 estão neste caderno); workflow manual `lab-arquivar.yml` (`lab/arquivar.js`, só leitura) exporta `entradas`, `resumo`, `controle`, `diario` como artefato de 90 dias; `candles` (360 dias, 10 pares) FICAM no Firestore do LAB (replay e testes futuros). Cron do rotulador (hora em hora) e da recontagem (diária) desligados; ambos seguem manuais. A aba Laboratório mostra o aviso de arquivado.

### 6.38 PRÉ-REGISTRO: SINAL POR IA (desafiante do app; escrito ANTES de implementar e de qualquer sinal)
Pergunta: um sinal gerado por um modelo de linguagem, lendo SÓ os dados que o scanner já salvou até aquele instante, tem expectativa líquida melhor que (a) o ALEATORIO e (b) o sinal do app, com as MESMAS barreiras (TP/SL da Config: US$5/5, lote 0,02) e o MESMO custo (tabela de spread do Lab)?
Prior do autor (registrado antes): o aleatório chega perto do app (6.28) e filtros de contexto não separaram operações boas das ruins; um modelo lendo os mesmos indicadores tem boa chance de ficar parecido com o app. É barato de testar, e por isso se testa.
Desenho:
 - SÓ para frente (forward). Nenhum backtest do que a IA "diria" em dados passados (viés de olhar para o futuro por memorização do treino; a literatura de viés de look-ahead em modelos de linguagem em finanças trata disso, p. ex. Glasserman e Lin 2023, Sarkar e Vafa 2024, citados de memória: conferir).
 - Dois usos separados: (i) AVALIAÇÃO = disparo PROGRAMADO em horários fixos nas janelas de operação (os horários e a lista de pares são fixados antes e não mudam); só estes contam. (ii) BOTÃO "sinal por IA" = uso do usuário, `origem: "BOTAO"`, registrado mas EXCLUÍDO da avaliação (o clique depende do humor).
 - Entrada do modelo: últimas análises salvas pelo scanner (indicadores, tendência, score, preços) dos 10 pares; nenhuma consulta nova à TwelveData (cota já no limite); sem notícias, sem web. Saída: JSON {decisao: COMPRAR|VENDER|SEM_SINAL, par, confianca (0-100), motivo (até 300 caracteres)}; TP/SL/lote vêm do `moneyManager` (iguais aos do app). SEM_SINAL é registrado e conta como abstenção (não entra na média de pips).
 - Registro: coleção `historico_ia` (NUNCA em `historico`: o app aprende com o histórico por par e a contagem oficial exige `regimeTPSL=CONFIG`); cada sinal guarda modelo, versão do prompt (hash), instante, id do snapshot de entrada, tokens/custo e origem.
 - Fechamento: mesma lógica do verificador (preço do alvo exato, sem spread no registro; o spread da tabela entra na métrica). Controle ALEATORIO: mesma hora, mesmo par e mesmas barreiras com direção sorteada por hash do id. Comparação pareada também com o sinal do app mais recente do mesmo par na mesma janela.
 - Métrica primária ÚNICA: pips líquidos por operação (IA), IC 95% por bootstrap em blocos de DIA, reportando o número de dias.
 - Decisão mecânica (mesma estrutura de 6.25): ao fechar 100 sinais da IA E >= 15 dias: R1 (limite superior do IC < 0 ou não supera o ALEATORIO) = a IA não tem vantagem demonstrada, encerra; R3 (limite inferior > 0 e supera o ALEATORIO) = segunda amostra independente de 100 antes de qualquer conta; R2 = estende UMA vez a 200 e >= 30 dias, depois decisão final mecânica (R2 de novo = encerra como "sem vantagem demonstrada nem refutada").
 - Custos: teto de chamadas por dia e de gasto por mês definidos antes de ligar; log de tokens; modelo escolhido pelo menor custo que cumpra o formato; preço a conferir na tabela oficial (não citado aqui).
 - Nada altera o pipeline oficial, o scanner, o checker nem a contagem 6.25. Requisitos do usuário para ligar: chave da API do modelo como secret do GitHub e teto de gasto.

Ajuste de implementação do 6.38 (02/11/2026, ANTES do primeiro sinal, depois de o teste de mercado aberto devolver DADOS_VELHOS): o scanner não grava `analises` de par com posição aberta/cooldown (regra "um aberto por par"), então a qualquer hora vários pares ficam sem análise nova (medido 02/11 11:30 UTC: 1 de 10 pares com análise < 45 min; GBP/USD a cada 5 min, os demais parados há 111-595 min). A janela de análise passou de 45 min para 240 min (mínimo 3 pares, era 5), cada par leva a IDADE da análise e o resumo de mercado `scanner/mercado` (preço atual e variação de ~1 h; só se atualizado há <= 30 min) entra como complemento; o prompt manda descontar indicadores com mais de ~60 min. Bug achado e corrigido no mesmo dia: `null` virava 0 na entrada do modelo. O que não muda: só pares com análise na janela podem ser escolhidos (TP/SL vêm da análise), mesma métrica, mesmos tetos.

## 7. Pendente do usuário

- Material do amigo e ebooks: RECEBIDOS e lidos em 03/10 (seção 6). Falta o usuário escolher
  quais experimentos (E1-E5) quer e em que ordem.

### 6.38b FATO VERIFICADO: história real dos saldos da conta XM (exportador MT5, 03/11/2026)

Fonte: primeiro resumo real do exportador (`scripts/xm/ler.js`, workflow `xm-ler`, runs 41738990041 e 41740533374), 85 posições fechadas e 3 movimentos de saldo na janela de 120 dias. O saldo calculado (movimentos + líquido das fechadas) bate com o real: 1000,00, diferença 0,00. Isso valida o pareamento nos dados reais.

- **A conta "nova" de US$ 1.000 é a MESMA conta demo antiga, com saldo redefinido ("Definir saldo", `SetCustomBalance`).** Linha do tempo (UTC): 01/10 00:51 depósito de **US$ 10.000** (não de 1.000 como se lembrava); 02/10 19:12 saldo redefinido para **US$ 100,00**; **31/10 00:29:49 saldo redefinido para US$ 1.000,00**.
- **Diferença de −21,09 do cruzamento antigo: EXPLICADA.** As 8 operações de 01/10 (antes da redefinição para 100) somam exatamente +21,09 e ficaram embutidas no saldo apagado: 100 = 78,91 + 21,09.
- As 85 fechadas vão de 01/10 03:16 a 29/10 12:24 UTC (líquido −67,03; 49 TP, 31 SL, 5 fechadas à mão; SL esticado e entradas manuais misturadas). **Todas anteriores à redefinição de 31/10: NÃO entram na contagem do teste novo.**
- **Marco de partida do teste novo: 2026-10-31T00:29:49Z.** Até a leitura de 03/11 23:37Z: 0 posições fechadas e 0 abertas depois desse marco (o usuário ainda não operou os sinais na conta). Ao medir, filtrar `fechadoUtc >= 2026-10-31T00:29:49Z`.
- Higiene: o comentário do depósito traz o número da conta e foi impresso no log público do run 41740533374 (repositório público). O leitor passou a mascarar sequências de 5+ dígitos nos comentários.

**Decisão do usuário (04/11/2026):** a conta é a antiga, com o saldo definido em US$ 1.000 para começar os novos testes; **desconsiderar todo o histórico anterior a 2026-10-31T00:29:49Z** e trabalhar só sobre os US$ 1.000 de agora. Implementado: `scripts/xm/ler.js` (`MARCO_TESTE_UTC`, `testeAtual`) mostra no log só o bloco `testeAtual` (operações fechadas desde o marco: n, acerto, líquido, média por operação, por motivo e por par). Os logs e artefatos dos dois primeiros runs (que traziam o número da conta) foram apagados a pedido. O usuário segue operando os sinais do app (lote 0,02, TP/SL de 5 dólares) e a avaliação do app continua sendo a regra 6.25 sobre o `historico` oficial; a conta XM mede execução real (atraso, spread, swap) de um subconjunto, não substitui essa avaliação.

### 6.38d PRIMEIRO CRUZAMENTO XM x APP COM OPERAÇÕES REAIS DO TESTE (04/11/2026, `scripts/xm/cruzar.js`, workflow `xm-cruzar`)
Duas operações fechadas desde o marco (31/10 00:29:49Z), ambas VENDA, lote 0,02, TP/SL de ~US$ 5/5 registrados corretamente pelo exportador (SL de US$ 5,01 e 4,98), ambas perdidas (SL), saldo US$ 990,01.
- **EUR/JPY VENDA:** sinal do app 04:20:41Z (score 37), entrada XM 05:06:12Z = **atraso de 45,5 min**; derrapagem de preço 12,5 pips; app fechou 06:20Z (LOSS, -US$ 5), XM SL 07:32Z (-5,01).
- **AUD/USD VENDA:** sinal do app 02:30:38Z (score 36), entrada XM 05:04:14Z = **atraso de 153,6 min**; app fechou 07:00Z (LOSS, -US$ 5), XM SL 07:41Z (-4,98).
- Os dois sinais ainda estavam ABERTOS no app quando o usuário entrou (operações válidas como teste), mas as duas entradas foram **atrasadas** (45 e 154 min; entradas às ~02:05 de Brasília). Com n = 2 não há conclusão sobre o app; o que o dado mostra é o problema estrutural: o subconjunto operado à mão depende de o usuário estar disponível (sinais de 23:30 e 01:20 de Brasília), o que enviesa o que a XM mede e mistura o efeito do atraso com o do sinal.
- Os TP/SL da XM seguiram os pips do app (39,4/39,6 e 25,2/24,8 contra 39,4/39,4 e 25/25 do app), ou seja, o usuário recalculou a partir do preço em que entrou, correto para um sinal atrasado.
- O cruzamento passou a marcar `entradaAtrasada` (> 15 min, limiar descritivo, não pré-registrado) e `appJaEncerradoNaEntrada`.

Adendo ao pré-registro 6.38 (04/11/2026, ANTES de qualquer sinal PROGRAMADO): (1) prompt v2 (preços do resumo de mercado identificados como defasados e com a idade); (2) regra de bloqueio por preço defasado: o sinal não abre se o preço de entrada estiver a mais de 0,4 x SL pips do preço que o modelo viu (resumo ou análise); fica registrado como PRECO_DIVERGENTE e fora da métrica, mas CONTADO no relatório (taxa de bloqueio). Motivo: o teste de 04/11 mostrou 12,3 pips de diferença entre o preço visto pelo modelo e o da entrada (AJUSTE-103).

Adendo ao pré-registro 6.38 (05/11/2026 ~10:30 de Brasília, decisão do usuário "pode rodar o cron"; horários e regras FIXADOS ANTES do primeiro sinal PROGRAMADO): disparo programado do sinal por IA em `.github/workflows/ia-programado.yml`. GERAR de segunda a sexta às 08:07, 10:07, 12:07, 14:07, 16:07 e 18:07 UTC (6 por dia, logo depois do ciclo do scanner); FECHAR de segunda a sexta a cada 30 min (prazo máximo de 10 dias por sinal). Modelo claude-haiku-5-5 (sem troca durante a avaliação), prompt v2, bloqueio de preço de 0,4 x SL, os 10 pares do app sem filtro (a IA só vê os com análise de até 4 h e o mínimo de 3), tetos de 24 chamadas/dia e US$ 4/mês. SÓ a origem PROGRAMADO entra na avaliação; qualquer execução manual do workflow é obrigatoriamente MANUAL_TESTE (trava no próprio workflow). A taxa de SEM_SINAL, DADOS_VELHOS e PRECO_DIVERGENTE é contada e reportada. Avaliação: mesma métrica e controle ALEATORIO do pré-registro, quando houver sinais fechados suficientes (a ser contado e anunciado; nenhuma decisão antes disso). Se o modelo, o prompt, os horários ou o limite de preço mudarem, a avaliação recomeça do zero.
Correção do adendo acima (05/11/2026 ~15Z, ANTES de qualquer sinal PROGRAMADO): o `schedule` nativo do GitHub não disparou (cron nativo não confiável neste repositório). Mecanismo trocado, mesmos horários e regras: a IA roda como passo do ciclo do scanner (a cada 5 min, pinger externo), só dentro de janelas fixas (GERAR: do horário 08:07/10:07/12:07/14:07/16:07/18:07 UTC até +25 min, ou seja, no primeiro ciclo do scanner depois do horário; FECHAR: :00 e :30 até +10 min; seg-sex), UMA vez por horário (reserva atômica em `ia_agenda`). O desfecho de cada horário (SINAL, SEM_SINAL, DADOS_VELHOS, BLOQUEADO, PRECO_DIVERGENTE, ERRO) fica registrado em `ia_agenda` para a taxa de cada um. Nenhuma regra de decisão mudou. Horário perdido (scanner fora do ar na janela) é horário perdido, não é refeito depois (refazer em hora diferente seria escolher).

### 6.38e CHECKPOINT DO MARCO DAS 400 EM 08/11/2026 (392/400) E PRÉ-REGISTRO DO USO DO ALEATORIO (escrito ANTES da 400ª fechar)
Leitura do `historico` por admin (workflow `marco-625`, 08/11 15:01Z, 970 documentos): **392 fechadas CONFIG** desde 04/10 00:42Z (faltam 8), 9 abertas, 35 dias corridos (condição de 30 dias já cumprida), última fechou em 06/11 17:35Z (fim de semana: nada fechou desde então; o mercado reabre domingo 22:00Z). 100ª em 14/10 12:40Z, 200ª em 22/10 11:00Z. TODAS (392; 30 blocos de dia): acerto 48,5%, bruto -0,83 pips/op (IC95 -4,03 a +2,26), LÍQUIDO -3,17 (IC95 -6,39 a -0,09), US$ -57,5 no app sem spread. Previsão da 400ª: segunda 09/11 (9 abertas e novos sinais); checagem agendada para 09/11 09:00 de Brasília.
**Achado de leitura (não é decisão):** o limite superior do IC líquido veio caminhando para zero: -0,70 (364 fechadas, 05/11), -0,11 (390), -0,09 (392). Com 8 operações restantes, a classificação pelo critério do IC (R1 = limite superior < 0) está **no fio da navalha**: a 400ª pode cair de um lado ou do outro por poucas operações. Isso é motivo para NÃO interpretar antes da hora e para fixar agora, antes de existir a 400ª, como o ALEATORIO entra.
**Falha de processo registrada:** a regra pede "congelar a contagem antes de abrir os números". Os números acumulados já estão sendo vistos (o relatório diário do Telegram, AJUSTE-110, mostra o acumulado desde 05/11, e eu li 364, 390 e 392). O que continua protegido: a janela são as 400 PRIMEIRAS por ordem de fechamento (ninguém escolhe depois), a métrica e o spread são os mesmos, e nada do pipeline mudou. O que NÃO está protegido: o viés de quem já viu a trajetória. Fica dito.
**Pré-registro do ALEATORIO nas 400 (fixado agora):** o controle ALEATORIO só existe no placar arquivado do Laboratório (`DOCUMENTACAO/arquivo-lab/2026-10-31/placar__atual.json`, gerado em 30/10 20:46Z; rotulador desligado em 31/10), ou seja, cobre só as ~295 primeiras operações oficiais, não as 400. Regra: a comparação "supera o ALEATORIO" é feita **apenas na janela comum** (ATUAL nas mesmas ~295-299 primeiras contra o ALEATORIO do placar, por `estatisticaT`, como em 6.35/6.36: último valor conhecido ATUAL -3,71 t -2,0 x ALEATORIO -5,37 t -3,0 em ~295); para 300-400 não há controle e isso será dito. Combinação: **R1** se o limite superior do IC das 400 for < 0 OU o ATUAL não superar o ALEATORIO na janela comum; **R3** se o limite inferior > 0 E superar; **R2** nos demais casos. R2 pela terceira vez = encerrar como "sem vantagem demonstrada nem refutada" e decidir o produto com o usuário (6.36).

### 6.39 MARCO DAS 400 ATINGIDO (09/11/2026): APLICAÇÃO MECÂNICA DA REGRA 6.25 => R1 (sem vantagem demonstrada)
**Congelamento:** a 400ª fechada CONFIG (desde o zerar de 04/10 00:42Z, ordem de fechamento) fechou em **2026-11-09T08:20:00Z** (campo `marcos["400"]` do `marco-625`). Leitura do `historico` por admin em 09/11 12:01Z (978 documentos): 402 fechadas, 7 abertas, 36 dias corridos desde 04/10 (>= 30), 32 blocos de dia nas 400. A janela são as 400 PRIMEIRAS por ordem de fechamento (determinística; as 2 seguintes ficam fora). O log do workflow imprime contagem e métricas juntas; a contagem congelada é a deste parágrafo, e a regra (6.38e) foi escrita antes da 400ª existir.
**Métrica primária (400 primeiras; pips líquidos por operação; spread da tabela do Lab; IC95 por bootstrap em blocos de dia, 10.000 reamostragens):** acerto 48,0%; bruto -1,12 pips/op (IC95 -4,28 a +1,85); **LÍQUIDO -3,47 (IC95 -6,63 a -0,50)**; US$ -77,5 no app sem spread. TODAS (402): -3,30 (IC95 -6,44 a -0,34). Janelas anteriores inalteradas: 100 primeiras -8,27; 200 primeiras -3,15.
**ALEATORIO (placar arquivado, janela comum ~295; recalculado do arquivo, reproduz 6.36):** ATUAL n=295, -3,71 pips/op (t -2,04; acerto 44,1%) x ALEATORIO n=296, -5,37 (t -2,98; acerto 39,9%). Diferença pontual +1,66 pips/op a favor do ATUAL, sem significância (erro-padrão da diferença ~2,5 se independentes). Não há controle para as operações 296-400.
**Classificação (6.25 + pré-registro 6.38e): R1**, porque o limite superior do IC das 400 (-0,50) é < 0. O ALEATORIO não é decisivo: R1 já vale pelo IC; "supera o ALEATORIO" só por estimativa pontual. Não é R3 (limite inferior não é > 0) nem R2.
**Consequências da R1 (texto da 6.25):** conclusão "o sinal atual não tem vantagem demonstrada"; dinheiro real fora; a fila de ajustes NÃO é otimizada em cima destas mesmas 400 (seria dentro da amostra); próximo passo é decisão de PRODUTO com o usuário e, se houver nova premissa, teste em período separado (exploração x validação). Nada do pipeline foi alterado.
**Ressalvas honestas (leitura, não decisão):** (1) com 32 blocos de dia o bootstrap tende a dar intervalo estreito demais; o limite superior (-0,50) esteve em -0,09 com 392 fechadas, ou seja, a margem de R1 é pequena. (2) O bruto tem IC que contém zero: "sem vantagem demonstrada" não é "vantagem excluída"; o que torna o líquido negativo é o CUSTO (diferença ATUAL x ATUAL_SEM_SPREAD ~3 pips/op na janela comum: -3,71 x -0,74). (3) O spread da tabela do Lab nunca foi conferido na XM; os dois spreads reais medidos pelo executor (USDJPY 2,8 e EURJPY 3,9 pips, ~00Z de 06/11) estão acima da tabela (1,95 e 2,6), amostra mínima; se o custo real for maior, o líquido piora. (4) As demais variantes do placar (INVERSO -1,04, TP_CURTO, ESCALA_2X etc.) são exploratórias, sobre as MESMAS ~295 operações, com ~19 variantes (Bonferroni): NÃO autorizam inverter o sinal nem trocar TP/SL. Nenhuma variante do placar teve média positiva; a melhor foi ATUAL_SEM_SPREAD (-0,74, t -0,41).
**Pendente:** decisão de produto com o usuário. O Sinal por IA segue em avaliação separada (6.38), sem relação com esta decisão.

### 6.40 RELATÓRIO DESCRITIVO DAS 400 PRIMEIRAS (09/11/2026, pedido do usuário "antes de qualquer decisão"; `scripts/relatorio/analise400.js`, workflow `analise-400`)
Somente leitura, mesma seleção da 6.39. **Tudo descritivo** (dezenas de cortes; algum sempre parece padrão por acaso). Horários em Brasília pela abertura do sinal.
- **Totais:** 192 WIN (+5.784 pips brutos, +5.330 líquidos, +US$ 962,5 no app) x 208 LOSS (-6.233 brutos, -6.717 líquidos, -US$ 1.040). Saldo: -449 pips brutos, -1.387 líquidos, -US$ 77,5. Média de pips do WIN (30,1) ≈ média do LOSS (30,0): o resultado é decidido pela taxa de acerto (48%) contra o empate de 54,1%.
- **Invertido** (397 simétricas TP=SL: o sinal oposto teria o resultado oposto): acerto 51,9%, bruto +1,10 pips/op, **líquido -1,25 pips/op**. Inverter também perderia: o custo (spread) é maior que o desvio do acerto em relação a 50%.
- **Por par (acerto; líquido/op):** AUD/USD 65,2% (+5,56; n=23), EUR/GBP 53,8%, GBP/USD 53,6%, GBP/JPY 53,0%, USD/CAD 48,3%, USD/JPY 47,1%, USD/CHF 45,8%, EUR/JPY 43,2%, EUR/USD 36,5% (-8,53; n=52), NZD/USD 36,4% (-9,12; n=22). Com 10 pares e ~48% de base, os extremos estão a ~1,6-1,7 desvio-padrão, o que se espera de 1-2 pares por acaso.
- **Por dia da semana (acerto):** dom 40,6% (n=32), seg 50,0%, ter 44,6%, qua 47,1%, qui 54,8% (n=93, único com líquido >= 0: +0,14), sex 45,5%. Nenhum fora do esperado por acaso.
- **Por hora:** horas vizinhas com resultados opostos (21h 38,6% n=44 x 22h 65,2% n=23; 5h 66,7% n=27 x 6h 40,9% n=22), assinatura de ruído. WIN e LOSS se concentram nas mesmas horas (4h, 10-11h, 21h) porque é quando sai a maioria dos sinais.
- **Lado do dólar:** apostas em dólar forte (comprado) 43,0% (-5,85/op, n=121); dólar fraco (vendido) 50,3% (-1,77, n=143); cruzados 50,0% (-3,13, n=136).
- **Dias (32):** 12 positivos e 20 negativos. Os 5 melhores (15/10, 26/10, 22/10, 20/10, 07/10) tiveram ADX médio 33,7 e sinais mais concentrados no MESMO lado do dólar (dias positivos 0,86 x negativos 0,77); os 5 piores (08/10, 05/10, 03/11, 30/10, 18/10) ADX 28,3 e direções mais misturadas (30/10: 0,50). Leitura: dias de tendência clara do dólar, em que o app aposta junto, rendem; dias picados, perdem. ATENÇÃO: a concentração só é conhecida no fim do dia (olhar para trás), não é filtro utilizável como está.
- **WIN x LOSS por operação:** score médio 42,58 x 42,50 (o score NÃO separa vencedores de perdedores), ADX 32,6 x 30,5, RSI 48,6 x 50,0, duração 918 x 834 min, candlestick 17% x 19%.
- **Conta XM desde 31/10 (`xm-cruzar`, 09/11):** 3 operações reais (manuais) AUD/USD V, EUR/JPY V, USD/CHF C; as 3 deram SL na XM e LOSS no app (3/3 coincidem), entradas 45-154 min atrasadas, derrapagem 2,1-12,5 pips, -US$ 14,62 no total. O executor segue em ENSAIO (sem ordens): 15/15 sinais casados em direção e TP/SL (6.38/ensaio 05/11). Amostra insuficiente para comparar resultado.
Hipóteses que podem virar pré-registro de uma amostra NOVA (não ajustar nada em cima destas 400): (H-a) operar só quando o ADX é alto E os sinais do momento concordam no lado do dólar; (H-b) excluir pares com custo alto em relação ao SL. Ambas precisam ser fixadas antes e testadas em período separado.

### 6.41 SEQUÊNCIAS, SL x TP, NOTÍCIAS DOS MELHORES DIAS e a ideia "9 pares novos, 100 sinais" (10/11/2026; perguntas do usuário; descritivo, nenhuma decisão)
**Sequências (400 primeiras; `analise400.js#sequencias`, run 42846304555):** na ordem de FECHAMENTO há rachas reais: 165 sequências contra 200,7 esperadas ao acaso (z -3,58), autocorrelação lag 1 = 0,18, maior racha 19 WIN e 10 LOSS; depois de WIN vem WIN 57,1% (n=191) e depois de LOSS vem WIN 39,4% (n=208). Mas na leitura UTILIZÁVEL (o que já estava fechado quando o sinal ABRIU) o efeito some: após WIN 47,4% (n=228), após LOSS 48,2% (n=168), após WW 45,7%, após LL 49,5%, após WWW 44,3% (n=88), após LLL 56,8% (n=74; z ~1,5). Causa: posições simultâneas apostam no mesmo lado do dólar e fecham juntas com o mesmo resultado; a racha é a MESMA aposta contada várias vezes, não um padrão que antecipe o próximo sinal. Único corte com alguma diferença: mesmo par após WIN 52,9% (n=189) x após LOSS 43,3% (n=201), z ~1,9, um entre 8 cortes (não significativo com correção); candidato a hipótese, não achado. Posição no dia: sinais 1-3: 50,5%; 4-8: 47,4%; 9+: 47,1%. Semanas: 05/10 39,1% (-9,4 pips/op); 12/10 52,9%; 19/10 48,1%; 26/10 50,7%; 02/11 46,0%.
**SL x TP nas 400:** 397 simétricas; as 3 assimétricas são GBP/USD de 05-06/10 com TP 37,5 > SL 25 (exceção removida no AJUSTE-090): 1 WIN, 2 LOSS. Não há nenhuma com SL > TP nem sem SL no app. O que já foi medido: placar ao vivo (295 ops) TP_CURTO (TP menor que o SL) acerto 57,3% e -4,33 pips/op (pior que o ATUAL -3,71); replay 360 dias pré-registrado (6.31/6.33, REPROVADO): stop 3x acerto 72% e -4,21|-2,17; stop 5x 82%|80% e -3,16|-4,58; sem SL com prazo 3/5/10 dias acerto 66-83% e -1,21 a -9,44 pips/op, pior perda -500 a -910 pips (-US$100 a -180 contra TP de US$5). Alargar ou tirar o SL sobe o acerto e não muda a expectativa.
**Custo por par (spread da tabela / SL):** USD/JPY 4,9% (empate 52,5%), USD/CAD 6,2%, EUR/JPY 6,6%, EUR/USD 7,2%, GBP/JPY 8,0%, AUD/USD 8,2%, GBP/USD 8,6%, NZD/USD 9,2%, USD/CHF 11,2% (empate 55,6%), EUR/GBP 13,1% (empate 56,5%).
**Notícias (busca na web em 10/11, leitura a posteriori, narrativa):** melhores dias: 15/10 = dia seguinte ao CPI dos EUA (14/10), dólar devolveu a alta (DXY -0,44%); 22/10 = dólar em queda com os juros dos Treasuries, antes do FOMC; 26/10 = dólar em alta no início da semana do FOMC; 20/10 e 07/10 sem relato específico encontrado. Piores: 30/10 = sexta pós-FOMC (28/10, juros mantidos) e PCE/PIB (29/10), dólar "pouco mudou"; 03/11 = eleições de meio de mandato nos EUA; 18/10 = domingo à noite (abertura, liquidez baixa); 05/10 e 08/10 sem relato específico. Notícia de alto impacto aparece dos DOIS lados: o que separa é haver direção depois, não haver notícia.
**Ideia do usuário (guardar as 400, ficar com o que foi melhor, 9 pares novos, 100 sinais):** contrapontos registrados: (1) "o que foi melhor" nas 400 não persiste nos nossos próprios dados (AUD/USD 65% aqui e -2,53|-3,38 pips/op no replay de 360 dias; H_GBP reprovada em 6.34; USD/CAD, único positivo nas duas épocas do replay, fez 48,3% aqui); (2) o problema medido não é o par: o score não separa WIN de LOSS (42,6 x 42,5) e o custo supera a vantagem de direção; pares novos (cruzados) tendem a ter spread maior (a conferir na XM); (3) 100 sinais não decidem: as 100 primeiras deram -8,27 com IC de ±5,6; detectar +2 pips/op exige ~800 operações. Alternativa proposta: pré-registrar e testar pares novos (e a hipótese de regime/ADX) primeiro no REPLAY de 360 dias (milhares de entradas, exploração x validação, controle ALEATORIO), medir o spread real dos candidatos no MT5, e só levar ao vivo o que passar. Aguardando decisão do usuário.

### 6.42 BUSCA AMPLA DE PADRÕES DE WIN/LOSS NAS 400 (10/11/2026, run 42849441474; `analise400.js#buscaPadroes`) e pergunta "MT5 x TwelveData"
Método: todos os 62 padrões de 1 a 5 resultados ("o que vem depois de ..."), com n >= 15, em 3 ordens (FECH = ordem de fechamento; ENTR = ao abrir, os últimos já fechados, a única utilizável; PAR = sequência de cada par), periodicidade "a cada N" (N = 2..8) e efeito de tempo. Significância por 1.000 permutações com correção da busca (estatística máxima), em dois nulos: embaralhado livre e embaralhado só dentro do dia. Base: 48,0% de acerto. 123 padrões testados.
- FECH: WWWWW -> 77,8% (n=27; p_fam 0,03 livre / 0,02 dentro do dia) e WWWW -> 73,0% (n=37; 0,04/0,02). Sobrevivem, mas é a ilusão já explicada em 6.41: posições abertas juntas, na mesma aposta, fecham juntas. Não utilizável.
- ENTR (utilizável): LWWW -> 25,0% (n=44, z -3,05, p_fam 0,03) e LLWWW -> 23,7% (n=38, mesmo padrão estendido). Ao mesmo tempo WWWW -> 62,8% (n=43) e WWW (todos) -> 44,3% (n=88): "3 WIN depois de um LOSS" seguido de perda e "4 WIN" seguido de ganho, sem mecanismo coerente. A correção foi por ordem; somando as 3 ordens e os 2 testes de periodicidade (5 famílias), o p fica ~0,15. Classificação: CANDIDATO a hipótese (possível "entrar depois que o movimento já pagou"), NÃO é achado.
- PAR: nada sobrevive (melhor: LW -> 60,0%, n=85, p_fam 0,38).
- Periodicidade: nada (melhor: a cada 5, posição 5 em FECH 60,0%, n=80, p_fam 0,42; em ENTR todos com p_fam >= 0,90).
- Tempo (descritivo, sem correção, 16 faixas): 2-6 h desde o último LOSS 36,6% (n=82, z -2,07) e 2-6 h desde o último WIN 36,1% (n=61, z -1,87); LOSS nas últimas 2 h: 0 -> 44,9%, 1 -> 47,1%, 2 -> 55,0%, 3+ -> 51,7% (sem padrão).
Próximo passo possível (não iniciado): pré-registrar "após LWWW o próximo perde mais" e testá-lo numa amostra independente: o replay de 360 dias tem ~8.600 entradas, mas o arquivo de 31/10 guarda só agregados (`replay__linhas_*` = placar por grupo), então exigiria rodar o replay de novo salvando o resultado por entrada; ou esperar ~1.000 operações ao vivo.
**MT5 x TwelveData:** o app julga WIN/LOSS com velas de 5 min do TwelveData; a XM, com o preço dela. Medido até aqui: 3 operações reais na XM desde 31/10, as 3 com o mesmo resultado do app (LOSS/SL); no ensaio do executor, o preço da XM no instante do sinal diferiu do preço do app em mediana 1,4 pip e até 20 pips (diferença de fonte, não de atraso), o que basta para virar o resultado de operações que passam perto do TP ou do SL (20-40 pips). Para medir nas 400: script `mt5/XM_ExportarBarras.mq5` (somente leitura, sem internet) exporta as barras M5 da XM dos 10 pares desde 04/10 com o spread de cada barra; com o CSV, refazer o julgamento de cada sinal (mesmo instante, mesmo TP/SL em pips, entrada no ask/bid da XM) e comparar WIN/LOSS e o custo real. Aguardando o usuário rodar o script.

### 6.43 TABELA "X W W" (10/11/2026, pedido do usuário; run 42852198621; `analise400.js#tabelaXWW`) e ideia "tudo de novo com candles do MT"
**Janelas de 3 sinais em sequência** (400 primeiras; ordem de ABERTURA = ordem em que saem; 398 janelas). "?WW" (posições 2 e 3 = WIN): **100 vezes** (25,1%); ao acaso (48% de acerto) seriam ~91,7 (z ~1,0: nada). O que ocupa a posição 1: WIN em 65 e LOSS em 35 (ao acaso: 48/52); logo a tripla WWW (65, 16,3%) aparece bem acima do esperado (11,1%) e LWW (35, 8,8%) abaixo do esperado (12%). É a mesma agrupamento de rachas de 6.41 (z -3,58 de sequências), não um padrão novo. Posição 4 (o que vem depois de ?WW): WIN 65,7% (65 de 99), mas na ordem de abertura os resultados das posições 2-3 podem ainda não ser conhecidos quando o sinal 4 abre; na leitura utilizável (só o já fechado) depois de WW o acerto é 45,7% (n=127, 6.41). Ordem de FECHAMENTO: 108 ocorrências (esperado 91,7; z ~1,9), posição 1 = WIN em 61 (56,5%).
**Quem antecede (posição 1 das 100):** por par, USD/CHF 18, GBP/JPY 17, EUR/JPY 14, GBP/USD 12, USD/JPY 11, AUD/USD 7, EUR/USD 7, USD/CAD 7, EUR/GBP 4, NZD/USD 3, proporcional à frequência de cada par na base (GBP/JPY 16,5%, GBP/USD 14%, EUR/USD 13%, USD/CHF 12%...), sem destaque (EUR/USD, 13% da base, só 7% aqui). Direção: BUY 53 x SELL 47. Lado do dólar: cruzado 35, vendido 33, comprado 32. Hora (BRT): 4h 19, 11h 11, 22h 10, 21h 9 (as horas de maior volume). Dia: quinta 30, quarta 21, sexta 18 (quinta tem 23% dos sinais e 30% aqui).
**Sequência completa** (W/L por ordem de abertura e de fechamento, 40 por linha) está no log do run 42852198621 (`XWWSEQ`).
**Ideia do usuário: repetir tudo com candles do MT (5 ou 1 min) para trabalhar "de igual para igual".** Registro da avaliação: (1) objetivo legítimo = fidelidade da medição (mesmo preço no sinal, no julgamento e na execução; bid/ask e spread reais); não é caminho para achar vantagem (o bruto é ~0 com TwelveData e nada indica que a fonte mude isso). (2) Para "igual pra igual" manter 5 min no SINAL (trocar para 1 min muda EMA/ADX/ATR, múltiplos de ATR e o peso do spread: seria sistema novo, duas mudanças ao mesmo tempo); usar 1 min só para JULGAR (qual nível, TP ou SL, foi tocado primeiro dentro da vela de 5 min; resolve o candle ambíguo). (3) Desenho limpo = "scanner sombra": MT5 exporta barras M5 (e M15) dos 10 pares ao banco do Lab; um workflow separado roda o MESMO código de análise e grava numa coleção própria (nunca no `historico` oficial), em paralelo ao oficial, mesmas horas. (4) Risco: o MT5 só existe no PC do trabalho; a parada de 06/11 (~11 h) teria zerado os sinais da sombra; o oficial segue na nuvem. (5) Passo 1 antes de construir: rejulgar as 400 com as barras da XM (script de exportação pronto, `XM_ExportarBarras.mq5`); se quase nada virar, a sombra não se paga. Aguardando o usuário.

### 6.44 REJULGAMENTO DAS 400 PRIMEIRAS COM AS VELAS DE 5 MIN DA XM (13/11/2026; run 43341484343; `scripts/xm/rejulgar.js`, CSV em `DOCUMENTACAO/arquivo-xm/xm_barras_m5.csv`)
Pergunta do usuário: o WIN/LOSS muda se o preço for o do MT5 e não o do TwelveData? Mesmos 400 sinais, mesmos TP/SL em pips a partir da entrada da XM, vela = BID, compra entra no ask e sai no bid, venda entra no bid e sai no ask; entrada na abertura da vela do sinal, julgamento da vela seguinte em diante.
**Arquivo:** 73.773 velas, 10 pares, 05/10 a 13/11 (servidor), sem linha inválida nem vela duplicada. FALHA DE COBERTURA: 7 pares (AUD/USD, USD/CAD, USD/CHF, NZD/USD, EUR/GBP, EUR/JPY, GBP/JPY) não têm velas de 06/11 00:25 a 13/11 00:00 (servidor): o MT5 só baixou o histórico completo dos pares com gráfico aberto (EUR/USD, GBP/USD, USD/JPY). Resultado: 377 dos 400 sinais têm dados (23 sem: 12 app WIN e 11 app LOSS). Fuso conferido: o servidor da XM é GMT+3 até 01/11 e GMT+2 depois (o preço da vela bate com o do executor no mesmo instante: EUR/USD +0,9 pip, EUR/GBP +0,6, GBP/USD +2,7; com GMT+3 daria 20-29 pips); a regra por data dá a menor diferença mediana (2,1 pips contra 2,56 e 4,6 dos fusos fixos).
**Matriz (377):** app WIN 180 -> XM WIN 149, LOSS 31; app LOSS 197 -> XM WIN 6, LOSS 191. Concordância 90,2% (340/377). Viradas 37 (9,8%): 31 WIN->LOSS x 6 LOSS->WIN, assimetria de custo (feed puro seria ~simétrico); espalhadas pelos 10 pares (EUR/JPY 6, EUR/USD 5, USD/CHF 5, GBP/JPY 5, NZD/USD 4, EUR/GBP 3, USD/CAD 3, AUD/USD 2, GBP/USD 2, USD/JPY 2). Nenhuma vela ambígua (TP e SL na mesma vela de 5 min): 0 em 377.
**Acerto:** app 47,7% (mesmos 377) x XM 41,1%. **Líquido (pips/op, IC95 por blocos de dia):** app com spread da tabela -3,56 (-6,92 a -0,43; bruto -1,22); XM julgado com bid/ask reais -4,92 (-7,81 a -2,30). A XM fica 1,36 pip/op pior que a estimativa do app; esperado pela teoria para o spread (~15,6 viradas líquidas) contra 25 observadas: ~1,5 desvio, dentro do ruído; não confirma nem refuta a tabela. O limite superior do IC vai de -0,43 para -2,30: a conclusão R1 (6.39) se mantém e fica mais forte com preços reais.
**Diferença de entrada app x XM (pips, positivo = pior na XM):** mediana +0,9 (p10 -3,7; p90 +4,8; n=377), em boa parte o meio spread. Os 10-20 pips do ensaio de 05/11 (GBP/JPY etc.) são exceção, não regra.
**Spread real das velas (mediana, pips; tabela do Lab entre parênteses):** EUR/USD 1,9 (1,8); GBP/USD 1,7 (2,15); USD/JPY 2,0 (1,95); AUD/USD 2,3 (2,05); USD/CAD 2,7 (2,2); USD/CHF 2,4 (2,3); NZD/USD 2,8 (2,3, estimativa minha); EUR/GBP 2,4 (2,45); EUR/JPY 2,7 (2,6, estimativa minha); GBP/JPY 3,0 (3,15). A tabela estava razoável (maior erro +0,5 em USD/CAD e NZD/USD). Por hora de Brasília a mediana é ~2,3 em quase todas as horas, mas no rollover explode: 17h p90 7,1; 18h mediana 5,4 e p90 16; 19h mediana 2,7 e p90 8,2 (o rollover vai das 18h em horário de verão dos EUA para as 19h depois de 01/11). Só ~6% dos sinais saem nessas horas (17h 2, 18h 18, 19h 6): efeito médio pequeno (~0,3 pip/op), mas é custo real que a tabela plana ignora. Limite: o campo spread do histórico de velas é uma amostra por vela, não o spread de cada tick.
**Leitura para a ideia "refazer tudo com candles do MT":** a diferença de FONTE (feed) é pequena (90% dos resultados iguais, entrada mediana a 0,9 pip) e o que vira é sobretudo CUSTO (spread), que não some trocando a fonte. Com 0 velas ambíguas em 377, julgar em 1 minuto também acrescentaria pouco. Um scanner sombra com velas do MT seria caro (o PC do trabalho vira ponto único de falha) para corrigir uma diferença pequena; fica registrado como NÃO recomendado agora. Trocar o sinal para 1 minuto é outra pergunta (sistema novo, exige pré-registro).
**Pendências:** (1) reexportar as velas dos 7 pares depois de abrir um gráfico M5 de cada um (fecha as 23 faltantes); (2) se o julgamento com bid/ask for adotado no app, é mudança de medição (resultChecker) e exige pré-registro e nova contagem.

### 6.45 PRÉ-REGISTRO (APROVADO pelo usuário em 13/11/2026: hipótese, critérios da Fase 0 e os mesmos 10 pares): SISTEMA NA BASE DE 1 MINUTO (13/11/2026; escrito ANTES de gerar qualquer sinal em M1)
Origem: decisão do usuário em 13/11/2026 ("vamos seguir na base de 1 minuto") depois do 6.44. Nada do pipeline oficial muda; tudo no Laboratório.
**Fatos que moldam o desenho (medidos nas velas M5 da XM, 04/10 a 13/11):** amplitude mediana de uma vela de 5 min (pips): EUR/USD 2,6; GBP/USD 3,1; USD/JPY 4,0; AUD/USD 1,9; USD/CAD 2,5; USD/CHF 2,4; NZD/USD 1,8; EUR/GBP 1,3; EUR/JPY 4,8; GBP/JPY 5,7. O spread mediano (1,7 a 3,0 pips) já é 50% a 185% da amplitude de 5 min; em 1 min (estimada por M5/raiz de 5, APROXIMAÇÃO) é 112% a 413%. Deslocamento mediano do preço em 15 min / 1 h / 4 h: EUR/USD 2,1 / 4,4 / 9,9 pips; GBP/USD 2,3 / 5,3 / 9,5; USD/JPY 3,0 / 6,1 / 14,2; GBP/JPY 4,2 / 8,8 / 19,5. O TP e o SL do app são de US$ 5 cada (25 pips em majores, 18 a 40 nos demais), ou seja, 2,5x o deslocamento mediano de 4 h; as operações duram ~14 h. Consequência: com spread de ~2,3 pips, um TP/SL na escala de 1 minuto (<= 5 pips) exigiria acerto > 70% para empatar; para o custo ficar <= ~10% do SL é preciso SL >= 20-25 pips, a escala de hoje. A base de 1 minuto muda o MOMENTO e o RUÍDO da entrada, não a escala do custo.
**O que no código depende do prazo:** `timeframe: "5min"` e `outputsize: 250` (scanner.js, marketData.js); velas "companhia" de 15 min por `getCandles(par, "15min")` com cache (pairAnalyzer.js); EMA 9/21/50/100/200 nas duas escalas; TP/SL definidos em US$ (moneyManager.js), não em volatilidade. O replay do Lab (`lab/replay.js`: `replayPar`, `agregar15`, passo de 3 velas) já injeta velas na análise; generalizar para M1 (companhia de 3 min, passo configurável) é viável, a confirmar ao implementar.
**Hipótese H_M1 (única):** o MESMO código, com velas de 1 min como base e velas de 3 min como companhia (mesma razão 1:3 de 5:15), indicadores com os MESMOS períodos, TP/SL de US$ 5/5, lote 0,02, mesma regra de uma posição por par e mesmos horários, tem pips líquidos por operação > 0 quando julgado com bid/ask reais de M1, e melhor que o ALEATORIO.
**Nada é ajustado:** nenhum parâmetro muda depois de ver resultado; não há exploração, a amostra inteira é validação.
**Dados:** velas M1 da XM dos 10 pares, de 04/10 a 13/11 (o MESMO período das 400, para comparar de igual para igual), exportadas por `mt5/XM_ExportarBarras.mq5` v1.10 (`Periodo = PERIOD_M1`, um arquivo por par). Reexportar também M5 para fechar as 23 sinais sem dados do 6.44.
**Fase 0 (backtest no mesmo período):** rodar o analisador sobre as velas M1, gerar os sinais, julgá-los no bid/ask de M1 (TP/SL em pips a partir da entrada da XM, como em 6.44), mesma métrica da 6.25 (pips líquidos/op, IC95 em blocos de dia, 10.000 reamostragens) e ALEATORIO (direção sorteada nas mesmas entradas). Reportar sinais por dia, acerto, bruto, líquido, IC e por semana.
**Critério da Fase 0 (para justificar gastar tempo ao vivo):** (a) líquido >= +0,5 pips/op; (b) limite inferior do IC95 > -1,0; (c) supera o ALEATORIO com t >= 2 por blocos de dia; (d) pelo menos 250 sinais (senão "inconclusivo"). Falhou (a) ou (b) = REPROVADO e encerra (não se tenta outro período, par ou parâmetro). Poder: com desvio de ~31 pips por operação, 250 sinais só detectam efeitos de ~5 pips/op; um efeito de 2 pips/op exigiria ~1.900 operações (~5 meses). A Fase 0 é portão de viabilidade, não prova.
**Fase 1 (só se a 0 passar):** scanner sombra ao vivo (MT5 exporta M1 para o banco do Lab, workflow separado, coleção própria, nunca o `historico` oficial), 400 fechadas e >= 30 dias, regra 6.25.
**Fora do escopo:** pares novos (teste separado depois, para não misturar duas mudanças); julgar em 1 min um sinal de 5 min (0 velas ambíguas em 377: 6.44).
**Expectativa registrada antes:** espero REPROVAR (o bruto em M5 foi ~0 e o custo pesa mais em M1). Se passar, a primeira explicação a testar é ruído de amostra pequena e regime de dólar, não mérito.
**Decisões pendentes do usuário:** (1) aprovar a H_M1 como está (mesmo código, M1 + M3, mesmos períodos); (2) aprovar os critérios da Fase 0; (3) mesmos 10 pares agora (comparabilidade) e pares novos num teste posterior.

### 6.46 SL x3 E REGRA DE GESTÃO DO DIA, SIMULADOS NAS 377 DAS 400 COM VELAS M5 DA XM (13/11/2026; run 43346061435; DESCRITIVO, não é teste pré-registrado)
Pedido do usuário: (1) rodar o teste da base de 1 minuto também com SL x3; (2) ideia de gestão: estimar a média de sinais por dia e encerrar o dia no que bater primeiro (ex.: 4 WIN ou 3 LOSS), com SL x3.
**SL x3 (mesmas entradas, TP igual, SL x3; julgamento bid/ask em M5; resultado em pips a partir da entrada da XM; swap NÃO modelado):** SL x1: 377 operações, acerto 41,1%, -4,92 pips/op (IC95 -7,81 a -2,30), 32% dos dias positivos, pior dia -308 pips, duração média 16 h. SL x3: 372 operações (5 sem desfecho até o fim dos dados), acerto 73,9%, -1,28 pips/op (IC95 -8,23 a +5,11), 55% dos dias positivos, pior dia -715 pips, melhor dia +404, duração média 57 h (2,4 dias). Aritmética: com TP 25 e SL 75 pips e spread ~2,3, o empate exige acerto de ~77,3% ((75+2,3)/100); observado 73,9%. A estimativa pontual melhora 3,6 pips/op, mas o IC (de -8,2 a +5,1) é compatível com zero e com SL x1; o replay pré-registrado de 12 meses (6.33, V4: -4,21 | -2,17 contra V0 -2,74 | -2,67) é a evidência mais forte e já deu "sem melhora". Cautelas: as 5 operações sem desfecho são cortes do fim dos dados (7 pares sem velas de 06 a 13/11; SL x3 segura mais tempo); o swap de 2-3 noites por operação não está nas contas; pior dia de -715 pips = ~US$ 143 com lote 0,02 (14% de uma conta de US$ 1.000).
**Regra de dia "4 WIN ou 3 LOSS" (regra A: ao abrir um sinal, se no mesmo dia de Brasília já FECHARAM 4 vitórias ou 3 derrotas das operações tomadas, o sinal não é tomado; as abertas seguem até TP/SL):** SL x1: tomados 226 (-4,19 pips/op; total -946), pulados 151 (-6,01 pips/op; total -907), baseline -1.853; dias positivos 39% contra 32%; pior dia -179 contra -308. SL x3: tomados 293 (-2,27 pips/op; total -665), pulados 79 (+2,38 pips/op), baseline -477: a regra PIOROU o total em 188 pips. O sinal do efeito inverte entre SL x1 e SL x3 e a diferença de médias entre tomados e pulados (SL x1: 1,8 pip/op, ~0,6 desvio) é ruído: compatível com a teoria (regra de parada não muda a esperança por operação; só muda quantas operações se faz e a forma da distribuição). O total melhora em SL x1 principalmente porque opera 40% menos (menos spread pago a esperança negativa). A regra morde pouco em SL x3 porque as operações demoram 57 h: ao abrir um sinal só 14% (mediana) das anteriores do dia já fecharam (SL x1: 50%).
**Probabilidade ilustrativa:** com TP 1u e SL 3u e acerto de 73,9%, "4 WIN antes de 3 LOSS" acontece em ~81% dos dias, mas o dia pode terminar vermelho (4 WIN e 2 LOSS = -2u) e a esperança por operação segue ~ -0,12u: muitos ganhos pequenos e perdas raras e grandes.
**Caminhos que a análise deixa abertos (hipóteses, não achados):** (a) gestão que reduz CUSTO e risco sem prometer esperança: teto de operações por dia, teto de exposição por lado do dólar (sinais correlacionados são uma aposta só), evitar 17h-19h de Brasília (spread do rollover) e pares com spread/SL alto (EUR/GBP 13%, USD/CHF 11%); (b) regime ex ante: o alinhamento no mesmo lado do dólar só era conhecido no fim do dia (6.40), mas pode ser medido ANTES, nas direções dos primeiros sinais do dia (não nos resultados, que chegam horas depois); hipótese a pré-registrar para amostra nova; (c) regra de dia só vale simulada por MARCAÇÃO A MERCADO (patrimônio flutuante minuto a minuto), que as velas M1 permitem, e não pelo resultado fechado (chega tarde). Qualquer braço adicional entra com correção para múltiplas comparações.

### 6.47 BUSCA HONESTA DE REGRAS DE GESTÃO: TREINO x TESTE (13/11/2026; run 43347488352; `scripts/xm/gestao-busca.js`; DESCRITIVO)
Pedido do usuário: achar uma configuração, diária ou semanal, que termine o período no lucro. Decisões do usuário: (1) SL x3 entra como braço secundário do pré-registro 6.45 (swap modelado, barra mais exigente por dois braços); (2) o teste de gestão vem depois da Fase 0, com no máximo 3 regras definidas antes, avaliadas por risco e custo (pior dia, dias positivos, operações por dia), não só por acerto.
**Método (grade fixa, escrita antes de rodar):** 72 combinações de multiplicador do SL (1, 2, 3; TP fixo) x sem as horas do rollover (17h-19h de Brasília) x sem pares de custo alto (EUR/GBP, USD/CHF: spread/SL > 10%) x teto de operações por dia (sem teto, 6, 3) x teto de posições abertas no mesmo lado do dólar (sem teto, 2); só informação conhecida na abertura de cada sinal; julgamento bid/ask nas velas M5 da XM; 377 operações; TREINO = primeiros 15 dias, TESTE = últimos 16 dias; a escolha é feita no treino e avaliada no teste.
**Base (SL x1, sem regra):** treino -5,48 pips/op (27% dos dias positivos; 1 de 4 semanas positiva), teste -4,37 (38%; 1 de 4).
**Melhores 5 do treino (todas SL x3 com teto por dia e por lado):** treino +15,56 (n=41, acerto 90%, 71% dos dias positivos, 3 de 4 semanas positivas) -> teste -2,90 (n=43, acerto 72%, pior dia -268); +11,38 -> -6,08; +11,20 -> -0,59; +8,50 -> +0,03; +6,98 -> -5,32. Média dos 5 melhores do treino no teste: -2,97.
**Persistência:** correlação de postos treino x teste de -0,22 (o ranking do treino NÃO prevê o teste; levemente invertido); 31% das combinações positivas no treino e 36% no teste; mediana de todas -3,23 no treino e -2,56 no teste. As melhores do TESTE (SLx3 +semRollover +semParesCaros +max6/dia: treino +1,86 -> teste +5,78; SLx3 +semParesCaros +max6/dia: -2,73 -> +5,46) eram medianas ou ruins no treino: ruído de seleção.
**Leitura:** uma regra com 90% de acerto e 71% de dias positivos NA AMOSTRA aparece fácil (a grade tem 72 chances) e desaparece fora dela. Nenhuma combinação se sustentou. Limites: ~40-45 operações por metade nas regras mais restritivas (pouco poder: não prova que as regras são inúteis, prova que esta amostra não as sustenta); só 72 combinações; M5, sem swap (SL x3 segura 57 h em média).
**Aritmética para o "lucro no período":** sem vantagem bruta, a esperança por operação é -(custo) e o total esperado do período é -N x custo: o que a gestão controla é N (quantas operações), o custo por operação (par, hora) e a FORMA da distribuição (SL x3: ~55% dos dias positivos com perda rara e grande; SL x1: ~32%), nunca o sinal da esperança. Poder: com desvio de ~31 pips/op, confirmar uma vantagem de +1 pip/op exigiria ~7.500 operações (~2,5 anos a 12/dia); só efeitos grandes (>= ~5 pips/op, ~300 operações) são detectáveis em semanas.

### 6.48 VELAS M5 E M1 COMPLETAS DA XM (13/11/2026): conferência, rejulgamento com 396 das 400 e REVISÃO do 6.47 (run 43351890508)
**Dados:** 20 arquivos (10 pares x M5 e M1, 05/10 a 13/11, em `DOCUMENTACAO/arquivo-xm/xm_barras_<M5|M1>_<PAR>.csv`, só preços). O zip do M5 trazia também o arquivo antigo `xm_barras_m5.csv` (primeira exportação, com a lacuna dos 7 pares): ignorado e removido do repositório. Conferência: sem linha inválida nem vela duplicada; cada par M5 ~8.400 barras e M1 ~41.900, sem aviso de lacuna; as 5 velas M1 reproduzem a vela M5 correspondente em 83.575 de 83.584 casos (99,99%); nenhum spread zerado; maior lacuna M1 fora de fim de semana: 9 min; spread M1 mediano 1,9 (EUR/USD) a 3,3 pips (GBP/JPY). Falha minha corrigida: o primeiro commit dos dados saiu sem os arquivos (a pasta sumiu ao apagar o antigo e a cópia falhou); refeito em `028baa8`.
**Rejulgamento M5 com cobertura de 396/400** (4 sinais sem vela no instante): app (mesmos 396) acerto 48,0%, líquido -3,43 pips/op (IC95 -6,66 a -0,39); XM com bid/ask reais acerto 41,7%, -4,60 (IC95 -7,31 a -2,11); diferença de entrada mediana +0,9 pip (p10 -3,58; p90 +4,70); spread real por par e por hora iguais ao 6.44 (rollover: 18h de Brasília mediana 4,9 e p90 15,6 pips). A conclusão R1 se mantém. (A matriz WIN/LOSS desta rodada não foi relida; a de 377 está no 6.44.)
**SL x3 com 396:** 392 operações, acerto 74,5%, -0,78 pips/op (IC95 -7,14 a +4,88), 56% dos dias positivos, pior dia -715 pips, duração média 51 h. **Regra "4 WIN ou 3 LOSS"** com SL x1: tomados 234 a -3,75 pips/op, pulados 162 a -5,83 (total -878 contra -1.822, operando 41% menos); com SL x3: tomados 304 a -1,05, pulados 88 a +0,14 (total -320 contra -308: neutra).
**REVISÃO DO 6.47 (busca treino x teste) com dados completos (16 dias de treino até 21/10, 16 de teste):** base SL x1: treino -6,32, teste -2,98 pips/op (a segunda metade foi melhor para QUASE TODAS as regras: mediana das 72 combinações -5,33 no treino e +0,37 no teste; 12,5% positivas no treino e 52,8% no teste: efeito de REGIME, não de regra). Melhores 5 do treino -> teste: SLx3 +semRollover +max3/dia +max2/ladoUSD +9,32 (n=43, acerto 86%) -> +5,54 (n=41, acerto 78%, 3 de 4 semanas positivas); +6,87 -> -1,92; +6,81 -> +3,38; +2,94 -> -3,77; +2,57 -> +6,62; média dos 5 no teste +1,97. Correlação de postos treino x teste -0,08 (o ranking do treino não prevê o teste). As melhores do teste (SLx3 +semParesCaros +max6/dia: treino -6,38 -> teste +10,72) eram ruins no treino. CORREÇÃO: no 6.47 (377 operações, sem a última semana de 7 pares) a média dos 5 melhores caía para -2,97 no teste; com 396 passa a +1,97. Acrescentar 19 operações inverteu o sinal: confirma que ~40 operações por regra por metade não bastam (erro-padrão de ~8 pips por regra). Leitura honesta: continua SEM evidência de que uma REGRA se sustente (persistência ~0; o ganho do teste é de regime); a regra mais forte nas duas metades (SLx3, sem rollover, 3 por dia, 2 por lado do dólar) fica registrada como CANDIDATA para amostra nova, nunca como achado.

### 6.49 OPERAÇÕES DEPOIS DA 400a (leitura de 17/11/2026, `depois-400.yml`, run 44125527845; AMOSTRA NOVA, descritivo)
**Pedido:** o usuário viu o saldo do app ir de ~US$510 para ~US$635 em uma semana e perguntou "como estamos no novo processo". O pipeline de sinais NÃO mudou desde as 400 (commits posteriores são só ferramentas de leitura, replay do Lab e docs); portanto "novo processo" não explica a melhora. Leitura com a credencial de administrador do robô, somente leitura.
**Números (fechadas CONFIG desde 04/10; 485 no total, 85 depois da 400a; 5 abertas):** fecharam entre 09/11 09:45Z e 17/11 16:10Z, 9 dias de calendário; lote 0,02; saldo do app: +US$124,99 (bate com o que o usuário viu). Acerto 64,7% (400 primeiras: 48,0%). Pips: bruto +8,09 (IC95 +1,34 a +13,77); líquido com spread da tabela do Lab +5,78 (IC95 -0,99 a +11,45; contém 0: no critério 6.25 seria R2, "indeterminado", e com n=85 e 9 blocos de dia não decide nada). Maior queda do saldo na janela: US$20. Semana de 09/11: 71 operações, 66,2%, +US$114,99; 11/11 sozinho: 15 operações, 86,7%, +US$55 (quase metade do ganho em um dia). Acumulado desde 04/10 (485): +US$47,5 no app SEM spread; líquido com spread da tabela aproximadamente -1,9 pip/op (média ponderada -3,47 x 400 e +5,78 x 85).
**Decomposição (descritiva, não para ajustar):** por lado do dólar nas 85: dólar comprado 44 operações, 81,8%, +US$140; cruzados 24, 54,2%, +US$10; dólar vendido 17, 35,3%, -US$25. Fora das apostas em dólar comprado: 41 operações, 46,3% de acerto, -US$15 (igual ao histórico). O ganho da semana vem inteiro de uma perna: dólar subindo. Nas 400 primeiras o mesmo grupo (dólar comprado) era o PIOR (43,0%, -5,85 pips/op, n=121) e nas 100 primeiras o dólar vendido era o ruim (35%) e o comprado também (38%): o lado que ganha troca com o regime, sem sinal de que o sistema ESCOLHA o lado certo. Efeito de regime/tendência do dólar, não evidência de aprimoramento.
**O que falta:** custo real (XM bid/ask) da semana; as velas M5/M1 exportadas vão até 13/11, então ~70 dessas operações já podem ser rejulgadas com os dados que existem; as de 14 a 17/11 dependem de nova exportação. Leitura: somente amostra FORWARD, definida antes, decide (Fase 0 M1 e candidata do 6.48).

### 6.50 SEMANA DE +US$120 x MERCADO: rejulgamento XM das operações depois da 400a e semanas x cesta do dólar (17/11/2026, `xm-semanas.yml`, run 44127020554; DESCRITIVO, hipótese gerada post hoc)
**Cesta do dólar** = média de 7 pares com USD (USD/XXX +, XXX/USD -, log) nas MESMAS velas M5 da XM; por período: deriva (%), caminho (soma das variações horárias) e eficiência (deriva/caminho; 1 = tendência limpa, ~0 = vai e volta). As velas vão até 13/11; a semana de 16/11 e as operações de 14 a 17/11 ficam sem mercado/XM.
**Semanas (BRT, abertura; app | XM com SL x1 | mercado):** 05/10: 39,1%, -US$72,5, -9,40 pips/op | XM -9,32 | deriva -0,28%, eficiência 0,056. 12/10: 52,9%, +US$25, -0,48 | XM 43,5% -3,54 | -0,47%, 0,083. 19/10: 48,1%, -US$15, -3,12 | XM -3,10 | -0,49%, 0,105. 26/10: 50,7%, +US$5, -2,51 | XM -3,43 | +0,39%, 0,078. 02/11: 46,2%, -US$35, -3,52 | XM -5,15 | +0,48%, 0,078. **09/11: 66,7%, +US$120, +6,36 | XM 60,9% +6,51 (n=46) | +1,07%, 0,258** (deriva 2x a maior das outras e eficiência 3x a média das outras; exposição líquida ao dólar +0,31, a maior). Nenhuma outra semana chegou perto: a melhor das outras foi +US$25 (e negativa na XM). Não existe "outras semanas iguais": é UM caso.
**Dia a dia (33 dias com >= 4 operações):** correlação de postos (Spearman) do líquido/op com exposição líquida x deriva do dólar do dia +0,33; com |deriva| +0,24; com eficiência +0,15; com caminho 0,00. No nível semanal (n=6) a eficiência do dólar e o líquido/op têm postos quase alinhados (rho ~ 0,79, calculado à mão; n=6 não sustenta teste). **Lado apostado x direção do dólar do dia (|deriva| > 0,3%; todas as operações):** dólar subindo: comprado 40/52 (77%), vendido 2/12, cruzado 14/28; dólar caindo: vendido 14/23 (61%), comprado 3/7, cruzado 6/14; dia neutro: comprado 37/94 (39%), vendido 60/121 (50%), cruzado 56/109 (51%). Nos dias de tendência o sistema também APOSTOU a favor dela (81% das apostas em dólar eram compradas nos dias de alta); em dia neutro, ~46% (ao redor de zero, sem vantagem).
**Rejulgamento XM das operações depois da 400a com dados (60 operações até 13/11):** app nas mesmas 60: 66,7%, +6,85 pips/op líquido (IC95 -2,07 a +14,26); XM com bid/ask reais nas 49 decididas (as demais ainda abertas ao fim das velas): 57,1%, +4,62 pips/op (IC95 -9,98 a +10,33). A semana continua positiva com custo real, menor e dentro do ruído (IC contém 0).
**Leitura (hipótese, não achado):** o sistema é seguidor de tendência (entra a favor do movimento já iniciado); ganha quando a tendência do dólar continua e perde no vai e volta. A semana de 09/11 foi a única de tendência limpa do dólar do período, e o ganho veio inteiro dessa perna (6.49). CUIDADO: (1) deriva e eficiência são medidas COM o dia/semana inteiros (inclui o movimento depois do sinal), então não servem como filtro ao vivo; (2) a hipótese nasceu olhando estes mesmos dados; (3) n=6 semanas, n=33 dias. Candidata a PRÉ-REGISTRO para amostra FORWARD: "a eficiência da cesta do dólar nas 24 h/72 h ANTERIORES ao sinal prediz o resultado das operações seguintes"; nada no pipeline muda (congelado) até haver decisão e amostra nova.

### 6.51 PRÉ-REGISTRO T1 (regime) e T2 (alinhamento do dólar), APROVADO pelo usuário em 19/11/2026 ("pode seguir com seu planejamento")
**Origem:** hipótese post hoc do 6.50 (sistema seguidor de tendência: ganha com tendência do dólar, perde no vai e volta). Literatura: momentum de série temporal (Moskowitz, Ooi e Pedersen, 2012, Journal of Financial Economics) e Efficiency Ratio (Kaufman, *Trading Systems and Methods*). Escrito ANTES de rodar; código em `scripts/xm/regime.js` (+test), workflow `xm-regime.yml`.
**Só informação conhecida antes do sinal:** cesta do dólar (7 pares com USD, velas M5 da XM, log) nas últimas 24 HORAS DE MERCADO (24 níveis horários já fechados antes do instante do sinal; fim de semana não conta). ER24 = |deriva|/caminho; deriva24 = variação da cesta. Janela de 72 h, outros limiares e filtros NÃO entram (limitar comparações).
**Amostra de triagem:** todas as fechadas CONFIG desde 04/10 decididas WIN/LOSS no julgamento bid/ask da XM com SL x1, até o fim da exportação de velas de 19/11/2026. Métrica: pips por operação na XM (spread dentro do julgamento).
**T1:** terços de ER24 (cortes nos percentis 33,3/66,7 da triagem). Diferença = média do terço ALTO - média do terço BAIXO. **T2:** só pares com USD; A FAVOR = apostou no lado da deriva24 (comprado com deriva > 0, vendido com deriva < 0). Diferença = média a favor - média contra.
**Critério de triagem (cada teste):** IC por bootstrap em blocos de dia (10.000, semente fixa) com Bonferroni para 2 testes (IC 97,5%); PASSA se o limite inferior > 0 E a diferença SEM a semana de 09/11 continuar > 0. Roda UMA vez. Falhou = hipótese ENCERRADA, sem variantes nestes dados.
**Se passar (etapa 2, forward):** cortes de ER24 fixados na triagem; amostra = operações abertas depois do fim da exportação; avaliar com >= 300 operações novas (~4-5 semanas; diferença de ~10 pips exige isso com desvio de ~31 pips/op), mesmo critério e, além disso, o grupo A com >= +0,5 pip/op líquido na XM. Só então se discute filtro no sinal (pipeline congelado até lá).

### 6.52 RESULTADO DO PRÉ-REGISTRO 6.51: T1 e T2 REPROVADOS na triagem (19/11/2026, `xm-regime.yml` run 44444901871; velas M5/M1 da XM até 18/11 23:25 BRT, commit 9145b9a)
**Dados novos:** exportação do usuário de 18/11 (10 pares x M5 e M1, 05/10 a 19/11 02:26Z): M1 reproduz M5 em 95.096 de 95.096 velas (100%); nenhuma lacuna M1 fora de fim de semana; nenhum spread zerado; contra a exportação anterior, 9 de 83.991 velas M5 diferentes (última vela parcial). Triagem: 506 fechadas, 501 decididas na XM (SL x1), 489 com janela de 24 h de mercado; cortes de ER24: 0,130 e 0,285.
**T1 (regime, ER24 nas 24 h ANTES do sinal):** terço de tendência -1,51 pips/op (n=161, 47,2%); terço de vai e volta -1,12 (n=163, 47,2%); meio -4,35 (n=165). Diferença -0,39 (IC 97,5% -8,13 a +7,46); sem a semana de 09/11: -1,59. **REPROVADO**: nenhum sinal de que a eficiência do dólar conhecida antes do sinal separe operações boas de ruins.
**T2 (alinhamento com a deriva24 do dólar, só pares com USD):** a favor -0,91 (n=238, 47,9%); contra -5,30 (n=91, 39,6%). Diferença +4,39 (IC 97,5% -4,41 a +13,04); sem a semana de 09/11: +0,76. **REPROVADO** (IC contém 0; sem a semana o efeito quase some). O sistema já aposta a favor da deriva das 24 h anteriores em 72% das operações com USD (é seguidor de tendência por construção), e mesmo esse grupo fica negativo.
**Conclusão (vale para o 6.50):** a tendência do dólar EXPLICA o resultado depois do fato (Spearman do líquido diário com exposição x deriva do MESMO dia: +0,43, 37 dias), mas o que se sabe ANTES do sinal não PREVÊ. Hipótese de filtro de regime pelo dólar ENCERRADA nestes dados, sem variantes (outras janelas/limiares), como pré-registrado.
**Rejulgamento das operações depois da 400a com velas até 18/11 (`xm-semanas.yml` run 44444906069):** 106 com dados; app 63,2%, +5,16 pips/op líquido (IC95 -2,57 a +11,97), +US$140; XM bid/ask 59,0%, +5,15 (IC95 -2,61 a +11,79; n=105). Semana de 16/11 (até 18/11): 31 operações, 58,1%, +US$25; XM 56,7%, +5,13; dólar +0,55%, eficiência 0,19. Dias: 17/11 -US$30 (28,6%), 18/11 +US$35 (81,8%).

### 6.53 PRÉ-REGISTRO T3 (par em alta DENTRO da semana), T4a-d (ADX, RSI, ATR/SL, score) e T5 (existe efeito de semana?), APROVADO pelo usuário em 19/11/2026
**Pedido do usuário:** "o que falei do par seria dentro da semana... de uma semana pra outra muda drasticamente os resultados, e é isso que quero achar, o que muda no mercado que faz as semanas variarem"; "verificar o ADX, com RSI também e outros pontos da análise". Escrito ANTES de rodar; código `scripts/xm/rodada2.js` (+test), workflow `xm-rodada2.yml`. Mesma amostra de triagem do 6.51 (fechadas CONFIG decididas na XM com SL x1, velas até 18/11).
**T3:** na hora de cada sinal, ranking dos pares pelo resultado XM (pips/op) das operações da MESMA semana (Brasília) que já fecharam (>= 2 por par; >= 4 pares no ranking). A = o par do sinal está entre os 3 melhores; B = demais ranqueados. Só informação passada.
**T4 (indicadores gravados no sinal; terços da amostra; A = alto, B = baixo):** a) ADX; b) RSI a favor da direção (compra: RSI; venda: 100 - RSI); c) ATR em pips / SL em pips (stop pequeno ou grande para a volatilidade); d) score do próprio sistema (se a confiança do sistema significa algo). Bilateral.
**T5:** a variação ENTRE semanas é maior do que o acaso produziria? Soma de quadrados entre as médias semanais (semanas com >= 20 operações) contra 10.000 permutações dos DIAS entre as semanas. Se NÃO houver efeito de semana, procurar "o que mudou no mercado naquela semana" é procurar explicação para ruído; se houver, vale investigar causas que se saibam ANTES. Autocorrelação dia a dia impressa só como descritivo.
**Critério:** 6 testes, Bonferroni (alfa 0,05/6; IC 99,17% por bootstrap em blocos de dia). T3/T4 passam se o IC EXCLUI 0 e a diferença sem a semana de 09/11 tem o mesmo sinal; T5 se p < alfa. Roda UMA vez; reprovado = encerrado sem variantes. Aprovado = só vale após confirmação forward (>= 300 operações novas), pipeline congelado até lá.

### 6.54 RESULTADO DO PRÉ-REGISTRO 6.53: os 6 testes REPROVADOS (19/11/2026, `xm-rodada2.yml` run 44448853967; 501 operações decididas na XM, IC 99,17%)
- **T3 (par em alta dentro da semana):** 3 melhores até o sinal -2,79 pips/op (n=120, 45,0%) x demais -2,68 (n=207, 45,9%); diferença -0,11 (IC -9,85 a +10,20); sem 09/11 +2,29. O par que vinha bem na semana NÃO continua melhor.
- **T4a ADX:** alto -2,07 (46,7%) x baixo -4,68 (41,9%); diferença +2,60 (IC -8,17 a +11,74); sem 09/11 +1,64; meio -0,93. Cortes 24,7 / 36,5.
- **T4b RSI a favor:** alto -2,46 x baixo -0,85; diferença -1,61 (IC -10,87 a +8,14); meio -4,37. Cortes 61,7 / 66,5 (o sistema já entra com RSI a favor, faixa estreita).
- **T4c ATR/SL:** alto -5,48 x baixo -4,45; diferença -1,03 (IC -10,68 a +8,48); meio +2,26 (descritivo, ruído). Cortes 0,14 / 0,20.
- **T4d score do sistema:** alto -4,16 (42,7%) x baixo -0,45 (48,9%); diferença -3,71 (IC -12,41 a +6,89); sem 09/11 -3,45. O score alto NÃO é melhor (ponto estimado até pior): a "confiança" do sistema não separa operações boas de ruins.
- **T5 (efeito de semana):** semanas -9,32 / -3,54 / -3,10 / -3,43 / -5,15 / +6,38 / +5,13 pips/op; permutação dos dias entre semanas p = 0,110 (alfa 0,0083; também não passaria a 0,05). A variação entre semanas é compatível com o acaso dado o número de operações e a correlação entre elas. Autocorrelação dia a dia (descritivo): -0,04 (um dia bom não diz nada sobre o seguinte).
**Leitura:** nenhum dos 6 recortes conhecidos ANTES do sinal separa operações boas de ruins com custo real; somados ao 6.52 são 8 hipóteses pré-registradas reprovadas, além do R1 das 400. Poder limitado (7 semanas, ~500 operações; diferenças menores que ~8-10 pips não seriam detectadas), mas o que não se detecta com isso também não se explora com segurança. Encerradas sem variantes. O ponto central passa a ser o próprio sinal: a Fase 0 em M1 (6.45) é o próximo e último teste desta família de sinal.

### 6.55 FASE 0 (6.45): DETALHES DE IMPLEMENTAÇÃO FIXADOS ANTES DE RODAR (19/11/2026; `lab/fase0-m1.js` +test, workflow `lab-fase0-m1.yml`)
O 6.45 deixou alguns pontos para "confirmar ao implementar". Ficam fixados aqui, antes de qualquer resultado agregado:
- **Velas:** M1 da XM (BID) exportadas em 18/11, convertidas para UTC pela regra de fuso por data; só horário de mercado (como o Lab). O analisador vê o preço BID da XM (o app vê o preço médio da TwelveData: diferença declarada).
- **Replay:** `replayPar` com base 60 s, companhia de 3 min (razão 3), janela 500, análise a cada 5 velas (o scanner roda a cada 5 min), 30 s depois do fechamento da vela, configuração real lida de `configuracoes/geral`, cooldown e uma posição por par fechada "como o app mede" (sem spread) por até 20.000 velas. `replayPar` passou a devolver também as operações aprovadas (`operacoes`) e aceita `guardarAnalises: false`; comportamento anterior inalterado (testes do replay passam).
- **Período:** sinais de 04/10 00:42Z até o fim do dia 13/11 em Brasília (14/11 03:00Z), o período pré-registrado; as velas até 18/11 só servem para fechar operações.
- **Entrada e julgamento:** entrada na abertura da PRIMEIRA vela M1 que abre no instante do sinal ou depois (conservador); essa vela já conta para TP/SL. Compra no ask (bid + spread da vela), venda no bid; saída da compra no bid e da venda no ask. Vela que toca TP e SL = LOSS (ambíguo). Sem desfecho até o fim das velas = ABERTA (fora da conta, reportada).
- **ALEATORIO:** esperança exata da direção sorteada nas MESMAS entradas = média dos resultados de compra e venda em cada entrada (elimina o ruído de um sorteio). t = média(real - aleatório) / erro-padrão por blocos de dia (10.000 reamostragens).
- **Dois braços (SL x1 principal; SL x3 secundário, 6.46):** IC de 97,5% nos dois. Swap do SL x3 em sensibilidade: 0 e -1 pip por noite (rollover das 17h de Nova York; quarta conta 3), porque a tabela de swap da XM não está disponível aqui.
- **Transparência:** no ensaio local de velocidade (só EUR/USD, lote 0,02 fixo, sem a configuração real) apareceram 68 sinais e 35 WIN / 33 LOSS no julgamento M1. Nada foi ajustado depois disso; o resultado oficial é o do workflow, com os 10 pares e a configuração real.

### 6.56 RESULTADO DA FASE 0 (6.45/6.55): H_M1 REPROVADA, nos dois braços (19/11/2026, `lab-fase0-m1.yml` run 44571723416)
**Configuração real lida:** perfil conservador, lote 0,02, TP/SL US$ 5/5, cooldown 30, candles 350 (o replay usou janela de 500 velas, como todos os replays do Lab; diferença declarada, irrelevante para o veredito abaixo).
**Sinais:** 567 em 35 dias (16,2 por dia; M5 nas 400: ~12); por par: EUR/USD 83, USD/CHF 86, GBP/USD 81, EUR/JPY 69, GBP/JPY 61, USD/JPY 57, USD/CAD 46, AUD/USD 39, NZD/USD 34, EUR/GBP 11. "Como o app mede" (sem spread): 268 WIN, 289 LOSS, 10 outros.
**Braço principal SL x1 (bid/ask de M1, IC 97,5%):** 566 decididas, 0 ambíguas, 1 aberta; acerto 43,3%; **líquido -4,59 pips/op (IC -8,35 a -1,04)**; ALEATORIO nas mesmas entradas -3,14; diferença real - aleatório -1,44 (IC -5,18 a +2,02), t = -0,90. Sem spread (bruto): -1,26 (IC -5,21 a +2,42). Critérios: (a) não, (b) não, (c) não, (d) sim => **REPROVADO**.
**Braço secundário SL x3:** 561 decididas, acerto 74,2%, duração média 52,7 h (2,2 noites); sem swap -0,34 (IC -5,62 a +4,61); com swap de -1 pip/noite -2,58 (IC -7,92 a +2,39); t contra o ALEATORIO 0,44 => **REPROVADO**.
**Descritivo:** por semana -10,99 / -5,37 / -7,25 / -5,58 / -3,76 / +5,45 pips/op (a única positiva é de novo a de 09/11); por direção compra -4,69, venda -4,49; por par só EUR/USD (+0,30) e GBP/USD (+0,93) ficaram perto de zero.
**Leitura:** a base de 1 minuto deu praticamente o MESMO resultado da base de 5 minutos com custo real (M1 -4,59 x M5 -4,60 pips/op): mudar o prazo não mudou nada. Antes do custo o sinal fica em torno de zero (-1,26) e não supera a direção sorteada; o custo (~3,3 pips/op) faz o resto. Com a Fase 0, são 10 avaliações pré-registradas desta família de sinal sem vantagem (R1 das 400, T1, T2, T3, T4a-d, T5, H_M1). Pelo pré-registro, ENCERRA: não se tenta outro período, par ou parâmetro desta hipótese. Expectativa registrada antes (6.45): "espero REPROVAR". A Fase 1 (scanner sombra M1) NÃO será feita.

### 6.57 CONFERÊNCIA DO RESUMO "TIME MACHINE" (day-trader-skill) TRAZIDO DE OUTRA CONVERSA, contra o código e as avaliações daqui (19/11/2026)
O usuário trouxe o resumo de outra conversa (ideias de método do `trader-timemachine/timemachine.py`, MIT). Conferência item a item:
1. **Medidas relativas (razões ao fechamento anterior):** CONFIRMADO o viés. `scripts/marketAnalyzer.js:413` (inclinação das EMAs: |EMA9-EMA21| e |EMA21-EMA50| >= 0,0010) e `:611` (ATR >= 0,0020 = "ALTA") usam limiares ABSOLUTOS de preço; em pares de JPY (preço ~150) essas distâncias são ~100x maiores, então os pares de JPY tendem a pontuar sempre no máximo nesses dois componentes. É defeito de correção do score, registrado como pendência; o pipeline segue congelado. Efeito esperado sobre o resultado: pequeno, porque o score não separa operações boas de ruins (T4d, 6.54).
2. **Monte Carlo como hipótese nula:** já há uma régua mais forte em uso: ALEATORIO nas MESMAS entradas, julgado no caminho real de preço com bid/ask (esperança exata das duas direções, 6.55). O Monte Carlo com velas sorteadas de forma independente subestima caudas (limitação admitida no próprio resumo). Serve, no máximo, para checar a geometria stop/alvo contra a volatilidade.
3. **Vela que toca stop e alvo = stop:** JÁ é assim no checker oficial (`js/checker.js:369-375`, "assume-se SL primeiro") e em todos os rejulgamentos do Lab.
4. **Ponto de empate 1/(1+R):** CORREÇÃO: sem custo fica incompleto. Com custo c por operação, empate = (SL + c)/(TP + SL). Com TP = SL = 25 pips e custo ~2,3-3,3 pips: 54,6%-56,6%, não 50%. As avaliações daqui já usam a versão com custo.
5. **Semente fixa e veredito impresso pela ferramenta:** já em uso (todos os pré-registros desde 6.25).
6. **Sem olhar o futuro (entrada no fechamento do candle do sinal, checagem a partir do seguinte):** já em uso (6.44, 6.55).
**Modo sombra dos três perfis:** expectativa BAIXA registrada antes: os perfis diferem sobretudo no corte de score, e o score não separa resultados (T4d: score alto -4,16 x baixo -0,45 pips/op). Testar outros perfis AGORA nos mesmos dados seria variante proibida pela Fase 0 (6.56); como teste FORWARD é legítimo, mas exige mudar o pipeline (decisão do usuário).
**Adendo 6.57 (20/11/2026): leitura da FONTE (repositório público `Jakeschincariol/day-trader-skill`, README, `trader-timemachine/SKILL.md` e `timemachine.py` na íntegra).** A página do resumo aberta no navegador do usuário não é acessível desta sessão (nuvem), e `claude/decisoes-auditoria-rmi.md` não existe neste repositório. O que a fonte acrescenta ao resumo: (1) a Time Machine aceita compra E venda (o resumo dizia "só comprado"); (2) o Monte Carlo sorteia cada vela de 5 min de forma INDEPENDENTE, com reposição, de uma janela de ±2 velas no mesmo horário do dia, entre as ~60 últimas sessões do próprio ativo (razões OHLC / fechamento anterior da mesma sessão), 10.000 repetições, semente 19; (3) entrada no fechamento da vela do sinal, simulação a partir da seguinte; mesma vela com stop e alvo = stop; (4) veredito = fatia de alvos entre as repetições que bateram algo contra 1/(1+R), SEM custo; (5) há um "histórico": a MESMA regra reaplicada a cada sessão passada ("disparou N vezes: X alvo, Y stop"), mostrado ANTES da entrada como checagem de realidade, nunca como previsão. No exemplo do próprio autor (TSLA, 19/10/2026) o veredito é "perto de cara ou coroa" e o histórico da regra dá R médio -0,062. Conclusão: ferramenta de APOIO À DECISÃO (é o formato da opção 2 do usuário: "nas condições analisadas, em X sinais, o app acertou Y; o usuário decide"), não fonte de vantagem; a régua ALEATORIO daqui (caminho real, bid/ask) segue mais forte que o Monte Carlo independente.
**Adendo 2 ao 6.57 (20/11/2026): página do guia "marcondes-trade.vercel.app" (colada na íntegra pelo usuário; o domínio é bloqueado pelo proxy desta sessão).** Guia independente em português (@marcondes.ai) de instalação da Trader; não vende nada (tudo R$ 0), com avisos de risco corretos (cita o estudo da FGV de Chague, De-Losso e Giovannetti: 97% de quem fez day trade por mais de 300 dias perdeu dinheiro). Fatos novos frente à leitura do código: (1) o fluxo de entrada/saída é SÓ COMPRADO (a Máquina do Tempo aceita venda, mas o pacote não abre venda): o resumo estava certo para o pacote, a correção do adendo 1 vale só para a Máquina; (2) a página reafirma o empate "50% a 1R" sem custo; o planejador de saída recusa stop "apertado demais para sobreviver ao spread", mas o veredito ignora o custo; (3) o próprio exemplo é apresentado como prova de que "esse trade não tem vantagem nenhuma". O que serve ao Forex Assist: o FORMATO de apoio à decisão (veredito honesto + "a mesma regra disparou N vezes: X alvos, Y stops") para a opção 2 do usuário, e a lista de checagens do gerente de risco (perda máxima por operação, risco total do dia, operações por dia, relação risco/retorno mínima, janela de entrada, tamanho, caixa) como base da política de risco (etapa A). Nada do pacote se aplica diretamente: ações dos EUA, Yahoo, Alpaca, zerar no fechamento (o Forex não tem fechamento diário).

### 6.58 PRÉ-REGISTRO (RASCUNHO, aguarda aprovação do usuário): MOMENTUM DE SÉRIE TEMPORAL EM VELAS DIÁRIAS (H_TSMOM) — passo 3, opção A (decisão do usuário em 20/11/2026: "sim, seguimos com A")
**Por quê esta hipótese:** 10 avaliações pré-registradas mostraram que o sinal intradiário atual não tem vantagem antes do custo e que o custo (~3 pips/op, ~13% do SL de 25 pips) exige ~55% de acerto. As vantagens DOCUMENTADAS no câmbio são de prazo longo: momentum de série temporal (Moskowitz, Ooi e Pedersen, 2012, Journal of Financial Economics; Menkhoff, Sarno, Schmeling e Schrimpf, 2012, JFE). Em prazo de semanas/meses o movimento típico é de centenas de pips e o spread vira 1-3% dele. Ressalvas conhecidas ANTES: o efeito é modesto (Sharpe da ordem de 0,3-0,7 na literatura), concentrado em parte em moedas fora do G10 e mais fraco depois de ~2010; tem meses seguidos de perda.
**Dados:** velas DIÁRIAS da XM dos 10 pares (exportador v1.20, `Periodo = PERIOD_D1`, `Desde = 2000.01.01`; o servidor entrega o que tiver). Amostra = da primeira data em que os 10 pares têm dados (não antes de 01/01/2005) até a exportação. Swaps ATUAIS da XM (`xm_swaps.csv`).
**Sem ajuste de parâmetro:** a especificação vem da literatura e é fixada aqui; a amostra INTEIRA é teste (não há período de desenvolvimento, porque não há o que ajustar; isso também dá mais poder do que dividir a amostra).
**Braço principal (canônico, mensal):** no fechamento do último dia útil de cada mês, para cada par, direção = sinal do retorno dos 12 meses anteriores (fechamento de hoje contra o fechamento do último dia útil de 12 meses antes). Posição no mês seguinte: comprado se > 0, vendido se < 0, mesmo peso por par. Resultado do par no mês = direção x log(fechamento final / fechamento inicial). Carteira = média dos 10 pares.
**Braço secundário (semanal, mais perto do uso do app):** mesma regra com 12 semanas de retrospecto e 1 semana de posição (fechamento de sexta a fechamento de sexta).
**Custos:** spread da tabela do Lab (`lab/spreads.js`) cobrado INTEIRO a cada período (fechar e reabrir, mesmo sem trocar de lado: conservador). Swap em sensibilidade: (i) zero; (ii) swap atual da XM aplicado a todo o período, por noite, com o dia triplo da XM (aproximação declarada: o histórico de swap não existe no MT5 e os juros mudaram muito de 2005 a 2026).
**Métrica e critério (2 braços => IC 97,5%):** retorno líquido médio por período da carteira (%), IC por bootstrap em blocos de 3 meses (principal) / 12 semanas (secundário), 10.000 reamostragens, semente fixa. PASSA se: (a) a média líquida com swap atual > 0 e o limite inferior do IC > 0; E (b) a média líquida é positiva nas duas metades da amostra (robustez contra um regime só). Reportar também: retorno anual, Sharpe, maior queda, pior ano, % de meses (semanas) positivos, e os controles "sempre comprado em dólar" e "direção sorteada" (esperança = -custo).
**Poder (declarado antes):** com ~20 anos mensais, Sharpe 0,5 dá t ~ 2,2; com 16 anos, ~2,0 (no limite). Um efeito verdadeiro porém pequeno pode sair INCONCLUSIVO. Expectativa registrada: probabilidade baixa a moderada de passar (~25-35%), sobretudo depois de 2010.
**Se passar:** acompanhamento FORWARD no Lab (sinais mensais/semanais gravados antes, sem dinheiro), mínimo de 12 meses no braço mensal, antes de qualquer uso real. **Se reprovar:** encerra, sem trocar retrospecto, prazo ou pares nestes dados.
**Decisões pendentes do usuário:** (1) aprovar os dois braços como estão; (2) aprovar o critério; (3) entender que o braço principal gera ~10 posições por MÊS (não por dia).
**Adendo ao 6.58 (20/11/2026, ANTES de rodar): dados e código prontos.** Velas D1 da XM exportadas pelo usuário (v1.20): 10 pares de 03/01/2000 a 20/11/2026 (~7.020 velas; EUR/JPY 6.896), sem vela inválida; lacunas > 4 dias só no EUR/JPY em 2000 e numa semana do EUR/GBP em 2009 (antes do início ou irrelevantes); a vela D1 é idêntica à agregação das velas M5 em 33 de 33 dias comuns, nos 10 pares; os dias extremos são eventos reais (out/2008, Brexit 24/06/2016, piso do franco 06/09/2011 e fim do piso 15/01/2015, -19,6% no USD/CHF). Swaps atuais em `DOCUMENTACAO/arquivo-xm/xm_swaps.csv` (modo 1 = pontos por noite; dia triplo = quarta). Código `lab/tsmom.js` (+test, só leitura, sem banco) implementa exatamente o texto acima; regras operacionais fixadas: a última vela de cada arquivo é descartada (dia em andamento); período só conta se o fim do retrospecto e o período seguinte existem e são contíguos; rolagens de swap = dias com vela entre a abertura (inclusive) e o fechamento (exclusive), quarta x3. NÃO rodado sobre os dados reais: aguarda a aprovação do usuário.
**APROVADO pelo usuário em 20/11/2026 ("sim"), antes de qualquer execução sobre os dados reais.** Roda UMA vez, com o código do commit 4d61641 (`node lab/tsmom.js`).

### 6.59 RESULTADO DO PRÉ-REGISTRO 6.58 (momentum diário): REPROVADO nos dois braços (20/11/2026; `node lab/tsmom.js`, código do commit 4d61641, rodado uma vez depois da aprovação 3403901)
Amostra: 10 pares, sinais de jan/2005 a out/2026 (mensal: 262 meses; semanal: 1.141 semanas). Valores em % por período da carteira (média dos pares), IC 97,5% por blocos.
**Principal (mensal, 12 meses de retrospecto):** bruto +0,017%/mês (~ +0,2%/ano: praticamente zero); com spread -0,005; **com spread e swap atual -0,169%/mês (IC -0,403 a +0,070)**; metades -0,118 e -0,221 (as duas negativas); direção sorteada -0,191; sempre comprado em dólar +0,045. Anual -2,0%, Sharpe -0,36, maior queda -56%, 43,5% dos meses positivos. Melhor ano 2008 (+13,4%, crise com tendência forte), pior 2009 (-20,1%, a virada). Desde 2016 só 2022 e 2023 positivos, e por pouco.
**Secundário (semanal, 12 semanas):** bruto -0,001%/semana; com spread -0,023; **com spread e swap -0,060%/semana (IC -0,110 a -0,005: inteiro negativo)**; metades -0,041 e -0,079; direção sorteada -0,061. Anual -3,1%, Sharpe -0,54, maior queda -73%.
**Leitura:** nos 10 pares do app, de 2005 a 2026, o momentum de série temporal não tem vantagem nem ANTES do custo (bruto ~0, igual à direção sorteada); o swap da XM (com margem da corretora, em vários pares negativo dos dois lados) transforma zero em perda. Coerente com a literatura de que o efeito enfraqueceu depois dos anos 2000 nas moedas do G10; o único bom momento é a crise de 2008. Encerrado sem variantes (outros retrospectos, prazos ou pares) nestes dados, como pré-registrado.
**Balanço geral (12 avaliações pré-registradas):** R1 das 400 (M5), T1, T2, T3, T4a-d, T5, H_M1 (Fase 0) e H_TSMOM (mensal e semanal): nenhuma vantagem detectável; em todas, o resultado ANTES do custo ficou perto de zero, e o custo da conta XM Standard (spread ~2-3 pips, swap com margem) define o sinal negativo.

### 6.60 LIMITES DE RISCO: o que teriam feito no histórico (21/11/2026, `risco-simulacao.yml` run do job 136930214529; DESCRITIVO)
**O que foi implementado (AJUSTE-113, aviso no Painel, não trava):** 4 limites aprovados pelo usuário ("vamos seguir assim", números sugeridos por mim): perda do dia US$ 15, 3 posições abertas, 2 por lado do dólar, sem 17h-19h de Brasília. DESVIO DECLARADO do que eu tinha proposto ("vale para as operações que você marca como reais, bloqueia"): a caixa "Operação Real" só liga DEPOIS do encerramento, então o app não sabe quais ordens o usuário abriu; bloquear a marcação não impediria ninguém de entrar e só estragaria o saldo da conta real. As regras valem sobre os SINAIS DO APP (o que o usuário segue, 6.37) e aparecem como aviso ("Dentro/Fora dos limites"), com a conta aberta por regra.
**Simulação (539 fechadas CONFIG, 42 dias, sequencial: cada sinal avaliado só contra os já tomados; US$ do app sem spread; pips com o spread da tabela):**
- Todos os sinais: 539, +US$ 57,50, -1,58 pips/op, pior dia -US$ 35, 42,9% dos dias negativos, 5,8 posições abertas na média ao abrir cada sinal.
- Só os DENTRO dos limites: 197 (36,5%), -US$ 32,50, -3,28 pips/op, pior dia -US$ 25, 50% dos dias negativos, 1,6 abertas na média.
- Os BLOQUEADOS: 342 (63,5%), +US$ 90, -0,61 pips/op.
- Quem bloqueia (qualquer motivo / só ele): 3 abertas 234 / 151; mesmo lado do dólar 107 / 22; perda do dia 70 / 67; horário 20 / 15.
**Leitura:** (1) os limites cortam 63% dos sinais e só reduzem o pior dia de US$ 35 para US$ 25 (a perda do dia só conta posições JÁ fechadas; as abertas ainda perdem). (2) O resultado dos tomados ficou PIOR que o dos bloqueados (-3,28 x -0,61 pips/op), mas a diferença (2,7 pips) é ~1 erro-padrão (31/raiz de 197 = 2,2): acaso, não prova de que a regra prejudica; e não prova o contrário. Pelo teorema da parada opcional, regra de parada não muda a esperança por operação: muda quanto se opera e a forma da distribuição. (3) O limite de 3 abertas é APERTADO para como o app opera (média de 5,8 abertas; bloqueia 234 de 539 sozinho). É decisão de tolerância a risco do usuário, não de desempenho; NÃO ajustar o número olhando este resultado (seria sobreajuste). Referência de mercado: Alexander Elder ("Come Into My Trading Room", 2002) recomenda até ~2% de risco por operação e ~6% de risco total aberto; aqui cada operação arrisca US$ 5 (0,5% de US$ 1.000), então 6% seriam ~12 posições, e 3 posições = US$ 15 em risco (1,5%).

### 6.61 O CAMINHO DO DIA: "lucro antes da perda" e "não ir atrás da perda" (22/11/2026, `dia-caminho.yml`, job 137396948759; DESCRITIVO; 3 regras definidas ANTES de rodar)
**Pedido do usuário:** nos dias em que o lucro vem antes da perda "estamos de parabéns, e tem acontecido muito"; pensar em minimizar a perda, "ou melhor, não ir atrás dela".
**Caminho (41 dias, pelo fechamento, resultado acumulado do dia em US$):** a primeira fechada do dia é WIN em 46,3%. Toca +US$ 10 antes de -US$ 10 em 20 dias (48,8%): o dia termina em média +US$ 13,13 e positivo em 70%. Toca -US$ 10 antes em 19 dias (46,3%): termina em média -US$ 10,26 e positivo em 10,5%. Nenhum dos dois em 2 dias. **"Lucro antes da perda" acontece na METADE dos dias, simétrico com o oposto: é o que um passeio aleatório faz, não um padrão.** Operações que fecham DEPOIS do toque: depois de +10: -0,17 pips/op (n=184, erro-padrão 2,24); depois de -10: -1,78 (n=215, 2,16); diferença 1,6 pip em ~3,1 de erro-padrão: sem "memória" (estar na frente ou atrás do dia não prevê o que vem).
**Simulação (decisão na ABERTURA com o que já fechou no dia; todos: 539 sinais, +US$ 57,50, -1,58 pips/op, pior dia -US$ 35, 42,9% dos dias negativos):**
- **A "trava o ganho" (hoje já fechou >= +US$ 10, não toma mais):** 361 sinais (-33%), **+US$ 57,49 (igual)**, -1,49 pips/op, pior dia -US$ 30, **31,7% dos dias negativos**. As 178 operações puladas somaram ~US$ 0 no app (sem spread); com o custo real da XM (~3 pips/op) pularia ~US$ 0,6 cada: ~US$ 100+ em 41 dias.
- **B "não vai atrás da perda" (hoje já fechou <= -US$ 10):** 360 sinais, **-US$ 77,50 (as 179 puladas renderam +US$ 135)**, -3,94 pips/op, 59% dos dias negativos, pior dia igual (-US$ 35: a perda vem de posições já abertas).
- **C (as duas):** 245 sinais, -US$ 72,51, 45% dos dias negativos.
**Leitura:** (1) pelo teorema da parada opcional, regra de parada não muda a esperança por operação; só quanto se opera. (2) A: preservou o ganho com 1/3 menos operações e menos dias negativos: coerente com economia de custo, é CANDIDATA (1 de 3 regras testadas; precisa de confirmação forward). (3) B: a amostra diz o contrário do que a intuição sugere (o que veio depois da perda rendeu +US$ 135, ~2 erros-padrão de US$ 67: pode ser acaso), então NÃO há evidência de que "não ir atrás da perda" ajude no resultado; como disciplina de capital, B não reduziu o pior dia. (4) Não ajustar o limite de US$ 10 olhando este resultado.

### 6.62 PRÉ-REGISTRO DA AVALIAÇÃO "ENTREI / NÃO ENTREI" (22/11/2026; escrito ANTES de haver qualquer decisão registrada)
O botão (AJUSTE-114) grava `decisaoUsuario = (entrei, em)` no sinal ainda ABERTO, uma vez, sem editar depois. Pergunta: escolher os sinais agrega valor sobre pegar todos? **Amostra:** sinais com decisão registrada antes do desfecho, a partir da data do primeiro registro. **Medida:** pips líquidos por operação (XM bid/ask quando houver velas; senão app com spread da tabela). **Comparação:** média dos "Entrei" menos média de TODOS os sinais do mesmo período (e menos a dos "Não entrei"), IC95 por blocos de dia. **Mínimo para concluir:** >= 100 sinais com decisão e >= 4 semanas; antes disso, só contagem. **Critério:** "agrega valor" se o IC95 da diferença (Entrei - todos) ficar inteiro acima de 0; inteiro abaixo de 0 = "atrapalha, siga a regra fixa"; cruzando 0 = "sem evidência". Também reportar a taxa de "Entrei" (viés de entrar menos = economia de custo, separar do efeito de escolha: comparar com a mesma fração de sinais sorteados).

### 6.63 PRIMEIRO DIA DO EXECUTOR EM MODO REAL NA DEMO (23/11/2026; `xm-cruzar.yml`, job 137819962417; 3 operações: NÃO é amostra, é conferência do mecanismo)
**Pedido do usuário:** "tem algo errado" (o app mostrava 11 WIN em 15 fechadas, +US$ 35, e o celular do XM mostrava 3 stops: BUY EURUSD 06:54, BUY GBPUSD 07:23, SELL USDCHF 10:52, horário de Brasília).
**Cruzamento (operações da XM x sinal do app):** 6 operações fechadas desde o marco do teste: 3 manuais de 04/11 (atrasos de 45 a 153 min, todas SL, -US$ 14,62) e **3 do executor de hoje**:
- EUR/USD COMPRA: sinal 07:00:41Z, entrada XM 07:01:44Z (atraso 1,0 min), preço app 1,09988, XM 1,10011 (derrapagem 2,3 pips = ask x preço médio), TP/SL 25/25 nos dois; app LOSS (fechou 10:00Z), XM SL -US$ 5,02.
- GBP/USD COMPRA: sinal 07:00:48Z, entrada 07:01:44Z (0,9 min), 1,31290 x 1,31296 (0,6 pip), TP/SL 25/25 (XM 24,9/25,1); app LOSS (fechou 11:10Z, ~47 min DEPOIS do stop da XM, 10:23Z), XM SL -US$ 5,02.
- USD/CHF VENDA: sinal 07:10:38Z, entrada 07:11:14Z (0,6 min), 0,83898 x 0,83882 (1,6 pip), TP/SL 21/21; **app WIN (fechou 08:35Z), XM SL -US$ 5,11** (a posição ficou ~5 h a mais aberta e foi ao stop às 13:52Z).
**Leitura:** (1) o MECANISMO funciona como projetado: atraso de ~1 min, preço de entrada a 0,6-2,3 pips do do app, TP/SL em pips iguais, ordens com SL/TP executadas (notificações de stop da XM batem com as linhas). (2) A divergência WIN (app) x SL (XM) do USD/CHF é o efeito já medido (6.44/6.48): o excursão favorável máxima do app foi 22,0 pips; o alvo na XM, vendendo e saindo no ask, exigia ~23,3 (21 + spread). (3) As 3 operações tomadas são a MESMA aposta (dólar fraco: EUR/USD e GBP/USD comprados, USD/CHF vendido) e perderam juntas quando o dólar subiu; o executor toma "os primeiros 3 sinais que chegam" (MaxPosicoes = 3), sem limite por lado do dólar nem por moeda (o aviso do app, AJUSTE-113, não vale para o EA). Das 15 fechadas do app no dia, as vencedoras incluíam muitas apostas em dólar forte que o EA não pegou porque as 3 posições já estavam cheias.
**Em aberto agora (não visível no cruzamento, que só lista fechadas):** os 3 sinais pendentes das 12:05-12:15 (GBP/USD VENDA, USD/CAD COMPRA, USD/CHF COMPRA) são os três de dólar FORTE; o EA provavelmente os pegou: de novo uma aposta só.
**O que NÃO se pode concluir:** 3 operações (p = 20% de 3 derrotas seguidas com acerto de 42%) não dizem nada sobre o sistema; o ponto é o desenho: (a) o resultado real fica abaixo do do app por custo, (b) "primeiros 3" produz cestas correlacionadas. **Proposta (decisão do usuário):** EA v1.20 com as mesmas regras do aviso do app (máximo 2 por lado do dólar, sem 17h-19h de Brasília, parar com perda do dia -US$ 15 e meta +US$ 10); sem poder compilar aqui, passa por teste estático e compilação do usuário; como só há 3 operações, mudar agora não invalida nenhuma avaliação.

### 6.64 SOMBRA RETROSPECTIVA DO EXECUTOR v1.20 SOBRE O HISTÓRICO DO APP (23/11/2026; `executor-sombra.yml`, job 137839251420; DESCRITIVA, com aproximações)
**Pedido do usuário:** a máquina precisa saber com que frequência as coisas acontecem para decidir como gerenciar; o MT5 só pode ser mexido à noite, então reconstruir com o histórico o que o log `[GESTAO-LOG]` mostraria. **Método:** 568 sinais fechados CONFIG em ordem; o EA toma o sinal se não há posição no mesmo par e há menos de 3 abertas (regras de base, valem sempre); sobre os tomados avalia SEM bloquear exposição por moeda (limite 2), 17h-19h de Brasília e parada do dia (fechado hoje <= -US$ 15 ou >= +US$ 10). A posição fecha quando o SINAL do app fecha (na XM o stop sai antes, por causa do spread). US$ do app, sem spread; pips com a tabela do Lab.
**Frequência:** o EA tomaria 223 dos 568 (39%); 345 (61%) seriam pulados pelo limite de 3 posições (0 por mesmo par). Entre os 223: 94 (42%) teriam algum aviso. Por regra: meta do dia 52 (23%), exposição por moeda 35 (16%; **todas no dólar**, nenhuma no iene), perda do dia 15 (7%), horário 17h-19h 11 (5%). Em ~44 dias: ~5 entradas/dia e ~2 avisos/dia.
**Resultado dos sinais que teriam sido AVISADOS (nesta amostra; n pequeno, erro-padrão de dezenas de US$):** meta do dia 52: **-US$ 20** (-4,78 pips/op, 46,2%); exposição por moeda 35: +US$ 5 (-0,32; 51,4%); perda do dia 15: +US$ 15 (+3,49; 60%); horário 11: +US$ 25 (+8,82; 72,7%). Todos os tomados: 223, +US$ 57,50, -0,33 pips/op, 52,5%; sem aviso: 129, +US$ 27,50.
**Leitura:** (1) o limite de 3 posições JÁ é a regra dominante (pula 61%). (2) A regra que mais agiria (meta do dia) é a que, nas duas análises (6.61 e esta), só teria evitado perdas: coerente com economizar custo sem cortar ganho. (3) Parar depois de perder (perda do dia) teria cortado ganhos (+US$ 15) nas duas análises: sem evidência de ajuda. (4) A exposição por moeda só é problema no dólar; o risco do iene (EUR/JPY + GBP/JPY) não apareceu no histórico. (5) Horário 17h-19h: nesta amostra os sinais "proibidos" ganharam (+US$ 25, n=11), mas o US$ do app não inclui o spread de 7 a 16 pips do rollover; não decide nada. NADA disto é significante e nada muda: o v1.20 segue em modo SÓ REGISTRA; o log real da XM é o que vale.

### 6.65 SPREAD NO JULGAMENTO DO APP (AJUSTE-117, 23/11/2026) e PERDA DO DIA LIBERADA NO EXECUTOR v1.20
**Pedido do usuário:** "colocar um spread de médio pra alto no app, levando em conta que na XM temos o valor real" e "liberar agora o bloqueio por perda".
**Spread do app:** por par, a MÉDIA do spread real das velas M5 da XM (05/10 a 20/11/2026, 10 pares; fica entre a mediana e os picos do rollover): EUR/USD 2,0; GBP/USD 2,3; USD/JPY 2,3; AUD/USD 2,4; USD/CAD 3,0; USD/CHF 2,9; NZD/USD 2,9; EUR/GBP 2,6; EUR/JPY 2,9; GBP/JPY 3,8 pips (medianas 1,9 a 3,0; a tabela do Lab, de 03/10, vinha de uma fonte externa e fica para o Laboratório). **Como entra** (`js/checker.js`, `scripts/spreadApp.js`): o preço do app é médio; na XM a compra entra no ask e sai no bid; então o TP só vale depois de andar TP + spread e o SL dispara depois de andar SL - spread (mesma regra do simulador do Lab). O valor GRAVADO continua +TP / -SL em US$, como na XM (onde o líquido também é exatamente o do alvo, porque o spread já está no preço de entrada). Cada sinal fechado leva `spreadAplicadoPips`. Trava: o spread nunca passa de 40% do SL. Desligar: `SPREAD_APP_ATIVO = false` em `scripts/spreadApp.js`.
**Verificação antes de publicar:** (1) com spread 0 o avaliador novo dá o MESMO resultado que o antigo em 4.000 cenários aleatórios (único campo que difere é o relógio `agora`/`tempoOperacao` quando a operação ainda está aberta); (2) com spread de 2,5 pips o desfecho muda em 5,3% desses cenários sintéticos; (3) testes fixos em `js/checker.spread.test.js`. NÃO foi testado contra o Firestore real: os primeiros fechamentos depois da publicação precisam ser conferidos (um documento com `spreadAplicadoPips` e o resultado plausível).
**ÉPOCA NOVA (consequência para as análises):** sinais fechados a partir de 23/11/2026 foram julgados COM spread; os anteriores, sem. As medidas (`registro()`, `metricas()` da regra 6.25, relatório do Telegram) NÃO descontam o spread de novo nos sinais com `spreadAplicadoPips`; o acerto do app tende a cair 4 a 6 pontos (o mesmo que a XM mostrava), e o EMPATE nesses sinais é SL/(TP+SL) = 50% (o spread já está dentro da taxa de acerto). O bloco "Histórico real" só passa a usar a época nova depois de 100 sinais fechados com spread (~8 dias); até lá usa só a antiga (sem misturar). As 400 primeiras e todas as avaliações pré-registradas anteriores seguem válidas (eram todas da época antiga).
**Perda do dia (executor v1.20) — decisão REVERTIDA no mesmo dia:** a chave única `ModoParadaDia` foi separada em `ModoPerdaDia` e `ModoMetaDia`; o usuário pediu para liberar o bloqueio por perda e, minutos depois, desistiu ("não quero que bloqueie ainda por perda"). Valem a última decisão e o padrão: as DUAS só registram (modo 1). Nota de evidência (6.61/6.64): parar depois de perder não melhorou o resultado nos dados; seria proteção de capital (limita a perda FECHADA do dia; posições abertas ainda perdem).
**Primeira conferência em PRODUÇÃO do AJUSTE-117 (23/11/2026 16:45Z, `result-checker` com o commit 1878535 + `conferir-spread.yml`):** o avaliador rodou sem erro (5 pendentes). Fechou 1 operação: EUR/GBP VENDA (aberta em 20/11 09:01Z), `SL_FINANCEIRO`, -US$ 5,00, `spreadAplicadoPips = 2,6` GRAVADO no documento (único documento da coleção, 1.142, com o campo; os 20 fechados antes da publicação não o têm, como esperado). Efeito visível da regra nova: a operação tinha andado -17 pips contra e o stop sem spread (~19,2 pips) não teria disparado; com o spread de 2,6 o SL passou a valer em ~16,6 pips e a operação foi fechada como LOSS (horário de fim gravado = vela da reabertura de domingo, 22/11 22:20Z). Consequência declarada: operações que já estavam abertas na publicação e entre SL-spread e SL pips contra passam a fechar como LOSS (é o que a XM faria). Corrigi duas vezes o meu filtro de conferência (hora do fim e depois campo); o código estava certo. Pendente: conferir de novo depois de ~100 fechados com spread (o bloco "Histórico real" muda de época nessa contagem).


### 6.66 Pré-registro: família de sinal "FIBO" (Fibonacci) no Lab — escrito em 23/11/2026, NÃO RODADO

**Pedido do usuário:** testar se um sinal baseado no gráfico de Fibonacci funciona; "se o gráfico de Fibonacci for favorável, o app dispara o sinal, mas no modo Lab". Também: "só sabemos agora que já passou; talvez não tivéssemos entrado naquela perda, ou deixado o stop 3 vezes maior".

**Resposta ao argumento do "20 ganhos : 10 perdidos" (simulação `centavos.py`, 10 pares M1 reais).** O 20:10 é a taxa de acerto. Com alvo +1 pip e sem stop, 97,6–98,7% das operações fecham no lucro, mas o p99 do tempo aberto chega a 5.574–11.532 min, e a perda flutuante máxima a 308–344 pips. Com stop de 10/30/100 pips o acerto sobe para 65–99,9% e o resultado esperado fica em −3,37…−1,17 pips por operação (≈ −spread). Com stop de 300 pips deu +0,62 (EURUSD, USDJPY) e −0,54 (GBPUSD): isso é uma perda única numa amostra de ~800, não uma vantagem. Alargar o stop só aumenta a taxa de acerto e o tamanho da perda; o valor esperado não muda (teorema da parada opcional). Já "talvez não tivéssemos entrado" só vale se for um filtro escrito ANTES e testado para frente: no retrospecto qualquer perda parece evitável, e qualquer ganho também. É exatamente para isso que existe o pré-registro.

**Hipótese (única):** entrar a favor da perna anterior quando o preço devolve 50–61,8% dela e uma vela volta a fechar na direção da perna tem resultado líquido de spread positivo.

**Regra (toda causal e fixa; implementada em `lab/fibo.js`, parâmetros em `PARAMS`):**
- Pivôs: máxima/mínima que é a maior/menor das 12 velas de cada lado (K=12; só é conhecida K velas depois). Zigzag alternado.
- Perna = pivô anterior → último pivô, só se tamanho ≥ 4×ATR(14) e idade ≤ 96 velas (8 h).
- Gatilho: fechamento da vela i devolveu entre 50% e 61,8% da perna; a vela fecha na direção da perna; o nível 78,6% ainda não foi tocado. Um sinal por perna.
- Stop = nível 78,6%. Alvo = o extremo da perna. Risco mínimo = 3×spread da vela.
- Entrada na abertura da vela seguinte (compra no ask = bid+spread; venda no bid). Saída: compra no bid, venda no ask. Vela que toca alvo e stop = LOSS.
- Dados: as 10 séries M5 da XM em `DOCUMENTACAO/arquivo-xm/` (04/10 a 19/11), todos os sinais, sem escolher par nem horário.

**Controle ALEATORIO:** mesma entrada e mesmas distâncias de alvo e stop, direção oposta; esperança exata = média entre o resultado real e o da direção oposta.

**Critérios (função `julgarFibo`; aprova só com os quatro):**
- C1: ≥ 150 operações decididas em ≥ 20 dias distintos.
- C2: IC 97,5% (bootstrap em blocos de dia, 10.000, semente fixa) do resultado médio por operação em pips, líquido, com limite inferior > 0.
- C3: IC 97,5% da diferença real − ALEATORIO com limite inferior > 0.
- C4: média positiva nas duas metades cronológicas.

**Se reprovar:** família encerrada, sem variante (outro K, outra zona, outro stop). **Se aprovar:** ainda não vale como sinal; vira candidata a um teste adiante (forward) em modo Lab/sombra, numa coleção separada, nunca oficial e nunca executada. O Lab ao vivo foi arquivado em 6.37, então ligar isso de novo exige decisão do usuário.

**Expectativa honesta (para registro):** a probabilidade a priori de aprovar é baixa. A família de sinais do app já teve 12+ avaliações pré-registradas sem vantagem antes do custo, e este desenho é de risco/retorno variável, com spread de 3 pips pesando contra. Estado: código e testes sintéticos prontos (`lab/fibo.js`, `lab/fibo.test.js`, workflow `lab-fibo.yml`, manual). Não foi executado sobre dado real; aguarda aprovação do usuário.

### 6.67 Resultado do pré-registro 6.66 (Fibonacci) — REPROVADA (23/11/2026, rodada única, aprovada pelo usuário)

Rodado uma vez, sem alterar parâmetro, sobre as 10 séries M5 da XM (04/10 a 19/11), `node lab/fibo.js DOCUMENTACAO/arquivo-xm/xm_barras_M5_*.csv` (commit 18175bb).

- 247 sinais gerados, **246 decididos** em **37 dias** (2 ficaram abertos no fim dos dados). Alvo médio 22,6 pips, stop médio 11,3 pips (relação ~2:1; ponto de equilíbrio do acerto ~33%). **Acerto real: 26%.**
- C1 amostra (≥150 ops, ≥20 dias): **passou**.
- C2 líquido: média **−1,59 pips/op**, IC 97,5% [−4,07; +0,95] → **falhou** (limite inferior não passa de 0).
- C3 contra o ALEATORIO: diferença +0,85, IC [−0,82; +2,55] → **falhou**.
- C4 duas metades: 1ª metade **+1,43**, 2ª metade **−4,61** → **falhou** (não é estável).
- Por par (n pequeno, só descritivo): GBPJPY +4,90 (n=25); USDJPY −4,91 (n=44); EURJPY −2,54 (n=52); EURGBP −6,63 (n=5); NZDUSD 1 sinal. Nenhum par tem amostra para sustentar uma conclusão.

**Conclusão:** família Fibonacci encerrada. Sem variantes (outro K, outra zona, outro stop) e sem modo Lab ao vivo. A média negativa é compatível com o custo (~spread) sem vantagem de direção: a diferença contra o ALEATORIO é positiva (+0,85) mas estatisticamente indistinguível de zero. Isso é a 13ª avaliação pré-registrada sem vantagem.

**Regra de trabalho a partir de 23/11/2026 (decisão do usuário):** só dados reais e só conta demo. Simulações com entradas hipotéticas/aleatórias sobre velas (como `centavos.py` e `pausa.py`, 6.66/6.67 e conversa de 23/11) ficam como histórico e **não** servem mais de base para decisão; novas análises usam o histórico real do app, as execuções reais da demo XM (`xm-cruzar`) e a coleta forward.

### 6.68 Custo real de operar ouro, prata e petróleo na XM (24/11/2026) — descritivo, sem teste de sinal

Pedido do usuário (opção B): descrever o custo antes de qualquer teste. Base: M1 reais da demo XM (05/10 a 24/11, ~50 dias) + swaps do MT5; EURUSD/GBPUSD como termômetro. Script `scripts/xm/custo-ativos.js` (+teste), lote 0,02 (o do executor na demo). Brent não entrou (decisão do usuário; OILCash cobre o petróleo).

| ativo | spread (mediana) | custo por operação (lote 0,02) | spread ÷ mediana 15 min | spread ÷ mediana do dia | swap/noite compra / venda | dia mexe (mediana / p95 / máx) |
|---|---|---|---|---|---|---|
| GOLD | US$ 0,49 | US$ 0,98 | 7,5% | 0,75% | −1,39 / +0,30 | US$ 131 / 296 / 337 |
| SILVER | US$ 0,067 | **US$ 6,70** | 41% | 3,65% | −1,28 / +0,27 | US$ 184 / 350 / 398 |
| OILCash | US$ 0,05 | US$ 0,10 | 17% | 1,6% | 0 (modo 3, valor 0) | US$ 6 / 13 / 20 |
| EURUSD | 1,9 pips | US$ 0,38 | 40% | 3,4% | −0,16 / +0,03 | US$ 11 / 20 / 21 |
| GBPUSD | 2,2 pips | US$ 0,44 | 40% | 3,7% | −0,07 / −0,08 | US$ 12 / 24 / 29 |

Leituras (descritivas):
- **Custo relativo ao quanto o preço anda:** ouro ~5× mais barato que o forex (7,5% do movimento de 15 min contra ~40%); petróleo ~2,4× mais barato; prata igual ao forex. Barato por volatilidade não é barato por dólar nem por risco.
- **Risco em dólares no mesmo lote é de outra ordem:** no lote 0,02, um dia comum do ouro mexe US$ 131 (13% de uma conta de US$ 970), e o p95 chega a US$ 296; o EURUSD mexe US$ 11. Para igualar o risco diário do EURUSD o lote do ouro seria ~0,0017 e o da prata ~0,0012, abaixo de qualquer lote mínimo usual (conferir na especificação do símbolo; se o mínimo for 0,01, o ouro já carrega ~6× o risco do EURUSD a 0,02).
- **Prata no lote 0,02: só o spread (US$ 6,70) já passa de US$ 5**, que é o TP/SL do app (mover US$ 5 = 0,05 de preço = 134% do spread). Inviável com a regra de US$ 5; no ouro o spread é 20% da distância de US$ 5.
- **Swap pesa mais que o spread no ouro e na prata ao segurar posição comprada:** −US$ 1,39 por noite no ouro (> o spread de US$ 0,98) e triplo na quarta (−US$ 4,17).
- **Horário:** spreads praticamente planos ao longo do dia; no rollover (17–19h BRT) o petróleo dobra (2,0×), o ouro sobe ~10% (0,52–0,54 contra 0,49), a prata ~4%.

Limites: ~50 dias de uma conta demo, spread é a mediana por hora (picos extremos aparecem só no máximo: ouro até US$ 2,39), o lote mínimo e o swap do petróleo (modo 3, valor 0) não foram conferidos na especificação do símbolo. Nada aqui é teste de vantagem; só diz quanto custa e quanto arrisca cada ativo.

### 6.69 Ganho intermediário no forex (dados reais): quantos sinais viraram LOSS depois (24/11/2026)

Pergunta do usuário: "quando o sistema informou um ganho intermediário, quantos sinais deram loss depois?". Script `scripts/xm/ganho-parcial.js` (workflow `xm-ganho-parcial.yml`, rodada de 24/11 01:33Z, 571 sinais fechados pela regra 6.25, 40 dias).

**Parte 1: o que de fato aconteceu (campo `avisoParcial` gravado pelo checker, aviso aos 60% do TP).**
- 305 sinais tiveram aviso; 266 terminaram WIN e **39 terminaram LOSS (12,8%)**. Sem aviso: 266 sinais, 239 LOSS (89,9%, mecânico: sinal que perde quase nunca passa dos 60%).
- Se tivesse encerrado em todo aviso: US$ 1.033,87 contra US$ 1.134,99 do que valeu, **−US$ 101** (a favor de esperar, na medida do app, sem spread; o spread é pago nos dois casos).

**Parte 2: outros limiares, mesmos sinais, preço real da XM (bid/ask; vela que também toca o SL não conta como "chegou").** 501 decididos (62 sem vela M5, 8 abertos). Grade fixa, nada escolhido depois. Média normal: −2,56 pips/op.

| limiar (% do TP) | chegaram | terminaram LOSS depois | média com "encerrar no limiar" | diferença (IC 95%, blocos de dia) |
|---|---|---|---|---|
| 30% | 68,5% | 33,8% | −3,11 | −0,55 [−2,99; +1,87] |
| 50% | 59,5% | 23,8% | −2,93 | −0,37 [−2,21; +1,45] |
| 60% | 54,9% | 17,5% | −3,39 | −0,83 [−2,25; +0,59] |
| 80% | 49,7% | 8,8% | −2,92 | −0,36 [−1,45; +0,82] |

Leitura: quanto mais cedo o limiar, mais sinais ainda terminam em perda (34% aos 30%, 9% aos 80%), mas encerrar no limiar **não** melhorou a média em nenhum deles (as quatro diferenças são negativas, nenhuma distinguível de zero). Consistente com a teoria: encerrar mais cedo troca ganhos grandes por ganhos pequenos e não cria vantagem. Descritivo; a conta não considera o spread de saída extra (o spread já está na entrada no julgamento bid/ask).

### 6.70 Pré-registro: matérias-primas (GOLD e OILCash), Fase A — escrito em 24/11/2026, SÓ DADOS FUTUROS

**Pedido do usuário:** modelo diferente do forex, alvos pequenos em dólares, o app avalia a entrada, avisa progresso até o alvo e oferece esticar o alvo se a reanálise for favorável; "quem decide é você".

**Princípios (regra do usuário de 23/11: só dados reais, só demo):**
- A evidência vem **só de dados posteriores a 25/11/2026 00:00Z** (o script `--desde` recusa o que vem antes). Os 50 dias de M1 já arquivados (05/10 a 24/11) **não** entram: não foram olhados para sinal nenhum, e este pré-registro foi escrito antes de qualquer resultado.
- Nenhuma ordem é enviada nesta fase. Mede-se o que o preço real (bid/ask por vela M1) teria feito com uma posição virtual em cada candidato, em paralelo com todos os alvos e as três políticas, o que ordens reais não permitem na mesma conta.
- A coleta é a exportação M1 que o usuário já faz (`XM_ExportarBarras`, símbolos `GOLD,OILCash`, M1), de preferência semanal, sempre com `Desde = 2026.11.24 00:00`. O `XM_Exporter` ao vivo não transmite barras.

**Regras fixas (`lab/materias.js`, constantes `PARAMS` e `ATIVOS`):**
- Avaliador de entrada a cada :00/:30, no fechamento da vela M1: janela de 60 velas contíguas, `ER = |net| / caminho >= 0,30`, `|net| >= 4 × spread`, spread da vela ≤ 1,5 × a mediana das 1.440 velas anteriores, fora de 17h–18h BRT; direção = continuação do `net`; no máximo 1 candidato por ativo a cada 30 min; entrada na abertura da vela seguinte (compra no ask, venda no bid).
- Grade: alvo T por ativo (GOLD US$ 2/3/5 por onça; OILCash US$ 0,25/0,50/1,00 por barril), stop = k×T com k em 1 e 2, tempo máximo 480 velas (fecha a mercado), vela que toca alvo e stop = stop, swap cobrado se atravessa a meia-noite do servidor (triplo de quarta para quinta). Piso de alvo do ouro: com spread de US$ 0,49 por onça, alvos abaixo de ~US$ 2 são dominados pelo spread (por isso os centavos pedidos não entram no ouro).
- Políticas: P1 alvo fixo; P2 encerra ao chegar em 80% de T; P3 ao chegar em 80% de T, se o mesmo avaliador ainda aponta a favor no fechamento daquela vela, o alvo vira 2T (stop igual), senão encerra em 80%.
- Controle ALEATORIO: mesma entrada e mesma geometria, direção oposta; esperança exata = média entre real e oposta.

**Critérios (célula primária por ativo: P1, k=1, T = US$ 3 no ouro e US$ 0,50 no petróleo; aprova só com os quatro):**
- C1: ≥ 300 operações em ≥ 20 dias distintos.
- C2: IC 97,5% (bootstrap em dias, 10.000, semente fixa) do resultado líquido médio por operação, limite inferior > 0.
- C3: IC 97,5% de real − ALEATORIO com limite inferior > 0.
- C4: média positiva nas duas metades cronológicas.
Bonferroni para dois ativos (nível 97,5%). Reprovou: ativo encerrado, sem variantes.

**Descritivo (sem aprovação, só responde às perguntas do usuário):** grade completa, e P2/P3 contra P1 com IC da diferença. A hipótese nula é que encerrar ou esticar não muda a esperança por operação (parada opcional; já confirmado em 6.69 no forex). Como são ~12 células por ativo, nenhuma conclusão sai dessa tabela sem confirmação em amostra nova.

**Expectativa honesta:** probabilidade baixa de aprovar (14 famílias do projeto sem vantagem líquida de custo; a continuação de ER é a família de momentum que já falhou em D1). Se reprovar nas duas, nada vai ao executor. Se aprovar uma, o passo seguinte é execução real na demo com o lote mínimo, decisão do usuário.

Estado: código e testes sintéticos prontos (`lab/materias.js`, `lab/materias.test.js`, workflow manual `lab-materias.yml`). Nenhum resultado olhado. Mínimo para a primeira leitura: ~4 semanas de dados novos (20 dias de mercado), ou seja, a partir de ~22/12/2026.

### 6.71 Copytrade da XM: o que os 7 primeiros do ranking operam (coleta manual de 23/11/2026, resumo ANONIMIZADO)

Origem: relatório feito pela outra conversa do usuário (navegador logado, só leitura) com 723 trades fechados dos 7 primeiros de "Melhores desempenhos" (30 dias). **Não registrado aqui:** nomes, handles e IDs das estratégias e os trades crus (repositório público; conteúdo de sessão logada de terceiros). Tratado como dado de terceiros a validar, não como prova.

- **Nenhum dos 7 opera Forex.** Ativos: ouro (GOLD, em 5 das 7), JP225 (Nikkei) e US100 (Nasdaq). Nenhum opera OILCash.
- **Ouro:** 37% dos trades e 77% do lucro líquido da amostra, mas 50% do lucro total vem de UMA estratégia (A) e 14% de UM trade (+US$ 771), concentrados numa tarde (23/11, ouro em alta). Isso é uma semana de tendência, não um método comprovado.
- **Perfil de risco:** hedge/"trava" (81 trades fechados com P&L US$ 0,00, perna oposta fechada no mesmo preço), preço médio, perdedores segurados por até 77 h, rajadas de dezenas de ordens no mesmo minuto (uma estratégia fatiou ~2 apostas em 345 trades; 97% de acerto), alavancagem 1:500 e contas de ~US$ 1.000. Declínio máximo e "grau de risco" da XM não capturam isso (parece medir só posições fechadas). É o perfil de cauda negativa já descrito em 6.66, aqui com perda adiada, não evitada.
- **"Retorno 1 mês" do ranking não bate com os trades:** duas estratégias do mesmo gestor mostram +3.792% e +3.058% com trades visíveis no prejuízo (−US$ 19,77 e −US$ 6,20); nas outras o retorno anunciado é de 5 a 20 vezes lucro ÷ fundos próprios. Hipótese não verificada: retorno calculado sobre capital inicial minúsculo e variável.
- **Escala útil para a Fase A (6.70):** no ouro, ganho médio de ~US$ 2,7 a 3,8 por onça e duração mediana de 47–51 min (uma fecha em 2 min). A grade de ouro (US$ 2/3/5 por onça, até 480 min) fica dentro disso; não alterada.
- **Especificação deduzida dos trades, conferida com o `xm_swaps.csv`:** ouro 100 onças por lote, USD. JP225 cotado em JPY (¥1 por ponto por lote) e GER40 em EUR exigem conversão de moeda (mesmo problema do BUG-027 do `marketAnalyzer`); US100/US500/US30 US$ 1 por ponto; BTCUSD 1 BTC por lote. Lotes não são comparáveis entre ativos: risco medido em USD.
- **Pendência para checar:** o relatório diz que só uma estratégia paga swap, mas uma segurou ouro por 77 h; pela nossa tabela o swap de compra do ouro é ~−US$ 0,70 por onça por noite. Pedir à outra conversa o swap por trade dessas posições.
- **Limites da coleta:** só os 200 trades mais recentes por estratégia (duas ficaram parciais), só posições fechadas (a perda flutuante não aparece), horários no fuso do navegador, ranking que muda minuto a minuto.
- **Acesso:** a XM não tem API pública para isso; coletar de forma automática seria raspagem de interface e possivelmente contra os termos. Tratar como coleta manual pontual; qualquer automação só depois de ler os termos.

**Decisões (24/11/2026):** Fase A (6.70) mantida sem mudança; exportar também `US100Cash` na coleta semanal só para guardar dados (sem pré-registro nem teste ainda; JP225 e GER40 ficam para depois da conversão de moeda testada); nenhuma das 7 estratégias é copiada; um "auditor de copytrade" que recalcula métricas a partir dos trades entra no backlog.

### 6.72 Copytrade da XM, 2ª coleta: Forex, risco declarado e histórico (coleta manual de 23/11/2026, resumo ANONIMIZADO)

Origem: segundo relatório da outra conversa do usuário (só leitura da interface, sem script nem endereço interno; 13 estratégias abertas em detalhe, trades só da 1ª página de fechadas por estratégia, datas e retornos mensais lidos de gráficos, ±2 pontos). Mesma regra da 6.71: nomes, handles e IDs não entram aqui (repositório público); dado de terceiros, tratado como hipótese a validar. Verificado em 24/11: nenhuma cópia dos relatórios nem endereço interno da XM está no repositório.

- **Forex é o canto pequeno:** o filtro Forex tem 29 estratégias, US$ 139.887 investidos e 523 investidores; melhor retorno de 1 mês 95%; 12 das 29 negativas no mês. Dois produtos de ouro sozinhos somam ~US$ 600 mil.
- **Idade da conta ≠ histórico de operação:** várias contas "antigas" só operaram no último mês (retorno "desde sempre" = retorno de 1 mês; gráfico mensal com uma barra). Nas 5 primeiras do filtro "risco Baixo", nenhuma tem 3 meses de operação real.
- **Quase todas com mais de 3 meses tiveram queda forte:** declínio máximo de 17% a 50%, quedas recentes (set–nov/2026), perda média até 8,7× o ganho médio. Única exceção vista: uma estratégia de 26 meses (+84% acumulado, ganho médio US$ 35 contra perda média US$ 19, acerto 75%), mas ela escalona vendas aumentando o lote contra o preço, tem out e nov negativos e paga swap; estrutura de preço médio, ou seja, cauda escondida plausível, não provada.
- **Rótulos da XM não descrevem o risco:** um produto de ouro "Baixo risco" declara martingale na descrição; outro com "Low DD risk" teve declínio de 50% e dobra o lote contra o preço; um com 100% de acerto nas fechadas carrega ~US$ 161 de perda em 7 posições abertas. O filtro de categoria também falha (estratégia de Forex em "Algorítmico", uma de matérias-primas fora do filtro de matérias-primas).
- **Swap:** zero em 4 das 6 estratégias que seguram posição por dias (8 a 76 dias, inclusive ouro comprado por 9 dias), o que é incompatível com a nossa tabela de swap da demo (ouro, compra: −69,5 pontos por lote por noite) e sugere contas sem swap, não confirmado (a página não mostra o tipo de conta). Onde há swap, pesa: em um bloco de AUDNZD, US$ 171 contra US$ 235 de lucro (~73%); em outra, 23 trades com −US$ 241 contra US$ 1.254 (~19%). A página não diz se o "lucro" já desconta o swap.
- **Petróleo existe no copytrade** (corrige a 6.71, que olhou só o top 7): duas estratégias confirmadas nos trades (WTI, Brent e gás natural), mais ~8 pelo nome. Perfil: grade ou preço médio, perda média 4 a 9× o ganho médio; uma delas, 16 meses de histórico, tem só +27% acumulado e declínio de 43% recente (o +68% do mês é rebote). Contrato de petróleo 100 barris (US$ 100 por US$ 1 de movimento), o que confere com o `tamanho_contrato` do OILCash no nosso `xm_swaps.csv`; o preço do WTI nos trades (US$ 81–88 em out–nov) está dentro da faixa que medimos (81–106); o Brent (US$ 111–118 nos trades) não temos para conferir.
- **Para qualquer métrica nossa (app, executor, auditor):** incluir P&L flutuante e a razão ganho médio ÷ perda média, não só taxa de acerto; swap parametrizado por conta e instrumento (pode comer 20% a 70% do lucro de quem segura dias); histórico = período com operações; classificar pelos trades e não pelo rótulo.

**Leitura do projeto (24/11/2026):** as duas coletas (7 do topo geral + Forex e risco declarado) não mostram vantagem replicável em lugar nenhum; o que domina é adiamento de perda (martingale, grade, preço médio, trava, segurar perdedor), que sustenta acerto alto até a perda grande chegar. Isso reforça a Fase A (6.70, posição única, perda sempre realizada, sem trava) como o jeito certo de testar, e não muda nenhum parâmetro dela. Auditor de copytrade segue no backlog.

### 6.73 Pré-registro: pausa depois de uma perda (N = 2 e 3) e sequências de dias — escrito em 24/11/2026, ANTES de rodar

**Pedido do usuário:** testar "esperar 2 ou 3 sinais depois de uma perda" nos sinais reais (app e executor), **só como aviso, nada bloqueia**; e medir quantos dias seguidos de ganho existem, quanto a perda dura depois do primeiro loss e quantas vezes se intercalam.

**O que já existia e o que é novo:** em 6.4x (400 primeiras, `analise400.js#sequencias`) a leitura UTILIZÁVEL já mostrou que depois de WIN e depois de LOSS a chance do próximo ser WIN é a mesma (47,4% x 48,2%): as rachas na ordem de fechamento eram posições simultâneas na mesma aposta do dólar. Em 6.61 (caminho do dia) não houve "memória" dentro do dia. Novo aqui: (1) a regra de pausa de N sinais comparada com o que ela teria pulado, (2) sequências DIA a DIA (não existia), (3) tudo sobre as fechadas de hoje (571 em 24/11), não só as 400 antigas.

**Regra A (única, fixa):** na ordem de ABERTURA dos sinais fechados (regra 6.25), quando um sinal do app fecha em LOSS, os próximos N sinais que ABREM depois desse fechamento ficam "em pausa" (o aviso diria "espere"); nova perda reinicia em N (não acumula). Só vale o que já estava fechado na abertura do sinal. Medida: pips líquidos por operação (`registro().liq`; os sinais já julgados com spread não descontam de novo).
- Comparação: média dos TOMADOS − média dos EM PAUSA, IC 97,5% (Bonferroni para N=2 e N=3) por bootstrap em blocos de dia de abertura (10.000, semente fixa).
- **Critério ("pausa útil", só candidata):** ≥ 100 sinais em pausa, ≥ 20 dias e limite inferior do IC > 0. Qualquer outra coisa = SEM EVIDÊNCIA. Mesmo "útil" continua só aviso; a confirmação exigiria amostra nova (sinais fechados depois de 24/11).
- Expectativa a priori: ~nenhuma diferença (parada opcional: regra de parar não muda a esperança por operação; e a leitura utilizável já não mostrou memória em 6.4x).

**Descritivos (sem veredito, poucos dias):**
- B (dias): resultado do dia (dia de Brasília do fechamento) em US$ do app e em pips líquidos; corridas de dias de ganho e de perda, tamanho da maior sequência, alternâncias e teste de corridas (Wald-Wolfowitz); chance do próximo dia ser de ganho depois de ganho e depois de perda.
- C (sinal): P(WIN | último resultado conhecido na abertura).

**Executor:** só tem poucas operações reais desde 23/11 (ver 6.63); não entra até haver ≥ 30 fechadas (nesse caso rodar o mesmo teste sobre `xm_conta`). Hoje serve só o `historico` do app.

Código: `scripts/relatorio/pausa-sinais.js` (+teste), workflow `pausa-sinais.yml`.

### 6.74 Resultado do pré-registro 6.73 (pausa depois de perda e sequências de dias): SEM EVIDÊNCIA (24/11/2026, rodada única, `pausa-sinais.yml`, run 45316022313, commit 7d7ca03; 572 fechadas, 44 dias)

**Regra A (pausa de N sinais depois de um LOSS do app; só aviso, nada bloqueia):**
| N | em pausa | pips líq./op: tomados | em pausa | diferença (tomados − em pausa), IC 97,5% | acerto: tomados / em pausa | veredito |
|---|---|---|---|---|---|---|
| 2 | 293 (51%) | −1,02 | −1,49 | +0,47 [−5,25; +5,95] | 52,0% / 50,5% | SEM EVIDÊNCIA |
| 3 | 381 (67%) | −1,38 | −1,20 | −0,18 [−6,76; +6,13] | 51,8% / 50,9% | SEM EVIDÊNCIA |

Em US$ do app a diferença também é nula (0,20 contra 0,06 e 0,18 contra 0,10 por operação). **Poder baixo:** o IC tem meia-largura de ~5–6 pips, então este teste nem enxergaria um efeito de 3 pips. "Sem evidência" aqui não prova que a pausa não funciona; diz que não há nada a ver e que não dá para verificar um efeito pequeno com ~570 sinais. O mecanismo também não existe (parada opcional; ver 6.60/6.61).

**Nível do sinal (leitura utilizável: só o que já fechou na abertura):** depois de WIN, o próximo vence 50,8% (n=335); depois de LOSS, 51,5% (n=233). Sem memória, igual ao achado das 400 primeiras (6.4x, 47,4% x 48,2%).

**Sequências de dias (dia de Brasília do fechamento; 43 dias):**
- Em US$ do app: 17 dias de ganho, 21 de perda (e 5 sem fechamento positivo ou negativo). **Maior sequência de ganho: 7 dias; de perda: 5 dias.** Tamanhos das sequências de ganho: 1 dia (6×), 2 dias (2×), 7 dias (1×). De perda: 1 dia (1×), 2 (4×), 3 (1×), 4 (1×), 5 (1×). 17 corridas (alternâncias: 16) contra 19,8 esperadas ao acaso, z = −0,93: **sem evidência de agrupamento**. Depois de dia de ganho, o próximo é de ganho em 50% (n=16); depois de dia de perda, em 38,1% (n=21), diferença dentro do ruído (erro-padrão ~11 pontos).
- Em pips líquidos de spread: 17 ganhos, 26 perdas; maior sequência de ganho 3, de perda 8 dias; 19 corridas contra 21,6 esperadas, z = −0,83; depois de ganho 43,8% (n=16), depois de perda 34,6% (n=26).
- Os 7 dias seguidos de ganho em US$ podem ser a semana de 09/11 (única de tendência limpa do dólar, 6.49/6.50); as datas não foram conferidas aqui.

**Leitura:** não há memória de um dia para o outro nem de um sinal para o seguinte que a pausa possa aproveitar; os dias de ganho e de perda se alternam como em um sorteio. Em pips líquidos, o mês fica negativo (26 dias de perda contra 17 de ganho), o que é o custo aparecendo. **Decisão:** a pausa NÃO vira aviso novo no app (não há evidência e acrescentaria ruído). Os limites de 6.60 (3 abertas, 2 por lado, perda do dia US$ 15, horário) continuam como avisos. Executor: ainda poucas operações (ver 6.63); o mesmo teste só roda sobre `xm_conta` com ≥ 30 fechadas.

### 6.75 O dia 24/11 do app contra o da XM, sinal a sinal (24/11/2026; `hoje-app-xm.yml` run 45512052454 + leitura do MT5/XM feita pela outra conversa do usuário; arquivo do dia em `DOCUMENTACAO/xm-executor-dias/2026-11-24.json`)

**Pedido do usuário:** "preciso que o app e a XM trabalhem iguais" (os dois tiveram lucro hoje, mas os totais diferem).

**Totais do dia (dia de Brasília, 20h):**
- **App:** 18 sinais; 12 fechados (8 WIN, 4 LOSS, **+US$ 20**) e 6 ainda abertos (flutuante ≈ +US$ 2,07).
- **XM (executor):** 7 entradas, 4 fechadas (3 TP, 1 SL, **+US$ 10,13**, swap e comissão 0,00) e 3 abertas (flutuante ≈ +US$ 5,98). Saldo US$ 980,36.

**Por que diferem (cruzamento por ID do sinal; os 18 sinais do app aparecem no log do executor, nenhum se perdeu):**
1. **O executor tomou 7 dos 18.** 10 foram PULADOS pelo limite de 3 posições e 1 porque já existia posição em EURGBP. Dos 10 do limite, 7 já fecharam no app: 5 WIN, 2 LOSS, **+US$ 15**. Isso é por desenho: o app conta todos; o executor, só quem coube em 3 vagas.
2. **EUR/GBP venda (04:05, aberta no app e na XM):** o app a fechou como **LOSS às 11:35 (−US$ 5)**, mas na XM ela **continua aberta há mais de 16 h**, a ~0,3 pip do preço de entrada (SL 19,2 pips não tocado, flutuante +0,08). Nas 4 outras operações fechadas dos dois lados o resultado coincide (AUD/USD LOSS−SL, GBP/JPY WIN−TP, GBP/JPY WIN−TP, USD/CAD WIN−TP). **Sozinha, a EUR/GBP explica a diferença de US$ 5,13 entre o que o app contou nas 5 operações tomadas (+US$ 5) e o que a XM contou (+US$ 10,13 fechado, +0,08 flutuante).** As 3 abertas do app que o executor também tem (GBP/JPY e USD/CAD) estão coerentes (app +2,93 e +4,04; XM +2,14 e +3,83).
3. **A posição velha travou vagas:** a EUR/GBP, aberta na XM mas "fechada" no app, ocupou uma das 3 vagas o dia inteiro e é um dos motivos dos 10 pulos por limite (a admissão do executor depende do estado da XM, não do app).
4. **Horário de fechamento:** na GBP/JPY das 06:35 a XM fechou no TP às 10:06 (BRT) e o app só às 11:20, 74 min depois, mesmo resultado; na AUD/USD o app fechou 09:50 e a XM 10:05. Fonte de preço diferente (TwelveData x XM).
5. **Derrapagem de preço de entrada nas compras de GBP/JPY: 5,3 e 4,9 pips a favor** (XM entrou abaixo do preço do app), ~13% do TP de 39,8 pips; deu TP nos dois casos, mas é fonte de divergência futura. **Convenção:** no log do executor, `derrapagem` positiva = PIOR que o preço do sinal (`XM_Executor.mq5:274`), negativa = a favor; o campo `derrapagemPips` do `cruzar.js` é valor absoluto (sem sinal).

**O silêncio da tarde NÃO foi a fila:** a outra conversa levantou a hipótese de falha da fila (HTTP 1003: 6 hoje, 4 à tarde) porque nenhum sinal chegou ao executor depois das 12:21. O histórico do app mostra que **o app não gerou nenhum sinal depois de 12:20**: o scanner rodou a cada 5 min, sem erro, das 15:45 às 20:40 (60 de 60 execuções com sucesso; trecho anterior não conferido). No log de 17:00: 4 pares em "Cooldown / Operação recente" (cada um com sinal ainda aberto, EUR/USD, GBP/USD, USD/CAD, USD/CHF) e 6 fora da janela operacional (USD/JPY, AUD/USD, NZD/USD, EUR/JPY, GBP/JPY, EUR/GBP); 0 sinais, 0 erros. O app tem, na prática, no máximo 1 sinal aberto por par. Os HTTP 1003 não custaram nenhum sinal hoje (todos os 18 estão no log).

**Para que o app e a XM trabalhem iguais (opções, decisão do usuário):**
- A (sem compilar, F7 no executor): subir `MaxPosicoes` de 3 para o máximo aceito (12), para a XM tomar praticamente todos os sinais (a regra de 1 posição por símbolo continua). Reduz a diferença (1).
- B (precisa de dados da XM): exportar M5 dos 10 pares desde 19/11 e rejulgar com o preço da XM os sinais de 23 e 24/11, para medir quantos sinais o app e a XM julgam diferente e por quê (caso EUR/GBP e o atraso de 74 min na GBP/JPY).
- C (decisão grande, só se B mostrar divergência frequente): o app passar a julgar WIN/LOSS com as barras da própria XM (o exportador MT5 enviaria as barras), eliminando a diferença de fonte de preço. Exige mudar o EA e o `js/checker.js`.

### 6.76 O app julga como a XM? Rejulgamento com M5 reais da XM (25/11/2026; `xm-concordancia.yml` run 45516186239, commit 9240496; 78 sinais de 19/11 a 24/11; DESCRITIVO)

**Método:** cada sinal do `historico` rejulgado com as velas M5 reais da XM (bid/ask, `rejulgar.julgar`, entrada na abertura da vela do sinal) e comparado com o resultado que o app registrou. M5 dos 10 pares de 19/11 a 25/11 juntado ao arquivo (nova barra vence na sobreposição; 53 de 54 barras idênticas). Duas épocas: antes do spread no app (julgado sem spread, até 23/11 16:45Z) e depois (`spreadAplicadoPips`).

**Concordância de resultado (quando os dois decidiram):**
| época | sinais | decididos nos dois | concordam | app WIN / XM LOSS | app LOSS / XM WIN | horário: mediana da diferença | dentro de 15 min |
|---|---|---|---|---|---|---|---|
| sem spread no app | 60 | 53 | **51 (96,2%)** | 2 | 0 | 5 min | 71,7% |
| com spread no app | 18 | 17 | **17 (100%)** | 0 | 0 | 5 min | 88,2% |
Total 68 de 70 (97,1%). As 2 divergências são da época sem spread e são ambas "app WIN, XM LOSS" (o sentido que o spread explica).

**Validação contra o que a XM de fato fez (7 entradas do executor em 24/11, `xm_real` no arquivo do dia):** o modelo por vela bate com a XM real em 6 de 7 (AUD/USD LOSS, GBP/JPY WIN, GBP/JPY WIN, USD/CAD WIN, EUR/GBP aberta, USD/CAD aberta); a 7ª (GBP/JPY das 11:25) o modelo dá WIN às 14:30 e a XM real ainda estava aberta às 20:32. O horário do modelo pode ficar horas fora do da XM (GBP/JPY das 06:35: XM real 10:06, modelo 11:25) porque a vela M5 não tem o instante nem o preço exato do preenchimento (1 a 2 pips de diferença na entrada movem o nível do TP). O caso conhecido de 23/11 (USD/CHF, app WIN 08:35Z, XM stop às 13:52Z) é reproduzido pelo modelo (LOSS às 13:55Z).

**As divergências, uma por uma:**
1. **USD/CHF venda de 23/11 (04:10 BRT):** app WIN, preço da XM LOSS às 10:55 BRT; a XM real tomou stop às 10:52. É o efeito do spread (época anterior à correção); com o spread no app deixou de ocorrer.
2. **USD/CAD compra de 19/11 (16:10 BRT):** o app só a fechou em 23/11 12:05 (WIN, 3,8 dias depois); pelo preço da XM o stop já tinha sido tocado em 20/11 10:25. Época sem spread; a janela de velas do checker NÃO explica (ele reconstrói todas as velas desde a abertura, até 5.000). Provável diferença de fonte de preço (TwelveData x XM) numa vela de fronteira; não confirmado.
3. **EUR/GBP venda de 24/11 (04:05 BRT):** app LOSS às 11:35, XM aberta há 16 h (o modelo com as velas da XM também a deixa aberta). O maior preço de venda (ask) da XM antes das 11:40 foi 0,83785, a 16,5 pips da entrada; o SL é 19,2 pips. Medido sobre o bid, a adversidade máxima foi ~16,3 pips e o stop da XM exige ~16,8 (SL menos o spread real de 2,4); o app, com o spread médio da tabela (2,6), exige ~16,6. **Foi um quase-acerto de 0,3 pip**: a fonte de preço do app passou da fronteira, a XM não. O mecanismo é pequeno, o efeito em R$ foi de US$ 5 e travou 1 das 3 vagas do executor.
4. **EUR/GBP compra de 24/11 (11:41 BRT, o executor pulou):** o app a mantém ABERTA; pelo preço da XM o SL foi tocado às 19:00 BRT (instante do rollover do servidor, quando o spread abre). A conferir se a XM de fato daria o stop aí.
5. **GBP/JPY de 11:25 BRT:** app aberta, modelo WIN às 14:30, XM real aberta: limite de resolução da vela M5 (entrada real 1,6 pip melhor que a abertura da vela).

**Leitura:** o app e o preço da XM já concordam em ~97% dos resultados, 100% depois do spread no app (17/17, amostra pequena). O que sobra é ruído de fronteira: as distâncias de TP/SL são de 20 a 40 pips e as duas fontes de preço diferem em 0,3 a 5 pips (GBP/JPY: a XM entrou ~5 pips abaixo do preço do app nas compras de hoje); quando o preço fica a menos de 1 pip do nível, uma fonte cruza e a outra não. Para eliminar o ruído de vez, o app teria de julgar com as barras da própria XM (opção C da 6.75), o que exige mudar o EA e o checker. **Recomendação:** não fazer isso ainda; esperar ~100 sinais com spread, MaxPosicoes = 12 (admissão igual) e repetir esta mesma conferência, porque 97–100% é um nível em que o custo de mudar o app pesa mais que o ganho.

### 6.77 Emenda ao pré-registro 6.70 e combinado de funcionamento das matérias-primas e do índice (25/11/2026; ANTES de qualquer dado de avaliação)

**Decisão do usuário (25/11):** por enquanto só **ouro (GOLD), petróleo (OILCash) e índice Nasdaq (US100Cash)**; Brent fora; "vai funcionar diferente do forex".

**Emenda (código `lab/materias.js`, testes passando; nenhum dado posterior a 25/11 00:00Z existe ainda, então nada foi olhado):**
- US100Cash entra como 3º ativo. Alvos em **múltiplos do spread mediano das primeiras 1.440 velas do arquivo** (8×, 15× e 30×; primário 15×). É custo, não resultado, e como o arquivo só cresce no fim esse trecho nunca muda. Unidade: pontos do índice (1 ponto = US$ 1 por lote cheio, deduzido dos trades de copytrade, a conferir no `tamanho_contrato` do `xm_swaps.csv` da primeira exportação).
- **Bonferroni para 3 ativos:** nível do IC passa de 97,5% para **98,33%** (1 − 0,05/3).
- Todo o resto de 6.70 (avaliador de entrada, grade de alvos de GOLD e OILCash, k de stop, políticas P1/P2/P3, controle ALEATORIO, critérios C1 a C4, dados só a partir de 25/11 00:00Z) permanece igual.

**O que está combinado e como difere do forex:**
| | Forex (app atual) | Matérias-primas e índice (este módulo) |
|---|---|---|
| Fonte de preço | TwelveData (preço do app) | Velas M1 reais da própria XM (bid/ask por vela), exportadas do MT5 |
| Quem gera a entrada | pipeline do app (scanner → score → decisão) | avaliador fixo e causal (continuação de tendência, ER ≥ 0,30 em 60 velas, a cada :00/:30) |
| Unidade | pips | dólares por onça / barril; pontos no índice |
| Alvo | TP/SL em pips por par (US$ 5) | grade: GOLD US$ 2/3/5, OIL US$ 0,25/0,50/1,00, US100 8/15/30 × spread; stop = 1× ou 2× o alvo; limite de 8 h |
| Gestão | alvo e stop fixos; avisos | 3 políticas medidas em paralelo: alvo fixo, sair a 80% do alvo, ou esticar para 2× se a reanálise ainda for favorável |
| Posição | várias por moeda (limites em avisos) | uma por vez, perda sempre realizada, sem trava nem preço médio |
| Dinheiro | demo (executor) | **nenhuma ordem na Fase A**: posições virtuais com preço real |
| Evidência | regra 6.25 (400 fechadas, 30 dias) | ≥ 300 operações em ≥ 20 dias de mercado, só dados após 25/11 |
| Avaliação | histórico oficial do Firestore | `lab/materias.js` (workflow manual `lab-materias.yml`), fora do histórico oficial |

**Logística:** (1) o usuário exporta M1 com `XM_ExportarBarras` (`GOLD,OILCash,US100Cash`, `Desde 2026.11.24 00:00`, M1) pelo menos 1 vez por semana e manda o pacote; (2) o Code junta ao arquivo e confere a integridade; (3) a primeira conferência rápida é em ~01/12 (dados chegaram íntegros, quantas entradas o avaliador gerou); (4) o veredito sai com os critérios cumpridos, por volta de **22/12**; (5) só se um ativo passar entra a Fase B (avisos de progresso até o alvo e "quer esticar?") e depois uma Fase C com execução real na demo, em lote mínimo e regras próprias (decisão do usuário, não é o executor do forex). Reprovou, o ativo é encerrado sem variantes.

**Ainda NÃO definido (a decidir antes da Fase B):** lote mínimo e valor por ponto de cada símbolo (conferir na especificação do MT5); como os avisos chegam ao usuário (app ou outro canal); se o módulo ganhará uma aba própria no app; regras de horário do índice (a sessão do US100Cash é mais curta que a do ouro; as lacunas de dados já impedem entrada fora do pregão).

### 6.78 Emenda 2 ao pré-registro: alvo, stop e lote adaptativos, ordens reais na demo e funcionamento ao vivo no app (25/11/2026; ANTES de qualquer dado de avaliação)

**Decisões do usuário (25/11):** (1) sinais em **coleção separada** `historico_materias` (não no `historico` do forex, para não contaminar a base do forex nem o aprendizado do RMI); (2) alvo, stop e lote **dependem da análise do mercado**, não são fixos; (3) **já pode abrir ordem na XM (conta demo)**: tudo é em função de mercado real, só na demo; (4) pode mexer no workflow do scanner de produção (passo extra, `continue-on-error`). Sem opção manual por enquanto; notificações como as do forex.

**Regra adaptativa (única, fixa; `lab/materias.js`: `dimensionar`, `lotePorRisco`):** no fechamento da vela M1 i, sobre as 1.440 velas até i: R15 = mediana da amplitude (máx − mín) das janelas de 15 min (janelas com ≥ 10 velas); spreadMed = mediana do spread. **T = max(0,5 × R15, 8 × spreadMed)** e **stop S = T** (relação 1:1), arredondados à casa decimal do preço. **Lote** = maior múltiplo do passo com risco (lote × US$/unidade × S) ≤ **US$ 5**, com piso no lote mínimo; **sem sinal** se o lote mínimo já passar de US$ 7,50 de risco. Mercado calmo: o custo manda (T = 8× spread); mercado agitado: a volatilidade manda (T = metade da amplitude típica de 15 min). Uma regra só para os três ativos.

**Critério do veredito (substitui a "célula primária fixa" de 6.70/6.77; o resto de 6.70 fica):** braço adaptativo, política P1, **resultado em R** (alvo = +1, stop = −1, spread já dentro, swap na travessia da meia-noite do servidor). C1 ≥ 300 operações em ≥ 20 dias; C2 limite inferior do IC (blocos de dia, nível 98,33%, Bonferroni para 3 ativos) do R médio > 0; C3 limite inferior do IC de (R real − R do ALEATORIO) > 0; C4 R médio positivo nas duas metades. Com 1:1 o equilíbrio é 50% de acerto. A grade fixa de 6.69/6.70 e as políticas P2/P3 ficam como descritivo.

**Ordens reais na demo (nova Fase C antecipada):** o executor abre, na conta demo, a posição de cada sinal com TP = T e SL = S a partir do preço de execução e o lote do sinal. Duas medidas, então: (a) o julgamento virtual do pré-registro (velas M1 da XM, bid/ask) e (b) a execução real na XM. Elas são comparadas (como em 6.76). Nenhuma das duas é "o produto": o veredito continua sendo o de (a); (b) diz o que a XM de fato faz.

**Funcionamento ao vivo (arquitetura, a construir por etapas):**
1. **Exportador MT5** (`XM_Exporter.mq5` v1.1): envia ao projeto LAB, a cada minuto, as últimas 1.500 velas M1 de GOLD, OILCash e US100Cash e a especificação de cada símbolo (lote mínimo/passo/valor por ponto), em `xm_barras/<símbolo>` com o token (regra nova no `lab/firestore.rules`).
2. **Passo extra no scanner** (`Forex Scanner Real`, `continue-on-error`, a cada 5 min): `scripts/materias/rodar.js` lê as velas do LAB, decide a entrada com `candidatoEm` (a MESMA função do avaliador offline), dimensiona, grava o sinal em `historico_materias` (oficial) e fecha os abertos julgando com as velas (bid/ask), gravando também P1/P2/P3 virtuais.
3. **Fila do executor** (`xm-fila`): passa a incluir os sinais abertos de `historico_materias`, marcados como tipo M, com o lote do sinal; o executor abre a ordem (uma posição por símbolo, regras de sempre).
4. **App:** aba "Matérias-primas" no mesmo esquema dos cartões do forex, marcada TESTE; push de abertura e fechamento.
5. **Exportação semanal de M1 continua** como fonte do veredito (o offline roda sobre ela), e a paridade ao vivo x offline é conferida.

**Declarado antes:** probabilidade baixa de aprovar (14 famílias do projeto sem vantagem líquida de custo); marcar TESTE em tudo que o usuário vê; se um ativo for reprovado, o módulo para de gerar sinais nele (sem variantes).

**Estado da construção (25/11/2026, noite):** código e testes prontos e publicados; **nada compilado no MT5 ainda** (o usuário compila à noite).
- Pronto e testado: `lab/materias.js` (braço adaptativo, lote por risco, `candidatoEm` único), `scripts/materias/` (leitura das velas, motor, ciclo com banco e push, 4 arquivos), `scripts/xm/fila.js` (item `M`), `mt5/XM_Exporter.mq5` v1.10 (envia velas M1 + especificação dos símbolos), `mt5/XM_Executor.mq5` v1.30 (usa o lote do sinal no tipo M, ajustado ao passo, teto `LoteMaxMaterias` = 0,30), regras do LAB (`xm_barras`, **já publicadas**), aba "Mat." do app (`js/materias.js`), passo extra isolado no scanner (`continue-on-error`).
- Defeitos que os testes pegaram antes de publicar: (1) o teste estático do exportador contava chaves com a ordem errada de limpeza (o `'"'` da função `Esc` desalinhava as aspas); (2) a tela mostrava valor ausente (`null`) como "US$ 0,00".
- Falta (usuário, no MT5): compilar e recarregar o **exportador v1.10** (entrada `SimbolosBarras = GOLD,OILCash,US100Cash`) e o **executor v1.30** (sem perder `SoLog = false` nem o token; salvar o `.set`). Só depois disso chegam velas ao banco e o primeiro ciclo ao vivo inicia o estado; sinais aparecem a partir da primeira decisão (:00 ou :30) seguinte.
- Limites declarados: o lote mínimo, o passo e o valor por ponto de cada símbolo passam a vir do próprio MT5 (exportador), com padrão de contingência em `lab/materias.js#ESPEC`; o veredito continua sendo o do avaliador offline sobre as exportações semanais de M1 (a paridade ao vivo × offline está testada na decisão de entrada, não na execução).
