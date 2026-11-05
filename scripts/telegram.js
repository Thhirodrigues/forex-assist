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
// Separador no FIM de cada aviso (pedido do usuário: os avisos ficavam colados uns nos outros; a linha em branco sozinha não bastou).
// Fica no FIM e não no começo de propósito: a notificação do Android mostra as primeiras linhas, e o começo precisa ser COMPRA/VENDA.
// O Telegram APAGA espaços e quebras de linha finais, então a linha em branco usa U+2800 (Braille em branco) e a linha de baixo é um traço visível.
const SEPARADOR = "\n\u2800\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
const LINHA_EM_BRANCO = SEPARADOR;   // nome antigo, mantido para quem importava

// Link da XM DENTRO da mensagem (pedido do usuário: o espaço entre avisos tem que vir DEPOIS do link; um botão fica fora do balão,
// onde o texto não alcança). Só https; o endereço é escapado para o atributo HTML.
const linkXm = (url) => (/^https:\/\//.test(String(url || "")) && String(url).length <= 400
    ? `\n<a href="${escaparHtml(url).replace(/"/g, "&quot;")}">🔗 Abrir na XM</a>` : "");

function textoDoAviso(aviso, { url } = {}) {
    const titulo = escaparHtml(aviso && aviso.title);
    const corpo = escaparHtml(aviso && aviso.body);
    const texto = titulo && corpo ? `<b>${titulo}</b>\n${corpo}` : titulo ? `<b>${titulo}</b>` : corpo;
    return texto ? texto + linkXm(url) + SEPARADOR : texto;
}

const sanitizar = (msg, token) => String(msg == null ? "" : msg).split(String(token || "\u0000")).join("***").slice(0, 200);

async function enviarTelegram({ token, chatId, texto, fetchImpl = globalThis.fetch, timeoutMs = 8000 }) {
    if (!token || !chatId || !texto) return { ok: false, erro: "token, chat ou texto ausente" };
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        const r = await fetchImpl(`${API}/bot${token}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "HTML", disable_web_page_preview: true })
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
        const r = await enviarTelegram({ token, chatId, texto: textoDoAviso(aviso, { url: opcoes.url }), fetchImpl: opcoes.fetchImpl, timeoutMs: opcoes.timeoutMs });
        if (!r.ok) console.log(`Aviso: falha ao enviar Telegram: ${r.erro}`);
        return r;
    } catch (e) {
        const erro = sanitizar(e && e.message, token);
        console.log(`Aviso: falha ao enviar Telegram: ${erro}`);
        return { ok: false, erro };
    }
}

module.exports = { SEPARADOR, LINHA_EM_BRANCO, escaparHtml, textoDoAviso, enviarTelegram, lerDestino, notificarTelegram, sanitizar };
