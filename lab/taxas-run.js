// Baixa as taxas de política do BIS (sem chave) e guarda os degraus em `diario/_taxas` no projeto LAB. Imprime só COBERTURA (datas, nº de degraus, última taxa).
const { URL_BIS, parsearBIS } = require("./taxas");

(async () => {
    const admin = require("firebase-admin");
    const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
    const url = URL_BIS();
    const r = await fetch(url, { headers: { Accept: "text/csv" } });
    if (!r.ok) throw new Error(`BIS HTTP ${r.status}`);
    const series = parsearBIS(await r.text());
    for (const [m, s] of Object.entries(series)) {
        if (!s.ts.length) { console.log(`${m}: SEM DADOS`); continue; }
        console.log(`${m}: ${new Date(s.ts[0]).toISOString().slice(0, 10)} -> último degrau ${new Date(s.ts[s.ts.length - 1]).toISOString().slice(0, 10)}, ${s.ts.length} degraus, taxa atual ${s.v[s.v.length - 1]}%`);
    }
    if (Object.values(series).some(s => !s.ts.length)) throw new Error("moeda sem dados: não gravo taxas incompletas");
    await lab.collection("diario").doc("_taxas").set({ fonte: url, baixadoEm: Date.now(), series });
    console.log("Taxas gravadas em diario/_taxas.");
})().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
