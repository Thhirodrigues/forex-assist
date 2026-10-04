// ===================================================
// FOREX ASSIST - LABORATÓRIO - PLACAR DAS HIPÓTESES (função pura)
//
// Recebe as linhas de `resumo` e monta, por tipo/época/variante, a comparação das hipóteses
// pré-registradas (PENDENCIAS-ESTRATEGICAS-RMI.md, H1-H5). Regra de decisão registrada: só vale
// diferença >= 10 pontos, no sentido da hipótese, repetida nos dados NOVOS (época `pos`).
// Faixas de amostra (caderno 6.7): < 100 por grupo = "só triagem"; >= 300 = "teste".
// ===================================================

(function () {

const HIPOTESES = [
    { id: "H1", texto: "score >=50 acerta MENOS que 35-49", a: "H1_score50mais", b: "H1_score35a49" },
    { id: "H2", texto: "ADX >=30 acerta MENOS que <30", a: "H2_adx30mais", b: "H2_adx_ate29" },
    { id: "H3", texto: "com candlestick acerta MENOS que sem", a: "H3_com_candle", b: "H3_sem_candle" },
    { id: "H4", texto: "vendido em dólar acerta MENOS que comprado", a: "H4_dolar_vendido", b: "H4_dolar_comprado" },
    { id: "H5", texto: "Balanceado acerta MENOS que Agressivo", a: "H5_balanceado", b: "H5_agressivo" }
];

const acerto = (l) => (l && l.n ? (100 * l.pos) / l.n : null);

function faixaAmostra(nMin) {
    if (nMin >= 300) return "teste";
    if (nMin >= 100) return "indício";
    return "só triagem";
}

function montarPlacar(linhas, { tipo = "OFICIAL", epoca = "pos", variante = "ATUAL" } = {}) {
    const mapa = {};
    for (const l of linhas) if (l.tipo === tipo && l.epoca === epoca && l.variante === variante) mapa[l.grupo || "TODOS"] = l;
    return HIPOTESES.map(h => {
        const A = mapa[h.a], B = mapa[h.b];
        const pa = acerto(A), pb = acerto(B);
        const dif = pa !== null && pb !== null ? Number((pa - pb).toFixed(1)) : null;
        const nMin = Math.min(A ? A.n : 0, B ? B.n : 0);
        return {
            ...h, tipo, epoca, variante,
            nA: A ? A.n : 0, nB: B ? B.n : 0, acertoA: pa, acertoB: pb, diferenca: dif,
            expA: A && A.n ? Number((A.pips / A.n).toFixed(2)) : null, expB: B && B.n ? Number((B.pips / B.n).toFixed(2)) : null,
            amostra: faixaAmostra(nMin),
            // A acerta pelo menos 10 pontos a menos E há amostra (>=100 por grupo). Com menos que
            // isso a diferença é ruído: mostrada, mas nunca marcada como "no sentido da hipótese".
            sentidoDaHipotese: dif !== null && dif <= -10 && nMin >= 100,
            diferencaGrandeMasAmostraPequena: dif !== null && dif <= -10 && nMin < 100
        };
    });
}

function formatarPlacar(placar) {
    const f = (v) => (v === null ? "  - " : `${v.toFixed(0)}%`.padStart(4));
    return placar.map(p =>
        `${p.id} ${p.texto.padEnd(42)} A: n=${String(p.nA).padStart(3)} ${f(p.acertoA)} | B: n=${String(p.nB).padStart(3)} ${f(p.acertoB)} | ` +
        `dif ${p.diferenca === null ? "  - " : (p.diferenca > 0 ? "+" : "") + p.diferenca.toFixed(0) + " pts"} | ${p.amostra}${p.sentidoDaHipotese ? " | NO SENTIDO DA HIPÓTESE (>=10 pts, n>=100)" : (p.diferencaGrandeMasAmostraPequena ? " | diferença grande, amostra pequena = ruído" : "")}`
    ).join("\n");
}

const VARIANTES = [
    { id: "ATUAL", nome: "Saída do sinal (referência)", texto: "TP e SL do próprio sinal" },
    { id: "RR_1_2", nome: "Alvo dobrado (1:2)", texto: "TP = 2x o stop" },
    { id: "TP_CURTO", nome: "Alvo curto (1:0,5)", texto: "TP = metade do stop: acerta mais, ganha menos" },
    { id: "BE_METADE", nome: "Zero a zero na metade", texto: "andou metade do alvo, stop vai para a entrada" },
    { id: "ENTRADA_MAIS_5", nome: "Entrando 5 min depois", texto: "quanto custa o atraso" },
    { id: "ENTRADA_MAIS_10", nome: "Entrando 10 min depois", texto: "quanto custa o atraso" },
    { id: "REANALISE", nome: "Sair se a análise virar", texto: "fecha quando a análise seguinte aponta o lado contrário" },
    { id: "ATR_3X", nome: "Barreira de 3x ATR", texto: "alvo e stop curtos (2-15 pips)" },
    { id: "ATR_6X", nome: "Barreira de 6x ATR", texto: "do tamanho do alvo real do sistema" }
];

const api = { HIPOTESES, VARIANTES, montarPlacar, formatarPlacar, faixaAmostra };

// Node (rotulador, testes) e navegador (aba Laboratório do app) usam o MESMO arquivo.
if (typeof module !== "undefined" && module.exports) module.exports = api;
else if (typeof window !== "undefined") window.labPlacar = api;

})();
