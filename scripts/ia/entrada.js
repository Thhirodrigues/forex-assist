// ===================================================
// FOREX ASSIST - SINAL POR IA - ENTRADA DO MODELO (funções puras)
// Só dados que JÁ existiam no instante do sinal (análises salvas pelo scanner). Nenhum dado futuro, nenhuma consulta nova.
// ===================================================

const crypto = require("crypto");

// null/undefined/"" NÃO viram 0 (Number(null) === 0): dado ausente tem que chegar ao modelo como ausente
const arred = (x, d) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? null : Number(Number(x).toFixed(d)));

// última análise de cada par dentro da janela de frescor
function ultimasPorPar(analises, agora, frescorMin) {
    const limite = agora - frescorMin * 60000;
    const porPar = {};
    for (const a of analises) {
        if (!a || !a.par || !(a.timestamp > limite) || a.timestamp > agora) continue;
        if (!porPar[a.par] || a.timestamp > porPar[a.par].timestamp) porPar[a.par] = a;
    }
    return porPar;
}

// resumo compacto por par (o que o modelo enxerga). `mercado` = entrada de `scanner/mercado` do par (preço e variação), opcional.
function resumoDoPar(a, agora, mercado) {
    const m = mercado && Number.isFinite(Number(mercado.preco)) ? {
        precoMercadoRecente: arred(mercado.preco, 5), v1hPct: arred(mercado.v1h, 3), v24hPct: arred(mercado.v24h, 3),
        mercadoMinutosAtras: Number.isFinite(Number(mercado.ate)) ? Math.max(0, Math.round((agora - Number(mercado.ate)) / 60000)) : null
    } : {};
    return {
        ...m,
        par: a.par,
        minutosAtras: Math.round((agora - a.timestamp) / 60000),
        precoNaAnalise: arred(a.precoEntrada, 5),
        tendencia: a.tendencia || null,
        score: arred(a.score, 0),
        rsi: arred(a.indicadores?.rsi, 1),
        adx: arred(a.indicadores?.adx, 1),
        atr: arred(a.indicadores?.atr, 6),
        direcaoDoApp: a.aprovado === true && (a.direcao === "BUY" || a.direcao === "SELL") ? a.direcao : null,
        tpPips: arred(a.tpPips, 1),
        slPips: arred(a.slPips, 1)
    };
}

function montarEntrada(porPar, agora, mercadoPorPar = {}) {
    return Object.values(porPar).sort((x, y) => x.par.localeCompare(y.par)).map(a => resumoDoPar(a, agora, mercadoPorPar[a.par.replace("/", "_")]));
}

const hashDe = (obj) => crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);

module.exports = { ultimasPorPar, resumoDoPar, montarEntrada, hashDe };
