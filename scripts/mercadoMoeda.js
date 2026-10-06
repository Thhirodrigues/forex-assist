// ===================================================
// FOREX ASSIST - QUADRO "O QUE OS OUTROS PARES DA MESMA MOEDA ESTÃO FAZENDO" (detalhe do sinal)
//
// UMD: o mesmo arquivo roda no navegador (window.MercadoMoeda) e no Node (testes). Lê o resumo gravado pelo scanner em
// `scanner/mercado` (scripts/mercadoResumo.js). É CONTEXTO, não filtro: o Laboratório testou "concordância de moeda" e
// "a favor/contra a tendência" em 360 dias (caderno 6.28) e nenhuma separou operações boas de ruins.
//
// Lógica de moeda: par BASE/COTADA sobe quando a BASE fortalece e/ou a COTADA enfraquece. Para a moeda X de um par:
//   X é a BASE   -> o movimento de X é o do par;  X é a COTADA -> o movimento de X é o do par com sinal trocado.
// O sinal COMPRA de BASE/COTADA precisa de BASE subindo e COTADA caindo (VENDA, o contrário).
// ===================================================
(function (raiz) {

const UNIVERSO = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY", "GBP/JPY", "EUR/GBP"];
const LIMIAR_PARADO = 0.10;      // % em 24 h abaixo do qual o movimento é "parado" (só exibição)
const IDADE_ALERTA_MIN = 45;     // dado mais velho que isso ganha aviso de idade
const NOMES = { USD: "dólar", EUR: "euro", GBP: "libra", JPY: "iene", AUD: "AUD", CAD: "CAD", CHF: "franco", NZD: "NZD" };

const moedasDoPar = (par) => String(par).split("/");
const chave = (par) => String(par).replace("/", "_");
const movimentoNaMoeda = (par, moeda, pct) => (pct === null || pct === undefined ? null : (moedasDoPar(par)[0] === moeda ? pct : -pct));
const estadoDoMovimento = (mov) => (mov === null ? null : Math.abs(mov) < LIMIAR_PARADO ? "parado" : mov > 0 ? "subindo" : "caindo");

function idadeMin(r, agora) { return r && Number.isFinite(r.ate) ? Math.max(0, Math.round((agora - r.ate) / 60000)) : null; }

/**
 * @param {{par:string, direcao:"BUY"|"SELL", mercado:{pares:Object}|null, agora?:number}} p
 */
function quadroDoSinal({ par, direcao, mercado, agora = Date.now() }) {
    const dados = (mercado && mercado.pares) || {};
    const [base, cotada] = moedasDoPar(par);
    const comprar = direcao === "BUY";
    const linha = (p, moeda) => {
        const r = dados[chave(p)];
        const mov24 = r ? movimentoNaMoeda(p, moeda, r.v24h) : null;
        return { par: p, v1h: r ? (r.v1h ?? null) : null, v24h: r ? (r.v24h ?? null) : null, mov24, estado: estadoDoMovimento(mov24), idadeMin: idadeMin(r, agora), semDado: !r };
    };
    const proprio = linha(par, base);
    const moedas = [base, cotada].map(moeda => {
        const precisa = (moeda === base) === comprar ? "subir" : "cair";
        const outros = UNIVERSO.filter(p => p !== par && moedasDoPar(p).includes(moeda)).map(p => linha(p, moeda));
        const contar = (e) => outros.filter(l => l.estado === e).length;
        const aFavor = outros.filter(l => l.estado === (precisa === "subir" ? "subindo" : "caindo")).length;
        return { moeda, precisa, linhas: outros, resumo: { subindo: contar("subindo"), caindo: contar("caindo"), parado: contar("parado"), semDado: outros.filter(l => l.semDado).length, aFavor, n: outros.length } };
    });
    const ladoProprio = proprio.v24h === null ? null : Math.abs(proprio.v24h) < LIMIAR_PARADO ? "parado" : ((proprio.v24h > 0) === comprar ? "a favor" : "contra");
    return { par, direcao, proprio: { ...proprio, lado: ladoProprio }, moedas, semNada: !mercado || !Object.keys(dados).length };
}

const pctTxt = (v) => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")}%`);
const seta = (v) => (v === null || v === undefined || Math.abs(v) < 0.005 ? "▬" : v > 0 ? "▲" : "▼");
// verde = a moeda se move COMO o sinal precisa; vermelho = ao contrário; cinza = parada. (Números do par ficam neutros: subir/cair do par não é bom nem ruim por si.)
const VERDE = "#4ade80", VERMELHO = "#f87171", CINZA = "#bcc4d5";
const corDoEstado = (estado, precisa) => (!estado || estado === "parado" ? CINZA : estado === (precisa === "subir" ? "subindo" : "caindo") ? VERDE : VERMELHO);
const idadeTxt = (min) => (min === null ? "" : min < 90 ? `${min} min` : `${Math.round(min / 60)} h`);

function htmlQuadro(q) {
    if (q.semNada) return `<div style="font-size:12px; color:#bcc4d5;">Resumo de mercado ainda indisponível (o scanner grava a cada ciclo; abra de novo em instantes).</div>`;
    const cel = (txt, cor) => `<span style="color:${cor || "#bcc4d5"};">${txt}</span>`;
    const linhaHtml = (l, rotuloMoeda, precisa) => {
        if (l.semDado) return `<div style="display:flex; justify-content:space-between; gap:6px;"><span>${l.par}</span>${cel("sem dado")}</div>`;
        const velho = l.idadeMin !== null && l.idadeMin > IDADE_ALERTA_MIN;
        const texto = rotuloMoeda && l.estado ? `${NOMES[rotuloMoeda] || rotuloMoeda} ${l.estado}` : "";
        return `<div style="display:flex; justify-content:space-between; gap:6px; ${velho ? "opacity:.65;" : ""}">
            <span style="white-space:nowrap;">${l.par}</span>
            <span style="white-space:nowrap;">${cel(`${seta(l.v24h)} ${pctTxt(l.v24h)}`, "#f9fafd")} <span style="color:#8b93a7;">24h</span> · ${cel(`${seta(l.v1h)} ${pctTxt(l.v1h)}`, "#f9fafd")} <span style="color:#8b93a7;">1h</span></span>
            <span style="min-width:96px; text-align:right; white-space:nowrap; color:${corDoEstado(l.estado, precisa)};">${texto}${velho ? ` <span style="color:#8b93a7;">⏱ ${idadeTxt(l.idadeMin)}</span>` : ""}</span>
        </div>`;
    };
    const p = q.proprio;
    const ladoCor = p.lado === "a favor" ? VERDE : p.lado === "contra" ? VERMELHO : CINZA;
    const blocos = [...q.moedas].sort((a, b) => (b.linhas.length > 0) - (a.linhas.length > 0)).map(m => {   // a moeda com comparação vem primeiro
        const titulo = `${(NOMES[m.moeda] || m.moeda).toUpperCase()} — o sinal precisa dela ${m.precisa === "subir" ? "SUBINDO" : "CAINDO"}`;
        if (!m.linhas.length) return `<div style="margin-top:8px;"><div style="font-weight:bold; color:#f9fafd;">${titulo}</div><div style="color:#8b93a7;">nenhum outro par do app tem esta moeda: sem comparação</div></div>`;
        const r = m.resumo;
        const partes = [r.subindo && `${r.subindo} subindo`, r.caindo && `${r.caindo} caindo`, r.parado && `${r.parado} parada`].filter(Boolean).join(", ");
        const contra = r.n > 0 && r.aFavor === 0 && r.parado + r.semDado < r.n;
        return `<div style="margin-top:8px;">
            <div style="font-weight:bold; color:#f9fafd;">${titulo}</div>
            ${m.linhas.map(l => linhaHtml(l, m.moeda, m.precisa)).join("")}
            <div style="margin-top:3px; color:${r.aFavor === r.n && r.n > 0 ? VERDE : contra ? VERMELHO : CINZA};">→ ${NOMES[m.moeda] || m.moeda}: ${partes || "sem dado"} (24 h) · a favor do sinal em ${r.aFavor} de ${r.n}</div>
        </div>`;
    }).join("");
    return `<div style="font-size:12px; color:#bcc4d5; line-height:1.55;">
        <div><b style="color:#f9fafd;">Este par (${p.par}):</b> ${p.semDado ? "sem dado" : `${cel(`${seta(p.v24h)} ${pctTxt(p.v24h)} em 24 h`, "#f9fafd")} · ${cel(`${seta(p.v1h)} ${pctTxt(p.v1h)} em 1 h`, "#f9fafd")}${p.lado ? ` · <span style="color:${ladoCor};">mercado ${p.lado} do sinal</span>` : ""}`}</div>
        ${blocos}
        <div style="margin-top:8px; font-size:11px; color:#8b93a7;">Contexto, não filtro: "concordância de moeda" e "sinal a favor/contra a tendência" foram testados no Laboratório (360 dias) e não melhoraram o resultado. Variação de ~24 h de mercado e ~1 h; ⏱ = dado antigo (par parado por cooldown ou fora da janela).</div>
    </div>`;
}

const api = { UNIVERSO, moedasDoPar, movimentoNaMoeda, estadoDoMovimento, quadroDoSinal, htmlQuadro, LIMIAR_PARADO };

// ---- navegador: um listener no documento do resumo preenche todos os quadros abertos ----
if (typeof window !== "undefined") {
    let mercado = null, iniciado = false;
    const preencher = () => {
        document.querySelectorAll("[data-mercado-moeda]").forEach(el => {
            try { el.innerHTML = htmlQuadro(quadroDoSinal({ par: el.dataset.par, direcao: el.dataset.dir, mercado })); } catch (e) { /* contexto opcional: nunca derruba o card */ }
        });
    };
    const iniciar = () => {
        if (iniciado || !window.db) return;
        iniciado = true;
        try {
            window.db.collection("scanner").doc("mercado").onSnapshot(s => { mercado = s.exists ? s.data() : null; preencher(); }, () => { /* sem permissão/rede: o quadro mostra "indisponível" */ });
        } catch (e) { /* idem */ }
    };
    api.container = (par, direcao) => {
        iniciar();
        const q = quadroDoSinal({ par, direcao, mercado });
        return `<div data-mercado-moeda data-par="${par}" data-dir="${direcao}">${htmlQuadro(q)}</div>`;
    };
    api.preencher = preencher;
}

if (typeof module !== "undefined" && module.exports) module.exports = api;
else raiz.MercadoMoeda = api;

})(typeof window !== "undefined" ? window : globalThis);
