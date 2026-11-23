// Conferência SOMENTE LEITURA do AJUSTE-117: algum sinal fechado traz `spreadAplicadoPips`? Procura na coleção TODA (sem filtro de hora). (23/11/2026)
const admin = require("firebase-admin");
(async () => {
    const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
    const snap = await db.collection("historico").get();
    const l = []; snap.forEach(d => l.push({ id: d.id, ...d.data() }));
    const com = l.filter(s => s.spreadAplicadoPips !== undefined);
    console.log(`documentos: ${l.length}; COM o campo spreadAplicadoPips: ${com.length}`);
    for (const s of com) console.log(`CONF ${s.par} ${s.direcao} ${s.status} ${s.resultado} ${s.motivoEncerramento} usd=${s.resultadoFinanceiro} spreadAplicadoPips=${s.spreadAplicadoPips} aberto=${new Date(Number(s.timestamp)).toISOString()} fim=${s.fimOperacao ? new Date(Number(s.fimOperacao)).toISOString() : "-"}`);
    // as 5 mais recentes encerradas, com ou sem o campo, para ver o que foi gravado por último
    const ult = l.filter(s => s.status === "ENCERRADA").sort((a, b) => Number(b.fimOperacao) - Number(a.fimOperacao)).slice(0, 5);
    for (const s of ult) console.log(`ULT ${s.par} ${s.direcao} ${s.resultado} ${s.motivoEncerramento} usd=${s.resultadoFinanceiro} spread=${s.spreadAplicadoPips} aberto=${new Date(Number(s.timestamp)).toISOString()} fim=${new Date(Number(s.fimOperacao)).toISOString()}`);
    const eg = l.filter(s => s.par === "EUR/GBP").sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).slice(0, 2);
    for (const s of eg) console.log(`EURGBP ${s.direcao} status=${s.status} ${s.resultado} ${s.motivoEncerramento} usd=${s.resultadoFinanceiro} spread=${s.spreadAplicadoPips} aberto=${new Date(Number(s.timestamp)).toISOString()} fim=${s.fimOperacao ? new Date(Number(s.fimOperacao)).toISOString() : "-"}`);
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
