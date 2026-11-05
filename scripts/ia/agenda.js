// ===================================================
// FOREX ASSIST - SINAL POR IA - AGENDA (horários fixos; funções puras)
//
// POR QUE EXISTE: o cron nativo do GitHub Actions NÃO é confiável (ENGINEERING.md, "ACHADO OPERACIONAL": não executa a cada 5 min; por isso o
// scanner e o verificador são disparados por um pinger externo, cron-job.org, via workflow_dispatch). Um `schedule:` nativo para a IA nunca
// disparou. Agora a IA PEGA CARONA no ciclo do scanner (que roda a cada 5 min): a cada ciclo, `agendado.js` pergunta "estou dentro de um
// horário fixo e ele ainda não foi executado?". Só então roda. Cada horário roda NO MÁXIMO UMA VEZ (reserva atômica no banco).
//
// Horários FIXADOS ANTES da avaliação (adendo do caderno 6.38, 05/11/2026), segunda a sexta, em UTC:
//   GERAR : 08:07, 10:07, 12:07, 14:07, 16:07, 18:07   (valem do horário até +25 min: o primeiro ciclo do scanner depois dele)
//   FECHAR: :00 e :30 de cada hora                      (valem do horário até +10 min)
// ===================================================

const SLOTS_GERAR = ["08:07", "10:07", "12:07", "14:07", "16:07", "18:07"];
const JANELA_GERAR_MIN = 25;
const JANELA_FECHAR_MIN = 10;

const dois = (n) => String(n).padStart(2, "0");
const diaUtil = (agoraMs) => { const w = new Date(agoraMs).getUTCDay(); return w >= 1 && w <= 5; };
const diaStr = (agoraMs) => new Date(agoraMs).toISOString().slice(0, 10);

// chave do horário de GERAR em que `agoraMs` cai (ex.: "gerar_2026-11-05T14:07"), ou null
function slotGerar(agoraMs) {
    if (!diaUtil(agoraMs)) return null;
    const d = new Date(agoraMs);
    for (const s of SLOTS_GERAR) {
        const [h, m] = s.split(":").map(Number);
        const ini = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
        if (agoraMs >= ini && agoraMs < ini + JANELA_GERAR_MIN * 60000) return `gerar_${diaStr(agoraMs)}T${s}`;
    }
    return null;
}

// chave do horário de FECHAR (":00" ou ":30"), ou null
function slotFechar(agoraMs) {
    if (!diaUtil(agoraMs)) return null;
    const d = new Date(agoraMs);
    const min = d.getUTCMinutes();
    const base = min < JANELA_FECHAR_MIN ? 0 : min >= 30 && min < 30 + JANELA_FECHAR_MIN ? 30 : null;
    return base === null ? null : `fechar_${diaStr(agoraMs)}T${dois(d.getUTCHours())}:${dois(base)}`;
}

module.exports = { SLOTS_GERAR, JANELA_GERAR_MIN, JANELA_FECHAR_MIN, slotGerar, slotFechar };
