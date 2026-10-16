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

## 7. Pendente do usuário

- Material do amigo e ebooks: RECEBIDOS e lidos em 03/10 (seção 6). Falta o usuário escolher
  quais experimentos (E1-E5) quer e em que ordem.
