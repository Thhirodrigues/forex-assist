// ===================================================
// FOREX ASSIST - SINAL POR IA - EXECUÇÃO (GitHub Actions)
// IA_MODO = gerar | fechar | ambos      IA_MODELO = id do modelo (OBRIGATÓRIO: sem padrão, a escolha é do usuário)
// IA_DRY  = 1 (padrão: chama o modelo e mostra, NÃO grava sinal) | 0 (grava em `historico_ia`)
// IA_ORIGEM = PROGRAMADO | BOTAO | MANUAL_TESTE (só PROGRAMADO entra na avaliação)
// IA_MAX_CHAMADAS_DIA, IA_TETO_USD_MES: tetos (padrões em config.js)
// SÓ PARA TESTAR O CAMINHO DO SINAL sem esperar o modelo dizer COMPRAR/VENDER (valem apenas com IA_DRY=1 e IA_ORIGEM=MANUAL_TESTE; NÃO chamam o modelo, não gravam):
//   IA_FORCAR_DECISAO = COMPRAR:EUR/USD | VENDER:AUD/USD | SEM_SINAL     IA_MIN_PARES = mínimo de pares na janela (padrão em config.js)
// A chave (ANTHROPIC_API_KEY) NUNCA é impressa. Sem chave ou sem modelo: sai com explicação, sem chamar nada.
// ===================================================

const { gerarSinal } = require("./gerar");
const { fecharAbertos, numericos, ultimoFechado } = require("./fechar");

// cliente de TESTE: devolve a decisão pedida sem chamar o modelo (custo zero)
function clienteForcado(texto) {
    const [dec, par = ""] = texto.split(":");
    const saida = { decisao: dec.toUpperCase(), par, confianca: 50, motivo: "decisão FORÇADA para testar o caminho do sinal (sem chamada ao modelo)" };
    return { messages: { create: async () => ({ content: [{ type: "text", text: JSON.stringify(saida) }], stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 0 } }) } };
}

async function principal() {
    const modo = process.env.IA_MODO || "ambos";
    const modelo = (process.env.IA_MODELO || "").trim();
    const dry = process.env.IA_DRY !== "0";
    const origem = process.env.IA_ORIGEM || "MANUAL_TESTE";
    const quer = (m) => modo === m || modo === "ambos";
    const forcada = (process.env.IA_FORCAR_DECISAO || "").trim();
    const minParesEnv = process.env.IA_MIN_PARES ? Number(process.env.IA_MIN_PARES) : undefined;
    if ((forcada || minParesEnv !== undefined) && !(dry && origem === "MANUAL_TESTE")) {
        throw new Error("IA_FORCAR_DECISAO e IA_MIN_PARES só valem com IA_DRY=1 e IA_ORIGEM=MANUAL_TESTE (são ferramentas de teste, nunca de avaliação).");
    }

    if (quer("gerar")) {
        if (!modelo) throw new Error("IA_MODELO não definido: escolha o modelo no workflow (sem padrão de propósito: é decisão de custo do usuário).");
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY ausente: crie o secret no GitHub (Settings > Secrets and variables > Actions).");
    }

    const admin = require("firebase-admin");
    const ofic = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }, "oficial").firestore();
    ofic.settings({ ignoreUndefinedProperties: true });
    const { configurarMarketData, getCandles } = require("../marketData");
    if (typeof configurarMarketData === "function") configurarMarketData({});

    const maxDia = process.env.IA_MAX_CHAMADAS_DIA ? Number(process.env.IA_MAX_CHAMADAS_DIA) : undefined;
    const tetoMes = process.env.IA_TETO_USD_MES ? Number(process.env.IA_TETO_USD_MES) : undefined;
    console.log(`Sinal por IA | modo ${modo} | modelo ${modelo || "-"} | origem ${origem} | ${dry ? "DRY RUN (não grava sinal)" : "GRAVANDO em historico_ia"}`);

    if (quer("fechar")) {
        const r = await fecharAbertos({ ofic, getCandles, dry });
        console.log("Fechamento:", JSON.stringify(r));
    }
    if (quer("gerar")) {
        const Sdk = require("@anthropic-ai/sdk");
        const Anthropic = Sdk.default || Sdk;
        const client = forcada ? clienteForcado(forcada) : new Anthropic();   // lê ANTHROPIC_API_KEY do ambiente
        const getPreco = async (par) => {
            const u = ultimoFechado(numericos(await getCandles(par, "5min", 4)), Date.now());   // 4 candles: o último pode estar em formação
            if (!u) throw new Error("nenhum candle fechado");
            return u;
        };
        const r = await gerarSinal({ ofic, client, modelo, dry, origem, getPreco, maxDia, tetoMes, minPares: minParesEnv });
        console.log(`Resultado: ${r.status}${r.motivo ? " - " + r.motivo : ""}`);
        if (r.doc) console.log(JSON.stringify({ decisao: r.doc.decisao, par: r.doc.par, direcao: r.doc.direcao, confianca: r.doc.confianca, motivo: r.doc.motivo, precoEntrada: r.doc.precoEntrada, tpPips: r.doc.tpPips, slPips: r.doc.slPips, lote: r.doc.lote, custoEstimadoUSD: r.doc.custoEstimadoUSD }));
        if (r.status === "ERRO" || r.status === "INCOMPLETO") process.exitCode = 1;
    }
}

if (require.main === module) principal().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });

module.exports = { principal, clienteForcado };
