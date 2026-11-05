// ===================================================
// FOREX ASSIST - AVISOS NO TELEGRAM (segundo canal, além do push do navegador)
//
// Por quê: o push do Chrome no Android atrasa/não vibra (bateria, canal do site). O Telegram tem entrega própria e deixa configurar
// som e vibração por conversa. TODO aviso que vai por push (novo sinal, encerramento, lucro parcial, alerta do MT5) vai também para cá.
// Segurança: o token do bot só existe como secret (TELEGRAM_BOT_TOKEN) e NUNCA é impresso; o destino (chat_id) fica em
// `config_telegram/destino` no banco oficial (só administrador). Sem token ou sem destino, tudo isto é um no-op silencioso.
// Falha de Telegram NUNCA derruba o scanner nem o push: é capturada e vira uma linha de log.
// ===================================================

const API = "https://api.telegram.org";

const escaparHtml = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Telegram aceita negrito (HTML <b>): o título (com COMPRA/VENDA no começo) sai em negrito
function textoDoAviso(aviso) {
    const titulo = escaparHtml(aviso && aviso.title);
    const corpo = escaparHtml(aviso && aviso.body);
    return titulo && corpo ? `<b>${titulo}</b>\n${corpo}` : titulo ? `<b>${titulo}</b>` : corpo;
}

const sanitizar = (msg, token) => String(msg == null ? "" : msg).split(String(token || "\u0000")).join("***").slice(0, 200);

async function enviarTelegram({ token, chatId, texto, botao = null, fetchImpl = globalThis.fetch, timeoutMs = 8000 }) {
    if (!token || !chatId || !texto) return { ok: false, erro: "token, chat ou texto ausente" };
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        const r = await fetchImpl(`${API}/bot${token}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({
                chat_id: chatId, text: texto, parse_mode: "HTML", disable_web_page_preview: true,
                // botão que abre a página da XM (um toque no aviso de sinal leva à corretora)
                ...(botao && /^https:\/\//.test(String(botao.url || "")) ? { reply_markup: { inline_keyboard: [[{ text: botao.texto || "Abrir na XM", url: botao.url }]] } } : {})
            })
        });
        let j = null; try { j = await r.json(); } catch { j = null; }
        if (r.ok && j && j.ok) return { ok: true };
        return { ok: false, erro: sanitizar(`HTTP ${r.status} ${(j && j.description) || ""}`, token) };
    } catch (e) {
        return { ok: false, erro: sanitizar(e && e.name === "AbortError" ? "tempo esgotado" : e && e.message, token) };
    } finally { clearTimeout(t); }
}

async function lerDestino(db) {
    const snap = await db.collection("config_telegram").doc("destino").get();
    const id = snap.exists ? snap.data().chatId : null;
    return id !== null && id !== undefined && String(id) !== "" ? id : null;
}

/**
 * Envia o aviso ao Telegram, se houver token e destino. Nunca lança erro.
 * @returns {Promise<{ok:boolean, ignorado?:boolean, erro?:string}>}
 */
async function notificarTelegram(db, aviso, opcoes = {}) {
    const token = opcoes.token !== undefined ? opcoes.token : process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, ignorado: true };
    try {
        const chatId = await lerDestino(db);
        if (chatId === null) return { ok: false, ignorado: true };
        const botao = opcoes.url ? { texto: "Abrir na XM", url: opcoes.url } : null;
        const r = await enviarTelegram({ token, chatId, texto: textoDoAviso(aviso), botao, fetchImpl: opcoes.fetchImpl, timeoutMs: opcoes.timeoutMs });
        if (!r.ok) console.log(`Aviso: falha ao enviar Telegram: ${r.erro}`);
        return r;
    } catch (e) {
        const erro = sanitizar(e && e.message, token);
        console.log(`Aviso: falha ao enviar Telegram: ${erro}`);
        return { ok: false, erro };
    }
}

module.exports = { escaparHtml, textoDoAviso, enviarTelegram, lerDestino, notificarTelegram, sanitizar };
