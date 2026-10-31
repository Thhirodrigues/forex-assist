// ===================================================
// FOREX ASSIST - SINAL POR IA - CONFIGURAÇÃO (pré-registro 6.38; escrito antes de qualquer sinal)
// Mudar qualquer número daqui muda o significado dos resultados: registrar a data no caderno antes.
// ===================================================

module.exports = {
    // versão do prompt: entra no registro de cada sinal; mudar o texto do prompt = nova versão (e nova amostra)
    PROMPT_VERSAO: "v1-2026-10-31",

    // análises do scanner usadas na entrada do modelo: só as dos últimos N minutos (dado velho = sinal velho)
    FRESCOR_ANALISE_MIN: 45,
    MIN_PARES_FRESCOS: 5,

    // teto de uso (valores-padrão; podem ser sobrescritos por variável de ambiente, nunca pelo modelo)
    MAX_CHAMADAS_DIA: 8,
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
