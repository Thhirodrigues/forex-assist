# Forex Assist — Guia de Trabalho para Claude

Este arquivo é lido automaticamente no início de toda sessão neste repositório.
Ele registra *como* trabalhamos neste projeto especificamente — não repete a
postura geral (mentor crítico, apontar pontos cegos, não validar por validar),
que já está configurada em nível de conta.

## Hierarquia da verdade

1. **Código real no repositório** — o que está commitado é o que roda.
2. **Logs de produção reais** (GitHub Actions, Firestore) — confirmam o que o
   código faz de fato, não o que deveria fazer.
3. **Documentação em `DOCUMENTACAO/`** — histórico e intenção, útil para
   contexto, mas **não confiável como prova de estado atual**. Já foi
   comprovado que ela registra sprints como "concluídas com sucesso, workflow
   GREEN" quando na verdade o processo só não travava — não gerava nenhum
   resultado válido. "Workflow verde" no GitHub Actions não significa
   "funcionando"; scripts deste projeto engolem erro e retornam status "ERRO"
   sem derrubar o processo.

Nunca afirmar que algo "está funcionando" só porque a documentação ou um
workflow verde dizem isso. Verificar no código e, quando possível, nos logs
reais antes de confirmar qualquer coisa relacionada ao estado do sistema.

## Antes de agir no meio de uma conversa

Se uma auditoria, busca ou execução de comando não foi pedida explicitamente
e a conversa ainda está em andamento sobre outro assunto, avisar a intenção
("vou verificar X") e dar espaço para o usuário acrescentar contexto antes de
executar — em vez de simplesmente rodar e reportar o resultado depois. Isso
já causou perda de contexto importante uma vez neste projeto.

## Qualidade de sinal da RMI (não negociável)

A RMI (Real Money Intelligence) é o núcleo do produto. Cada operação salva no
histórico alimenta o aprendizado futuro do sistema. Por isso:

- Nenhuma mudança no pipeline de análise (scanner → pairAnalyzer →
  marketAnalyzer → historyAnalyzer → scoreEngine → decisionEngine →
  moneyManager/riskEngine) entra em produção sem confirmar que a operação
  salva atende **todos** os critérios de análise pretendidos — não só "não
  deu erro".
- Um sinal gerado com pipeline incompleto (ex.: risco/retorno não calculado,
  position sizing não aplicado) é pior que nenhum sinal: ele contamina
  silenciosamente a base de aprendizado.
- Ao reativar o scanner após qualquer correção, validar os primeiros ciclos
  manualmente antes de deixar rodando sozinho via cron.

## Onde encontrar o quê

- **Responsabilidade de cada arquivo, de quem recebe dado e para quem manda**
  (mapa de módulos e dependências): `DOCUMENTACAO/ENGINEERING.md` — laudo
  técnico por arquivo. É o documento mais confiável do lote, mas precisa ser
  conferido contra o código quando algo parecer decisivo (arquitetura muda
  mais rápido do que a auditoria é atualizada).
- Histórico do projeto (por que começou, quando o pensamento mudou): em
  reorganização — hoje espalhado entre `WORKLOG_DEFINITIVO.md`,
  `CHANGELOG.md`, `FASE05-RMI-EXPERT` e os dois `DOCUMENTO_MESTRE`, com
  duplicação real entre eles.
- Estado atual e próximo passo: ainda não centralizado (é parte do trabalho
  de reorganização em andamento). Até lá, perguntar antes de assumir.

## Ambiente

- Este repositório **não tem credenciais de Firebase/Firestore** configuradas
  no ambiente de execução do Claude Code — não é possível consultar dados
  reais do banco a partir daqui. Verificações de estado do banco (operações
  pendentes, saldo, etc.) dependem do usuário checando via app/console
  Firebase, ou de credenciais serem fornecidas explicitamente.
- GitHub Actions do projeto: `forex-scanner-real.yml` (scanner, cron 5 min) e
  `result-checker.yml` (fecha operações pendentes, cron 5 min). Ambos podem
  ser inspecionados via ferramentas do GitHub (logs de execução reais).
