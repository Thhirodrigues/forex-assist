// AJUSTE-021 (24/09/2026): Histórico passa a ser só monitoramento
// (receber/verificar/fechar manualmente sinais recentes) - pedido do
// usuário depois do teste do perfil Conservador ("preciso de mais
// agilidade no Histórico pra acompanhar sinais... Histórico ficaria
// só para receber e verificar sinais"). Placar/estatísticas por
// período, comparação de sinais e filtros (par/direção/perfil) saem
// daqui e viram a aba nova "Resultados" (js/resultados.js) - mesma
// separação de responsabilidade que scripts/scanner.js já tem entre
// "gerar sinal" e "analisar histórico". `historicoComparacao`/
// `barraComparacao` (feature de comparar sinais lado a lado) e o
// card de estatísticas foram removidos daqui, não só escondidos -
// ver js/resultados.js pra onde foram.
function historicoView() {
  return `
    <div id="historicoResumo"></div>
    <div class="card">
      <div id="historicoHeader" style="position:sticky; top:0; z-index:999; background:rgba(28,32,66,.86); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); border-radius:14px; padding:10px 10px;">
        <div class="card-title">Histórico de Sinais</div>
        <div id="historicoModoToggle" style="margin-bottom:10px;"></div>
        <div id="historicoAcoes" style="margin-bottom:10px;"></div>
      </div>
      <div id="historicoLista">Carregando histórico...</div>
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

// AJUSTE-044/045 (29/09/2026): link do sinal pra corretora (XM) - pedido do
// usuário. 044: link pra área da conta (mesmo destino da notificação push
// desde a FEATURE-011). 045: o usuário achou a URL que abre direto a página
// do PAR na XM (informações do símbolo) e pediu que cada sinal use a do
// seu par: `https://my.xm.com/pt/symbol-info/EURJPY` - o par sem a barra
// no final (EUR/JPY -> EURJPY). A XM continua sem expor URL que abra a
// ORDEM pronta (par/direção/lote/TP/SL) nem logue sozinha: o link leva à
// página do instrumento, a ordem ainda é digitada na XM.
//
// A regra existe em DOIS lugares (backend Node e navegador não
// compartilham código) - manter iguais: urlCorretoraXM() aqui e
// urlXmParaPar() em scripts/pushNotifier.js. A área da conta
// (URL_CORRETORA_XM) é o fallback quando o par não gera um símbolo válido
// (também em scripts/pushNotifier.js URL_XM_MEMBER e no fallback de
// firebase-messaging-sw.js).
const URL_CORRETORA_XM = "https://my.xm.com/pt/member";
const URL_CORRETORA_XM_SIMBOLO = "https://my.xm.com/pt/symbol-info/";

// "EUR/JPY" -> ".../symbol-info/EURJPY". Só letras, 6 caracteres (todos os
// pares do app têm o formato XXX/YYY); qualquer outra coisa (par ausente,
// formato estranho) cai na área da conta em vez de montar link quebrado.
function urlCorretoraXM(par) {
  const simbolo = String(par || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  return simbolo.length === 6 ? URL_CORRETORA_XM_SIMBOLO + simbolo : URL_CORRETORA_XM;
}

// Pílula "XM ↗" ao lado do par. Registro de cooldown não é sinal
// operável - sem link. stopPropagation: a linha/card inteiro alterna o
// detalhe ao toque, o link tem que abrir a XM SEM expandir nem fechar o
// detalhe (mesmo padrão dos checkboxes da tabela).
function linkCorretoraXM(sinal, isCooldown) {
  if (isCooldown) return "";
  const url = urlCorretoraXM(sinal.par);
  const paginaDoPar = url !== URL_CORRETORA_XM;
  const titulo = paginaDoPar
    ? `Abre a página de ${sinal.par} na XM (não abre a ordem pronta - a XM não permite isso por link)`
    : "Abre a área da sua conta na XM (não abre a ordem pronta - a XM não permite isso por link)";
  return ` <a href="${url}" target="_blank" rel="noopener noreferrer"
      onclick="event.stopPropagation();"
      title="${titulo}"
      style="display:inline-block; margin-left:6px; padding:1px 6px; border-radius:6px; background:rgba(58,224,232,.15); color:#3ae0e8; font-size:10px; font-weight:bold; text-decoration:none; vertical-align:middle;">XM ↗</a>`;
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

// AJUSTE-021 (24/09/2026): comparação de sinais (seleção/tabela lado a
// lado) mudou de arquivo - ver js/resultados.js `abrirComparacao()` e
// companhia. `cacheSinaisHistorico` continua aqui (usado pelo
// fechamento manual, que fica no Histórico) e também é escrito por
// js/resultados.js (mesmo cache, chave = docId, sem conflito - ver
// comentário lá).
let cacheSinaisHistorico = {};

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
//
// AJUSTE-039 (28/09/2026): desde esta data só RR_PAR (TP 1,5x do SL no
// GBP/USD, AJUSTE-004) altera o configurado. Os outros três rótulos
// ficam aqui só pra sinais antigos, salvos antes da mudança.
const LEGENDA_AJUSTE_MERCADO = {
  REDUZIR_EXPOSICAO: "ADX fraco - tendência sem força suficiente",
  MERCADO_LENTO: "baixa volatilidade (ATR baixo)",
  EXPECTATIVA_NEGATIVA: "expectativa histórica negativa reduziu o lote",
  RR_PAR: "TP 1,5x o SL, regra específica do GBP/USD"
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
    ? "#5ef8b7"
    : sinal.resultado === "LOSS"
      ? "#ff9891"
      : "#3ae0e8";

  const yEntrada = (altura - pad - ((entrada - min) / span) * (altura - pad * 2)).toFixed(1);

  const linhaEntrada = Number.isFinite(entrada)
    ? `<line x1="0" y1="${yEntrada}" x2="${largura}" y2="${yEntrada}" stroke="#bcc4d5" stroke-width="1" stroke-dasharray="4,3" />`
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
      <div style="font-weight:bold; color:#bcc4d5; margin-bottom:8px;">
        📈 Movimento do Preço (entrada → encerramento)
      </div>
      <div style="position:relative;">
        <svg viewBox="0 0 ${largura} ${altura}" preserveAspectRatio="none" style="width:100%; height:90px; display:block; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:8px;">
          ${linhaEntrada}
          <polyline points="${pontos}" fill="none" stroke="${corLinha}" stroke-width="2" />
        </svg>
        <div style="position:absolute; top:3px; left:5px; font-size:10px; color:#bcc4d5;">${formatarPreco(max)}</div>
        <div style="position:absolute; top:3px; right:5px; font-size:10px; color:#bcc4d5;">${formatarPreco(max)}</div>
        <div style="position:absolute; bottom:3px; left:5px; font-size:10px; color:#bcc4d5;">${formatarPreco(min)}</div>
        <div style="position:absolute; bottom:3px; right:5px; font-size:10px; color:#bcc4d5;">${formatarPreco(min)}</div>
      </div>
      <div style="font-size:10px; color:#bcc4d5; margin-top:4px; text-align:center;">
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
    ? "rgba(94,248,183,.10)"
    : score < 0
    ? "rgba(255,152,145,.10)"
    : "rgba(255,255,255,.04)";

  const corBorda = score > 0
    ? "rgba(94,248,183,.3)"
    : score < 0
    ? "rgba(255,152,145,.3)"
    : "rgba(255,255,255,.08)";

  const corTexto = score > 0
    ? "#5ef8b7"
    : score < 0
    ? "#ff9891"
    : "#bcc4d5";

  const sinalScore = score > 0 ? "+" : "";

  return `
    <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:${corFundo}; border:1px solid ${corBorda}; font-size:11px; color:${corTexto};">
      🧠 SMC: Order Block de ${direcao} detectado${naZona ? " (preço na zona)" : " (fora da zona)"}${score !== 0 ? ` — ${sinalScore}${score} no score` : ""}
    </div>
  `;

}

// AJUSTE-025 (26/09/2026): mesmo padrão do bannerSMC acima, pro
// padrão de candlestick clássico (Fase 1 - Martelo/Enforcado/Martelo
// Invertido/Estrela Cadente/Engolfo de Alta/Engolfo de Baixa, ver
// scripts/candlePatterns.js). Sinais salvos antes desta mudança não
// têm `candlestickDetectado` - não renderiza nada, não é erro.
const LEGENDA_CANDLESTICK = {
  MARTELO: "🔨 Martelo",
  ENFORCADO: "🪢 Enforcado",
  MARTELO_INVERTIDO: "🔨 Martelo Invertido",
  ESTRELA_CADENTE: "🌠 Estrela Cadente",
  ENGOLFO_ALTA: "📈 Engolfo de Alta",
  ENGOLFO_BAIXA: "📉 Engolfo de Baixa"
};

function bannerCandlestick(sinal) {

  if (!sinal.candlestickDetectado) return "";

  const { padrao, direcao } = sinal.candlestickDetectado;

  const score = Number(sinal.candlestickScore) || 0;

  const corFundo = score > 0
    ? "rgba(94,248,183,.10)"
    : score < 0
    ? "rgba(255,152,145,.10)"
    : "rgba(255,255,255,.04)";

  const corBorda = score > 0
    ? "rgba(94,248,183,.3)"
    : score < 0
    ? "rgba(255,152,145,.3)"
    : "rgba(255,255,255,.08)";

  const corTexto = score > 0
    ? "#5ef8b7"
    : score < 0
    ? "#ff9891"
    : "#bcc4d5";

  const sinalScore = score > 0 ? "+" : "";
  const nomePadrao = LEGENDA_CANDLESTICK[padrao] || padrao;

  return `
    <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:${corFundo}; border:1px solid ${corBorda}; font-size:11px; color:${corTexto};">
      🕯️ Candlestick: ${nomePadrao} (${direcao})${score !== 0 ? ` — ${sinalScore}${score} no score` : ""}
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
        style="padding:6px 12px; border:none; border-radius:8px; background:rgba(255,255,255,.08); color:#f9fafd; font-size:11px; cursor:pointer;"
      >
        🔒 Fechei Manualmente na Corretora
      </button>
      <div style="font-size:10px; color:#bcc4d5; margin-top:4px;">
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
    "border-radius:4px; color:#f9fafd; font-size:13px; text-align:center; padding:3px; box-sizing:border-box;";

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
        <div id="avisoCalculoManual-${docId}" style="font-size:10px; color:#bcc4d5; margin-bottom:4px;">
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
            style="flex:1; padding:6px; border:none; border-radius:6px; background:rgba(94,248,183,.22); color:#f9fafd; font-size:12px; cursor:pointer;"
          >
            ✅ Confirmar
          </button>
          <button
            onclick="event.stopPropagation(); carregarHistorico();"
            style="flex:1; padding:6px; border:none; border-radius:6px; background:rgba(255,255,255,.08); color:#f9fafd; font-size:12px; cursor:pointer;"
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

  // AJUSTE-022 (25/09/2026): mesma contagem incremental do fechamento
  // automático (js/checker.js) - fechamento manual também precisa
  // manter winsTotal/lossesTotal em dia, senão o Dashboard ficaria
  // sistematicamente errado pra toda operação fechada manualmente.
  await configRef.update({

    saldoSimulado: saldoDepois,

    ...(resultado === "WIN"
      ? { winsTotal: firebase.firestore.FieldValue.increment(1) }
      : {}),

    ...(resultado === "LOSS"
      ? { lossesTotal: firebase.firestore.FieldValue.increment(1) }
      : {})

  });

  atualizarTelaAposOperacaoReal();

};

function bannerConfiguracaoAjustada(sinal) {

  const decisao = sinal.financeiro?.decisaoMercado?.decisao;

  if (!decisao || decisao === "MANTER") {
    return `
      <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:rgba(94,248,183,.08); border:1px solid rgba(94,248,183,.25); font-size:11px; color:#5ef8b7;">
        ✅ Lote/TP/SL conforme configurado na tela de Config - sem ajuste automático.
      </div>
    `;
  }

  const motivo = LEGENDA_AJUSTE_MERCADO[decisao] || decisao;

  return `
    <div style="margin-bottom:12px; padding:8px 10px; border-radius:8px; background:rgba(58,224,232,.10); border:1px solid rgba(58,224,232,.3); font-size:11px; color:#3ae0e8;">
      🤖 Lote/TP/SL ajustados automaticamente pelo sistema (${motivo}) - não é o valor bruto configurado manualmente.
    </div>
  `;

}

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

// AJUSTE-028 (26/09/2026): cascata de aprovação - enquanto o perfil
// CONSERVADOR configurado não consegue acumular a própria história
// (RIGOR_PERFIL em statisticsEngine.js, "ovo e galinha" registrado em
// PENDENCIAS-ESTRATEGICAS-RMI.md seção 6), o app tenta CONSERVADOR e,
// se não bater, cai pra BALANCEADO/AGRESSIVO - sinal.perfil já reflete
// o nível que REALMENTE aprovou (não necessariamente o configurado).
// Este banner só aparece quando os dois divergem, deixando isso visível
// ANTES do usuário decidir se opera, exatamente como pedido: "avisar:
// olha, analisado no modo agressivo/balanceado".
// AJUSTE-052 (01/10/2026): o texto do aviso de cascata deixou de ser um banner
// amarelo dentro do detalhe - virou o conteúdo do ⓘ da etiqueta do modo
// (ver etiquetasInfoSinal). Mesma frase de sempre, sem emoji.
function textoCascata(sinal) {

  if (!sinal.rebaixadoDaCascata) return "";

  const perfilAprovadoLabel = LEGENDA_PERFIL[sinal.perfil] || sinal.perfil;
  const perfilConfiguradoLabel = LEGENDA_PERFIL[sinal.perfilConfigurado] || sinal.perfilConfigurado;

  return `Este sinal NÃO atingiu o critério de ${perfilConfiguradoLabel} (configurado em Config) - foi aprovado pelo critério mais permissivo de ${perfilAprovadoLabel}. Avalie sua própria confiança antes de operar.`;

}

function escaparAtributoHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// AJUSTE-052 (01/10/2026): pedido do usuário - no lugar do texto vermelho
// grande (e do amarelo da cascata) o card mostra uma linha de etiquetas
// curtas: "Sem histórico ⓘ", "● Balanceado ⓘ" e "Lote". Tocar no ⓘ mostra o
// texto completo logo abaixo (o mesmo que antes ocupava o card inteiro);
// tocar de novo, ou na outra etiqueta, troca/fecha. O conteúdo vem dos
// mesmos campos de antes (avisoExpectativa, perfil/rebaixadoDaCascata,
// lote) - nada de cálculo novo. Nenhuma etiqueta -> string vazia.
function etiquetasInfoSinal(sinal, docId) {

  const etiquetas = [];

  if (sinal.avisoExpectativa?.ativo) {
    etiquetas.push({
      chave: "expectativa",
      tom: "coral",
      rotulo: sinal.avisoExpectativa.historicoInsuficiente ? "Sem histórico" : "Expectativa negativa",
      texto: sinal.avisoExpectativa.mensagem
    });
  }

  if (sinal.perfil) {
    const rebaixado = !!sinal.rebaixadoDaCascata;
    etiquetas.push({
      chave: "modo",
      tom: rebaixado ? "ambar" : "neutro",
      rotulo: LEGENDA_PERFIL[sinal.perfil] || sinal.perfil,
      texto: rebaixado
        ? textoCascata(sinal)
        : `Aprovado no critério ${(LEGENDA_PERFIL[sinal.perfil] || sinal.perfil).split(" ").slice(1).join(" ") || sinal.perfil}, o mesmo configurado em Config.`
    });
  }

  const lote = sinal.lote ?? sinal.loteUtilizado;
  const temLote = lote != null && lote !== "";

  if (!etiquetas.length && !temLote) return "";

  const botoes = etiquetas.map(e => `
      <button type="button" class="hs-tag hs-tag--${e.tom}" data-info-de="${docId}" data-chave="${e.chave}"
              data-tom="${e.tom}" data-info="${escaparAtributoHtml(e.texto)}" aria-expanded="false"
              onclick="alternarInfoSinal(event, '${docId}', this)">
        ${e.rotulo}<span class="hs-tag-i" aria-hidden="true">i</span>
      </button>`).join("");

  return `
    <div class="hs-tags" onclick="event.stopPropagation();">
      ${botoes}
      ${temLote ? `<span class="hs-tag hs-tag--lote">📦 Lote ${lote}</span>` : ""}
    </div>
    <div class="hs-aviso" id="info-${docId}" hidden role="status" onclick="event.stopPropagation();"></div>
  `;

}

window.alternarInfoSinal = function (ev, docId, botao) {

  ev.stopPropagation();

  const painel = document.getElementById(`info-${docId}`);
  if (!painel || !botao) return;

  const jaAberto = !painel.hidden && painel.dataset.chave === botao.dataset.chave;

  document.querySelectorAll(`[data-info-de="${docId}"]`).forEach(b => b.setAttribute("aria-expanded", "false"));

  if (jaAberto) {
    painel.hidden = true;
    painel.dataset.chave = "";
    return;
  }

  painel.textContent = botao.dataset.info || "";
  painel.dataset.chave = botao.dataset.chave;
  painel.className = `hs-aviso hs-aviso--${botao.dataset.tom || "neutro"}`;
  painel.hidden = false;
  botao.setAttribute("aria-expanded", "true");

};

// AJUSTE-052 (01/10/2026): janela "Risco do sinal" do detalhe. Reúne o que
// antes estava espalhado em "Configuração Utilizada" (TP/SL em US$) e na
// grade de saldo, mais as distâncias em pips e o risco/retorno. O PREÇO de
// TP/SL não é gravado no sinal: é calculado aqui a partir da entrada e dos
// pips de financeiro.tpPips/slPips (os mesmos que o checker usa pra fechar),
// por isso aparece com "≈". Campo ausente (sinal antigo) -> "--".
function blocoRiscoSinal(sinal) {

  const fin = sinal.financeiro || {};
  const tpPips = Math.abs(Number(fin.tpPips));
  const slPips = Math.abs(Number(fin.slPips));
  const entrada = Number(sinal.precoEntrada);
  const tamanhoPip = String(sinal.par || "").includes("JPY") ? 0.01 : 0.0001;
  const sentido = (sinal.direcao === "BUY" || sinal.direcao === "CALL") ? 1 : -1;

  const precoAlvo = (pips, lado) =>
    Number.isFinite(entrada) && Number.isFinite(pips)
      ? formatarPrecoPar(entrada + lado * sentido * pips * tamanhoPip, sinal.par)
      : null;

  const usd = v => (v == null || v === "") ? "--" : `$${v}`;
  const pipsTxt = v => Number.isFinite(v) ? `${v.toFixed(1)} pips` : "--";

  const tpPreco = precoAlvo(tpPips, 1);
  const slPreco = precoAlvo(slPips, -1);

  const rr = Number.isFinite(Number(fin.rewardRisk))
    ? Number(fin.rewardRisk)
    : (Number(sinal.tpUSD) > 0 && Number(sinal.slUSD) > 0 ? Number(sinal.tpUSD) / Number(sinal.slUSD) : null);

  const resultadoValor = sinal.resultadoFinanceiro ?? sinal.lucroEstimado;
  const classeResultado = sinal.resultado === "WIN" ? "hs-risco-v--ganho" : sinal.resultado === "LOSS" ? "hs-risco-v--perda" : "";
  const classeDepois = sinal.saldoDepois > sinal.saldoAntes ? "hs-risco-v--ganho" : sinal.saldoDepois < sinal.saldoAntes ? "hs-risco-v--perda" : "";

  const linha = (rotulo, valor, classe = "") =>
    `<div class="hs-risco-linha"><dt>${rotulo}</dt><dd class="${classe}">${valor}</dd></div>`;

  return `
    <section class="hs-risco" aria-label="Risco do sinal" onclick="event.stopPropagation();">
      <h4 class="hs-risco-titulo">Risco do sinal</h4>
      <dl class="hs-risco-grade">
        ${linha("Take Profit", `${usd(sinal.tpUSD)}${tpPreco ? ` · ≈ ${tpPreco}` : ""}`, "hs-risco-v--ganho")}
        ${linha("Stop Loss", `${usd(sinal.slUSD)}${slPreco ? ` · ≈ ${slPreco}` : ""}`, "hs-risco-v--perda")}
        ${linha("Distância até o TP", pipsTxt(tpPips))}
        ${linha("Distância até o SL", pipsTxt(slPips))}
        ${linha("Risco/retorno", rr == null ? "--" : `1 : ${Number(rr.toFixed(2))}`)}
        ${linha("Saldo antes", sinal.saldoAntes == null ? "--" : "$" + Number(sinal.saldoAntes).toFixed(2))}
        ${linha("Resultado", resultadoValor == null ? "--" : `${resultadoValor >= 0 ? "+" : "-"}$${Math.abs(Number(resultadoValor)).toFixed(2)}`, classeResultado)}
        ${linha("Saldo depois", sinal.saldoDepois == null ? "--" : "$" + Number(sinal.saldoDepois).toFixed(2), classeDepois)}
      </dl>
      ${bannerConfiguracaoAjustada(sinal)}
    </section>
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
// AJUSTE-051 (30/09/2026): o padrão passou de TABELA para a LISTA no formato
// do projeto Aurora Glass (linhas de vidro com marcador, agrupadas por dia).
// A tabela continua a um toque, no botão "Ver como tabela" - se preferir a
// tabela como padrão, é só trocar este valor para true.
let modoTabela = false;

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

// AJUSTE-021 (24/09/2026): extraída de dentro de carregarHistorico()
// pra ser reusada por js/resultados.js também (mesmo parsing de
// timestamp/horario/data que já existia, sem duplicar).
function extrairDataObjSinal(sinal) {
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

  return dataObj;
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
    <button onclick="alternarModoTabela()" style="padding:6px 12px; border:none; border-radius:8px; background:rgba(58,224,232,.15); color:#3ae0e8; font-size:12px; cursor:pointer;">
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

// ======================================================
// FILTRO POR RESULTADO NO CABEÇALHO DA TABELA (AJUSTE-043, 29/09/2026)
// ------------------------------------------------------
// Pedido do usuário: clicar no NOME "Resultado" do cabeçalho da coluna e
// ficar na tela só WIN, só LOSS ou só Pendente. Cada toque passa pro
// próximo estado: todos -> ✅ WIN -> ❌ LOSS -> ⏳ Pendente -> todos.
//
// Decisões de desenho:
//  - Esconde/mostra as LINHAS já desenhadas (display), sem chamar
//    carregarHistorico() - recarregar fecharia os dias/meses que o
//    usuário abriu e refaria a consulta no Firestore a cada toque.
//  - Como a lista É redesenhada de vez em quando (troca de aba, Carregar
//    mais, fechar operação), o estado fica numa variável de módulo e
//    aplicarFiltroHistoricoResultado() roda de novo no fim de cada
//    carregarHistorico().
//  - Dia/mês sem nenhuma linha visível some inteiro (senão ficam
//    cabeçalhos vazios); volta quando o filtro sai.
//  - Só vale pra TABELA (é onde existe o cabeçalho). No modo lista
//    (cards) não há o que clicar, então o filtro não é aplicado lá - mas
//    o estado é mantido e volta ao reabrir a tabela.
//  - AJUSTE-046: barra "Filtro ativo ... [✕ Mostrar todos]" no topo da
//    lista (fora dos dias) - a saída que faltava quando o filtro esconde
//    tudo.
//  - Só vê o que já está carregado (hoje + ontem, mais os dias de
//    "Carregar mais") - filtrar não busca dia mais antigo sozinho.
//  - Vive na sessão da página (como modoTabela/diasCarregados): não
//    sobrevive a um reload.
// ======================================================
let filtroHistoricoResultado = "";

// AJUSTE-051: filtro por par (chips do resumo, formato do projeto Aurora Glass).
let filtroHistoricoPar = "";

const CICLO_FILTRO_HISTORICO = ["", "WIN", "LOSS", "PENDENTE"];
const INDICADOR_FILTRO_HISTORICO = { "": "▾", WIN: "✅", LOSS: "❌", PENDENTE: "⏳" };
const ROTULO_FILTRO_HISTORICO = { WIN: "✅ WIN", LOSS: "❌ LOSS", PENDENTE: "⏳ Pendente" };

function thResultadoFiltravel() {
  const ativo = !!filtroHistoricoResultado;
  return `<th class="th-filtro-resultado" onclick="alternarFiltroHistoricoResultado()"
      title="Toque pra filtrar: só WIN, só LOSS, só Pendente, ou todos"
      style="padding:6px 8px; cursor:pointer; user-select:none; white-space:nowrap;${ativo ? " background:rgba(58,224,232,.22);" : ""}">Resultado <span class="ind-filtro-resultado">${INDICADOR_FILTRO_HISTORICO[filtroHistoricoResultado]}</span></th>`;
}

window.alternarFiltroHistoricoResultado = function () {
  const i = CICLO_FILTRO_HISTORICO.indexOf(filtroHistoricoResultado);
  filtroHistoricoResultado = CICLO_FILTRO_HISTORICO[(i + 1) % CICLO_FILTRO_HISTORICO.length];
  aplicarFiltroHistoricoResultado();
};

// AJUSTE-046 (29/09/2026): saída garantida do filtro. Sem ela, filtrar por
// um resultado que não existe (ex.: Pendente sem nenhum aberto) escondia
// TODOS os dias - e o cabeçalho "Resultado", que é o único jeito de mudar
// o filtro, some junto: o usuário ficou preso numa tela só com a mensagem
// (print do usuário, celular em modo compacto). Agora uma barra fixa no
// topo da lista, fora dos dias, aparece sempre que há filtro ligado e tem
// o botão "Mostrar todos".
window.limparFiltroHistoricoResultado = function () {
  filtroHistoricoResultado = "";
  aplicarFiltroHistoricoResultado();
};

function aplicarFiltroHistoricoResultado() {
  const raiz = document.getElementById("historicoLista");
  if (!raiz) return;

  const filtro = filtroHistoricoResultado;
  let linhasTotal = 0;
  let linhasVisiveis = 0;

  raiz.querySelectorAll("tr[data-resultado-filtro]").forEach((tr) => {
    linhasTotal++;
    const okPar = !filtroHistoricoPar || (cacheSinaisHistorico[tr.dataset.sinalId]?.sinal?.par === filtroHistoricoPar);
    const mostra = (!filtro || tr.dataset.resultadoFiltro === filtro) && okPar;
    if (mostra) linhasVisiveis++;

    tr.style.display = mostra ? "" : "none";

    // A linha de detalhe (RSI/EMA/gráfico) vem logo depois - vai junto.
    const detalhe = tr.nextElementSibling;
    if (detalhe && detalhe.dataset.detalheDe === tr.dataset.sinalId) {
      detalhe.style.display = mostra ? "" : "none";
    }
  });

  // Dia sem nenhuma linha visível some; mês sem nenhum dia visível some.
  // Sem tabela dentro (modo lista) não há nada a decidir - não mexe.
  raiz.querySelectorAll(".hist-dia").forEach((dia) => {
    const linhas = dia.querySelectorAll("tr[data-resultado-filtro]");
    if (!linhas.length) return;
    const algumaVisivel = !filtro || [...linhas].some((tr) => tr.style.display !== "none");
    dia.style.display = algumaVisivel ? "" : "none";
  });

  raiz.querySelectorAll(".hist-mes").forEach((mes) => {
    const dias = mes.querySelectorAll(".hist-dia");
    if (!dias.length) return;
    const algumDiaVisivel = !filtro || [...dias].some((d) => d.style.display !== "none");
    mes.style.display = algumDiaVisivel ? "" : "none";
  });

  // Barra do filtro ativo: fora dos grupos de dia (não some junto com
  // eles), com o botão de saída. No modo lista o filtro não é aplicado
  // (não há cabeçalho), então a barra também não aparece.
  const barra = document.getElementById("historicoFiltroBarra");
  if (barra) {
    if (!filtro || !modoTabela) {
      barra.style.display = "none";
    } else {
      const texto = linhasVisiveis === 0
        ? `Nenhum sinal ${ROTULO_FILTRO_HISTORICO[filtro]} nos dias carregados.`
        : `Filtro ativo: ${ROTULO_FILTRO_HISTORICO[filtro]} - ${linhasVisiveis} ${linhasVisiveis === 1 ? "sinal" : "sinais"}.`;
      barra.innerHTML = `
        <span>${texto}</span>
        <button onclick="limparFiltroHistoricoResultado()" style="flex-shrink:0; padding:6px 10px; border:none; border-radius:8px; background:#3ae0e8; color:#060c1e; font-weight:bold; font-size:12px; cursor:pointer;">✕ Mostrar todos</button>
      `;
      barra.style.display = "flex";
    }
  }

  raiz.querySelectorAll(".th-filtro-resultado").forEach((th) => {
    const ind = th.querySelector(".ind-filtro-resultado");
    if (ind) ind.textContent = INDICADOR_FILTRO_HISTORICO[filtro];
    th.style.background = filtro ? "rgba(58,224,232,.22)" : "";
  });
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
// AJUSTE-021 (24/09/2026): ganhou o parâmetro opcional `comCmp` - a
// coluna de comparação (checkbox "Cmp") foi removida do Histórico
// (mudou pra Resultados, ver js/resultados.js), mas o resto da linha é
// idêntico nas duas telas - reusar esta mesma função de lá, passando
// `comCmp: true`, evita duplicar HTML/lógica em dois arquivos.
// AJUSTE-042/043 (29/09/2026): ganhou o parâmetro opcional `comPrecos` -
// duas colunas novas, "Preço Entrada" e "Preço Final", entre "Modo" e
// "Favor", pedido do usuário PARA A TABELA DO HISTÓRICO (o primeiro
// entendimento, em Resultados, estava errado e foi desfeito - ver
// AJUSTE-043). Flag separada de `comCmp` de propósito (só Resultados tem o
// checkbox de comparação; só o Histórico liga as colunas de preço).
// AJUSTE-043: a linha também carrega `data-resultado-filtro` (WIN/LOSS/
// PENDENTE/COOLDOWN) e a linha de detalhe `data-detalhe-de`, pro filtro
// do cabeçalho "Resultado" esconder/mostrar as duas juntas sem recarregar.
function construirLinhaTabela(sinal, docId, dataObj, isCooldown, borderStyle, detalheHtml, comCmp, comPrecos) {
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
      // AJUSTE-034 (28/09/2026): mesmo padrão dos dois acima - sinal
      // aprovado pelo CONSERVADOR com histórico ainda abaixo de 30
      // operações no par.
      : sinal.avisoHistorico?.ativo
        ? `<span title="${String(sinal.avisoHistorico.mensagem).replace(/"/g, "&quot;")}"> 🔬</span>`
        : "";

  const usd = sinal.resultadoFinanceiro;
  const usdFormatado = usd == null ? "--" : `${usd >= 0 ? "+" : "-"}$${Math.abs(Number(usd)).toFixed(2)}`;

  // AJUSTE-002 (17/09/2026): mesma correção da tabela de comparação
  // (ver comentário lá) - cor segue o resultado WIN/LOSS pra sinal já
  // ENCERRADA, não o sinal bruto do número. Só usa o sinal do número
  // pra PENDENTE (P&L flutuante em tempo real, sem resultado ainda).
  const usdCor = usd == null
      ? "#f9fafd"
      : sinal.resultado === "WIN" ? "#5ef8b7"
      : sinal.resultado === "LOSS" ? "#ff9891"
      : (usd >= 0 ? "#5ef8b7" : "#ff9891");

  // Pedido do usuário (12/09/2026): dá pra ver de relance, olhando a
  // tabela toda, quais operações quase bateram TP ou quase escaparam
  // do SL - mesmos campos maxPipsFavor/maxPipsContra que checker.js já
  // grava (ver comparação de sinais, FEATURE-015), agora também na
  // tabela principal do Histórico, não só na comparação.
  const favor = sinal.maxPipsFavor;
  const contra = sinal.maxPipsContra;
  const favorFormatado = favor != null ? Number(favor).toFixed(1) : "--";
  const contraFormatado = contra != null ? Number(contra).toFixed(1) : "--";

  // AJUSTE-034 (28/09/2026): pedido do usuário - bolinha da cor do
  // MODO que realmente aprovou o sinal (🟢 Agressivo/🔵 Balanceado/
  // 🟡 Conservador, mesmas cores de LEGENDA_PERFIL), visível na
  // tabela principal sem precisar abrir o detalhe. `sinal.perfil` já
  // é o nível REALMENTE aprovado desde o AJUSTE-028 (não
  // necessariamente o configurado - ver textoCascata) - correto usar
  // direto aqui. "-" pra sinais salvos antes do PENTE-FINO-001
  // (perfil nunca foi persistido).
  const perfilDotTitle = sinal.perfil
    ? `Aprovado no modo ${LEGENDA_PERFIL[sinal.perfil] || sinal.perfil}${sinal.rebaixadoDaCascata ? ` (configurado: ${LEGENDA_PERFIL[sinal.perfilConfigurado] || sinal.perfilConfigurado})` : ""}`
    : "Perfil não registrado neste sinal";
  const perfilDot = sinal.perfil
    ? (LEGENDA_PERFIL[sinal.perfil] || "⚪").split(" ")[0]
    : "-";

  // AJUSTE-042: mesma regra do card de detalhe (miniCard ENTRADA/
  // SAÍDA, construirDetalheSinal) - preço final = precoSaida (fechamento
  // manual) ?? precoFechamento (fechamento do checker); "--" enquanto o
  // sinal está pendente ou no registro de cooldown (sem preço).
  const categoriaResultado = isCooldown
    ? "COOLDOWN"
    : (sinal.resultado === "WIN" ? "WIN" : sinal.resultado === "LOSS" ? "LOSS" : "PENDENTE");

  const precoEntradaFormatado = formatarPrecoPar(sinal.precoEntrada, sinal.par);
  const precoFinalFormatado = formatarPrecoPar(sinal.precoSaida ?? sinal.precoFechamento, sinal.par);

  return `
    <tr id="sinal-${docId}" data-sinal-id="${docId}" data-resultado-filtro="${categoriaResultado}" style="cursor:pointer; ${borderStyle}">
      <td style="padding:8px; white-space:nowrap;">${horario}</td>
      <td style="padding:8px; white-space:nowrap;">${isCooldown ? "🚫" : (sinal.direcao === "BUY" || sinal.direcao === "CALL" ? "🟢" : "🔴")} ${sinal.par || "-"}${linkCorretoraXM(sinal, isCooldown)}</td>
      <td style="padding:8px; white-space:nowrap;">${direcaoLabel}</td>
      <td style="padding:8px; white-space:nowrap;">${tempoLabel}</td>
      <td style="padding:8px; white-space:nowrap;">${resultadoLabel}${avisoIcone}</td>
      <td style="padding:8px; text-align:center;" title="${perfilDotTitle.replace(/"/g, "&quot;")}">${perfilDot}</td>
      ${comPrecos ? `
      <td style="padding:8px; text-align:right; white-space:nowrap;">${precoEntradaFormatado}</td>
      <td style="padding:8px; text-align:right; white-space:nowrap;">${precoFinalFormatado}</td>
      ` : ""}
      <td style="padding:8px; text-align:right; color:#5ef8b7;">${favorFormatado}</td>
      <td style="padding:8px; text-align:right; color:#ff9891;">${contraFormatado}</td>
      <td style="padding:8px; text-align:right; font-weight:bold; color:${usdCor};">${usdFormatado}</td>
      <td style="padding:8px; text-align:center;" onclick="event.stopPropagation();">
        <input type="checkbox"
          ${sinal.operacaoReal ? "checked" : ""}
          ${sinal.status !== "ENCERRADA" ? "disabled" : ""}
          onchange="alternarOperacaoReal('${docId}', this.checked);">
      </td>
      ${comCmp ? `
      <td style="padding:8px; text-align:center;" onclick="event.stopPropagation();">
        ${!isCooldown ? `
          <input type="checkbox" class="chk-comparar" data-par="${sinal.par || ""}"
            ${sinaisComparacaoSelecionados.has(docId) ? "checked" : ""}
            onchange="alternarSelecaoComparacao(this, '${docId}')" title="Selecionar pra comparar">
        ` : ""}
      </td>
      ` : ""}
    </tr>
    <tr data-detalhe-de="${docId}">
      <td colspan="${10 + (comCmp ? 1 : 0) + (comPrecos ? 2 : 0)}" style="padding:0; border:none;">
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
      <div style="font-size:10px; color:#bcc4d5;">${emoji} ${label}</div>
      <div ${idAttr || ""} style="margin-top:2px; font-size:15px; font-weight:bold; color:${cor || "#f9fafd"};">${valorHtml}</div>
    </div>
  `;
}

// AJUSTE-044 (29/09/2026): corrigido um <div> sem fechar neste template
// (o <div style="margin-top:12px;"> da "Configuração Utilizada" nunca
// tinha o seu </div> - o último </div> fechava ELE, e o #detalhe ficava
// aberto). Na tabela isso passava despercebido (o </td> fecha tudo), mas
// no modo lista cada card engolia o seguinte (cards aninhados). Achado
// testando o link da XM; erro antigo, não introduzido por ele.
// AJUSTE-052 (01/10/2026): pedido do usuário (card fechado + detalhe):
//  - FORA do detalhe, sempre visível no card da lista: etiquetas (ⓘ) e as
//    duas linhas ENTRADA/SAÍDA/RSI e EMA 9/21/200 (`resumoNumerosSinal`).
//  - DENTRO do detalhe: janela "Risco do sinal" (TP, SL, distâncias,
//    risco/retorno, saldo antes/resultado/saldo depois), depois os avisos
//    (SMC, candle), fechamento manual, caminho do preço e "Operação Real".
// Saíram: o banner amarelo da cascata (virou o ⓘ da etiqueta do modo) e o
// "Gerado em: perfil/janela" (removido a pedido).
// `incluirResumo`: na tabela e em Resultados não existe a área fechada do
// card, então etiquetas + números entram no topo do detalhe; o card da lista
// passa false e os desenha fora.
function resumoNumerosSinal(sinal, docId) {

  // Entrada e Saída ganham IDs (`valorEntrada-`/`valorSaida-`) pra virarem
  // campo editável no fechamento manual (ativarEdicaoFechamentoManual),
  // sem reconstruir o resto do card.
  const gradeAberta = `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px;">`;

  return `
${gradeAberta}
${miniCard("💰", "ENTRADA", formatarPrecoPar(sinal.precoEntrada, sinal.par), "#f9fafd", `id="valorEntrada-${docId}"`)}
${miniCard("🏁", "SAÍDA", formatarPrecoPar(sinal.precoSaida ?? sinal.precoFechamento, sinal.par), "#f9fafd", `id="valorSaida-${docId}"`)}
${miniCard("📉", "RSI", (sinal.indicadores?.rsi ?? sinal.rsi) != null ? Number(sinal.indicadores?.rsi ?? sinal.rsi).toFixed(2) : "--", "#3ae0e8")}
</div>

${gradeAberta}
${miniCard("📈", "EMA 9", formatarPrecoPar(sinal.indicadores?.ema9 ?? sinal.ema9, sinal.par))}
${miniCard("📊", "EMA 21", formatarPrecoPar(sinal.indicadores?.ema21 ?? sinal.ema21, sinal.par))}
${miniCard("🏠", "EMA 200", formatarPrecoPar(sinal.indicadores?.ema200 ?? sinal.ema200, sinal.par))}
</div>
  `;

}

function construirDetalheSinal(sinal, docId, estaAberto, incluirResumo = true) {
  const detalheId = `detalhe-${docId}`;

  return `
          <div id="${detalheId}" style="display: ${estaAberto ? 'block' : 'none'}; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px; color:#bcc4d5;">

${incluirResumo ? etiquetasInfoSinal(sinal, docId) + resumoNumerosSinal(sinal, docId) : ""}

${blocoRiscoSinal(sinal)}

${bannerSMC(sinal)}

${bannerCandlestick(sinal)}

${botaoFecharManualmente(sinal, docId)}

${sinal.status === "ENCERRADA" ? renderizarCaminhoPrecos(sinal) : ""}

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
    ? '<div style="font-size:11px;color:#bcc4d5;margin-top:4px;">Disponível após o encerramento da operação</div>'
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
      "border:none; border-radius:50%; background:rgba(255,255,255,.15); color:#f9fafd; " +
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

// ======================================================
// LISTA NO FORMATO DO PROJETO AURORA GLASS (AJUSTE-051)
// ------------------------------------------------------
// Linha de vidro com marcador redondo, par, meta e resultado, como no
// Painel. O detalhe rico (construirDetalheSinal: marcação manual, operação
// real, gráfico, avisos) é o MESMO de sempre e abre no toque na linha,
// pelo listener genérico de [data-sinal-id] - nada dele foi reescrito.
// ======================================================
function construirItemListaAurora(sinal, docId, dataObj, isCooldown, borderStyle, detalheHtml) {

  const compra = sinal.direcao === "BUY" || sinal.direcao === "CALL";
  const tom = compra ? { cor: "var(--pa-ganho)", fundo: "var(--pa-ganho-suave)", rot: "Compra", icone: PN_ICONE.compra }
                     : { cor: "var(--pa-perda)", fundo: "var(--pa-perda-suave)", rot: "Venda", icone: PN_ICONE.venda };

  const fechado = sinal.resultado === "WIN" || sinal.resultado === "LOSS";
  const estado = isCooldown ? "COOLDOWN" : (fechado ? sinal.resultado : "PENDENTE");

  const hora = dataObj ? dataObj.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }).substring(0, 5) : "--:--";
  const dur = fechado ? pnDuracao(obterTempoOperacaoMs(sinal)) : "";
  const meta = [isCooldown ? "Cooldown" : tom.rot, hora, dur].filter(Boolean).join(" · ");

  const pips = Number(sinal.movimentoPips);
  const usd = Number(sinal.resultadoFinanceiro ?? sinal.lucroEstimado);
  const r = tokenResultadoPainel(Number.isFinite(pips) ? pips : (Number.isFinite(usd) ? usd : 0));

  let direita;
  if (isCooldown) {
    direita = `<span class="hs-estado hs-estado--neutro">Cooldown</span>`;
  } else if (fechado) {
    direita = `${Number.isFinite(pips) ? `<span class="pa-num pn-linha-pips ${r.classe}">${pnPips(pips)}</span>` : ""}
      <span class="pa-num pn-linha-usd ${Number.isFinite(pips) ? "" : r.classe}">${Number.isFinite(usd) ? moedaAssinadaPainel(usd) : "—"}</span>`;
  } else {
    direita = `<span class="hs-estado hs-estado--pendente">Pendente</span>
      ${Number.isFinite(pips) ? `<span class="pa-num pn-linha-usd">${pnPips(pips)}</span>` : ""}`;
  }

  return `
    <div class="pa-vidro hs-item" id="sinal-${docId}" style="--pn-cor:${tom.cor};--pn-fundo:${tom.fundo};${borderStyle}"
         data-sinal-id="${docId}" data-resultado-filtro="${estado}" data-par="${sinal.par || ""}">
      <div class="hs-linha">
        <span class="pn-tile" aria-hidden="true">${pnSvgIcone(compra ? "compra" : "venda", 18, 2.6)}</span>
        <span class="pn-min0">
          <span class="pn-linha-par">${sinal.par || "-"}${linkCorretoraXM(sinal, isCooldown)}</span>
          <span class="pn-linha-meta pa-num-sans">${meta}</span>
        </span>
        <span class="pn-linha-res">${direita}</span>
      </div>
      ${sinal.avisoRisco?.ativo ? `<div class="hs-aviso hs-aviso--ambar">⚠️ ${sinal.avisoRisco.mensagem}</div>` : ""}
      ${etiquetasInfoSinal(sinal, docId)}
      ${resumoNumerosSinal(sinal, docId)}
      ${detalheHtml}
    </div>`;

}

// Resumo (Pips / US$ / Acerto) e chips de filtro, calculados sobre os sinais
// dos dias carregados (cacheSinaisHistorico) - mesmo conjunto da lista.
function renderizarResumoHistorico() {

  const alvo = document.getElementById("historicoResumo");
  if (!alvo) return;

  const todos = Object.values(cacheSinaisHistorico).map(x => x.sinal)
    .filter(sn => !(sn.status === "COOLDOWN" || sn.origem === "cooldown"));

  const fechados = todos.filter(sn => sn.resultado === "WIN" || sn.resultado === "LOSS");
  const wins = fechados.filter(sn => sn.resultado === "WIN").length;
  const pips = fechados.reduce((a, sn) => a + (Number(sn.movimentoPips) || 0), 0);
  const usd = fechados.reduce((a, sn) => a + (Number(sn.resultadoFinanceiro ?? sn.lucroEstimado) || 0), 0);
  const acerto = fechados.length ? Math.round((wins / fechados.length) * 100) : null;

  const rP = tokenResultadoPainel(pips), rU = tokenResultadoPainel(usd);

  const contagemPar = {};
  todos.forEach(sn => { if (sn.par) contagemPar[sn.par] = (contagemPar[sn.par] || 0) + 1; });
  const pares = Object.keys(contagemPar).sort((a, b) => contagemPar[b] - contagemPar[a]);

  const chip = (attr, valor, rotulo, ativo) =>
    `<button type="button" class="hs-chip${ativo ? " hs-chip--ativo" : ""}" ${attr}="${valor}">${rotulo}</button>`;

  alvo.innerHTML = `
    <section class="pa-vidro pa-vidro--forte hs-resumo" aria-label="Resumo">
      <dl class="hs-resumo-grade">
        <div><dt>Pips</dt><dd class="pa-num ${rP.classe}">${fechados.length ? pnPips(pips).replace(" pips", "") : "—"}</dd></div>
        <div><dt>US$</dt><dd class="pa-num ${rU.classe}">${fechados.length ? moedaAssinadaPainel(usd).replace("US$ ", "") : "—"}</dd></div>
        <div><dt>Acerto</dt><dd class="pa-num">${acerto === null ? "—" : acerto + "%"}</dd></div>
      </dl>
      <p class="hs-resumo-nota pa-num-sans">${fechados.length} ${fechados.length === 1 ? "operação encerrada" : "operações encerradas"} nos dias carregados</p>
    </section>
    <div class="hs-chips" role="group" aria-label="Filtros">
      ${chip("data-hres", "", "Todas", !filtroHistoricoResultado && !filtroHistoricoPar)}
      ${chip("data-hres", "WIN", "Ganhos", filtroHistoricoResultado === "WIN")}
      ${chip("data-hres", "LOSS", "Perdas", filtroHistoricoResultado === "LOSS")}
      ${chip("data-hres", "PENDENTE", "Pendentes", filtroHistoricoResultado === "PENDENTE")}
      ${pares.map(p => chip("data-hpar", p, p, filtroHistoricoPar === p)).join("")}
    </div>`;

  alvo.onclick = (e) => {
    const b = e.target.closest("[data-hres],[data-hpar]");
    if (!b) return;
    if (b.hasAttribute("data-hpar")) {
      filtroHistoricoPar = filtroHistoricoPar === b.dataset.hpar ? "" : b.dataset.hpar;
    } else if (b.dataset.hres === "") {
      filtroHistoricoResultado = "";
      filtroHistoricoPar = "";
    } else {
      filtroHistoricoResultado = filtroHistoricoResultado === b.dataset.hres ? "" : b.dataset.hres;
    }
    aplicarFiltroHistoricoResultado();
    aplicarFiltroHistoricoLista();
    renderizarResumoHistorico();
  };

}

// Filtro dos itens da lista (formato Aurora): resultado + par. A tabela usa
// aplicarFiltroHistoricoResultado() (que também respeita o par).
function aplicarFiltroHistoricoLista() {

  const raiz = document.getElementById("historicoLista");
  if (!raiz) return;

  const itens = raiz.querySelectorAll(".hs-item");

  itens.forEach((el) => {
    const okR = !filtroHistoricoResultado || el.dataset.resultadoFiltro === filtroHistoricoResultado;
    const okP = !filtroHistoricoPar || el.dataset.par === filtroHistoricoPar;
    el.style.display = okR && okP ? "" : "none";
  });

  if (!itens.length) return;

  raiz.querySelectorAll(".hist-dia").forEach((dia) => {
    const its = dia.querySelectorAll(".hs-item");
    if (!its.length) return;
    dia.style.display = [...its].some(i => i.style.display !== "none") ? "" : "none";
  });

  raiz.querySelectorAll(".hist-mes").forEach((mes) => {
    const dias = mes.querySelectorAll(".hist-dia");
    if (!dias.length) return;
    mes.style.display = [...dias].some(d => d.style.display !== "none") ? "" : "none";
  });

}

async function carregarHistorico() {
  const lista = document.getElementById("historicoLista");
  const acoes = document.getElementById("historicoAcoes");
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

    const gruposPorData = {};

    const hojeStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const sinaisAbertos = obterSinaisAbertos();

    cacheSinaisHistorico = {};

    snapshot.forEach((doc) => {
      const sinal = doc.data();
      const dataObj = extrairDataObjSinal(sinal);

      const dataSinal = dataObj
          ? dataObj.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "Data Indefinida";

      const isCooldown = sinal.status === "COOLDOWN" || sinal.origem === "cooldown";

      const isDestaque = app.sinalParaDestacar === doc.id;
      const estaAberto = sinaisAbertos.includes(doc.id) || isDestaque;
      const detalheId = `detalhe-${doc.id}`;
      const borderStyle = isDestaque ? 'border: 2px solid #5ef8b7; background: rgba(94,248,183,0.1);' : '';

      cacheSinaisHistorico[doc.id] = { sinal, dataObj };

      const detalheHtml = construirDetalheSinal(sinal, doc.id, estaAberto, modoTabela);

      const card = modoTabela
        ? construirLinhaTabela(sinal, doc.id, dataObj, isCooldown, borderStyle, detalheHtml, undefined, true)
        : construirItemListaAurora(sinal, doc.id, dataObj, isCooldown, borderStyle, detalheHtml);

      if (!gruposPorData[dataSinal]) gruposPorData[dataSinal] = "";
      gruposPorData[dataSinal] += card;
    });

    // AJUSTE-021 (24/09/2026): placar/estatísticas por período saíram
    // daqui - ver js/resultados.js. O Histórico mantém só o
    // agrupamento por mês/dia como navegação (sem números de
    // resultado), mais o botão "Minimizar Tudo".
    if (acoes) {
      acoes.innerHTML = `
        <button id="btnMinimizarTudo" style="width:100%; padding:8px; border:1px solid rgba(255,255,255,.18); border-radius:8px; background:rgba(255,255,255,.10); color:white; font-size:13px; cursor:pointer;">
          Minimizar Tudo
        </button>
      `;
    }

    // Renderização dos Grupos: mês -> dia, só como navegação (sem
    // placar - ver AJUSTE-021 acima). A lista de sinais em si continua
    // limitada a `diasCarregados` dias (mesma consulta de sempre).
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

      const mesContemHoje = chaveMes === mesChaveDe(hojeStr);
      const mesContemDestaque =
        app.sinalParaDestacar &&
        datasDoMes.some((data) => gruposPorData[data].includes(`id="sinal-${app.sinalParaDestacar}"`));
      const mostrarMes = mesContemHoje || mesContemDestaque;

      let diasHtml = "";

      datasDoMes.forEach((data) => {
        const idData = data.replaceAll("/", "");
        const isHoje = data === hojeStr;
        const ontemStr = new Date(Date.now() - 86400000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const label = isHoje ? "Hoje" : (data === ontemStr ? "Ontem" : data);

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
              <table style="border-collapse:collapse; width:100%; min-width:860px; font-size:12px;">
                <thead>
                  <tr style="background:rgba(255,255,255,.06); text-align:left;">
                    <th style="padding:6px 8px;">Horário</th>
                    <th style="padding:6px 8px;">Par</th>
                    <th style="padding:6px 8px;">Direção</th>
                    <th style="padding:6px 8px;">Tempo</th>
                    ${thResultadoFiltravel()}
                    <th style="padding:6px 8px; text-align:center;" title="Modo que aprovou o sinal">Modo</th>
                    <th style="padding:6px 8px; text-align:right;" title="Preço em que a operação foi aberta">Preço Entrada</th>
                    <th style="padding:6px 8px; text-align:right;" title="Preço em que a operação foi encerrada (o mesmo usado no resultado). -- enquanto está pendente.">Preço Final</th>
                    <th style="padding:6px 8px; text-align:right;">Favor</th>
                    <th style="padding:6px 8px; text-align:right;">Contra</th>
                    <th style="padding:6px 8px; text-align:right;">Resultado Financeiro</th>
                    <th style="padding:6px 8px; text-align:center;">Operação Real</th>
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
        <div class="hist-dia" style="margin-top:10px; border:1px solid rgba(255,255,255,.08); border-radius:10px; overflow:hidden;">
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

      style="padding:10px 12px; font-size:12px; color:#bcc4d5; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,.03);">
     <span><span class="seta-grupo" style="margin-right:8px;">${mostrarDia ? "▼" : "▶"}</span>${label}</span>
      </div>
      <div id="data${idData}" style="display: ${mostrarDia ? 'block' : 'none'}; padding:${modoTabela ? '0' : '10px'};">
        ${conteudoDia}
      </div>
        </div>
        `;
      });

      finalHtml += `
      <div class="hist-mes" style="margin-top:16px; border:1px solid rgba(255,255,255,.12); border-radius:10px; overflow:hidden;">
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

    style="padding:12px; font-size:13px; color:#f9fafd; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,.06);">
   <span><span class="seta-grupo" style="margin-right:8px;">${mostrarMes ? "▼" : "▶"}</span>${labelMes}</span>
    </div>
    <div id="mes${idMes}" style="display: ${mostrarMes ? 'block' : 'none'}; padding:8px;">
      ${diasHtml}
    </div>
      </div>
      `;
    });

    lista.innerHTML = '<div id="historicoFiltroBarra" class="list-item" style="display:none; align-items:center; justify-content:space-between; gap:10px; font-size:12px;"></div>' + (finalHtml || '<div class="list-item">Nenhum sinal encontrado.</div>') + `
      <button
        id="btnCarregarMaisHistorico"
        onclick="carregarMaisHistorico()"
        style="margin-top:12px; width:100%; padding:10px; border:none; border-radius:8px; background:rgba(255,255,255,.06); color:#3ae0e8; font-size:12px; cursor:pointer;"
      >
        ⬇️ Carregar mais (dia anterior)
      </button>
    `;

    atualizarBotaoModoTabela();
    aplicarModoCompactoSeNecessario();

    renderizarResumoHistorico();
    aplicarFiltroHistoricoLista();

    // AJUSTE-043: reaplica o filtro do cabeçalho "Resultado" a cada
    // redesenho da lista (o estado vive em filtroHistoricoResultado).
    aplicarFiltroHistoricoResultado();

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

// AJUSTE-021 (24/09/2026): alternarOperacaoReal() agora pode ser
// chamada tanto do Histórico quanto de Resultados (js/resultados.js
// reusa construirLinhaTabela, que inclui o mesmo checkbox) - refresca
// só a lista que estiver de fato na tela, sem depender de qual aba
// chamou.
function atualizarTelaAposOperacaoReal() {
  if (document.getElementById("historicoLista") && typeof carregarHistorico === "function") {
    carregarHistorico();
  }
  if (document.getElementById("resultadosLista") && typeof carregarResultados === "function") {
    carregarResultados();
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
    atualizarTelaAposOperacaoReal();
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

    atualizarTelaAposOperacaoReal();
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

    atualizarTelaAposOperacaoReal();

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
