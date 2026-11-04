# Executor de sinais na conta demo XM (MT5) — começa em MODO ENSAIO

Pedido do usuário em 04/11/2026 ("pode construir"), depois que o primeiro cruzamento XM x app (`LABORATORIO-E-ANALISES.md` 6.38d) mostrou entradas manuais com 45 e 154 min de atraso. Objetivo: a conta demo vira uma **réplica fiel do app** (mesmo par, direção e TP/SL em pips do próprio sinal), sem depender de o usuário estar disponível. **Só demo. Não é dinheiro real.**

## Como funciona
1. O scanner oficial termina → o workflow `xm-fila` dispara (evento `workflow_run`; o scanner NÃO foi alterado) → lê os sinais `ABERTA` e recentes (≤ 30 min, desde o marco do teste) do `historico` e grava **um** documento no projeto LAB: `xm_exec/fila_<token>`.
2. O EA `mt5/XM_Executor.mq5` consulta esse documento a cada 10 s (só `GET`; sem o token não há como achar o documento: regra do LAB `allow get`, `list` negado).
3. Para cada sinal novo: confere idade (≤ 10 min), símbolo, **uma posição por par** (inclusive manual), máximo de posições, distância mínima de TP/SL; calcula TP/SL em preço a partir dos pips do sinal aplicados ao preço de entrada real; abre a mercado com **lote 0,02**. O id do sinal fica guardado (variável global do MT5) para nunca repetir.
4. O TP/SL fecham a posição. O EA **não fecha, não modifica, não apaga** (o teste `mt5/executor.test.js` barra `PositionClose`, `PositionModify`, `OrderDelete`, `OrderSend`, `trade.Buy/Sell`).
5. O exportador (`XM_Exporter`) continua registrando tudo; `xm-cruzar` mede atraso e derrapagem de cada entrada.

## Segurança
- Recusa conta que não seja demo; `LoteFixo` ≤ 0,05 e `MaxPosicoes` ≤ 12 (limites no código); no máximo 3 tentativas por sinal.
- **Nasce em ENSAIO** (`SoLog = true`): só escreve no log "FARIA COMPRA EURUSD lote 0,02 preço ... TP ... SL ...", **sem enviar ordem**. Só depois de conferir o ensaio contra os sinais reais o usuário troca para `SoLog = false`.
- O token fica só nas entradas do EA (nunca em log) e no secret `XM_INGEST_TOKEN`. Risco residual: quem tiver o token lê a fila de sinais (par, direção, horário) e escreve lixo em `xm_conta`; não alcança o banco oficial.
- **Eu não compilei nem executei o EA** (sem MetaEditor aqui). O primeiro compile e o ensaio são os testes reais.

## Passo a passo (usuário)
1. No MetaEditor do MT5 da XM: **Arquivo → Novo → Expert Advisor (modelo)**, nome **`Experts\XM_Executor`** (com o prefixo `Experts\`, senão cai na raiz e o MT5 não lista), apague tudo, cole o código de `mt5/XM_Executor.mq5` (GitHub → Raw → copiar), **F7**. Mande os erros, se houver.
2. Arraste o `XM_Executor` para **outro gráfico** que não seja o do exportador (um EA por gráfico; ex.: o gráfico GBPUSD). Aba Entradas: cole o `TokenIngest`; **deixe `SoLog = true`**. Aba Comum: permita negociação algorítmica. Botão Algotrading verde. O WebRequest para `https://firestore.googleapis.com` já está liberado (mesmo do exportador).
3. Aba **Especialistas** deve mostrar `XM_Executor iniciado em modo ENSAIO`. A cada sinal novo do app: `XM_Executor [ENSAIO]: FARIA COMPRA ...` com atraso, derrapagem e TP/SL.
4. Depois de ~1 dia (ou ≥ 5 sinais) comparando com o app, **me avise**: conferimos juntos e só então vira `SoLog = false`. A partir daí **pare de operar à mão nessa conta**, senão duplica.

## Pendências / limites conhecidos
- Atraso esperado: o do scanner (cadência de 5–15 min do cron do GitHub, que às vezes atrasa) mais ~30–60 s do workflow e do polling. Muito menor que entrada manual, mas não instantâneo.
- A fila só tem sinais do app oficial (não os da IA).
- Mercado fechado ou símbolo ausente: o EA registra e descarta o sinal.
