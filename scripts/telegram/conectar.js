// ===================================================
// FOREX ASSIST - CONECTAR O TELEGRAM (uma vez): descobre o chat do usuário e grava em `config_telegram/destino` (banco oficial).
// O usuário manda ao bot uma PALAVRA-CÓDIGO que ele escolheu; só uma mensagem PRIVADA com exatamente essa palavra vale
// (um estranho que ache o bot não consegue ser escolhido sem saber a palavra). Não imprime token, nem chat_id, nem nome.
// Recusa trocar um destino já gravado, a menos que TROCAR=1.
// ===================================================
const { enviarTelegram, sanitizar } = require("../telegram");

// updates = resposta de getUpdates (array). Devolve o chat da mensagem privada MAIS RECENTE cujo texto é o código.
function escolherChat(updates, codigo) {
    const alvo = String(codigo || "").trim().toLowerCase();
    if (!alvo) return null;
    let achado = null;
    for (const u of updates || []) {
        const m = u && (u.message || u.edited_message);
        if (!m || !m.chat || m.chat.type !== "private" || typeof m.text !== "string") continue;
        if (m.text.trim().toLowerCase() !== alvo) continue;
        if (!achado || m.date >= achado.date) achado = { chatId: m.chat.id, date: m.date };
    }
    return achado;
}

module.exports = { escolherChat };

if (require.main === module) {
    (async () => {
        const token = process.env.TELEGRAM_BOT_TOKEN, codigo = process.env.CODIGO;
        if (!token) throw new Error("secret TELEGRAM_BOT_TOKEN ausente");
        if (!codigo || codigo.trim().length < 4) throw new Error("informe a palavra-código (mínimo 4 caracteres)");
        const admin = require("firebase-admin");
        admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) });
        const db = admin.firestore();
        const ref = db.collection("config_telegram").doc("destino");
        if ((await ref.get()).exists && process.env.TROCAR !== "1") throw new Error("já existe um destino gravado; rode de novo com trocar=1 se for isso mesmo");
        let j;
        try {
            const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
            j = await r.json();
        } catch (e) { throw new Error(sanitizar(e.message, token)); }
        if (!j || !j.ok) throw new Error(sanitizar(`Telegram recusou: ${j && j.description}`, token));
        const achado = escolherChat(j.result, codigo);
        if (!achado) throw new Error("nenhuma mensagem privada com a palavra-código. No Telegram: abra o bot, toque em Iniciar e envie exatamente a palavra-código; depois rode de novo.");
        await ref.set({ chatId: achado.chatId, conectadoEm: new Date().toISOString() });
        const env = await enviarTelegram({ token, chatId: achado.chatId, texto: "<b>✅ Forex Assist conectado</b>\nA partir de agora os avisos de sinal, encerramento e alertas do MT5 também chegam aqui." });
        console.log(env.ok ? "Telegram conectado e mensagem de confirmação enviada." : `Telegram conectado, mas a confirmação falhou: ${env.erro}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
