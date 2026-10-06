const assert = require("assert");
const { resumirCandles15, atualizarResumoMercado, PARES_PADRAO } = require("./mercadoResumo");
let n = 0;
const t = (nome, fn) => Promise.resolve().then(fn).then(() => { n++; console.log("[OK] " + nome); });

// terça 06/10/2026 20:00Z como "agora" (mercado aberto)
const AGORA = Date.UTC(2026, 9, 6, 20, 0);
const dt = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
// N candles de 15 min terminando no último fechado antes de `fim`, preço sobe linearmente de p0 a p1
const candles = (N, p0, p1, fim = AGORA) => Array.from({ length: N }, (_, i) => ({ datetime: dt(fim - (N - i) * 15 * 60000), close: String(p0 + (p1 - p0) * i / (N - 1)) }));

const fakeDb = (docs = {}) => {
    const gravados = {};
    return { gravados, collection: (col) => ({ doc: (id) => ({
        async get() { const d = (docs[col] || {})[id]; return { exists: !!d, data: () => d }; },
        async set(v) { gravados[`${col}/${id}`] = v; }
    }) }) };
};

(async () => {
    await t("resumirCandles15: preço, variação de 1 h (4 candles) e de 24 h (96 candles) em %; ate = fechamento do último candle", () => {
        const cs = candles(120, 1.00, 1.012);
        const r = resumirCandles15(cs);
        const c = cs.map(x => Number(x.close));
        assert.equal(r.preco, c[119]);
        assert.equal(r.v1h, Number(((c[119] / c[115] - 1) * 100).toFixed(3)));
        assert.equal(r.v24h, Number(((c[119] / c[23] - 1) * 100).toFixed(3)));
        assert.equal(r.ate, AGORA);
    });
    await t("histórico curto: v24h null (não inventa); menos de 5 candles: null", () => {
        assert.equal(resumirCandles15(candles(50, 1, 1.01)).v24h, null);
        assert.notEqual(resumirCandles15(candles(50, 1, 1.01)).v1h, null);
        assert.equal(resumirCandles15(candles(3, 1, 1.01)), null);
        assert.equal(resumirCandles15([]), null);
        assert.equal(resumirCandles15(null), null);
    });
    await t("candles de fim de semana (mercado fechado) são descartados antes de calcular", () => {
        const sab = Date.UTC(2026, 9, 3, 12, 0);   // sábado
        const cs = [...candles(20, 1.1, 1.1), { datetime: dt(sab), close: "9.9" }];
        assert.equal(resumirCandles15(cs).preco, 1.1, "o candle de sábado não vira 'preço atual'");
    });
    await t("usa o cache do scanner e NÃO chama a API sem chave extra", async () => {
        const db = fakeDb({ cacheCandles15min: { EUR_USD: { candles: candles(120, 1.0, 1.01), bucket: 1, atualizadoEm: AGORA } } });
        let chamadas = 0;
        const r = await atualizarResumoMercado({ db, pares: ["EUR/USD", "AUD/USD"], agora: AGORA, chaveExtra: "", buscar: async () => { chamadas++; return []; } });
        assert.equal(chamadas, 0);
        assert.deepEqual(Object.keys(r.pares), ["EUR_USD"]);
        assert.equal(r.origem.cache, 1);
        assert.ok(db.gravados["scanner/mercado"].pares.EUR_USD.preco > 0 && db.gravados["scanner/mercado"].atualizadoEm === AGORA);
    });
    await t("par parado: com chave extra busca no máximo `max` por ciclo, o mais velho primeiro; preserva os outros", async () => {
        const velho = AGORA - 3 * 3600e3;
        const db = fakeDb({
            scanner: { mercado: { pares: { AUD_USD: { preco: 0.7, v1h: 0, v24h: 0, ate: velho, fonte: "cache" }, USD_JPY: { preco: 150, v1h: 0, v24h: 0, ate: velho - 3600e3, fonte: "cache" }, NZD_USD: { preco: 0.6, v1h: 0, v24h: 0, ate: velho + 1800e3, fonte: "cache" } } } },
            cacheCandles15min: { EUR_USD: { candles: candles(120, 1.0, 1.01) } }
        });
        const pedidos = [];
        const r = await atualizarResumoMercado({ db, pares: ["EUR/USD", "AUD/USD", "USD/JPY", "NZD/USD"], agora: AGORA, chaveExtra: "K4", max: 2,
            buscar: async (par, chave) => { pedidos.push([par, chave]); return candles(120, 1.0, 1.02); } });
        assert.deepEqual(pedidos, [["USD/JPY", "K4"], ["AUD/USD", "K4"]], "os 2 mais velhos; EUR/USD (fresco) e NZD/USD (3º mais velho) ficam");
        assert.equal(r.pares.USD_JPY.fonte, "extra"); assert.equal(r.pares.AUD_USD.fonte, "extra");
        assert.equal(r.pares.NZD_USD.fonte, "cache", "não buscado neste ciclo: dado antigo preservado, com a idade à vista");
        assert.equal(r.origem.extra, 2);
    });
    await t("mercado fechado: nenhuma chamada extra", async () => {
        const sab = Date.UTC(2026, 9, 3, 12, 0);
        let chamadas = 0;
        await atualizarResumoMercado({ db: fakeDb(), pares: ["AUD/USD"], agora: sab, chaveExtra: "K4", buscar: async () => { chamadas++; return []; } });
        assert.equal(chamadas, 0);
    });
    await t("falha da API (429/erro) ou do cache não derruba o resumo: segue e conta a falha", async () => {
        const db = fakeDb({ cacheCandles15min: { EUR_USD: { candles: "lixo" } } });
        const logs = [];
        const r = await atualizarResumoMercado({ db, pares: ["EUR/USD", "AUD/USD"], agora: AGORA, chaveExtra: "K4", buscar: async () => { throw new Error("429"); }, log: m => logs.push(m) });
        assert.ok(r.origem.falhas >= 1 && db.gravados["scanner/mercado"], "mesmo com falhas o documento é gravado");
        assert.ok(logs.some(m => /429/.test(m)));
    });
    await t("pares padrão = os 10 do app", () => assert.equal(PARES_PADRAO.length, 10));
    console.log(`TODOS OS ${n} TESTES PASSARAM`);
})().catch(e => { console.error(e); process.exit(1); });
