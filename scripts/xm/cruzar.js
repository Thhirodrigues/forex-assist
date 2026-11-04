// ===================================================
// FOREX ASSIST - CRUZAMENTO operação da XM x sinal do app (SOMENTE LEITURA; nada grava, nada toca no sinal).
// Para cada operação fechada da conta XM desde o marco do teste, acha o sinal do app que a originou (mesmo par e direção,
// o mais recente ANTES da entrada, dentro da janela) e mede: atraso de entrada, diferença de preço de entrada (pips),
// TP/SL reais em pips x os do app, e resultado do app x resultado líquido da XM.
// Sinal ambíguo ou sem par encontrado fica marcado (não adivinha). Cada sinal casa com no máximo UMA operação.
// ===================================================
const { fatorPip } = require("../../lab/simulador");

const JANELA_MIN_PADRAO = 90;   // o usuário entra logo; sinal mais velho que isso é suspeito, não casa automaticamente

const pips = (par, a, b) => Number((Math.abs(a - b) * fatorPip(par)).toFixed(1));

function casar(opsXM, sinais, { janelaMin = JANELA_MIN_PADRAO } = {}) {
    const usados = new Set();
    const saida = [];
    const ordenadas = [...opsXM].sort((a, b) => a.abertoUtc - b.abertoUtc);
    for (const op of ordenadas) {
        if (!op.par || op.abertoUtc == null) { saida.push({ op, casou: false, motivo: "operação sem par/abertura" }); continue; }
        const tEntradaMs = op.abertoUtc * 1000;
        const candidatos = sinais
            .filter(s => s.par === op.par && s.direcao === op.direcao && !usados.has(s.id) &&
                Number(s.inicioOperacao) <= tEntradaMs + 60000 && tEntradaMs - Number(s.inicioOperacao) <= janelaMin * 60000)
            .sort((a, b) => Number(b.inicioOperacao) - Number(a.inicioOperacao));
        if (!candidatos.length) {
            // diagnóstico: sinais do MESMO par (qualquer direção) até 12 h em volta da entrada, para entender por que não casou
            const proximos = sinais.filter(s => s.par === op.par && Math.abs(tEntradaMs - Number(s.inicioOperacao)) <= 12 * 3600e3)
                .sort((a, b) => Number(a.inicioOperacao) - Number(b.inicioOperacao))
                .map(s => ({ sinalEmUtc: new Date(Number(s.inicioOperacao)).toISOString(), dir: s.direcao, minAntesDaEntrada: Number(((tEntradaMs - Number(s.inicioOperacao)) / 60000).toFixed(1)), score: s.score ?? null, status: s.status || null, resultado: s.resultado || null }));
            saida.push({ op: { par: op.par, direcao: op.direcao, abertoUtc: new Date(tEntradaMs).toISOString(), liquido: op.liquido, motivo: op.motivo }, casou: false, motivo: `nenhum sinal ${op.par} ${op.direcao} nos ${janelaMin} min antes da entrada`, sinaisProximos12h: proximos });
            continue;
        }
        const s = candidatos[0];
        usados.add(s.id);
        const f = s.financeiro || {};
        saida.push({
            casou: true, ambiguo: candidatos.length > 1,
            par: op.par, dir: op.direcao, lote: op.lote,
            sinalEmUtc: new Date(Number(s.inicioOperacao)).toISOString(), entradaXmUtc: new Date(tEntradaMs).toISOString(),
            atrasoMin: Number(((tEntradaMs - Number(s.inicioOperacao)) / 60000).toFixed(1)),
            precoApp: Number(s.precoEntrada), precoXm: op.precoEntrada, derrapagemPips: pips(op.par, Number(s.precoEntrada), op.precoEntrada),
            tpPipsApp: f.tpPips ?? null, slPipsApp: f.slPips ?? null,
            tpPipsXm: op.tp != null ? pips(op.par, op.precoEntrada, op.tp) : null, slPipsXm: op.sl != null ? pips(op.par, op.precoEntrada, op.sl) : null,
            loteApp: s.lote ?? null,
            statusApp: s.status || null, resultadoApp: s.resultado || null, usdApp: s.resultadoFinanceiro ?? null, scoreApp: s.score ?? null,
            motivoXm: op.motivo, liquidoXm: op.liquido
        });
    }
    return saida;
}

module.exports = { casar, JANELA_MIN_PADRAO };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const { organizar, parear, MARCO_TESTE_UTC } = require("./ler");
        const oficial = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }, "oficial").firestore();
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }, "lab").firestore();
        const xm = []; (await lab.collection("xm_conta").get()).forEach(d => xm.push({ id: d.id, ...d.data() }));
        const org = organizar(xm);
        const off = org.estado ? Number(org.estado.off) || 0 : 0;
        const t0 = Date.parse(MARCO_TESTE_UTC) / 1000;
        const ops = parear(org.deals, off).fechadas.filter(x => x.fechadoUtc >= t0);
        const desde = Date.parse(MARCO_TESTE_UTC) - 24 * 3600e3;
        const sinais = []; (await oficial.collection("historico").get()).forEach(d => { const x = d.data(); if (Number(x.inicioOperacao) >= desde) sinais.push({ id: d.id, ...x }); });
        console.log(`operações XM do teste: ${ops.length} | sinais do app no período: ${sinais.length}`);
        console.log(JSON.stringify(casar(ops, sinais), null, 2));
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
