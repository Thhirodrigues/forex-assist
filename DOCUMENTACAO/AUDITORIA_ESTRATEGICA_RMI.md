# Auditoria Estratégica da RMI — Forex Assist

**Data:** 13/09/2026
**Escopo:** Pipeline completo de análise e decisão (scanner → pairAnalyzer →
marketAnalyzer → historyAnalyzer → scoreEngine → decisionEngine →
moneyManager → positionSizing → riskManager → checker), com foco na
**qualidade estratégica de trading** — não em bugs de integração (esses já
estão extensamente documentados em `ENGINEERING.md`).
**Não realizado:** nenhuma alteração de código. Este documento é só para
discussão.

---

## 0. Contexto que motiva este relatório

Nos últimos dias, o pipeline passou por uma auditoria de arquitetura (24
laudos, nota média 9,7/10, "nenhuma refatoração estrutural necessária") e,
depois, por uma sequência de correções de bugs reais e graves (BUG-001 a
BUG-026, PENTE-FINO-001 a 004) que essa mesma auditoria não pegou —
incluindo casos em que **nenhum sinal aprovado conseguia ser salvo** por
meses, ou em que **100% das operações SELL tinham o resultado financeiro
invertido**.

O padrão comum a todos esses bugs: eram falhas de **integração** (campo não
lido, variável não definida, objeto certo ignorado por outro errado). Nenhum
deles questionou se a **estratégia em si** — os limiares de EMA/RSI/ADX, os
pesos do score, o que cada perfil realmente filtra — faz sentido do ponto
de vista de mercado. Este relatório cobre essa lacuna.

---

## 1. Achado principal: nenhum filtro impede entrada em zona de exaustão

**O que o código faz hoje:** em `marketAnalyzer.js`, `analisarRSI()` dá 20
pontos de score quando RSI está em 55-70 ("COMPRA") ou 30-45 ("VENDA"), e
derruba pra 5 pontos quando RSI passa de 70 ("SOBRECOMPRADO") ou fica abaixo
de 30 ("SOBREVENDIDO"). Isso é a única participação do RSI em todo o
pipeline.

**O que falta:** busquei "RSI" em `decisionEngine.js`, `moneyManager.js` e
`positionSizing.js` — zero ocorrências nos três. A **direção** da operação
(BUY/SELL) vem exclusivamente do alinhamento das EMAs
(`analisarEMAs().tendencia`). Ou seja: um RSI de 72, 80 ou 90 nunca impede
uma compra — só desconta 15 pontos de score, facilmente compensados por
EMA (até 20 pts) + ADX (até 15 pts) + slope/alinhamento/simetria (até ~16
pts somados).

**Por que isso importa (visão de mercado, não só de código):** comprar com
RSI > 70 é comprar depois que o movimento já avançou — estatisticamente é
onde reversões de curto prazo são mais prováveis, especialmente em
timeframes curtos como 5 min. É exatamente o padrão que apareceu nos sinais
reais que você revisou: entradas com RSI 65-72 seguidas de reversão total
(zero pips a favor antes do LOSS).

**Isso afeta todos os perfis igualmente** — Agressivo, Balanceado e
Conservador usam a mesma função `analisarEMAs`/`analisarRSI`, com os mesmos
limiares internos. A única coisa que muda entre perfis é o **score mínimo**
para aprovar (35/45/55) e algumas exigências extras (multi-timeframe,
histórico mínimo) — nunca o **conteúdo** da análise técnica. Um RSI de 85
pode passar igualmente fácil no Conservador se o resto do score compensar.

**Recomendação a discutir:** um veto direto (não penalidade de score) —
bloquear COMPRA com RSI acima de um teto (ex. 72-75) e VENDA com RSI abaixo
de um piso (ex. 25-28), independente de qualquer outro fator. Simples,
barato, testável isoladamente, e ataca a causa raiz do padrão observado.

---

## 2. A diferenciação entre perfis é só de "quantos filtros passam", não de "o que é analisado"

Comparando os três perfis em `decisionEngine.js` (`PERFIL_ANALISE`) e
`moneyManager.js` (`PERFIL_FINANCEIRO`):

| | Agressivo | Balanceado | Conservador |
|---|---|---|---|
| Score mínimo | 35 | 45 | 55 |
| Exige multi-timeframe | Não | Sim | Sim |
| Histórico mínimo p/ aprovar | 0 | 0 | 30 operações |
| Expectativa negativa | só aviso | bloqueia | bloqueia |
| Risco por operação (banca) | 3% | 2% | 1% |
| R/R mínimo | 1.0 | 1.0 | 1.2 |

Isso é real e funciona (confirmado no código, sem bug pendente). Mas note o
que **não muda**: os pesos de EMA/RSI/ADX/slope/alinhamento/simetria dentro
de `marketAnalyzer.js` são **idênticos** para os três perfis. "Conservador"
não olha o mercado de forma mais rigorosa tecnicamente — só exige uma nota
mais alta na mesma prova, com as mesmas perguntas. Isso é uma limitação de
design, não um bug: pode ser intencional, mas vale confirmar se é o que
você quer dizer com "análise impecável independente em cada modo" — hoje
não é independente, é a mesma análise com barra de corte diferente.

**Pergunta para domingo:** vocês querem que os perfis também tenham
sensibilidade técnica diferente (ex.: Conservador exige ADX mais forte,
não só um score composto mais alto), ou a intenção sempre foi só variar o
rigor de aprovação, mantendo a análise técnica única? As duas abordagens
são legítimas — só precisam ser uma decisão consciente, não uma lacuna.

---

## 3. Nenhum peso do score foi validado contra resultado real (backtesting zero)

`calcularQualidade()` soma ~12 componentes heurísticos (EMA, RSI, ADX,
tendência, slope, alinhamento, simetria, distância, multi-timeframe, peso
histórico, bônus de direção, memória operacional, volatilidade) com pesos
escolhidos manualmente. Não há, em nenhum lugar do repositório, um teste
que confirme que score mais alto historicamente correlaciona com taxa de
acerto real. Isso já estava registrado no `ENGINEERING.md` (item 1 da
"Revisão da Qualidade Analítica") e continua não resolvido.

Isso não é um defeito de implementação — é uma lacuna de validação
estatística. Um sistema que decide dinheiro real com heurísticas nunca
testadas contra o próprio histórico é, na prática, uma hipótese não
verificada. Com histórico real acumulando desde a correção dos bugs de
integração, este é o momento certo para rodar essa validação (mesmo que
manual: pegar os sinais salvos, agrupar por faixa de score, comparar taxa
de acerto por faixa).

---

## 4. A expectativa matemática usa a taxa de acerto geral do par, não a confiança do sinal específico

Em `moneyManager.js`, `analisarFinanceiro()` recebe `probabilidade:
estatisticas.resumo.taxaAcerto` — a taxa de acerto **histórica do par**,
igual para qualquer sinal daquele par no momento, **independente do score
técnico daquele sinal específico**. Um sinal com score 36 (mal passou do
mínimo do Agressivo) e um sinal com score 95 (quase perfeito) do mesmo par
recebem exatamente a mesma "probabilidade" para calcular expectativa
matemática — o gate de expectativa mínima (que bloqueia de verdade no
Conservador/Balanceado) não distingue qualidade do sinal atual, só
histórico do par.

Isso significa que o gate de expectativa (PENTE-FINO-004) protege contra
"par historicamente ruim", mas não contra "sinal técnico fraco de hoje" —
são duas coisas diferentes, e só a primeira está coberta.

---

## 5. Três motores de risco/expectativa distintos, só um realmente decide

Confirmado no código (busca por consumidores):

- **`decisionEngine.js` + `moneyManager.js`** — o motor real, que de fato
  aprova/reprova e ajusta lote/TP/SL.
- **`riskEngine.js`** — já documentado como morto/com bug (ATR sempre 0),
  não integrado, sem uso ativo. Destino em aberto desde 09/09.
- **`positionSizing.js`** — **achado novo desta auditoria**: é chamado
  dentro de `analisarFinanceiro()` (`configurarOperacao`/
  `classificarOperacao`), e seu resultado (`positionSizing`,
  `classificacaoFinanceira`) **é salvo no documento da operação**, mas
  busquei em todo `js/` e em `decisionEngine.js` — **nunca é lido por
  ninguém**. Tem seu próprio `SCORE_MINIMO = 60` e `RISCO_MAXIMO = 2%`,
  diferentes dos limiares reais de `PERFIL_ANALISE`/`PERFIL_FINANCEIRO`, e
  sua própria função `calcularExpectativa` duplicada (3ª cópia dessa
  fórmula no repositório).

**Por que isso importa além de "código morto":** cada operação salva em
`historico` carrega esses três objetos aninhados (`financeiro.positionSizing`,
`financeiro.classificacaoFinanceira`, mais o já existente
`financeiro.decisaoMercado`). Isso é peso morto real em cada documento —
relevante porque o **primeiro problema que investigamos nesta conversa foi
justamente um documento excedendo o limite de 1 MiB do Firestore**. Campos
nunca lidos, computados e persistidos à toa, contribuem diretamente para
esse teto.

**Recomendação a discutir:** decidir agora o destino de `riskEngine.js` E
`positionSizing.js` — integrar de verdade (um dos dois, não os três) ou
remover. Manter três fontes de verdade sobre a mesma pergunta ("essa
operação vale o risco?") é o tipo de duplicação que já gerou o BUG-021.

---

## 6. Cron de 15 minutos vs. candles de 5 minutos

O scanner roda a cada 15 min (`forex-scanner-real.yml`, ajustado por causa
da cota do Firestore); a análise usa candles de 5 min. Isso significa que,
na janela entre execuções, **até 2 de cada 3 candles formados nunca são
vistos** pelo scanner no momento em que se formam — só o candle mais
recente na hora da execução é analisado. Um movimento de reversão que
começa e termina dentro dessa janela de 15 min é estruturalmente invisível
para a abertura de novos sinais (o `checker.js`, que fecha operações
abertas, já reconstrói o caminho completo — mas isso só ajuda a *fechar*
corretamente, não a *abrir* no momento certo).

Isso não é um bug — foi uma troca consciente para não estourar a cota
gratuita do Firestore (documentada no `ENGINEERING.md`, BUG-023/CACHE-001).
Mas é uma limitação estratégica real que convém ter explícita: o sistema
opera com uma latência de decisão de até 15 min em relação ao próprio
timeframe que analisa. O `ESTADO_ATUAL.md` já lista isso como pendência
("rodar 24h sem delay") — este relatório confirma que é prioridade
estratégica, não só de infraestrutura.

---

## 7. Orçamento de API da janela asiática ainda não resolvido

`BUG-015` (registrado, não corrigido): a janela asiática automática por
moeda (JPY/AUD/NZD) soma ao consumo diário da TwelveData e pode ultrapassar
o orçamento de ~2.400 consultas/dia mesmo com o medidor de aviso
implementado (`FEATURE-005`). O medidor avisa, mas não impede — se ninguém
olhar a tela de Config no dia em que isso acontece, pares podem
silenciosamente parar de ser analisados por falha de API (rate limit),
indistinguível de "sem sinal" nos logs.

---

## 8. Nenhum filtro de correlação entre pares abertos simultaneamente

Já registrado no `ENGINEERING.md`, ainda não implementado: EUR/USD e
GBP/USD (ambos fortemente correlacionados via força do dólar) são tratados
como apostas independentes. Com o cooldown agora bloqueando duplicidade
*no mesmo par* (PENTE-FINO-003), o risco real que sobra é abrir posições
correlacionadas em pares diferentes ao mesmo tempo — a exposição real da
banca pode ser maior do que a soma dos riscos individuais sugere.

---

## Resumo — o que discutir domingo, em ordem de impacto

1. **Veto de RSI extremo** (Seção 1) — o achado mais concreto e acionável,
   ataca diretamente o padrão observado nos sinais reais.
2. **Decidir a filosofia de diferenciação entre perfis** (Seção 2) — antes
   de qualquer ajuste técnico, decidir se "Conservador" deve analisar
   diferente ou só exigir nota mais alta na mesma análise.
3. **Destino de `riskEngine.js` e `positionSizing.js`** (Seção 5) — reduz
   dívida técnica E tamanho de documento, baixo risco de implementação.
4. **Expectativa por sinal, não só por par** (Seção 4) — mais estrutural,
   exige pensar como turbinar o gate de expectativa com o score do sinal.
5. **Backtesting real dos pesos do score** (Seção 3) — o mais trabalhoso,
   mas o que dá fundamento a tudo o resto.
6. Itens já conhecidos e monitorados: cron/latência (Seção 6), orçamento de
   API (Seção 7), correlação entre pares (Seção 8) — sem mudança de
   prioridade sugerida aqui, só reafirmados como pendências reais.

Nada neste relatório foi implementado. Ordem de execução e escopo de cada
item ficam para a conversa de domingo.
