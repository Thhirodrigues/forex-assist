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
    const usdCor = usd == null ? "#fff" : (usd >= 0 ? "#00d26a" : "#ff5252");

    return `
      <tr>
        <td style="padding:8px; white-space:nowrap;">${horario}</td>
        <td style="padding:8px; white-space:nowrap;">${(sinal.direcao || "-").replace("CALL", "COMPRA").replace("PUT", "VENDA").replace("BUY", "COMPRA").replace("SELL", "VENDA")}</td>
        <td style="padding:8px; white-space:nowrap;">${statusLabel}</td>
        <td style="padding:8px; text-align:right;">${sinal.precoEntrada ?? "--"}</td>
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

  const casasDecimais = String(sinal.par || "").includes("JPY") ? 3 : 5;
  const formatarPreco = (v) => Number(v).toFixed(casasDecimais);

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

// Pedido do usuário (11/09/2026, segunda rodada): o Histórico virar
// tabela (parecido com uma referência que ele mandou - colunas
// Horário/Par/Direção/Tempo/Resultado/Resultado Financeiro/Operação
// Real, agrupado por dia) quando o celular for girado pra paisagem, ou
// via um botão manual (equivalente no computador, que não tem como
// girar fisicamente).
let modoTabela = false;
let deteccaoOrientacaoInicializada = false;

// Detecção real de orientação via matchMedia - mecanismo nativo do CSS
// pra isso, dispara só quando a orientação de fato muda (mais
// confiável que ficar comparando window.innerWidth a cada resize).
// Registrado uma única vez (guard) porque historicoView() é
// recarregado toda vez que o usuário entra na aba Histórico.
function inicializarDeteccaoOrientacao() {
  if (deteccaoOrientacaoInicializada) return;
  deteccaoOrientacaoInicializada = true;

  if (typeof window.matchMedia !== "function") return;

  const mq = window.matchMedia("(orientation: landscape)");
  modoTabela = mq.matches;

  mq.addEventListener("change", () => {
    modoTabela = mq.matches;
    carregarHistorico();
  });
}

// Botão manual - equivalente no computador de "virar o celular" (não
// existe rotação física em desktop). Sempre disponível, independente
// da orientação atual, e também serve de reforço no celular caso a
// detecção automática não dispare em algum navegador específico.
function alternarModoTabela() {
  modoTabela = !modoTabela;
  carregarHistorico();
}

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
  const usdCor = usd == null ? "#fff" : (usd >= 0 ? "#00d26a" : "#ff5252");

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
function construirDetalheSinal(sinal, docId, estaAberto) {
  const detalheId = `detalhe-${docId}`;

  return `
          <div id="${detalheId}" style="display: ${estaAberto ? 'block' : 'none'}; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px; color:#8c95b3;">
            <div style="
display:grid;
grid-template-columns:repeat(2,1fr);
gap:10px;
margin-bottom:14px;
">

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="font-size:11px;color:#999;">
📉 RSI
</div>

<div style="
font-size:20px;
font-weight:bold;
color:#4fc3f7;
">
${(sinal.indicadores?.rsi ?? sinal.rsi) != null ? Number(sinal.indicadores?.rsi ?? sinal.rsi).toFixed(2) : "--"}
</div>

</div>

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="font-size:11px;color:#999;">
📈 EMA 9
</div>

<div style="
font-size:18px;
font-weight:bold;
color:#ffffff;
">
${(sinal.indicadores?.ema9 ?? sinal.ema9) != null ? Number(sinal.indicadores?.ema9 ?? sinal.ema9).toFixed(5) : "--"}
</div>

</div>

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="font-size:11px;color:#999;">
📊 EMA 21
</div>

<div style="
font-size:18px;
font-weight:bold;
color:#ffffff;
">
${(sinal.indicadores?.ema21 ?? sinal.ema21) != null ? Number(sinal.indicadores?.ema21 ?? sinal.ema21).toFixed(5) : "--"}
</div>

</div>

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="font-size:11px;color:#999;">
🏠 EMA 200
</div>

<div style="
font-size:18px;
font-weight:bold;
color:#ffffff;
">
${(sinal.indicadores?.ema200 ?? sinal.ema200) != null ? Number(sinal.indicadores?.ema200 ?? sinal.ema200).toFixed(5) : "--"}
</div>

</div>

</div>

<div style="
display:flex;
gap:10px;
margin-bottom:14px;
">

<div style="
flex:1;
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="font-size:11px;color:#999;">
💰 ENTRADA
</div>

<div style="
font-size:18px;
font-weight:bold;
color:#fff;
">
${sinal.precoEntrada ?? "--"}
</div>

</div>

<div style="
flex:1;
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="font-size:11px;color:#999;">
🏁 SAÍDA
</div>

<div style="
font-size:18px;
font-weight:bold;
color:#fff;
">
${sinal.precoSaida ?? sinal.precoFechamento ?? "--"}
</div>

</div>

</div>

${sinal.status === "ENCERRADA" ? renderizarCaminhoPrecos(sinal) : ""}

<div style="margin-top:12px;">

    <div style="
        font-weight:bold;
        color:#9aa4b5;
        margin-bottom:12px;
    ">
        ⚙️ Configuração Utilizada
    </div>

    ${bannerConfiguracaoAjustada(sinal)}

    <div style="
        text-align:center;
        margin-bottom:14px;
    ">

        <div style="
            font-size:12px;
            color:#999;
        ">
            LOTE
        </div>

        <div style="
            font-size:22px;
            font-weight:bold;
            color:#fff;
        ">
            ${sinal.lote}
        </div>

    </div>

    <div style="
display:flex;
gap:12px;
margin-bottom:16px;
">

<div style="
flex:1;
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="
font-size:11px;
color:#999;
">
🎯 TP
</div>

<div style="
font-size:20px;
font-weight:bold;
color:#00d26a;
">
$${sinal.tpUSD}
</div>

</div>

<div style="
flex:1;
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:8px;
padding:10px;
text-align:center;
">

<div style="
font-size:11px;
color:#999;
">
🛑 SL
</div>

<div style="
font-size:20px;
font-weight:bold;
color:#ff5252;
">
$${sinal.slUSD}
</div>

</div>

</div>

    </div>

    <!-- CONTROLE FINANCEIRO -->

<div style="
display:grid;
grid-template-columns:repeat(2,1fr);
gap:12px;
margin:18px 0;
">

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:10px;
padding:12px;
text-align:center;
">

<div style="
font-size:11px;
color:#888;
letter-spacing:1px;
">
💼 SALDO ANTES
</div>

<div style="
margin-top:8px;
font-size:22px;
font-weight:bold;
color:#b0b0b0;
">

${sinal.saldoAntes == null
? "--"
: "$" + Number(sinal.saldoAntes).toFixed(2)}

</div>

</div>

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
border-radius:10px;
padding:12px;
text-align:center;
">

<div style="
font-size:11px;
color:#888;
letter-spacing:1px;
">
💰 SALDO DEPOIS
</div>

<div style="
margin-top:8px;
font-size:22px;
font-weight:bold;
color:${
sinal.saldoDepois > sinal.saldoAntes
? "#00d26a"
: sinal.saldoDepois < sinal.saldoAntes
? "#ff5252"
: "#ffffff"
};
">

${sinal.saldoDepois == null
? "--"
: "$" + Number(sinal.saldoDepois).toFixed(2)}

</div>

</div>

</div>

    <label style="
display:flex;
justify-content:space-between;
align-items:center;
cursor:pointer;
margin-top:16px;
padding-top:10px;
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

            ${sinal.movimentoPips !== undefined ? `
              <div style="margin-top:10px; padding:8px; border-radius:4px; background:rgba(255,255,255,0.05); text-align:center; font-weight:bold;">
                <div style="color:${sinal.resultado === 'WIN' ? '#00ff88' : (sinal.resultado === 'LOSS' ? '#ff4444' : '#8c95b3')};">
                  VARIAÇÃO: ${sinal.movimentoPips > 0 ? '+' : ''}${sinal.movimentoPips} PIPS
                </div>
                ${sinal.lucroEstimado !== undefined ? `

               <div style="
margin-top:12px;
padding:12px;
border-radius:8px;
background:${
    sinal.resultado === "WIN"
        ? "rgba(0,210,106,.12)"
        : sinal.resultado === "LOSS"
            ? "rgba(255,82,82,.12)"
            : "rgba(255,255,255,.05)"
};
text-align:center;
">

<div style="
font-size:11px;
color:#999;
letter-spacing:1px;
">

RESULTADO FINANCEIRO

</div>

<div style="
font-size:24px;
font-weight:bold;
color:${
    sinal.resultado === "WIN"
        ? "#00d26a"
        : sinal.resultado === "LOSS"
            ? "#ff5252"
            : "#ffffff"
};
">

${sinal.resultadoFinanceiro ??
(sinal.lucroEstimado >= 0 ? "+" : "") + "$" + sinal.lucroEstimado.toFixed(2)}

</div>

</div>

                ` : ''}
              </div>
            ` : ''}
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

  inicializarDeteccaoOrientacao();

  try {
    const snapshot = await db
      .collection("historico")
      .orderBy("timestamp", "desc")
      .limit(300)
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

      if (!statsPorData[dataSinal]) statsPorData[dataSinal] = { wins: 0, losses: 0 };
      if (sinal.resultado === "WIN") statsPorData[dataSinal].wins++;
      if (sinal.resultado === "LOSS") statsPorData[dataSinal].losses++;

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

    // Estatísticas do topo: mês corrente, não mais o total misturado
    // dos últimos 300 (FEATURE-007) - calculado sobre a mesma amostra
    // já buscada (sem consulta extra), somando as datas cujo mês/ano
    // batem com hoje.
    let winsMes = 0;
    let lossesMes = 0;
    Object.keys(statsPorData).forEach((data) => {
      if (mesChaveDe(data) === mesChaveDe(hojeStr)) {
        winsMes += statsPorData[data].wins;
        lossesMes += statsPorData[data].losses;
      }
    });
    const totalMes = winsMes + lossesMes;
    const taxaMes = totalMes > 0 ? ((winsMes / totalMes) * 100).toFixed(1) : "0";

    if (stats) {
      stats.innerHTML = `
        <div class="card" style="padding:10px;">
          <div style="font-size:11px; color:#8c95b3; text-align:center; margin-bottom:4px;">
            ${mesLabelDe(hojeStr)}
          </div>
          <div style="text-align:center; font-size:17px; font-weight:bold;">
            ✅ ${winsMes} &nbsp;&nbsp;&nbsp; ❌ ${lossesMes} &nbsp;&nbsp;&nbsp; 🎯 ${taxaMes}%
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
     <span style="font-weight:normal;">✅ ${placarDia.wins} ❌ ${placarDia.losses} 🎯 ${taxaDia}%</span>
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
   <span style="font-weight:normal; font-size:12px;">✅ ${winsDoMes} ❌ ${lossesDoMes} 🎯 ${taxaDoMes}%</span>
    </div>
    <div id="mes${idMes}" style="display: ${mostrarMes ? 'block' : 'none'}; padding:8px;">
      ${diasHtml}
    </div>
      </div>
      `;
    });

    lista.innerHTML = finalHtml || '<div class="list-item">Nenhum sinal encontrado.</div>';

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
// tinha sido ligado) - carregarHistorico() lê até 300 documentos por
// chamada (.limit(300)), bem mais caro que o polling de 1 documento
// do status do Scanner em js/expert.js (que já teve que subir de 2s
// pra 15s por esse mesmo motivo - ver ENGINEERING.md e o comentário
// lá, "confirmado no console do Firebase: 55 mil leituras/dia contra
// um teto gratuito de 50 mil"). Aplicar o mesmo 15s aqui seria 300
// leituras a cada 15s = 72 mil leituras/hora só desta tela. 90
// segundos ainda é mais frequente que o próprio ciclo do backend (5
// min), então continua pegando fechamentos reais bem mais rápido que
// esperar um reload manual, sem multiplicar a mesma cota que acabou
// de estourar. Mesmo guard de "só enquanto a aba está em primeiro
// plano e o usuário está de fato na aba Histórico" usado em
// js/expert.js, pelo mesmo motivo.
setInterval(() => {
  if (document.hidden) return;
  if (app.currentTab !== "historico") return;
  carregarHistorico();
}, 90000);
