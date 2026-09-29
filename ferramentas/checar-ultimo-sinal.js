// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-039 (28/09/2026): confere o documento REALMENTE salvo das
// operações mais recentes (não o que o scanner imprime no log) - o log
// não mostra regimeTPSL, perfilConfigurado, avisos nem o financeiro
// completo. CLAUDE.md: mudança no pipeline só vale depois de confirmar
// que a operação salva atende todos os critérios pretendidos.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const QTD = 12;

function iso(ms) { const n = Number(ms); return Number.isFinite(n) ? new Date(n).toISOString() : String(ms); }

async function main() {

    // orderBy no MESMO campo, sem where - não exige índice composto.
    const snap = await db.collection("historico").orderBy("timestamp", "desc").limit(QTD).get();

    console.log(`CHECAGEM DOS ${QTD} DOCUMENTOS MAIS RECENTES DE historico (só leitura)\n`);

    snap.forEach(doc => {
        const d = doc.data();
        const f = d.financeiro || {};
        console.log("=".repeat(60));
        console.log(`id=${doc.id}`);
        console.log(`par=${d.par} direcao=${d.direcao} status=${d.status} resultado=${d.resultado ?? "(aberta)"}`);
        console.log(`criado=${iso(d.timestamp)} inicioOperacao=${iso(d.inicioOperacao)} janelaOrigem=${d.janelaOrigem}`);
        console.log(`perfil=${d.perfil} perfilConfigurado=${d.perfilConfigurado} rebaixadoDaCascata=${d.rebaixadoDaCascata}`);
        console.log(`score=${d.score} qualidade=${d.qualidade} scoreTecnico=${d.scoreTecnico} emaScore=${d.emaScore} rsiScore=${d.rsiScore} adxScore=${d.adxScore} tendenciaScore=${d.tendenciaScore}`);
        console.log(`historico=${d.historico} pesoHistorico=${d.pesoHistorico} confidenceMultiplier=${d.confidenceMultiplier} multi=${d.multi}`);
        console.log(`smcDetectado=${JSON.stringify(d.smcDetectado)} smcScore=${d.smcScore} candlestick=${JSON.stringify(d.candlestickDetectado)} candlestickScore=${d.candlestickScore}`);
        console.log(`indicadores=${JSON.stringify(d.indicadores)}`);
        console.log(`financeiro: regimeTPSL=${f.regimeTPSL} lote=${f.lote} tpUSD=${f.tpUSD} slUSD=${f.slUSD} tpPips=${f.tpPips} slPips=${f.slPips} valorPip=${f.valorPip} rewardRisk=${f.rewardRisk} riscoPercentual=${f.riscoPercentual} expectativa=${f.expectativa} banca=${f.banca}`);
        console.log(`decisaoMercado=${JSON.stringify(f.decisaoMercado)}`);
        console.log(`avisoRisco=${JSON.stringify(d.avisoRisco)}`);
        console.log(`avisoExpectativa=${JSON.stringify(d.avisoExpectativa)}`);
        console.log(`avisoHistorico=${JSON.stringify(d.avisoHistorico)}`);
        console.log(`precoEntrada=${d.precoEntrada}`);
        // Campos de FECHAMENTO (só existem em operação encerrada) - pra
        // conferir como o resultado em dólar foi calculado.
        console.log(`fechamento: motivo=${d.motivoEncerramento} precoFechamento=${d.precoFechamento} resultadoFinanceiro=${d.resultadoFinanceiro} lucroAtual=${d.lucroAtual} saldoAntes=${d.saldoAntes} saldoDepois=${d.saldoDepois} fim=${iso(d.fimOperacao)} tempoOperacao(min)=${Number.isFinite(Number(d.tempoOperacao)) ? (Number(d.tempoOperacao) / 60000).toFixed(1) : d.tempoOperacao}`);
        console.log(`extremos: maxPipsFavor=${d.maxPipsFavor} maxPipsContra=${d.maxPipsContra} precoMaximo=${d.precoMaximo} precoMinimo=${d.precoMinimo}`);
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
