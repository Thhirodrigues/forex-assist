# Exportador da conta demo XM (MT5) — opção A, somente leitura

Decidido em 03/11/2026 (usuário: "A"). O Expert Advisor `mt5/XM_Exporter.mq5` **só lê** a conta e envia, a cada 60 s, saldo/equity/margem e posições abertas, e a cada 5 min os deals dos últimos dias, para a coleção `xm_conta` do projeto **forex-assist-lab** (nunca o banco oficial). Substitui o ciclo "pedir planilha ao Claudinho e colar aqui". **Não abre, fecha nem altera ordens** (o teste `mt5/exportador.test.js` barra `OrderSend`, `CTrade`, etc.) e **não envia número da conta, nome nem servidor**.

## Estado desta entrega
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
