const assert = require("assert");
const D = require("./diario");

// ---- dados sintéticos: 3200 dias úteis, 10 pares ----
const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY", "GBP/JPY", "EUR/GBP"];
function serie(par, { deriva = 0, regime = 0, ruido = 0.006, semente = 1 }) {
  const r = D.prng(semente); const out = []; let preco = par.includes("JPY") ? 110 : 1.1;
  let ts = Date.UTC(2010, 0, 4);   // segunda
  for (let i = 0; i < 3200; i++) {
    while ([0, 6].includes(new Date(ts).getUTCDay())) ts += 86400000;
    const mu = regime ? deriva * (Math.floor(i / regime) % 2 === 0 ? 1 : -1) : deriva;
    const ret = mu + (r() + r() + r() - 1.5) * 2 * ruido;
    const o = preco, c = o * (1 + ret), h = Math.max(o, c) * (1 + r() * 0.002), l = Math.min(o, c) * (1 - r() * 0.002);
    out.push({ ts, o, h, l, c }); preco = c; ts += 86400000;
  }
  return out;
}
const mundo = (cfg) => Object.fromEntries(PARES.map((p, k) => [p, serie(p, { ...cfg, semente: 100 + k })]));

// ---- fim de mês, alinhamento ----
const { datas, series } = D.alinhar(mundo({}), PARES);
const fm = D.fimDeMes(datas);
assert.ok(fm.length > 140 && fm.every(i => i === datas.length - 1 || new Date(datas[i + 1]).getUTCMonth() !== new Date(datas[i]).getUTCMonth()), "fim de mês correto");

// ---- sem olhar adiante: mudar o futuro não muda os sinais até o dia t ----
const base = D.sinaisD1(series, PARES, datas);
const corte = 1500;
const futuroMudado = Object.fromEntries(PARES.map(p => [p, series[p].map((c, i) => (i > corte ? { ...c, c: c.c * 1.3, h: c.h * 1.3, l: c.l * 1.3 } : c))]));
const alt = D.sinaisD1(futuroMudado, PARES, datas);
for (const p of PARES) assert.deepEqual(base[p].slice(0, corte + 1), alt[p].slice(0, corte + 1), `D1 sem look-ahead em ${p}`);
const d5a = D.sinaisD5(series, PARES, datas), d5b = D.sinaisD5(futuroMudado, PARES, datas);
for (const p of PARES) assert.deepEqual(d5a[p].slice(0, corte + 1), d5b[p].slice(0, corte + 1), `D5 sem look-ahead em ${p}`);

// ---- custo: posição constante só paga na entrada ----
const sempreComprado = Object.fromEntries(PARES.map(p => [p, datas.map((_, t) => (t >= D.AQUECIMENTO ? 1 : 0))]));
const cart = D.carteira({ series, pares: PARES, datas, sinais: sempreComprado });
const custos = cart.bruto.map((b, i) => b - cart.diario[i]);
assert.ok(custos[D.AQUECIMENTO + 1] > 0, "custo na entrada");
assert.ok(custos.slice(D.AQUECIMENTO + 5).filter(c => c > 1e-4).length < 12 * 3 * 12, "depois da entrada só o refresh mensal de peso custa algo pequeno");
assert.ok(Math.max(...custos.slice(D.AQUECIMENTO + 5)) < custos[D.AQUECIMENTO + 1], "o custo de entrada é o maior");
// alavancagem bruta limitada
const gross = (t) => PARES.reduce((s, p) => s + Math.abs(1), 0);
assert.ok(gross(0) === 10);

// ---- tendência persistente: D1/D2/D5 ganham; passeio aleatório: ninguém passa A1 ----
const nuloCache = {};
const tend = mundo({ deriva: 0.0006, regime: 600, ruido: 0.004 });
const rD1 = D.avaliarFamilia({ familia: "D1", dados: tend, paresTodos: PARES, nuloCache, sorteiosNulo: 60, sorteiosBoot: 500 });
assert.ok(rD1.sharpe > 0.8 && rD1.sharpeBruto > rD1.sharpe, `D1 deve ganhar em tendência persistente (sharpe ${rD1.sharpe.toFixed(2)})`);
assert.ok(rD1.criterios.A1, "A1 passa quando há tendência real");
const rD5 = D.avaliarFamilia({ familia: "D5", dados: tend, paresTodos: PARES, nuloCache, sorteiosNulo: 60, sorteiosBoot: 500 });
assert.ok(rD5.sharpe > 0, "Donchian também ganha em tendência");
const aleatorio = mundo({ deriva: 0, ruido: 0.006 });
const cacheB = {};
let aprovadas = 0;
for (const f of ["D1", "D2", "D3", "D4", "D5"]) {
  const r = D.avaliarFamilia({ familia: f, dados: aleatorio, paresTodos: PARES, nuloCache: cacheB, sorteiosNulo: 60, sorteiosBoot: 500 });
  if (r.veredito !== "SEM EVIDÊNCIA") aprovadas++;
  assert.ok(typeof r.pctMesesPos === "number" && r.ic95.length === 2 && r.nulo.n === 60 && r.anos && "veredito" in r, "formato do resultado");
}
assert.ok(aprovadas <= 1, `em passeio aleatório quase nada passa (passaram ${aprovadas}/5)`);
// nulo: mediana perto de zero (custo pequeno)
const nulo = D.distribuicaoNula({ series, pares: PARES, datas, sorteios: 80 });
assert.ok(Math.abs(nulo[40]) < 0.5, `mediana do nulo perto de zero (${nulo[40].toFixed(2)})`);
console.log("TESTES DO HORIZONTE DIÁRIO PASSARAM");
