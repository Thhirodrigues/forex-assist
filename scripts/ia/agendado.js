// ===================================================
// FOREX ASSIST - SINAL POR IA - EXECUÇÃO AGENDADA (roda como passo extra do ciclo do scanner e no `ia-programado.yml`)
// Só age dentro dos horários fixos de agenda.js e UMA vez por horário (reserva atômica em `ia_agenda/<chave>`). Fora deles, sai em
// milissegundos SEM carregar Firebase nem SDK. Origem PROGRAMADO só é possível por aqui (cli.js recusa PROGRAMADO sem IA_SLOT_OK).
// Nunca derruba o scanner: o passo é `continue-on-error`. Sem ANTHROPIC_API_KEY ou modelo, só avisa e sai.
// ===================================================
const { slotGerar, slotFechar } = require("./agenda");

async function principalAgendado({ agora = Date.now(), log = console.log } = {}) {
    const g = slotGerar(agora), f = slotFechar(agora);
    if (!g && !f) { log("agenda: fora dos horários fixos, nada a fazer"); return { acao: "NENHUMA" }; }

    const admin = require("firebase-admin");
    const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }, "agenda").firestore();
    const reservar = async (chave) => {
        try { await db.collection("ia_agenda").doc(chave).create({ reservadoEm: new Date(agora).toISOString() }); return true; }
        catch (e) { if (e.code === 6 || /already exists/i.test(String(e.message))) return false; throw e; }
    };
    const querG = g ? await reservar(g) : false;
    const querF = f ? await reservar(f) : false;
    if (!querG && !querF) { log(`agenda: ${[g, f].filter(Boolean).join(" e ")} já executado(s): nada a fazer`); return { acao: "JA_EXECUTADO" }; }

    process.env.IA_MODO = querG && querF ? "ambos" : querG ? "gerar" : "fechar";
    process.env.IA_DRY = "0";
    process.env.IA_ORIGEM = "PROGRAMADO";
    process.env.IA_SLOT_OK = "1";
    process.env.IA_MODELO = process.env.IA_MODELO || "claude-haiku-5-5";
    log(`agenda: executando ${[querG && g, querF && f].filter(Boolean).join(" + ")} (modo ${process.env.IA_MODO})`);
    let saida = null, erro = null;
    try { saida = await require("./cli").principal(); } catch (e) { erro = e; }
    // registra o desfecho do horário (inclusive DADOS_VELHOS/BLOQUEADO/ERRO, que não geram documento de sinal): transparência da taxa de cada um
    const resumo = (saida && saida.gerar) ? { status: saida.gerar.status, motivo: String(saida.gerar.motivo || "").slice(0, 300) } : (erro ? { status: "ERRO", motivo: String(erro.message).slice(0, 300) } : { status: "OK" });
    if (querG) await db.collection("ia_agenda").doc(g).set({ ...resumo, concluidoEm: new Date().toISOString() }, { merge: true });
    if (querF) await db.collection("ia_agenda").doc(f).set({ status: erro ? "ERRO" : "OK", fechamento: saida && saida.fechar ? saida.fechar : null, concluidoEm: new Date().toISOString() }, { merge: true });
    if (erro) throw erro;
    return { acao: "EXECUTADO", gerar: querG ? g : null, fechar: querF ? f : null, saida };
}

module.exports = { principalAgendado };

if (require.main === module) principalAgendado().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
