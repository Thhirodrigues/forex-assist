// Ferramenta administrativa avulsa, NÃO faz parte do pipeline de
// análise/decisão do produto. Só dispara manualmente (workflow_dispatch),
// nunca por cron.
//
// AJUSTE-007 (24/09/2026): configuracoes/geral.smcAtivo (MUD-05,
// 17/09/2026) liga a detecção de order block (SMC) no scanner - até
// aqui só dava pra ligar escrevendo direto no Console do Firebase,
// sem nenhum campo na tela de Config nem forma deste ambiente
// escrever no Firestore diretamente (sem credencial aqui, ver
// CLAUDE.md). Este script faz essa escrita uma única vez, com
// confirmação por leitura de volta - mesmo padrão de
// analise-rr-simulacao.js (Firebase Admin com o service account do
// secret, sem tocar em nada além do campo pretendido).

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function main() {

    const ref = db.collection("configuracoes").doc("geral");

    const antes = await ref.get();

    console.log(`smcAtivo ANTES: ${antes.exists ? antes.data().smcAtivo : "(documento não existe)"}`);

    await ref.set({ smcAtivo: true }, { merge: true });

    const depois = await ref.get();

    console.log(`smcAtivo DEPOIS: ${depois.data().smcAtivo}`);

    if (depois.data().smcAtivo !== true) {
        console.log("FALHA: valor não ficou true depois da escrita.");
        process.exit(1);
    }

    console.log("OK: smcAtivo ligado com sucesso em configuracoes/geral.");
    process.exit(0);

}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
