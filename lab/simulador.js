// ===================================================
// FOREX ASSIST - LABORATÓRIO - SIMULADOR DE DESFECHO (função pura, sem I/O)
//
// Dada UMA análise (par, direção, preço, TP/SL em pips) e os candles de 5 min
// depois dela, responde: teria batido TP ou SL primeiro? Em quantos pips líquidos
// e em quanto tempo? Nunca lê nem grava banco, nunca chama API: quem chama fornece
// os candles. Não faz parte do pipeline de sinais.
//
// REGRAS FIXAS (decididas com o usuário, 03/10/2026 - "melhor errar do que um falso dado"):
//  1. Candle de 5 min que toca TP e SL (ou BE e stop) ao mesmo tempo: não dá para saber
//     quem veio primeiro -> conta como PERDA (marcado ambiguo:true).
//  2. Spread: candles são preço médio; o spread (pips) desloca as DUAS barreiras contra
//     a posição. Compra entra no ask e sai no bid: TP exige andar tp+s, SL dispara
//     após andar sl-s. Resultado líquido continua exatamente +tp / -sl.
//  3. Mesma janela do checker oficial: só candles com abertura >= horário da entrada.
//     (Quem chama deve passar candles já filtrados pelo horário de mercado.)
//  4. Sem limite de tempo por padrão: posição que não bate nada fica "ABERTA" (igual ao
//     oficial, que a mantém aberta, inclusive sobre o fim de semana).
//  5. Dentro do candle onde o break-even ativa, ele ainda NÃO protege (vale a partir do
//     próximo candle) - de novo errando contra.
// ===================================================

const CINCO_MIN = 5 * 60 * 1000;

function fatorPip(par) {
    return String(par || "").includes("JPY") ? 100 : 10000;
}

function contra(direcao, tendencia) {
    return (direcao === "BUY" && tendencia === "BAIXA") ||
           (direcao === "SELL" && tendencia === "ALTA");
}

/**
 * @param {object} p
 * @param {string} p.par
 * @param {"BUY"|"SELL"} p.direcao
 * @param {number} p.tEntrada            ms (UTC) do horário da análise
 * @param {number} p.precoEntrada
 * @param {number} p.tpPips              positivo
 * @param {number} p.slPips              positivo
 * @param {number} [p.spreadPips=0]
 * @param {Array<{timestamp:number,open:number,high:number,low:number,close:number}>} p.candles  ordenados
 * @param {object} [p.opcoes]
 * @param {number} [p.opcoes.atrasoMin=0]          entra N min depois, no open do 1º candle >= tEntrada+N
 * @param {boolean} [p.opcoes.breakEvenNaMetade]   ao andar tp/2 a favor, stop vai para o zero a zero
 * @param {number} [p.opcoes.maxMinutos]           fecha a mercado (open do candle) após N min
 * @param {Array<{t:number,preco:number,tendencia:string}>} [p.opcoes.reanalises]  análises POSTERIORES do mesmo par
 * @param {number} [p.opcoes.reanaliseAposMin=0]   ignora reanálises nos primeiros N min
 */
function simularOperacao(p) {

    const { par, direcao, tEntrada, tpPips, slPips, candles } = p;
    const s = Number(p.spreadPips) || 0;
    const o = p.opcoes || {};

    if (direcao !== "BUY" && direcao !== "SELL") return { resultado: "INVALIDA", motivo: "direcao" };
    if (!(tpPips > 0) || !(slPips > 0)) return { resultado: "INVALIDA", motivo: "tp/sl" };
    if (!(slPips > s)) return { resultado: "INVALIDA", motivo: "spread>=sl" };

    // opcoes.inverter: mesma entrada, mesmos pips de TP/SL, direção OPOSTA (teste do "e se o app
    // estivesse do lado contrário?"). Para TP = SL é só o espelho do resultado direto.
    const dir = (direcao === "BUY" ? 1 : -1) * (o.inverter ? -1 : 1);
    const pip = 1 / fatorPip(par);

    let inicio = Number(tEntrada);
    let entrada = Number(p.precoEntrada);
    let lista = candles;

    if (o.atrasoMin > 0) {
        inicio = tEntrada + o.atrasoMin * 60000;
        lista = candles.filter(c => c.timestamp >= inicio);
        if (!lista.length) return { resultado: "ABERTA" };
        entrada = lista[0].open;
    } else {
        lista = candles.filter(c => c.timestamp >= inicio);
    }

    if (!Number.isFinite(entrada)) return { resultado: "INVALIDA", motivo: "entrada" };

    const alvo = entrada + dir * (tpPips + s) * pip;
    const stopInicial = entrada - dir * (slPips - s) * pip;
    const metade = entrada + dir * (tpPips / 2 + s) * pip;
    const zeroAZero = entrada + dir * s * pip;

    const favoravel = (c) => dir === 1 ? c.high : c.low;
    const adverso = (c) => dir === 1 ? c.low : c.high;
    const bateuAlvo = (c) => dir === 1 ? c.high >= alvo : c.low <= alvo;
    const bateuStop = (c, stop) => dir === 1 ? c.low <= stop : c.high >= stop;
    const liquido = (preco) => Number(((dir * (preco - entrada)) / pip - s).toFixed(2));
    const pronto = (resultado, pips, t, extra = {}) => ({
        resultado,
        pips,
        tFechamento: t,
        duracaoMin: Math.round((t - inicio) / 60000),
        entrada,
        ...extra
    });

    const reanalises = (o.reanalises || [])
        .filter(r => r.t >= inicio + (o.reanaliseAposMin || 0) * 60000)
        .sort((a, b) => a.t - b.t);
    let iRe = 0;

    let beAtivo = false;

    for (const c of lista) {

        if (o.maxMinutos && c.timestamp >= inicio + o.maxMinutos * 60000) {
            return pronto("TEMPO", liquido(c.open), c.timestamp);
        }

        const stop = beAtivo ? zeroAZero : stopInicial;
        const tocouAlvo = bateuAlvo(c);
        const tocouStop = bateuStop(c, stop);

        if (tocouStop) {
            // vale também quando toca os dois no mesmo candle (regra 1: perda/zero)
            return pronto(beAtivo ? "ZERO" : "LOSS", beAtivo ? 0 : -slPips, c.timestamp + CINCO_MIN,
                { ambiguo: tocouAlvo });
        }
        if (tocouAlvo) return pronto("WIN", tpPips, c.timestamp + CINCO_MIN);

        if (o.breakEvenNaMetade && !beAtivo && (dir === 1 ? favoravel(c) >= metade : favoravel(c) <= metade)) {
            beAtivo = true;   // vale a partir do próximo candle (regra 5)
        }

        // reanálise: o candle onde ela cai já foi checado por TP/SL (errar contra)
        while (iRe < reanalises.length && reanalises[iRe].t < c.timestamp + CINCO_MIN) {
            const r = reanalises[iRe++];
            if (contra(direcao, r.tendencia) && Number.isFinite(r.preco)) {
                return pronto("REANALISE", liquido(r.preco), r.t);
            }
        }

    }

    return { resultado: "ABERTA" };

}

// Conjunto padrão de variantes aplicado à MESMA análise (E2/E3 do caderno).
// `atrMultiplo` ainda é provisório: conferir contra a distribuição real do ATR em pips.
function variantesPadrao(analise, { atrMultiplo = 3 } = {}) {

    const tp = Math.abs(Number(analise.tpPips));
    const sl = Math.abs(Number(analise.slPips));
    const atrPips = Number(analise.indicadores?.atr) * fatorPip(analise.par);

    const lista = [
        { id: "ATUAL",     tpPips: tp,       slPips: sl, opcoes: {} },
        { id: "RR_1_2",    tpPips: sl * 2,   slPips: sl, opcoes: {} },
        { id: "TP_CURTO",  tpPips: sl / 2,   slPips: sl, opcoes: {} },
        { id: "BE_METADE", tpPips: tp,       slPips: sl, opcoes: { breakEvenNaMetade: true } },
        { id: "ENTRADA_MAIS_5",  tpPips: tp, slPips: sl, opcoes: { atrasoMin: 5 } },
        { id: "ENTRADA_MAIS_10", tpPips: tp, slPips: sl, opcoes: { atrasoMin: 10 } },
        { id: "REANALISE", tpPips: tp,       slPips: sl, opcoes: { usaReanalises: true } },
        // 04/10/2026: INVERSO = direção oposta (ver nota acima); ATUAL_SPREAD_* = o mesmo sinal com
        // custo 1,5x e 2x (spread real abre em notícia e na virada de sessão; só estresse).
        { id: "INVERSO",   tpPips: tp,       slPips: sl, opcoes: { inverter: true } },
        { id: "ATUAL_SPREAD_1_5X", tpPips: tp, slPips: sl, opcoes: { spreadMult: 1.5 } },
        { id: "ATUAL_SPREAD_2X",   tpPips: tp, slPips: sl, opcoes: { spreadMult: 2 } }
    ];

    // ATR_3X = barreira CURTA (2-15 pips; medido em 04/10: ATR de 5 min vai de ~2,5 pips no
    // AUD/USD a ~15 no EUR/JPY). ATR_6X ~ o tamanho do alvo real do sistema (TP/ATR mediano ~5,5x,
    // 20-40 pips): é o comparável de verdade. Variante nova a partir de 04/10 (entradas
    // anteriores não a têm).
    if (Number.isFinite(atrPips) && atrPips > 0) {
        for (const m of [atrMultiplo, atrMultiplo * 2]) {
            const k = Number((atrPips * m).toFixed(1));
            lista.push({ id: `ATR_${m}X`, tpPips: k, slPips: k, opcoes: {} });
        }
    }

    return lista;

}

module.exports = { simularOperacao, variantesPadrao, fatorPip };
