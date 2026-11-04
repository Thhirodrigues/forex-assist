// ===================================================
// FOREX ASSIST - SINAL POR IA - CONFIGURAÇÃO (pré-registro 6.38; escrito antes de qualquer sinal)
// Mudar qualquer número daqui muda o significado dos resultados: registrar a data no caderno antes.
// ===================================================

module.exports = {
    // versão do prompt: entra no registro de cada sinal; mudar o texto do prompt = nova versão (e nova amostra)
    PROMPT_VERSAO: "v2-2026-11-04",
    // AJUSTE-103: se o preço de entrada (último candle fechado) estiver a mais de FRACAO x SL pips do preço que o modelo VIU (resumo de mercado ou análise),
    // a decisão foi tomada com dado defasado: o sinal NÃO é aberto (fica registrado como PRECO_DIVERGENTE, fora da métrica). Limiar meu, fixado ANTES da avaliação.
    DIVERGENCIA_MAX_FRACAO_SL: 0.4,

    // análises do scanner usadas na entrada do modelo. O scanner NÃO analisa par com posição aberta/cooldown (a regra "um aberto por par"),
    // então a qualquer hora vários pares ficam sem análise nova (medido em 02/11/2026 08:30 BRT: só 1 de 10 pares com análise < 45 min).
    // Por isso a janela é de 4 h e cada par leva a IDADE da análise (minutosAtras); o modelo é instruído a descontar dado velho.
    // Ajuste feito em 02/11/2026, ANTES de qualquer sinal (era 45 min e 5 pares).
    FRESCOR_ANALISE_MIN: 240,
    MIN_PARES_FRESCOS: 3,
    // resumo de mercado `scanner/mercado` (preço atual e variação de ~1 h por par): só entra se atualizado há no máximo N min
    FRESCOR_MERCADO_MIN: 30,

    // teto de uso (valores-padrão; podem ser sobrescritos por variável de ambiente, nunca pelo modelo)
    MAX_CHAMADAS_DIA: 24,
    TETO_USD_MES: 4,                 // o saldo carregado no Console é US$5: sobra margem

    // saída do modelo: curta (o custo é quase todo de saída + raciocínio)
    MAX_TOKENS: 2000,
    ESFORCO: "low",

    // entrada ainda aberta depois disso vira EXPIRADA (não conta na avaliação)
    MAX_DIAS_ABERTA: 10,

    // preços em US$ por 1 milhão de tokens (entrada, saída) - só para o TETO de gasto; tabela da skill de API de 06/10/2026
    // (Haiku 5.5 vale para prompts até 100 mil tokens). CONFERIR na tabela oficial antes de confiar no número.
    PRECOS: {
        "claude-haiku-5-5": [0.10, 0.50],
        "claude-sonnet-5-5": [2.00, 10.00],
        "claude-opus-5-5": [4.00, 20.00]
    },
    PRECO_DESCONHECIDO: [10.00, 50.00]   // modelo fora da tabela: assume o mais caro (errar para o lado seguro)
};
