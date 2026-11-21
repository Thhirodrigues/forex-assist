// ===================================================
// FOREX ASSIST - SIMULAÇÃO DOS LIMITES DE RISCO (21/11/2026; SOMENTE LEITURA, DESCRITIVA)
//
// Pergunta: se o usuário tivesse seguido só os sinais DENTRO dos limites (perda do dia US$ 15, 3 abertas, 2 por lado do dólar,
// sem 17h-19h de Brasília), quantos sinais teria deixado de tomar e o que muda no resultado? Mesma lógica do app (js/decisao.js).
// Sequencial: cada sinal é avaliado só contra os sinais JÁ TOMADOS. Resultado em US$ do app (SEM spread) e em pips líquidos (spread
// da tabela do Lab). Teorema da parada opcional: regra de parada não muda a esperança por operação; muda quanto se opera e o pior dia.
// ===================================================
const { selecionarFechadas } = require("../marco/regra625");
const { registro } = require("./analise400");
const { drAvaliar, drSelecionar } = require("../../js/decisao");

const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const diaBrt = (ms) => new Date(ms - 3 * 3600e3).toISOString().slice(0, 10);

function resumo(lista) {
    const liq = lista.map(s => registro(s).liq), usd = lista.map(s => Number(s.resultadoFinanceiro) || 0);
    const dias = {}; for (const s of lista) dias[diaBrt(Number(s.timestamp))] = (dias[diaBrt(Number(s.timestamp))] || 0) + (Number(s.resultadoFinanceiro) || 0);
    const v = Object.values(dias);
    return { n: lista.length, usdTotal: r2(usd.reduce((a, x) => a + x, 0)), pipsLiqPorOp: r2(media(liq)), dias: v.length, piorDiaUsd: r2(Math.min(...v)), diasNegativosPct: r1(100 * v.filter(x => x < 0).length / v.length), usdPorDia: r2(media(v)) };
}

function simular(historico) {
    const fe = drSelecionar(selecionarFechadas(historico)).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const tomados = [], bloqueados = [], motivos = { perdaDia: 0, abertas: 0, mesmoLado: 0, horario: 0 }, soUm = { perdaDia: 0, abertas: 0, mesmoLado: 0, horario: 0 };
    for (const s of fe) {
        const av = drAvaliar(tomados, s, Number(s.timestamp));
        if (av.ok) { tomados.push(s); continue; }
        bloqueados.push(s);
        const falhas = av.regras.filter(r => !r.ok).map(r => r.chave);
        for (const k of falhas) motivos[k]++;
        if (falhas.length === 1) soUm[falhas[0]]++;
    }
    // simultâneas: média de posições abertas ao abrir cada sinal (todos x tomados)
    const abertasMedia = (lista) => media(lista.map(s => lista.filter(o => o.id !== s.id && Number(o.timestamp) < Number(s.timestamp) && Number(o.fimOperacao) > Number(s.timestamp)).length));
    return { total: resumo(fe), tomados: resumo(tomados), bloqueados: resumo(bloqueados), bloqueadosPct: r1(100 * bloqueados.length / fe.length), motivosQualquer: motivos, motivosUnico: soUm,
        abertasAoAbrirMedia: { todos: r2(abertasMedia(fe)), tomados: r2(abertasMedia(tomados)) } };
}

module.exports = { simular };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        for (const [k, v] of Object.entries(simular(h))) console.log(`RISCO ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
