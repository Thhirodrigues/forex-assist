# Backlog, Visão e Ideias Resgatadas — Forex Assist / RMI

**Arquivado em:** 17/09/2026, a partir de um documento entregue nesta sessão
("ANEXO-BACKLOG-E-VISAO-FARMI.md", varredura do histórico do projeto no
ChatGPT maio–setembro/2026, cruzada com o código real lido em 17/09).

**Status:** material de referência — critérios e ideias para o **Manual**
(a aba ainda não escrita) e para melhorias futuras. **Não é escopo da
rodada de correções em andamento** (MARCO ZERO / MUD-01 a MUD-05 e
AJUSTE-002 — ver `ENGINEERING.md`). Foi arquivado aqui especificamente
para não se perder na conversa, por pedido explícito do usuário
(17/09/2026): a implementação de qualquer item daqui espera a conclusão
das correções em andamento.

---

## 1. Fundação — o que foi registrado como permanente

Formalizado no Documento Mestre/Worklog originais como princípio, não
preferência passageira. Segue coerente com o que o código faz hoje — serve
de régua para aceitar ou recusar qualquer ideia futura.

**Missão (registro oficial, junho/2026):**
> "Construir uma plataforma profissional de apoio à decisão em Forex que
> utilize dados reais, preserve o capital do operador e evolua
> continuamente por meio do próprio histórico."

**Posicionamento:** inteligência de apoio ao operador — explicitamente
**não** um robô autônomo. O nome "Real Money Intelligence" foi escolhido
para fixar isso.

**Filosofia (V5 Expert Alpha):** qualidade acima de quantidade; dados
acima de opinião; consistência acima de lucro rápido; preservação do
capital como prioridade.

**Regra de Ouro (filtro para qualquer proposta):**
> "Isso ajuda quem opera dinheiro real?" — se a resposta for não, deixa de
> ser prioridade.

**Decisão de produto fundadora:** não competir com scanners que geram
dezenas de sinais por dia. Encontrar poucas oportunidades com maior
probabilidade. Essa decisão molda filtros, critérios de qualidade, gestão
de risco e evolução do Expert.

**Objetivos estratégicos permanentes:** preservar capital; aumentar
consistência; reduzir operações ruins; aprender com o histórico;
automatizar tarefas repetitivas; fornecer inteligência ao operador; manter
arquitetura limpa; documentar continuamente.

**Comentário crítico (do documento original):** um sistema que gera poucos
sinais de qualidade é um objetivo defensável e alcançável; um sistema que
garante renda frequente não é algo que arquitetura nenhuma pode prometer.
O que o FARMI pode entregar é decisão mais criteriosa, risco controlado e
histórico mensurável. Manter o texto da missão como está protege o projeto
de virar promessa de rendimento.

---

## 2. O Manual — o que era pra ser (resgatado na íntegra)

### 2.1 Camada 1 — a especificação original (30/05/2026)

O Manual nasceu junto com a estrutura de abas do app, como uma das cinco
telas do SPA (Dashboard, Scanner, Histórico, **Manual**, Configurações).
Definição original:

> **Manual** — Glossário Forex: RSI, ADX, EMA, SMA, ATR, RR, Pip, Spread,
> Pullback, Breakout — "e depois adicionaremos imagens reais dos candles."

**Estrutura técnica (como foi efetivamente implementado e continua sendo o
padrão):** `js/manual.js` expõe uma função `manualView()` que devolve HTML
estático; o `app.js` troca de aba sem recarregar a página e injeta esse
HTML em `#content`. O padrão visual é um `<div class="card">` com título
e, dentro, um `<h3>` por conceito seguido de `<p>` com a explicação.

Ou seja: o "como" já existe e está funcionando — é conteúdo estático
dentro de uma view. Não requer backend, não requer Firestore, não requer
arquivo novo. O que falta é o conteúdo.

### 2.2 Camada 2 — a expansão para Base de Conhecimento (DT-025, junho/2026, prioridade P1)

Na auditoria de arquivos (LAUDO Nº 015), o Manual foi promovido de
glossário para Base de Conhecimento Forex, registrada como dívida técnica
P1. Escopo previsto: estrutura de mercado · pares (nomenclatura e
características) · candlesticks · price action · suporte e resistência ·
tendências · pullbacks · indicadores (EMA, RSI, ADX, ATR, MACD, Bollinger)
· gerenciamento de risco · gerenciamento financeiro · psicologia do trader
· calendário econômico · impacto de notícias · volatilidade · sessões de
mercado · **as estratégias do próprio Forex Assist** · interpretação de
sinais · glossário.

### 2.3 Leitura crítica e recomendação (do documento original)

Dois itens dessa lista valem mais que todos os outros juntos, e são os
únicos que ninguém além deste projeto pode escrever:

1. **As estratégias do próprio Forex Assist** — o que o score significa, o
   que cada perfil faz, por que um sinal foi aprovado ou recusado.
2. **Interpretação de sinais** — como ler um card do histórico:
   `expectativa`, `maxPipsFavor`/`maxPipsContra`, `motivoEncerramento`, o
   aviso de expectativa negativa no Agressivo.

Todo o resto (o que é RSI, o que é pullback) existe bem explicado em
qualquer lugar da internet. Se o Manual for feito por partes, começar
pelos dois itens acima entrega valor imediato e ainda serve de
documentação viva do próprio app. O glossário genérico pode vir depois,
sem pressa.

Um efeito colateral bom: escrever "o que o score significa" força a
explicitar regras que hoje só existem em código — e isso costuma revelar
incoerência. É barato e vale a pena.

---

## 3. Ideias que se perderam (e avaliação de cada uma, do documento original)

Nenhuma entra na rodada atual.

### 3.1 Perfis definidos por PESOS, não só por limiares — a mais valiosa

Na auditoria da Fase 06 (item RMI-018) ficou registrado que a arquitetura
permitiria perfis distintos trocando a configuração de pesos usada pelo
ScoreEngine, não apenas mudando limiares de aprovação.

Hoje não é assim: os três perfis diferem só em portões (`scoreMinimo`,
`operacoesMinimas`, `exigirMultiTimeframe`, `expectativaMinima`, risco). O
score em si é calculado igual para todos — o Conservador enxerga o
mercado exatamente como o Agressivo, só recusa mais.

**Por que importa:** é a diferença entre "ser mais exigente" e "ser mais
criterioso". Um perfil conservador de verdade poderia, por exemplo, pesar
mais o histórico e o multi-timeframe e pesar menos um RSI esticado. Isso é
mudança conceitual real, não cosmética.

**Recomendação:** ideia boa, momento errado. Só faz sentido depois que os
três perfis estiverem produzindo sinal e houver histórico comparável entre
eles. Fazer isso agora seria mudar a régua e o objeto medido ao mesmo
tempo.

### 3.2 Perfil "Institucional" (4º perfil)

**Recomendação: descartar por enquanto.** Não se acrescenta um quarto
perfil quando dois dos três atuais não geram operação nenhuma.

### 3.3 Inteligência por tempo: sessão, horário e dia da semana

Previsto na auditoria do `historyAnalyzer.js`: desempenho por sessão
(Ásia/Londres/Nova York), horário de maior eficiência, comportamento por
dia da semana, por volatilidade e por regime de mercado.

**Recomendação: é o melhor candidato depois desta rodada.** O dado já
existe (`timestamp` em todo sinal, e o app já trata fuso e sessões em
`scanner.js`), não depende de API nova, não gasta cota, e responde a uma
pergunta que o operador realmente tem — "existe horário em que meus sinais
funcionam melhor?". Custo baixo, valor alto, risco baixo.

### 3.4 Calendário econômico e impacto de notícias

**Avaliação:** notícia de alto impacto é provavelmente o maior fator de
risco isolado que o sistema hoje ignora por completo. Um sinal
tecnicamente perfeito minutos antes de um payroll é uma aposta, não uma
operação.

**Mas o custo é real:** exige fonte externa nova (mais API, mais cota,
mais ponto de falha) num sistema que já estourou cota do Firestore e da
TwelveData em produção. **Recomendação:** se for fazer, a versão mínima é
a mais inteligente — janela de bloqueio em torno de eventos de alto
impacto conhecidos, sem tentar interpretar a notícia. "Não operar" é mais
fácil e mais seguro que "prever a reação".

### 3.5 Correlação entre pares

**Avaliação:** relevante de verdade para gestão de risco — abrir EUR/USD e
GBP/USD ao mesmo tempo não é diversificação, é dobrar a mesma aposta. Vale
como item de risco, mais do que como item de score.

### 3.6 Subdividir o `historyAnalyzer` (performanceAnalyzer, sessionAnalyzer, timeAnalyzer, patternAnalyzer)

**Recomendação: não fazer agora.** Contraria a decisão vigente de não
criar arquivos sem necessidade comprovada, e a necessidade ainda não
apareceu. Reavaliar quando o módulo realmente crescer.

### 3.7 Cache de consultas históricas (RMI-021)

**Status: já resolvido** — implementado em 10/09 (CACHE-001) e ampliado em
16/09 (CACHE-002, cache de candles de 15min). Fica registrado como
fechado.

### 3.8 Imagens reais de candles no Manual

**Recomendação:** baixa prioridade, mas barato. Se o Manual for escrito,
um punhado de imagens ilustrando padrões de candle melhora muito a
utilidade da parte educacional.

---

## 4. Matriz de riscos arquiteturais (RMI) — status verificado em 17/09/2026

| ID | Risco registrado | Status verificado (17/09) |
|---|---|---|
| RMI-006 | Decisão financeira fora do DecisionEngine | **Resolvido.** Risco virou aviso (FEATURE-010) e a decisão financeira de bloqueio ficou concentrada: expectativa no `decisionEngine.js`, saldo real em `js/historico.js` |
| RMI-007 | Filtros institucionais executados no pairAnalyzer | **Parcial.** `pairAnalyzer.js` ainda faz filtros após a decisão; a aprovação em si já é do `decisionEngine.js` |
| RMI-012 | Decisão distribuída entre múltiplos módulos | **Majoritariamente resolvido.** `avaliarOperacao()` é hoje o portão único de aprovação |
| RMI-005 | Conversão de tendência em BUY/SELL no pairAnalyzer | **Ainda presente.** `direcao = qualidade.tendencia` em `pairAnalyzer.js` |
| RMI-008 | Dependência invertida marketAnalyzer ↔ decisionEngine | **Resolvido na prática.** `pairAnalyzer` chama `decisionEngine`; `marketAnalyzer` não decide |
| RMI-011 | Crescimento excessivo de `calcularQualidade()` | **Ainda presente.** 13 parâmetros posicionais (12 + `smc` da MUD-05). Qualquer coisa nova que entre ali piora isso |
| RMI-016 / RMI-017 | Duplicidade de score e pesos distribuídos entre marketAnalyzer e scoreEngine | **Ainda presente.** A composição do `scoreFinal` mora no `marketAnalyzer`, os pesos no `scoreEngine` |
| RMI-019 | Crescimento futuro do historyAnalyzer | Aberto, sem urgência (ver 3.6) |
| RMI-021 | Ausência de cache histórico | **Resolvido** (CACHE-001/002) |

**Regras arquiteturais que continuam valendo** (RA-016 a RA-025,
resumidas): o ScoreEngine não produz indicadores, não consulta mercado e
não aprova operações — todo peso institucional pertence a ele. O
HistoryAnalyzer nunca aprova nem produz indicadores técnicos: devolve
evidência.

> "O histórico informa. O DecisionEngine decide."

**Ligação com a rodada MARCO ZERO (MUD-05):** o peso do SMC entra dentro
do `ENGINE_WEIGHTS` do `scoreEngine.js` — respeita a RA-019. Mas a
aplicação desse peso acontece no `marketAnalyzer.js`, onde o `scoreFinal`
é composto hoje. Não piora nada em relação ao que já existia, mas também
não melhora o RMI-016/017 — dívida conhecida que continua aberta, agora
com um item a mais dentro dela. Registrado conscientemente.

---

## 5. Roadmap de maturidade (o que ficou definido e ainda faz sentido)

Sequência registrada na Fase 06 para chegar a dinheiro real com segurança:

1. **Fase 07** — refatoração controlada e testes de regressão.
2. **Fase 08** — operação em modo observador (*paper trading*): registrar
   todas as decisões e comparar com o mercado, sem exposição financeira.
3. **Fase 09** — operações com capital reduzido e risco previamente
   definido.
4. Só então ampliar gradualmente o tamanho das posições, conforme os
   resultados.

Três lacunas prioritárias da Gap Analysis:
- **GAP-01** — centralizar definitivamente as decisões no DecisionEngine
  *(hoje majoritariamente feito)*.
- **GAP-02** — testes de regressão após cada Sprint *(não há suíte de
  testes automatizada e commitada no repositório até hoje — continua
  aberto; ver observação na seção 7 abaixo)*.
- **GAP-03** — validar o comportamento em ambiente real antes de qualquer
  operação financeira. Prioridade máxima.

**Ponto mais importante deste documento:** o projeto está hoje, na
prática, na Fase 08 (modo observador com conta simulada) enquanto ainda
tem correções de Fase 07 pendentes (a rodada MARCO ZERO desta sessão é
parte disso), e a marcação manual de Conta Real já existe no app. A
sequência acima é boa justamente porque protege contra o impulso de
antecipar. Vale reler o GAP-03 antes de aumentar qualquer exposição: o
histórico que existe hoje foi gerado com um SL que fechava até 235% além
do combinado — as estatísticas acumuladas até agora descrevem um sistema
que não é o que vai existir depois desta rodada de correções. Depois das
correções, o histórico anterior serve como referência, não como prova de
desempenho.

---

## 6. O que este documento não resolve

- Não há especificação de UI detalhada do Manual além da Seção 2 — pelo
  que foi recuperado, ela nunca existiu: houve a definição original do
  glossário e, depois, a lista de tópicos do DT-025.
- O `WORKLOG_DEFINITIVO` completo (o de 300–600 páginas planejado) não
  existe em lugar nenhum recuperável. O que existe é o resumo em 5 partes,
  de onde saiu a Seção 1.
- Ideias trocadas fora do ChatGPT (WhatsApp, anotações, memória) não estão
  aqui. Se surgir alguma lembrança, vale acrescentar neste arquivo.

---

## 7. Leitura crítica adicional (17/09/2026, ao arquivar)

Pontos que valem registrar junto com o material acima, para quando a
implementação começar:

- **O Manual como dívida em movimento.** Os dois itens mais valiosos da
  seção 2.3 ("o que o score significa", "interpretação de sinais")
  documentam comportamento que ainda está mudando ativamente — esta
  própria sessão alterou `scoreEngine.js`, `marketAnalyzer.js` e o
  critério de fechamento em `checker.js` (MUD-03, MUD-05, AJUSTE-002).
  Escrever o Manual antes de as correções de Fase 07 estabilizarem
  arrisca documentar um comportamento que já não é mais verdade em uma
  semana. Recomendação prática: esperar a rodada MARCO ZERO fechar (ou
  pelo menos os itens que tocam `scoreEngine`/`checker`) antes de escrever
  a seção de estratégias — ou, se começar antes, tratar o Manual como doc
  vivo com a mesma disciplina de `ENGINEERING.md` (verificar contra o
  código antes de confiar), não como texto definitivo.

- **GAP-02 é mais concreto do que o documento original sugere.** "Não há
  suíte de testes automatizada" é verdade num sentido específico: cada
  sessão de correção (incluindo esta) escreveu dezenas de scripts
  `validate-*.js` bem desenhados — com o padrão de extração dinâmica do
  arquivo real, não cópias hardcoded — mas todos vivem em diretório de
  scratchpad temporário, fora do repositório, e são descartados quando a
  sessão termina. O trabalho de validação existe, só não persiste. Uma
  melhoria de custo baixo e valor alto (mais barata que qualquer item da
  seção 3): mover os scripts de validação para uma pasta `tests/` do
  próprio repositório, versionada, para não reescrever a mesma cobertura
  do zero a cada rodada de correção.

- **Risco de escopo ao ler "e pode pensar em melhoria".** Nada neste
  documento foi implementado agora — fica registrado como leitura, não
  como trabalho iniciado. Antes de tocar em qualquer item da seção 3, vale
  confirmar prioridade explicitamente, inclusive entre os próprios itens
  recomendados aqui (3.3 é o candidato mais barato, mas "mais barato" não
  é o mesmo que "mais importante" para quem vai operar a conta real depois).
