// Testes do sinal por IA (pré-registro 6.38): entrada, validação, teto de gasto, geração, fechamento e guardas do CLI.
const assert = require("assert");
const { ultimasPorPar, montarEntrada, hashDe } = require("./entrada");
const { validarSaida } = require("./prompt");
const { custoUSD, podeChamar, registrarUso } = require("./orcamento");
const { gerarSinal } = require("./gerar");
const { fecharAbertos, resolver, numericos, ultimoFechado } = require("./fechar");

// ---- Firestore falso mínimo ----
function fakeDb(inicial = {}) {
    const dados = JSON.parse(JSON.stringify(inicial));
    const col = (nome) => {
        dados[nome] = dados[nome] || {};
        const consulta = (filtros) => ({
            where: (campo, op, v) => consulta([...filtros, [campo, op, v]]),
            orderBy: () => consulta(filtros),
            get: async () => {
                const docs = Object.entries(dados[nome]).filter(([, d]) => filtros.every(([c, op, v]) => (op === ">" ? d[c] > v : op === "==" ? d[c] === v : true)));
                return { forEach: (f) => docs.forEach(([id, d]) => f({ id, data: () => d })) };
            }
        });
        return {
            ...consulta([]),
            doc: (id) => ({
                get: async () => ({ exists: id in dados[nome], data: () => dados[nome][id] }),
                set: async (v) => { dados[nome][id] = JSON.parse(JSON.stringify(v)); },
                update: async (v) => { dados[nome][id] = { ...dados[nome][id], ...JSON.parse(JSON.stringify(v)) }; }
            })
        };
    };
    return { collection: col, dados };
}

const AGORA = Date.UTC(2026, 10, 2, 14, 0);   // seg 02/11/2026 14:00 UTC
const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF"];
const analise = (par, min, extra = {}) => ({
    par, timestamp: AGORA - min * 60000, precoEntrada: par.includes("JPY") ? 150.5 : 1.1, tendencia: "ALTA", score: 42,
    indicadores: { rsi: 55.123, adx: 28.4, atr: 0.0008 }, aprovado: true, direcao: "BUY", tpPips: 25, slPips: 25, lote: 0.02, ...extra
});
const dbCom = (lista) => fakeDb({ analises: Object.fromEntries(lista.map((a, i) => ["a" + i, a])) });
const clienteQue = (saida, extra = {}) => ({
    calls: 0,
    messages: { create: async function () { this.calls++; return { content: [{ type: "text", text: JSON.stringify(saida) }], stop_reason: "end_turn", usage: { input_tokens: 3000, output_tokens: 600 }, ...extra }; } }
});
// o `this` do create precisa ser o cliente: reata
function cliente(saida, extra) { const c = clienteQue(saida, extra); const f = c.messages.create; c.messages.create = (...a) => f.apply(c, a); return c; }
const getPreco = async () => ({ preco: 1.1002, t: AGORA + 60000 });

(async () => {
    // 1) entrada: janela de frescor, última por par, ordem, hash estável
    {
        const lista = [analise("EUR/USD", 50), analise("EUR/USD", 20), analise("EUR/USD", 5), analise("GBP/USD", 10), analise("USD/JPY", 100), analise("AUD/USD", -5)];
        const por = ultimasPorPar(lista, AGORA, 45);   // (a janela real de produção é de 240 min; aqui testa-se o corte)
        assert.deepStrictEqual(Object.keys(por).sort(), ["EUR/USD", "GBP/USD"], "velhas (>45 min) e do futuro ficam de fora");
        assert.strictEqual(por["EUR/USD"].timestamp, AGORA - 5 * 60000, "a mais recente do par");
        const e = montarEntrada(por, AGORA, { EUR_USD: { preco: 1.1234, v1h: 0.0456, v24h: null, ate: AGORA - 600000 } });
        assert.strictEqual(e[0].precoAgora, 1.1234); assert.strictEqual(e[0].v1hPct, 0.046); assert.strictEqual(e[0].v24hPct, null); assert.strictEqual(e[0].mercadoMinutosAtras, 10);
        assert.strictEqual(e[1].precoAgora, undefined, "par sem resumo de mercado segue só com a análise");
        assert.strictEqual(montarEntrada({ "EUR/USD": analise("EUR/USD", 5, { indicadores: { rsi: null } }) }, AGORA)[0].rsi, null, "dado ausente NÃO vira 0");
        assert.strictEqual(e[0].par, "EUR/USD"); assert.strictEqual(e[0].minutosAtras, 5); assert.strictEqual(e[0].rsi, 55.1); assert.strictEqual(e[0].direcaoDoApp, "BUY");
        assert.strictEqual(hashDe(e), hashDe(JSON.parse(JSON.stringify(e))));
    }
    // 2) validação da saída
    {
        assert.strictEqual(validarSaida({ decisao: "COMPRAR", par: "EUR/USD", confianca: 70, motivo: "x" }, PARES).ok, true);
        assert.strictEqual(validarSaida({ decisao: "COMPRAR", par: "XXX/YYY", confianca: 70, motivo: "x" }, PARES).ok, false);
        assert.strictEqual(validarSaida({ decisao: "TALVEZ", par: "EUR/USD", confianca: 70, motivo: "x" }, PARES).ok, false);
        assert.strictEqual(validarSaida({ decisao: "VENDER", par: "EUR/USD", confianca: 170, motivo: "x" }, PARES).ok, false);
        const sem = validarSaida({ decisao: "SEM_SINAL", par: "qualquer", confianca: 10, motivo: "a".repeat(500) }, PARES);
        assert.ok(sem.ok && sem.valor.par === null && sem.valor.motivo.length === 300);
    }
    // 3) custo e teto
    {
        assert.ok(Math.abs(custoUSD("claude-haiku-5-5", { input_tokens: 1e6, output_tokens: 1e6 }) - 0.6) < 1e-9);
        assert.ok(custoUSD("modelo-desconhecido", { input_tokens: 1e6, output_tokens: 0 }) >= 10, "modelo fora da tabela = preço mais caro");
        const db = fakeDb(); const ref = db.collection("ia_controle").doc("uso");
        assert.strictEqual((await podeChamar({ ref, agora: AGORA, modelo: "claude-haiku-5-5", tokensEntradaEstimados: 3000, maxDia: 2, tetoMes: 1 })).ok, true);
        await registrarUso({ ref, agora: AGORA, usd: 0.4 }); await registrarUso({ ref, agora: AGORA, usd: 0.55 });
        const b1 = await podeChamar({ ref, agora: AGORA, modelo: "claude-haiku-5-5", tokensEntradaEstimados: 3000, maxDia: 2, tetoMes: 1 });
        assert.ok(!b1.ok && /chamadas do dia/.test(b1.motivo));
        const b2 = await podeChamar({ ref, agora: AGORA + 86400000, modelo: "claude-opus-5-5", tokensEntradaEstimados: 3000, maxDia: 2, tetoMes: 1 });
        assert.ok(!b2.ok && /gasto do mês/.test(b2.motivo), "dia novo, mas o mês estoura com o pior caso do modelo caro");
        const ok3 = await podeChamar({ ref, agora: AGORA + 86400000, modelo: "claude-haiku-5-5", tokensEntradaEstimados: 3000, maxDia: 2, tetoMes: 1 });
        assert.ok(ok3.ok, "modelo barato cabe no mesmo mês");
    }
    // 4) geração
    {
        const todas = PARES.map((p, i) => analise(p, 5 + i));
        const mercadoOk = { atualizadoEm: AGORA - 60000, pares: { EUR_USD: { preco: 1.1003, v1h: 0.02, v24h: null, ate: AGORA - 300000 } } };
        // dados velhos
        let db = dbCom([analise("EUR/USD", 5), analise("GBP/USD", 5)]);
        let r = await gerarSinal({ ofic: db, client: cliente({}), modelo: "claude-haiku-5-5", agora: AGORA, getPreco, log: () => {} });
        assert.strictEqual(r.status, "DADOS_VELHOS");
        // sem modelo
        r = await gerarSinal({ ofic: dbCom(todas), client: cliente({}), modelo: "", agora: AGORA, getPreco, log: () => {} });
        assert.strictEqual(r.status, "ERRO");
        // sinal válido, gravando
        db = dbCom(todas); let cl = cliente({ decisao: "COMPRAR", par: "EUR/USD", confianca: 66, motivo: "tendência de alta, ADX 28" });
        r = await gerarSinal({ ofic: db, client: cl, modelo: "claude-haiku-5-5", agora: AGORA, dry: false, origem: "PROGRAMADO", getPreco, log: () => {} });
        assert.strictEqual(r.status, "SINAL"); assert.strictEqual(cl.calls, 1);
        const salvo = db.dados.historico_ia[r.doc.id];
        assert.ok(salvo && salvo.direcao === "BUY" && salvo.tpPips === 25 && salvo.slPips === 25 && salvo.lote === 0.02 && salvo.precoEntrada === 1.1002 && salvo.spreadPips > 0 && salvo.origem === "PROGRAMADO" && salvo.status === "ABERTA");
        assert.ok(salvo.promptVersao && salvo.modelo === "claude-haiku-5-5" && salvo.entradaHash && salvo.uso.entrada === 3000);
        assert.ok(!db.dados.historico, "NUNCA grava em `historico`");
        assert.ok(db.dados.ia_controle.uso.dias["2026-11-02"].chamadas === 1, "uso registrado");
        // resumo de mercado entra na entrada gravada quando está fresco; velho (> 30 min) é ignorado
        db = dbCom(todas); db.dados.scanner = { mercado: { atualizadoEm: AGORA - 60000, pares: { EUR_USD: { preco: 1.1003, v1h: 0.02, v24h: null, ate: AGORA - 300000 } } } };
        r = await gerarSinal({ ofic: db, client: cliente({ decisao: "SEM_SINAL", par: "", confianca: 20, motivo: "x" }), modelo: "claude-haiku-5-5", agora: AGORA, dry: false, getPreco, log: () => {} });
        assert.strictEqual(db.dados.historico_ia[r.doc.id].entrada.find(e => e.par === "EUR/USD").precoAgora, 1.1003);
        db = dbCom(todas); db.dados.scanner = { mercado: { atualizadoEm: AGORA - 40 * 60000, pares: { EUR_USD: { preco: 1.1003, v1h: 0.02, v24h: null, ate: AGORA } } } };
        r = await gerarSinal({ ofic: db, client: cliente({ decisao: "SEM_SINAL", par: "", confianca: 20, motivo: "x" }), modelo: "claude-haiku-5-5", agora: AGORA, dry: false, getPreco, log: () => {} });
        assert.strictEqual(db.dados.historico_ia[r.doc.id].entrada.find(e => e.par === "EUR/USD").precoAgora, undefined, "resumo velho ignorado");
        // dry run: não grava o sinal, mas conta o gasto
        db = dbCom(todas); cl = cliente({ decisao: "VENDER", par: "GBP/USD", confianca: 55, motivo: "x" });
        r = await gerarSinal({ ofic: db, client: cl, modelo: "claude-haiku-5-5", agora: AGORA, dry: true, getPreco, log: () => {} });
        assert.strictEqual(r.status, "SINAL"); assert.ok(!db.dados.historico_ia || Object.keys(db.dados.historico_ia).length === 0);
        assert.strictEqual(db.dados.ia_controle.uso.dias["2026-11-02"].chamadas, 1);
        // SEM_SINAL gravado
        db = dbCom(todas);
        r = await gerarSinal({ ofic: db, client: cliente({ decisao: "SEM_SINAL", par: "", confianca: 30, motivo: "conflito" }), modelo: "claude-haiku-5-5", agora: AGORA, dry: false, getPreco, log: () => {} });
        assert.strictEqual(r.status, "SEM_SINAL"); assert.strictEqual(db.dados.historico_ia[r.doc.id].status, "SEM_SINAL");
        // análise sem TP/SL: NÃO grava (RMI)
        db = dbCom(todas.map(a => (a.par === "EUR/USD" ? { ...a, tpPips: undefined } : a)));
        r = await gerarSinal({ ofic: db, client: cliente({ decisao: "COMPRAR", par: "EUR/USD", confianca: 60, motivo: "x" }), modelo: "claude-haiku-5-5", agora: AGORA, dry: false, getPreco, log: () => {} });
        assert.strictEqual(r.status, "INCOMPLETO"); assert.ok(!db.dados.historico_ia || Object.keys(db.dados.historico_ia).length === 0);
        // par fora da lista oferecida
        r = await gerarSinal({ ofic: dbCom(todas), client: cliente({ decisao: "COMPRAR", par: "EUR/NOK", confianca: 60, motivo: "x" }), modelo: "claude-haiku-5-5", agora: AGORA, dry: false, getPreco, log: () => {} });
        assert.strictEqual(r.status, "ERRO");
        // recusa e corte
        r = await gerarSinal({ ofic: dbCom(todas), client: cliente({}, { stop_reason: "refusal" }), modelo: "claude-haiku-5-5", agora: AGORA, getPreco, log: () => {} });
        assert.strictEqual(r.status, "RECUSA");
        r = await gerarSinal({ ofic: dbCom(todas), client: cliente({}, { stop_reason: "max_tokens" }), modelo: "claude-haiku-5-5", agora: AGORA, getPreco, log: () => {} });
        assert.strictEqual(r.status, "ERRO");
        // erro de API não vaza nada e devolve ERRO
        const quebrado = { messages: { create: async () => { const e = new Error("chave inválida sk-ant-SEGREDO"); e.status = 401; throw e; } } };
        r = await gerarSinal({ ofic: dbCom(todas), client: quebrado, modelo: "claude-haiku-5-5", agora: AGORA, getPreco, log: () => {} });
        assert.strictEqual(r.status, "ERRO"); assert.ok(/401/.test(r.motivo));
        // teto: 2ª chamada no mesmo dia com maxDia=1 é barrada SEM chamar o modelo
        db = dbCom(todas); cl = cliente({ decisao: "SEM_SINAL", par: "", confianca: 10, motivo: "x" });
        await gerarSinal({ ofic: db, client: cl, modelo: "claude-haiku-5-5", agora: AGORA, dry: false, getPreco, maxDia: 1, log: () => {} });
        r = await gerarSinal({ ofic: db, client: cl, modelo: "claude-haiku-5-5", agora: AGORA + 60000, dry: false, getPreco, maxDia: 1, log: () => {} });
        assert.strictEqual(r.status, "BLOQUEADO"); assert.strictEqual(cl.calls, 1);
    }
    // 5) fechamento
    {
        const T0 = Date.UTC(2026, 10, 2, 14, 0);
        const mk = (id, par, direcao, preco, extra = {}) => ({ id, par, direcao, precoEntrada: preco, tEntrada: T0, tpPips: 10, slPips: 10, spreadPips: 1.8, status: "ABERTA", ...extra });
        const dt = (i) => new Date(T0 + i * 300000).toISOString().replace("T", " ").slice(0, 19);
        const cand = (i, o, h, l, c) => ({ datetime: dt(i), open: String(o), high: String(h), low: String(l), close: String(c) });
        const plano = Array.from({ length: 6 }, (_, i) => cand(i, 1.1, 1.10002, 1.09998, 1.1));
        const comTP = [...plano]; comTP[2] = cand(2, 1.1, 1.1013, 1.0999, 1.1012);    // +13 pips: bate TP (10 + spread 1.8)
        const db = fakeDb({ historico_ia: {
            tp: mk("tp", "EUR/USD", "BUY", 1.1),
            aberta: mk("aberta", "GBP/USD", "BUY", 1.1),
            velha: mk("velha", "AUD/USD", "BUY", 1.1, { tEntrada: T0 - 12 * 86400000 })
        } });
        const getCandles = async (par) => (par === "EUR/USD" ? comTP : plano);
        const r = await fecharAbertos({ ofic: db, getCandles, agora: T0 + 3600000, dry: false, esperar: async () => {}, log: () => {} });
        assert.strictEqual(r.fechados, 1); assert.strictEqual(r.expirados, 1);
        const f = db.dados.historico_ia.tp;
        assert.strictEqual(f.status, "ENCERRADA"); assert.strictEqual(f.resultadoApp, "WIN"); assert.strictEqual(f.pipsApp, 10); assert.strictEqual(f.resultado, "WIN"); assert.strictEqual(f.pips, 10);
        assert.ok(f.controle && ["WIN", "LOSS"].includes(f.controle.resultado), "controle ALEATORIO gravado");
        assert.strictEqual(db.dados.historico_ia.aberta.status, "ABERTA", "sem toque: segue aberta");
        assert.strictEqual(db.dados.historico_ia.velha.status, "EXPIRADA");
        // controle é determinístico (mesmo id -> mesma direção)
        const rr1 = resolver(mk("tp", "EUR/USD", "BUY", 1.1), require("./fechar").numericos(comTP)), rr2 = resolver(mk("tp", "EUR/USD", "BUY", 1.1), require("./fechar").numericos(comTP));
        assert.deepStrictEqual(rr1.controle, rr2.controle);
        // dry run não escreve
        const db2 = fakeDb({ historico_ia: { tp: mk("tp", "EUR/USD", "BUY", 1.1) } });
        await fecharAbertos({ ofic: db2, getCandles, agora: T0 + 3600000, dry: true, esperar: async () => {}, log: () => {} });
        assert.strictEqual(db2.dados.historico_ia.tp.status, "ABERTA");
    }
    // 5b) preço de entrada: só candle JÁ FECHADO (o em formação é ignorado)
    {
        const T = Date.UTC(2026, 10, 2, 14, 0);
        const dt = (ms) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);
        const cs = numericos([0, 1, 2].map(i => ({ datetime: dt(T + i * 300000), open: "1", high: "1", low: "1", close: String(1 + i / 100) })));
        let u = ultimoFechado(cs, T + 2 * 300000 + 60000);   // o candle das 14:10 ainda está em formação (14:11)
        assert.strictEqual(u.preco, 1.01); assert.strictEqual(u.t, T + 2 * 300000);
        u = ultimoFechado(cs, T + 3 * 300000);                // às 14:15 o das 14:10 fechou
        assert.strictEqual(u.preco, 1.02); assert.strictEqual(u.t, T + 3 * 300000);
        assert.strictEqual(ultimoFechado(cs, T + 100000), null);
    }
    // 5c) minPares injetável (teste) e cliente forçado do CLI
    {
        const dois = [analise("AUD/USD", 5), analise("EUR/JPY", 5)];
        let r = await gerarSinal({ ofic: dbCom(dois), client: cliente({}), modelo: "claude-haiku-5-5", agora: AGORA, getPreco, log: () => {} });
        assert.strictEqual(r.status, "DADOS_VELHOS");
        const { clienteForcado } = require("./cli");
        r = await gerarSinal({ ofic: dbCom(dois), client: clienteForcado("VENDER:AUD/USD"), modelo: "claude-haiku-5-5", agora: AGORA, dry: true, getPreco, minPares: 2, log: () => {} });
        assert.strictEqual(r.status, "SINAL"); assert.strictEqual(r.doc.direcao, "SELL"); assert.strictEqual(r.doc.par, "AUD/USD"); assert.strictEqual(r.doc.custoEstimadoUSD, 0);
    }
    // 6) guardas do CLI: sem modelo ou sem chave, para ANTES de qualquer chamada
    {
        const { principal } = require("./cli");
        const salva = { ...process.env };
        try {
            process.env.IA_MODO = "gerar"; delete process.env.IA_MODELO; process.env.ANTHROPIC_API_KEY = "x";
            await assert.rejects(principal(), /IA_MODELO não definido/);
            process.env.IA_MODELO = "claude-haiku-5-5"; delete process.env.ANTHROPIC_API_KEY;
            await assert.rejects(principal(), /ANTHROPIC_API_KEY ausente/);
            process.env.ANTHROPIC_API_KEY = "x"; process.env.IA_DRY = "0"; process.env.IA_ORIGEM = "PROGRAMADO"; process.env.IA_FORCAR_DECISAO = "COMPRAR:EUR/USD";
            await assert.rejects(principal(), /só valem com IA_DRY=1/);   // decisão forçada NUNCA em avaliação nem gravando
        } finally { process.env = salva; }
    }
    console.log("TODOS OS TESTES DO SINAL POR IA PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
