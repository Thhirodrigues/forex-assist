// ======================================================
// FOREX ASSIST - MÓDULO: MATÉRIAS-PRIMAS E ÍNDICE (GOLD, OILCash, US100Cash) - pré-registro 6.78 (25/11/2026)
//
// Aba SÓ DE LEITURA. Mostra os sinais de `historico_materias` (coleção SEPARADA do `historico` do forex), gerados pelo motor ao vivo
// (scripts/materias/) e executados pelo robô na conta DEMO da XM. Alvo, stop e lote vêm do mercado (volatilidade e custo), sem opção manual.
// Tudo é TESTE: o veredito sai por regra pré-registrada (>= 300 operações em >= 20 dias), não por esta tela. Nunca grava nada.
// ======================================================
const MT_LIMITE = 80;
const MT_ROTULO = { GOLD: "Ouro", OILCash: "Petróleo (WTI)", US100Cash: "Nasdaq 100" };

const mtEsc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// valor ausente (null, undefined, "") NÃO é zero: Number(null) vale 0 e apareceria como "US$ 0,00"
const mtTem = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const mtNum = (v, casas = 2) => !mtTem(v) ? "—" : Number(v).toFixed(casas).replace(".", ",");
const mtSinal = (v, casas = 2) => !mtTem(v) ? "—" : `${Number(v) > 0 ? "+" : Number(v) < 0 ? "−" : ""}${Math.abs(Number(v)).toFixed(casas).replace(".", ",")}`;
const mtUsd = (v) => !mtTem(v) ? "—" : `${Number(v) < 0 ? "−" : Number(v) > 0 ? "+" : ""}US$ ${Math.abs(Number(v)).toFixed(2).replace(".", ",")}`;
function mtQuando(ms) {
    if (!Number.isFinite(Number(ms))) return "—";
    return new Date(Number(ms)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function mtDuracao(ms) {
    const min = Math.round(Number(ms) / 60000);
    if (!Number.isFinite(min) || min < 0) return "—";
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

function mtResumo(docs) {
    const fechados = docs.filter(d => d.status === "ENCERRADA" && (d.resultado === "WIN" || d.resultado === "LOSS"));
    const abertos = docs.filter(d => d.status === "ABERTA");
    const win = fechados.filter(d => d.resultado === "WIN").length;
    const soma = (l, k) => l.reduce((a, d) => a + (Number(d[k]) || 0), 0);
    return { total: docs.length, abertos: abertos.length, fechados: fechados.length, win, loss: fechados.length - win,
        pctAcerto: fechados.length ? Math.round(1000 * win / fechados.length) / 10 : null, usd: Math.round(soma(fechados, "resultadoFinanceiro") * 100) / 100,
        r: Math.round(soma(fechados, "resultadoR") * 100) / 100, flutuante: Math.round(soma(abertos, "flutuanteUsd") * 100) / 100 };
}

function mtPoliticaTexto(rotulo, p) {
    if (!p) return "";
    if (p.estado === "ABERTA") return `<span class="mt-pol">${rotulo}: em andamento</span>`;
    return `<span class="mt-pol ${p.estado === "WIN" ? "mt-ganho" : "mt-perda"}">${rotulo}: ${mtUsd(p.usd)} (${mtSinal(p.r, 2)} R)</span>`;
}

function mtCartaoHTML(d) {
    const f = d.financeiro || {}, compra = d.direcao === "BUY", aberto = d.status === "ABERTA";
    const fechou = d.status === "ENCERRADA" && (d.resultado === "WIN" || d.resultado === "LOSS");
    const classe = aberto ? "mt-aberta" : fechou ? (d.resultado === "WIN" ? "mt-ganho" : "mt-perda") : "mt-neutro";
    const selo = aberto ? "EM ANDAMENTO" : fechou ? d.resultado : "SEM DADOS";
    const resultado = aberto
        ? `<div class="mt-linha"><span>Agora</span><b class="${Number(d.flutuanteUsd) > 0 ? "mt-ganho" : Number(d.flutuanteUsd) < 0 ? "mt-perda" : ""}">${mtUsd(d.flutuanteUsd)}</b></div>`
        : fechou ? `<div class="mt-linha"><span>Resultado</span><b class="${classe}">${mtUsd(d.resultadoFinanceiro)} (${mtSinal(d.resultadoR, 2)} R)</b></div>
                    <div class="mt-linha"><span>Duração</span><b>${mtDuracao(d.tempoOperacao)} · ${mtEsc(d.motivoFechamento || "")}</b></div>` : "";
    const pol = d.politicas ? `<div class="mt-pols"><span class="mt-ajuda">E se…</span> ${mtPoliticaTexto("encerrasse a 80% do alvo", d.politicas.P2)} ${mtPoliticaTexto("esticasse o alvo ×2", d.politicas.P3)}</div>` : "";
    return `<div class="pa-vidro mt-cartao ${classe}">
        <div class="mt-topo">
            <div><b class="mt-ativo">${mtEsc(MT_ROTULO[d.par] || d.par)}</b> <span class="mt-chip ${compra ? "mt-compra" : "mt-venda"}">${compra ? "COMPRA" : "VENDA"}</span></div>
            <span class="mt-selo ${classe}">${mtEsc(selo)}</span>
        </div>
        <div class="mt-sub">${mtQuando(d.timestamp)} · lote ${mtNum(d.lote, 2)} · risco ${mtUsd(d.riscoUsd).replace("+", "")}</div>
        <div class="mt-grade">
            <div class="mt-linha"><span>Alvo</span><b>${mtNum(f.tpPreco, 2)} (${mtUsd(f.tpUsd)})</b></div>
            <div class="mt-linha"><span>Stop</span><b>${mtNum(f.slPreco, 2)} (${mtTem(f.slUsd) ? mtUsd(-Math.abs(Number(f.slUsd))) : "—"})</b></div>
            <div class="mt-linha"><span>Entrada</span><b>${mtNum(d.precoEntrada, 2)}</b></div>
            ${resultado}
        </div>
        ${pol}
    </div>`;
}

function mtHTML(docs) {
    const r = mtResumo(docs);
    const aviso = `<div class="pa-vidro mt-cartao mt-aviso"><b>🧪 TESTE · conta demo</b>
        <p>Sinais do módulo de matérias-primas e índice. Alvo, stop e lote saem da análise do mercado (volatilidade e custo), sem opção manual. O robô abre a ordem na <b>conta demo</b> da XM quando cabe (1 posição por ativo). A regra e os critérios foram escritos antes de existir qualquer dado: o veredito sai com 300 operações em 20 dias, não desta tela.</p></div>`;
    const resumo = `<div class="pa-vidro mt-cartao"><div class="mt-grade">
        <div class="mt-linha"><span>Sinais</span><b>${r.total}</b></div>
        <div class="mt-linha"><span>Abertos</span><b>${r.abertos}${r.abertos ? ` (${mtUsd(r.flutuante)})` : ""}</b></div>
        <div class="mt-linha"><span>Fechados</span><b>${r.fechados} · ${r.win} WIN / ${r.loss} LOSS${r.pctAcerto === null ? "" : ` (${mtNum(r.pctAcerto, 1)}%)`}</b></div>
        <div class="mt-linha"><span>Resultado</span><b class="${r.usd > 0 ? "mt-ganho" : r.usd < 0 ? "mt-perda" : ""}">${mtUsd(r.usd)} · ${mtSinal(r.r, 2)} R</b></div></div></div>`;
    const lista = docs.length ? docs.map(mtCartaoHTML).join("") : `<div class="pa-vidro mt-cartao"><p class="pn-texto">Ainda não há sinais. O motor decide a cada 30 minutos (:00 e :30) quando o mercado tem tendência limpa.</p></div>`;
    return aviso + resumo + lista;
}

function materiasView() {
    return `<div id="mtRaiz"><div class="pa-vidro mt-cartao"><p class="pn-texto">Carregando matérias-primas…</p></div></div>`;
}

async function carregarMaterias() {
    const raiz = document.getElementById("mtRaiz");
    if (!raiz) return;
    try {
        const snap = await db.collection("historico_materias").orderBy("timestamp", "desc").limit(MT_LIMITE).get();
        const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        raiz.innerHTML = mtHTML(docs);
    } catch (e) {
        raiz.innerHTML = `<div class="pa-vidro mt-cartao"><p class="pn-texto">Não foi possível carregar: ${mtEsc(e && e.message)}</p></div>`;
    }
}

if (typeof module !== "undefined") module.exports = { mtTem, mtResumo, mtCartaoHTML, mtHTML, mtEsc, mtUsd, mtSinal, mtDuracao, mtNum };
