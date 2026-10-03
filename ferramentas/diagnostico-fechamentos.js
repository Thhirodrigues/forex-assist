// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do pipeline de
// análise/decisão do produto. Só dispara manualmente (workflow_dispatch). Não
// escreve nada no Firestore.
//
// AJUSTE-065 (03/10/2026): pedido do usuário - "vasculhe isso pra erros": (1) um
// stop do AUD/USD tocado às 18:05 BRT de SEXTA (21:05Z, depois do fechamento do
// forex na sexta, ~21:00Z no horário de verão dos EUA) e (2) um WIN de "11 dólares
// e pouco" com TP de 5. Para cada operação encerrada dos últimos N dias, mostra o
// documento e marca:
//   - FORA_MERCADO: o candle que fechou a operação está depois do fechamento da
//     sexta / antes da abertura de domingo;
//   - ALEM_DO_ALVO: |resultado| > 1,25x o alvo (TP ou SL em US$);
//   - SALDO: saldoDepois != saldoAntes + resultado;
//   - SINAL: WIN com resultado negativo ou LOSS com positivo.
// Para as marcadas (e o AUD/USD de 02/10) busca os candles de 5 min ao redor do
// fechamento na TwelveData (poucas chamadas) e imprime OHLC, pra ver se o candle
// que bateu o alvo é real.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const { getCandles } = require("../scripts/marketData");

const DIAS = Number(process.env.DIAS || 14);
const MAX_CONSULTAS_CANDLES = 6;

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function iso(ms) { const n = Number(ms); return Number.isFinite(n) ? new Date(n).toISOString().replace(".000Z", "Z") : String(ms); }
const DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function rotulo(ms) { const d = new Date(ms); return `${DIA[d.getUTCDay()]} ${iso(ms)}`; }

// Forex: fecha sexta ~21:00Z e reabre domingo ~21:00Z (horário de verão dos EUA; no
// inverno vira 22:00Z). Usa 21:00Z nos dois extremos, de propósito (conservador).
function foraDoMercado(ms) {
    const d = new Date(ms); const dia = d.getUTCDay(); const h = d.getUTCHours() + d.getUTCMinutes() / 60;
    if (dia === 6) return true;
    if (dia === 5 && h >= 21) return true;
    if (dia === 0 && h < 21) return true;
    return false;
}

async function main() {

    const desde = Date.now() - DIAS * 86400000;
    const snap = await db.collection("historico").where("resultado", "in", ["WIN", "LOSS"]).get();

    const ops = [];
    snap.forEach(doc => {
        const d = doc.data();
        const t = num(d.timestamp) ?? (d.timestamp && d.timestamp.toMillis ? d.timestamp.toMillis() : null);
        if (t && t >= desde) ops.push({ id: doc.id, d, t });
    });
    ops.sort((a, b) => a.t - b.t);

    console.log(`OPERAÇÕES ENCERRADAS NOS ÚLTIMOS ${DIAS} DIAS: ${ops.length} (só leitura)\n`);

    const marcadas = [];
    let anterior = null;

    for (const { id, d, t } of ops) {
        const fim = num(d.fimOperacao);
        const res = num(d.resultadoFinanceiro);
        const tp = num(d.tpUSD ?? d.financeiro?.tpUSD);
        const sl = num(d.slUSD ?? d.financeiro?.slUSD);
        const alvo = res == null ? null : (res >= 0 ? tp : sl);
        const razao = (res != null && alvo) ? res / alvo : null;
        const flags = [];

        if (fim && foraDoMercado(fim)) flags.push("FORA_MERCADO");
        if (razao != null && Math.abs(razao) > 1.25) flags.push("ALEM_DO_ALVO");
        const antes = num(d.saldoAntes), depois = num(d.saldoDepois);
        if (antes != null && depois != null && res != null && Math.abs(antes + res - depois) > 0.02) flags.push("SALDO");
        if (res != null && ((d.resultado === "WIN" && res < 0) || (d.resultado === "LOSS" && res > 0))) flags.push("SINAL");

        console.log(`${id}`);
        console.log(`  ${d.par} ${d.direcao} ${d.resultado} ${d.motivoEncerramento ?? ""} lote=${d.lote} tp=$${tp} sl=$${sl}  resultado=${res} (${razao == null ? "?" : razao.toFixed(2)}x do alvo)`);
        console.log(`  criado ${rotulo(t)} | fim ${fim ? rotulo(fim) : "?"} | entrada=${d.precoEntrada} fecho=${d.precoFechamento} máx=${d.precoMaximo} mín=${d.precoMinimo}`);
        console.log(`  pips: favor=${d.maxPipsFavor} contra=${d.maxPipsContra} | saldo ${antes} -> ${depois}${flags.length ? "  <<< " + flags.join(",") : ""}`);

        if (flags.length || id === "1790946637216_AUD_USD") marcadas.push({ id, d, fim, flags });
        anterior = depois ?? anterior;
    }

    console.log(`\n==== MARCADAS: ${marcadas.length} ====`);
    marcadas.forEach(m => console.log(`${m.id} ${m.d.par} ${m.d.resultado} resultado=${m.d.resultadoFinanceiro} [${m.flags.join(",") || "referência"}]`));

    // candles ao redor do fechamento das marcadas
    let consultas = 0;
    for (const m of marcadas) {
        if (!m.fim || consultas >= MAX_CONSULTAS_CANDLES) continue;
        consultas++;
        try {
            const idadeMin = Math.ceil((Date.now() - (m.fim - 3 * 3600000)) / 60000);
            const tamanho = Math.min(5000, Math.ceil(idadeMin / 5) + 5);
            const vals = await getCandles(m.d.par, "5min", tamanho);
            const janela = vals.filter(c => {
                const ts = Date.parse(c.datetime.replace(" ", "T") + "Z");
                return ts >= m.fim - 30 * 60000 && ts <= m.fim + 30 * 60000;
            });
            console.log(`\nCANDLES 5min de ${m.d.par} ao redor de ${rotulo(m.fim)} (${m.id}) - pedidos ${tamanho}, na janela ${janela.length}`);
            janela.forEach(c => {
                const ts = Date.parse(c.datetime.replace(" ", "T") + "Z");
                console.log(`  ${rotulo(ts)}  O=${c.open} H=${c.high} L=${c.low} C=${c.close}${foraDoMercado(ts) ? "  [fora do horário]" : ""}${ts === m.fim ? "  <== candle do fechamento" : ""}`);
            });
            if (!janela.length) console.log("  (nenhum candle nessa janela - fora do alcance retornado)");
        } catch (e) {
            console.log(`\nCANDLES de ${m.d.par}: erro ${e.message}`);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
