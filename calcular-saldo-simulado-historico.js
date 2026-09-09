// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// CÁLCULO DO SALDO SIMULADO RETROATIVO
//
// Responsabilidade:
// Somar o resultadoFinanceiro de TODOS os sinais já
// fechados no histórico, pra saber quanto a Conta
// Simulada valeria se recalculada agora.
//
// Por padrão é SOMENTE LEITURA (não grava nada) - só
// com a flag --aplicar (depois de já ter visto o
// número e decidido) é que grava o total em
// configuracoes/geral.saldoSimulado, com confirmação
// explícita antes de escrever.
//
// Precisa ser rodado localmente, com a Service Account
// de produção (mesmo padrão de corrigir-bug007.js e
// audit-historico.js, rodados pelo usuário fora do
// sandbox do Claude Code, que não tem essas
// credenciais).
//
// Uso:
//   node calcular-saldo-simulado-historico.js            (só calcula e mostra)
//   node calcular-saldo-simulado-historico.js --aplicar   (calcula, pede confirmação, grava)
// ===================================================

const admin = require("firebase-admin");
const readline = require("readline");
const serviceAccount = require("./serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const aplicar = process.argv.includes("--aplicar");

function perguntar(pergunta) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(pergunta, (resposta) => {
            rl.close();
            resolve(resposta);
        });
    });
}

async function calcular() {

    console.log("====================================");
    console.log("Cálculo retroativo - Conta Simulada");
    console.log("====================================\n");

    const snapshot = await db
        .collection("historico")
        .where("status", "==", "ENCERRADA")
        .get();

    let wins = 0;
    let losses = 0;
    let comResultadoFinanceiro = 0;
    let semResultadoFinanceiro = 0;
    let somaTotal = 0;

    const porMes = {};
    const porPar = {};

    snapshot.forEach((doc) => {

        const dados = doc.data();

        if (dados.resultado !== "WIN" && dados.resultado !== "LOSS") {
            return;
        }

        if (dados.resultado === "WIN") wins++;
        else losses++;

        // Sinais de antes de 28/07/2026 (schema anterior, campo
        // lucroAtual em vez de resultadoFinanceiro - ver BUG-007 em
        // DOCUMENTACAO/ENGINEERING.md) não entram na soma: não tem
        // como saber, com o mesmo padrão de análise de hoje, quanto
        // esses sinais teriam realmente valido.
        if (typeof dados.resultadoFinanceiro !== "number") {
            semResultadoFinanceiro++;
            return;
        }

        comResultadoFinanceiro++;
        somaTotal += dados.resultadoFinanceiro;

        const dataObj = new Date(Number(dados.timestamp) || 0);
        const chaveMes = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, "0")}`;
        porMes[chaveMes] = (porMes[chaveMes] || 0) + dados.resultadoFinanceiro;

        const par = dados.par || "desconhecido";
        porPar[par] = (porPar[par] || 0) + dados.resultadoFinanceiro;

    });

    console.log(`Sinais ENCERRADA com WIN/LOSS: ${wins + losses} (${wins} WIN / ${losses} LOSS)`);
    console.log(`  - com resultadoFinanceiro numérico (entraram na soma): ${comResultadoFinanceiro}`);
    console.log(`  - SEM resultadoFinanceiro (schema anterior a 28/07/2026, NÃO entraram): ${semResultadoFinanceiro}`);

    console.log(`\nSoma total (o que a Conta Simulada mostraria se recalculada agora): $${somaTotal.toFixed(2)}`);

    console.log("\nPor mês:");
    Object.keys(porMes).sort().forEach((chave) => {
        console.log(`  ${chave}: $${porMes[chave].toFixed(2)}`);
    });

    console.log("\nPor par:");
    Object.keys(porPar).sort((a, b) => porPar[b] - porPar[a]).forEach((par) => {
        console.log(`  ${par}: $${porPar[par].toFixed(2)}`);
    });

    if (!aplicar) {

        console.log("\n====================================");
        console.log("Nada foi gravado no Firestore (modo somente leitura).");
        console.log("Pra gravar esse total como saldoSimulado, rode de novo com --aplicar");
        console.log("====================================");

        return;

    }

    console.log("\n====================================");
    console.log(`Você pediu pra APLICAR: configuracoes/geral.saldoSimulado vai virar $${somaTotal.toFixed(2)}`);
    console.log("Isso SUBSTITUI o valor atual (não soma) - qualquer coisa que já estivesse ali se perde.");
    console.log("====================================");

    const resposta = await perguntar('Digite "sim" pra confirmar: ');

    if (resposta.trim().toLowerCase() !== "sim") {
        console.log("Cancelado - nada foi gravado.");
        return;
    }

    await db.collection("configuracoes").doc("geral").set({
        saldoSimulado: Number(somaTotal.toFixed(2))
    }, { merge: true });

    console.log(`\nGravado: configuracoes/geral.saldoSimulado = $${somaTotal.toFixed(2)}`);

}

calcular()
    .then(() => process.exit(0))
    .catch((erro) => {
        console.error("Erro:", erro.message);
        process.exit(1);
    });
