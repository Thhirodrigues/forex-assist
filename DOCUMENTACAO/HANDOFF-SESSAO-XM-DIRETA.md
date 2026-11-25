# Passagem de bastão: sessão nova com acesso direto à XM (criado em 25/11/2026)

> Leia este arquivo inteiro antes de qualquer ação. Ele existe para a sessão nova **não perder nada** do que foi decidido, construído e aprendido
> na conversa anterior (cloud, ~3 semanas, 70+ commits). Só vale como contexto: a hierarquia da verdade do `CLAUDE.md` continua mandando
> (código real > logs reais > documentação). Nada aqui afirma que algo "funciona": diz o que foi **construído e testado**, e o que **ninguém ainda viu rodar**.

## 1. Objetivo da sessão nova
Centralizar o trabalho do **módulo de matérias-primas e índice (GOLD, OILCash, US100Cash)** e da **ponte com a conta demo da XM**, com a sessão rodando
**no computador onde o MT5 está** (acesso direto: MT5, logs, arquivos, sem passar por outra conversa nem pelo navegador do usuário). O forex (app, scanner,
executor do forex) continua como está, com o pipeline de sinais **congelado** (ver `ESTADO_ATUAL.md` seção 0).

## 2. Combinado de trabalho com o usuário (preferências e regras)
- Português. Postura de **mentor crítico e engenheiro sênior**: apontar pontos cegos, não validar por validar, dar fonte quando relevante, recomendar em vez de listar opções.
- **Só dados reais e só conta demo** (decisão de 23/11/2026). **A conta XM do usuário pode receber dinheiro real e um dia ele pode querer testá-la, mas até ele AVISAR de forma explícita, a conta real é proibida: nenhuma leitura de ordens, nenhum login, nenhuma operação.** Esse dia será uma decisão nova (e exigirá mudança de código: o exportador e o executor recusam conta real de propósito). Simulações com entrada hipotética/aleatória não servem mais de base de decisão.
- **Nada bloqueia** por enquanto (limites de risco só registram/avisam), até o usuário decidir ligar os bloqueios.
- **Disciplina de evidência:** hipótese e critérios escritos ANTES, rodar UMA vez, reprovou = encerra sem variantes. IC por blocos de dia, Bonferroni, controle ALEATORIO. 14 famílias de sinal avaliadas, nenhuma com vantagem líquida de custo (ver `LABORATORIO-E-ANALISES.md` 6.44 a 6.76). Expectativa honesta: baixa para o módulo novo.
- **Antes de auditoria ou execução não pedida no meio de conversa: avisar a intenção** e dar espaço (regra do `CLAUDE.md`).
- **Nunca** colar chave, token ou senha no chat. O usuário guarda o `XM_INGEST_TOKEN` num bloco de notas local.
- Fluxo de commit: sempre commitar, `git push -u origin <branch>` e fast-forward em `main` (ver `CLAUDE.md`/instruções da sessão); **publicar só depois de o teste passar** (houve uma publicação com teste falhando por cadeia de comandos que não parou no erro; usar `set -e`).
- O usuário só mexe no PC de trabalho à noite. O PC já reiniciou sozinho e parou na tela de senha (MT5 caiu ~10 h em 06/11). Ver seção 9.

## 3. O que existe (mapa rápido; confira no código)
**Forex (não mexer no pipeline):** `scripts/scanner.js` → `historico` (oficial). `js/checker.js` fecha sinais (TwelveData 5 min, **com spread da tabela** desde 23/11, campo `spreadAplicadoPips`). Executor MT5 `mt5/XM_Executor.mq5` lê a fila `xm_exec/fila_<token>` (LAB) montada por `scripts/xm/fila.js` (workflow `xm-fila.yml`, dispara após o scanner). Exportador `mt5/XM_Exporter.mq5` envia conta/posições/histórico a `xm_conta` (LAB). Relatórios: `xm-cruzar`, `xm-concordancia` (rejulga com M5 da XM), `hoje-app-xm`, `pausa-sinais`, `depois-400`, etc.

**Módulo novo (pré-registro 6.69 a 6.78):**
- `lab/materias.js`: avaliador de entrada **único** (`candidatoEm`), dimensionamento por mercado (`dimensionar`), lote por risco (`lotePorRisco`), julgamento bid/ask (`julgar`), veredito (`julgarPrimaria`, em R). `lab/materias.test.js`.
- `scripts/materias/` (`barras.js`, `motor.js`, `rodar.js`, `materias.test.js`): ciclo ao vivo, passo extra isolado (`continue-on-error`) no workflow `forex-scanner-real.yml`. Lê `xm_barras/<símbolo>` (LAB), grava `historico_materias` (oficial, coleção SEPARADA do `historico`), push com prefixo TESTE.
- `js/materias.js` + aba "Mat." no `js/app.js` (só leitura). `css/painel.css` (classes `.mt-*`).
- MT5: exportador **v1.10** (envia 1.500 velas M1 fechadas de `SimbolosBarras` por minuto + especificação do símbolo) e executor **v1.30** (item de fila com 9º campo `M` usa o lote do sinal; teto `LoteMaxMaterias` 0,30; padrão `MaxPosicoes` 12).
- Regras do LAB com `xm_barras` **já publicadas** (workflow `lab-regras.yml`, 25/11 01:33Z).

## 4. Regras do módulo novo (em vigor; não alterar sem novo pré-registro)
- Dados de avaliação **só a partir de 25/11/2026 00:00Z**. Os 50 dias de M1 arquivados (05/10 a 24/11) NÃO entram.
- Entrada: a cada :00/:30 no fechamento da M1, janela de 60 velas, ER ≥ 0,30, |net| ≥ 4× spread, spread ≤ 1,5× mediana das 1.440 anteriores, fora de 17h–18h BRT, continuação de tendência, entrada na abertura da vela seguinte.
- Primária (emenda 6.78): **T = max(0,5 × R15, 8 × spreadMed)**, stop = T, lote pelo risco de US$ 5 (sem sinal se o lote mínimo passar de US$ 7,50), resultado em R, IC nível 98,33% (Bonferroni 3 ativos). C1 ≥ 300 operações em ≥ 20 dias; C2 IC do R médio > 0; C3 IC de (R − ALEATORIO) > 0; C4 positivo nas duas metades. Políticas P1/P2/P3 e a grade fixa são só descritivas. Veredito esperado por volta de **22/12/2026**.
- Ordens reais na demo: o executor abre a posição de cada sinal (TP = T e SL = S a partir do preço de execução). São duas medidas (julgamento virtual por velas M1 e execução real); o veredito é o virtual.

## 5. Estado em 25/11/2026 (noite) e pendências
- **Construído e testado (testes passam):** tudo da seção 3. O scanner de produção já rodou o passo novo (ciclo 01:35Z): conectou, testou, e reportou "sem velas suficientes" nos 3 ativos (o MT5 ainda não manda velas). Zero impacto no forex.
- **NÃO visto rodando:** o código MQL5 (exportador v1.10, executor v1.30) **nunca foi compilado** (só testes estáticos). A aba "Mat." nunca foi aberta num navegador. O push TESTE nunca foi enviado. O fluxo ponta a ponta (velas → sinal → ordem → fechamento) não teve nenhuma execução real.
- **Primeira coisa a fazer:** compilar no MetaEditor (esta sessão pode fazer com `metaeditor64.exe /compile:<arquivo> /log:<log>` se o caminho existir; confirmar), recarregar os dois EAs e conferir no log: `XM_Executor v1.30 gestao ...`, `modo REAL NA DEMO`, sem aviso de símbolo não encontrado. Depois conferir no scanner (`MATERIAS ciclo = ...`): `estado iniciado (sem backfill)` nos 3 ativos.
- **Armadilhas do MT5 já vividas:** (a) recompilar recarrega o EA com os valores PADRÃO do código (já voltou a `SoLog = true`/modo ENSAIO; o padrão de `MaxPosicoes` agora é 12 no código); (b) clique duplo no Navegador cria instância nova com token vazio → o EA é removido; para editar uma instância rodando use **F7** no gráfico; (c) horários: aba Especialistas = hora do PC (Brasília); Histórico/Negociação = hora do servidor = **Brasília + 5 h** no inverno (GMT+2); o servidor vira o dia às 19h de Brasília; (d) o exportador precisa do WebRequest liberado para `https://firestore.googleapis.com`.
- **Dados a conferir direto no MT5 (o usuário nunca conseguiu):** lote mínimo/passo e valor por ponto de GOLD, OILCash e US100Cash; swap do OILCash (veio 0, modo 3); spread real do US100Cash (nunca exportado); se `SymbolSelect` aceita os três nomes exatos.

## 6. O que a conexão direta substitui (e o que NÃO)
- **Substitui:** a outra conversa com navegador; a exportação manual de barras (o `XM_ExportarBarras` pode ser trocado por script Python com o pacote `MetaTrader5`, mas **mantendo o mesmo formato de CSV** que `lab/materias.js` lê: hora do servidor em segundos, `offset_servidor_seg`, colunas `simbolo,hora_servidor,open,high,low,close,spread_pontos,digitos`; o julgamento offline depende disso); leitura de log/posições/histórico.
- **Não substitui:** os pré-registros, o veredito offline, nem a regra de "não declarar que funciona sem ver o dado".
- Segurança: conexão direta dá a esta sessão **execução de comandos no computador**. Usar só em máquina que o usuário pode dedicar a isso (ver seção 9), com pasta de trabalho limitada, e **somente conta demo** (o exportador e o executor já recusam conta real).

## 6b. Acesso à XM e a outras páginas pelo navegador (decisão de 25/11/2026)
- O usuário quer que a sessão acesse **a página da XM e qualquer outra página online** por navegador, **sem passar por outra conversa**. Há dois mecanismos reais: (1) o **navegador embutido do app Claude para desktop** (ferramentas `mcp__Claude_Browser__*` quando a sessão roda dentro do app; `mcp__remote-devices__Claude_Browser__*` quando é sessão de nuvem ligada ao computador), com perfil próprio e login persistente; (2) a **extensão Claude in Chrome** (`mcp__claude-in-chrome__*`), que age no Chrome real do usuário com TODOS os logins dele. **Preferir o navegador embutido** (só a XM logada, perfil separado). Carregar as ferramentas de uma vez com ToolSearch pelo prefixo do nome.
- **Regras para a XM na web:** só leitura. **Nunca** depositar, retirar, transferir, alterar dados da conta, senha ou configurações, nem abrir ou fechar ordem pelo site. O login é do usuário (a sessão nunca pede nem recebe senha); se a página pedir login ou verificação, pedir ao usuário que faça no navegador. A área de membro da XM lista as contas do usuário: operar **somente** a conta demo (o número da conta fica com o usuário e não vai para o repositório, que é público); se aparecer conta real, não tocar e avisar.
- Não raspar nem automatizar páginas de terceiros logadas (copytrade de outros gestores): os termos da XM provavelmente não permitem; só leitura manual pontual e sem scripts na página.
- Se as ferramentas do navegador não responderem (app fechado/offline), dizer isso em vez de insistir.

## 7. Segredos (só os NOMES; valores nunca vão para chat, repositório ou log)
`XM_INGEST_TOKEN` (também embutido nas regras do LAB; rotacionar exige atualizar o secret e republicar `lab-regras.yml`), `FIREBASE_SERVICE_ACCOUNT` (oficial), `FIREBASE_SERVICE_ACCOUNT_LAB`, `TELEGRAM_BOT_TOKEN`, `TWELVEDATA_KEY_1..4`, `ANTHROPIC_API_KEY` (**expira por volta de 30/11/2026**; só o sinal por IA usa). O repositório é **público**: nada de trades de terceiros, nomes de estratégias de copytrade nem handles (a pesquisa de copytrade está só como resumo anonimizado em 6.71 e 6.72).

## 8. Fatos e resultados que não podem se perder (resumo; detalhe nas seções citadas de `LABORATORIO-E-ANALISES.md`)
- Sinal de forex do app: vantagem bruta ~0 em 14 avaliações pré-registradas; o custo (~3 pips/op) decide o sinal negativo. Duas semanas boas se explicam pela tendência do dólar (6.49/6.50). Fibonacci reprovado (6.67). Pausa depois de perda: sem evidência (6.74). Encerrar no ganho intermediário não melhora a média (6.69).
- App x XM (6.75/6.76): rejulgando 78 sinais com M5 da XM, o app concorda em 97% (100% depois do spread no app, 17/17); o resto é ruído de fronteira (0,3 a 5 pips de diferença entre fontes de preço). O executor tomou 7 de 18 sinais em 24/11 pelo limite de 3 posições (agora 12). Uma posição EUR/GBP ficou aberta 16 h na XM enquanto o app a deu como LOSS.
- Custo real (6.68, lote 0,02): spread GOLD US$ 0,49 por onça (US$ 0,98/op), SILVER US$ 6,70/op (inviável), OILCash US$ 0,10/op; o dia mexe US$ 131 (ouro) contra US$ 11 (EURUSD). Swap de compra do ouro −US$ 1,39/noite.
- Copytrade da XM (6.71/6.72): nenhum dos 7 do topo opera forex; predominam martingale, grade, trava e rajadas (perda adiada, não evitada); retorno de 1 mês do ranking não bate com os trades; o filtro de risco "Baixo" inclui martingale declarado. Pouco histórico real.
- Marcos de avaliação do forex: 400 fechados E ≥ 30 dias (6.37/6.38) com histórico real da XM.

## 9. Decisões em aberto que o usuário precisa tomar
1. **Onde roda a sessão direta:** o usuário esclareceu em 25/11 que o computador é **pessoal** (só fica no trabalho) e **pode ser dedicado** a isso. Fica decidido: sessão local no app desktop nesse PC. Melhoria opcional, não urgente: um Windows VPS para o MT5 e o executor não caírem quando o PC reinicia ou fica na tela de senha.
2. Quando ligar bloqueios de gestão no executor (`ModoExposicao`, `ModoPerdaDia`, `ModoMetaDia` = 2).
3. Lote mínimo e swap do petróleo (conferir no MT5) antes de qualquer interpretação em dólares.
4. Se a exportação semanal de M1 continua manual ou passa para script.

## 10. Roteiro da sessão nova (ordem)
1. Ler `CLAUDE.md`, este arquivo, `ESTADO_ATUAL.md` (final) e `LABORATORIO-E-ANALISES.md` 6.69, 6.70, 6.76 a 6.78. Conferir `git log` e o estado real do código.
2. Confirmar a conexão (pasta, MT5 aberto na conta demo; **nenhuma ação na conta ainda**).
3. Compilar e recarregar os dois EAs; conferir os logs (seção 5).
4. Ler do MT5 as especificações dos 3 símbolos e atualizar `lab/materias.js#ESPEC` só se diferirem do padrão.
5. Acompanhar o primeiro ciclo ao vivo e o **primeiro sinal real** (cartão no app, linha `ENTROU` no log, posição na XM) antes de deixar rodando sozinho. Registrar o resultado no caderno.
6. Só então pensar em substituir a exportação manual.

## 11. Texto para abrir a sessão nova (colar como primeira mensagem)
> Esta sessão continua o projeto Forex Assist (repositório Thhirodrigues/forex-assist, branch de trabalho `claude/repo-description-hnctr1`, sempre fast-forward em `main`). Leia primeiro `CLAUDE.md` e `DOCUMENTACAO/HANDOFF-SESSAO-XM-DIRETA.md`, depois confira o código real. Meu objetivo: centralizar aqui o módulo de matérias-primas/índice (ouro, petróleo, Nasdaq) e a ponte com a minha conta demo da XM (MT5 neste computador), sem passar por outra conversa. Regras: só dados reais e só conta demo; nada bloqueia; pré-registro antes de qualquer teste; me avise antes de auditorias que eu não pedi; nunca peça nem mostre chaves e tokens. Use o navegador embutido do app (já logado na XM; só leitura, nunca mover dinheiro, nunca pedir minha senha) para ler o que precisar da XM e de outras páginas. Comece pelo roteiro da seção 10 do handoff e me diga o que viu antes de agir na conta.

## 12. Ambiente e coordenação entre sessões (25/11/2026, fim do dia)
- O usuário usa o **app Claude para desktop no Windows** e já tem uma **sessão local** numa pasta `Forex` dentro de Downloads, com navegador embutido (XM logada), extensão do Chrome e MT5 no mesmo computador. A sessão de **nuvem** (a que escreveu este documento) **não alcança** esse computador: o Remote Control listou o computador e a pasta, mas devolveu `not_available` mesmo depois de atualizar o app. Por isso a sessão nova é **local**.
- Divisão de trabalho recomendada: **sessão local = olhos e mãos no PC** (MT5, compilar EAs, logs, posições, XM na web, exportações); **sessão de nuvem = repositório, testes, GitHub Actions, leitura do banco por workflow**. Podem coexistir.
- **Para não perder código:** só **uma** sessão publica em `main` por vez. A sessão local trabalha na **sua própria branch** (`claude/sessao-local-xm`), faz `git fetch origin main` antes de qualquer `push`, integra `main` (merge, sem force-push) e só então publica. A sessão de nuvem usa a branch `claude/repo-description-hnctr1` e faz o mesmo `fetch` antes de cada fast-forward em `main`. **Nunca** `git push --force`.
- A sessão local só consegue publicar no GitHub se o usuário entrar na conta GitHub nesse PC (janela do Git ou `gh auth login`, interativo). **Chaves e tokens nunca vão para o chat.** Sem isso, ela entrega arquivos e logs e a sessão de nuvem cuida dos commits.
- O usuário é leigo em terminal: explicar cada passo em linguagem simples, um de cada vez, e dizer o que esperar na tela.

## 13. Pendências imediatas (25/11/2026, noite)
1. **Compilar e recarregar no MT5** o exportador v1.10 e o executor v1.30 (ver seção 5). Sem isso o módulo novo não gera nenhum sinal.
2. Depois de recarregar: conferir no log do MT5 `XM_Executor v1.30 gestao...` e `modo REAL NA DEMO`; e no scanner, `MATERIAS ciclo = ...` com `estado iniciado (sem backfill)` nos 3 ativos.
3. A posição **EUR/GBP venda** aberta na XM desde 24/11 04:06 BRT **deve ficar aberta** (o app a deu como LOSS; ver 6.76): observar como termina.
4. O executor está com `MaxPosicoes = 12` e `SoLog = false`; conferir que nenhuma recompilação os resetou.
5. Repetir a conferência app × XM (`xm-concordancia.yml`, `hoje-app-xm.yml`) quando houver ~100 sinais com spread; esperar alguns dias com a admissão igual (12 posições).
6. **01/12**: conferência rápida do módulo novo (dados íntegros? quantas entradas?). **~22/12**: veredito.
7. **~30/11**: expira a chave Anthropic (só o sinal por IA usa).
8. Ler do MT5 lote mínimo, passo e valor por ponto de GOLD, OILCash e US100Cash, e o swap do OILCash.
9. O `dia-caminho.yml` foi disparado em 24/11 e o resultado não foi lido (não era a pergunta do momento).

## 14. Registro de 25/11/2026 (madrugada): primeira compilação real no MT5
- A **sessão local** (no PC do usuário) compilou os dois EAs no MetaEditor: **0 erros e 0 avisos** (exportador v1.10 e executor v1.30). Cópia das versões antigas em `MQL5\backup_EAs_20261124` no PC do usuário.
- **Armadilha nova:** compilar **por linha de comando** gerou os arquivos mas o MT5 **não recarregou** os EAs (o executor continuou na v1.20). Recompilar pelo **botão Compilar do MetaEditor** fez o MT5 recarregar na hora. Sempre conferir no log a linha de início, e não só o resultado da compilação.
- Log real do MT5 (aba Experts, hora do PC): `XM_Executor iniciado em modo REAL NA DEMO ... maximo 12 posicoes` e `XM_Executor v1.30 gestao: ...` às 00:05:55; `XM_Exporter iniciado` às 00:06:27 e `historico inicial enviado (120 dias)` às 00:07:41. O exportador novo está no gráfico EURUSD H1, o executor no GBPUSD H1; `SoLog = false`, `MaxPosicoes = 12` mantidos.
- **Confirmado pelo scanner de produção (ciclo 03:10Z, run 45538077376):** `OILCash: estado iniciado (sem backfill)` e `US100Cash: estado iniciado (sem backfill)`, ou seja, **as velas dessas duas chegaram ao banco e o motor ao vivo as leu**. `GOLD: sem velas suficientes` neste ciclo (a investigar: provável primeiro envio com poucas velas enquanto o MT5 carregava o histórico; conferir nos ciclos seguintes).
- Antes dessa recarga o executor v1.20 já estava operando a demo (entradas em USDJPY, AUDUSD e NZDUSD em 24/11 à noite).
- Ainda **não visto rodando:** primeiro sinal real do módulo novo (cartão no app, linha `ENTROU` com lote de sinal tipo M, posição na XM) e o push TESTE.
