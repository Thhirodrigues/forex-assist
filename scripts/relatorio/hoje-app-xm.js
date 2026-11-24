// ===================================================
// FOREX ASSIST - O DIA DO APP CONTRA O DIA DA XM, SINAL A SINAL (SOMENTE LEITURA)
//
// Pedido do usuário (24/11/2026): "preciso que o app e a XM trabalhem iguais". Lê o `historico` oficial (admin), pega os sinais cujo `timestamp`
// cai no dia de Brasília pedido e cruza, pelo ID (`${timestamp}_${PAR}`, o mesmo que o executor grava no log), com o que o executor fez:
// ENTROU, PULADO por limite de posições, PULADO por já existir posição, ou NÃO CHEGOU (nem entrou nem foi pulado). O arquivo do dia vem da leitura
// do log do MT5 (`DOCUMENTACAO/xm-executor-dias/AAAA-MM-DD.json`). Mostra o que o app contou no dia e o que a XM contou, e por que diferem.
// ===================================================
const BRT = 3 * 3600e3;
const r2 = (x) => Math.round(x * 100) / 100;
const hhmm = (ms) => new Date(Number(ms) - BRT).toISOString().slice(11, 16);

function destino(id, dia) {
    if (dia.entrou.includes(id)) return "ENTROU";
    if ((dia.pulado_limite_3 || []).includes(id)) return "PULADO_LIMITE_3";
    if ((dia.pulado_ja_existe_posicao || []).includes(id)) return "PULADO_JA_EXISTE";
    return "NAO_CHEGOU";
}

function cruzarDia(historico, dia) {
    const ini = Date.parse(`${dia.dia_brt}T00:00:00Z`) + BRT, fim = ini + 24 * 3600e3;
    const sinais = historico.filter(s => Number(s.timestamp) >= ini && Number(s.timestamp) < fim).sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
        .map(s => ({ id: s.id, par: s.par, dir: s.direcao, hora: hhmm(s.timestamp), status: s.status, resultado: s.resultado || null, usd: Number(s.resultadoFinanceiro) || 0,
            fechouEm: s.fimOperacao ? hhmm(s.fimOperacao) : null, destino: destino(s.id, dia), tp: Math.abs(Number(s.financeiro && s.financeiro.tpPips)) || null, spreadApp: Number(s.spreadAplicadoPips) || 0 }));
    const fechado = (s) => s.status === "ENCERRADA" && (s.resultado === "WIN" || s.resultado === "LOSS");
    const agrega = (l) => { const f = l.filter(fechado); return { sinais: l.length, fechados: f.length, win: f.filter(s => s.resultado === "WIN").length, loss: f.filter(s => s.resultado === "LOSS").length, abertos: l.filter(s => s.status === "ABERTA").length, usd: r2(f.reduce((a, s) => a + s.usd, 0)) }; };
    const por = (d) => sinais.filter(s => s.destino === d);
    const idsLog = new Set([...dia.entrou, ...(dia.pulado_limite_3 || []), ...(dia.pulado_ja_existe_posicao || [])]);
    const noLogSemSinal = [...idsLog].filter(id => !sinais.some(s => s.id === id));          // ID do log que não está no histórico do dia
    const porHora = {}; for (const s of sinais) { const h = s.hora.slice(0, 2); porHora[h] = (porHora[h] || 0) + 1; }
    return { sinais, app: agrega(sinais), entrou: agrega(por("ENTROU")), puladoLimite: agrega(por("PULADO_LIMITE_3")), puladoJaExiste: agrega(por("PULADO_JA_EXISTE")), naoChegou: agrega(por("NAO_CHEGOU")), noLogSemSinal, sinaisPorHoraBrt: porHora };
}

module.exports = { cruzarDia, destino, hhmm };

if (require.main === module) {
    (async () => {
        const fs = require("fs");
        const admin = require("firebase-admin");
        const arg = process.argv.find(a => a.startsWith("--dia=")), diaStr = arg ? arg.split("=")[1] : "2026-11-24";
        const dia = JSON.parse(fs.readFileSync(`DOCUMENTACAO/xm-executor-dias/${diaStr}.json`, "utf8"));
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const r = cruzarDia(h, dia), sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log(`dia ${diaStr} (BRT): ${r.sinais.length} sinais do app no histórico`);
        for (const s of r.sinais) console.log(`SINAL ${sc(s)}`);
        for (const k of ["app", "entrou", "puladoLimite", "puladoJaExiste", "naoChegou"]) console.log(`TOTAL ${k} = ${sc(r[k])}`);
        console.log(`LOG_SEM_SINAL = ${sc(r.noLogSemSinal)}`);
        console.log(`SINAIS_POR_HORA_BRT = ${sc(r.sinaisPorHoraBrt)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
