// ===================================================
// FOREX ASSIST - SINAL POR IA - TETO DE GASTO (pré-registro 6.38)
// Documento `ia_controle/uso`: contadores por dia e por mês (UTC). Antes de CADA chamada ao modelo: confere o teto.
// O teto é do sistema (variável de ambiente / config), nunca do modelo. Estimativa de custo = tokens x preço da tabela.
// ===================================================

const CFG = require("./config");

const diaUTC = (t) => new Date(t).toISOString().slice(0, 10);
const mesUTC = (t) => new Date(t).toISOString().slice(0, 7);

function custoUSD(modelo, usage) {
    const [pIn, pOut] = CFG.PRECOS[modelo] || CFG.PRECO_DESCONHECIDO;
    const entrada = (Number(usage?.input_tokens) || 0) + (Number(usage?.cache_creation_input_tokens) || 0) + (Number(usage?.cache_read_input_tokens) || 0);
    const saida = Number(usage?.output_tokens) || 0;
    return Number(((entrada * pIn + saida * pOut) / 1e6).toFixed(6));
}

// pior caso de UMA chamada (entrada estimada + saída no máximo), para barrar ANTES de gastar
function piorCasoUSD(modelo, tokensEntradaEstimados) {
    return custoUSD(modelo, { input_tokens: tokensEntradaEstimados, output_tokens: CFG.MAX_TOKENS });
}

async function lerUso(ref) {
    const snap = await ref.get();
    return snap.exists ? snap.data() : { dias: {}, meses: {} };
}

async function podeChamar({ ref, agora, modelo, tokensEntradaEstimados, maxDia = CFG.MAX_CHAMADAS_DIA, tetoMes = CFG.TETO_USD_MES }) {
    const uso = await lerUso(ref);
    const d = (uso.dias || {})[diaUTC(agora)] || { chamadas: 0, usd: 0 };
    const mes = (uso.meses || {})[mesUTC(agora)] || 0;
    if (d.chamadas >= maxDia) return { ok: false, motivo: `teto de chamadas do dia (${maxDia}) atingido`, uso: { dia: d, mes } };
    const pior = piorCasoUSD(modelo, tokensEntradaEstimados);
    if (mes + pior > tetoMes) return { ok: false, motivo: `teto de gasto do mês (US$ ${tetoMes}) atingido: gasto ${mes.toFixed(4)} + pior caso ${pior.toFixed(4)}`, uso: { dia: d, mes } };
    return { ok: true, uso: { dia: d, mes } };
}

async function registrarUso({ ref, agora, usd }) {
    const uso = await lerUso(ref);
    const dias = { ...(uso.dias || {}) }, meses = { ...(uso.meses || {}) };
    const k = diaUTC(agora), m = mesUTC(agora);
    dias[k] = { chamadas: ((dias[k] || {}).chamadas || 0) + 1, usd: Number((((dias[k] || {}).usd || 0) + usd).toFixed(6)) };
    meses[m] = Number(((meses[m] || 0) + usd).toFixed(6));
    await ref.set({ dias, meses, atualizadoEm: agora });
    return { dia: dias[k], mes: meses[m] };
}

module.exports = { custoUSD, piorCasoUSD, podeChamar, registrarUso, diaUTC, mesUTC };
