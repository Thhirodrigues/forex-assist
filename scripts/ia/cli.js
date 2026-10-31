// ===================================================
// FOREX ASSIST - SINAL POR IA - EXECUÇÃO (GitHub Actions)
// IA_MODO = gerar | fechar | ambos      IA_MODELO = id do modelo (OBRIGATÓRIO: sem padrão, a escolha é do usuário)
// IA_DRY  = 1 (padrão: chama o modelo e mostra, NÃO grava sinal) | 0 (grava em `historico_ia`)
// IA_ORIGEM = PROGRAMADO | BOTAO | MANUAL_TESTE (só PROGRAMADO entra na avaliação)
// IA_MAX_CHAMADAS_DIA, IA_TETO_USD_MES: tetos (padrões em config.js)
// A chave (ANTHROPIC_API_KEY) NUNCA é impressa. Sem chave ou sem modelo: sai com explicação, sem chamar nada.
// ===================================================

const { gerarSinal } = require("./gerar");
const { fecharAbertos } = require("./fechar");

async function principal() {
    const modo = process.env.IA_MODO || "ambos";
    const modelo = (process.env.IA_MODELO || "").trim();
    const dry = process.env.IA_DRY !== "0";
    const origem = process.env.IA_ORIGEM || "MANUAL_TESTE";
    const quer = (m) => modo === m || modo === "ambos";

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
        const client = new Anthropic();   // lê ANTHROPIC_API_KEY do ambiente
        const getPreco = async (par) => {
            const cs = await getCandles(par, "5min", 2);
            const u = cs[cs.length - 1];
            return { preco: Number(u.close), t: new Date(String(u.datetime).replace(" ", "T") + "Z").getTime() + 5 * 60000 };
        };
        const r = await gerarSinal({ ofic, client, modelo, dry, origem, getPreco, maxDia, tetoMes });
        console.log(`Resultado: ${r.status}${r.motivo ? " - " + r.motivo : ""}`);
        if (r.doc) console.log(JSON.stringify({ decisao: r.doc.decisao, par: r.doc.par, direcao: r.doc.direcao, confianca: r.doc.confianca, motivo: r.doc.motivo, precoEntrada: r.doc.precoEntrada, tpPips: r.doc.tpPips, slPips: r.doc.slPips, lote: r.doc.lote, custoEstimadoUSD: r.doc.custoEstimadoUSD }));
        if (r.status === "ERRO" || r.status === "INCOMPLETO") process.exitCode = 1;
    }
}

if (require.main === module) principal().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });

module.exports = { principal };
