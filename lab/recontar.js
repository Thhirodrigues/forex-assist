// ===================================================
// FOREX ASSIST - LABORATÓRIO - RECONTAGEM (apaga e refaz `resumo` a partir de `entradas`)
//
// Só mexe no projeto LAB. Usar quando uma definição de grupo mudar (lab/nucleo.js) ou se os
// contadores incrementais ficarem suspeitos. Roda no mesmo grupo de concorrência do rotulador
// (nunca ao mesmo tempo). Não consulta TwelveData nem o projeto oficial.
// ===================================================

const { contarEntradas } = require("./nucleo");

async function recontar({ lab, log = console.log }) {
    const snap = await lab.collection("entradas").get();
    const entradas = [];
    snap.forEach(d => entradas.push(d.data()));
    const deltas = contarEntradas(entradas);

    const antigos = await lab.collection("resumo").get();
    const ids = [];
    antigos.forEach(d => ids.push(d.id));
    for (let i = 0; i < ids.length; i += 400) {
        const b = lab.batch();
        ids.slice(i, i + 400).forEach(id => b.delete(lab.collection("resumo").doc(id)));
        await b.commit();
    }
    const novos = Object.entries(deltas);
    for (let i = 0; i < novos.length; i += 400) {
        const b = lab.batch();
        novos.slice(i, i + 400).forEach(([chave, d]) => b.set(lab.collection("resumo").doc(chave), d));
        await b.commit();
    }
    log(`Recontagem: ${entradas.length} entradas -> ${novos.length} contadores (apagados ${ids.length} antigos).`);
    return { entradas: entradas.length, contadores: novos.length };
}

module.exports = { recontar };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        lab.settings({ ignoreUndefinedProperties: true });
        await recontar({ lab });
        const { imprimirResumo, publicarPlacar } = require("./rotulador");
        const linhas = await imprimirResumo(lab);
        await publicarPlacar(lab, linhas);
    })().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
}
