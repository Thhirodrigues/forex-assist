// ===================================================
// FOREX ASSIST - "SOMBRA" RETROSPECTIVA DO EXECUTOR v1.20 SOBRE O HISTÓRICO DO APP (23/11/2026; SOMENTE LEITURA, DESCRITIVA)
//
// Pergunta do usuário: "a máquina precisa saber o que acontece com frequência para decidir como gerenciar". Enquanto o log real
// [GESTAO-LOG] do v1.20 não existe (o MT5 só pode ser mexido à noite), reconstrói com os sinais do app o que o EA faria no MODO 1:
// o EA toma o sinal se (a) não há posição no mesmo par e (b) há menos de 3 posições abertas (regras de base, que valem sempre);
// sobre os sinais tomados, avalia SEM bloquear: exposição líquida por MOEDA (limite 2), pausa 17h-19h (Brasília) e parada do dia
// (resultado FECHADO de hoje <= -US$ 15 ou >= +US$ 10). A posição do EA fecha, aqui, quando o SINAL do app fecha (aproximação: na XM
// o stop sai antes, por causa do spread). US$ do app (sem spread); pips com o spread da tabela do Lab.
// ===================================================
const { selecionarFechadas } = require("../marco/regra625");
const { registro } = require("./analise400");

const BRT = 3 * 3600e3;
const MAX_POS = 3, MAX_MOEDA = 2, PERDA = 15, META = 10;
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const diaBrt = (ms) => new Date(Number(ms) - BRT).toISOString().slice(0, 10);
const horaBrt = (ms) => new Date(Number(ms) - BRT).getUTCHours();
const compraDe = (s) => /BUY|COMPRA/i.test(String(s.direcao));

// contribuição de uma posição à exposição de uma moeda: +1 comprado na moeda, -1 vendido, 0 sem a moeda
function exp(moeda, par, compra) {
    const [b, q] = String(par).split("/");
    return moeda === b ? (compra ? 1 : -1) : moeda === q ? (compra ? -1 : 1) : 0;
}

function simular(historico) {
    const sinais = selecionarFechadas(historico).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const tomados = [], pulados = { mesmoPar: 0, maxPosicoes: 0 };
    const flags = { moeda: [], horario: [], perdaDia: [], metaDia: [] }, qualquer = [], limpos = [];
    const porMoeda = {};
    for (const s of sinais) {
        const t = Number(s.timestamp);
        const abertas = tomados.filter(o => Number(o.fimOperacao) > t);
        if (abertas.some(o => o.par === s.par)) { pulados.mesmoPar++; continue; }
        if (abertas.length >= MAX_POS) { pulados.maxPosicoes++; continue; }
        const [b, q] = s.par.split("/"), compra = compraDe(s);
        const net = (m) => abertas.reduce((a, o) => a + exp(m, o.par, compraDe(o)), 0);
        const nb = net(b) + exp(b, s.par, compra), nq = net(q) + exp(q, s.par, compra);
        const moedaViolada = Math.abs(nb) > MAX_MOEDA ? b : Math.abs(nq) > MAX_MOEDA ? q : null;
        const h = horaBrt(t);
        const hoje = tomados.filter(o => Number(o.fimOperacao) <= t && diaBrt(o.fimOperacao) === diaBrt(t)).reduce((a, o) => a + (Number(o.resultadoFinanceiro) || 0), 0);
        const f = { moeda: !!moedaViolada, horario: h === 17 || h === 18, perdaDia: hoje <= -PERDA, metaDia: hoje >= META };
        tomados.push(s);
        for (const k of Object.keys(f)) if (f[k]) flags[k].push(s);
        if (moedaViolada) porMoeda[moedaViolada] = (porMoeda[moedaViolada] || 0) + 1;
        (Object.values(f).some(Boolean) ? qualquer : limpos).push(s);
    }
    const res = (lista) => ({ n: lista.length, usd: r2(lista.reduce((a, s) => a + (Number(s.resultadoFinanceiro) || 0), 0)), pipsLiqPorOp: lista.length ? r2(media(lista.map(s => registro(s).liq))) : null,
        acertoPct: lista.length ? r1(100 * lista.filter(s => s.resultado === "WIN").length / lista.length) : null });
    return { sinais: sinais.length, tomadosPelasRegrasDeBase: tomados.length, puladosMesmoPar: pulados.mesmoPar, puladosMax3: pulados.maxPosicoes,
        moedasQueMaisViolam: porMoeda, quandoDispararia: { moeda: flags.moeda.length, horario: flags.horario.length, perdaDia: flags.perdaDia.length, metaDia: flags.metaDia.length },
        resultadoDosTomados: res(tomados), comAlgumAviso: res(qualquer), semAviso: res(limpos),
        porRegra: Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, res(v)])) };
}

module.exports = { simular, exp };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        for (const [k, v] of Object.entries(simular(h))) console.log(`SOMBRA ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
