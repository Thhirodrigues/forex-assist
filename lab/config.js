// ===================================================
// FOREX ASSIST - LABORATÓRIO - CONFIGURAÇÃO DO ROTULADOR
// Tudo que é "regra do jogo" do laboratório mora aqui. Mudar qualquer número abaixo
// muda o significado dos resultados: registrar a mudança e a data no caderno
// (DOCUMENTACAO/LABORATORIO-E-ANALISES.md) antes de olhar números novos.
// ===================================================

module.exports = {

    // Mesma regra do oficial (riskManager.existeCooldown): bloqueia o par por 30 min a partir
    // da abertura E enquanto a posição anterior (variante ATUAL) estiver aberta.
    COOLDOWN_MIN: 30,

    // Primeira execução: quanto do passado de `analises` entra (marcado preRegistro:true,
    // vale como "dados que geraram a regra", nunca como prova).
    BACKFILL_HORAS_PADRAO: 48,

    // Entrada ainda aberta depois disso vira EXPIRADA (não conta). Limite técnico também:
    // a TwelveData devolve no máximo 5000 candles de 5 min (~17 dias).
    MAX_DIAS_ABERTA: 10,

    // Leitura máxima de `analises` por execução (o resto fica para a próxima).
    LIMITE_LEITURA: 3000,

    // Plano gratuito da TwelveData: 8 requisições/minuto por chave.
    INTERVALO_ENTRE_PARES_MS: 8000,

    // Teto de reanálises guardadas por entrada (documento do Firestore tem 1 MB).
    MAX_REANALISES: 400

};
