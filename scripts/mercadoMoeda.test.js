const assert = require("assert");
const M = require("./mercadoMoeda");
let n = 0;
const t = (nome, fn) => { fn(); n++; console.log("[OK] " + nome); };

const AGORA = Date.UTC(2026, 9, 6, 20, 0);
const r = (v24h, v1h = 0, idadeMin = 5) => ({ preco: 1, v24h, v1h, ate: AGORA - idadeMin * 60000 });
// cenário dos prints: dólar caiu contra EUR, GBP, AUD, NZD, CAD e CHF subiu 0,2%... exceto contra o iene (USD/JPY sobe)
const mercado = { pares: {
    EUR_USD: r(0.20), GBP_USD: r(0.10), AUD_USD: r(0.18), NZD_USD: r(0.41),
    USD_CAD: r(-0.27), USD_JPY: r(0.19), USD_CHF: r(-0.12),
    EUR_JPY: r(0.30), GBP_JPY: r(0.28), EUR_GBP: r(0.05)
} };

t("moeda no par: BASE segue o par; COTADA é o par com sinal trocado", () => {
  assert.equal(M.movimentoNaMoeda("AUD/USD", "USD", 0.18), -0.18, "AUD/USD subindo = dólar caindo");
  assert.equal(M.movimentoNaMoeda("USD/JPY", "USD", 0.19), 0.19, "USD/JPY subindo = dólar subindo");
  assert.equal(M.movimentoNaMoeda("AUD/USD", "AUD", 0.18), 0.18);
  assert.equal(M.movimentoNaMoeda("AUD/USD", "USD", null), null);
  assert.equal(M.estadoDoMovimento(0.05), "parado"); assert.equal(M.estadoDoMovimento(-0.2), "caindo"); assert.equal(M.estadoDoMovimento(null), null);
});
t("caso do usuário: compra de AUD/USD precisa de dólar CAINDO; dos 6 outros pares com dólar, 5 caindo e 1 (USD/JPY) subindo", () => {
  const q = M.quadroDoSinal({ par: "AUD/USD", direcao: "BUY", mercado, agora: AGORA });
  const usd = q.moedas.find(m => m.moeda === "USD");
  assert.equal(usd.precisa, "cair");
  assert.deepEqual(usd.linhas.map(l => l.par).sort(), ["EUR/USD", "GBP/USD", "NZD/USD", "USD/CAD", "USD/CHF", "USD/JPY"], "todos os outros pares com dólar, não só os que deram sinal");
  assert.deepEqual({ ...usd.resumo }, { subindo: 1, caindo: 5, parado: 0, semDado: 0, obsoleto: 0, aFavor: 5, n: 6 });
  assert.equal(usd.linhas.find(l => l.par === "USD/JPY").estado, "subindo", "USD/JPY: dólar subindo (diverge)");
  assert.equal(usd.linhas.find(l => l.par === "EUR/USD").estado, "caindo", "EUR/USD subindo = dólar caindo");
  assert.equal(q.proprio.lado, "a favor", "AUD/USD subiu e o sinal é compra");
  const aud = q.moedas.find(m => m.moeda === "AUD");
  assert.equal(aud.precisa, "subir"); assert.equal(aud.linhas.length, 0, "AUD só aparece em AUD/USD no app: sem comparação");
});
t("venda de USD/CAD (também aposta em dólar caindo): mesma leitura do dólar; e o CAD (outras 0) sem comparação", () => {
  const q = M.quadroDoSinal({ par: "USD/CAD", direcao: "SELL", mercado, agora: AGORA });
  const usd = q.moedas.find(m => m.moeda === "USD");
  assert.equal(usd.precisa, "cair");
  assert.equal(usd.resumo.aFavor, 5, "EUR, GBP, AUD, NZD e CHF... CHF: USD/CHF caiu = dólar caindo; só USD/JPY discorda");
  assert.equal(q.proprio.lado, "a favor", "USD/CAD caiu e o sinal é venda");
  assert.equal(q.moedas.find(m => m.moeda === "CAD").linhas.length, 0);
});
t("venda de USD/JPY (aposta em dólar caindo) mas o próprio par subiu: mercado CONTRA o sinal", () => {
  const q = M.quadroDoSinal({ par: "USD/JPY", direcao: "SELL", mercado, agora: AGORA });
  assert.equal(q.proprio.lado, "contra");
  const jpy = q.moedas.find(m => m.moeda === "JPY");
  assert.equal(jpy.precisa, "subir", "vender USD/JPY = comprar iene");
  assert.deepEqual(jpy.linhas.map(l => l.par).sort(), ["EUR/JPY", "GBP/JPY"]);
  assert.equal(jpy.resumo.aFavor, 0, "EUR/JPY e GBP/JPY subindo = iene CAINDO, contra o sinal");
});
t("par parado/sem dado/dado velho: contado à parte, idade informada, nada inventado", () => {
  const m = { pares: { ...mercado.pares, EUR_USD: r(0.01), GBP_USD: r(0.5, 0, 200) } };
  delete m.pares.USD_CHF;
  const q = M.quadroDoSinal({ par: "AUD/USD", direcao: "BUY", mercado: m, agora: AGORA });
  const usd = q.moedas.find(m2 => m2.moeda === "USD");
  assert.equal(usd.resumo.parado, 1); assert.equal(usd.resumo.semDado, 1);
  assert.equal(usd.linhas.find(l => l.par === "GBP/USD").idadeMin, 200);
  assert.equal(usd.linhas.find(l => l.par === "GBP/USD").obsoleto, false, "200 min ainda conta (limite de 4 h)");
  const html = M.htmlQuadro(q);
  assert.ok(/sem dado/.test(html) && /⏱ 3 h/.test(html), "mostra 'sem dado' e a idade do dado velho");
});
t("dado com mais de 4 h é 'obsoleto': aparece, mas NÃO entra na contagem de subindo/caindo", () => {
  const m = { pares: { ...mercado.pares, NZD_USD: r(0.41, 0.08, 17 * 60), USD_JPY: r(0.19, 0.02, 5) } };
  const q = M.quadroDoSinal({ par: "AUD/USD", direcao: "BUY", mercado: m, agora: AGORA });
  const usd = q.moedas.find(x => x.moeda === "USD");
  assert.equal(usd.linhas.find(l => l.par === "NZD/USD").estado, null);
  assert.equal(usd.resumo.obsoleto, 1);
  assert.equal(usd.resumo.caindo + usd.resumo.subindo + usd.resumo.parado, 5, "NZD/USD de 17 h atrás fica de fora");
  assert.ok(/1 sem dado atual/.test(M.htmlQuadro(q)));
});
t("sem resumo nenhum: mensagem clara, sem quebrar", () => {
  assert.ok(/indisponível/.test(M.htmlQuadro(M.quadroDoSinal({ par: "AUD/USD", direcao: "BUY", mercado: null }))));
  assert.ok(/indisponível/.test(M.htmlQuadro(M.quadroDoSinal({ par: "AUD/USD", direcao: "BUY", mercado: { pares: {} } }))));
});
t("HTML: título da moeda, 'a favor do sinal em k de n' e o aviso fixo 'contexto, não filtro'", () => {
  const html = M.htmlQuadro(M.quadroDoSinal({ par: "AUD/USD", direcao: "BUY", mercado, agora: AGORA }));
  assert.ok(/DÓLAR — o sinal precisa dela CAINDO/.test(html));
  assert.ok(/a favor do sinal em 5 de 6/.test(html));
  assert.ok(/Contexto, não filtro/.test(html) && /360 dias/.test(html));
  assert.ok(/USD\/JPY/.test(html) && /dólar subindo/.test(html) && /dólar caindo/.test(html));
});
console.log(`TODOS OS ${n} TESTES PASSARAM`);
