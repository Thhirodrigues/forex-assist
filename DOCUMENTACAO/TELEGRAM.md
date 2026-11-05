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
