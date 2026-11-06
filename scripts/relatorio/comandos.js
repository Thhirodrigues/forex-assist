// ===================================================
// FOREX ASSIST - COMANDOS NO TELEGRAM (/hoje, /semana, /marco, /ajuda)
//
// O bot não tem servidor: a cada ciclo do scanner (workflow `telegram-comandos.yml`, por workflow_run) ele pergunta ao Telegram se há
// mensagens novas (getUpdates). SEGURANÇA: só atende mensagem PRIVADA vinda do chat gravado em `config_telegram/destino` (o do dono);
// qualquer outra é ignorada (e descartada). Só LÊ dados (historico, estado do MT5, ia_agenda) e responde; não grava nada além do envio.
// Resposta em até ~5 min (cadência do scanner). Não confirma (não descarta) o comando antes de responder, para não perder pedido.
// Fase 1 (`--verificar`, sem dependências): diz se há comando para atender (e já descarta mensagens que não são comandos).
// ===================================================
const fs = require("fs");
const { sanitizar } = require("../telegram");

const API = "https://api.telegram.org";
const COMANDOS = ["hoje", "semana", "marco", "ajuda"];

// "/hoje", "/Hoje@MeuBot", "/hoje agora" -> "hoje"; qualquer outra coisa -> null
function normalizarComando(texto) {
    const m = /^\/([a-zA-Z_]+)(?:@\w+)?(?:\s|$)/.exec(String(texto || "").trim());
    return m ? m[1].toLowerCase() : null;
}

// updates = resultado do getUpdates. Devolve os comandos do DONO (mensagem privada do chat autorizado), sem repetir o mesmo comando,
// e o maior update_id visto (para descartar tudo, inclusive o que foi ignorado).
function extrairComandos(updates, chatAutorizado) {
    let maxId = null;
    const vistos = new Set(), comandos = [];
    for (const u of updates || []) {
        if (u && Number.isFinite(u.update_id)) maxId = maxId === null ? u.update_id : Math.max(maxId, u.update_id);
        const m = u && u.message;
        if (!m || !m.chat || m.chat.type !== "private" || typeof m.text !== "string") continue;
        if (chatAutorizado === null || chatAutorizado === undefined || String(m.chat.id) !== String(chatAutorizado)) continue;
        const cmd = normalizarComando(m.text);
        if (!cmd || vistos.has(cmd)) continue;
        vistos.add(cmd);
        comandos.push(COMANDOS.includes(cmd) ? cmd : "ajuda");
    }
    return { comandos: [...new Set(comandos)].slice(0, 3), maxId };
}

const AJUDA = {
    title: "🤖 Comandos",
    body: "/hoje: resumo do dia (Brasília) e acumulado\n/semana: semana até agora, com o corte por par\n/marco: onde estamos nas 400 fechadas e 30 dias\n\nA resposta leva até uns 5 minutos (segue o ciclo do scanner)."
};

async function getUpdates(token, { offset, fetchImpl = globalThis.fetch } = {}) {
    try {
        const q = new URLSearchParams({ timeout: "0", allowed_updates: JSON.stringify(["message"]) });
        if (offset !== undefined && offset !== null) q.set("offset", String(offset));
        const r = await fetchImpl(`${API}/bot${token}/getUpdates?${q}`);
        const j = await r.json();
        if (!j || !j.ok) return { ok: false, erro: sanitizar(`Telegram recusou: ${j && j.description}`, token) };
        return { ok: true, result: j.result || [] };
    } catch (e) { return { ok: false, erro: sanitizar(e && e.message, token) }; }
}

// descarta no Telegram tudo até `maxId` (o próximo getUpdates com offset maxId+1 confirma os anteriores)
const confirmar = (token, maxId, fetchImpl) => maxId === null ? Promise.resolve({ ok: true, result: [] }) : getUpdates(token, { offset: maxId + 1, fetchImpl });

async function fase1(token, fetchImpl) {
    const g = await getUpdates(token, { fetchImpl });
    if (!g.ok) { console.log(`Aviso: ${g.erro}`); return "nao"; }
    const temComando = g.result.some(u => u.message && u.message.chat && u.message.chat.type === "private" && normalizarComando(u.message.text));
    if (!temComando) {
        const maxId = g.result.reduce((a, u) => Math.max(a, u.update_id), -1);
        if (g.result.length) await confirmar(token, maxId, fetchImpl);      // mensagens que não são comandos: descarta
        console.log(`comandos: ${g.result.length ? g.result.length + " mensagem(ns) sem comando descartada(s)" : "nenhuma mensagem nova"}`);
        return "nao";
    }
    console.log("comandos: há comando(s) para atender");
    return "sim";
}

async function fase2(token, agora = Date.now()) {
    const admin = require("firebase-admin");
    const oficial = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
    const { lerDestino, enviarTelegram } = require("../telegram");
    const { textoDoAviso } = require("../telegram");
    const { diario, semanal, marco } = require("./montar");
    const { carregar, lerMt5 } = require("./agendado");

    const chatId = await lerDestino(oficial);
    const g = await getUpdates(token);
    if (!g.ok) throw new Error(g.erro);
    const { comandos, maxId } = extrairComandos(g.result, chatId);
    console.log(`comandos: ${g.result.length} mensagem(ns); do dono: [${comandos.join(", ")}]; ignoradas: ${g.result.length - comandos.length}`);

    if (comandos.length) {
        let dados = null;
        const obter = async () => {
            if (dados) return dados;
            const { historico, iaTodos } = await carregar(admin, agora, oficial);
            dados = { historico, iaTodos, mt5IdadeMin: await lerMt5(admin, agora) };
            return dados;
        };
        for (const cmd of comandos) {
            let aviso;
            if (cmd === "ajuda") aviso = AJUDA;
            else {
                const { historico, iaTodos, mt5IdadeMin } = await obter();
                const dia = new Date(agora).toISOString().slice(0, 10), sete = new Date(agora - 7 * 86400000).toISOString().slice(0, 10);
                const iaDocs = iaTodos.filter(d => d.id.slice(6, 16) >= (cmd === "hoje" ? dia : sete));
                const extras = { mt5IdadeMin, iaDocs };
                aviso = cmd === "hoje" ? diario({ historico, agoraMs: agora, extras }) : cmd === "semana" ? semanal({ historico, agoraMs: agora, extras }) : marco({ historico, agoraMs: agora });
            }
            const r = await enviarTelegram({ token, chatId, texto: textoDoAviso(aviso) });
            console.log(`comando /${cmd}: ${r.ok ? "respondido" : "FALHOU: " + r.erro}`);
            if (!r.ok) throw new Error("falha ao responder; o comando continua pendente para a próxima tentativa");
        }
    }
    const c = await confirmar(token, maxId, undefined);          // só descarta depois de responder
    if (!c.ok) console.log(`Aviso: não consegui confirmar as mensagens (${c.erro})`);
}

module.exports = { normalizarComando, extrairComandos, AJUDA, COMANDOS };

if (require.main === module) {
    (async () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) { console.log("comandos: sem TELEGRAM_BOT_TOKEN, nada a fazer"); if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "quando=nao\n"); return; }
        if (process.argv.includes("--verificar")) {
            const q = await fase1(token);
            if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `quando=${q}\n`);
            return;
        }
        await fase2(token);
    })().catch(e => { console.error("ERRO:", sanitizar(e.message, process.env.TELEGRAM_BOT_TOKEN)); process.exit(1); });
}
