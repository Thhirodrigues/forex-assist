// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-039 (28/09/2026): lê o saldo simulado ATUAL de
// configuracoes/geral e a banca gravada nos últimos sinais. Imprime só
// campos de saldo (lista fixa) - não despeja o documento de config
// inteiro; dos demais campos mostra apenas os NOMES.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function iso(ms) { const n = Number(ms); return Number.isFinite(n) ? new Date(n).toISOString() : String(ms); }

async function main() {

    const cfg = await db.collection("configuracoes").doc("geral").get();
    const c = cfg.exists ? cfg.data() : {};

    console.log("CONFIGURAÇÃO ATUAL DE SALDO (só leitura)");
    console.log(`configuracoes/geral existe: ${cfg.exists}`);
    for (const k of ["saldoSimulado", "saldoInicial", "saldoReal", "baseCalculoRisco", "tipoConta"]) {
        if (k in c) console.log(`  ${k} = ${JSON.stringify(c[k])}`);
    }
    console.log(`  (outros campos, só nomes: ${Object.keys(c).filter(k => !["saldoSimulado", "saldoInicial", "saldoReal", "baseCalculoRisco", "tipoConta"].includes(k)).sort().join(", ")})`);

    const snap = await db.collection("historico").orderBy("timestamp", "desc").limit(5).get();
    console.log("\nBanca gravada nos 5 sinais mais recentes:");
    snap.forEach(doc => {
        const d = doc.data();
        const f = d.financeiro || {};
        console.log(`  ${iso(d.timestamp)} ${String(d.par).padEnd(8)} ${d.direcao} status=${d.status} banca=${f.banca} riscoPercentual=${f.riscoPercentual} regimeTPSL=${f.regimeTPSL}`);
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
