function historicoView() {
  return `
    <div class="card">
      <div id="historicoHeader" style="position:sticky; top:0; z-index:999; background:#081733; padding-bottom:10px;">
        <div class="card-title">Histórico de Sinais</div>
        <div id="historicoModoToggle" style="margin-bottom:10px;"></div>
        <div id="historicoStats" style="margin-bottom:15px;">Carregando estatísticas...</div>
      </div>
      <div id="historicoLista">Carregando histórico...</div>
      <div id="historicoComparacao" style="display:none;"></div>
    </div>
    <div id="barraComparacao" style="display:none; position:fixed; left:12px; right:12px; bottom:64px; z-index:1000; background:#132852; border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:10px 14px; align-items:center; justify-content:space-between; gap:10px; box-shadow:0 4px 14px rgba(0,0,0,.4);">
      <span id="barraComparacaoTexto" style="font-size:12px; color:#e0e6f5;"></span>
      <div style="display:flex; gap:8px;">
        <button onclick="limparSelecaoComparacao()" style="padding:6px 10px; border:none; border-radius:8px; background:rgba(255,255,255,.08); color:#e0e6f5; font-size:12px; cursor:pointer;">Limpar</button>
        <button onclick="abrirComparacao()" style="padding:6px 12px; border:none; border-radius:8px; background:#4fc3f7; color:#081733; font-weight:bold; font-size:12px; cursor:pointer;">Comparar</button>
      </div>
    </div>
  `;
}

// AJUSTE-011 (24/09/2026): usuário notou preços de entrada com
// quantidade de casas decimais inconsistente entre sinais (ex:
// "179,75494" num par JPY) - a causa é que o preço bruto vem da
// TwelveData sem nenhum arredondamento aplicado na exibição, cada
// sinal com quantas casas o candle daquele ciclo trouxe. Convenção
// real do mercado Forex (já usada internamente por
// scripts/moneyManager.js pra calcular pip: `tamanhoPip = ehJPY ?
// 0.01 : 0.0001`): pares com JPY cotam com 3 casas decimais (o pip é
// a 2ª casa, a 3ª é a "pipette" - fração de pip); pares sem JPY cotam
// com 5 (o pip é a 4ª casa, a 5ª é a pipette). Esta função centraliza
// essa regra - antes só existia localizada dentro de
// renderizarCaminhoPrecos() (ver uso abaixo), duplicada se cada lugar
// decidisse formatar do seu jeito.
function formatarPrecoPar(valor, par) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "--";
  const casasDecimais = String(par || "").includes("JPY") ? 3 : 5;
  return numero.toFixed(casasDecimais);
}

// AJUSTE-017 (24/09/2026): cópia deliberada, só das duas fórmulas
// SEGURAS de calcularValorPip() (scripts/moneyManager.js) - a mesma
// função que scripts/checker.js usa pra calcular o resultado
// financeiro de todo fechamento AUTOMÁTICO, a partir de entrada/
// saída/lote. Usuário perguntou, com razão, por que o fechamento
// manual não fazia a mesma conta - a resposta é que dá, PARA a
// maioria dos pares, com uma ressalva real: pares cruzados (nem base
// nem cotação é USD - EUR/JPY, GBP/JPY, EUR/GBP) precisam de uma
// cotação cruzada contra USD que só o backend busca (a chave da
// TwelveData nunca é exposta no navegador, por segurança) e que nunca
// fica salva no documento pra reaproveitar depois - por isso essa
// cópia retorna `null` nesse caso, propositalmente, em vez de arris-
// car um número errado. Retorna valor em USD por pip (não por operação
// - calcularResultadoManual(), logo abaixo, multiplica pelos pips
// percorridos).
function calcularValorPipCliente(lote, par, precoAtual) {

  const numLote = Number(lote);
  const numPreco = Number(precoAtual);

  if (!Number.isFinite(numLote) || !Number.isFinite(numPreco) || numPreco <= 0) {
    return null;
  }

  const ehJPY = String(par || "").includes("JPY");
  const tamanhoPip = ehJPY ? 0.01 : 0.0001;
  const tamanhoLotePadrao = 100000;

  const [moedaBase, moedaCotacao] = String(par || "").split("/");

  // USD como moeda base (ex.: USD/JPY, USD/CAD) - pip nasce na moeda
  // de cotação, converte dividindo pelo preço atual.
  if (moedaBase === "USD") {
    return (tamanhoPip * tamanhoLotePadrao * numLote) / numPreco;
  }

  // USD como moeda de cotação (ex.: EUR/USD, AUD/USD) - pip já nasce
  // em USD.
  if (moedaCotacao === "USD") {
    return tamanhoPip * tamanhoLotePadrao * numLote;
  }

  // Par cruzado - não dá pra calcular com segurança aqui (ver
  // comentário acima).
  return null;

}

// Pips percorridos entre entrada e saída, já considerando a direção
// (BUY: saída > entrada é favorável; SELL: o inverso) - mesma
// convenção de scripts/checker.js/js/checker.js.
function calcularPipsCliente(par, precoEntrada, precoSaida, direcao) {

  const ehJPY = String(par || "").includes("JPY");
  const tamanhoPip = ehJPY ? 0.01 : 0.0001;

  const diferenca = Number(precoSaida) - Number(precoEntrada);

  const pips = diferenca / tamanhoPip;

  return direcao === "SELL" ? -pips : pips;

}

// Retorna o resultado financeiro estimado (USD) a partir de entrada/
// saída/lote/par/direção, ou `null` se o par for cruzado (sem como
// calcular com segurança no navegador - ver calcularValorPipCliente).
function calcularResultadoManual(par, precoEntrada, precoSaida, direcao, lote) {

  if (![precoEntrada, precoSaida, lote].every(Number.isFinite)) return null;

  const valorPip = calcularValorPipCliente(lote, par, precoSaida);

  if (valorPip == null) return null;

  const pips = calcularPipsCliente(par, precoEntrada, precoSaida, direcao);

  return Number((pips * valorPip).toFixed(2));

}

// Item 1 do pedido do usuário (11/09/2026): comparar sinais do mesmo par
// lado a lado, usando só os campos que já existem no documento (o
// checker.js já grava precoAtual/precoMaximo/precoMinimo/maxPipsFavor/
// maxPipsContra/resultadoFinanceiro a cada ciclo, tanto pra sinais
// ABERTA quanto ENCERRADA - nenhuma captura nova precisou ser criada).
// Seleção livre (sem limite), restrita ao mesmo par, numa seção nova
// dentro do próprio Histórico (não modal) pra caber melhor girando o
// celular (tabela com overflow-x:auto).
const sinaisComparacaoSelecionados = new Set();
let cacheSinaisHistorico = {};

function atualizarBarraComparacao() {
  const barra = document.getElementById("barraComparacao");
  if (!barra) return;

  const total = sinaisComparacaoSelecionados.size;

  if (total === 0) {
    barra.style.display = "none";
    return;
  }

  barra.style.display = "flex";
  document.getElementById("barraComparacaoTexto").innerHTML =
    `${total} selecionado${total > 1 ? "s" : ""}`;
}

function alternarSelecaoComparacao(checkbox, id) {
  const par = checkbox.dataset.par;

  if (checkbox.checked) {

    const paresJaSelecionados = new Set(
      [...sinaisComparacaoSelecionados]
        .map((idSelecionado) => cacheSinaisHistorico[idSelecionado]?.sinal.par)
        .filter(Boolean)
    );

    if (paresJaSelecionados.size > 0 && !paresJaSelecionados.has(par)) {
      alert(
        `Só é possível comparar sinais do mesmo par. Você já tem ${[...paresJaSelecionados][0]} ` +
        `selecionado - desmarque antes de escolher um ${par}.`
      );
      checkbox.checked = false;
      return;
    }

    sinaisComparacaoSelecionados.add(id);

  } else {

    sinaisComparacaoSelecionados.delete(id);

  }

  atualizarBarraComparacao();
}

function limparSelecaoComparacao() {
  sinaisComparacaoSelecionados.clear();
  document.querySelectorAll(".chk-comparar").forEach((el) => (el.checked = false));
  atualizarBarraComparacao();
  fecharComparacao();
}

function fecharComparacao() {
  const comparacao = document.getElementById("historicoComparacao");
  const lista = document.getElementById("historicoLista");
  const stats = document.getElementById("historicoStats");

  if (comparacao) comparacao.style.display = "none";
  if (lista) lista.style.display = "block";
  if (stats) stats.style.display = "block";

  atualizarBarraComparacao();
}

// A dica de rotação só faz sentido quando a tabela realmente não cabe
// na tela - sem essa checagem, ela continuava aparecendo mesmo depois
// de girar o celular (ou expandir) e a tabela já caber inteira.
// Função de módulo (não mais fechada dentro de abrirComparacao) pra
// poder ser chamada também por alternarExpandirComparacao() e pelo
// listener de resize.
function reavaliarDicaGirar() {
  const wrapper = document.getElementById("comparacaoScrollWrapper");
  const dica = document.getElementById("comparacaoDicaGirar");
  if (wrapper && dica) {
    dica.style.display = wrapper.scrollWidth > wrapper.clientWidth ? "block" : "none";
  }
}

// Usuário pediu um equivalente, pro computador, do "gire o celular" -
// no desktop não existe rotação física, então isso vira um botão
// manual: expande a seção de comparação pra tela cheia (position:fixed
// cobrindo a viewport), ganhando toda a largura disponível sem
// depender da janela do navegador estar larga o bastante. Funciona
// igual em qualquer dispositivo - reduz também a dependência da
// rotação real do celular (que teve comportamento inconsistente em
// teste real, ver ENGINEERING.md).
function alternarExpandirComparacao() {
  const comparacao = document.getElementById("historicoComparacao");
  const btn = document.getElementById("btnExpandirComparacao");
  if (!comparacao) return;

  const expandido = comparacao.dataset.expandido === "true";

  if (expandido) {
    comparacao.style.position = "";
    comparacao.style.inset = "";
    comparacao.style.zIndex = "";
    comparacao.style.background = "";
    comparacao.style.overflow = "";
    comparacao.style.padding = "";
    comparacao.dataset.expandido = "false";
    if (btn) btn.innerHTML = "⤢ Expandir";
  } else {
    comparacao.style.position = "fixed";
    comparacao.style.inset = "0";
    comparacao.style.zIndex = "2000";
    comparacao.style.background = "#081733";
    comparacao.style.overflow = "auto";
    comparacao.style.padding = "16px";
    comparacao.dataset.expandido = "true";
    if (btn) btn.innerHTML = "⤡ Recolher";
  }

  reavaliarDicaGirar();
}

function abrirComparacao() {
  const sinais = [...sinaisComparacaoSelecionados]
    .map((id) => cacheSinaisHistorico[id])
    .filter(Boolean)
    .sort((a, b) => (b.dataObj?.getTime() || 0) - (a.dataObj?.getTime() || 0));

  if (sinais.length < 2) {
    alert("Selecione pelo menos 2 sinais do mesmo par pra comparar.");
    return;
  }

  const comparacao = document.getElementById("historicoComparacao");
  const lista = document.getElementById("historicoLista");
  const stats = document.getElementById("historicoStats");
  if (!comparacao) return;

  // Reseta qualquer estado de "expandido" deixado de uma comparação
  // anterior - o innerHTML é reconstruído abaixo, mas o próprio
  // elemento `comparacao` (e seu style/dataset inline) persiste entre
  // aberturas.
  comparacao.removeAttribute("style");
  comparacao.dataset.expandido = "false";

  const par = sinais[0].sinal.par;

  const linhas = sinais.map(({ sinal, dataObj }) => {
    const horario = dataObj
      ? dataObj.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }).substring(0, 17)
      : "--";

    const statusLabel =
      sinal.resultado === "WIN" ? "✅ WIN"
      : sinal.resultado === "LOSS" ? "❌ LOSS"
      : "⏳ PENDENTE";

    const usd = sinal.resultadoFinanceiro;
    const usdFormatado = usd == null ? "--" : `${usd >= 0 ? "+" : "-"}$${Math.abs(Number(usd)).toFixed(2)}`;

    // AJUSTE-002 (17/09/2026): a cor era decidida só pelo SINAL do
    // número (usd >= 0), independente do rótulo WIN/LOSS - as duas
    // lógicas podiam discordar (ex.: um sinal que fechou por SL_PIPS
    // pode registrar um resultadoFinanceiro final positivo por
    // coincidência de onde a vela fechou, mesmo o resultado sendo
    // LOSS de verdade - usuário reportou ver "+$0,74" em verde do lado
    // de um "❌ LOSS", com razão pra estranhar). Pra um sinal já
    // ENCERRADA, a cor agora segue o resultado (fonte da verdade de
    // WIN/LOSS), nunca o sinal do número. Só usa o sinal do número
    // pra sinal ainda PENDENTE, onde é legitimamente um P&L flutuante
    // em tempo real, sem resultado definido ainda.
    const usdCor = usd == null
        ? "#fff"
        : sinal.resultado === "WIN" ? "#00d26a"
        : sinal.resultado === "LOSS" ? "#ff5252"
        : (usd >= 0 ? "#00d26a" : "#ff5252");

    return `
      <tr>
        <td style="padding:8px; white-space:nowrap;">${horario}</td>
        <td style="padding:8px; white-space:nowrap;">${(sinal.direcao || "-").replace("CALL", "COMPRA").replace("PUT", "VENDA").replace("BUY", "COMPRA").replace("SELL", "VENDA")}</td>
        <td style="padding:8px; white-space:nowrap;">${statusLabel}</td>
        <td style="padding:8px; text-align:right;">${formatarPrecoPar(sinal.precoEntrada, sinal.par)}</td>
        <td style="padding:8px; text-align:right;">${sinal.precoAtual ?? "--"}</td>
        <td style="padding:8px; text-align:right; color:#00d26a;">${sinal.maxPipsFavor != null ? Number(sinal.maxPipsFavor).toFixed(1) : "--"}</td>
        <td style="padding:8px; text-align:right; color:#ff5252;">${sinal.maxPipsContra != null ? Number(sinal.maxPipsContra).toFixed(1) : "--"}</td>
        <td style="padding:8px; text-align:right; font-weight:bold; color:${usdCor};">${usdFormatado}</td>
      </tr>
    `;
  }).join("");

  comparacao.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;">
      <div style="font-weight:bold; font-size:14px;">🔍 Comparando ${sinais.length} sinais - ${par}</div>
      <div style="display:flex; gap:8px; flex-shrink:0;">
        <button id="btnExpandirComparacao" onclick="alternarExpandirComparacao()" style="padding:6px 10px; border:none; border-radius:8px; background:rgba(79,195,247,.15); color:#9adcf9; font-size:12px; cursor:pointer;">⤢ Expandir</button>
        <button onclick="fecharComparacao()" style="padding:6px 10px; border:none; border-radius:8px; background:rgba(255,255,255,.08); color:#e0e6f5; font-size:12px; cursor:pointer;">← Voltar</button>
      </div>
    </div>
    <div id="comparacaoScrollWrapper" style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
      <table style="border-collapse:collapse; width:100%; min-width:520px; font-size:12px;">
        <thead>
          <tr style="background:rgba(255,255,255,.06); text-align:left;">
            <th style="padding:8px;">Horário</th>
            <th style="padding:8px;">Direção</th>
            <th style="padding:8px;">Status</th>
            <th style="padding:8px; text-align:right;">Entrada</th>
            <th style="padding:8px; text-align:right;">Atual</th>
            <th style="padding:8px; text-align:right;">Favor</th>
            <th style="padding:8px; text-align:right;">Contra</th>
            <th style="padding:8px; text-align:right;">USD</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
    </div>
    <div id="comparacaoDicaGirar" style="display:none; font-size:10px; color:#8c95b3; margin-top:8px; text-align:center;">
      Gire o celular ou toque em "⤢ Expandir" pra ver a tabela inteira mais confortável.
    </div>
  `;

  if (lista) lista.style.display = "none";
  if (stats) stats.style.display = "none";
  comparacao.style.display = "block";

  const barra = document.getElementById("barraComparacao");
  if (barra) barra.style.display = "none";

  // Reavaliada de novo a cada resize (rotação do celular, ou a janela
  // do navegador sendo redimensionada) enquanto a comparação estiver
  // aberta - listener antigo removido antes pra não empilhar um por
  // comparação aberta.
  if (window._removerListenerDicaGirar) window._removerListenerDicaGirar();
  window.addEventListener("resize", reavaliarDicaGirar);
  window._removerListenerDicaGirar = () => window.removeEventListener("resize", reavaliarDicaGirar);

  reavaliarDicaGirar();
}

// Gerenciar estado de sinais abertos com persistência blindada
function obterSinaisAbertos() {
  try {
    const stored = localStorage.getItem('sinaisAbertos');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Erro ao obter sinais abertos:", e);
    return [];
  }
}

function salvarSinalAberto(sinalId) {
  try {
    const abertos = obterSinaisAbertos();
    if (!abertos.includes(sinalId)) {
      abertos.push(sinalId);
      localStorage.setItem('sinaisAbertos', JSON.stringify(abertos));
    }
  } catch (e) {
    console.error("Erro ao salvar sinal aberto:", e);
  }
}

function removerSinalAberto(sinalId) {
  try {
    const abertos = obterSinaisAbertos();
    const index = abertos.indexOf(sinalId);
    if (index > -1) {
      abertos.splice(index, 1);
      localStorage.setItem('sinaisAbertos', JSON.stringify(abertos));
    }
  } catch (e) {
    console.error("Erro ao remover sinal aberto:", e);
  }
}

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Usuário pediu pra deixar claro, no detalhe do sinal, quando lote/TP/SL
// não são o valor configurado manualmente na tela de Config, e sim um
// ajuste automático do decidirConfiguracaoMercado() (scripts/moneyManager.js).
// sinal.financeiro.decisaoMercado.decisao guarda o motivo do ajuste (ou
// "MANTER" quando nada foi alterado).
const LEGENDA_AJUSTE_MERCADO = {
  REDUZIR_EXPOSICAO: "ADX fraco - tendência sem força suficiente",
  MERCADO_LENTO: "baixa volatilidade (ATR baixo)",
  EXPECTATIVA_NEGATIVA: "expectativa histórica negativa reduziu o lote"
};

// Usuário pediu pra poder ver o movimento completo do preço, da
// entrada até o encerramento - js/checker.js's amostrarCaminhoPrecos()
// grava sinal.caminhoPrecos (até 300 pontos {t,c}) no fechamento. SVG
// inline, sem biblioteca externa (mesma filosofia vanilla-JS do resto
// do app) - uma polyline simples, com uma linha tracejada marcando o
// preço de entrada como referência.
function renderizarCaminhoPrecos(sinal) {

  const caminho = sinal.caminhoPrecos;

  if (!Array.isArray(caminho) || caminho.length < 2) return "";

  const closes = caminho.map(p => p.c);
  const entrada = Number(sinal.precoEntrada);
  const valores = Number.isFinite(entrada) ? [...closes, entrada] : closes;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = (max - min) || 1;

  const largura = 300;
  const altura = 90;
  const pad = 6;

  // AJUSTE-011: reusa formatarPrecoPar() (topo do arquivo) em vez de
  // duplicar a regra JPY=3/outros=5 aqui.
  const formatarPreco = (v) => formatarPrecoPar(v, sinal.par);

  const pontos = caminho.map((p, i) => {
    const x = pad + (i / (caminho.length - 1)) * (largura - pad * 2);
    const y = altura - pad - ((p.c - min) / span) * (altura - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const corLinha = sinal.resultado === "WIN"
    ? "#00d26a"
    : sinal.resultado === "LOSS"
      ? "#ff5252"
      : "#4fc3f7";

  const yEntrada = (altura - pad - ((entrada - min) / span) * (altura - pad * 2)).toFixed(1);

  const linhaEntrada = Number.isFinite(entrada)
    ? `<line x1="0" y1="${yEntrada}" x2="${largura}" y2="${yEntrada}" stroke="#8c95b3" stroke-width="1" stroke-dasharray="4,3" />`
    : "";

  // Régua de preço (Máx/Mín no início e no fim do gráfico) - pedido do
  // usuário, feito primeiro como <text> DENTRO do SVG (ver ENGINEERING.md,
  // FEATURE-018). Bug real encontrado depois no celular de verdade
  // (print do usuário, 12/09/2026): o SVG usa preserveAspectRatio="none"
  // pra esticar o polyline e preencher a largura toda do card, não
  // importa a largura real do container - em retrato isso é um esticão
  // pequeno (~1.2x), mas em paisagem no celular a largura real do
  // container é MUITO maior que os 300 do viewBox (~6-7x) - <text>
  // dentro do SVG estica junto (só X, preserveAspectRatio="none" não
  // escala X e Y igual), cortando os números na borda. <line>/
  // <polyline> não têm esse problema (só ficam um pouco mais "compridos"
  // visualmente, sem cortar nada) - por isso a régua virou 4 <div>
  // HTML posicionados por cima do SVG (fora do sistema de coordenadas
  // dele, imune a esse esticão) e a linha/polyline continuam exatamente
  // como estavam.
  return `
    <div style="margin:14px 0;">
      <div style="font-weight:bold; color:#9aa4b5; margin-bottom:8px;">
        📈 Movimento do Preço (entrada → encerramento)
      </div>
      <div style="position:relative;">
        <svg viewBox="0 0 ${largura} ${altura}" preserveAspectRatio="none" style="width:100%; height:90px; display:block; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px;">
          ${linhaEntrada}
          <polyline points="${pontos}" fill="none" stroke="${corLinha}" stroke-width="2" />
        </svg>
        <div style="position:absolute; top:3px; left:5px; font-size:10px; color:#8c95b3;">${formatarPreco(max)}</div>
        <div style="position:absolute; top:3px; right:5px; font-size:10px; color:#8c95b3;">${formatarPreco(max)}</div>
        <div style="position:absolute; bottom:3px; left:5px; font-size:10px; color:#8c95b3;">${formatarPreco(min)}</div>
        <div style="position:absolute; bottom:3px; right:5px; font-size:10px; color:#8c95b3;">${formatarPreco(min)}</div>
      </div>
      <div style="font-size:10px; color:#8c95b3; margin-top:4px; text-align:center;">
        linha tracejada = preço de entrada
      </div>
    </div>
  `;

}

// AJUSTE-007 (24/09/2026): mostra o order block (SMC) que influenciou
// o score deste sinal, quando houve um - scripts/pairAnalyzer.js só
// passou a persistir smcDetectado/smcScore no documento salvo a
// partir desta mudança (existiam desde o MUD-05, 17/09/2026, mas só
// afetavam o score, nunca ficavam visíveis depois de salvo). Sinais
// salvos ANTES desta mudança, ou com a flag smcAtivo desligada, ou
// sem nenhum order block relevante detectado no momento, não têm
// `smcDetectado` - não renderiza nada nesses casos, não é erro.
function bannerSMC(sinal) {

  if (!sinal.smcDetectado) return "";

  const { direcao, naZona } = sinal.smcDetectado;

  const score = Number(sinal.smcScore) || 0;

  const corFundo = score > 0
    ? "rgba(0,210,106,.10)"
    : score < 0
    ? "rgba(255,82,82,.10)"
    : "rgba(255,255,255,.04)";

  const corBorda = score > 0
    ? "rgba(0,210,106,.3)"
    : score < 0
    ? "rgba(255,82,82,.3)"
    : "rgba(255,255,255,.08)";

  const corTexto = score > 0
    ? "#8fd6b0"
    : score < 0
    ? "#ff9e9e"
    : "#8c95b3";

  const sinalScore = score > 0 ? "+" : "";

  return `
    <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:${corFundo}; border:1px solid ${corBorda}; font-size:11px; color:${corTexto};">
      🧠 SMC: Order Block de ${direcao} detectado${naZona ? " (preço na zona)" : " (fora da zona)"}${score !== 0 ? ` — ${sinalScore}${score} no score` : ""}
    </div>
  `;

}

// AJUSTE-008 (24/09/2026): botão só aparece em operação ainda
// PENDENTE (sem `resultado` gravado) - depois de fechada, o único
// jeito de mudar o resultado é `alternarOperacaoReal` (que já existe,
// mas só liga/desliga se conta pra Conta Real, nunca reescreve o
// resultado em si).
function botaoFecharManualmente(sinal, docId) {

  if (sinal.resultado) return "";

  return `
    <div id="areaFecharManual-${docId}" style="margin-bottom:10px; text-align:center;">
      <button
        onclick="event.stopPropagation(); ativarEdicaoFechamentoManual('${docId}')"
        style="padding:6px 12px; border:none; border-radius:8px; background:rgba(255,255,255,.08); color:#e0e6f5; font-size:11px; cursor:pointer;"
      >
        🔒 Fechei Manualmente na Corretora
      </button>
      <div style="font-size:10px; color:#8c95b3; margin-top:4px;">
        Libera os campos ENTRADA/SAÍDA acima pra editar com o preço real
        da corretora, em vez de esperar o TP/SL automático bater.
      </div>
    </div>
  `;

}

// AJUSTE-015 (24/09/2026): redesenho do fechamento manual (AJUSTE-008)
// - antes usava prompt()/confirm() nativos só pedindo o resultado em
// USD; usuário pediu pra em vez disso liberar os próprios campos
// ENTRADA/SAÍDA (miniCard com id, ver construirDetalheSinal) pra
// edição in-line, com o preço real que ele lê na corretora (XM),
// mantendo o campo de resultado financeiro como confirmação final.
// Troca o botão "Fechei Manualmente" por um mini-formulário no lugar
// (mesmo container `areaFecharManual-`), sem abrir tela nova.
// AJUSTE-017 (24/09/2026): usuário perguntou, com razão, por que o
// fechamento automático calcula o resultado financeiro sozinho
// (checker.js, a partir de entrada/saída/lote) e o manual não -
// resposta: pra pares SEM cruzamento (moeda base ou cotação é USD),
// dá sim pra calcular no navegador com segurança (mesma fórmula do
// backend, validada 1:1 contra ela - ver
// validate-ajuste017-calculo-manual.js). O campo de resultado agora é
// pré-preenchido automaticamente e recalcula ao vivo enquanto o
// usuário edita entrada/saída - continua editável, pra ele revisar/
// corrigir antes de confirmar. Só pares cruzados (EUR/JPY, GBP/JPY,
// EUR/GBP) continuam pedindo o valor manual, com aviso explícito do
// motivo (ver calcularValorPipCliente).
window.ativarEdicaoFechamentoManual = function (docId) {

  const cache = cacheSinaisHistorico[docId];
  const sinal = cache ? cache.sinal : {};

  const elEntrada = document.getElementById(`valorEntrada-${docId}`);
  const elSaida = document.getElementById(`valorSaida-${docId}`);
  const elArea = document.getElementById(`areaFecharManual-${docId}`);

  const estiloInput =
    "width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.2); " +
    "border-radius:4px; color:#fff; font-size:13px; text-align:center; padding:3px; box-sizing:border-box;";

  if (elEntrada) {
    elEntrada.outerHTML =
      `<input type="number" step="any" id="valorEntrada-${docId}" oninput="recalcularResultadoManual('${docId}')" value="${sinal.precoEntrada ?? ""}" style="${estiloInput}">`;
  }

  if (elSaida) {
    const saidaAtual = sinal.precoSaida ?? sinal.precoFechamento ?? sinal.precoEntrada ?? "";
    elSaida.outerHTML =
      `<input type="number" step="any" id="valorSaida-${docId}" oninput="recalcularResultadoManual('${docId}')" value="${saidaAtual}" style="${estiloInput}">`;
  }

  // Par cruzado é fixo (não muda com entrada/saída) - decide de uma
  // vez o texto do aviso, testando com um preço qualquer só pra saber
  // se a fórmula recusa (null) ou não.
  const ehCruzado = calcularValorPipCliente(sinal.lote, sinal.par, 1) == null;

  if (elArea) {
    elArea.innerHTML = `
      <div style="background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:8px; margin-top:4px;">
        <div id="avisoCalculoManual-${docId}" style="font-size:10px; color:#999; margin-bottom:4px;">
          RESULTADO FINANCEIRO REAL (USD, negativo pra prejuízo)
          ${ehCruzado
            ? " - par cruzado, calcule fora e informe (precisa de cotação que só o servidor busca)"
            : " - calculado automaticamente a partir de entrada/saída, revise antes de confirmar"}
        </div>
        <input
          type="number"
          step="any"
          id="inputResultadoManual-${docId}"
          placeholder="ex: 3 ou -4.5"
          style="${estiloInput} margin-bottom:6px; padding:5px;"
        >
        <div style="display:flex; gap:8px;">
          <button
            onclick="event.stopPropagation(); confirmarFechamentoManual('${docId}')"
            style="flex:1; padding:6px; border:none; border-radius:6px; background:#1f8a4c; color:#fff; font-size:12px; cursor:pointer;"
          >
            ✅ Confirmar
          </button>
          <button
            onclick="event.stopPropagation(); carregarHistorico();"
            style="flex:1; padding:6px; border:none; border-radius:6px; background:rgba(255,255,255,.08); color:#e0e6f5; font-size:12px; cursor:pointer;"
          >
            Cancelar
          </button>
        </div>
      </div>
    `;
  }

  // Já calcula uma vez com os valores pré-preenchidos, sem esperar o
  // usuário digitar nada.
  recalcularResultadoManual(docId);

};

// Chamado a cada edição de entrada/saída (oninput) - recalcula e
// pré-preenche o campo de resultado, quando o par permite (ver
// calcularResultadoManual). Nunca sobrescreve silenciosamente sem o
// usuário perceber: o campo continua um <input> normal, editável por
// cima do valor sugerido.
window.recalcularResultadoManual = function (docId) {

  const cache = cacheSinaisHistorico[docId];
  const sinal = cache ? cache.sinal : {};

  const inputEntrada = document.getElementById(`valorEntrada-${docId}`);
  const inputSaida = document.getElementById(`valorSaida-${docId}`);
  const inputResultado = document.getElementById(`inputResultadoManual-${docId}`);

  if (!inputEntrada || !inputSaida || !inputResultado) return;

  const resultado = calcularResultadoManual(
    sinal.par,
    Number(inputEntrada.value),
    Number(inputSaida.value),
    sinal.direcao,
    sinal.lote
  );

  if (resultado != null) {
    inputResultado.value = resultado;
  }

};

// AJUSTE-015: mesma disciplina do AJUSTE-008 (motivoEncerramento
// distinto, Conta Simulada sempre acompanha, Conta Real fica separada
// no checkbox de sempre) - só a origem dos dados mudou, de prompt()
// pros campos in-line ativados por ativarEdicaoFechamentoManual()
// acima. precoEntrada/precoSaida só são gravados se o usuário de fato
// os editou (Number.isFinite) - não sobrescreve com lixo se o campo
// ficou vazio por algum motivo.
window.confirmarFechamentoManual = async function (docId) {

  const inputEntrada = document.getElementById(`valorEntrada-${docId}`);
  const inputSaida = document.getElementById(`valorSaida-${docId}`);
  const inputResultado = document.getElementById(`inputResultadoManual-${docId}`);

  const precoEntrada = Number(inputEntrada?.value);
  const precoSaida = Number(inputSaida?.value);
  const resultadoFinanceiro = Number(inputResultado?.value);

  if (!Number.isFinite(resultadoFinanceiro)) {
    alert("Informe o resultado financeiro real (USD) - valor inválido.");
    return;
  }

  const db = firebase.firestore();

  const docRef = db.collection("historico").doc(docId);

  const doc = await docRef.get();

  const sinal = doc.data();

  if (!sinal || sinal.resultado) {
    alert("Essa operação já está encerrada - não é possível fechar de novo.");
    carregarHistorico();
    return;
  }

  const resultado = resultadoFinanceiro >= 0 ? "WIN" : "LOSS";

  const confirmado = confirm(
    `Confirma o fechamento MANUAL de ${sinal.par} (${sinal.direcao}) com ` +
    `resultado ${resultado} de $${resultadoFinanceiro.toFixed(2)}? Essa operação ` +
    `vai contar no histórico/estatísticas com esse resultado - não dá pra ` +
    `desfazer pela tela depois.`
  );

  if (!confirmado) return;

  const configRef = db.collection("configuracoes").doc("geral");

  const configDoc = await configRef.get();

  const config = configDoc.exists ? configDoc.data() : {};

  const saldoAntes =
    Number(config.saldoSimulado ?? config.saldoInicial ?? 0);

  const saldoDepois =
    Number((saldoAntes + resultadoFinanceiro).toFixed(2));

  const atualizacao = {

    status: "ENCERRADA",

    resultado,

    resultadoFinanceiro: Number(resultadoFinanceiro.toFixed(2)),

    saldoAntes,

    saldoDepois,

    motivoEncerramento: "MANUAL_CORRETORA",

    fechadoManualmente: true,

    fimOperacao: Date.now()

  };

  if (Number.isFinite(precoEntrada)) atualizacao.precoEntrada = precoEntrada;

  if (Number.isFinite(precoSaida)) {
    atualizacao.precoSaida = precoSaida;
    atualizacao.precoFechamento = precoSaida;
  }

  await docRef.update(atualizacao);

  await configRef.update({

    saldoSimulado: saldoDepois

  });

  carregarHistorico();

};

function bannerConfiguracaoAjustada(sinal) {

  const decisao = sinal.financeiro?.decisaoMercado?.decisao;

  if (!decisao || decisao === "MANTER") {
    return `
      <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:rgba(0,210,106,.08); border:1px solid rgba(0,210,106,.25); font-size:11px; color:#8fd6b0;">
        ✅ Lote/TP/SL conforme configurado na tela de Config - sem ajuste automático.
      </div>
    `;
  }

  const motivo = LEGENDA_AJUSTE_MERCADO[decisao] || decisao;

  return `
    <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:rgba(79,195,247,.10); border:1px solid rgba(79,195,247,.3); font-size:11px; color:#9adcf9;">
      🤖 Lote/TP/SL ajustados automaticamente pelo sistema (${motivo}) - não é o valor bruto configurado manualmente.
    </div>
  `;

}

// AJUSTE-019 (24/09/2026): rótulo de qual janela admitiu o par -
// campo novo (janelaOrigem), sinais salvos antes desta data não têm
// esse campo (fica null/undefined, parte do banner não aparece).
const LEGENDA_JANELA_ORIGEM = {
  asia: "🌏 Ásia (21:00–04:00, incondicional pra JPY/AUD/NZD - independe do modo selecionado)",
  londres: "🇬🇧 Londres (04:00–13:00)",
  novaYork: "🇺🇸 Nova York (10:00–19:00)",
  personalizado: "⚙️ Personalizado (janela única configurada)"
};

// AJUSTE-019c (24/09/2026): perfil (AGRESSIVO/BALANCEADO/CONSERVADOR)
// já era persistido em cada sinal desde o PENTE-FINO-001 (10/09/2026),
// só nunca tinha sido exibido na tela - pedido explícito do usuário
// depois da dúvida sobre a janela: "quero saber se o sinal foi gerado
// em modo agressivo, balanceado ou conservador". Mesmos emojis da
// tela de Config (PERFIS_OPERACIONAIS).
const LEGENDA_PERFIL = {
  AGRESSIVO: "🟢 Agressivo",
  BALANCEADO: "🔵 Balanceado",
  CONSERVADOR: "🟡 Conservador"
};

function bannerOrigemSinal(sinal) {

  const perfilLabel = LEGENDA_PERFIL[sinal.perfil] || null;
  const janelaLabel = LEGENDA_JANELA_ORIGEM[sinal.janelaOrigem] || null;

  if (!perfilLabel && !janelaLabel) return "";

  const linhas = [
    perfilLabel ? `Perfil: ${perfilLabel}` : null,
    janelaLabel ? `Janela: ${janelaLabel}` : null
  ].filter(Boolean).join(" · ");

  return `
    <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:rgba(140,149,179,.10); border:1px solid rgba(140,149,179,.3); font-size:11px; color:#b8c0d8;">
      🕐 Gerado em: ${linhas}
    </div>
  `;

}

// "DD/MM/YYYY" -> "MM/YYYY" (chave de ordenação/agrupamento por mês).
// "Data Indefinida" fica isolada no próprio grupo, no fim da lista.
function mesChaveDe(dataStr) {
  if (dataStr === "Data Indefinida") return "0000/00";
  const [, mm, aaaa] = dataStr.split("/");
  return `${aaaa}/${mm}`;
}

function mesLabelDe(dataStr) {
  if (dataStr === "Data Indefinida") return "Data Indefinida";
  const [, mm, aaaa] = dataStr.split("/");
  return `${NOMES_MES[Number(mm) - 1]} ${aaaa}`;
}

// AJUSTE-010 (24/09/2026): tabela (colunas Horário/Par/Direção/Tempo/
// Resultado/Favor/Contra/Resultado Financeiro/Operação Real/Cmp) passa
// a ser o modo PADRÃO sempre, não só girando o celular pra paisagem -
// pedido do usuário depois de comparar as duas telas ("muita
// informação de comparativo, precisa estar tudo num campo visual",
// rolagem excessiva no modo card). Isso também resolve de raiz o
// pedido anterior (AJUSTE-008) de "virar a tela e já ficar em lista
// sozinho" - se a tabela já é sempre o modo ativo, não existe mais
// nada pra trocar na rotação. Por isso a detecção de orientação
// inteira (matchMedia + fallbacks de resize/screen.orientation do
// AJUSTE-008) foi removida - forçaria de volta pro card em telas
// retrato, brigando com o novo padrão. Botão manual continua existindo
// pra quem quiser voltar pro modo card em algum momento.
let modoTabela = true;

// AJUSTE-012 (24/09/2026): usuário reportou que a tela demorava ~30s
// sempre que abria/atualizava (não só na primeira vez - descartando
// hospedagem/cold-start como causa) - achado real: carregarHistorico()
// buscava até 300 documentos INTEIROS do Firestore (cada um com
// indicadores/estatísticas/financeiro/caminhoPrecos aninhados) toda
// vez, e como a última aba visitada fica salva (localStorage), um
// refresh comum recarregava direto nessa busca pesada. Pedido do
// usuário: carregar só hoje e ontem por padrão; dias mais antigos só
// sob demanda, clicando em "Carregar mais". `diasCarregados` começa
// em 2 (hoje+ontem) e cresce +1 a cada clique - variável de módulo,
// mesma vida útil de `modoTabela` (persiste entre trocas de aba na
// mesma sessão da página, reseta num reload de verdade, que é
// exatamente o cenário que motivou a mudança).
let diasCarregados = 2;

// Meia-noite em Brasília, N dias atrás, como epoch ms UTC - usado pra
// filtrar o histórico por RANGE de timestamp (`where(">=", ...)`,
// campo único, sem índice composto - mesma cautela de sempre neste
// projeto contra "FAILED_PRECONDITION: requires an index", ver
// riskManager.js). Brasília não tem horário de verão desde 2019
// (GMT-3 fixo), por isso dá pra montar a string ISO com o offset fixo
// direto, sem precisar de biblioteca de fuso horário.
function inicioDiaBrasiliaUTCms(diasAtras) {
  const hojeBrasiliaStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const inicioHoje = new Date(`${hojeBrasiliaStr}T00:00:00-03:00`).getTime();
  return inicioHoje - diasAtras * 24 * 60 * 60 * 1000;
}

// Botão manual - alterna entre tabela (padrão) e card. Sempre
// disponível, independente da orientação/tamanho de tela.
function alternarModoTabela() {
  modoTabela = !modoTabela;
  carregarHistorico();
}

// AJUSTE-012 (24/09/2026): amplia a janela carregada em +1 dia e
// recarrega. Feedback imediato no botão (fica sem clique duplo
// possível enquanto a busca roda) - mesma preocupação de qualquer
// outro botão de ação única deste app (ex.: os de definir saldo em
// js/config.js).
window.carregarMaisHistorico = function () {
  const btn = document.getElementById("btnCarregarMaisHistorico");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "Carregando...";
  }
  diasCarregados += 1;
  carregarHistorico();
};

function atualizarBotaoModoTabela() {
  const el = document.getElementById("historicoModoToggle");
  if (!el) return;
  el.innerHTML = `
    <button onclick="alternarModoTabela()" style="padding:6px 12px; border:none; border-radius:8px; background:rgba(79,195,247,.15); color:#9adcf9; font-size:12px; cursor:pointer;">
      ${modoTabela ? "📋 Ver como lista" : "📊 Ver como tabela"}
    </button>
  `;
}

// "Tempo" - coluna que o usuário viu na referência e achou interessante
// (duração da operação). Sinais já encerrados têm tempoOperacao (ms,
// calculado por js/checker.js no fechamento). Sinais ainda
// ABERTA/COOLDOWN não têm esse campo ainda - calculado aqui como
// "tempo decorrido até agora" a partir de inicioOperacao (mesmo campo
// que checker.js usa pra buscar candles), como uma foto do momento do
// carregamento - não fica contando ao vivo, igual ao resto do app.
function obterTempoOperacaoMs(sinal) {
  if (Number.isFinite(sinal.tempoOperacao)) return sinal.tempoOperacao;
  if (Number.isFinite(sinal.inicioOperacao)) return Date.now() - sinal.inicioOperacao;
  return null;
}

function formatarDuracaoMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "--:--:--";
  const totalSegundos = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSegundos / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, "0");
  const s = String(totalSegundos % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Linha de tabela (modo paisagem/botão) equivalente ao card do modo
// retrato - mesmas colunas da referência que o usuário mandou, mais
// uma coluna extra "Cmp" (comparação, FEATURE-015) já que essa
// seleção precisa continuar acessível nos dois modos. O detalhe rico
// (RSI/EMA/gráfico/Saldo Antes-Depois) é o MESMO construirDetalheSinal()
// usado no card - só muda o container em volta (aqui, uma <tr> com
// colspan em vez do card inteiro) - e o clique pra expandir usa o
// mesmo listener genérico de [data-sinal-id] já existente, sem
// duplicar lógica.
function construirLinhaTabela(sinal, docId, dataObj, isCooldown, borderStyle, detalheHtml) {
  const horario = dataObj
    ? dataObj.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }).substring(0, 5)
    : "--:--";

  const direcaoLabel = (sinal.direcao || "-")
    .replace("CALL", "COMPRA").replace("PUT", "VENDA")
    .replace("BUY", "COMPRA").replace("SELL", "VENDA");

  const tempoLabel = isCooldown ? "--" : formatarDuracaoMs(obterTempoOperacaoMs(sinal));

  const resultadoLabel = isCooldown
    ? "🚫 COOLDOWN"
    : (sinal.resultado === "WIN" ? "✅ WIN" : sinal.resultado === "LOSS" ? "❌ LOSS" : "⏳ PENDENTE");

  const avisoIcone = sinal.avisoRisco?.ativo
    ? `<span title="${String(sinal.avisoRisco.mensagem).replace(/"/g, "&quot;")}"> ⚠️</span>`
    : sinal.avisoExpectativa?.ativo
      ? `<span title="${String(sinal.avisoExpectativa.mensagem).replace(/"/g, "&quot;")}"> 📉</span>`
      : "";

  const usd = sinal.resultadoFinanceiro;
  const usdFormatado = usd == null ? "--" : `${usd >= 0 ? "+" : "-"}$${Math.abs(Number(usd)).toFixed(2)}`;

  // AJUSTE-002 (17/09/2026): mesma correção da tabela de comparação
  // (ver comentário lá) - cor segue o resultado WIN/LOSS pra sinal já
  // ENCERRADA, não o sinal bruto do número. Só usa o sinal do número
  // pra PENDENTE (P&L flutuante em tempo real, sem resultado ainda).
  const usdCor = usd == null
      ? "#fff"
      : sinal.resultado === "WIN" ? "#00d26a"
      : sinal.resultado === "LOSS" ? "#ff5252"
      : (usd >= 0 ? "#00d26a" : "#ff5252");

  // Pedido do usuário (12/09/2026): dá pra ver de relance, olhando a
  // tabela toda, quais operações quase bateram TP ou quase escaparam
  // do SL - mesmos campos maxPipsFavor/maxPipsContra que checker.js já
  // grava (ver comparação de sinais, FEATURE-015), agora também na
  // tabela principal do Histórico, não só na comparação.
  const favor = sinal.maxPipsFavor;
  const contra = sinal.maxPipsContra;
  const favorFormatado = favor != null ? Number(favor).toFixed(1) : "--";
  const contraFormatado = contra != null ? Number(contra).toFixed(1) : "--";

  return `
    <tr id="sinal-${docId}" data-sinal-id="${docId}" style="cursor:pointer; ${borderStyle}">
      <td style="padding:8px; white-space:nowrap;">${horario}</td>
      <td style="padding:8px; white-space:nowrap;">${isCooldown ? "🚫" : (sinal.direcao === "BUY" || sinal.direcao === "CALL" ? "🟢" : "🔴")} ${sinal.par || "-"}</td>
      <td style="padding:8px; white-space:nowrap;">${direcaoLabel}</td>
      <td style="padding:8px; white-space:nowrap;">${tempoLabel}</td>
      <td style="padding:8px; white-space:nowrap;">${resultadoLabel}${avisoIcone}</td>
      <td style="padding:8px; text-align:right; color:#00d26a;">${favorFormatado}</td>
      <td style="padding:8px; text-align:right; color:#ff5252;">${contraFormatado}</td>
      <td style="padding:8px; text-align:right; font-weight:bold; color:${usdCor};">${usdFormatado}</td>
      <td style="padding:8px; text-align:center;" onclick="event.stopPropagation();">
        <input type="checkbox"
          ${sinal.operacaoReal ? "checked" : ""}
          ${sinal.status !== "ENCERRADA" ? "disabled" : ""}
          onchange="alternarOperacaoReal('${docId}', this.checked);">
      </td>
      <td style="padding:8px; text-align:center;" onclick="event.stopPropagation();">
        ${!isCooldown ? `
          <input type="checkbox" class="chk-comparar" data-par="${sinal.par || ""}"
            ${sinaisComparacaoSelecionados.has(docId) ? "checked" : ""}
            onchange="alternarSelecaoComparacao(this, '${docId}')" title="Selecionar pra comparar">
        ` : ""}
      </td>
    </tr>
    <tr>
      <td colspan="10" style="padding:0; border:none;">
        ${detalheHtml}
      </td>
    </tr>
  `;
}

// Detalhe rico do sinal (RSI/EMA/ENTRADA-SAÍDA/gráfico do preço/
// Configuração Utilizada/LOTE/TP-SL/SALDO ANTES-DEPOIS/checkbox
// Operação Real) - extraído do template do card pra ser reutilizado
// também nas linhas da tabela (mesmo conteúdo, containers diferentes
// em volta: <div> dentro do card, <td colspan> dentro da tabela).
// AJUSTE-015 (24/09/2026): mini-card compacto, reusado em todas as
// grades 3-por-linha do detalhe do sinal - altura reduzida pela
// metade (padding 6px em vez de 10-12px, valor 15px em vez de
// 18-24px) por pedido do usuário. `idAttr` opcional (ex:
// `id="valorEntrada-123"`) permite trocar o conteúdo do valor depois,
// via JS, sem reconstruir o card inteiro - usado pelo fechamento
// manual pra virar campo editável no lugar.
function miniCard(emoji, label, valorHtml, cor, idAttr) {
  return `
    <div style="background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:6px; text-align:center;">
      <div style="font-size:10px; color:#999;">${emoji} ${label}</div>
      <div ${idAttr || ""} style="margin-top:2px; font-size:15px; font-weight:bold; color:${cor || "#fff"};">${valorHtml}</div>
    </div>
  `;
}

function construirDetalheSinal(sinal, docId, estaAberto) {
  const detalheId = `detalhe-${docId}`;

  // AJUSTE-015: layout reorganizado em grades de 3 por linha (pedido
  // do usuário) - linha 1 EMA9/EMA21/EMA200, linha 2 RSI/Entrada/
  // Saída. Entrada e Saída ganham IDs (`valorEntrada-`/`valorSaida-`)
  // pra virarem campo editável no fechamento manual, sem precisar
  // reconstruir o resto do card.
  const gradeAberta = `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:8px;">`;

  return `
          <div id="${detalheId}" style="display: ${estaAberto ? 'block' : 'none'}; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px; color:#8c95b3;">

${gradeAberta}
${miniCard("📈", "EMA 9", formatarPrecoPar(sinal.indicadores?.ema9 ?? sinal.ema9, sinal.par))}
${miniCard("📊", "EMA 21", formatarPrecoPar(sinal.indicadores?.ema21 ?? sinal.ema21, sinal.par))}
${miniCard("🏠", "EMA 200", formatarPrecoPar(sinal.indicadores?.ema200 ?? sinal.ema200, sinal.par))}
</div>

${gradeAberta}
${miniCard("📉", "RSI", (sinal.indicadores?.rsi ?? sinal.rsi) != null ? Number(sinal.indicadores?.rsi ?? sinal.rsi).toFixed(2) : "--", "#4fc3f7")}
${miniCard("💰", "ENTRADA", formatarPrecoPar(sinal.precoEntrada, sinal.par), "#fff", `id="valorEntrada-${docId}"`)}
${miniCard("🏁", "SAÍDA", formatarPrecoPar(sinal.precoSaida ?? sinal.precoFechamento, sinal.par), "#fff", `id="valorSaida-${docId}"`)}
</div>

${bannerSMC(sinal)}

${bannerOrigemSinal(sinal)}

${botaoFecharManualmente(sinal, docId)}

${sinal.status === "ENCERRADA" ? renderizarCaminhoPrecos(sinal) : ""}

<div style="margin-top:12px;">

    <div style="
        font-weight:bold;
        color:#9aa4b5;
        margin-bottom:8px;
    ">
        ⚙️ Configuração Utilizada
    </div>

    ${bannerConfiguracaoAjustada(sinal)}

    ${gradeAberta}
    ${miniCard("📦", "LOTE", sinal.lote)}
    ${miniCard("🎯", "TP", `$${sinal.tpUSD}`, "#00d26a")}
    ${miniCard("🛑", "SL", `$${sinal.slUSD}`, "#ff5252")}
    </div>

    <!-- CONTROLE FINANCEIRO -->

    ${gradeAberta}
    ${miniCard(
        "💼",
        "SALDO ANTES",
        sinal.saldoAntes == null ? "--" : "$" + Number(sinal.saldoAntes).toFixed(2),
        "#b0b0b0"
    )}
    ${miniCard(
        "📊",
        "RESULTADO",
        (sinal.resultadoFinanceiro ?? sinal.lucroEstimado) == null
            ? "--"
            : `${(sinal.resultadoFinanceiro ?? sinal.lucroEstimado) >= 0 ? "+" : ""}$${Number(sinal.resultadoFinanceiro ?? sinal.lucroEstimado).toFixed(2)}`,
        sinal.resultado === "WIN" ? "#00d26a" : sinal.resultado === "LOSS" ? "#ff5252" : "#fff"
    )}
    ${miniCard(
        "💰",
        "SALDO DEPOIS",
        sinal.saldoDepois == null ? "--" : "$" + Number(sinal.saldoDepois).toFixed(2),
        sinal.saldoDepois > sinal.saldoAntes ? "#00d26a" : sinal.saldoDepois < sinal.saldoAntes ? "#ff5252" : "#fff"
    )}
    </div>

    <label style="
display:flex;
justify-content:space-between;
align-items:center;
cursor:pointer;
margin-top:10px;
padding-top:8px;
border-top:1px solid rgba(255,255,255,.10);
">

<span>💲 Operação Real</span>

<input
type="checkbox"
${sinal.operacaoReal ? "checked" : ""}
${sinal.status !== "ENCERRADA" ? "disabled" : ""}
onchange="event.stopPropagation(); alternarOperacaoReal('${docId}', this.checked);"
>

</label>

${sinal.status !== "ENCERRADA"
    ? '<div style="font-size:11px;color:#999;margin-top:4px;">Disponível após o encerramento da operação</div>'
    : ""}

          </div>
        `;
}

// Pedido do usuário (11/09/2026, 3a rodada, depois de ver um print
// real do celular deitado): em paisagem, o cabeçalho fixo (título +
// estatísticas do mês + "Minimizar Tudo") e a barra de navegação
// inferior do app (fixa também) sobravam quase toda a altura da tela
// curta do celular deitado, deixando só 1-2 linhas de tabela visíveis.
// Limite de altura (não é "celular vs computador" - é literalmente
// "a tela é baixa o bastante pra doer") porque é a causa real do
// problema, funciona igual numa janela de desktop redimensionada
// baixa. Confirmado com o usuário: os dois (cabeçalho de totais E
// barra de navegação) somem completamente em modo compacto, com um
// botão "✕" fixo pra voltar - não um toque em qualquer lugar, porque
// tocar na linha já é o gesto de expandir o detalhe (RSI/EMA/gráfico),
// usar o mesmo toque pros dois ia confundir.
const ALTURA_LIMITE_MODO_COMPACTO = 500;

function aplicarModoCompactoSeNecessario() {
  const header = document.getElementById("historicoHeader");
  const nav = document.querySelector(".bottom-nav");
  // Logo "Forex Assist"/subtítulo (js/app.js, fora do controle deste
  // arquivo) - não é sticky, então normalmente rolaria pra fora
  // sozinha, mas no primeiro carregamento (sem rolagem ainda) ela
  // come uma fatia grande da altura curta da tela deitada.
  const logoApp = document.querySelector(".header");
  let botaoSair = document.getElementById("btnSairModoCompacto");

  const deveSerCompacto =
    modoTabela &&
    typeof window.innerHeight === "number" &&
    window.innerHeight < ALTURA_LIMITE_MODO_COMPACTO;

  if (!deveSerCompacto) {
    if (header) header.style.display = "";
    if (nav) nav.style.display = "";
    if (logoApp) logoApp.style.display = "";
    if (botaoSair) botaoSair.remove();
    return;
  }

  if (header) header.style.display = "none";
  if (nav) nav.style.display = "none";
  if (logoApp) logoApp.style.display = "none";

  if (!botaoSair) {
    botaoSair = document.createElement("button");
    botaoSair.id = "btnSairModoCompacto";
    botaoSair.innerHTML = "✕";
    botaoSair.title = "Mostrar cabeçalho e navegação de novo";
    botaoSair.style.cssText =
      "position:fixed; top:8px; right:8px; z-index:3000; width:32px; height:32px; " +
      "border:none; border-radius:50%; background:rgba(255,255,255,.15); color:#fff; " +
      "font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;";
    botaoSair.onclick = () => {
      if (header) header.style.display = "";
      if (nav) nav.style.display = "";
      if (logoApp) logoApp.style.display = "";
      botaoSair.remove();
    };
    document.body.appendChild(botaoSair);
  }
}

async function carregarHistorico() {
  const lista = document.getElementById("historicoLista");
  const stats = document.getElementById("historicoStats");
  if (!lista) return;

  try {
    // AJUSTE-012: range por timestamp (campo único com orderBy no
    // mesmo campo - não precisa de índice composto) em vez de
    // .limit(300) fixo. limit(600) aqui é só um teto de segurança bem
    // folgado (evita busca ilimitada se `diasCarregados` crescer
    // muito) - na prática, o range de dias é quem decide quanto vem.
    const snapshot = await db
      .collection("historico")
      .where("timestamp", ">=", inicioDiaBrasiliaUTCms(diasCarregados - 1))
      .orderBy("timestamp", "desc")
      .limit(600)
      .get();

    let wins = 0;
    let losses = 0;
    const gruposPorData = {};

    // FEATURE-007 (09/09/2026): estatística por dia/mês, além do total
    // global dos últimos 300 - antes só existia um total único
    // misturando tudo.
    const statsPorData = {};

    const hojeStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const mesAtualStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "2-digit", year: "numeric" });
    const sinaisAbertos = obterSinaisAbertos();

    cacheSinaisHistorico = {};

    snapshot.forEach((doc) => {
      const sinal = doc.data();
      let dataObj = null;

      if (sinal.timestamp) {
          let ts = sinal.timestamp;
          if (ts.toDate) ts = ts.toDate();
          else if (typeof ts === "number" && ts < 1000000000000) ts = ts * 1000;
          
          const d = new Date(ts);
          if (!isNaN(d.getTime())) dataObj = d;
      }

      if (!dataObj && (sinal.horario || sinal.data)) {
          const str = sinal.horario || sinal.data;
          const partes = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (partes) {
              dataObj = new Date(partes[3], partes[2] - 1, partes[1]);
          }
      }

      if (sinal.resultado === "WIN") wins++;
      if (sinal.resultado === "LOSS") losses++;

      const dataSinal = dataObj
          ? dataObj.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "Data Indefinida";

      // AJUSTE-016 (24/09/2026): soma financeira por dia, junto de
      // wins/losses - pedido do usuário pra mostrar quanto foi
      // ganho/perdido no dia, igual o Dashboard já mostra pro saldo
      // simulado. Soma resultadoFinanceiro (ou lucroEstimado, sinais
      // antigos) de toda operação encerrada, independente de WIN/LOSS -
      // é o valor real que entrou/saiu, não uma contagem.
      if (!statsPorData[dataSinal]) statsPorData[dataSinal] = { wins: 0, losses: 0, financeiro: 0 };
      if (sinal.resultado === "WIN") statsPorData[dataSinal].wins++;
      if (sinal.resultado === "LOSS") statsPorData[dataSinal].losses++;
      if (sinal.resultado === "WIN" || sinal.resultado === "LOSS") {
        const valorFechado = Number(sinal.resultadoFinanceiro ?? sinal.lucroEstimado);
        if (Number.isFinite(valorFechado)) statsPorData[dataSinal].financeiro += valorFechado;
      }

      const isCooldown = sinal.status === "COOLDOWN" || sinal.origem === "cooldown";

      const isDestaque = app.sinalParaDestacar === doc.id;
      const estaAberto = sinaisAbertos.includes(doc.id) || isDestaque;
      const detalheId = `detalhe-${doc.id}`;
      const borderStyle = isDestaque ? 'border: 2px solid #00ff88; background: rgba(0, 255, 136, 0.1);' : '';

      cacheSinaisHistorico[doc.id] = { sinal, dataObj };

      const detalheHtml = construirDetalheSinal(sinal, doc.id, estaAberto);

      const card = modoTabela
        ? construirLinhaTabela(sinal, doc.id, dataObj, isCooldown, borderStyle, detalheHtml)
        : `
        <div class="list-item" id="sinal-${doc.id}" style="${borderStyle}" data-sinal-id="${doc.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:bold;">
            <span>
              ${isCooldown ? "🚫" : (sinal.direcao === "BUY" || sinal.direcao === "CALL" ? "🟢" : "🔴")}
              ${sinal.par || "-"}
              |
              ${(sinal.direcao || "-").replace("CALL", "COMPRA").replace("PUT", "VENDA")}
            </span>
            <span style="display:flex; align-items:center; gap:8px;">
              <span>${isCooldown ? "COOLDOWN" : (sinal.resultado === "WIN" ? "✅ WIN" : sinal.resultado === "LOSS" ? "❌ LOSS" : "⏳ PENDENTE")}</span>
              ${!isCooldown ? `
                <input
                  type="checkbox"
                  class="chk-comparar"
                  data-par="${sinal.par || ""}"
                  ${sinaisComparacaoSelecionados.has(doc.id) ? "checked" : ""}
                  onclick="event.stopPropagation();"
                  onchange="alternarSelecaoComparacao(this, '${doc.id}')"
                  title="Selecionar pra comparar"
                >
              ` : ""}
            </span>
          </div>
          <div style="margin-top:4px; font-size:12px; color:#8c95b3;">
            ${sinal.loteUtilizado ? `💳 Lote: <b>${sinal.loteUtilizado}</b> | ` : ""}${dataSinal} &nbsp;
            ${dataObj ? dataObj.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }).substring(0, 5) : "--:--"}
            ${!isCooldown ? ` | Qualidade: ${sinal.qualidade ?? "-"}${sinal.score !== undefined ? ` (${sinal.score}%)` : ""}` : ""}
          </div>
          ${sinal.avisoRisco?.ativo ? `
            <div style="margin-top:6px; padding:8px 10px; border-radius:8px; background:rgba(255,180,0,.12); border:1px solid rgba(255,180,0,.35); font-size:11px; color:#ffb400;">
              ⚠️ ${sinal.avisoRisco.mensagem}
            </div>
          ` : ''}
          ${sinal.avisoExpectativa?.ativo ? `
            <div style="margin-top:6px; padding:8px 10px; border-radius:8px; background:rgba(255,82,82,.12); border:1px solid rgba(255,82,82,.35); font-size:11px; color:#ff8a8a;">
              📉 ${sinal.avisoExpectativa.mensagem}
            </div>
          ` : ''}
          ${sinal.movimentoPips !== undefined ? `
            <div style="margin-top:6px; font-size:12px; color:${sinal.resultado === 'WIN' ? '#00ff88' : '#ff4444'}; font-weight:bold;">
              📊 Movimentação: ${sinal.movimentoPips > 0 ? '+' : ''}${sinal.movimentoPips} pips
            </div>
          ` : ''}
          ${detalheHtml}
        </div>
      `;

      if (!gruposPorData[dataSinal]) gruposPorData[dataSinal] = "";
      gruposPorData[dataSinal] += card;
    });

    // Estatísticas do topo: calculado sobre a mesma amostra já buscada
    // (sem consulta extra), somando as datas cujo mês/ano batem com
    // hoje - preservado de FEATURE-007, mas o RÓTULO precisou mudar
    // (AJUSTE-012): antes a amostra buscada (até 300 docs) costumava
    // cobrir o mês inteiro, então "mês corrente" era uma descrição
    // razoável; agora a amostra é limitada a `diasCarregados` dias -
    // manter o rótulo "Setembro 2026" enganaria mostrando só 2-3 dias
    // com cara de mês inteiro. Rótulo passa a descrever o que
    // realmente está carregado.
    // AJUSTE-016: soma de TODO statsPorData, sem filtrar por mês - o
    // filtro de mês (`mesChaveDe`) fazia sentido quando a busca já
    // vinha limitada a até 300 docs que podiam ultrapassar o mês
    // corrente (FEATURE-007); desde o AJUSTE-012 a busca em si já é
    // limitada a `diasCarregados` dias, então filtrar de novo por mês
    // só cortaria dado errado perto da virada do mês (ex.: "últimos 3
    // dias" incluindo 1 dia do mês anterior - o filtro antigo
    // descartaria esse dia da conta, inconsistente com o rótulo).
    let winsMes = 0;
    let lossesMes = 0;
    let financeiroMes = 0;
    Object.keys(statsPorData).forEach((data) => {
      winsMes += statsPorData[data].wins;
      lossesMes += statsPorData[data].losses;
      financeiroMes += statsPorData[data].financeiro;
    });
    const totalMes = winsMes + lossesMes;
    const taxaMes = totalMes > 0 ? ((winsMes / totalMes) * 100).toFixed(1) : "0";
    const financeiroMesFormatado = `${financeiroMes >= 0 ? "+" : "-"}$${Math.abs(financeiroMes).toFixed(2)}`;

    const labelPeriodoCarregado = diasCarregados <= 2
      ? "Hoje e ontem"
      : `Últimos ${diasCarregados} dias`;

    if (stats) {
      stats.innerHTML = `
        <div class="card" style="padding:10px;">
          <div style="font-size:11px; color:#8c95b3; text-align:center; margin-bottom:4px;">
            ${labelPeriodoCarregado}
          </div>
          <div style="text-align:center; font-size:17px; font-weight:bold;">
            ✅ ${winsMes} &nbsp;&nbsp;&nbsp; ❌ ${lossesMes} &nbsp;&nbsp;&nbsp; 🎯 ${taxaMes}%
          </div>
          <div style="text-align:center; font-size:14px; font-weight:bold; margin-top:4px; color:${financeiroMes >= 0 ? "#00d26a" : "#ff5252"};">
            💵 ${financeiroMesFormatado}
          </div>
          <button id="btnMinimizarTudo" style="margin-top:10px; width:100%; padding:8px; border:none; border-radius:8px; background:#132852; color:white; font-size:13px; cursor:pointer;">
            Minimizar Tudo
          </button>
        </div>
      `;
    }

    // Renderização dos Grupos: mês -> dia, cada um com seu próprio
    // placar (FEATURE-007). A lista de sinais em si continua limitada
    // aos últimos 300 (mesma consulta de sempre) - meses mais antigos
    // que essa janela simplesmente não aparecem aqui.
    let finalHtml = "";

    const datasOrdenadas = Object.keys(gruposPorData).sort((a, b) => {
      if (a === "Data Indefinida") return 1;
      if (b === "Data Indefinida") return -1;
      const [da, ma, aa] = a.split("/");
      const [db, mb, ab] = b.split("/");
      return new Date(ab, mb - 1, db) - new Date(aa, ma - 1, da);
    });

    const mesesOrdenados = [];
    datasOrdenadas.forEach((data) => {
      const chave = mesChaveDe(data);
      if (!mesesOrdenados.includes(chave)) mesesOrdenados.push(chave);
    });

    mesesOrdenados.forEach((chaveMes) => {

      const datasDoMes = datasOrdenadas.filter((data) => mesChaveDe(data) === chaveMes);
      const labelMes = mesLabelDe(datasDoMes[0]);
      const idMes = chaveMes.replaceAll("/", "");

      const winsDoMes = datasDoMes.reduce((soma, data) => soma + statsPorData[data].wins, 0);
      const lossesDoMes = datasDoMes.reduce((soma, data) => soma + statsPorData[data].losses, 0);
      const totalDoMes = winsDoMes + lossesDoMes;
      const taxaDoMes = totalDoMes > 0 ? ((winsDoMes / totalDoMes) * 100).toFixed(1) : "0";
      // AJUSTE-016: mesma regra - todo placar mostra o valor
      // ganho/perdido no final.
      const financeiroDoMes = datasDoMes.reduce((soma, data) => soma + statsPorData[data].financeiro, 0);
      const financeiroDoMesFormatado = `${financeiroDoMes >= 0 ? "+" : "-"}$${Math.abs(financeiroDoMes).toFixed(2)}`;

      const mesContemHoje = chaveMes === mesChaveDe(hojeStr);
      const mesContemDestaque =
        app.sinalParaDestacar &&
        datasDoMes.some((data) => gruposPorData[data].includes(`id="sinal-${app.sinalParaDestacar}"`));
      const mostrarMes = mesContemHoje || mesContemDestaque;

      let diasHtml = "";

      datasDoMes.forEach((data) => {
        const idData = data.replaceAll("/", "");
        const isHoje = data === hojeStr;
        const label = isHoje ? `HOJE (${data})` : data;
        const placarDia = statsPorData[data];
        const totalDia = placarDia.wins + placarDia.losses;
        const taxaDia = totalDia > 0 ? ((placarDia.wins / totalDia) * 100).toFixed(1) : "0";
        // AJUSTE-016: valor ganho/perdido no dia, igual ao Dashboard.
        const financeiroDiaFormatado = `${placarDia.financeiro >= 0 ? "+" : "-"}$${Math.abs(placarDia.financeiro).toFixed(2)}`;

        const temSinalDestacado =
          app.sinalParaDestacar &&
          gruposPorData[data].includes(`id="sinal-${app.sinalParaDestacar}"`);

        const mostrarDia = isHoje || temSinalDestacado;

        // Pedido do usuário (11/09/2026, 2a rodada): virar tabela
        // (mesma referência do checkbox "Operação Real" que ele mandou
        // antes) mantendo o agrupamento por dia que já existia -
        // só troca o conteúdo de dentro de cada dia, o "envelope"
        // (cabeçalho clicável, placar do dia) continua igual nos dois
        // modos.
        const conteudoDia = modoTabela
          ? `
            <div style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
              <table style="border-collapse:collapse; width:100%; min-width:720px; font-size:12px;">
                <thead>
                  <tr style="background:rgba(255,255,255,.06); text-align:left;">
                    <th style="padding:6px 8px;">Horário</th>
                    <th style="padding:6px 8px;">Par</th>
                    <th style="padding:6px 8px;">Direção</th>
                    <th style="padding:6px 8px;">Tempo</th>
                    <th style="padding:6px 8px;">Resultado</th>
                    <th style="padding:6px 8px; text-align:right;">Favor</th>
                    <th style="padding:6px 8px; text-align:right;">Contra</th>
                    <th style="padding:6px 8px; text-align:right;">Resultado Financeiro</th>
                    <th style="padding:6px 8px; text-align:center;">Operação Real</th>
                    <th style="padding:6px 8px; text-align:center;">Cmp</th>
                  </tr>
                </thead>
                <tbody>
                  ${gruposPorData[data]}
                </tbody>
              </table>
            </div>
          `
          : gruposPorData[data];

        diasHtml += `
        <div style="margin-top:10px; border:1px solid rgba(255,255,255,.08); border-radius:10px; overflow:hidden;">
           <div
  onclick="
  const el = document.getElementById('data${idData}');
  const seta = this.querySelector('.seta-grupo');

  if (el.style.display === 'none') {
      el.style.display = 'block';
      seta.innerHTML = '▼';
  } else {
      el.style.display = 'none';
      seta.innerHTML = '▶';
  }
  "

      style="padding:10px 12px; font-size:12px; color:#8c95b3; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,.03);">
     <span><span class="seta-grupo" style="margin-right:8px;">${mostrarDia ? "▼" : "▶"}</span>${label}</span>
     <span style="font-weight:normal;">✅ ${placarDia.wins} ❌ ${placarDia.losses} 🎯 ${taxaDia}% 💵 ${financeiroDiaFormatado}</span>
      </div>
      <div id="data${idData}" style="display: ${mostrarDia ? 'block' : 'none'}; padding:${modoTabela ? '0' : '10px'};">
        ${conteudoDia}
      </div>
        </div>
        `;
      });

      finalHtml += `
      <div style="margin-top:16px; border:1px solid rgba(255,255,255,.12); border-radius:10px; overflow:hidden;">
         <div
onclick="
const el = document.getElementById('mes${idMes}');
const seta = this.querySelector('.seta-grupo');

if (el.style.display === 'none') {
    el.style.display = 'block';
    seta.innerHTML = '▼';
} else {
    el.style.display = 'none';
    seta.innerHTML = '▶';
}
"

    style="padding:12px; font-size:13px; color:#e0e6f5; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,.06);">
   <span><span class="seta-grupo" style="margin-right:8px;">${mostrarMes ? "▼" : "▶"}</span>${labelMes}</span>
   <span style="font-weight:normal; font-size:12px;">${mesContemHoje ? "" : `✅ ${winsDoMes} ❌ ${lossesDoMes} 🎯 ${taxaDoMes}% 💵 ${financeiroDoMesFormatado}`}</span>
    </div>
    <div id="mes${idMes}" style="display: ${mostrarMes ? 'block' : 'none'}; padding:8px;">
      ${diasHtml}
    </div>
      </div>
      `;
    });

    lista.innerHTML = (finalHtml || '<div class="list-item">Nenhum sinal encontrado.</div>') + `
      <button
        id="btnCarregarMaisHistorico"
        onclick="carregarMaisHistorico()"
        style="margin-top:12px; width:100%; padding:10px; border:none; border-radius:8px; background:rgba(255,255,255,.06); color:#9adcf9; font-size:12px; cursor:pointer;"
      >
        ⬇️ Carregar mais (dia anterior)
      </button>
    `;

    atualizarBarraComparacao();
    atualizarBotaoModoTabela();
    aplicarModoCompactoSeNecessario();

// Adicionar listeners de clique APÓS renderizar - BLINDADO
    setTimeout(() => {
      document.querySelectorAll('[data-sinal-id]').forEach(el => {
       
// Remover listeners antigos para evitar duplicação
        el.onclick = null;
        
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          const sinalId = this.dataset.sinalId;
          const detalheId = `detalhe-${sinalId}`;
          const detalhe = document.getElementById(detalheId);
          
          if (detalhe) {
            const estaAberto = detalhe.style.display !== 'none';
            detalhe.style.display = estaAberto ? 'none' : 'block';
            
            // Persistir estado IMEDIATAMENTE
            if (estaAberto) {
              removerSinalAberto(sinalId);
            } else {
              salvarSinalAberto(sinalId);
            }
          }
        }, { once: false });
      });
    }, 100);

    if (app.sinalParaDestacar) {
      const el = document.getElementById(`sinal-${app.sinalParaDestacar}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        app.sinalParaDestacar = null;
      }
    }

    // Lógica do botão Minimizar Tudo
    const btnMinimizar = document.getElementById("btnMinimizarTudo");
    if (btnMinimizar) {
      btnMinimizar.onclick = () => {
        mesesOrdenados.forEach(chaveMes => {
          const idMes = chaveMes.replaceAll("/", "");
          const el = document.getElementById(`mes${idMes}`);
          if (el) {
            el.style.display = "none";
            const seta = el.previousElementSibling?.querySelector('.seta-grupo');
            if (seta) seta.innerHTML = '▶';
          }
        });
        datasOrdenadas.forEach(data => {
          const idData = data.replaceAll("/", "");
          const el = document.getElementById(`data${idData}`);
          if (el) {
            el.style.display = "none";
            const seta = el.previousElementSibling?.querySelector('.seta-grupo');
            if (seta) seta.innerHTML = '▶';
          }
        });
        localStorage.setItem('sinaisAbertos', JSON.stringify([]));
      };
    }

  } catch (erro) {
    console.error("Erro histórico:", erro);
    lista.innerHTML = `<div class="list-item">Erro ao carregar histórico: ${erro.message}</div>`;
  }
}

window.alternarOperacaoReal = async function (id, marcado) {

    const db = firebase.firestore();

    const docRef = db
        .collection("historico")
        .doc(id);

    // BUG-019 (09/09/2026): antes disto, o doc era ATUALIZADO com o
    // novo valor de operacaoReal e só DEPOIS relido pra saber "se já
    // estava marcado antes" - nesse ponto o documento já tinha o valor
    // novo, então jaMarcado sempre saía igual a marcado, e nenhuma das
    // duas condições abaixo (marcado && !jaMarcado / !marcado &&
    // jaMarcado) conseguia ser verdadeira. saldoReal nunca se movia,
    // não importa quantas operações fossem marcadas/desmarcadas. Agora
    // o estado ANTERIOR é lido antes de escrever o novo.
    const doc = await docRef.get();

    const sinal = doc.data();

    // BUG-022 (09/09/2026): o guard original (`!sinal.resultadoFinanceiro`)
    // saía em silêncio sempre que o campo estava ausente - o caso mais
    // comum sendo sinais de antes de 28/07/2026, quando o schema usava
    // `lucroAtual` em vez de `resultadoFinanceiro` (ver BUG-007 em
    // ENGINEERING.md). O usuário marcava o checkbox, nada acontecia
    // com a Conta Real, e não havia nenhuma indicação do motivo -
    // parecia que o BUG-019 não tinha funcionado. Também usava `!` puro
    // (falsy), o que trataria um resultadoFinanceiro genuinamente igual
    // a 0 como "ausente" - trocado por checagem explícita de tipo.
    if (!sinal || typeof sinal.resultadoFinanceiro !== "number") {

        await docRef.update({
            operacaoReal: marcado
        });

        alert(
            "Esse sinal não tem resultado financeiro registrado " +
            "(comum em sinais de antes de 28/07/2026, de um schema " +
            "anterior) - a marcação foi salva, mas não é possível somar " +
            "ou subtrair da Conta Real sem esse valor."
        );

        carregarHistorico();
        return;
    }

    const jaMarcado = Boolean(sinal.operacaoReal);

  const configRef = db
    .collection("configuracoes")
    .doc("geral");

const configDoc = await configRef.get();

if (!configDoc.exists) {
    carregarHistorico();
    return;
}

const config = configDoc.data();

let saldoReal = Number(config.saldoReal || 0);

// FEATURE-010 (10/09/2026): o bloqueio por risco saiu da análise
// (decisionEngine.js/pairAnalyzer.js - agora vira só aviso, sinal
// salva normal) e passou pra cá: não é possível ter executado de
// verdade, na XM, uma operação cujo SL é maior que o saldo real que
// você tinha - marcar isso mesmo assim contaminaria a Conta Real com
// um número que não reflete o que de fato aconteceu na corretora.
// Serve também como checagem indireta: se isso disparar, ou o saldo
// real cadastrado aqui está desatualizado (fez aporte e esqueceu de
// registrar), ou a operação realmente não foi executada como está
// marcada.
if (marcado && Number(sinal.slUSD || 0) > saldoReal) {

    alert(
        `Saldo insuficiente: essa operação tem SL de $${Number(sinal.slUSD).toFixed(2)}, ` +
        `mas sua Conta Real está em $${saldoReal.toFixed(2)}. Não é possível marcar como ` +
        `"Operação Real" - você não teria saldo suficiente pra ter executado essa operação ` +
        `de verdade. Se você já depositou mais na XM, atualize o saldo na tela de Config antes ` +
        `de marcar.`
    );

    carregarHistorico();
    return;

}

    await docRef.update({

        operacaoReal: marcado

    });

const lucro = Number(sinal.resultadoFinanceiro || 0);

if (marcado && !jaMarcado) {

    saldoReal += lucro;

}

if (!marcado && jaMarcado) {

    saldoReal -= lucro;

}

await configRef.update({

    saldoReal

});
  
    carregarHistorico();

};

// Atualização automática (pedido do usuário, 11/09/2026: um sinal
// fechado ficava com status desatualizado na tela até o usuário
// recarregar a página manualmente - viu isso na prática quando um
// AUD/USD já tinha fechado como WIN havia 23 minutos e a tela ainda
// mostrava PENDENTE).
//
// Intervalo NÃO é os 5 segundos do código antigo (comentado, nunca
// tinha sido ligado) - mesma cautela de sempre com a cota gratuita do
// Firestore (já estourou uma vez numa tela diferente, js/expert.js,
// "confirmado no console do Firebase: 55 mil leituras/dia contra um
// teto gratuito de 50 mil"). 90 segundos ainda é mais frequente que o
// próprio ciclo do backend (5 min), então continua pegando
// fechamentos reais bem mais rápido que esperar um reload manual.
// AJUSTE-012 (24/09/2026): carregarHistorico() deixou de buscar até
// 300 documentos fixos - agora busca só `diasCarregados` dias (2 por
// padrão, hoje+ontem), bem mais barato que antes; esse polling herda
// a mesma economia automaticamente, sem precisar de nenhuma mudança
// aqui. Mesmo guard de "só enquanto a aba está em primeiro plano e o
// usuário está de fato na aba Histórico" usado em js/expert.js, pelo
// mesmo motivo.
setInterval(() => {
  if (document.hidden) return;
  if (app.currentTab !== "historico") return;
  carregarHistorico();
}, 90000);

// AJUSTE-020 (24/09/2026): #historicoHeader usa position:sticky (título +
// botão "Ver como lista" + placar, fixos no topo enquanto rola a lista
// embaixo). Usuário reportou que, ao girar o celular, o header "trava"
// sobrepondo a lista, só destravando com um refresh manual da página -
// bug conhecido de alguns navegadores Android (Chrome/WebView), que não
// recalculam a posição do elemento sticky sozinhos depois de uma mudança
// de viewport (orientação/rotação), só depois de algum reflow forçado.
//
// NÃO é o mesmo problema do AJUSTE-008/010 (troca cartão↔tabela por
// orientação) - aquele mecanismo foi removido de propósito porque deixou
// de fazer sentido (tabela/lista já é o padrão permanente, em qualquer
// orientação). Este aqui é só um empurrão de CSS (reflow), sem trocar
// modo nenhum e sem tocar no Firestore - não reusa o polling de 90s
// acima nem o dispara fora de hora.
function forcarReflowHeaderHistorico() {
  const header = document.getElementById("historicoHeader");
  if (!header) return;

  // Truque padrão pra forçar o navegador a recalcular o layout sticky:
  // tira do fluxo normal, lê uma propriedade de layout (isso obriga o
  // navegador a recalcular ali, "void" só descarta o valor), devolve.
  header.style.position = "static";
  void header.offsetHeight;
  header.style.position = "sticky";
}

let debounceRotacaoHistoricoTimer = null;

function aoRotacionarTelaHistorico() {
  if (app.currentTab !== "historico") return;

  if (debounceRotacaoHistoricoTimer) {
    clearTimeout(debounceRotacaoHistoricoTimer);
  }

  // Debounce curto (mesmo valor usado no AJUSTE-008 pra este mesmo tipo
  // de evento) - dá tempo do navegador terminar de recalcular as
  // dimensões da rotação antes de forçar o reflow.
  debounceRotacaoHistoricoTimer = setTimeout(
    forcarReflowHeaderHistorico,
    150
  );
}

window.addEventListener("orientationchange", aoRotacionarTelaHistorico);

// Fallback: alguns navegadores não disparam mais o evento legado acima,
// só a API screen.orientation (quando disponível).
if (window.screen && window.screen.orientation) {
  window.screen.orientation.addEventListener(
    "change",
    aoRotacionarTelaHistorico
  );
}
