// ===================================================
// FOREX ASSIST - BUSCA HONESTA DE REGRAS DE GESTÃO (pedido do usuário em 13/11/2026: "achar uma configuração que me deixe no lucro no
// período"). SOMENTE LEITURA, DESCRITIVO. Achar uma regra lucrativa NA AMOSTRA é sempre possível (é o risco: sobreajuste). Por isso:
//  - a grade é FIXA e escrita aqui antes de rodar (72 combinações, só com informação conhecida na hora de abrir cada sinal);
//  - a escolha é feita numa metade do período (TREINO) e avaliada na outra (TESTE), que a regra nunca viu;
//  - mede-se se o ranking do treino se repete no teste (correlação de postos de Spearman) e quantas combinações são positivas em cada metade.
// Regras: multiplicador do SL (1, 2, 3; TP fixo) x horas do rollover proibidas (17h-19h de Brasília) x pares de custo alto proibidos
// (spread/SL > 10%: EUR/GBP, USD/CHF) x teto de operações por dia (sem teto, 6, 3) x teto de posições abertas no mesmo lado do dólar (sem teto, 2).
// ===================================================
const { resumoTrades } = require("./rejulgar");
const { ladoDolar } = require("../relatorio/analise400");

const r2 = (x) => x === null || x === undefined ? null : Math.round(x * 100) / 100;
const mediana = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const horaBrt = (ms) => new Date(ms - 3 * 3600e3).getUTCHours();
const semanaBrt = (ms) => { const d = new Date(ms - 3 * 3600e3); const dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); };
const PARES_CUSTO_ALTO = ["EUR/GBP", "USD/CHF"];

const GRADE = (() => {
    const g = [];
    for (const mult of [1, 2, 3]) for (const semRollover of [false, true]) for (const semParesCaros of [false, true])
        for (const capDia of [Infinity, 6, 3]) for (const capLado of [Infinity, 2]) g.push({ mult, semRollover, semParesCaros, capDia, capLado });
    return g;
})();
const nomeRegra = (r) => `SLx${r.mult}${r.semRollover ? " +semRollover" : ""}${r.semParesCaros ? " +semParesCaros" : ""}${r.capDia !== Infinity ? ` +max${r.capDia}/dia` : ""}${r.capLado !== Infinity ? ` +max${r.capLado}/ladoUSD` : ""}`;

// trades: saída de julgarVariante (com direcao). Aplica a regra em ordem de abertura; só usa o que já é conhecido na abertura.
function aplicar(trades, r) {
    const ord = [...trades].sort((a, b) => a.t - b.t), tomados = [], porDia = {};
    for (const x of ord) {
        if (r.semRollover && [17, 18, 19].includes(horaBrt(x.t))) continue;
        if (r.semParesCaros && PARES_CUSTO_ALTO.includes(x.par)) continue;
        if ((porDia[x.dia] || 0) >= r.capDia) continue;
        const lado = ladoDolar(x.par, x.direcao);
        if (r.capLado !== Infinity && lado !== "cruzado" && tomados.filter(y => y.fim > x.t && ladoDolar(y.par, y.direcao) === lado).length >= r.capLado) continue;
        tomados.push(x); porDia[x.dia] = (porDia[x.dia] || 0) + 1;
    }
    return tomados;
}

function semanas(lista) {
    const m = {}; for (const x of lista) m[semanaBrt(x.t)] = (m[semanaBrt(x.t)] || 0) + x.pnl;
    const v = Object.values(m); return { semanas: v.length, positivas: v.filter(z => z > 0).length, melhor: r2(Math.max(...v)), pior: r2(Math.min(...v)) };
}
const avaliar = (lista) => ({ ...resumoTrades(lista), ...(lista.length ? { sem: semanas(lista) } : {}) });

function postos(v) { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const p = new Array(v.length); idx.forEach(([, i], k) => { p[i] = k + 1; }); return p; }
function spearman(a, b) {
    const n = a.length; if (n < 3) return null;
    const pa = postos(a), pb = postos(b), ma = (n + 1) / 2;
    let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (pa[i] - ma) * (pb[i] - ma); da += (pa[i] - ma) ** 2; db += (pb[i] - ma) ** 2; }
    return r2(num / Math.sqrt(da * db));
}

/**
 * @param {{1:object[],2:object[],3:object[]}} tradesPorMult  trades de julgarVariante para cada multiplicador de SL
 * @param {{fracaoTreino?:number, nMin?:number}} op
 */
function buscar(tradesPorMult, { fracaoTreino = 0.5, nMin = 30 } = {}) {
    const todos = Object.values(tradesPorMult).flat();
    const dias = [...new Set(todos.map(x => x.dia))].sort();
    const corte = dias[Math.floor(dias.length * fracaoTreino) - 1];                  // último dia do treino
    const treinoDia = (x) => x.dia <= corte;
    const linhas = GRADE.map(r => {
        const tomados = aplicar(tradesPorMult[r.mult], r);
        const tr = tomados.filter(treinoDia), te = tomados.filter(x => !treinoDia(x));
        return { regra: nomeRegra(r), treino: avaliar(tr), teste: avaliar(te) };
    });
    const validas = linhas.filter(l => l.treino.n >= nMin && l.teste.n >= nMin);
    const porTreino = [...validas].sort((a, b) => b.treino.pipsPorOp - a.treino.pipsPorOp);
    const base = linhas.find(l => l.regra === "SLx1");
    const corr = spearman(validas.map(l => l.treino.pipsPorOp), validas.map(l => l.teste.pipsPorOp));
    const pct = (arr, f) => r2(100 * arr.filter(f).length / (arr.length || 1));
    return {
        diasTreino: dias.filter(d => d <= corte).length, diasTeste: dias.filter(d => d > corte).length, ultimoDiaTreino: corte, combinacoes: GRADE.length, validas: validas.length,
        base, melhoresDoTreino: porTreino.slice(0, 5), piorDoTreino: porTreino[porTreino.length - 1],
        persistencia: { spearmanTreinoTeste: corr, positivasNoTreinoPct: pct(validas, l => l.treino.pipsPorOp > 0), positivasNoTestePct: pct(validas, l => l.teste.pipsPorOp > 0),
            medianaTreino: r2(mediana(validas.map(l => l.treino.pipsPorOp))), medianaTeste: r2(mediana(validas.map(l => l.teste.pipsPorOp))),
            melhor5TreinoNoTeste: r2(porTreino.slice(0, 5).reduce((a, l) => a + l.teste.pipsPorOp, 0) / Math.max(1, Math.min(5, porTreino.length))) },
        melhoresDoTeste: [...validas].sort((a, b) => b.teste.pipsPorOp - a.teste.pipsPorOp).slice(0, 3).map(l => ({ regra: l.regra, treino: l.treino.pipsPorOp, teste: l.teste.pipsPorOp }))
    };
}

module.exports = { GRADE, nomeRegra, aplicar, buscar, spearman, avaliar };
