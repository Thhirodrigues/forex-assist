# Forex Assist / RMI — Estado Atual

> **Como usar este documento**: é a referência de "onde o projeto está agora
> e o que fazer a seguir" — se o trabalho parar aqui, quem assumir (pessoa
> ou IA) deve conseguir se orientar só com isto, sem precisar reconstruir o
> contexto lendo tudo de novo. Atualizado por cima (o topo de cada seção é
> o estado mais recente), não por baixo como o `ENGINEERING.md` (esse
> continua sendo o log cronológico de decisões técnicas — auditável,
> mas não é pra navegação rápida).
>
> Última atualização: **seção 0 em 28/09/2026**; seções 1-4 abaixo
> continuam em 09/09/2026 — **aviso
> honesto**: entre 10 e 11/09/2026 houve uma sessão extensa com muita
> coisa nova (scanner ativado em produção, várias correções de
> pipeline - PENTE-FINO-001 a 004, push notifications, gráfico de
> movimento do preço, comparação de sinais, modo tabela/compacto do
> Histórico, atualização automática) que **ainda não foi incorporada
> às seções 1-4** - todas essas mudanças estão documentadas em ordem
> cronológica no final do `ENGINEERING.md` (procure por FEATURE-010 em
> diante), mas ninguém ainda consolidou isso de volta pra este resumo.
> Se você está retomando o projeto agora, leia o final do
> `ENGINEERING.md` antes de confiar nas seções 3/4 abaixo como estado
> atual - elas ainda descrevem 09/09, não 11/09. A seção 5 (próximo
> passo) foi atualizada com o que ficou pendente da sessão de 11/09.
>
> **Aviso honesto nº 2 (19/09/2026)**: a defasagem acima não foi
> corrigida - piorou. Entre 11/09 e 19/09 houve BUG-027 (pip de pares
> cruzados), FEATURE-024 (gate de perda diária/disjuntor de losses,
> resolvendo o achado mais crítico do `RECOMENDACOES_ANALISTA_FOREX.md`),
> CACHE-001/002 (resolvendo estruturalmente o BUG-015 de orçamento de
> API), toda a rodada MARCO ZERO (MUD-01 a MUD-05) e AJUSTE-001 a 003 -
> nenhuma dessas mudanças está refletida nas seções 1-4 abaixo, que
> continuam descrevendo 09/09. Também mudou a configuração de produção
> em si (perfil, pares monitorados, janela) - ver achado 4 de
> `PENDENCIAS-ESTRATEGICAS-RMI.md`. Este documento precisa de uma
> consolidação de verdade, não só mais um aviso em cima do anterior -
> registrado aqui como dívida, não resolvido nesta sessão. Pra estado
> real, ler o final do `ENGINEERING.md` e `PENDENCIAS-ESTRATEGICAS-RMI.md`.

---

## 0. REGRA VIGENTE — CONGELAMENTO DO PIPELINE DE SINAIS (decidido em 28/09/2026)

**Leia isto antes de propor qualquer mudança em score, aprovação, TP/SL
ou lote.** Decisão do usuário, tomada depois de um dia inteiro corrigindo
*instrumentos de medida quebrados* (ver "O que aconteceu em 28/09"
abaixo): a cada correção a base de comparação recomeça do zero, e sem
parar de mexer nunca se saberá qual mudança ajudou ou atrapalhou.

### O que fica congelado

Nenhuma mudança na **lógica** de:

- `scripts/marketAnalyzer.js`, `scoreEngine.js`, `historyAnalyzer.js`
  (pesos, limiares, bônus/penalidades, escala de pip);
- `scripts/decisionEngine.js` (gates, perfis, cascata, veto de RSI);
- `scripts/moneyManager.js` (cálculo de lote/TP/SL/expectativa/risco) e
  a cascata em `scripts/pairAnalyzer.js`;
- filtros de aprendizado em `scripts/statisticsEngine.js`.

**Até**: fecharem **100 operações** (WIN/LOSS) com
`financeiro.regimeTPSL === "CONFIG"` — só essas contam; operações sem
esse campo são do regime anterior (TP/SL $3 forçado em par não-JPY, lote
reduzido) e **não são comparáveis** (alvo em pips diferente).

- 100 é um **piso, não uma garantia**: com ~45% de acerto, o intervalo de
  95% do acerto medido em 100 operações é de ~±10 pontos percentuais.
  Enxerga efeito grande (como o do ADX: 56% x 25%), não efeito pequeno.
- Ritmo ainda **não medido** no regime novo (até 19:25 UTC de 28/09
  havia 2 operações no regime novo). Referência de antes das mudanças:
  162 operações fechadas em 11 dias corridos (17→28/09); o replay
  projeta ~30% menos aprovações agora. Medir antes de prometer prazo.
- **Amostra efetiva menor que 100** (achado de 29/09): as 5 operações do
  regime novo até agora são TODAS compradas em dólar (USD/CHF BUY,
  EUR/USD SELL, AUD/USD SELL, NZD/USD SELL, USD/JPY BUY) - na prática
  uma aposta só repetida. Operações correlacionadas não são amostras
  independentes; o "±10 p.p." acima assume independência, então o
  intervalo real é mais largo. Ao analisar, agrupar por moeda/direção.
- **Fechamento mais lento**: com alvo de $5 (10-20 pips) as operações
  ficam horas abertas (EUR/USD e USD/CHF, ~6,5 h sem tocar TP/SL) e só
  contam quando FECHAM - o ritmo de fechamentos será menor que o de
  aprovações. Posição em 29/09 01:57 UTC: regime novo com 1 fechada
  (LOSS) e 4 abertas.
- **Modelo de fechamento mudou em 03/10/2026 (AJUSTE-066)**: antes, o
  resultado de uma operação fechada era gravado no EXTREMO do candle (em
  candle de notícia, um TP de $5 saía +$11,52) e candles de depois do
  fechamento de sexta podiam fechar operações (AUD/USD 02/10, LOSS
  -$5,18). Desde o AJUSTE-066 o resultado é gravado NO PREÇO DO ALVO
  (+/-$ do TP/SL) e candles fora do horário do mercado são ignorados;
  operações fechadas por este modelo trazem `modeloFechamento:
  "ALVO_EXATO_V1"`. Ao contar as 100 operações e ao medir acerto/
  expectativa, **separar** as sem esse campo (modelo antigo, valores
  inflados em candle de notícia; não são comparáveis em magnitude). O
  acerto (WIN/LOSS) quase não muda; o que muda é o tamanho de cada
  resultado.
- Ferramenta pra contar as operações do regime novo: **ainda não
  existe** (o replay `diagnostico-replay-score-ajuste037.js` imprime o
  total geral, sem filtrar por regime). Criar quando for preciso.

### O que PODE continuar durante o congelamento

- Conserto de **bug que corrompe o que é salvo** ou engana o usuário
  (como os do AJUSTE-038 a 041) — com teste isolado do motor real,
  regressões, registro no `ENGINEERING.md` e validação no primeiro
  ciclo real, como sempre. Na dúvida se é "bug" ou "mudança de
  estratégia": é mudança de estratégia, vai pra fila e pergunta-se ao
  usuário.
- Frontend, Manual, textos de aviso, documentação.
- Ferramentas administrativas **só de leitura** (`ferramentas/*.js` +
  `workflow_dispatch`), inclusive medir o resultado **líquido de spread**
  offline — sem alterar nenhum sinal.
- O usuário mexer na Config (saldo, pares, horários).

### Fila (registrada, NÃO implementar antes do descongelamento)

Detalhe em `PENDENCIAS-ESTRATEGICAS-RMI.md` e `BACKLOG-E-VISAO.md`;
itens achados em 28/09 (`ENGINEERING.md`, AJUSTE-037 a 041):

1. Spread modelado (por par) no score/expectativa — junto com 2 e 3.
2. Taxa <50% contada 3x com amostra cheia (pesoHistorico -10, RUIM -10,
   bonusDirecao -5); nota: a penalidade de histórico "errada no
   conceito" apontou pro lado certo no replay (AJUSTE-037) — medir antes.
3. Limiar "RUIM" em 50% de acerto ignora a relação TP/SL (trocar por
   expectativa, só confiável depois do spread).
4. Folga mínima entre EMAs pra classificar tendência (EUR/USD 28/09:
   tendência decidida por ~0,3 pip entre EMA50 e EMA100).
5. Recalibrar limiares de ATR/slope/distância (hoje em pips, mas os
   valores nunca foram calibrados; ATR sem relação com acerto no dado).
6. Reconferir a zona ideal do ADX (20-30) **fora da amostra** — foi
   identificada nos mesmos dados que a validam.
7. Código morto/incorreto sem efeito prático: `memoriaOperacional`
   (lê `ultimos5` que não existe no objeto BUY/SELL), `analisarAlinhamento`
   (`a > b || a < b`), `riskEngine.js`/`positionSizing.js`.
8. Teto de exposição entre pares correlacionados (evidência real em
   29/09: 4 posições abertas, todas compradas em dólar, $20 de risco
   simultâneo = ~3,1% do saldo); breakeven; stop por ATR (com $ fixo a
   distância do alvo varia muito por par: NZD/USD 12,5 pips ~ 7x o ATR
   de 5 min, USD/JPY 19,7 pips); blackout de notícias; carry trade.
9. ~~Resultado gravado no EXTREMO da vela, não no nível do SL/TP~~
   **DECIDIDO pelo usuário em 29/09/2026: NÃO mexer, nem agora nem
   depois** - a diferença (perda gravada ~15% acima do SL em média,
   ganho ~5% acima do TP; ex.: -$5,27 com SL de $5) é tolerável. Não é
   pendência: não reabrir por conta própria. (Detalhe da conferência em
   `ENGINEERING.md`, "OBSERVAÇÃO 29/09/2026".)

### Quando descongelar

Com >= 100 operações do regime novo fechadas: rodar, no regime novo,
`ferramentas/diagnostico-replay-score-ajuste037.js` (reconfere ADX fora
da amostra), `diagnostico-atr-pips.js`, `diagnostico-discriminacao-score.js`
e `diagnostico-taxa-acerto-real.js`, mais o resultado líquido de spread.
Só então decidir a fila **um item por vez**, com replay antes de cada
mudança (padrão do AJUSTE-037: o que parecia certo no conceito piorou
no dado e foi revertido).

### O que aconteceu em 28/09/2026 (resumo verificado; detalhe no `ENGINEERING.md`)

- AJUSTE-037: ADX passou a ter "zona ideal" (>=30 não soma); mudança de
  histórico proporcional **testada e revertida** (piorava o ranking).
- AJUSTE-038: EMAs/ATR entram no score na escala de pip (JPY x0,01) —
  antes o ATR era "BAIXA" em 100% dos não-JPY e "ALTA" em 100% dos JPY.
- AJUSTE-039: lote/TP/SL **sempre os da Config** (antes 124 de 124
  operações não-JPY saíam com TP/SL $3 forçado, ignorando a Config);
  exceção só GBP/USD com TP 1,5x. Operações novas marcadas
  `regimeTPSL: "CONFIG"`.
- AJUSTE-040: aviso de risco quando o saldo do cálculo é <= 0;
  mensagem de expectativa honesta no AGRESSIVO com histórico curto.
- AJUSTE-041: confirmação dos botões de saldo mostra "atual -> novo".
- **Pendente do usuário**: em 28/09 21:25 UTC o saldo simulado estava em
  $643,07 (usuário queria 500; o botão SUBSTITUI, não soma). Confirmar
  com `ferramentas/checar-saldo-simulado.js` (só leitura).
- **Ainda sem evidência de edge**: ~45% de acerto sem spread modelado
  não é lucro. As seções 3 e 4 abaixo continuam descrevendo 09/09 e
  **não** refletem nada disto.

---

## 1. Origem e evolução (por que o projeto existe, e por que mudou)

Fonte: `WORKLOG_DEFINITIVO.md` (Partes 1 e 4), com reconciliação parcial
contra o código real. **Isto é um resumo, não a história completa** — o
worklog tem ~3.500 linhas e só as fases de fundação e modularização foram
lidas até agora. As fases intermediárias (nomeação da RMI, evolução dos
Sprints) ainda precisam ser cruzadas com o backup das conversas da IA
anterior que o usuário vai trazer — até lá, não tratar como definitivo.

**Fase 0 — Concepção.** O projeto nasceu para ser um assistente de
decisão em Forex com dinheiro real — nunca um "gerador de sinais".
Princípios definidos desde o início e nunca abandonados: qualidade acima
de quantidade, poucas operações de alta confiança, decisão baseada em
dado (não em opinião/achismo), evolução contínua a partir do próprio
histórico. Regra de bolso adotada desde cedo pra qualquer funcionalidade
nova: "isso realmente ajuda alguém operando dinheiro real?" — se não,
não era prioridade.

**Fase 1 — De local pra plataforma persistente.** O projeto deixou de
rodar só em tempo real e passou a precisar de execução contínua,
histórico persistente e automação sem depender de intervenção manual.
Foi quando o Firebase/Firestore virou o banco de dados oficial, e surgiu
o conceito do Result Checker (fechar operações automaticamente,
comparando preço atual com o de entrada, sem conferência manual).

**Fase 3 — Arquitetura modular.** Com o projeto crescendo, a lógica
concentrada em poucos arquivos ficou arriscada de manter. Decisão:
migrar pra módulos separados por responsabilidade, em etapas pequenas,
sob um princípio explícito: **"Primeiro preservar a lógica. Depois
reorganizar. Somente depois evoluir."** — cada etapa devia extrair uma
responsabilidade, validar, só então seguir pra próxima.

**Tensão real encontrada nesta sessão (09/09/2026)**: o usuário reportou
que o `pairAnalyzer.js` está "completamente corrompido na fase de
divisão de arquivos" — ou seja, o princípio acima (preservar lógica
antes de reorganizar) pode não ter sido seguido à risca nessa
migração específica, pelo menos nesse arquivo. Ainda não investigado a
fundo (ver seção 5). Vale ter isso em mente ao ler o restante do
worklog: o documento registra a INTENÇÃO declarada, não necessariamente
o que de fato aconteceu no código — mesma ressalva que a `CLAUDE.md` já
faz sobre toda a `DOCUMENTACAO/`.

**O que a RMI é hoje** (definido diretamente pelo usuário nesta sessão,
08-09/09/2026): RMI ("Real Money Intelligence") não é um 4º perfil
operacional ao lado de Agressivo/Balanceado/Conservador — é **toda a
inteligência gerada pelo app**, o diferencial do produto como um todo.
Um perfil "Expert RMI" chegou a ser implementado e foi revertido a
pedido do usuário por esse motivo. O nome de marca voltado ao usuário
(telas, títulos) é **"Real Money Intelligence" por extenso** — a
abreviação "FARMI", cogitada e implementada, também foi revertida a
pedido do usuário no mesmo dia. "RMI" continua sendo a sigla de uso
técnico interno (código, documentação).

---

## 2. Arquitetura técnica — pipeline real (confirmado por leitura direta do código)

```
scripts/scanner.js (cron, roda a cada 5min via pinger externo)
  │
  ├─ carregarConfiguracao()  ──> Firestore: configuracoes/geral
  │
  └─ para cada par monitorado (dentro da janela — ver "janela por par" abaixo):
       │
       scripts/pairAnalyzer.js (analisarPar)
         │
         ├─ scripts/marketData.js (getCandles)         → API TwelveData
         ├─ scripts/statisticsEngine.js (obterEstatisticasPar) → Firestore: historico
         ├─ scripts/marketAnalyzer.js (calcularQualidade)
         │     └─ scripts/historyAnalyzer.js (analisarHistorico)
         ├─ scripts/moneyManager.js (analisarFinanceiro)
         ├─ scripts/decisionEngine.js (avaliarOperacao)   ← gate de aprovação
         └─ scripts/riskManager.js (existeCooldown / salvarOperacao) → Firestore: historico

js/checker.js (Result Checker, cron separado, também 5min)
  └─ fecha operações "ABERTA" comparando candle atual com entrada,
     grava resultado (WIN/LOSS) de volta em historico
```

**Frontend** (`index.html` + `js/*.js`, sem build step, scripts simples):
`app.js` (router de abas, full re-render por troca) → `expert.js`
(Dashboard), `scanner.js` (aba Scanner, também com Start/Stop do
`scanner/status`), `historico.js`, `config.js`, `pairInsights.js`
(Sugestão de Agora), `push.js`. Todos leem/escrevem Firestore via SDK
client (`firebase-config.js`), independente do backend.

**Duplicação deliberada e documentada** (backend Node vs. frontend
browser não compartilham módulos): a lógica de janela operacional por
par (`dentroJanelaPadrao`/`parNaJanelaOperacional`/
`parElegivelJanelaAsia`) existe em 3 cópias — `scripts/scanner.js`,
`js/pairInsights.js`, `js/config.js`. Mudar a regra num lugar exige
mudar nos outros dois. Ver BUG-011/FEATURE-004/FEATURE-005 no
`ENGINEERING.md`.

---

## 3. Confirmado funcionando hoje (09/09/2026, testado nesta sessão)

Tudo abaixo foi corrigido e validado com testes isolados (Playwright
para frontend, scripts Node para backend) nesta sessão — não depende
de acesso ao Firestore real, que este ambiente não tem. Validação
final em produção ainda pendente (ver seção 5).

- **Perfil Operacional** (Agressivo/Balanceado/Conservador) — afeta
  score mínimo, exigência de multi-timeframe, histórico mínimo.
- **Config → Scanner**: lote/TP/SL, delay, cooldown, candles (com piso
  de segurança de 200), API ativa (rotação), janela de segurança,
  pares monitorados, tipo de conta/saldo — todos com efeito real
  confirmado.
- **Presets de horário** (Londres/Nova York/Ásia±madrugada/
  Personalizado), com suporte a janela atravessando meia-noite.
- **Janela adicional automática por moeda** (BUG-011): pares com
  lastro em JPY/AUD/NZD (exceto GBP/JPY, por precaução) ganham uma
  janela extra na sessão asiática, independente do preset escolhido.
- **Botão "Scanner Ativo" removido do Config** (era redundante/morto —
  o controle real é Start/Stop na aba Scanner).
- **Dashboard**: "Modo Atual" lê o perfil real (antes mostrava
  "Expert" fixo); "Sugestão de Agora" combina estrutura de mercado
  (fontes públicas, citadas) + desempenho real do histórico do
  usuário, com botão pra aplicar os pares sugeridos na Config
  (rascunho local, exige Salvar explícito — nunca grava direto).
  "Voltar para a Última Configuração Salva" descarta edição não salva.
- **Medidor de consumo de API** na Config: estima consultas/dia contra
  o orçamento de 2.400 (TwelveData), avisa se excedido.
- **Histórico**: agrupamento por data com só "hoje" expandido,
  "Minimizar Tudo" funcional; bug de HTML mal-fechado que corrompia
  grupos com mais de 1 sinal no mesmo dia, corrigido.
- **Cota do Firestore**: pollings de 2s reduzidos e pausados em segundo
  plano; `checker.js` não quebra mais sem tratamento quando a cota
  estoura; consulta de estatísticas por par limitada a 50 operações
  mais recentes (antes buscava tudo, sem limite, pra sempre) e
  corrigido bug de ordenação por campo (`dataHora`) que nunca era
  gravado — "últimas operações" agora são as mais recentes de
  verdade, não uma ordem arbitrária.

---

## 4. Conhecido quebrado ou incompleto — não mexer sem entender antes

- **Cota diária do Firestore estourada em 08/09/2026** (~55 mil
  leituras contra teto gratuito de 50 mil). As correções acima devem
  evitar repetição, mas não desfazem o consumo já feito — só reseta
  automaticamente. Enquanto isso, qualquer teste de configuração no
  app é inconclusivo (o Scanner cai no fallback `CONFIG_PADRAO`, não
  lê o que foi salvo).
- **`scripts/pairAnalyzer.js` — reportado pelo usuário como
  "completamente corrompido na fase de divisão de arquivos".** Contexto
  importante (09/09/2026): este foi especificamente o arquivo onde a IA
  anterior **empacou o projeto inteiro** — dizia repetidamente que ia
  corrigir e não corrigia, até o usuário desistir de insistir com ela.
  Ou seja, não é só um arquivo com um bug qualquer: é o ponto onde a
  tentativa anterior de seguir o princípio "preservar lógica, depois
  reorganizar" (seção 1) parece ter falhado de verdade, sem nunca ter
  sido resolvido. Só uma checagem superficial foi feita até agora nesta
  sessão (achado: variável `direcao` usada sem `const`/`let`, gerando
  global implícita — inofensivo hoje porque os pares rodam em
  sequência, mas seria condição de corrida se isso rodasse em paralelo
  no futuro). **Investigação a fundo pendente**, aguardando o backup
  das conversas da IA anterior que o usuário vai cruzar — especialmente
  útil aqui pra entender O QUE ela tentou e por que travou. Não
  presumir que está tudo certo nesse arquivo, e não repetir o padrão de
  "prometer conserto sem entregar".
- **`scripts/riskEngine.js`** — módulo de risco separado e
  parcialmente redundante com `decisionEngine.js`/`moneyManager.js`;
  usa thresholds diferentes; tem um bug conhecido (lê
  `resultado.operacao.atr`, que não existe — ATR real está em
  `operacao.indicadores.atr` — ATR fica sempre 0 nesse módulo). Não
  decidido ainda: corrigir, integrar ou remover.
- **`justificativas`** — calculado em todo o pipeline de decisão
  (`decisionEngine.js` e outros), nunca exibido no frontend. Zero
  ocorrências de "justificativa" em `js/`.
- **Campo `confianca`** (ALTA/MÉDIA/BAIXA) em `statisticsEngine.js` —
  confirmado não-lido em nenhum lugar do pipeline de decisão; campo
  morto/informativo.
- **Nenhum sinal real aprovado e fechado de ponta a ponta** desde as
  correções do BUG-007/008 (P&L de SELL invertido / checker resiliente
  a gaps de cron) — ainda não validado com uma operação real completa,
  em parte por causa da cota do Firestore hoje.
- **Documentação**: 5 arquivos históricos (`WORKLOG_DEFINITIVO.md`,
  `CHANGELOG.md`, `FASE05-RMI-EXPERT`, `DOCUMENTO_MESTRE 1.md` e `2.md`,
  ~27 mil linhas no total, formato narrativo/prosa, duplicação real
  entre eles) ainda não consolidados — aguardando o backup das
  conversas da IA anterior pra decidir o que vira referência única e o
  que vira arquivo morto/arquivado.

---

## 5. Próximo passo, em ordem

**Pendente da sessão de 11/09/2026, pedido explícito do usuário pra
retomar primeiro amanhã** (ele estava satisfeito com o dia mas
cansado demais pra decidir isso à noite):

0a. **Decidir sobre o plano Blaze do Firebase** (pay-as-you-go, mesma
    cota grátis de 50 mil leituras/dia do Spark continua valendo -
    só cobra o excedente, provavelmente poucos centavos de dólar/mês
    no volume atual, mas confirmar o valor exato na página de preços
    do Firebase antes de decidir, e lembrar que exige cartão de
    crédito cadastrado na conta Google Cloud). Contexto: cota do
    Firestore bateu 51 mil leituras/dia em 11/09 (confirmado no
    console real do usuário) - mesmo padrão de estouro já registrado
    antes nesta sessão (ver ENGINEERING.md, correção do polling de
    status do Scanner de 2s pra 15s).
0b. **Levantar tudo que é necessário pra rodar 24h sem delay de
    tempo** (aproximar o ciclo do backend do "tempo real"), **mantendo
    a janela de abertura de sinais novos em 07:30-00:00** (isso não
    muda - só o monitoramento/fechamento de operações já abertas, que
    `js/checker.js` já roda sem gate de horário, precisa ficar mais
    ágil). Pontos já identificados nesta sessão que qualquer
    levantamento precisa considerar: (a) cota de leitura do Firestore
    (item 0a acima - é o gargalo mais imediato); (b) limite de
    requisições da API de preço TwelveData (usuário vai buscar uma 4ª
    chave, de 2400 pra 3200 requisições/dia - mas isso não resolve a
    cota do Firestore, são orçamentos independentes); (c) granularidade
    mínima prática de cron do GitHub Actions (hoje 5 em 5 minutos via
    pinger externo cron-job.org apontando pro workflow_dispatch -
    confirmar se dá pra encurtar de forma confiável); (d) qualquer
    coisa nova que aparecer ao investigar os três itens acima.
    **Ainda não é uma pesquisa feita - é a tarefa em si, a começar
    amanhã.**

---

Itens mais antigos (09/09/2026), ainda não revisitados:

1. Aguardar a cota do Firestore resetar; confirmar no console do
   Firebase que as leituras voltaram a um patamar saudável (bem abaixo
   de 50 mil/dia) com as correções desta sessão no ar.
2. Receber o backup das conversas da IA anterior (usuário vai trazer).
   Ler do mais recente pro mais antigo — o início mudou muito ao longo
   do projeto, o que foi decidido por último é o que vale.
3. Cruzar esse backup com `pairAnalyzer.js` especificamente — é o
   arquivo que o usuário já sinalizou como suspeito.
4. Consolidar a documentação histórica (5 arquivos → estrutura única,
   sem duplicação), usando o backup pra decidir o que preservar.
5. Auditoria arquivo por arquivo, **na ordem real do pipeline**
   (seção 2 acima), não alfabética — cada arquivo produz uma decisão
   (funciona / não funciona / funciona mas está morto / corrigir agora
   / registrar como melhoria futura), não um ensaio. Prioridade: bugs
   que contaminam o que é salvo em `historico` (afeta aprendizado
   futuro) vêm antes de bugs cosméticos ou código morto sem
   consumidor.
