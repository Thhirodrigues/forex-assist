# Forex Assist / RMI — Estado Atual

> **Como usar este documento**: é a referência de "onde o projeto está agora
> e o que fazer a seguir" — se o trabalho parar aqui, quem assumir (pessoa
> ou IA) deve conseguir se orientar só com isto, sem precisar reconstruir o
> contexto lendo tudo de novo. Atualizado por cima (o topo de cada seção é
> o estado mais recente), não por baixo como o `ENGINEERING.md` (esse
> continua sendo o log cronológico de decisões técnicas — auditável,
> mas não é pra navegação rápida).
>
> Última atualização: 09/09/2026.

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
