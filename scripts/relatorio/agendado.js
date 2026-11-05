// ===================================================
// FOREX ASSIST - RELATÓRIO NO TELEGRAM - EXECUÇÃO (somente leitura dos dados + envio ao Telegram)
// Chamado por `.github/workflows/relatorio-telegram.yml` (depois de cada ciclo do scanner, só passa dos horários fixos de agenda.js).
// Lê o `historico` oficial por credencial de administrador, o estado do MT5 (LAB) e os desfechos da IA (`ia_agenda`).
// Manual: RELATORIO_TIPO=diario|semanal ; RELATORIO_ENVIAR=0 só imprime o texto no log, =1 envia marcado "TESTE" (não reserva horário).
// Nunca toca em sinal, conta ou configuração do app. Falha aqui não afeta o scanner (workflow separado).
// ===================================================
const { slotDiario, slotSemanal } = require("./agenda");
const { diario, semanal } = require("./montar");

async function carregar(admin, agora, oficial) {
    const snap = await oficial.collection("historico").get();
    const historico = []; snap.forEach(d => historico.push({ id: d.id, ...d.data() }));

    // IA: horários de GERAR dos últimos 8 dias UTC (a semana inteira); o texto filtra pelo que precisa
    const d0 = new Date(agora - 8 * 86400000).toISOString().slice(0, 10), d1 = new Date(agora).toISOString().slice(0, 10);
    const FP = admin.firestore.FieldPath.documentId();
    const iaSnap = await oficial.collection("ia_agenda").where(FP, ">=", "gerar_" + d0).where(FP, "<=", "gerar_" + d1 + "~").get();
    const iaTodos = []; iaSnap.forEach(d => iaTodos.push({ id: d.id, ...d.data() }));
    return { historico, iaTodos };
}

async function lerMt5(admin, agora) {
    try {
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }, "lab").firestore();
        const s = await lab.collection("xm_conta").doc("estado").get();
        if (!s.exists) return null;
        const gmt = Number(JSON.parse(s.data().json).gmt);
        return Number.isFinite(gmt) ? Math.max(0, (agora / 1000 - gmt) / 60) : null;
    } catch (e) { console.log(`Aviso: sem leitura do MT5 (${String(e.message).slice(0, 80)})`); return null; }
}

async function principalRelatorio({ agora = Date.now(), env = process.env, log = console.log } = {}) {
    const manual = env.RELATORIO_TIPO ? String(env.RELATORIO_TIPO) : null;
    const chaves = manual ? [] : [slotDiario(agora), slotSemanal(agora)].filter(Boolean);
    if (!manual && !chaves.length) { log("relatorio: fora dos horários, nada a fazer"); return { acao: "NENHUMA" }; }
    if (manual && !["diario", "semanal"].includes(manual)) throw new Error("RELATORIO_TIPO deve ser diario ou semanal");

    const admin = require("firebase-admin");
    const oficial = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
    const enviar = manual ? env.RELATORIO_ENVIAR === "1" : true;

    // reserva atômica: cada horário sai no máximo uma vez (manual não reserva)
    const aEnviar = [];
    if (manual) aEnviar.push({ tipo: manual, chave: null });
    else for (const chave of chaves) {
        try { await oficial.collection("relatorio_agenda").doc(chave).create({ reservadoEm: new Date(agora).toISOString() }); aEnviar.push({ tipo: chave.split("_")[0], chave }); }
        catch (e) { if (e.code === 6 || /already exists/i.test(String(e.message))) log(`relatorio: ${chave} já enviado: nada a fazer`); else throw e; }
    }
    if (!aEnviar.length) return { acao: "JA_EXECUTADO" };

    const { historico, iaTodos } = await carregar(admin, agora, oficial);
    const mt5IdadeMin = await lerMt5(admin, agora);
    const { notificarTelegram } = require("../telegram");
    const resultados = [];
    for (const { tipo, chave } of aEnviar) {
        // IA do dia (UTC) para o diário; dos últimos 7 dias para o semanal
        const limite = tipo === "diario" ? new Date(agora).toISOString().slice(0, 10) : new Date(agora - 7 * 86400000).toISOString().slice(0, 10);
        const iaDocs = iaTodos.filter(d => d.id.slice(6, 16) >= limite);
        const extras = { mt5IdadeMin, scannerConclusao: env.SCANNER_CONCLUSAO || null, iaDocs };
        const aviso = (tipo === "diario" ? diario : semanal)({ historico, agoraMs: agora, extras, teste: !!manual });
        log(`--- ${tipo}${chave ? " (" + chave + ")" : " (manual)"} ---\n${aviso.title}\n${aviso.body}\n---`);
        if (!enviar) { resultados.push({ tipo, enviado: false }); continue; }
        const r = await notificarTelegram(oficial, aviso);
        log(`relatorio ${tipo}: Telegram ${r.ok ? "enviado" : r.ignorado ? "ignorado (sem token/destino)" : "FALHOU: " + r.erro}`);
        if (chave) await oficial.collection("relatorio_agenda").doc(chave).set({ enviado: !!r.ok, concluidoEm: new Date().toISOString(), erro: r.ok ? null : (r.erro || "ignorado") }, { merge: true });
        resultados.push({ tipo, enviado: !!r.ok });
    }
    return { acao: "EXECUTADO", resultados };
}

module.exports = { principalRelatorio };

if (require.main === module) principalRelatorio().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
