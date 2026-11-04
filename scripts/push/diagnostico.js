// ===================================================
// FOREX ASSIST - DIAGNÓSTICO DE NOTIFICAÇÕES (push). Só leitura por padrão.
// Mostra quantos dispositivos estão registrados e ativos, há quanto tempo cada um se registrou, o navegador de cada um e o que o app
// guardou em `scanner/status` (permissão, service worker, erro). Nunca imprime o token inteiro (só um hash curto).
// PUSH_TESTE=1 envia UM aviso de teste (tipo "abertura", para testar entrega e vibração) para os dispositivos ativos.
// ===================================================
const crypto = require("crypto");

const curto = (t) => crypto.createHash("sha256").update(String(t)).digest("hex").slice(0, 8);
const idadeMin = (ts, agoraMs) => (ts && typeof ts.toMillis === "function" ? Math.round((agoraMs - ts.toMillis()) / 60000) : null);
const navegador = (ua) => {
    const s = String(ua || "");
    const so = /Android/i.test(s) ? "Android" : /iPhone|iPad/i.test(s) ? "iOS" : /Windows/i.test(s) ? "Windows" : /Mac/i.test(s) ? "Mac" : "?";
    const nav = /EdgA?\//.test(s) ? "Edge" : /SamsungBrowser/.test(s) ? "Samsung" : /Chrome\//.test(s) ? "Chrome" : /Firefox\//.test(s) ? "Firefox" : /Safari\//.test(s) ? "Safari" : "?";
    const xiaomi = /Mi |MIUI|Xiaomi|Redmi|POCO|HyperOS/i.test(s);
    return `${so}/${nav}${xiaomi ? "/Xiaomi" : ""}`;
};

function resumirTokens(docs, agoraMs) {
    const lista = docs.map(d => ({ id: curto(d.id), ativo: d.ativo === true, registradoHaMin: idadeMin(d.criadoEm, agoraMs), dispositivo: navegador(d.dispositivo) }));
    return { total: lista.length, ativos: lista.filter(x => x.ativo).length, dispositivos: lista.sort((a, b) => (a.registradoHaMin ?? 1e9) - (b.registradoHaMin ?? 1e9)) };
}

module.exports = { resumirTokens, navegador, curto };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const { enviarParaTokens, obterTokensAtivos, horaBrasilia } = require("../pushNotifier");
        admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) });
        const db = admin.firestore();
        const agora = Date.now();
        const snap = await db.collection("tokens").get();
        const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        console.log("tokens:", JSON.stringify(resumirTokens(docs, agora), null, 2));
        const st = (await db.collection("scanner").doc("status").get()).data() || {};
        const pd = st.pushDebug || {};
        console.log("scanner/status (push):", JSON.stringify({ permissaoPush: st.permissaoPush, serviceWorkerRegistrado: st.serviceWorkerRegistrado, pushAtivo: st.pushAtivo, tokenRegistrado: st.tokenRegistrado, erroPush: st.erroPush || null, notificationPermission: pd.notificationPermission, dispositivo: navegador(pd.userAgent) }));
        if (process.env.PUSH_TESTE === "1") {
            const tokens = await obterTokensAtivos(db);
            const hora = horaBrasilia(agora);
            await enviarParaTokens(admin, db, tokens, {
                notification: { title: "🟢 COMPRA TESTE EUR/USD", body: `Teste de entrega e vibração (${hora}). Pode ignorar, não é sinal.` },
                data: { tipo: "abertura", emitidoEm: String(agora), par: "EUR/USD", direcao: "BUY", url: "https://my.xm.com/pt/member" },
                webpush: { headers: { Urgency: "high" } }
            });
            console.log(`aviso de TESTE enviado às ${hora} (Brasília) para ${tokens.length} dispositivo(s) ativo(s)`);
        }
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
