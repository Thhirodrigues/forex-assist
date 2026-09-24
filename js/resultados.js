// ======================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MÓDULO: RESULTADOS
//
// AJUSTE-021 (24/09/2026): aba nova, separada do Histórico, por pedido
// do usuário durante o teste do perfil Conservador ("preciso de mais
// agilidade no Histórico pra acompanhar sinais... Resultados, lotes,
// comparação, filtro por compra, filtro por par, filtro por perfil,
// ficaria tudo nessa aba de resultados... estou ciente que o
// carregamento vai ser um pouco mais demorado porque está tudo
// centralizado"). Reusa deliberadamente várias funções já existentes
// em js/historico.js (formatarPrecoPar, construirLinhaTabela,
// construirDetalheSinal, miniCard, LEGENDA_*, extrairDataObjSinal,
// inicioDiaBrasiliaUTCms, mesChaveDe/mesLabelDe, cacheSinaisHistorico,
// alternarOperacaoReal) - js/historico.js carrega ANTES deste arquivo
// (ver index.html), então tudo isso já está disponível aqui como
// função/variável global, sem precisar de import nem duplicação.
//
// Diferente do Histórico (day-windowed, ~2 dias, pensado pra ser
// rápido), esta aba busca um período maior (configurável, até "Tudo")
// e filtra client-side por par/direção/perfil - de propósito, pra
// nunca precisar de índice composto no Firestore (múltiplos .where()
// de igualdade + orderBy por timestamp exigiriam um índice novo por
// combinação de filtro, exatamente o tipo de armadilha que este
// projeto já documentou evitar - ver riskManager.js/js/historico.js).
// O custo aceito é ler mais documentos do que o estritamente
// necessário pra um filtro estreito - troca deliberada, confirmada
// com o usuário ("estou ciente que vai demorar um pouco").
// ======================================================

// ======================================================
// ESTADO DOS FILTROS
// ======================================================

let filtroResultadosPeriodo = "7";
let filtroResultadosPar = "";
let filtroResultadosDirecao = "";
let filtroResultadosPerfil = "";

const LIMITE_RESULTADOS = 2000;

// ======================================================
// COMPARAÇÃO DE SINAIS (movida do Histórico - AJUSTE-021)
// ---------------------------------------------------
// Mesma lógica de sempre (seleção livre, restrita ao mesmo par),
// só que os containers agora vivem nesta aba
// (resultadosComparacao/barraComparacaoResultados). Os nomes das
// funções (alternarSelecaoComparacao, abrirComparacao, etc.) são os
// mesmos de antes de propósito - construirLinhaTabela() (js/historico.js)
// já gera o HTML com esses nomes no onclick/onchange, então manter o
// mesmo nome evita ter que tocar naquele arquivo de novo.
// ======================================================

const sinaisComparacaoSelecionados = new Set();

function atualizarBarraComparacao() {
  const barra = document.getElementById("barraComparacaoResultados");
  if (!barra) return;

  const total = sinaisComparacaoSelecionados.size;

  if (total === 0) {
    barra.style.display = "none";
    return;
  }

  barra.style.display = "flex";
  document.getElementById("barraComparacaoResultadosTexto").innerHTML =
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
  const comparacao = document.getElementById("resultadosComparacao");
  const lista = document.getElementById("resultadosLista");
  const stats = document.getElementById("resultadosStats");

  if (comparacao) comparacao.style.display = "none";
  if (lista) lista.style.display = "block";
  if (stats) stats.style.display = "block";

  atualizarBarraComparacao();
}

function reavaliarDicaGirar() {
  const wrapper = document.getElementById("comparacaoScrollWrapper");
  const dica = document.getElementById("comparacaoDicaGirar");
  if (wrapper && dica) {
    dica.style.display = wrapper.scrollWidth > wrapper.clientWidth ? "block" : "none";
  }
}

function alternarExpandirComparacao() {
  const comparacao = document.getElementById("resultadosComparacao");
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

  const comparacao = document.getElementById("resultadosComparacao");
  const lista = document.getElementById("resultadosLista");
  const stats = document.getElementById("resultadosStats");
  if (!comparacao) return;

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

  const barra = document.getElementById("barraComparacaoResultados");
  if (barra) barra.style.display = "none";

  if (window._removerListenerDicaGirar) window._removerListenerDicaGirar();
  window.addEventListener("resize", reavaliarDicaGirar);
  window._removerListenerDicaGirar = () => window.removeEventListener("resize", reavaliarDicaGirar);

  reavaliarDicaGirar();
}

// ======================================================
// VIEW
// ======================================================

function resultadosView() {
  const opcoesPar = TODOS_PARES.map(
    (par) => `<option value="${par}" ${filtroResultadosPar === par ? "selected" : ""}>${par}</option>`
  ).join("");

  return `
    <div class="card">
      <div class="card-title">📊 Resultados</div>
      <div style="font-size:12px; color:#8c95b3; margin-bottom:14px;">
        Análise completa - período maior, filtros e comparação. Pode
        demorar um pouco mais que o Histórico pra carregar (dado
        centralizado aqui de propósito).
      </div>

      <div class="list-item">
        Período
        <br><br>
        <select id="filtroResultadosPeriodo" style="width:100%;">
          <option value="1" ${filtroResultadosPeriodo === "1" ? "selected" : ""}>Hoje</option>
          <option value="7" ${filtroResultadosPeriodo === "7" ? "selected" : ""}>Últimos 7 dias</option>
          <option value="30" ${filtroResultadosPeriodo === "30" ? "selected" : ""}>Últimos 30 dias</option>
          <option value="tudo" ${filtroResultadosPeriodo === "tudo" ? "selected" : ""}>Tudo</option>
        </select>
      </div>

      <div class="list-item">
        Par
        <br><br>
        <select id="filtroResultadosPar" style="width:100%;">
          <option value="" ${filtroResultadosPar === "" ? "selected" : ""}>Todos os pares</option>
          ${opcoesPar}
        </select>
      </div>

      <div class="list-item">
        Direção
        <br><br>
        <select id="filtroResultadosDirecao" style="width:100%;">
          <option value="" ${filtroResultadosDirecao === "" ? "selected" : ""}>Todas</option>
          <option value="BUY" ${filtroResultadosDirecao === "BUY" ? "selected" : ""}>🟢 Compra</option>
          <option value="SELL" ${filtroResultadosDirecao === "SELL" ? "selected" : ""}>🔴 Venda</option>
        </select>
      </div>

      <div class="list-item">
        Perfil
        <br><br>
        <select id="filtroResultadosPerfil" style="width:100%;">
          <option value="" ${filtroResultadosPerfil === "" ? "selected" : ""}>Todos</option>
          <option value="AGRESSIVO" ${filtroResultadosPerfil === "AGRESSIVO" ? "selected" : ""}>🟢 Agressivo</option>
          <option value="BALANCEADO" ${filtroResultadosPerfil === "BALANCEADO" ? "selected" : ""}>🔵 Balanceado</option>
          <option value="CONSERVADOR" ${filtroResultadosPerfil === "CONSERVADOR" ? "selected" : ""}>🟡 Conservador</option>
        </select>
      </div>

      <div id="resultadosStats" style="margin:15px 0;">Carregando estatísticas...</div>

      <div id="resultadosLista">Carregando resultados...</div>
      <div id="resultadosComparacao" style="display:none;"></div>
    </div>
    <div id="barraComparacaoResultados" style="display:none; position:fixed; left:12px; right:12px; bottom:64px; z-index:1000; background:#132852; border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:10px 14px; align-items:center; justify-content:space-between; gap:10px; box-shadow:0 4px 14px rgba(0,0,0,.4);">
      <span id="barraComparacaoResultadosTexto" style="font-size:12px; color:#e0e6f5;"></span>
      <div style="display:flex; gap:8px;">
        <button onclick="limparSelecaoComparacao()" style="padding:6px 10px; border:none; border-radius:8px; background:rgba(255,255,255,.08); color:#e0e6f5; font-size:12px; cursor:pointer;">Limpar</button>
        <button onclick="abrirComparacao()" style="padding:6px 12px; border:none; border-radius:8px; background:#4fc3f7; color:#081733; font-weight:bold; font-size:12px; cursor:pointer;">Comparar</button>
      </div>
    </div>
  `;
}

function bindFiltrosResultados() {
  const periodoEl = document.getElementById("filtroResultadosPeriodo");
  const parEl = document.getElementById("filtroResultadosPar");
  const direcaoEl = document.getElementById("filtroResultadosDirecao");
  const perfilEl = document.getElementById("filtroResultadosPerfil");

  if (periodoEl) periodoEl.onchange = () => { filtroResultadosPeriodo = periodoEl.value; carregarResultados(); };
  if (parEl) parEl.onchange = () => { filtroResultadosPar = parEl.value; carregarResultados(); };
  if (direcaoEl) direcaoEl.onchange = () => { filtroResultadosDirecao = direcaoEl.value; carregarResultados(); };
  if (perfilEl) perfilEl.onchange = () => { filtroResultadosPerfil = perfilEl.value; carregarResultados(); };
}

// Direção normalizada pra comparar com o filtro (BUY/SELL) - sinais
// antigos podem ter CALL/PUT (schema anterior, ver ENGINEERING.md).
function direcaoNormalizada(direcao) {
  if (direcao === "CALL") return "BUY";
  if (direcao === "PUT") return "SELL";
  return direcao;
}

// ======================================================
// CARREGAR
// ======================================================

async function carregarResultados() {
  const lista = document.getElementById("resultadosLista");
  const stats = document.getElementById("resultadosStats");
  if (!lista) return;

  bindFiltrosResultados();

  try {

    let query = db.collection("historico").orderBy("timestamp", "desc");

    // "Tudo" não aplica range nenhum (só orderBy) - continua sem
    // precisar de índice composto (orderBy sozinho nunca precisa).
    // Qualquer outro período usa o MESMO campo do orderBy pro range
    // (`where("timestamp", ...)` + `orderBy("timestamp")`), padrão já
    // usado em toda consulta deste app pra nunca cair num
    // FAILED_PRECONDITION pedindo índice novo.
    if (filtroResultadosPeriodo !== "tudo") {
      const dias = Number(filtroResultadosPeriodo);
      query = query.where("timestamp", ">=", inicioDiaBrasiliaUTCms(dias - 1));
    }

    query = query.limit(LIMITE_RESULTADOS);

    const snapshot = await query.get();

    const sinaisAbertos = obterSinaisAbertos();
    const hojeStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // Filtro por par/direção/perfil é client-side, de propósito (ver
    // comentário no topo do arquivo) - evita precisar de índice
    // composto pra cada combinação possível de filtro.
    const itensFiltrados = [];

    snapshot.forEach((doc) => {
      const sinal = doc.data();

      if (filtroResultadosPar && sinal.par !== filtroResultadosPar) return;
      if (filtroResultadosDirecao && direcaoNormalizada(sinal.direcao) !== filtroResultadosDirecao) return;
      if (filtroResultadosPerfil && sinal.perfil !== filtroResultadosPerfil) return;

      const dataObj = extrairDataObjSinal(sinal);

      cacheSinaisHistorico[doc.id] = { sinal, dataObj };

      itensFiltrados.push({ id: doc.id, sinal, dataObj });
    });

    // Estatísticas agregadas sobre o CONJUNTO JÁ FILTRADO - reflete
    // exatamente o que está sendo mostrado, não o período bruto
    // buscado do Firestore.
    let winsTotal = 0;
    let lossesTotal = 0;
    let financeiroTotal = 0;

    itensFiltrados.forEach(({ sinal }) => {
      if (sinal.resultado === "WIN") winsTotal++;
      if (sinal.resultado === "LOSS") lossesTotal++;
      if (sinal.resultado === "WIN" || sinal.resultado === "LOSS") {
        const valor = Number(sinal.resultadoFinanceiro ?? sinal.lucroEstimado);
        if (Number.isFinite(valor)) financeiroTotal += valor;
      }
    });

    const totalGeral = winsTotal + lossesTotal;
    const taxaGeral = totalGeral > 0 ? ((winsTotal / totalGeral) * 100).toFixed(1) : "0";
    const financeiroTotalFormatado = `${financeiroTotal >= 0 ? "+" : "-"}$${Math.abs(financeiroTotal).toFixed(2)}`;

    const labelPeriodo =
      filtroResultadosPeriodo === "tudo" ? "Tudo"
      : filtroResultadosPeriodo === "1" ? "Hoje"
      : `Últimos ${filtroResultadosPeriodo} dias`;

    const avisoTruncado = snapshot.size >= LIMITE_RESULTADOS
      ? `<div style="font-size:10px; color:#8c95b3; margin-top:4px;">⚠️ Mostrando só os ${LIMITE_RESULTADOS} sinais mais recentes do período - pode haver mais além desse teto.</div>`
      : "";

    if (stats) {
      stats.innerHTML = `
        <div class="card" style="padding:10px;">
          <div style="font-size:11px; color:#8c95b3; text-align:center; margin-bottom:4px;">
            ${labelPeriodo}${filtroResultadosPar ? ` · ${filtroResultadosPar}` : ""}${filtroResultadosDirecao ? ` · ${filtroResultadosDirecao === "BUY" ? "Compra" : "Venda"}` : ""}${filtroResultadosPerfil ? ` · ${LEGENDA_PERFIL[filtroResultadosPerfil] || filtroResultadosPerfil}` : ""}
          </div>
          <div style="text-align:center; font-size:17px; font-weight:bold;">
            ✅ ${winsTotal} &nbsp;&nbsp;&nbsp; ❌ ${lossesTotal} &nbsp;&nbsp;&nbsp; 🎯 ${taxaGeral}%
          </div>
          <div style="text-align:center; font-size:14px; font-weight:bold; margin-top:4px; color:${financeiroTotal >= 0 ? "#00d26a" : "#ff5252"};">
            💵 ${financeiroTotalFormatado}
          </div>
          ${avisoTruncado}
        </div>
      `;
    }

    // Agrupamento por mês -> dia, com placar (é justamente o que saiu
    // do Histórico nesta mudança - ver AJUSTE-021).
    const gruposPorData = {};
    const statsPorData = {};

    itensFiltrados.forEach(({ id, sinal, dataObj }) => {

      const isCooldown = sinal.status === "COOLDOWN" || sinal.origem === "cooldown";
      const isDestaque = app.sinalParaDestacar === id;
      const estaAberto = sinaisAbertos.includes(id) || isDestaque;
      const borderStyle = isDestaque ? 'border: 2px solid #00ff88; background: rgba(0, 255, 136, 0.1);' : '';

      const dataSinal = dataObj
        ? dataObj.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
        : "Data Indefinida";

      if (!statsPorData[dataSinal]) statsPorData[dataSinal] = { wins: 0, losses: 0, financeiro: 0 };
      if (sinal.resultado === "WIN") statsPorData[dataSinal].wins++;
      if (sinal.resultado === "LOSS") statsPorData[dataSinal].losses++;
      if (sinal.resultado === "WIN" || sinal.resultado === "LOSS") {
        const valor = Number(sinal.resultadoFinanceiro ?? sinal.lucroEstimado);
        if (Number.isFinite(valor)) statsPorData[dataSinal].financeiro += valor;
      }

      const detalheHtml = construirDetalheSinal(sinal, id, estaAberto);
      const linha = construirLinhaTabela(sinal, id, dataObj, isCooldown, borderStyle, detalheHtml, true);

      if (!gruposPorData[dataSinal]) gruposPorData[dataSinal] = "";
      gruposPorData[dataSinal] += linha;

    });

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

    let finalHtml = "";

    mesesOrdenados.forEach((chaveMes) => {

      const datasDoMes = datasOrdenadas.filter((data) => mesChaveDe(data) === chaveMes);
      const labelMes = mesLabelDe(datasDoMes[0]);
      const idMes = "resultadosMes" + chaveMes.replaceAll("/", "");

      const winsDoMes = datasDoMes.reduce((soma, data) => soma + statsPorData[data].wins, 0);
      const lossesDoMes = datasDoMes.reduce((soma, data) => soma + statsPorData[data].losses, 0);
      const totalDoMes = winsDoMes + lossesDoMes;
      const taxaDoMes = totalDoMes > 0 ? ((winsDoMes / totalDoMes) * 100).toFixed(1) : "0";
      const financeiroDoMes = datasDoMes.reduce((soma, data) => soma + statsPorData[data].financeiro, 0);
      const financeiroDoMesFormatado = `${financeiroDoMes >= 0 ? "+" : "-"}$${Math.abs(financeiroDoMes).toFixed(2)}`;

      let diasHtml = "";

      datasDoMes.forEach((data) => {
        const idData = "resultadosDia" + data.replaceAll("/", "");
        const isHoje = data === hojeStr;
        const label = isHoje ? `HOJE (${data})` : data;
        const placarDia = statsPorData[data];
        const totalDia = placarDia.wins + placarDia.losses;
        const taxaDia = totalDia > 0 ? ((placarDia.wins / totalDia) * 100).toFixed(1) : "0";
        const financeiroDiaFormatado = `${placarDia.financeiro >= 0 ? "+" : "-"}$${Math.abs(placarDia.financeiro).toFixed(2)}`;

        diasHtml += `
        <div style="margin-top:10px; border:1px solid rgba(255,255,255,.08); border-radius:10px; overflow:hidden;">
           <div
  onclick="
  const el = document.getElementById('${idData}');
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
     <span><span class="seta-grupo" style="margin-right:8px;">▶</span>${label}</span>
     <span style="font-weight:normal;">✅ ${placarDia.wins} ❌ ${placarDia.losses} 🎯 ${taxaDia}% 💵 ${financeiroDiaFormatado}</span>
      </div>
      <div id="${idData}" style="display:none; padding:0;">
        <div style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
          <table style="border-collapse:collapse; width:100%; min-width:780px; font-size:12px;">
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
      </div>
        </div>
        `;
      });

      finalHtml += `
      <div style="margin-top:16px; border:1px solid rgba(255,255,255,.12); border-radius:10px; overflow:hidden;">
         <div
onclick="
const el = document.getElementById('${idMes}');
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
   <span><span class="seta-grupo" style="margin-right:8px;">▶</span>${labelMes}</span>
   <span style="font-weight:normal; font-size:12px;">✅ ${winsDoMes} ❌ ${lossesDoMes} 🎯 ${taxaDoMes}% 💵 ${financeiroDoMesFormatado}</span>
    </div>
    <div id="${idMes}" style="display:none; padding:8px;">
      ${diasHtml}
    </div>
      </div>
      `;
    });

    lista.innerHTML = finalHtml || '<div class="list-item">Nenhum resultado encontrado com esses filtros.</div>';

    atualizarBarraComparacao();

    setTimeout(() => {
      document.querySelectorAll('#resultadosLista [data-sinal-id]').forEach(el => {
        el.onclick = null;

        el.addEventListener('click', function (e) {
          e.stopPropagation();
          const sinalId = this.dataset.sinalId;
          const detalheId = `detalhe-${sinalId}`;
          const detalhe = document.getElementById(detalheId);

          if (detalhe) {
            const estaAberto = detalhe.style.display !== 'none';
            detalhe.style.display = estaAberto ? 'none' : 'block';

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

  } catch (erro) {
    console.error("Erro resultados:", erro);
    lista.innerHTML = `<div class="list-item">Erro ao carregar resultados: ${erro.message}</div>`;
  }
}
