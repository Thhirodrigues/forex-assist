// ===================================================
// FOREX ASSIST - SINAL POR IA - ENTRADA DO MODELO (funções puras)
// Só dados que JÁ existiam no instante do sinal (análises salvas pelo scanner). Nenhum dado futuro, nenhuma consulta nova.
// ===================================================

const crypto = require("crypto");

const arred = (x, d) => (Number.isFinite(Number(x)) ? Number(Number(x).toFixed(d)) : null);

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

// resumo compacto por par (o que o modelo enxerga)
function resumoDoPar(a, agora) {
    return {
        par: a.par,
        minutosAtras: Math.round((agora - a.timestamp) / 60000),
        preco: arred(a.precoEntrada, 5),
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

function montarEntrada(porPar, agora) {
    return Object.values(porPar).sort((x, y) => x.par.localeCompare(y.par)).map(a => resumoDoPar(a, agora));
}

const hashDe = (obj) => crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);

module.exports = { ultimasPorPar, resumoDoPar, montarEntrada, hashDe };
