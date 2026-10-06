// ===================================================
// FOREX ASSIST - LABORATÓRIO - TAXAS DE JURO (carry/swap; protocolo 6.23)
//
// Fonte: BIS, "Central bank policy rates" (WS_CBPOL), frequência DIÁRIA (a mensal é média do mês e vazaria dias futuros).
// Guardamos só os DEGRAUS (data em que a taxa mudou) em arrays planos {ts:[],v:[]} (Firestore proíbe array aninhado).
// taxaEm(serie, ts) devolve a última taxa conhecida em ou antes de ts (nunca olha para frente).
// ===================================================

const AREAS = { USD: "US", EUR: "XM", GBP: "GB", JPY: "JP", AUD: "AU", CAD: "CA", CHF: "CH", NZD: "NZ" };
const URL_BIS = (ini = "2007-01-01") => `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.${Object.values(AREAS).join("+")}?format=csv&startPeriod=${ini}`;

function linhasCSV(texto) {
    const linhas = []; let campo = "", linha = [], aspas = false;
    for (let i = 0; i < texto.length; i++) {
        const ch = texto[i];
        if (aspas) { if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; }
        else if (ch === '"') aspas = true;
        else if (ch === ",") { linha.push(campo); campo = ""; }
        else if (ch === "\n" || ch === "\r") { if (ch === "\r" && texto[i + 1] === "\n") i++; linha.push(campo); campo = ""; if (linha.length > 1 || linha[0] !== "") linhas.push(linha); linha = []; }
        else campo += ch;
    }
    if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
}

// -> { USD: { ts: [...], v: [...] }, ... } só com degraus (taxa em %, ex.: 5.25)
function parsearBIS(csv) {
    const linhas = linhasCSV(csv);
    if (!linhas.length) throw new Error("CSV vazio");
    const h = linhas[0].map(s => s.trim());
    const iA = h.indexOf("REF_AREA"), iT = h.indexOf("TIME_PERIOD"), iV = h.indexOf("OBS_VALUE");
    if (iA < 0 || iT < 0 || iV < 0) throw new Error("cabeçalho inesperado: " + h.join("|"));
    const porArea = {};
    for (let i = 1; i < linhas.length; i++) {
        const l = linhas[i]; const v = parseFloat(l[iV]); const ts = Date.parse(l[iT] + "T00:00:00Z");
        if (!Number.isFinite(v) || !Number.isFinite(ts)) continue;
        (porArea[l[iA]] = porArea[l[iA]] || []).push([ts, v]);
    }
    const out = {};
    for (const [moeda, area] of Object.entries(AREAS)) {
        const pts = (porArea[area] || []).sort((a, b) => a[0] - b[0]);
        const ts = [], v = []; let ult = null;
        for (const [t, x] of pts) { if (x !== ult) { ts.push(t); v.push(x); ult = x; } }
        out[moeda] = { ts, v };
    }
    return out;
}

// última taxa (em %) vigente em ts; null se ts é anterior à série
function taxaEm(serie, ts) {
    if (!serie || !serie.ts.length || ts < serie.ts[0]) return null;
    let lo = 0, hi = serie.ts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (serie.ts[m] <= ts) lo = m; else hi = m - 1; }
    return serie.v[lo];
}

module.exports = { AREAS, URL_BIS, linhasCSV, parsearBIS, taxaEm };
