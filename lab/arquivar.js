// ===================================================
// FOREX ASSIST - LABORATÓRIO - ARQUIVO (somente leitura)
//
// Exporta para arquivos JSON as coleções NÃO públicas do projeto LAB (`entradas`, `resumo`, `controle`, `diario`) para
// análise futura, depois que o rotulador ao vivo foi desligado (31/10/2026). NÃO apaga nada, NÃO escreve em nenhum banco.
// `candles` (binário, custou créditos da TwelveData) NÃO é exportado: continua no Firestore do LAB.
// Uso: node lab/arquivar.js <pasta-de-saída>
// ===================================================

const fs = require("fs");
const path = require("path");

const COLECOES = ["entradas", "resumo", "controle", "diario"];

// Firestore -> JSON: Timestamp vira ISO, Buffer vira base64, resto passa
function plano(v) {
    if (v === null || v === undefined) return v ?? null;
    if (Buffer.isBuffer(v)) return { _bytes: v.toString("base64") };
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (Array.isArray(v)) return v.map(plano);
    if (typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plano(x)]));
    return v;
}

async function exportar({ lab, pasta, colecoes = COLECOES, log = console.log }) {
    fs.mkdirSync(pasta, { recursive: true });
    const resumo = {};
    for (const nome of colecoes) {
        const snap = await lab.collection(nome).get();
        const docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...plano(d.data()) }));
        fs.writeFileSync(path.join(pasta, `${nome}.json`), JSON.stringify(docs));
        resumo[nome] = docs.length;
        log(`${nome}: ${docs.length} documentos`);
    }
    fs.writeFileSync(path.join(pasta, "_resumo.json"), JSON.stringify({ exportadoEm: new Date().toISOString(), colecoes: resumo }));
    return resumo;
}

module.exports = { exportar, plano, COLECOES };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        const pasta = process.argv[2] || "arquivo-lab-export";
        await exportar({ lab, pasta });
        console.log("Exportação concluída em", pasta);
    })().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
}
