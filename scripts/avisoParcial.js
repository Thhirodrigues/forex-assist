// ===================================================
// FOREX ASSIST - AVISO DE LUCRO PARCIAL (07/10/2026, pedido do usuário)
//
// Quando o lucro ABERTO de um sinal chega a `percentual`% do TP, o verificador (js/checker.js) manda UM push e grava
// `avisoParcial` no sinal. SÓ AVISA: nada aqui fecha operação nem altera TP/SL/resultado; o fechamento continua sendo do
// TP/SL, e encerrar antes é decisão do usuário, na corretora. Padrão LIGADO e 60% (config: avisoParcialAtivo/avisoParcialPct).
//
// O aviso fica gravado no sinal (hora, %, pips, preço) para medirmos depois, com o desfecho real do sinal, o que teria
// acontecido se o usuário tivesse encerrado ali. Lucro medido no preço atual, SEM descontar o spread (o spread da XM
// aparece no P&L da corretora; o app mede o movimento do preço).
// ===================================================

const PADRAO = { ativo: true, percentual: 60 };
const MIN_PCT = 10, MAX_PCT = 95;

function configAviso(configuracao) {
    const c = configuracao || {};
    const pct = Number(c.avisoParcialPct);
    return {
        ativo: c.avisoParcialAtivo !== false,   // ausente = ligado
        percentual: Number.isFinite(pct) ? Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(pct))) : PADRAO.percentual
    };
}

/**
 * @param {object} p
 * @param {object} p.sinal            documento do sinal ainda ABERTO (financeiro.tpPips, avisoParcial)
 * @param {number} p.movimentoPips    lucro aberto em pips, JÁ com o sinal da direção (+ = a favor)
 * @param {object} p.configuracao     configuracoes/geral
 */
function avaliarAviso({ sinal, movimentoPips, configuracao }) {
    const cfg = configAviso(configuracao);
    if (!cfg.ativo) return { avisar: false, motivo: "desligado", ...cfg };
    if (sinal && sinal.avisoParcial) return { avisar: false, motivo: "ja_avisado", ...cfg };
    const tpPips = Math.abs(Number(sinal && sinal.financeiro && sinal.financeiro.tpPips));
    if (!(tpPips > 0)) return { avisar: false, motivo: "sem_tp", ...cfg };
    const mov = Number(movimentoPips);
    if (!Number.isFinite(mov)) return { avisar: false, motivo: "sem_preco", ...cfg };
    const alvoPips = Number(((cfg.percentual / 100) * tpPips).toFixed(2));
    const atingido = Number(((mov / tpPips) * 100).toFixed(1));
    return { avisar: mov >= alvoPips, motivo: mov >= alvoPips ? "atingido" : "abaixo", tpPips, alvoPips, pctAtingido: atingido, ...cfg };
}

// o que fica gravado em sinal.avisoParcial
function registroDoAviso({ avaliacao, precoAtual, lucroUSD, agora = Date.now() }) {
    return {
        em: agora,
        percentualConfigurado: avaliacao.percentual,
        pctAtingido: avaliacao.pctAtingido,
        pips: Number(avaliacao.pctAtingido !== undefined ? ((avaliacao.pctAtingido / 100) * avaliacao.tpPips).toFixed(1) : 0),
        tpPips: avaliacao.tpPips,
        preco: Number(precoAtual),
        usd: Number.isFinite(Number(lucroUSD)) ? Number(Number(lucroUSD).toFixed(2)) : null
    };
}

module.exports = { configAviso, avaliarAviso, registroDoAviso, PADRAO, MIN_PCT, MAX_PCT };
