// ===================================================
// FOREX ASSIST - RESUMO DE MERCADO POR PAR (contexto para o detalhe do sinal)
//
// O que é: para cada par do app, o preço mais recente e a variação de ~1 h e ~24 h de mercado, gravados em
// `scanner/mercado` (um documento só) para o app mostrar, no detalhe do sinal, o que os OUTROS pares da mesma moeda
// estão fazendo. É CONTEXTO, não filtro: o Laboratório (caderno 6.28) testou "concordância de moeda" e "a favor/contra
// a tendência" em 360 dias e não achou efeito. NÃO toca em score, aprovação, TP/SL, lote nem cooldown.
//
// De onde vêm os dados, nesta ordem (sem gastar crédito do scanner):
//  1) `cacheCandles15min/{PAR}`: candles de 15 min que o próprio scanner já guarda para cada par que analisou agora.
//  2) pares parados (cooldown/fora da janela: justamente os que têm posição aberta) ficam com dado velho; até
//     `max` deles por ciclo são atualizados com UMA chamada extra pelo rodízio de chaves do scanner. Só acontece
//     quando a 4ª chave (API_KEY_4) existe: com 3 chaves o scanner já usa ~1.900 de 2.400 créditos/dia e não há folga
//     (medido em 06/10). Sem API_KEY_4, nada é buscado: o app mostra a idade do dado.
// Qualquer falha aqui é engolida: o ciclo do scanner nunca depende deste resumo.
// ===================================================

const { mercadoForexAberto } = require("./horarioMercado");

const PARES_PADRAO = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY", "GBP/JPY", "EUR/GBP"];
const BARRAS_1H = 4, BARRAS_24H = 96;            // candles de 15 min
const QUINZE_MIN = 15 * 60000;
const chaveDoc = (par) => String(par).replace("/", "_");

const msDoCandle = (c) => new Date(String(c.datetime).replace(" ", "T") + "Z").getTime();

// candles: TwelveData 15 min, do mais antigo ao mais novo ({datetime UTC, close}). Só horário de mercado (mesmo filtro do checker).
function resumirCandles15(candles) {
    const v = (candles || [])
        .map(c => ({ t: msDoCandle(c), c: Number(c.close) }))
        .filter(x => Number.isFinite(x.t) && Number.isFinite(x.c) && x.c > 0 && mercadoForexAberto(x.t))
        .sort((a, b) => a.t - b.t);
    if (v.length < BARRAS_1H + 1) return null;
    const ult = v[v.length - 1];
    const varia = (n) => (v.length > n ? Number(((ult.c / v[v.length - 1 - n].c - 1) * 100).toFixed(3)) : null);
    return { preco: ult.c, v1h: varia(BARRAS_1H), v24h: varia(BARRAS_24H), ate: ult.t + QUINZE_MIN };
}

// uma chamada de 15 min pelo rodízio de chaves do scanner (marketData.getCandles: 429 tenta a próxima chave)
async function buscarCandles15(par, _habilitado, outputsize = 150) {   // 150: sobra para os candles de fim de semana (descartados) caberem as 96 barras de 24 h
    const { getCandles } = require("./marketData");
    return getCandles(par, "15min", outputsize);
}

/**
 * @param {object} p
 * @param {object} p.db                      Firestore (oficial)
 * @param {string[]} [p.pares]
 * @param {number} [p.agora]
 * @param {number} [p.refreshMin=30]          dado mais velho que isso (e mercado aberto) é candidato a atualização extra
 * @param {number} [p.max=2]                  máximo de chamadas extras por ciclo
 * @param {string} [p.chaveExtra]             só um interruptor: API_KEY_4 presente (rodízio de 4 chaves) liga as chamadas extras; ausente = nenhuma
 * @param {Function} [p.buscar]               injetável nos testes: (par, chave) => candles 15 min
 */
async function atualizarResumoMercado({ db, pares = PARES_PADRAO, agora = Date.now(), refreshMin = 30, max = 2, chaveExtra = process.env.API_KEY_4, buscar = buscarCandles15, log = () => {} }) {

    const ref = db.collection("scanner").doc("mercado");
    const snap = await ref.get();
    const atual = snap.exists ? (snap.data().pares || {}) : {};
    const novo = { ...atual };
    const origem = { cache: 0, extra: 0, falhas: 0 };

    // 1) a partir do cache que o scanner já mantém
    for (const par of pares) {
        try {
            const c = await db.collection("cacheCandles15min").doc(chaveDoc(par)).get();
            if (!c.exists) continue;
            const r = resumirCandles15(c.data().candles);
            if (r && (!novo[chaveDoc(par)] || r.ate > (novo[chaveDoc(par)].ate || 0))) { novo[chaveDoc(par)] = { ...r, fonte: "cache" }; origem.cache++; }
        } catch (e) { origem.falhas++; log(`resumo de mercado: cache de ${par} ilegível (${e.message})`); }
    }

    // 2) pares parados: atualização extra com a chave dedicada
    if (chaveExtra && mercadoForexAberto(agora)) {
        const velhos = pares
            .filter(par => !novo[chaveDoc(par)] || agora - novo[chaveDoc(par)].ate > refreshMin * 60000)
            .sort((a, b) => ((novo[chaveDoc(a)] || {}).ate || 0) - ((novo[chaveDoc(b)] || {}).ate || 0))
            .slice(0, max);
        for (const par of velhos) {
            try {
                const r = resumirCandles15(await buscar(par, chaveExtra));
                if (r) { novo[chaveDoc(par)] = { ...r, fonte: "extra" }; origem.extra++; }
            } catch (e) { origem.falhas++; log(`resumo de mercado: busca extra de ${par} falhou (${e.message})`); }
        }
    }

    await ref.set({ pares: novo, atualizadoEm: agora });
    return { pares: novo, origem };
}

module.exports = { resumirCandles15, buscarCandles15, atualizarResumoMercado, PARES_PADRAO, chaveDoc, BARRAS_1H, BARRAS_24H };
