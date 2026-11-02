// ===================================================
// FOREX ASSIST - SINAL POR IA - PROMPT E VALIDAÇÃO DA SAÍDA (funções puras)
// ===================================================

const SISTEMA = `Você é um analista de câmbio (Forex) que escolhe UMA operação de curto prazo (horizonte de algumas horas) entre os pares fornecidos, ou decide não operar.

Regras:
- Use SOMENTE os dados fornecidos na mensagem (indicadores salvos pelo scanner do app). Não use conhecimento sobre preços ou eventos reais de datas específicas, e não invente dados.
- A operação tem alvo (TP) e stop (SL) SIMÉTRICOS e fixos, definidos pelo sistema; você decide apenas o par, a direção (COMPRAR ou VENDER) e se vale a pena operar agora.
- "direcaoDoApp" é o que o sistema atual do app aprovou (BUY/SELL) ou null. Você pode concordar, discordar ou ignorar.
- "minutosAtras" é a idade dos indicadores (rsi, adx, atr, score, tendência): o scanner não reanalisa pares com posição aberta, então alguns dados são velhos. Desconte indicadores com mais de ~60 minutos. "precoAgora", "v1hPct" e "v24hPct" (quando existirem) são o preço e a variação recentes do par, mais atuais que os indicadores.
- Se nenhum par tiver uma situação coerente (indicadores conflitantes, dados velhos, sem tendência clara), responda SEM_SINAL. Não force uma operação.
- Responda no formato JSON pedido. O campo "motivo" deve ter no máximo 300 caracteres, em português, citando os indicadores usados.`;

function mensagemUsuario(entrada, agoraISO) {
    return `Instante da consulta (UTC): ${agoraISO}\nDados por par (minutosAtras = idade da análise):\n${JSON.stringify(entrada)}\n\nEscolha no máximo uma operação.`;
}

const SCHEMA_SAIDA = {
    type: "object",
    properties: {
        decisao: { type: "string", enum: ["COMPRAR", "VENDER", "SEM_SINAL"] },
        par: { type: "string" },
        confianca: { type: "integer" },
        motivo: { type: "string" }
    },
    required: ["decisao", "par", "confianca", "motivo"],
    additionalProperties: false
};

// valida a saída do modelo contra os pares realmente oferecidos
function validarSaida(obj, paresOferecidos) {
    if (!obj || typeof obj !== "object") return { ok: false, erro: "saída não é objeto" };
    const { decisao, par, confianca, motivo } = obj;
    if (!["COMPRAR", "VENDER", "SEM_SINAL"].includes(decisao)) return { ok: false, erro: `decisão inválida: ${decisao}` };
    const conf = Number(confianca);
    if (!Number.isFinite(conf) || conf < 0 || conf > 100) return { ok: false, erro: "confiança fora de 0-100" };
    const texto = String(motivo || "").slice(0, 300);
    if (decisao === "SEM_SINAL") return { ok: true, valor: { decisao, par: null, confianca: Math.round(conf), motivo: texto } };
    if (!paresOferecidos.includes(par)) return { ok: false, erro: `par não oferecido: ${par}` };
    return { ok: true, valor: { decisao, par, confianca: Math.round(conf), motivo: texto } };
}

module.exports = { SISTEMA, mensagemUsuario, SCHEMA_SAIDA, validarSaida };
