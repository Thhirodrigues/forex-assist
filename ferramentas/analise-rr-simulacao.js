// Simulacao de R/R mais largo contra candles REAIS (OHLC completo, nao
// so close) da TwelveData - responde: "com a mesma taxa de acerto real,
// um TP mais largo (SL igual) levaria a expectativa positiva?"
//
// Roda como workflow_dispatch avulso no GitHub Actions (tem rede livre
// e ja usa os secrets de producao) - nao faz parte do pipeline de
// analise/decisao, e so uma ferramenta de investigacao, executada uma
// vez, nao agendada.
//
// Estrategia pra caber no orcamento de API: busca 5000 candles de 5min
// por par (cobre ~17 dias, mais que suficiente pro periodo de interesse)
// - UMA chamada por par, 8 chamadas no total - em vez de uma chamada por
// operacao.

const admin = require("firebase-admin");
const axios = require("axios");
const { calcularValorPip, calcularExpectativa } = require("../scripts/moneyManager");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2, process.env.API_KEY_3];

const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY"];

// Cenarios: mantem o SL_USD original da operacao, varia o TP como
// multiplo do SL. 1.0x serve de prova de fidelidade (deve bater com o
// resultado real ja gravado).
const MULTIPLICADORES_TP = [1.0, 1.5, 2.0];

const MAX_CANDLES_SIMULACAO = 72; // 6h a 5min/candle - teto pra nao rodar pra sempre

// AJUSTE-003 (commit 8b4a918) forcou timezone=UTC na TwelveData -
// antes disso, js/checker.js fechava operacoes usando candle com
// offset de ~10h (bug de timezone), entao o "resultado real" gravado
// pra operacoes anteriores a este corte NAO E COMPARAVEL contra uma
// simulacao que busca o candle certo - a prova de fidelidade so faz
// sentido pra operacoes fechadas DEPOIS do fix. Confirmado por
// contagem direta: 103 das 142 operacoes ENCERRADAS (72,5%) sao de
// antes deste corte. A simulacao em si roda pra todas (o bug nao afeta
// os campos de ENTRADA usados aqui, so o fechamento antigo gravado) -
// so a comparacao de fidelidade e restrita ao subconjunto confiavel.
const CORTE_AJUSTE003 = new Date("2026-09-17T11:24:03Z").getTime();

async function buscarCandles(par, apiKey) {
    const url =
        `https://api.twelvedata.com/time_series` +
        `?symbol=${encodeURIComponent(par)}` +
        `&interval=5min` +
        `&outputsize=5000` +
        `&timezone=UTC` +
        `&apikey=${apiKey}`;

    const res = await axios.get(url, { timeout: 20000 });

    if (!res.data.values) {
        throw new Error(`Sem candles pra ${par}: ${JSON.stringify(res.data)}`);
    }

    // values vem mais-recente-primeiro; inverte pra cronologico.
    return res.data.values
        .map(c => ({
            timestamp: new Date(c.datetime.replace(" ", "T") + "Z").getTime(),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close)
        }))
        .reverse();
}

// Busca binaria simplificada: primeiro indice com timestamp >= alvo.
function indiceDesde(candles, alvo) {
    for (let i = 0; i < candles.length; i++) {
        if (candles[i].timestamp >= alvo) return i;
    }
    return -1;
}

// Mesma logica de calcularResultadoOperacao (MUD-03/AJUSTE-003)
// generalizada pra TP/SL arbitrarios, usando extremos intrabar
// (high/low reais). Replica os DOIS criterios reais de fechamento, na
// mesma ordem de prioridade de js/checker.js: financeiro primeiro
// (com desempate pessimista SL-primeiro se a mesma vela bate os dois),
// pips depois, como fallback - CORRECAO (23/09/2026): a 1a versao
// desta simulacao so verificava o criterio financeiro, mas SL_PIPS e o
// motivo de fechamento MAIS COMUM na producao real (24 SL_PIPS vs 7
// SL_FINANCEIRO na amostra de LOSS desde 17/09) - ignorar esse
// criterio derrubava a fidelidade da simulacao (so 25-64% de acerto
// contra o resultado real gravado). Corrigido antes de confiar em
// qualquer numero desta ferramenta.
function simular(direcao, precoEntrada, tpUSD, slUSD, tpPips, slPips, lote, par, cotacaoCruzada, candlesDesde) {

    let precoMaximo = precoEntrada;
    let precoMinimo = precoEntrada;
    let maxPipsFavor = 0;
    let maxPipsContra = 0;

    for (let i = 0; i < Math.min(candlesDesde.length, MAX_CANDLES_SIMULACAO); i++) {

        const candle = candlesDesde[i];
        precoMaximo = Math.max(precoMaximo, candle.high);
        precoMinimo = Math.min(precoMinimo, candle.low);

        const precoFavoravel = direcao === "BUY" ? precoMaximo : precoMinimo;
        const precoAdverso = direcao === "BUY" ? precoMinimo : precoMaximo;

        const pipsFavorAtual = calcularPips(par, precoEntrada, precoFavoravel, direcao === "BUY");
        const pipsContraAtual = calcularPips(par, precoEntrada, precoAdverso, direcao === "BUY");
        maxPipsFavor = Math.max(maxPipsFavor, pipsFavorAtual);
        maxPipsContra = Math.min(maxPipsContra, pipsContraAtual);

        const lucroFavoravel = pipsFavorAtual * calcularValorPip(lote, par, precoFavoravel, cotacaoCruzada);
        const lucroAdverso = pipsContraAtual * calcularValorPip(lote, par, precoAdverso, cotacaoCruzada);

        const tpFinAtingido = lucroFavoravel >= tpUSD;
        const slFinAtingido = lucroAdverso <= -Math.abs(slUSD);

        let motivo = null;

        if (tpFinAtingido && slFinAtingido) motivo = "LOSS";
        else if (tpFinAtingido) motivo = "WIN";
        else if (slFinAtingido) motivo = "LOSS";
        else if (maxPipsFavor >= tpPips) motivo = "WIN";
        else if (maxPipsContra <= -Math.abs(slPips)) motivo = "LOSS";

        if (motivo) return { resultado: motivo, candlesAteDecidir: i + 1 };

    }

    return { resultado: "NAO_DECIDIDO", candlesAteDecidir: null };
}

function calcularPips(par, entrada, preco, ehBuy) {
    const fator = par.includes("JPY") ? 100 : 10000;
    const bruto = (preco - entrada) * fator;
    return ehBuy ? bruto : -bruto;
}

async function main() {

    console.log("Buscando candles reais (5000/par, 5min, UTC)...\n");

    const candlesPorPar = {};
    for (let i = 0; i < PARES.length; i++) {
        const par = PARES[i];
        const apiKey = API_KEYS[i % API_KEYS.length];
        try {
            candlesPorPar[par] = await buscarCandles(par, apiKey);
            console.log(`${par}: ${candlesPorPar[par].length} candles, de ${new Date(candlesPorPar[par][0].timestamp).toISOString()} a ${new Date(candlesPorPar[par][candlesPorPar[par].length - 1].timestamp).toISOString()}`);
        } catch (erro) {
            console.log(`${par}: ERRO ao buscar candles - ${erro.message}`);
            candlesPorPar[par] = null;
        }
        // respeita rate limit (8/min no plano usado pra teste - aqui usamos
        // as chaves de producao, mas mantem o espacamento por seguranca)
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("\nBuscando operacoes ENCERRADAS no Firestore...\n");

    const snap = await db.collection("historico").where("status", "==", "ENCERRADA").get();
    const operacoes = [];
    snap.forEach(doc => {
        const d = doc.data();
        if (d.resultado !== "WIN" && d.resultado !== "LOSS") return;
        operacoes.push({ id: doc.id, ...d });
    });

    console.log(`${operacoes.length} operacoes ENCERRADAS (WIN/LOSS) encontradas.\n`);

    const resultadosPorPar = {};

    for (const op of operacoes) {

        const candles = candlesPorPar[op.par];
        if (!candles) continue;

        const inicio = Number(op.inicioOperacao);
        if (!inicio) continue;

        const idx = indiceDesde(candles, inicio);
        if (idx === -1) continue; // fora do range buscado

        const candlesDesde = candles.slice(idx);
        if (candlesDesde.length < 2) continue;

        const slUSD = Math.abs(Number(op.slUSD) || Number(op.financeiro?.slUSD) || 3);
        const slPipsOriginal = Math.abs(Number(op.financeiro?.slPips) || 50);
        const lote = Number(op.lote) || 0.02;
        const precoEntrada = Number(op.precoEntrada);

        let cotacaoCruzada;
        if (op.par === "EUR/JPY") {
            const usdJpyCandles = candlesPorPar["USD/JPY"];
            if (usdJpyCandles) {
                const idxCruzada = indiceDesde(usdJpyCandles, inicio);
                if (idxCruzada !== -1) cotacaoCruzada = usdJpyCandles[idxCruzada].close;
            }
        }

        if (!resultadosPorPar[op.par]) resultadosPorPar[op.par] = {};

        for (const mult of MULTIPLICADORES_TP) {
            const tpUSD = Number((slUSD * mult).toFixed(2));
            // TP em pips escalado pelo mesmo multiplicador do TP em $,
            // a partir do SL em pips original (SL fica fixo nos dois
            // formatos - so o TP alarga, nos dois formatos igualmente).
            const tpPips = Number((slPipsOriginal * mult).toFixed(2));
            const sim = simular(op.direcao, precoEntrada, tpUSD, slUSD, tpPips, slPipsOriginal, lote, op.par, cotacaoCruzada, candlesDesde);

            const chave = `TP=${mult}xSL`;
            if (!resultadosPorPar[op.par][chave]) {
                resultadosPorPar[op.par][chave] = { wins: 0, losses: 0, naoDecidido: 0, total: 0, fidelidade: { bateu: 0, naoBateu: 0, foraDoCorte: 0 } };
            }
            const r = resultadosPorPar[op.par][chave];
            r.total++;
            if (sim.resultado === "WIN") r.wins++;
            else if (sim.resultado === "LOSS") r.losses++;
            else r.naoDecidido++;

            // Prova de fidelidade: no cenario 1.0x (TP=SL, igual ao
            // combinado original na maioria dos casos), compara com o
            // resultado real ja gravado - SO pras operacoes fechadas
            // depois do AJUSTE-003 (ver comentario no topo do arquivo);
            // antes disso o "resultado real" nao e confiavel pra
            // comparar, entao nem entra na conta de bateu/naoBateu.
            if (mult === 1.0) {
                if (inicio < CORTE_AJUSTE003) {
                    r.fidelidade.foraDoCorte++;
                } else if (sim.resultado === op.resultado) {
                    r.fidelidade.bateu++;
                } else {
                    r.fidelidade.naoBateu++;
                }
            }
        }
    }

    console.log("\n=== RESULTADO DA SIMULACAO ===\n");

    for (const [par, cenarios] of Object.entries(resultadosPorPar)) {
        console.log(`--- ${par} ---`);
        for (const [chave, r] of Object.entries(cenarios)) {
            const decididos = r.wins + r.losses;
            const taxaAcerto = decididos > 0 ? (r.wins * 100 / decididos) : 0;
            const tpUSD = Number(chave.split("=")[1].replace("xSL", ""));
            // expectativa usa o slUSD medio $3 so pra referencia (o real varia por operacao, aqui e so leitura agregada)
            const expectativaAprox = calcularExpectativa(taxaAcerto, tpUSD * 3, 3);
            console.log(`  ${chave}: n=${r.total} (${decididos} decididos, ${r.naoDecidido} nao decidido em ${MAX_CANDLES_SIMULACAO} candles) | wins=${r.wins} losses=${r.losses} | taxa=${taxaAcerto.toFixed(1)}% | expectativa aprox=${expectativaAprox}`);
            if (chave === "TP=1xSL") {
                console.log(`    fidelidade vs resultado real gravado (so operacoes pos-AJUSTE-003, ${r.fidelidade.foraDoCorte} excluidas por serem de antes): ${r.fidelidade.bateu}/${r.fidelidade.bateu + r.fidelidade.naoBateu} bateram`);
            }
        }
    }

    process.exit(0);
}

main().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
