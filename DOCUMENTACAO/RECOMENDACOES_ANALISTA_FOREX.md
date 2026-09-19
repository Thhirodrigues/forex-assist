# Recomendações de um Analista Forex — Pontos Cegos da RMI

**Data:** 13/09/2026
**Postura deste documento:** não é revisão de código, é a pergunta que um
gestor de risco faria antes de autorizar a própria conta a operar com este
sistema: *"o que aqui me faria hesitar em colocar meu próprio dinheiro?"*
Cada item foi verificado diretamente no código (grep/leitura), não é
suposição. Nada foi implementado — isto é material para discussão.

---

## Prioridade 0 — Proteção de capital que existe só no papel

### 1. Limite de perda diária e disjuntor de perdas consecutivas são campos mortos

`PERFIL_FINANCEIRO` define, por perfil:

```
CONSERVADOR: riscoDiario 3%, perdasConsecutivas 3
BALANCEADO:  riscoDiario 5%, perdasConsecutivas 4
AGRESSIVO:   riscoDiario 8%, perdasConsecutivas 5
```

Busquei `riscoDiario` e `perdasConsecutivas` em todo o repositório: **eles
só aparecem nesta definição.** Nenhuma função lê esses campos, nenhum gate
os verifica. Isso significa que hoje **não existe nada que impeça o
sistema de continuar abrindo operações depois de uma sequência de losses,
nem depois que a perda acumulada do dia já passou do teto do perfil.** O
número existe na tela de configuração e na struct de código — dando a
impressão de proteção — mas não protege nada na prática.

Para alguém que vai operar dinheiro real: isto é o item mais crítico deste
relatório. Um dia ruim (5-6 losses seguidos, como o padrão real que você
já viu) não tem *nenhum* freio estrutural — só para quando a janela
operacional fecha ou o saldo acaba.

**O que eu sugeriria (para discussão, não implementação):** dois gates
novos, verificados antes de qualquer operação nova abrir:
- Somar `resultadoFinanceiro` de todas as operações fechadas do dia
  (Brasília); se a perda acumulada já ultrapassar `riscoDiario`% da banca,
  bloquear novas aberturas até o próximo dia.
- Contar losses consecutivos mais recentes (já existe `lossStreak` em
  `statisticsEngine.js`, calculado mas usado só pra score); se atingir
  `perdasConsecutivas` do perfil, pausar novas entradas até o streak
  quebrar ou até o dia seguinte.

### 2. Custo de operar (spread) nunca entra na conta

Zero menções a "spread" em todo o código. `calcularExpectativa()` e todo o
cálculo de risco/retorno assumem que o preço de entrada é exatamente o
preço analisado — sem descontar o spread real da corretora.

Isso é grave especificamente **por causa do tamanho do TP configurado**:
TP de $3-5 (frequentemente reduzido a $3 pelo ajuste automático de mercado
lento) é pequeno o bastante para que o spread sozinho consuma uma fração
relevante do lucro-alvo, dependendo do par. GBP/JPY ("the beast",
citado no próprio `ENGINEERING.md` como o cruzamento mais volátil da lista)
tipicamente tem spread bem mais largo que EUR/USD — um TP de $3 ali pode
estar competindo com o próprio custo de entrar e sair da operação.

Sem esse dado, toda expectativa matemática calculada (`calcularExpectativa`)
está sistematicamente otimista — ela assume um R/R melhor do que o
realmente executável na XM.

**Sugestão:** capturar o spread médio por par (mesmo que como constante
aproximada por par, atualizada manualmente de tempos em tempos, já que
TwelveData não necessariamente entrega bid/ask junto com o candle) e
descontá-lo do TP efetivo/expectativa antes de aprovar. Pares com spread
desproporcional ao TP configurado deveriam ter TP mínimo maior ou ficar de
fora da lista até isso ser resolvido.

---

## Prioridade 1 — Estrutura da estratégia (o que já discuti, reforçado com números)

### 3. RSI nunca veta direção (já registrado na auditoria anterior — reafirmado aqui como prioridade 1, não 2)

Recapitulando com a lente de "dinheiro próprio": eu não compraria um ativo
com RSI de 5 min em 80+ só porque a EMA ainda aponta pra cima — é
literalmente o manual de "comprar no topo do movimento de curto prazo".
Repito aqui como prioridade porque os dois achados de Prioridade 0 são
mais graves em termos de proteção de capital, mas este é o que mais
explica a taxa de acerto baixa que você já observou nos sinais reais.

### 4. Stop fixo em dólar, não em volatilidade (ATR)

`decidirConfiguracaoMercado()` troca TP/SL para valores fixos ($3) quando
ADX ou ATR estão baixos — é uma régua binária (liga/desliga), não uma
régua contínua. Um gestor de risco sério amarra a distância do stop a um
múltiplo do ATR do momento (ex.: SL = 1.5× ATR), não a um valor fixo em
dólar que ignora se o par está "respirando" 8 pips ou 40 pips por candle
de 5 min naquele momento específico. Com stop fixo, em mercado mais
volátil o SL vira "ruído normal do candle" (stopado por movimento
aleatório, não por a tese ter errado) — e em mercado mais parado, o SL
fica desnecessariamente largo pro risco real.

### 5. Nenhum mecanismo de gestão da operação depois de aberta

Uma vez aberta, a operação só espera bater TP ou SL fixos — não existe
breakeven (mover o stop pro zero a zero quando o preço andou a favor),
trailing stop, nem realização parcial de lucro. O próprio padrão que você
viu nas imagens (GBP/USD mostrando +$0.40 de favor no momento do print,
ainda pendente) é exatamente o cenário onde isso importa: sem nenhum
travamento de lucro parcial, um sinal que já esteve no verde pode terminar
em LOSS sem que o sistema tenha feito nada para proteger o que já tinha
sido conquistado.

Isso é normal em sistemas simples — mas se o objetivo é "análise impecável",
pelo menos um breakeven simples (mover SL pra entrada quando o preço andar
X% do caminho até o TP) é o item de gestão de trade mais barato e mais
citado por qualquer analista profissional.

### 6. Sem teto de exposição agregada entre pares abertos ao mesmo tempo

Já mencionado na auditoria anterior (correlação entre pares), reforçando
aqui com números: com `riscoPorOperacao` de até 3% (Agressivo) e nenhum
teto agregado, 5 pares abertos simultaneamente (perfeitamente possível, já
que o cooldown só bloqueia duplicidade no *mesmo* par) podem somar até 15%
da banca em risco simultâneo — sem que nenhuma camada do sistema veja essa
soma. Combinado com o item 1 (limite diário morto), a única coisa que
impede isso hoje é o número de pares monitorados e a sorte de não gerarem
sinal ao mesmo tempo.

### 7. Nenhum filtro de eventos de notícia/calendário econômico

Zero menções a calendário econômico ou blackout de notícias no código. Um
sistema baseado inteiramente em EMA/RSI/ADX/ATR assume mercado
"tecnicamente racional" — mas divulgações de alto impacto (NFP, decisão de
juros, CPI) produzem movimentos que não respeitam nenhuma dessas médias
por minutos a horas. Isso é coerente com os pavios longos vistos nos
gráficos que você compartilhou (USD/JPY, AUD/USD) — picos e vales abruptos
que fogem completamente do canal de preço ao redor.

Não é preciso um calendário completo — mesmo uma lista simples de
horários de alto impacto conhecidos (ex.: primeira sexta-feira do mês,
14:30 Brasília, tipicamente NFP) já reduziria exposição ao ruído mais
perigoso, sem exigir integração de dados nova.

### 8. Descompasso de horizonte entre o filtro de tendência (EMA200) e a velocidade da estratégia

EMA200 num candle de 5 min representa a tendência das últimas ~16-17
horas — um horizonte relativamente longo — sendo usada para filtrar
entradas que abrem e fecham em minutos, com TP/SL de poucos dólares. Isso
não é necessariamente errado (EMA200 como filtro de contexto é prática
comum), mas vale a pergunta explícita: o produto é um sistema de scalping
de curtíssimo prazo, ou de seguimento de tendência? A resposta muda o que
"análise impecável" significa — um scalper de 5 min se importa mais com
microestrutura (order flow, spread, velocidade de reversão) do que com uma
média de 17 horas; um seguidor de tendência não deveria ter TP de $3.
Hoje o sistema tenta ser os dois ao mesmo tempo.

---

## O que eu NÃO colocaria na lista de urgência (para não distorcer prioridade)

- Backtesting formal dos pesos do score (já citado na auditoria anterior)
  — importante, mas estrutural e demorado; não é o que vai evitar o
  próximo dia ruim.
- Diferenciação técnica completa entre perfis (Seção 2 do relatório
  anterior) — decisão de produto, não de segurança.

---

## Resumo para decidir domingo, em ordem de "o que eu quereria corrigido
antes de arriscar meu próprio saldo"

1. **Limite de perda diária + disjuntor de perdas consecutivas** — hoje
   não existem de verdade. Isto vem antes de qualquer ajuste de
   estratégia.
2. **Modelar o custo de spread** na expectativa/aprovação, ao menos como
   constante por par.
3. **Veto de RSI extremo** (reafirmado da auditoria anterior).
4. **Stop amarrado a ATR**, não valor fixo em dólar.
5. **Breakeven simples** pós-entrada.
6. **Teto de exposição agregada** entre posições simultâneas.
7. **Blackout simples de notícias de alto impacto.**
8. Decisão de identidade: scalping vs. tendência (Seção 8) — não é
   urgente corrigir, mas é urgente **decidir**, porque orienta todos os
   itens acima.

Nada aqui foi alterado no código. É a lista que eu levaria pra discussão
de domingo se fosse minha própria banca em jogo.
