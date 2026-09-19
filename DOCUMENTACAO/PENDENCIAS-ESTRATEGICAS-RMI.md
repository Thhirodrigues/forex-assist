# Pendências Estratégicas da RMI — status cruzado contra o código

**Origem:** handoff entregue pelo usuário em 19/09/2026, escrito por outra
sessão/conversa ("Claudinho") que trabalhou em paralelo entre 13-16/09/2026
como auditor/analista crítico, complementando dois relatórios formais já
entregues ao usuário: `AUDITORIA_ESTRATEGICA_RMI.md` (13/09, achados de
engenharia com peso estratégico) e `RECOMENDACOES_ANALISTA_FOREX.md` (13/09,
pontos cegos de gestão de risco). Os três documentos foram arquivados aqui
verbatim, sem edição de conteúdo original, para não se perder entre sessões.

**Por que este arquivo existe além dos outros dois:** os relatórios originais
são de 13/09 e o handoff é de 13-16/09 — bastante coisa mudou no código desde
então (MUD-01 a MUD-05, AJUSTE-001 a 003, CACHE-002, BUG-027, FEATURE-024,
entre outros, documentados em `ENGINEERING.md`). Por princípio deste projeto
(`CLAUDE.md`, hierarquia da verdade: documentação não é prova de estado
atual), cada item abaixo foi **conferido contra o código real em 19/09/2026**
antes de ser listado como resolvido ou pendente — não é uma cópia do handoff.

---

## 1. O que o handoff do Claudinho relata (resumo, não é o documento original)

Linha do tempo: um erro de gravação no Firestore (documento excedendo 1 MiB)
levantou suspeita sobre o histórico → comparação de sinais reais vs. gráfico
da XM mostrou padrão suspeito (LOSS com "Favor = 0,0", RSI em zona de
exaustão) → revisão completa do pipeline cruzada com `ENGINEERING.md` → dois
relatórios formais entregues → uma sessão de código avaliou os relatórios e
achou um bug novo e grave (conversão de pip em pares cruzados) → execução
começou (gate de perda diária). Registra também uma lição de processo
repetida duas vezes em dois dias: tratar configuração/declaração (YAML,
comentário de código) como prova de comportamento real, sem checar o log de
execução, levou a conclusão errada tanto do lado do usuário quanto de uma
sessão de código anterior — e a regra fica explícita para daqui pra frente
("nunca confiar em config declarada sem checar comportamento real").

## 2. Status de cada pendência do handoff, conferido em 19/09/2026

| Item do handoff | Status conferido | Evidência |
|---|---|---|
| `saldoSimulado` desatualizado (-$710,20 vs. real -$22,47) | **RESOLVIDO**, já em 16/09 | `ENGINEERING.md`, seção "CORREÇÃO DE DADO — saldoSimulado desatualizado após limpeza do BUG-027": recalculado do zero e gravado, valor conferido antes/depois. O saldo mudou desde então por operação real de trading (visto em log de produção de 18/09: R$ -116,56) — evolução esperada, não bug. |
| Cadência real do scanner é 5min via pinger externo (`workflow_dispatch`), não 15min do cron do YAML | **CONFIRMADO de forma independente** | Runs reais do `forex-scanner-real.yml` inspecionados em 17/09 e 19/09: TODOS os eventos são `workflow_dispatch`, nunca `schedule`, em intervalos de ~5min. Bate exatamente com o que o handoff descreve. |
| Orçamento de API: "10 pares atuais excedem o orçamento em ~288 consultas/dia" | **DESATUALIZADO já no momento do handoff** | `CACHE-002` (16/09, `ENGINEERING.md`) resolveu estruturalmente: cache do leg de 15min reduz consumo de ~2.688/dia pra ~1.792/dia com 10 pares (margem de +608/dia), validado contra Firestore real. Configuração de produção hoje (19/09) usa só **5 pares**, então a margem é ainda maior. |
| BUG-015 (janela asiática estoura orçamento) "ainda sem correção" | **RESOLVIDO estruturalmente pelo CACHE-002** (mesma correção acima) | `ENGINEERING.md`, entrada CACHE-002 fecha explicitamente o BUG-015. |
| Confirmar se há rate-limit real da TwelveData na amostra do backtest | **NÃO CONFIRMADO NEM REFUTADO** — não investigado nesta passada | Pendente de verdade, não descartar. |
| Destino de `riskEngine.js` e `positionSizing.js` (integrar ou remover) | **AINDA ABERTO, `positionSizing.js` confirmado morto igual `riskEngine.js`** | Checado agora: `positionSizing`/`classificacaoFinanceira` só aparecem em `scripts/moneyManager.js` — calculados, anexados ao retorno, nunca lidos por `decisionEngine.js`, `pairAnalyzer.js` nem pelo frontend. Mesma classe de problema que `riskEngine.js` (já documentado desde BUG-021, 09/09). Nenhum dos dois foi decidido ainda. |
| Teto de exposição agregada entre pares correlacionados | **AINDA ABERTO** | `grep` por "correlac"/"exposicao" em `scripts/` não encontra nenhum gate — só um rótulo de risco não relacionado (`REDUZIR_EXPOSICAO` em `moneyManager.js`, que não é um teto agregado). |
| Backtest RSI+ADX conjunto | **NÃO EXECUTADO** — dataset e metodologia desenhados no handoff, não rodado nesta sessão. |

## 3. Status dos itens dos dois relatórios formais (13/09), conferido em 19/09/2026

| Achado | Status conferido |
|---|---|
| RSI nunca veta direção — só desconta score | **AINDA VERDADE.** `grep -i rsi scripts/decisionEngine.js` → zero ocorrências. Direção continua vindo só do alinhamento de EMAs. |
| Perfis diferem só em score mínimo/portões, não em análise técnica | Não reconferido byte a byte nesta passada, mas nada no histórico de commits desde 13/09 sugere que isso mudou (MUD-01/02/05 tocaram `pairAnalyzer`/`scoreEngine`, mas não a diferenciação entre perfis). Tratar como ainda verdade até confirmação. |
| Nenhum peso do score validado por backtest | **AINDA VERDADE**, nenhum backtest foi rodado. |
| Expectativa usa taxa de acerto do par, não do sinal específico | Não reconferido nesta passada — sem mudança conhecida que altere isso. |
| Cron 15min vs. candles 5min ("até 2 de cada 3 candles nunca vistos") | **DESATUALIZADO.** Este era o entendimento do relatório de 13/09; o próprio handoff do Claudinho corrigiu isso depois (cadência real é 5min, não 15min) — e a correção foi confirmada de forma independente contra logs reais (ver tabela acima). O relatório original de 13/09 fica canonicamente **superado** neste ponto específico. |
| Limite de perda diária / disjuntor de losses consecutivos são campos mortos | **RESOLVIDO.** `FEATURE-024` (commit `0caca19`) implementou os dois gates. Também confirmado pelo próprio handoff como "feito". |
| Spread nunca modelado | **AINDA VERDADE.** `grep -i spread scripts/` → zero ocorrências. |
| Stop fixo em dólar, não amarrado a ATR | Não reconferido nesta passada — sem mudança conhecida. |
| Sem breakeven/trailing/parcial pós-entrada | Não reconferido nesta passada — sem mudança conhecida. |
| Sem blackout de notícias econômicas | **AINDA VERDADE**, confirmado também como item de backlog avaliado (não implementar por ora) no documento separado `BACKLOG-E-VISAO.md`, seção 3.4. |
| Tensão scalping (5min) vs. filtro de tendência longa (EMA200) | Decisão de produto ainda não tomada, sem mudança conhecida. |

## 4. Achado novo desta passada (19/09/2026), não estava em nenhum dos documentos

A configuração de produção mudou desde a última vez que alguém (Claudinho ou
esta sessão) documentou o estado: log real de 18/09 mostra **perfil
`balanceado`** (não mais `agressivo`), **5 pares monitorados** (não 8, não
10) e **janela operacional 07:30-23:59** (não mais 07:30-18:00 + janela
asiática à parte). Isso é uma mudança de configuração feita pelo usuário
direto no app (Config), não uma mudança de código — mas afeta diretamente a
leitura de qualquer pendência acima que dependa do número de pares ou do
perfil ativo (ex.: orçamento de API, teto de exposição). Vale confirmar com
o usuário se essa mudança foi intencional e permanente antes de assumir
qualquer prioridade baseada no cenário antigo (8-10 pares, Agressivo).

## 5. Ordem de prioridade combinada (dos dois documentos, reafirmada aqui)

Nenhum item abaixo foi implementado nesta sessão. Fica registrado como
próximo passo em aberto, para decisão explícita antes de qualquer
implementação — mesma disciplina já aplicada ao `BACKLOG-E-VISAO.md`.

1. **Veto de RSI extremo** (bloquear, não só penalizar, RSI>72-75 em BUY e
   RSI<25-28 em SELL) — o achado mais concreto e acionável dos relatórios,
   ainda não implementado.
2. **Modelar spread** na expectativa/aprovação, mesmo que como constante
   por par.
3. **Decidir o destino de `riskEngine.js` e `positionSizing.js`** — ambos
   confirmados mortos agora, reduz dívida técnica e tamanho de documento
   salvo (relevante pro teto de 1 MiB do Firestore que motivou a
   investigação original).
4. **Teto de exposição agregada entre pares correlacionados** — evidência
   real já existe (episódio de aposta concentrada em dólar, citado no
   handoff).
5. **Stop amarrado a ATR** em vez de valor fixo em dólar.
6. **Breakeven simples** pós-entrada.
7. **Backtest RSI+ADX conjunto** — dataset e metodologia já desenhados no
   handoff (ver seção 1), execução pendente.
8. **Blackout simples de eventos de notícia de alto impacto.**
9. Decisão de identidade do produto (scalping de 5min vs. seguimento de
   tendência com EMA200) — não urgente de corrigir, mas urgente de
   **decidir**, porque orienta todos os itens acima.

Itens sem prioridade fixada, soltos: confirmar rate-limit da TwelveData na
janela do backtest antes de rodar; diferenciação técnica real entre perfis
(pesos, não só limiares) — mesmo item já registrado em `BACKLOG-E-VISAO.md`
seção 3.1, com a mesma recomendação de esperar histórico comparável entre
perfis antes de mexer.
