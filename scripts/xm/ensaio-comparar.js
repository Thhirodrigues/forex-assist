// ===================================================
// FOREX ASSIST - COMPARAÇÃO DO ENSAIO DO EXECUTOR (mt5/XM_Executor.mq5 com SoLog=true) x SINAIS REAIS DO APP. SOMENTE LEITURA.
// Entrada: arquivo do ensaio (linhas `FARIA` copiadas do log do MT5) + `historico` oficial (administrador).
// Responde: (1) cada FARIA corresponde a um sinal real do app, na mesma direção e com o mesmo TP/SL em pips?
//           (2) o preço do executor difere de quanto do preço do app (derrapagem)? (3) algum sinal do app na janela NÃO foi visto pelo executor?
// ===================================================
const { fatorPip } = require("../../lab/simulador");

const SENTIDO = { BUY: "BUY", SELL: "SELL" };
const parDoId = (id) => String(id).split("_").slice(1).join("/");   // "1793..._EUR_USD" -> "EUR/USD"
const mediana = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(2)); };

function compararEnsaio(ensaio, sinaisApp) {
    const porId = new Map(sinaisApp.map(s => [s.id, s]));
    const [iniMs, fimMs] = ensaio.janelaUtc.map(Date.parse);
    const vistos = new Set(ensaio.faria.map(f => f.id));
    const linhas = ensaio.faria.map(f => {
        const par = parDoId(f.id), fp = fatorPip(par), s = porId.get(f.id);
        const tpPipsEA = Number((Math.abs(f.tp - f.preco) * fp).toFixed(1)), slPipsEA = Number((Math.abs(f.sl - f.preco) * fp).toFixed(1));
        if (!s) return { id: f.id, par, encontradoNoApp: false, tpPipsEA, slPipsEA };
        const fin = s.financeiro || {};
        const difPreco = Number(((f.dir === "BUY" ? f.preco - s.precoEntrada : s.precoEntrada - f.preco) * fp).toFixed(1));   // positivo = pior que o preço do app
        return {
            id: f.id, par, encontradoNoApp: true, dirIgual: SENTIDO[s.direcao] === f.dir, direcaoApp: s.direcao, direcaoEA: f.dir,
            tpPipsApp: fin.tpPips != null ? Number(Number(fin.tpPips).toFixed(1)) : null, tpPipsEA, slPipsApp: fin.slPips != null ? Number(Number(fin.slPips).toFixed(1)) : null, slPipsEA,
            precoApp: Number(s.precoEntrada), precoEA: f.preco, derrapagemRecalculadaPips: difPreco, derrapagemDoLogPips: f.derrapagemPips,
            statusApp: s.status || null, resultadoApp: s.resultado || null, usdApp: s.resultadoFinanceiro ?? null, scoreApp: s.score ?? null, atrasoS: f.atrasoS
        };
    });
    const naoVistos = sinaisApp.filter(s => Number(s.inicioOperacao) >= iniMs && Number(s.inicioOperacao) <= fimMs && !vistos.has(s.id))
        .map(s => ({ id: s.id, par: s.par, direcao: s.direcao, emitidoUtc: new Date(Number(s.inicioOperacao)).toISOString(), status: s.status, resultado: s.resultado || null }));
    const ok = linhas.filter(l => l.encontradoNoApp);
    const difTpSl = (l) => (l.tpPipsApp != null && Math.abs(l.tpPipsApp - l.tpPipsEA) > 0.6) || (l.slPipsApp != null && Math.abs(l.slPipsApp - l.slPipsEA) > 0.6);
    return {
        faria: ensaio.faria.length, encontradosNoApp: ok.length, direcaoDivergente: ok.filter(l => !l.dirIgual).map(l => l.id),
        tpSlDivergente: ok.filter(difTpSl).map(l => l.id),
        derrapagem: { medianaPips: mediana(ok.map(l => l.derrapagemRecalculadaPips)), maxPior: Math.max(...ok.map(l => l.derrapagemRecalculadaPips)), minMelhor: Math.min(...ok.map(l => l.derrapagemRecalculadaPips)) },
        atrasoMedianoS: mediana(ensaio.faria.map(f => f.atrasoS)), naoVistosPeloExecutor: naoVistos, linhas
    };
}

module.exports = { compararEnsaio, parDoId };

if (require.main === module) {
    (async () => {
        const fs = require("fs"), path = require("path");
        const ensaio = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.ENSAIO || "ensaio-2026-11-05.json"), "utf8"));
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const [ini, fim] = ensaio.janelaUtc.map(Date.parse);
        const snap = await db.collection("historico").where("inicioOperacao", ">=", ini - 3600e3).get();
        const sinais = []; snap.forEach(d => { const x = d.data(); if (Number(x.inicioOperacao) <= fim + 3600e3) sinais.push({ id: d.id, ...x }); });
        console.log(`sinais do app lidos na janela: ${sinais.length}`);
        console.log(JSON.stringify(compararEnsaio(ensaio, sinais), null, 2));
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
