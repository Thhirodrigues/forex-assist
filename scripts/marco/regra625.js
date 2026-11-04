// ===================================================
// FOREX ASSIST - MARCOS DA REGRA 6.25 (leitura do `historico` oficial por credencial de ADMINISTRADOR)
//
// Por que existe: até 04/11/2026 os marcos (100, 200, 400 fechadas) eram calculados lendo o `historico` com a chave web pública do app.
// Ao trancar o banco (AJUSTE-092 etapa 3) essa leitura deixa de funcionar; o robô do GitHub Actions (credencial de administrador) continua.
// SOMENTE LEITURA. Mesma métrica da 6.25: pips líquidos por operação (variante ATUAL, época pós-zerar de 04/10/2026 00:42Z,
// `regimeTPSL=CONFIG`, só WIN/LOSS encerradas, ordem de fechamento, spread da tabela do Lab), IC95 por bootstrap em BLOCOS DE DIA.
// NÃO aplica R1/R2/R3 sozinho: a decisão exige também a comparação com o ALEATORIO e a leitura da regra (caderno 6.25).
// ===================================================

const { spreadDoPar } = require("../../lab/spreads");

const ZERAR = Date.UTC(2026, 9, 4, 0, 42);
const dia = (t) => new Date(t - 3 * 3600e3).toISOString().slice(0, 10);   // dia em horário de Brasília

function selecionarFechadas(h) {
    return h.filter(s => s.timestamp >= ZERAR && s.financeiro && s.financeiro.regimeTPSL === "CONFIG" && s.status === "ENCERRADA" && (s.resultado === "WIN" || s.resultado === "LOSS"))
        .sort((a, b) => a.fimOperacao - b.fimOperacao);
}

function metricas(lista, rot, spread = spreadDoPar) {
    if (!lista.length) return { rot, n: 0 };
    const regs = lista.map(s => {
        const tp = Math.abs(Number(s.financeiro.tpPips)), sl = Math.abs(Number(s.financeiro.slPips));
        const bruto = s.resultado === "WIN" ? tp : -sl;
        return { dia: dia(s.timestamp), bruto, liq: bruto - spread(s.par), win: s.resultado === "WIN", usd: Number(s.resultadoFinanceiro) || 0 };
    });
    const n = regs.length, media = (k) => regs.reduce((a, r) => a + r[k], 0) / n;
    const dias = [...new Set(regs.map(r => r.dia))];
    const por = Object.fromEntries(dias.map(d => [d, regs.filter(r => r.dia === d)]));
    let x = 987654321; const rnd = () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const B = 10000, med = [], medB = [];
    for (let b = 0; b < B; b++) {
        let s = 0, sb = 0, c = 0;
        for (let i = 0; i < dias.length; i++) { const g = por[dias[Math.floor(rnd() * dias.length)]]; for (const r of g) { s += r.liq; sb += r.bruto; c++; } }
        med.push(s / c); medB.push(sb / c);
    }
    med.sort((a, b) => a - b); medB.sort((a, b) => a - b);
    const ic = (v) => [v[Math.floor(0.025 * B)], v[Math.floor(0.975 * B)]].map(z => Number(z.toFixed(2)));
    return {
        rot, n, dias: dias.length, acertoPct: Number((100 * regs.filter(r => r.win).length / n).toFixed(1)),
        brutoPips: Number(media("bruto").toFixed(2)), icBruto: ic(medB), liquidoPips: Number(media("liq").toFixed(2)), icLiquido: ic(med),
        usdAppSemSpread: Number(regs.reduce((a, r) => a + r.usd, 0).toFixed(1))
    };
}

function relatorio(historico, agoraMs = Date.now()) {
    const fe = selecionarFechadas(historico);
    const abertas = historico.filter(s => s.timestamp >= ZERAR && s.status === "ABERTA").length;
    const diasCorridos = Math.floor((agoraMs - ZERAR) / 86400000);
    const marcos = {};
    for (const alvo of [100, 200, 400, 700, 1000]) marcos[alvo] = fe.length >= alvo ? new Date(fe[alvo - 1].fimOperacao).toISOString() : "ainda não";
    return {
        zerarUtc: new Date(ZERAR).toISOString(), fechadasConfig: fe.length, abertasNoApp: abertas, diasCorridosDesdeZerar: diasCorridos,
        primeiraFechouUtc: fe.length ? new Date(fe[0].fimOperacao).toISOString() : null, ultimaFechouUtc: fe.length ? new Date(fe[fe.length - 1].fimOperacao).toISOString() : null,
        marcos,
        // checagem do marco das 400 (6.37): 400 fechadas E >= 30 dias corridos desde o zerar
        marco400Atingido: fe.length >= 400 && diasCorridos >= 30,
        janelas: [
            metricas(fe.slice(0, 100), "100 primeiras"), metricas(fe.slice(0, 200), "200 primeiras"),
            fe.length >= 400 ? metricas(fe.slice(0, 400), "400 primeiras (congelar contagem antes de olhar)") : { rot: "400 primeiras", n: 0, motivo: `faltam ${400 - fe.length}` },
            metricas(fe, `TODAS (${fe.length})`)
        ]
    };
}

module.exports = { ZERAR, selecionarFechadas, metricas, relatorio };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const app = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) });
        const snap = await app.firestore().collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        console.log(`documentos lidos em historico: ${h.length}`);
        console.log(JSON.stringify(relatorio(h), null, 2));
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
