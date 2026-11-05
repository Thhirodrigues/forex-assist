# Avisos no Telegram (segundo canal) — AJUSTE-105

Pedido do usuário (05/11/2026): receber **todos** os avisos também no Telegram, porque o push do Chrome no Android atrasa (teste de 05/11: enviado 21:56, chegou muito depois) e não vibra de forma confiável.

## O que vai para o Telegram
Tudo que hoje vai por push: **novo sinal** (`🟢 COMPRA EUR/USD` / `🔴 VENDA ...`, em NEGRITO, com score, janela e horário), **encerramento** (WIN/LOSS), **lucro parcial** e o **alerta do vigia do MT5** (parou/voltou). O push do navegador continua funcionando em paralelo. Telegram aceita negrito; push do navegador não.

## Como funciona (segurança)
- O código está em `scripts/telegram.js`, chamado de dentro de `enviarParaTokens` (`scripts/pushNotifier.js`), então TODOS os avisos passam por ele, inclusive quando não há nenhum aparelho de push ativo.
- **Nunca derruba o scanner**: sem token ou sem destino é no-op silencioso; erro de rede/Telegram vira uma linha de log; tempo limite de 8 s; o token é mascarado em qualquer mensagem de erro.
- O **token do bot** só existe como secret do GitHub (`TELEGRAM_BOT_TOKEN`). O **destino** (chat_id) fica em `config_telegram/destino` no banco oficial (só administrador, regras trancadas).
- Workflows que enviam avisos receberam só a linha `TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}`: scanner, result-checker, vigia e diagnóstico de push.

## Passo a passo (usuário)
1. No Telegram, procure **@BotFather** (o oficial, com selo azul) → `/newbot` → escolha um nome e um usuário que termine em `bot`. O BotFather mostra o **token** (algo como `123456:ABC...`). **Não cole o token no chat com a IA.**
2. GitHub → Settings → Secrets and variables → Actions → New repository secret: nome **`TELEGRAM_BOT_TOKEN`**, valor = o token.
3. No Telegram, abra o **seu bot** (o link que o BotFather deu), toque em **Iniciar** e envie uma **palavra-código** que você escolher (mínimo 4 caracteres, sem nada secreto; ex.: `forex-nov26`).
4. GitHub → Actions → **"Telegram - conectar o bot ao seu chat"** → Run workflow → `codigo` = a mesma palavra → Run. O log deve dizer "Telegram conectado" e o bot manda a mensagem "✅ Forex Assist conectado".
5. **Vibração longa:** no Telegram, abra o chat do bot → ⋮ → Notificações (ou Configurações → Notificações e sons → Chats privados) → **Vibrar: Longo**, som à sua escolha, e **Prioridade/Importância alta**. Em Xiaomi, ponha o Telegram em **Bateria: Sem restrições** e Inicialização automática ligada.
6. Teste: rode **"Push - diagnóstico das notificações"** com `teste = 1`; o aviso de teste chega ao Telegram também.

## Limites
- Só funciona depois dos passos 1–4 (antes disso é no-op).
- Telegram entrega rápido, mas ainda depende de o celular ter internet e do Telegram estar liberado da economia de bateria.
- Se o usuário trocar de chat/telefone: rodar o workflow de conexão com `trocar = 1`.

## Relatório diário e semanal (AJUSTE-110, 05/11/2026)
Pedido do usuário ("pode gerar as análises no telegram conforme você estruturou"). **Informa, não decide**; nenhum número vem de IA.
- **Diário**: segunda a sexta, **18:30 de Brasília** (21:30 UTC). Sinais emitidos e fechados no dia, WIN/LOSS, líquido do dia (pips/op e US$ do app sem spread), **acumulado** (n/400, dias/30, líquido pips/op com IC95 em blocos de dia, acerto), abertas agora, sistema (status do último ciclo do scanner no GitHub, MT5 enviando, desfecho dos horários da IA no dia). Sempre com o aviso de que o número do dia é quase ruído.
- **Semanal**: **sexta 18:40 de Brasília** (21:40 UTC), semana de segunda 00:00 (Brasília) até agora: mesmo resumo + acumulado + **por par com `n`**, marcado DESCRITIVO (com ~10 pares, algum parece bom/ruim por acaso). Não inclui ainda a conta XM (atraso/derrapagem) nem comandos (`/hoje`, `/marco`): ficaram para depois.
- **Dia = dia de Brasília** (UTC-3).
- **Números**: mesmo leitor da regra 6.25 (`scripts/marco/regra625.js`: fechadas CONFIG desde 04/10 00:42Z, spread da tabela do Lab, bootstrap por blocos de dia). Texto em `scripts/relatorio/montar.js` (puro, testado em `relatorio.test.js`).
- **Como dispara**: `.github/workflows/relatorio-telegram.yml` roda quando o scanner TERMINA (`workflow_run`; o scanner não foi alterado; cron nativo não é confiável). Um primeiro passo barato (`slot.js`) pula tudo fora dos horários. Cada horário sai no máximo uma vez (reserva atômica em `relatorio_agenda/<chave>` no banco oficial; janela de 25 min após o horário). Se o pinger parar nesse intervalo o relatório do dia não sai (não é reenviado depois).
- **Manual**: Actions → "Relatorio no Telegram" → `tipo` diario|semanal; `enviar=0` só imprime o texto no log, `enviar=1` envia marcado **TESTE** (não reserva o horário).
- **Limites conhecidos**: "Scanner: último ciclo = success" é o status do GitHub (workflow verde ≠ funcionando); só o acumulado e o `historico` provam que o scanner produz. O corpo do aviso passa por `escaparHtml` (só o título sai em negrito).

