// ======================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MÓDULO: LABORATÓRIO (AJUSTE-077, 04/10/2026)
//
// Aba SÓ DE LEITURA. Mostra o placar que o rotulador (lab/rotulador.js, GitHub Actions) publica em
// `placar/atual` no projeto forex-assist-lab: o que teria acontecido com os sinais do app (e com as
// análises em geral) se a saída fosse outra, e as hipóteses H1-H5 pré-registradas. NÃO gera sinal,
// NÃO grava nada, NÃO toca no projeto oficial. 1 leitura por abertura (cache de 2 min).
// A lógica de comparação é a mesma do rotulador (lab/placar.js, carregado antes deste arquivo).
// ======================================================

let lbTipo = "OFICIAL";
let lbEpoca = "pos";
let lbCache = { t: 0, doc: undefined };
const LB_TTL_MS = 2 * 60 * 1000;

const LB_TIPOS = [
    { id: "OFICIAL", rotulo: "Sinais do app", ajuda: "Só o que o scanner aprovou e virou sinal." },
    { id: "LAB", rotulo: "Todas as análises", ajuda: "Toda análise com direção, com a mesma pausa de 30 min por par. Não é sinal." },
    { id: "OFICIAL_TETO1", rotulo: "Teto: 1 por lado", ajuda: "E se o app mantivesse no máximo 1 sinal aberto por lado do dólar? (cruzados passam). Recalculado 1 vez por dia." },
    { id: "OFICIAL_TETO2", rotulo: "Teto: 2 por lado", ajuda: "O mesmo, com no máximo 2 sinais abertos por lado do dólar. Recalculado 1 vez por dia." }
];

const LB_ORDEM_RECORTES = [
    ["H1_score50mais", "Score 50 ou mais"], ["H1_score35a49", "Score 35 a 49"],
    ["H2_adx30mais", "ADX 30 ou mais"], ["H2_adx_ate29", "ADX abaixo de 30"],
    ["H3_com_candle", "Com candlestick"], ["H3_sem_candle", "Sem candlestick"],
    ["H4_dolar_vendido", "Vendido em dólar"], ["H4_dolar_comprado", "Comprado em dólar"], ["H4_dolar_cruzado", "Par cruzado (sem lado)"],
    ["H5_balanceado", "Perfil Balanceado"], ["H5_agressivo", "Perfil Agressivo"], ["H5_conservador", "Perfil Conservador"],
    ["L1_score40a44_adx25menos", "Score 40–44 e ADX <25"],
    ["X1_rsi_esticado", "RSI esticado a favor (≥70 compra, ≤30 venda)"], ["X1_rsi_normal", "RSI normal"],
    ["X2_sessao_asia", "Sessão Ásia (00–07 UTC)"], ["X2_sessao_londres", "Sessão Londres (07–12)"],
    ["X2_sessao_sobreposicao", "Londres + NY (12–16)"], ["X2_sessao_ny", "Sessão NY (16–21)"], ["X2_sessao_fora", "Fim de dia (21–24)"],
    ["X5_10d_a_favor", "Mercado do par (10 dias): sinal A FAVOR"], ["X5_10d_contra", "Mercado do par (10 dias): sinal CONTRA"], ["X5_10d_fraca", "Mercado do par (10 dias): sem tendência"],
    ["X7_24h_a_favor", "Mercado do par (24 h): sinal A FAVOR"], ["X7_24h_contra", "Mercado do par (24 h): sinal CONTRA"], ["X7_24h_fraca", "Mercado do par (24 h): sem tendência"],
    ["X6_cesta_a_favor", "Cesta do dólar (24 h): sinal A FAVOR"], ["X6_cesta_contra", "Cesta do dólar (24 h): sinal CONTRA"], ["X6_cesta_fraca", "Cesta do dólar (24 h): parada"],
    ["X8_sinais_concorda", "Outros pares do dólar CONCORDAM"], ["X8_sinais_diverge", "Outros pares do dólar DIVERGEM"], ["X8_sinais_misto", "Outros pares do dólar divididos"], ["X8_sinais_sem_dados", "Outros pares: poucos sinais"],
    ["X4_par_EUR_USD", "Par EUR/USD"], ["X4_par_GBP_USD", "Par GBP/USD"], ["X4_par_USD_JPY", "Par USD/JPY"], ["X4_par_AUD_USD", "Par AUD/USD"],
    ["X4_par_USD_CAD", "Par USD/CAD"], ["X4_par_USD_CHF", "Par USD/CHF"], ["X4_par_NZD_USD", "Par NZD/USD"], ["X4_par_EUR_JPY", "Par EUR/JPY"]
];
const LB_EPOCAS = [
    { id: "pos", rotulo: "Depois do registro" },
    { id: "pre", rotulo: "Antes (só triagem)" }
];

function lbPlacarApi() { return window.labPlacar || null; }

function laboratorioView() {
    return `<div id="lbRaiz"><div class="pa-vidro lb-cartao"><p class="pn-texto">Carregando o Laboratório…</p></div></div>`;
}

async function lbCarregarDoc() {
    if (lbCache.doc !== undefined && Date.now() - lbCache.t < LB_TTL_MS) return lbCache.doc;
    if (!window.dbLab) throw new Error("Laboratório indisponível (projeto não configurado neste aparelho).");
    const snap = await window.dbLab.collection("placar").doc("atual").get();
    lbCache = { t: Date.now(), doc: snap.exists ? snap.data() : null };
    return lbCache.doc;
}

function lbPct(v) { return v === null || v === undefined ? "—" : `${Math.round(v)}%`; }
function lbNum(v, casas = 1) { return Number.isFinite(v) ? v.toFixed(casas).replace(".", ",") : "—"; }
function lbSinal(v, casas = 1) { return Number.isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(casas).replace(".", ",")}` : "—"; }

function lbQuando(ms) {
    if (!Number.isFinite(Number(ms))) return "—";
    return new Date(Number(ms)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function lbHa(ms) {
    const min = Math.round((Date.now() - Number(ms)) / 60000);
    if (!Number.isFinite(min) || min < 0) return "";
    if (min < 60) return `há ${min} min`;
    if (min < 1440) return `há ${Math.round(min / 60)} h`;
    return `há ${Math.round(min / 1440)} d`;
}

function lbLinha(linhas, tipo, epoca, variante, grupo) {
    return linhas.find(l => l.tipo === tipo && l.epoca === epoca && l.variante === variante && (l.grupo || "TODOS") === grupo) || null;
}

function lbChips(lista, atual, atributo) {
    return lista.map(o => `<button type="button" class="pn-chip pa-num-sans${o.id === atual ? " pn-chip--ativo" : ""}" ${atributo}="${o.id}" aria-pressed="${o.id === atual}">${o.rotulo}</button>`).join("");
}

function lbBarra(pct, cor) {
    const w = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
    return `<span class="lb-barra" aria-hidden="true"><i style="width:${w}%;background:${cor};"></i></span>`;
}

function lbHipotesesHTML(placar) {
    return placar.map(h => {
        const sem = h.nA === 0 && h.nB === 0;
        const selo = h.sentidoDaHipotese
            ? `<span class="lb-selo lb-selo--sim">No sentido da hipótese</span>`
            : h.diferencaGrandeMasAmostraPequena
                ? `<span class="lb-selo lb-selo--ruido">Diferença grande, amostra pequena: ruído</span>`
                : "";
        const faixa = `<span class="lb-selo lb-selo--faixa">${h.amostra}</span>`;
        const linha = (rotulo, n, ac, cor) => `
            <div class="lb-par">
                <span class="lb-par-rot">${rotulo}</span>
                ${lbBarra(ac, cor)}
                <span class="lb-par-num pa-num-sans">${lbPct(ac)} <small>n=${n}</small></span>
            </div>`;
        return `
        <article class="lb-hip">
            <header><strong>${h.id}</strong> <span>${h.texto}</span></header>
            ${sem ? `<p class="lb-vazio">Sem operações nesta combinação ainda.</p>` : `
                ${linha(h.rotuloA, h.nA, h.acertoA, "var(--pa-perda)")}
                ${linha(h.rotuloB, h.nB, h.acertoB, "var(--pa-primary)")}
                <p class="lb-dif pa-num-sans">Diferença: <b>${h.diferenca === null ? "—" : lbSinal(h.diferenca, 0) + " pontos"}</b> ${faixa}${selo}</p>`}
        </article>`;
    }).join("");
}

const LB_ROTULOS_GRUPO = {
    H1: ["Score ≥50", "Score 35–49"],
    H2: ["ADX ≥30", "ADX <30"],
    H3: ["Com candle", "Sem candle"],
    H4: ["Vendido USD", "Comprado USD"],
    H5: ["Balanceado", "Agressivo"]
};

function lbVariantesHTML(linhas, api) {
    const corpo = api.VARIANTES.map(v => {
        const l = lbLinha(linhas, lbTipo, lbEpoca, v.id, "TODOS");
        if (!l || !l.n) return `<tr><td class="lb-v-nome">${v.nome}<small>${v.texto}</small></td><td colspan="4" class="lb-v-vazio">sem dados</td></tr>`;
        const ac = (100 * l.pos) / l.n;
        const exp = l.pips / l.n;
        return `<tr>
            <td class="lb-v-nome">${v.nome}<small>${v.texto}</small></td>
            <td class="pa-num-sans">${l.n}${l.ab ? `<small class="lb-ab"> +${l.ab} abertos</small>` : ""}</td>
            <td class="pa-num-sans">${lbPct(ac)}</td>
            <td class="pa-num-sans ${exp > 0 ? "lb-pos" : exp < 0 ? "lb-neg" : ""}">${lbSinal(exp)}</td>
            <td class="pa-num-sans">${Math.round(l.dur / l.n)}min</td>
        </tr>`;
    }).join("");
    return `
    <div class="lb-tabela-wrap">
        <table class="lb-tabela">
            <thead><tr><th>Saída testada</th><th>Casos</th><th>Acerto</th><th>Pips/op</th><th>Tempo</th></tr></thead>
            <tbody>${corpo}</tbody>
        </table>
    </div>`;
}

function lbRecortesHTML(linhas) {
    const doTipo = linhas.filter(l => l.tipo === lbTipo && l.epoca === lbEpoca && l.variante === "ATUAL" && l.grupo && l.grupo !== "TODOS" && l.n > 0);
    if (!doTipo.length) return `<p class="lb-vazio">Sem casos nesta combinação ainda.</p>`;
    const conhecidos = new Map(LB_ORDEM_RECORTES);
    const ordem = [...LB_ORDEM_RECORTES.map(r => r[0]), ...doTipo.map(l => l.grupo).filter(g => !conhecidos.has(g)).sort()];
    const corpo = ordem.map(g => {
        const d = doTipo.find(l => l.grupo === g);
        if (!d) return "";
        const inv = lbLinha(linhas, lbTipo, lbEpoca, "INVERSO", g);
        const nome = conhecidos.get(g) || (g.startsWith("X3_lote_") ? `Lote ${g.slice(8).replace(".", ",")}` : g);
        const e = d.pips / d.n, ei = inv && inv.n ? inv.pips / inv.n : null;
        return `<tr>
            <td class="lb-v-nome">${nome}</td>
            <td class="pa-num-sans">${d.n}</td>
            <td class="pa-num-sans">${lbPct((100 * d.pos) / d.n)}</td>
            <td class="pa-num-sans ${e > 0 ? "lb-pos" : e < 0 ? "lb-neg" : ""}">${lbSinal(e)}</td>
            <td class="pa-num-sans ${ei > 0 ? "lb-pos" : ei < 0 ? "lb-neg" : ""}">${ei === null ? "—" : lbSinal(ei)}</td>
        </tr>`;
    }).join("");
    return `
    <div class="lb-tabela-wrap">
        <table class="lb-tabela">
            <thead><tr><th>Recorte</th><th>Casos</th><th>Acerto</th><th>Pips/op</th><th>Invertido</th></tr></thead>
            <tbody>${corpo}</tbody>
        </table>
    </div>`;
}

function lbRender(doc, erro) {
    const raiz = document.getElementById("lbRaiz");
    if (!raiz) return;
    const api = lbPlacarApi();

    const aviso = `
        <section class="pa-vidro lb-cartao">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">O que é isto</p>
            <p class="pn-texto">Um mercado simulado em paralelo. <b>Não gera sinal, não manda aviso e não altera o RMI.</b> Serve para testar ideias (outras saídas, filtros) sem mexer no sinal oficial durante o congelamento. Tudo já desconta o spread da conta Standard.</p>
        </section>`;

    if (erro || !api) {
        raiz.innerHTML = aviso + `<section class="pa-vidro lb-cartao"><p class="pn-texto">${erro ? erro : "Módulo do placar não carregou."}</p></section>`;
        return;
    }
    if (!doc) {
        raiz.innerHTML = aviso + `<section class="pa-vidro lb-cartao"><p class="pn-texto">Ainda sem placar publicado. O rotulador roda de hora em hora com o mercado aberto; volte depois da próxima execução.</p></section>`;
        return;
    }

    const linhas = Array.isArray(doc.linhas) ? doc.linhas : [];
    const placar = api.montarPlacar(linhas, { tipo: lbTipo, epoca: lbEpoca }).map(h => {
        const r = LB_ROTULOS_GRUPO[h.id] || ["A", "B"];
        return { ...h, rotuloA: r[0], rotuloB: r[1] };
    });
    const totalPos = linhas.filter(l => l.tipo === lbTipo && l.epoca === "pos" && l.variante === "ATUAL" && l.grupo === "TODOS").reduce((s, l) => s + l.n, 0);
    const totalPre = linhas.filter(l => l.tipo === lbTipo && l.epoca === "pre" && l.variante === "ATUAL" && l.grupo === "TODOS").reduce((s, l) => s + l.n, 0);
    const tipoAjuda = (LB_TIPOS.find(t => t.id === lbTipo) || {}).ajuda || "";
    const preAviso = lbEpoca === "pre"
        ? `<p class="lb-alerta">Antes do registro: são os dados que originaram as hipóteses. <b>Não valem como prova</b>, só como triagem.</p>`
        : (totalPos === 0 ? `<p class="lb-alerta">Ainda nenhuma operação fechada depois do registro (${lbQuando(doc.registradoEm)}). Os números aparecem conforme o mercado andar.</p>` : "");

    raiz.innerHTML = `
        ${aviso}
        <section class="pa-vidro lb-cartao">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">Escolha o recorte</p>
            <div class="pn-chips lb-chips" role="group" aria-label="Tipo">${lbChips(LB_TIPOS, lbTipo, "data-lb-tipo")}</div>
            <p class="lb-ajuda">${tipoAjuda}</p>
            <div class="pn-chips lb-chips" role="group" aria-label="Época">${lbChips(LB_EPOCAS, lbEpoca, "data-lb-epoca")}</div>
            <p class="lb-ajuda pa-num-sans">Registro: ${lbQuando(doc.registradoEm)} · atualizado ${lbQuando(doc.geradoEm)} (${lbHa(doc.geradoEm)}) · casos fechados: ${totalPos} depois, ${totalPre} antes</p>
            ${preAviso}
        </section>

        <section class="pa-vidro lb-cartao">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">Hipóteses (registradas em 03/10)</p>
            <p class="lb-ajuda">Cada uma diz que o grupo A acerta menos que o B. Só conta se a diferença for de 10 pontos ou mais, repetida nos dados novos, com pelo menos 100 casos por grupo.</p>
            ${lbHipotesesHTML(placar)}
        </section>

        <section class="pa-vidro lb-cartao">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">E se a saída fosse outra?</p>
            <p class="lb-ajuda">Mesmas entradas, saídas diferentes. “Pips/op” é o ganho médio por operação (positivo = lucro). O que importa é Pips/op, não só o acerto.</p>
            ${lbVariantesHTML(linhas, api)}
        </section>

        <section class="pa-vidro lb-cartao">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">Por recorte (exploratório)</p>
            <p class="lb-ajuda">Só gera hipótese, <b>não decide nada</b>: são muitos recortes e alguns parecem bons por acaso. “Invertido” é o resultado do lado oposto na mesma entrada.</p>
            ${lbRecortesHTML(linhas)}
        </section>

        <section class="pa-vidro lb-cartao">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">Como ler com cuidado</p>
            <ul class="lb-notas">
                <li><b>Poucos casos enganam.</b> Abaixo de 100 por grupo é só triagem; para distinguir 55% de 44% são ~300 por grupo.</li>
                <li><b>Acerto = ganhos ÷ casos.</b> Zero a zero e saídas antecipadas não contam como ganho.</li>
                <li><b>Na dúvida, perde.</b> Se o preço tocou alvo e stop no mesmo candle de 5 min, conta como perda.</li>
                <li><b>Só pares livres.</b> O scanner não analisa par com operação aberta ou recém-aberta, então “Todas as análises” não é o mercado inteiro.</li>
                <li><b>Nada aqui muda o sinal.</b> Mudança no oficial só depois das 100 operações e com sua aprovação.</li>
            </ul>
        </section>`;
}

async function carregarLaboratorio() {
    const raiz = document.getElementById("lbRaiz");
    if (!raiz) return;
    try {
        const doc = await lbCarregarDoc();
        lbRender(doc, null);
    } catch (e) {
        lbRender(null, `Não foi possível ler o Laboratório agora (${e && e.message ? e.message : "erro"}).`);
    }
}

document.addEventListener("click", (e) => {
    const alvo = e.target.closest ? e.target.closest("[data-lb-tipo],[data-lb-epoca]") : null;
    if (!alvo) return;
    if (alvo.dataset.lbTipo) lbTipo = alvo.dataset.lbTipo;
    if (alvo.dataset.lbEpoca) lbEpoca = alvo.dataset.lbEpoca;
    if (lbCache.doc !== undefined) lbRender(lbCache.doc, null);
});
