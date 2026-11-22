// ===================================================
// FOREX ASSIST - O CAMINHO DO DIA: "o lucro vem antes da perda" e "não ir atrás da perda" (pedido do usuário, 22/11/2026). SOMENTE LEITURA.
//
// Parte 1 (descritiva): em cada dia (Brasília, pelo FECHAMENTO), na ordem em que as operações fecharam, o resultado acumulado do dia
//   toca primeiro +US$ 10 (2 ganhos líquidos), primeiro -US$ 10, ou nenhum dos dois? E depois do toque, as operações que FECHAM em
//   seguida rendem diferente das outras? (se estar na frente ou atrás do dia previsse o que vem, haveria "memória"; sem ela, parar
//   só muda quanto se opera, pelo teorema da parada opcional.)
// Parte 2 (simulação, decisão na ABERTURA, só com o que já fechou no dia): 3 regras definidas ANTES de rodar:
//   A "trava o ganho": hoje já fechou >= +US$ 10 -> não toma mais sinais no dia
//   B "não vai atrás da perda": hoje já fechou <= -US$ 10 -> não toma mais sinais no dia
//   C "A e B juntas": bateu +10 ou -10 -> encerra o dia
// Métricas: sinais tomados, US$ do app (sem spread), pips líquidos por operação (spread da tabela), dias positivos, pior dia.
// ===================================================
const { selecionarFechadas } = require("../marco/regra625");
const { registro } = require("./analise400");
const { resumo } = require("./risco-simulacao");

const BRT = 3 * 3600e3, LIM = 10;
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const dp = (a) => { const m = media(a); return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : null; };
const dia = (ms) => new Date(Number(ms) - BRT).toISOString().slice(0, 10);
const usd = (s) => Number(s.resultadoFinanceiro) || 0;

function caminho(fe) {
    const porDia = {};
    for (const s of [...fe].sort((a, b) => a.fimOperacao - b.fimOperacao)) (porDia[dia(s.fimOperacao)] = porDia[dia(s.fimOperacao)] || []).push(s);
    const grupos = { ganho: [], perda: [], nenhum: [] }, antes = [], depois = { ganho: [], perda: [] }, primeiroWin = [];
    for (const [d, lista] of Object.entries(porDia)) {
        let acum = 0, toque = null, i0 = -1;
        lista.forEach((s, i) => { acum += usd(s); if (!toque && acum >= LIM) { toque = "ganho"; i0 = i; } else if (!toque && acum <= -LIM) { toque = "perda"; i0 = i; } });
        const final = lista.reduce((a, s) => a + usd(s), 0);
        grupos[toque || "nenhum"].push({ d, n: lista.length, final });
        primeiroWin.push(lista[0].resultado === "WIN");
        if (toque) { lista.slice(0, i0 + 1).forEach(s => antes.push(registro(s).liq)); lista.slice(i0 + 1).forEach(s => depois[toque].push(registro(s).liq)); }
        else lista.forEach(s => antes.push(registro(s).liq));
    }
    const dias = Object.values(grupos).reduce((a, g) => a + g.length, 0);
    const desc = (g) => ({ dias: g.length, pct: r1(100 * g.length / dias), finalMedioUsd: r2(media(g.map(x => x.final))), finalPositivoPct: g.length ? r1(100 * g.filter(x => x.final > 0).length / g.length) : null, operacoesPorDia: r1(media(g.map(x => x.n))) });
    const pip = (a) => ({ n: a.length, pipsPorOp: r2(media(a)), erroPadrao: a.length > 1 ? r2(dp(a) / Math.sqrt(a.length)) : null });
    return { dias, primeiraFechadaWinPct: r1(100 * primeiroWin.filter(Boolean).length / primeiroWin.length), tocaPrimeiro: { mais10: desc(grupos.ganho), menos10: desc(grupos.perda), nenhum: desc(grupos.nenhum) },
        operacoesDepoisDoToque: { depoisDeGanhar10: pip(depois.ganho), depoisDePerder10: pip(depois.perda), antesOuSemToque: pip(antes) } };
}

function simularRegra(fe, regra) {
    const ord = [...fe].sort((a, b) => Number(a.timestamp) - Number(b.timestamp)), tomados = [];
    for (const s of ord) {
        const t = Number(s.timestamp);
        const hoje = tomados.filter(o => Number(o.fimOperacao) <= t && dia(o.fimOperacao) === dia(t)).reduce((a, o) => a + usd(o), 0);
        const para = (regra.includes("A") && hoje >= LIM) || (regra.includes("B") && hoje <= -LIM);
        if (!para) tomados.push(s);
    }
    return resumo(tomados);
}

function analisar(historico) {
    const fe = selecionarFechadas(historico);
    return { caminho: caminho(fe), todos: resumo(fe), A_travaGanho: simularRegra(fe, "A"), B_naoVaiAtrasDaPerda: simularRegra(fe, "B"), C_ambas: simularRegra(fe, "AB") };
}

module.exports = { caminho, simularRegra, analisar };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        for (const [k, v] of Object.entries(analisar(h))) console.log(`DIA ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
