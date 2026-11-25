// ===================================================
// FOREX ASSIST - MATÉRIAS-PRIMAS: DIAGNÓSTICO DAS VELAS NO BANCO (SOMENTE LEITURA)
// Para cada símbolo de `xm_barras` (LAB): existe? quando foi gravado? cabeçalho técnico (dígitos, lote mínimo, passo, contrato, fuso, swaps),
// quantas velas vieram, quantas sobrevivem à leitura, e a idade da última. Não imprime preços nem segredos.
// ===================================================
const { parseBarras } = require("./barras");

function resumir(simbolo, dado, agoraMs = Date.now()) {
    if (!dado) return { simbolo, existe: false };
    const txt = String(dado.json || ""), corte = txt.indexOf("|");
    const cab = corte >= 0 ? txt.slice(0, corte) : null;
    const brutas = corte >= 0 ? txt.slice(corte + 1).split(";").filter(Boolean).length : 0;
    const p = parseBarras(txt, { agoraMs });
    const b = p ? p.barras : [];
    return { simbolo, existe: true, gravadoEm: dado.em || null, tamanhoTexto: txt.length, cabecalho: cab, velasNoTexto: brutas, velasLidas: b.length,
        primeiraUtc: b.length ? new Date(b[0].ms).toISOString() : null, ultimaUtc: b.length ? new Date(b[b.length - 1].ms).toISOString() : null,
        idadeUltimaMin: b.length ? Math.round((agoraMs - b[b.length - 1].ms) / 60000) : null, leituraOk: !!p };
}

module.exports = { resumir };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }).firestore();
        const sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        for (const s of ["GOLD", "OILCash", "US100Cash"]) {
            const d = await lab.collection("xm_barras").doc(s).get();
            console.log(`BARRAS ${s} = ${sc(resumir(s, d.exists ? d.data() : null))}`);
        }
        const todos = await lab.collection("xm_barras").get();
        console.log(`DOCUMENTOS em xm_barras: ${todos.docs.map(x => x.id).join(", ") || "(nenhum)"}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
