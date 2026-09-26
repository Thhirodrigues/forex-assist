// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-030 (26/09/2026): motivado pelo diagnóstico do AJUSTE-029 -
// achado que a expectativa negativa (RR 1:1 exige taxa de acerto >=50%
// pra ser positiva) filtrou 30 sinais pra só 2. Usuário: "a taxa de
// losses está bem maior, por isso sempre questiono a análise - hoje
// não dá pra confiar nos sinais que geramos". Este script responde a
// pergunta de fundo antes de continuar o resto do planejamento
// estratégico: a taxa de acerto real está de fato abaixo de 50%? É
// uniforme ou concentrada nalgum par/perfil/direção/período? E o mais
// importante - o SCORE da RMI tem alguma relação real com o resultado,
// ou sinais de score alto perdem tanto quanto sinais de score baixo
// (o que questionaria o motor de pontuação inteiro, não só um gate)?
//
// Só leitura - nenhuma escrita no Firestore, nenhuma mudança de
// comportamento de produção. Decisão de o que fazer com o resultado
// fica pra depois de ver o número real (mesma disciplina do AJUSTE-027/
// 029).

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

function taxa(wins, total) {
    if (total === 0) return "  n/a";
    return `${((wins / total) * 100).toFixed(1)}%`.padStart(6);
}

function imprimirTabela(titulo, mapa) {
    console.log(`\n${titulo}`);
    const linhas = Object.entries(mapa)
        .map(([chave, v]) => ({ chave, ...v, taxaNum: v.total ? v.wins / v.total : -1 }))
        .sort((a, b) => b.total - a.total);
    for (const l of linhas) {
        console.log(`  ${String(l.chave).padEnd(16)} | ${String(l.wins).padStart(4)}W ${String(l.loss).padStart(4)}L | ${taxa(l.wins, l.total)} (n=${l.total})`);
    }
}

function acumular(mapa, chave, resultado) {
    if (!mapa[chave]) mapa[chave] = { wins: 0, loss: 0, total: 0 };
    mapa[chave].total++;
    if (resultado === "WIN") mapa[chave].wins++;
    else mapa[chave].loss++;
}

async function main() {

    const snap = await db.collection("historico")
        .where("resultado", "in", ["WIN", "LOSS"])
        .get();

    let wins = 0, loss = 0, total = 0;

    const porPar = {};
    const porPerfil = {};
    const porDirecao = {};
    const porFaixaScore = {};
    const porSemana = {};

    const scoresWin = [];
    const scoresLoss = [];

    snap.forEach(doc => {

        const d = doc.data();
        const resultado = d.resultado;
        if (resultado !== "WIN" && resultado !== "LOSS") return;

        total++;
        if (resultado === "WIN") wins++; else loss++;

        acumular(porPar, d.par || "(sem par)", resultado);
        acumular(porPerfil, d.perfil || "(sem perfil)", resultado);
        acumular(porDirecao, d.direcao || "(sem direção)", resultado);

        const score = Number(d.score);
        if (Number.isFinite(score)) {

            if (resultado === "WIN") scoresWin.push(score); else scoresLoss.push(score);

            const faixa =
                score < 45 ? "35-44" :
                score < 55 ? "45-54" :
                score < 65 ? "55-64" :
                score < 75 ? "65-74" :
                "75+";

            acumular(porFaixaScore, faixa, resultado);

        }

        const ts = Number(d.timestamp);
        if (Number.isFinite(ts)) {
            const semanaIdx = Math.floor(ts / (7 * 24 * 3600 * 1000));
            acumular(porSemana, `semana_${semanaIdx}`, resultado);
            porSemana[`semana_${semanaIdx}`].minTs = Math.min(porSemana[`semana_${semanaIdx}`].minTs ?? ts, ts);
            porSemana[`semana_${semanaIdx}`].maxTs = Math.max(porSemana[`semana_${semanaIdx}`].maxTs ?? ts, ts);
        }

    });

    const media = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "n/a";

    console.log("========================================");
    console.log("DIAGNÓSTICO - TAXA DE ACERTO REAL");
    console.log("(só leitura - nada foi escrito no Firestore)");
    console.log("========================================");
    console.log(`Total WIN/LOSS: ${total} | ${wins}W ${loss}L | Taxa de acerto GLOBAL: ${taxa(wins, total)}`);
    console.log(`(referência: com RR 1:1 fixo, TP=SL, expectativa só é >=0 com taxa de acerto >=50%)`);

    imprimirTabela("Por PAR:", porPar);
    imprimirTabela("Por PERFIL (rótulo que aprovou):", porPerfil);
    imprimirTabela("Por DIREÇÃO:", porDirecao);
    imprimirTabela("Por FAIXA DE SCORE (a pergunta central: score mais alto = mais acerto?):", porFaixaScore);

    console.log(`\nScore médio dos WIN: ${media(scoresWin)} (n=${scoresWin.length})`);
    console.log(`Score médio dos LOSS: ${media(scoresLoss)} (n=${scoresLoss.length})`);

    console.log("\nPor SEMANA (janela de 7 dias corridos desde epoch, mostra evolução no tempo):");
    const semanasOrdenadas = Object.entries(porSemana).sort((a, b) => a[1].minTs - b[1].minTs);
    for (const [, v] of semanasOrdenadas) {
        const de = new Date(v.minTs).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const ate = new Date(v.maxTs).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        console.log(`  ${de} a ${ate} | ${String(v.wins).padStart(4)}W ${String(v.loss).padStart(4)}L | ${taxa(v.wins, v.total)} (n=${v.total})`);
    }

    process.exit(0);

}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
