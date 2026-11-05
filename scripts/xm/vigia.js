// ===================================================
// FOREX ASSIST - VIGIA DO MT5 (alerta quando o computador/EA da XM para de enviar dados)
//
// O exportador (mt5/XM_Exporter.mq5) grava `xm_conta/estado` a cada ~60 s. Se, em horário de mercado, o último estado ficar mais
// velho que LIMITE_MIN, manda UM aviso ao celular (e repete a cada REENVIO_MIN, no máximo MAX_AVISOS vezes) e, quando voltar,
// avisa que voltou. Só lê o LAB e escreve o próprio estado (`xm_vigia/estado`, LAB) + envia push. Não toca em sinal nem na conta.
// ===================================================

const LIMITE_MIN = 10;
const REENVIO_MIN = 60;
const MAX_AVISOS = 6;

// Mercado de câmbio: abre domingo 22:00 UTC e fecha sexta 22:00 UTC (horário de inverno dos EUA, desde 01/11/2026).
// Aproximação deliberada: na dúvida de horário de verão o erro é de 1 h, aceitável para um vigia.
function mercadoAberto(agoraMs) {
    const d = new Date(agoraMs);
    const dia = d.getUTCDay(), h = d.getUTCHours();
    if (dia === 6) return false;                 // sábado
    if (dia === 0) return h >= 22;               // domingo só depois das 22:00 UTC
    if (dia === 5) return h < 22;                // sexta até 22:00 UTC
    return true;                                 // segunda a quinta
}

/**
 * @param {{agoraMs:number, estadoGmtSeg:number|null, anterior?:object, limiteMin?:number, reenvioMin?:number, maxAvisos?:number}} p
 * @returns {{acao:"NENHUMA"|"ALERTAR"|"RECUPEROU", idadeMin:number|null, aberto:boolean, novo:object}}
 */
function avaliar({ agoraMs, estadoGmtSeg, anterior = {}, limiteMin = LIMITE_MIN, reenvioMin = REENVIO_MIN, maxAvisos = MAX_AVISOS }) {
    const aberto = mercadoAberto(agoraMs);
    const idadeMin = Number.isFinite(estadoGmtSeg) ? Math.max(0, Math.round((agoraMs / 1000 - estadoGmtSeg) / 60 * 10) / 10) : null;
    const parado = idadeMin === null || idadeMin > limiteMin;
    const ant = { parado: false, desdeMs: null, ultimoAvisoMs: null, avisos: 0, ...anterior };
    if (parado) {
        if (!aberto) return { acao: "NENHUMA", idadeMin, aberto, novo: ant };           // fim de semana: PC pode estar desligado, sem alerta
        if (!ant.parado) return { acao: "ALERTAR", idadeMin, aberto, novo: { parado: true, desdeMs: agoraMs, ultimoAvisoMs: agoraMs, avisos: 1 } };
        if (ant.avisos < maxAvisos && agoraMs - (ant.ultimoAvisoMs ?? 0) >= reenvioMin * 60000) return { acao: "ALERTAR", idadeMin, aberto, novo: { ...ant, ultimoAvisoMs: agoraMs, avisos: ant.avisos + 1 } };
        return { acao: "NENHUMA", idadeMin, aberto, novo: ant };
    }
    if (ant.parado) return { acao: "RECUPEROU", idadeMin, aberto, novo: { parado: false, desdeMs: null, ultimoAvisoMs: null, avisos: 0 } };
    return { acao: "NENHUMA", idadeMin, aberto, novo: ant };
}

const hora = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });

function montarAviso(acao, { idadeMin, ultimoEstadoMs, simulado = false }) {
    const pref = simulado ? "TESTE: " : "";
    if (acao === "RECUPEROU") return { title: `${pref}✅ MT5 voltou a enviar`, body: `O computador da XM voltou a enviar dados (${hora(Date.now())}).` };
    const quando = ultimoEstadoMs ? `Último dado às ${hora(ultimoEstadoMs)}` : "Nenhum dado recebido";
    return { title: `${pref}⚠️ MT5 parou de enviar`, body: `${quando}${idadeMin != null ? ` (há ${Math.round(idadeMin)} min)` : ""}. Sem isso o executor não opera nem a conta é lida. Confira o computador da XM.` };
}

module.exports = { avaliar, mercadoAberto, montarAviso, LIMITE_MIN, REENVIO_MIN, MAX_AVISOS };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const { enviarParaTokens, obterTokensAtivos } = require("../pushNotifier");
        const oficial = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }, "oficial");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }, "lab").firestore();
        const agora = Date.now();
        const simular = process.env.VIGIA_SIMULAR === "1";

        const estSnap = await lab.collection("xm_conta").doc("estado").get();
        let gmt = null;
        if (estSnap.exists) { try { gmt = Number(JSON.parse(estSnap.data().json).gmt); } catch { gmt = null; } }
        const refEstado = lab.collection("xm_vigia").doc("estado");
        const anterior = (await refEstado.get()).data() || {};
        const r = avaliar({ agoraMs: agora, estadoGmtSeg: gmt, anterior });
        console.log(`vigia: mercado ${r.aberto ? "ABERTO" : "fechado"} | último estado há ${r.idadeMin === null ? "?" : r.idadeMin} min | ação ${r.acao}${simular ? " | SIMULAÇÃO (não altera o estado)" : ""}`);

        const enviar = async (acao) => {
            const tokens = await obterTokensAtivos(oficial.firestore());
            const aviso = montarAviso(acao, { idadeMin: r.idadeMin, ultimoEstadoMs: gmt ? gmt * 1000 : null, simulado: simular });
            await enviarParaTokens(oficial, oficial.firestore(), tokens, {
                notification: { title: aviso.title, body: aviso.body },
                data: { tipo: "alerta", emitidoEm: String(agora), url: "./" },
                webpush: { headers: { Urgency: "high" } }
            });
            console.log(`aviso enviado: "${aviso.title}" para ${tokens.length} dispositivo(s) ativo(s)`);
        };
        if (simular) { await enviar("ALERTAR"); return; }
        if (r.acao !== "NENHUMA") await enviar(r.acao);
        await refEstado.set({ ...r.novo, verificadoEm: new Date(agora).toISOString(), idadeMin: r.idadeMin });
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
