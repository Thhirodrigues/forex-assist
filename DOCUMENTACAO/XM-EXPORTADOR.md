# Exportador da conta demo XM (MT5) — opção A, somente leitura

Decidido em 03/11/2026 (usuário: "A"). O Expert Advisor `mt5/XM_Exporter.mq5` **só lê** a conta e envia, a cada 60 s, saldo/equity/margem e posições abertas, e a cada 5 min os deals dos últimos dias, para a coleção `xm_conta` do projeto **forex-assist-lab** (nunca o banco oficial). Substitui o ciclo "pedir planilha ao Claudinho e colar aqui". **Não abre, fecha nem altera ordens** (o teste `mt5/exportador.test.js` barra `OrderSend`, `CTrade`, etc.) e **não envia número da conta, nome nem servidor**.

## Estado desta entrega
- **VALIDADO EM DADOS REAIS (03/11/2026):** EA compilado no MetaEditor (0 erros), ligado na conta demo XM, PATCH aceito, estado a cada 60 s e histórico de 120 dias gravados; o leitor reproduz o saldo real com diferença 0,00. Achados em `LABORATORIO-E-ANALISES.md` 6.38b (a conta "nova" é a antiga com saldo redefinido; marco de partida 2026-10-31T00:29:49Z).
- Armadilhas encontradas na instalação: o nome do EA deve ser criado em `Experts\XM_Exporter` (sem o prefixo ele cai na raiz `MQL5` e o MT5 não lista); o WebRequest deve ser liberado em cada terminal MT5; a conta MT5 usa login numérico + senha MetaTrader + servidor, não o e-mail do site.
- (Texto abaixo é o da entrega inicial, antes da validação.)
- Código MQL5 escrito, mas **NÃO compilado nem executado** (não há MetaEditor/MT5 neste ambiente). O primeiro compile no MetaEditor é o primeiro teste real; mandar o texto dos erros (se houver) e o log da aba "Especialistas".
- Lado Node (regras do Firestore, leitor, testes) testado com dados sintéticos no formato do EA. **Formato real ainda não validado** — a primeira leitura com dados reais é o teste de verdade.
- Incerteza conhecida: não consegui consultar a documentação do MQL5 daqui; o EA tenta `PATCH` e, se o terminal recusar, cai para `POST` com `X-HTTP-Method-Override: PATCH` (o log diz qual funcionou).

## Segurança (desenho)
- O EA grava via API REST do Firestore com a chave web pública do projeto LAB + um **token secreto** que você inventa. As regras (`lab/firestore.rules`, bloco `xm_conta`) só aceitam gravar se o token bater; **leitura e exclusão são negadas** para qualquer cliente (só o GitHub Actions, com credencial de administrador, lê).
- O token **não fica no repositório**: o marcador `__XM_TOKEN__` é trocado pelo secret `XM_INGEST_TOKEN` na hora de publicar as regras (`lab/publicar-regras.js`). Sem o secret, o bloco nem entra e nada pode ser gravado.
- Risco residual: o token fica nas entradas do EA no seu PC. Vazando, alguém poderia **escrever lixo** em `xm_conta` (não ler nada, não alcançar o banco oficial). Resposta: gerar outro token, atualizar o secret, republicar as regras.
- O EA recusa rodar em conta REAL.

## Passo a passo (você)
1. **Gerar o token** (16+ caracteres, só letras/números/`-`/`_`), por exemplo com um gerenciador de senhas. **Não cole no chat.**
2. **GitHub → Settings → Secrets and variables → Actions → New repository secret**: nome `XM_INGEST_TOKEN`, valor = o token.
3. **Actions → "Laboratório - publicar regras do Firestore" → Run workflow.** O log deve dizer `Bloco xm_conta: INCLUÍDO`.
4. **MT5 (Windows)**: Arquivo → Abrir pasta de dados → `MQL5\Experts` → copie `XM_Exporter.mq5` (baixe do repositório: pasta `mt5/`). Abra no MetaEditor (F4) e compile (F7). Mande os erros, se aparecerem.
5. **MT5 → Ferramentas → Opções → Expert Advisors**: marque "Permitir negociação algorítmica" e "Permitir WebRequest para as URLs abaixo" e adicione `https://firestore.googleapis.com`.
6. Arraste o EA para **qualquer gráfico** da conta demo (ex.: EURUSD). Na aba "Entradas", cole o token em `TokenIngest`. O botão "Negociação algorítmica" da barra deve estar ligado. (O EA não negocia; o MT5 só exige o botão ligado para EAs rodarem.)
7. Aba **Caixa de ferramentas → Especialistas**: deve aparecer `XM_Exporter iniciado (somente leitura)` e, depois, `historico inicial enviado`. Se aparecer erro, copie o texto (sem o token).
8. **Actions → "XM - ler o que o exportador MT5 gravou" → Run workflow.** O log mostra o resumo (idade do último estado, nº de fechadas, saldo calculado × real). Aviso: o MT5 precisa ficar ligado (PC ligado ou VPS); fim de semana sem mercado não há problema.

## O que isso resolve e o que não resolve
- Resolve: histórico e posições sem planilha manual; os movimentos de saldo (depósitos/ajustes), que eram a pergunta aberta da diferença de −21,09 na conta antiga; motivo de fechamento (TP/SL/stop-out) e horários exatos.
- Não resolve: não decide nada sobre o sinal; não substitui o cruzamento com `historico` do app (próximo passo natural: casar cada operação da XM com o sinal do app, como no `cruza.js` antigo, agora automático).
- Não é o "sinal por IA" nem entra no pipeline oficial.

## Vigia do MT5: gatilho pelo ciclo do scanner (06/11/2026)
Ocorrência real: o MT5 parou de enviar às ~05:06 de Brasília (08:06Z) de 06/11. O `xm-vigia` (cron nativo `*/15`) só rodou 4 vezes em ~12 h e o primeiro alerta saiu às 09:41Z, **94 min depois** (limite desenhado: 10 min), e o reenvio horário não ocorreu (próxima execução só muito depois). Causa: o cron nativo do GitHub não é confiável neste repositório (mesmo achado do `ia-programado`). Correção: o `xm-vigia.yml` agora também dispara por `workflow_run` do "Forex Scanner Real" (a cada ciclo do pinger); o cron fica como reforço. A lógica de estado (reenvio a cada 60 min, máx. 6, aviso de volta) não mudou. Efeito colateral esperado: com o PC do trabalho desligado durante o dia, chegam até 6 alertas (um por hora).

### Causa raiz e solução (06/11/2026, confirmada pelo usuário)
O PC do trabalho reiniciou sozinho (provável atualização do Windows) e **parou na tela de senha**; como o MT5 abre pelo logon (atalho `XM Global MT5` na pasta Startup), ficou fora do ar de ~05:06 até ~15:57 (BRT), quando o usuário entrou. Não foi queda de internet nem desligamento. Correções feitas: (1) pasta Startup limpa, só com o atalho do MT5 (havia cópias de `terminal64`, `MetaEditor64`, `metatester64` e a pasta `Tester`, que abriam o Agents Manager); (2) perfil de gráficos `Forex Assist` salvo com `XM_Exporter` (EURUSD H1) e `XM_Executor` (GBPUSD H1) e usado como padrão; (3) login automático do Windows (para a conta Microsoft foi preciso desligar antes "somente Windows Hello" em Configurações > Contas > Opções de entrada, senão o `netplwiz` não mostra a caixa); (4) WebRequest para `https://firestore.googleapis.com` conferido. Teste de reinício feito: o MT5 subiu sozinho com os dois robôs. Pendência de risco conhecida: o login automático deixa o PC acessível a quem tiver acesso físico. Sobrou o buraco de dados de 05:06 a 16:07 em 06/11 (executor não viu sinais; o app e a medição das 400 não foram afetados).

