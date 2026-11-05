const assert = require("assert");
const T = require("./telegram");
const { escolherChat } = require("./telegram/conectar");
const { enviarParaTokens } = require("./pushNotifier");

const fakeDb = (chatId) => ({ collection: () => ({ doc: () => ({ get: async () => (chatId === undefined ? { exists: false } : { exists: true, data: () => ({ chatId }) }) }) }) });
const fetchOk = (calls) => async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };

(async () => {
    // texto: título em negrito, caracteres HTML escapados
    assert.strictEqual(T.textoDoAviso({ title: "🟢 COMPRA EUR/USD", body: "Entrada ~1.12 | Score 70%\n🕐 12:30" }), "<b>🟢 COMPRA EUR/USD</b>\nEntrada ~1.12 | Score 70%\n🕐 12:30");
    assert.strictEqual(T.textoDoAviso({ title: "a<b>&c", body: "x" }), "<b>a&lt;b&gt;&amp;c</b>\nx");
    assert.strictEqual(T.textoDoAviso({ title: "só título" }), "<b>só título</b>");

    // envio: monta o pedido certo e nunca expõe o token em erro
    let calls = [];
    let r = await T.enviarTelegram({ token: "123:SEGREDO", chatId: 42, texto: "oi", fetchImpl: fetchOk(calls) });
    assert.ok(r.ok); assert.strictEqual(calls[0].url, "https://api.telegram.org/bot123:SEGREDO/sendMessage");
    assert.deepStrictEqual(calls[0].body, { chat_id: 42, text: "oi", parse_mode: "HTML", disable_web_page_preview: true });
    r = await T.enviarTelegram({ token: "123:SEGREDO", chatId: 42, texto: "oi", fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ ok: false, description: "Forbidden: bot was blocked by the user 123:SEGREDO" }) }) });
    assert.ok(!r.ok); assert.ok(!r.erro.includes("SEGREDO"), "token mascarado no erro"); assert.match(r.erro, /403/);
    r = await T.enviarTelegram({ token: "123:SEGREDO", chatId: 42, texto: "oi", fetchImpl: async () => { throw new Error("falha em https://api.telegram.org/bot123:SEGREDO/sendMessage"); } });
    assert.ok(!r.erro.includes("SEGREDO"), "token mascarado em exceção de rede");
    r = await T.enviarTelegram({ token: "999:TOKENLONGO", chatId: 1, texto: "x", timeoutMs: 20, fetchImpl: (url, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("abortado"), { name: "AbortError" })))) });
    assert.strictEqual(r.erro, "tempo esgotado", "não trava o scanner: tempo limite");
    assert.ok(!(await T.enviarTelegram({ token: "", chatId: 1, texto: "x" })).ok);

    // botão "Abrir na XM": só com URL https; aviso sem URL (ex.: alerta do MT5) não leva botão
    calls = [];
    await T.enviarTelegram({ token: "123:SEGREDO", chatId: 42, texto: "oi", botao: { texto: "Abrir na XM", url: "https://my.xm.com/pt/symbol-info/EURUSD" }, fetchImpl: fetchOk(calls) });
    assert.deepStrictEqual(calls[0].body.reply_markup, { inline_keyboard: [[{ text: "Abrir na XM", url: "https://my.xm.com/pt/symbol-info/EURUSD" }]] });
    calls = [];
    await T.enviarTelegram({ token: "123:SEGREDO", chatId: 42, texto: "oi", botao: { url: "./" }, fetchImpl: fetchOk(calls) });
    assert.ok(!("reply_markup" in calls[0].body), "URL não https: sem botão");
    calls = [];
    await T.notificarTelegram(fakeDb(42), { title: "a", body: "b" }, { token: "999:TOKENLONGO", url: "https://my.xm.com/pt/symbol-info/GBPUSD", fetchImpl: fetchOk(calls) });
    assert.strictEqual(calls[0].body.reply_markup.inline_keyboard[0][0].url, "https://my.xm.com/pt/symbol-info/GBPUSD");
    calls = [];
    await T.notificarTelegram(fakeDb(42), { title: "a", body: "b" }, { token: "999:TOKENLONGO", fetchImpl: fetchOk(calls) });
    assert.ok(!("reply_markup" in calls[0].body), "sem url, sem botão");

    // notificar: sem token ou sem destino = no-op; com os dois envia; falha não lança
    calls = [];
    assert.ok((await T.notificarTelegram(fakeDb(42), { title: "a", body: "b" }, { token: "", fetchImpl: fetchOk(calls) })).ignorado);
    assert.ok((await T.notificarTelegram(fakeDb(undefined), { title: "a", body: "b" }, { token: "999:TOKENLONGO", fetchImpl: fetchOk(calls) })).ignorado);
    assert.strictEqual(calls.length, 0);
    assert.ok((await T.notificarTelegram(fakeDb(42), { title: "a", body: "b" }, { token: "999:TOKENLONGO", fetchImpl: fetchOk(calls) })).ok);
    assert.strictEqual(calls.length, 1);
    const quebrado = { collection: () => { throw new Error("banco fora do ar"); } };
    r = await T.notificarTelegram(quebrado, { title: "a" }, { token: "999:TOKENLONGO" });
    assert.ok(!r.ok, "erro do banco não lança");

    // integração: o Telegram sai MESMO sem tokens de push; erro no Telegram não impede o push; erro no push não impede o Telegram
    const enviados = []; const admin = { messaging: () => ({ send: async (m) => { enviados.push(m.token); } }) };
    const tg = []; const fakeTg = async (db, aviso) => { tg.push(aviso); };
    const urls = []; const tgUrl = async (db, aviso, o) => { urls.push(o && o.url); };
    await enviarParaTokens(admin, fakeDb(1), [], { notification: { title: "T", body: "B" }, data: { url: "https://my.xm.com/pt/symbol-info/EURUSD" } }, { telegram: tgUrl });
    assert.deepStrictEqual(urls, ["https://my.xm.com/pt/symbol-info/EURUSD"], "a URL da XM do sinal vai para o Telegram");
    await enviarParaTokens(admin, fakeDb(1), [], { notification: { title: "T", body: "B" } }, { telegram: fakeTg });
    assert.strictEqual(tg.length, 1); assert.strictEqual(enviados.length, 0);
    await enviarParaTokens(admin, fakeDb(1), ["tok1", "tok2"], { notification: { title: "T2", body: "B2" } }, { telegram: fakeTg });
    assert.deepStrictEqual(enviados, ["tok1", "tok2"]); assert.strictEqual(tg.length, 2);
    await enviarParaTokens(admin, fakeDb(1), ["tok3"], { notification: { title: "T3", body: "B3" } }, { telegram: async () => { throw new Error("telegram caiu"); } });
    assert.deepStrictEqual(enviados, ["tok1", "tok2", "tok3"], "Telegram com erro não derruba o push");

    // conectar: só mensagem PRIVADA com exatamente a palavra-código; a mais recente vence; estranho com outra palavra não conta
    const up = [
        { message: { chat: { id: 111, type: "private" }, text: "oi", date: 1 } },
        { message: { chat: { id: 222, type: "private" }, text: "Forex-2026 ", date: 5 } },
        { message: { chat: { id: 333, type: "group" }, text: "forex-2026", date: 9 } },
        { message: { chat: { id: 444, type: "private" }, text: "forex-2026", date: 7 } }
    ];
    assert.deepStrictEqual(escolherChat(up, "FOREX-2026"), { chatId: 444, date: 7 });
    assert.strictEqual(escolherChat(up, "outra"), null); assert.strictEqual(escolherChat([], "x"), null); assert.strictEqual(escolherChat(up, ""), null);
    console.log("TODOS OS TESTES DO TELEGRAM PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
