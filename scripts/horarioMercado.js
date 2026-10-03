// AJUSTE-066 (03/10/2026): horário REAL do mercado de forex.
//
// O mercado de forex fecha na sexta às 17:00 de Nova York e reabre no domingo às
// 17:00 de Nova York (21:00Z no horário de verão dos EUA, 22:00Z no inverno; em
// Brasília, 18:00 / 19:00). Depois do fechamento a corretora trava; mesmo assim a
// TwelveData continua entregando candles de 5 min com cotação rala (ex.: AUD/USD,
// sexta 02/10, candles de 21:00 e 21:05Z: -15 pips sem nenhuma notícia), e o Result
// Check chegou a fechar uma operação (LOSS -5,18) num deles. Usar sempre o fuso
// America/New_York (e não um deslocamento fixo) faz o horário de verão acertar sozinho.

const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatador = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
});

// { dia: 0=domingo..6=sábado, minutos: minutos desde 00:00 em Nova York }
function relogioNovaYork(ms) {

    const partes = {};

    formatador.formatToParts(new Date(ms)).forEach(p => { partes[p.type] = p.value; });

    return {
        dia: DIAS[partes.weekday],
        minutos: Number(partes.hour) * 60 + Number(partes.minute)
    };

}

const FECHAMENTO_NY = 17 * 60;

// true se o instante `ms` (epoch ms) cai com o mercado ABERTO. Para um candle de 5 min
// passe o horário de INÍCIO dele: o candle das 20:55Z de sexta (início às 16:55 NY) é
// o último válido; o das 21:00Z já é fora do mercado.
function mercadoForexAberto(ms = Date.now()) {

    const { dia, minutos } = relogioNovaYork(ms);

    if (dia === 6) return false;
    if (dia === 5 && minutos >= FECHAMENTO_NY) return false;
    if (dia === 0 && minutos < FECHAMENTO_NY) return false;

    return true;

}

// Para decidir se vale a pena CONSULTAR agora: dá `graçaMin` minutos depois do
// fechamento (e depois da reabertura) para o ciclo que passa logo após as 17:00 NY
// ainda enxergar o último candle válido da sexta (o das 16:55 só fecha às 17:00).
function mercadoForexAbertoParaConsulta(ms = Date.now(), gracaMin = 10) {

    return mercadoForexAberto(ms - gracaMin * 60000);

}

// Próxima abertura (epoch ms) a partir de `ms`, ou `ms` se já está aberto. Anda de 5 em 5
// min até 4 dias (no máximo ~1.150 passos).
function proximaAberturaForex(ms = Date.now()) {

    if (mercadoForexAberto(ms)) return ms;

    for (let t = ms, i = 0; i < 1152; i++, t += 5 * 60000) {
        if (mercadoForexAberto(t)) return t;
    }

    return null;

}

// AJUSTE-068 (03/10/2026): este arquivo agora também roda no navegador (index.html carrega
// scripts/horarioMercado.js) pra mostrar "Mercado fechado" no app - uma só fonte da regra.
const api = {
    relogioNovaYork,
    mercadoForexAberto,
    mercadoForexAbertoParaConsulta,
    proximaAberturaForex
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
} else if (typeof window !== "undefined") {
    window.horarioMercado = api;
}
