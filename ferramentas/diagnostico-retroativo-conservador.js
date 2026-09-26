// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-029 (26/09/2026): diagnóstico pro "ovo e galinha" do perfil
// CONSERVADOR (PENDENCIAS-ESTRATEGICAS-RMI.md, seção 6). Descoberta ao
// investigar: existem DOIS mecanismos de cold-start diferentes, não um
// só.
//
// Mecanismo A (ainda travado de verdade): statisticsEngine.js's
// operacaoAtendeRigorDoPerfil() só conta, pra taxa de acerto/bônus-
// penalidade histórico do CONSERVADOR, operação ROTULADA "CONSERVADOR"
// - circular (precisa de operação Conservador pra existir taxa de
// acerto Conservador).
//
// Mecanismo B (já corrigido sem querer, MUD-02, 17/09/2026): o gate
// operacoesMinimas:30 usa `operacoesElegiveis`, que conta QUALQUER
// operação histórica (não importa o rótulo) com score >= scoreMinimo
// do perfil - não é mais circular, só lento.
//
// Ideia (aprovada pelo usuário, 26/09/2026): completar no Mecanismo A a
// mesma lógica que o MUD-02 já aplicou no Mecanismo B - em vez de
// contar evidência pelo RÓTULO que aprovou a operação, contar pelo que
// ela REALMENTE atingiu (score, multi-timeframe, expectativa - os três
// critérios que decisionEngine.js realmente verifica pro CONSERVADOR,
// exceto operacoesMinimas, que não faz sentido reavaliar
// retroativamente sobre si mesmo). Esses três campos já são
// persistidos em TODA operação salva, independente do perfil
// configurado no momento (confirmado lendo o código: nenhum dos três
// depende de qual perfil estava ativo quando a operação foi salva - só
// o LIMIAR de aprovação depende do perfil, não o valor calculado).
//
// Este script SÓ CONTA quantas operações do histórico real já
// bateriam os três critérios completos do CONSERVADOR, mesmo tendo
// sido aprovadas sob outro perfil - sem mudar nada no Firestore, sem
// mudar nenhum código de produção. O número aqui decide se vale a pena
// implementar a reclassificação de verdade (ENGINEERING.md, AJUSTE-029)
// ou se o histórico real ainda não tem massa suficiente pra isso valer
// a pena agora.

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const SCORE_MINIMO_CONSERVADOR = 55;

async function main() {

    // Único filtro de campo único (resultado in [...]) - sem
    // composite index, mesma disciplina de sempre neste projeto.
    const snap = await db.collection("historico")
        .where("resultado", "in", ["WIN", "LOSS"])
        .get();

    let total = 0;
    let semScore = 0;
    let bateScore = 0;
    let bateScoreMulti = 0;
    let bateTudo = 0;

    const porPerfilOriginal = {};
    const porPar = {};

    snap.forEach(doc => {

        const d = doc.data();
        total++;

        const score = Number(d.score);

        if (!Number.isFinite(score)) {
            semScore++;
            return;
        }

        const multi = d.multi;
        const expectativa = Number(d?.financeiro?.expectativa);

        const passaScore = score >= SCORE_MINIMO_CONSERVADOR;
        const passaMulti = multi === "CONFIRMADO";
        const passaExpectativa = Number.isFinite(expectativa) ? expectativa >= 0 : false;

        if (passaScore) bateScore++;
        if (passaScore && passaMulti) bateScoreMulti++;

        if (passaScore && passaMulti && passaExpectativa) {

            bateTudo++;

            const perfilOriginal = d.perfil || "(sem campo perfil)";
            porPerfilOriginal[perfilOriginal] = (porPerfilOriginal[perfilOriginal] || 0) + 1;

            const par = d.par || "(sem campo par)";
            porPar[par] = (porPar[par] || 0) + 1;

        }

    });

    console.log("========================================");
    console.log("DIAGNÓSTICO RETROATIVO - PERFIL CONSERVADOR");
    console.log("(só leitura - nada foi escrito no Firestore)");
    console.log("========================================");
    console.log(`Total de operações WIN/LOSS no histórico: ${total}`);
    console.log(`Sem campo "score" gravado (docs muito antigos, ignorados): ${semScore}`);
    console.log(`Bate score >= ${SCORE_MINIMO_CONSERVADOR}: ${bateScore}`);
    console.log(`Bate score >= ${SCORE_MINIMO_CONSERVADOR} + multi-timeframe confirmado: ${bateScoreMulti}`);
    console.log(`Bate os 3 critérios completos do CONSERVADOR (score + multi + expectativa >= 0): ${bateTudo}`);
    console.log("");
    console.log("As que batem os 3 critérios, por PERFIL ORIGINAL que realmente aprovou:");
    for (const [perfil, n] of Object.entries(porPerfilOriginal)) {
        console.log(`  ${perfil}: ${n}`);
    }
    console.log("");
    console.log("As que batem os 3 critérios, por PAR (o gate operacoesMinimas é POR PAR, precisa de 30 no MESMO par):");
    for (const [par, n] of Object.entries(porPar).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${par}: ${n}`);
    }

    process.exit(0);

}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
