// Ferramenta administrativa avulsa, NÃO faz parte do pipeline de
// análise/decisão do produto. Só dispara manualmente (workflow_dispatch),
// nunca por cron.
//
// AJUSTE-022 (25/09/2026): configuracoes/geral.winsTotal/lossesTotal
// passam a ser mantidos incrementalmente (js/checker.js no fechamento
// automático, js/historico.js no fechamento manual) - js/desempenho.js
// (Dashboard) lê esses dois campos em vez de escanear/contar a coleção
// historico inteira a cada render (causa raiz real da lentidão
// reportada pelo usuário que motivou a aba Resultados, AJUSTE-021).
//
// Esta ferramenta faz o backfill ÚNICO: conta o total REAL de WIN/LOSS
// já acumulado em `historico` (via .count(), agregação nativa do
// Firestore, suportada no SDK Admin) e grava esse valor real como
// ponto de partida dos contadores - sem isso, winsTotal/lossesTotal
// começariam do zero em vez do total histórico já existente, mostrando
// um número visivelmente errado no Dashboard. Roda uma vez só; depois
// disso os contadores se mantêm sozinhos via incremento.

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function main() {

    const ref = db.collection("configuracoes").doc("geral");

    const antes = await ref.get();
    const dadosAntes = antes.exists ? antes.data() : {};

    console.log(`winsTotal ANTES: ${dadosAntes.winsTotal ?? "(ausente)"}`);
    console.log(`lossesTotal ANTES: ${dadosAntes.lossesTotal ?? "(ausente)"}`);

    const winsSnap = await db.collection("historico")
        .where("resultado", "==", "WIN")
        .count()
        .get();

    const lossesSnap = await db.collection("historico")
        .where("resultado", "==", "LOSS")
        .count()
        .get();

    const winsReal = winsSnap.data().count;
    const lossesReal = lossesSnap.data().count;

    console.log(`Contagem real (via .count()): WIN=${winsReal} LOSS=${lossesReal}`);

    await ref.set({
        winsTotal: winsReal,
        lossesTotal: lossesReal
    }, { merge: true });

    const depois = await ref.get();
    const dadosDepois = depois.data();

    console.log(`winsTotal DEPOIS: ${dadosDepois.winsTotal}`);
    console.log(`lossesTotal DEPOIS: ${dadosDepois.lossesTotal}`);

    if (dadosDepois.winsTotal !== winsReal || dadosDepois.lossesTotal !== lossesReal) {
        console.log("FALHA: valor gravado não bate com a contagem real.");
        process.exit(1);
    }

    console.log("OK: contadores winsTotal/lossesTotal inicializados com o total real.");
    process.exit(0);

}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
