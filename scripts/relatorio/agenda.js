// ===================================================
// FOREX ASSIST - RELATÓRIO NO TELEGRAM - AGENDA (funções puras)
//
// Mesmo desenho da IA (scripts/ia/agenda.js): o cron nativo do GitHub não é confiável, então o workflow `relatorio-telegram.yml`
// dispara quando o scanner TERMINA (workflow_run) e pergunta "estou dentro de um horário fixo e ele ainda não foi enviado?".
// Cada relatório sai NO MÁXIMO UMA VEZ (reserva atômica em `relatorio_agenda/<chave>`).
//
// Horários (decisão do usuário em 05/11/2026: "conforme você estruturou"):
//   DIÁRIO : segunda a sexta, 21:30 UTC = 18:30 de Brasília (valem até +25 min: o primeiro ciclo do scanner depois dele)
//   SEMANAL: sexta, 21:40 UTC = 18:40 de Brasília (mercado fecha 22:00 UTC)
// O "dia" do relatório é o dia de BRASÍLIA (UTC-3, sem horário de verão).
// ===================================================
const DIARIO_HM = [21, 30], SEMANAL_HM = [21, 40], JANELA_MIN = 25;

const diaStr = (ms) => new Date(ms).toISOString().slice(0, 10);

function dentro(agoraMs, [h, m]) {
    const d = new Date(agoraMs);
    const ini = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
    return agoraMs >= ini && agoraMs < ini + JANELA_MIN * 60000;
}

// chave do relatório DIÁRIO em que `agoraMs` cai (ex.: "diario_2026-11-05"), ou null
function slotDiario(agoraMs) {
    const w = new Date(agoraMs).getUTCDay();
    return w >= 1 && w <= 5 && dentro(agoraMs, DIARIO_HM) ? `diario_${diaStr(agoraMs)}` : null;
}

// chave do SEMANAL (só sexta), ou null
function slotSemanal(agoraMs) {
    return new Date(agoraMs).getUTCDay() === 5 && dentro(agoraMs, SEMANAL_HM) ? `semanal_${diaStr(agoraMs)}` : null;
}

module.exports = { DIARIO_HM, SEMANAL_HM, JANELA_MIN, slotDiario, slotSemanal };
