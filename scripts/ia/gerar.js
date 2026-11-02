// ===================================================
// FOREX ASSIST - SINAL POR IA - GERAÇÃO (pré-registro 6.38)
//
// Lê as últimas análises do scanner (SOMENTE LEITURA em `analises`), pergunta ao modelo e grava em `historico_ia`
// (coleção SEPARADA: nunca em `historico`, para não contaminar o aprendizado do app nem a contagem oficial).
// Sinal sem TP/SL/lote/preço completos NÃO é gravado como sinal (RMI: sinal incompleto é pior que nenhum).
// Dependências injetadas (Firestore, cliente do modelo, preço atual): testável sem rede e sem chave.
// ===================================================

const CFG = require("./config");
const { ultimasPorPar, montarEntrada, hashDe } = require("./entrada");
const { SISTEMA, mensagemUsuario, SCHEMA_SAIDA, validarSaida } = require("./prompt");
const { custoUSD, podeChamar, registrarUso } = require("./orcamento");
const { spreadDoPar } = require("../../lab/spreads");

const estimarTokens = (texto) => Math.ceil(texto.length / 3);   // estimativa grosseira (português/JSON), só para o teto

async function lerAnalises(ofic, agora) {
    const snap = await ofic.collection("analises").where("timestamp", ">", agora - CFG.FRESCOR_ANALISE_MIN * 60000).orderBy("timestamp").get();
    const lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    return lista;
}

// resumo de mercado por par (documento único `scanner/mercado`); falha ou dado velho = sem resumo (a análise segue valendo)
async function lerMercado(ofic, agora) {
    try {
        const snap = await ofic.collection("scanner").doc("mercado").get();
        if (!snap.exists) return {};
        const d = snap.data();
        if (!(agora - Number(d.atualizadoEm) <= CFG.FRESCOR_MERCADO_MIN * 60000)) return {};
        return d.pares || {};
    } catch (e) { return {}; }
}

function lerTextoJSON(resposta) {
    const bloco = (resposta.content || []).find(b => b.type === "text");
    if (!bloco) return { erro: "resposta sem bloco de texto" };
    try { return { valor: JSON.parse(bloco.text) }; } catch (e) { return { erro: "JSON inválido na resposta" }; }
}

/**
 * @returns {Promise<{status:string, motivo?:string, doc?:object}>}
 *   status: "SINAL" | "SEM_SINAL" | "BLOQUEADO" | "DADOS_VELHOS" | "ERRO" | "INCOMPLETO" | "RECUSA"
 */
async function gerarSinal({ ofic, client, modelo, agora = Date.now(), origem = "PROGRAMADO", dry = true, getPreco, log = console.log, maxDia, tetoMes }) {
    if (!modelo) return { status: "ERRO", motivo: "modelo não definido (IA_MODELO)" };

    const analises = await lerAnalises(ofic, agora);
    const porPar = ultimasPorPar(analises, agora, CFG.FRESCOR_ANALISE_MIN);
    const pares = Object.keys(porPar);
    if (pares.length < CFG.MIN_PARES_FRESCOS) return { status: "DADOS_VELHOS", motivo: `só ${pares.length} par(es) com análise nas últimas ${CFG.FRESCOR_ANALISE_MIN / 60} h (mínimo ${CFG.MIN_PARES_FRESCOS})` };

    const mercado = await lerMercado(ofic, agora);
    const entrada = montarEntrada(porPar, agora, mercado);
    const entradaHash = hashDe(entrada);
    const usuario = mensagemUsuario(entrada, new Date(agora).toISOString());

    const ctrlRef = ofic.collection("ia_controle").doc("uso");
    const teto = await podeChamar({ ref: ctrlRef, agora, modelo, tokensEntradaEstimados: estimarTokens(SISTEMA + usuario), maxDia, tetoMes });
    if (!teto.ok) { log(`IA bloqueada pelo teto: ${teto.motivo}`); return { status: "BLOQUEADO", motivo: teto.motivo }; }

    let resposta;
    try {
        resposta = await client.messages.create({
            model: modelo,
            max_tokens: CFG.MAX_TOKENS,
            system: SISTEMA,
            messages: [{ role: "user", content: usuario }],
            output_config: { effort: CFG.ESFORCO, format: { type: "json_schema", schema: SCHEMA_SAIDA } }
        });
    } catch (e) {
        return { status: "ERRO", motivo: `chamada ao modelo falhou: ${e.status ? "HTTP " + e.status + " " : ""}${String(e.message).slice(0, 200)}` };
    }

    const usd = custoUSD(modelo, resposta.usage);
    await registrarUso({ ref: ctrlRef, agora, usd });   // o gasto conta mesmo em dry run (a chamada custou)
    log(`Modelo ${modelo}: ${resposta.usage?.input_tokens} tokens de entrada, ${resposta.usage?.output_tokens} de saída, ~US$ ${usd.toFixed(5)}`);

    const base = {
        origem, modelo, promptVersao: CFG.PROMPT_VERSAO, entradaHash, entrada, criadoEm: agora,
        uso: { entrada: resposta.usage?.input_tokens ?? null, saida: resposta.usage?.output_tokens ?? null }, custoEstimadoUSD: usd
    };

    if (resposta.stop_reason === "refusal") return { status: "RECUSA", doc: { ...base, decisao: "RECUSA", status: "SEM_SINAL", id: `${agora}_IA_RECUSA` } };
    if (resposta.stop_reason === "max_tokens") return { status: "ERRO", motivo: "resposta cortada (max_tokens)", doc: null };

    const lido = lerTextoJSON(resposta);
    if (lido.erro) return { status: "ERRO", motivo: lido.erro };
    const val = validarSaida(lido.valor, pares);
    if (!val.ok) return { status: "ERRO", motivo: `saída inválida: ${val.erro}` };

    const { decisao, par, confianca, motivo } = val.valor;
    if (decisao === "SEM_SINAL") {
        const doc = { ...base, id: `${agora}_IA_SEM_SINAL`, decisao, status: "SEM_SINAL", confianca, motivo };
        if (!dry) await ofic.collection("historico_ia").doc(doc.id).set(doc);
        return { status: "SEM_SINAL", doc };
    }

    const a = porPar[par];
    const direcao = decisao === "COMPRAR" ? "BUY" : "SELL";
    const tp = Math.abs(Number(a.tpPips)), sl = Math.abs(Number(a.slPips)), lote = Number(a.lote);
    if (!(tp > 0) || !(sl > 0) || !(lote > 0)) return { status: "INCOMPLETO", motivo: `análise de ${par} sem TP/SL/lote: sinal NÃO gravado` };

    let preco;
    try { preco = await getPreco(par); } catch (e) { return { status: "ERRO", motivo: `sem preço atual de ${par}: ${String(e.message).slice(0, 120)}` }; }
    if (!(Number(preco?.preco) > 0) || !(Number(preco?.t) > 0)) return { status: "INCOMPLETO", motivo: `preço atual de ${par} inválido: sinal NÃO gravado` };

    const doc = {
        ...base, id: `${agora}_IA_${par.replace("/", "_")}`, status: "ABERTA", decisao, par, direcao, confianca, motivo,
        precoEntrada: Number(preco.preco), tEntrada: Number(preco.t), tpPips: tp, slPips: sl, lote, spreadPips: spreadDoPar(par),
        origemAnalise: { id: a.id, timestamp: a.timestamp, precoAnalise: a.precoEntrada, direcaoDoApp: a.aprovado === true ? a.direcao : null }
    };
    if (!dry) await ofic.collection("historico_ia").doc(doc.id).set(doc);
    return { status: "SINAL", doc };
}

module.exports = { gerarSinal, lerAnalises, estimarTokens };
