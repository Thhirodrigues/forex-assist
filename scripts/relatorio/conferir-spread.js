// Conferência SOMENTE LEITURA do AJUSTE-117: os últimos sinais fechados trazem `spreadAplicadoPips`? (23/11/2026)
const admin = require("firebase-admin");
(async () => {
    const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
    const desde = Date.UTC(2026, 10, 23, 16, 0);                       // a partir da publicação (16:00Z do dia 23)
    const snap = await db.collection("historico").where("timestamp", ">=", desde - 24 * 3600e3).get();
    const l = []; snap.forEach(d => l.push({ id: d.id, ...d.data() }));
    // o horário de fim gravado é o da VELA em que o alvo foi cruzado (pode ser anterior à publicação); por isso: fechados nas últimas 24 h
    const fechados = l.filter(s => s.status === "ENCERRADA" && Number(s.fimOperacao) >= desde - 12 * 3600e3).sort((a, b) => a.fimOperacao - b.fimOperacao);
    const com = fechados.filter(s => Number(s.spreadAplicadoPips) > 0);
    console.log(`fechados nas últimas 36 h: ${fechados.length}; COM spreadAplicadoPips: ${com.length}`);
    for (const s of fechados) console.log(`CONF ${s.par} ${s.direcao} ${s.resultado} ${s.motivoEncerramento} usd=${s.resultadoFinanceiro} spreadAplicadoPips=${s.spreadAplicadoPips} fim=${new Date(Number(s.fimOperacao)).toISOString()}`);
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
