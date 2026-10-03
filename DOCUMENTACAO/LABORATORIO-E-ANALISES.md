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

## 7. Pendente do usuário

- Material do amigo e ebooks: RECEBIDOS e lidos em 03/10 (seção 6). Falta o usuário escolher
  quais experimentos (E1-E5) quer e em que ordem.
