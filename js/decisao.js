// ===================================================
// FOREX ASSIST - APOIO À DECISÃO ("Histórico real" no cartão do sinal ativo)
//
// Pedido do usuário (19-20/11/2026): o app não prevê o futuro; ele mostra, para o sinal que acabou de sair, o que aconteceu
// com sinais parecidos ANTES, e o usuário decide se entra. Inspirado no veredito honesto da "Máquina do Tempo" (6.57).
// O que mostra (sem prever nada):
//   - três recortes do histórico do app desde 04/10/2026 00:42Z (época atual, `regimeTPSL = CONFIG`, só WIN/LOSS fechadas):
//     este par; este horário (todos os pares, hora de Brasília do sinal ±1 h); geral.
//   - acerto com margem (intervalo de Wilson, 95%) e o EMPATE com custo deste sinal: (SL + spread) / (TP + SL), em pips.
//   - veredito por recorte: abaixo do empate (margem inteira abaixo), acima (margem inteira acima), indefinido (margem cruza),
//     amostra pequena (< 20).
//   - aviso fixo: medido pelo app; com o preço real da XM (bid/ask) o acerto foi 4 a 6 pontos menor (LABORATORIO 6.44/6.48/6.52).
// SOMENTE LEITURA: uma consulta a `historico` (timestamp >= época, campo único, sem índice composto), cache de 10 min.
// Não toca no pipeline de sinais.
// ===================================================

const DC_EPOCA_MS = Date.UTC(2026, 9, 4, 0, 42);
const DC_TTL_MS = 10 * 60 * 1000;
const DC_MIN_AMOSTRA = 20;
let dcCache = { t: 0, fechadas: null };

const dcHoraBrt = (ms) => new Date(Number(ms) - 3 * 3600e3).getUTCHours();

function dcSelecionar(docs) {
    return docs.filter(s => Number(s.timestamp) >= DC_EPOCA_MS && s.financeiro && s.financeiro.regimeTPSL === "CONFIG"
        && s.status === "ENCERRADA" && (s.resultado === "WIN" || s.resultado === "LOSS"));
}

// intervalo de Wilson (95%) para uma proporção, em %
function dcWilson(win, n) {
    if (!n) return [null, null];
    const z = 1.96, p = win / n, z2 = z * z;
    const centro = (p + z2 / (2 * n)) / (1 + z2 / n);
    const meia = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n);
    return [100 * Math.max(0, centro - meia), 100 * Math.min(1, centro + meia)];
}

// empate (% de acerto) com custo para ESTE sinal: (SL + spread) / (TP + SL)
function dcEmpate(tpPips, slPips, spreadPips) {
    const tp = Math.abs(Number(tpPips)), sl = Math.abs(Number(slPips)), s = Number(spreadPips) || 0;
    return tp + sl > 0 ? 100 * (sl + s) / (tp + sl) : null;
}

function dcVeredito(lo, hi, n, empate) {
    if (n < DC_MIN_AMOSTRA) return { chave: "pequena", texto: "Amostra pequena" };
    if (empate === null) return { chave: "indef", texto: "Indefinido" };
    if (hi < empate) return { chave: "abaixo", texto: "Abaixo do empate" };
    if (lo > empate) return { chave: "acima", texto: "Acima do empate" };
    return { chave: "indef", texto: "Indefinido: a margem inclui o empate" };
}

function dcLinha(rotulo, lista, empate) {
    const n = lista.length, win = lista.filter(s => s.resultado === "WIN").length;
    const [lo, hi] = dcWilson(win, n);
    return { rotulo, n, win, acerto: n ? 100 * win / n : null, lo, hi, veredito: dcVeredito(lo, hi, n, empate) };
}

// fechadas: já selecionadas; sinal: o ativo (par, timestamp, financeiro.tpPips/slPips)
function dcResumo(fechadas, sinal, spreadPips) {
    const tp = sinal.financeiro ? sinal.financeiro.tpPips : null, sl = sinal.financeiro ? sinal.financeiro.slPips : null;
    const empate = dcEmpate(tp, sl, spreadPips);
    const h = dcHoraBrt(sinal.timestamp), horas = [(h + 23) % 24, h, (h + 1) % 24];
    const fmtH = (x) => String(x).padStart(2, "0") + "h";
    return {
        empate,
        linhas: [
            dcLinha(`${sinal.par}`, fechadas.filter(s => s.par === sinal.par), empate),
            dcLinha(`Das ${fmtH(horas[0])} às ${fmtH((h + 2) % 24)} (todos os pares)`, fechadas.filter(s => horas.includes(dcHoraBrt(s.timestamp))), empate),
            dcLinha("Geral (todos os sinais)", fechadas, empate)
        ]
    };
}

async function dcCarregar() {
    if (dcCache.fechadas && Date.now() - dcCache.t < DC_TTL_MS) return dcCache.fechadas;
    const snap = await db.collection("historico").where("timestamp", ">=", DC_EPOCA_MS).get();
    const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    const fechadas = dcSelecionar(docs);
    dcCache = { t: Date.now(), fechadas };
    return fechadas;
}

const dcPct = (x) => x === null || !Number.isFinite(x) ? "—" : Math.round(x) + "%";
// margem e empate com uma casa: com inteiros, "margem até 54%" e "empate 54%" pareciam se contradizer
const dcPct1 = (x) => x === null || !Number.isFinite(x) ? "—" : x.toFixed(1).replace(".", ",") + "%";

function dcHTML(resumo) {
    const cor = { abaixo: "var(--pa-perda)", acima: "var(--pa-ganho)", indef: "var(--pa-espera)", pequena: "var(--pa-muted)" };
    const linhas = resumo.linhas.map(l => `
        <li class="dc-linha">
            <div class="dc-rotulo">${l.rotulo}</div>
            <div class="dc-num pa-num">${dcPct(l.acerto)} <span class="dc-margem">de acerto · ${l.win} de ${l.n}</span></div>
            ${l.n ? `<div class="dc-margem">margem de ${dcPct1(l.lo)} a ${dcPct1(l.hi)}</div>` : ""}
            <div class="dc-veredito" style="color:${cor[l.veredito.chave]};">${l.veredito.texto}</div>
        </li>`).join("");
    return `
    <section class="pa-vidro dc-bloco" aria-labelledby="dc-tit">
        <p class="pa-eyebrow" id="dc-tit">Histórico real · você decide</p>
        <p class="pn-texto" style="margin-top:6px;">Para este sinal empatar, sinais assim precisam acertar <strong class="pa-num">${dcPct1(resumo.empate)}</strong> (já com o spread). O que aconteceu antes:</p>
        <ul class="dc-lista">${linhas}</ul>
        <p class="dc-nota">Medido pelo app desde 04/10/2026. Com o preço real da XM (bid/ask), o acerto foi de 4 a 6 pontos menor. É histórico, não previsão.</p>
    </section>`;
}

// export para os testes no Node (no navegador não existe `module`)
if (typeof module !== "undefined" && module.exports) module.exports = { dcSelecionar, dcWilson, dcEmpate, dcVeredito, dcResumo, dcHTML, DC_EPOCA_MS };
