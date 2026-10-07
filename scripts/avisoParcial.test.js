// Aviso de lucro parcial: lógica pura + o verificador REAL (js/checker.js) rodando com firestore/API falsos.
const assert = require("assert");
const Module = require("module");
const path = require("path");
const { configAviso, avaliarAviso, registroDoAviso } = require("./avisoParcial");

let n = 0;
const t = async (nome, fn) => { await fn(); n++; console.log("[OK] " + nome); };

const sinalBase = (extra = {}) => ({ par: "GBP/USD", direcao: "BUY", financeiro: { tpPips: 37.5, slPips: 25 }, ...extra });

(async () => {

  await t("config: ausente = ligado e 60%; limita 10-95; arredonda", () => {
    assert.deepStrictEqual(configAviso(undefined), { ativo: true, percentual: 60 });
    assert.deepStrictEqual(configAviso({}), { ativo: true, percentual: 60 });
    assert.deepStrictEqual(configAviso({ avisoParcialAtivo: false, avisoParcialPct: 50 }), { ativo: false, percentual: 50 });
    assert.equal(configAviso({ avisoParcialPct: 5 }).percentual, 10);
    assert.equal(configAviso({ avisoParcialPct: 200 }).percentual, 95);
    assert.equal(configAviso({ avisoParcialPct: 57.4 }).percentual, 57);
    assert.equal(configAviso({ avisoParcialPct: "abc" }).percentual, 60);
  });

  await t("avaliar: 60% de 37,5 pips = 22,5 pips; abaixo não avisa, no limite e acima avisa", () => {
    assert.equal(avaliarAviso({ sinal: sinalBase(), movimentoPips: 22.4, configuracao: {} }).avisar, false);
    const a = avaliarAviso({ sinal: sinalBase(), movimentoPips: 22.5, configuracao: {} });
    assert.equal(a.avisar, true); assert.equal(a.alvoPips, 22.5); assert.equal(a.pctAtingido, 60);
    assert.equal(avaliarAviso({ sinal: sinalBase(), movimentoPips: 39.4, configuracao: {} }).avisar, true);
  });

  await t("avaliar: prejuízo, desligado, já avisado, sem TP ou sem preço nunca avisam", () => {
    assert.equal(avaliarAviso({ sinal: sinalBase(), movimentoPips: -30, configuracao: {} }).avisar, false);
    assert.equal(avaliarAviso({ sinal: sinalBase(), movimentoPips: 30, configuracao: { avisoParcialAtivo: false } }).motivo, "desligado");
    assert.equal(avaliarAviso({ sinal: sinalBase({ avisoParcial: { em: 1 } }), movimentoPips: 30, configuracao: {} }).motivo, "ja_avisado");
    assert.equal(avaliarAviso({ sinal: { par: "X", financeiro: {} }, movimentoPips: 30, configuracao: {} }).motivo, "sem_tp");
    assert.equal(avaliarAviso({ sinal: sinalBase(), movimentoPips: NaN, configuracao: {} }).motivo, "sem_preco");
  });

  await t("percentual configurável: 50% de 25 pips = 12,5", () => {
    const a = avaliarAviso({ sinal: sinalBase({ financeiro: { tpPips: 25 } }), movimentoPips: 12.5, configuracao: { avisoParcialPct: 50 } });
    assert.equal(a.avisar, true); assert.equal(a.alvoPips, 12.5);
  });

  await t("registro gravado no sinal: hora, %, pips, preço e US$", () => {
    const a = avaliarAviso({ sinal: sinalBase(), movimentoPips: 25, configuracao: {} });
    const r = registroDoAviso({ avaliacao: a, precoAtual: 1.32541, lucroUSD: 5.0, agora: 123 });
    assert.deepStrictEqual(r, { em: 123, percentualConfigurado: 60, pctAtingido: 66.7, pips: 25, tpPips: 37.5, preco: 1.32541, usd: 5 });
  });

  // ---------- o verificador real, com firestore, API e push falsos ----------
  async function rodaChecker({ sinal, config, movimentoAlvoPips }) {
    const raiz = path.join(__dirname, "..");
    const registros = { updates: [], pushes: [], transacoes: 0 };
    const logs = [];
    const entrada = sinal.precoEntrada;
    const agora = Date.now();
    const dt = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
    const fator = sinal.par.includes("JPY") ? 100 : 10000;
    const alvoPreco = entrada + (sinal.direcao === "BUY" ? 1 : -1) * movimentoAlvoPips / fator;
    // 3 candles de 5 min depois da abertura, o último fecha em alvoPreco (sem tocar TP/SL)
    const candles = [0, 1, 2].map(i => {
      const frac = (i + 1) / 3; const c = entrada + (alvoPreco - entrada) * frac;
      return { datetime: dt(sinal.inicioOperacao + (i + 1) * 300000), open: String(entrada), high: String(Math.max(c, entrada)), low: String(Math.min(c, entrada)), close: String(c) };
    });
    const doc = { data: () => sinal, ref: { update: async (v) => { registros.updates.push(v); } } };
    const dbFalso = {
      collection: (nome) => ({
        doc: () => ({ get: async () => ({ exists: true, data: () => config }) }),
        where: () => ({ get: async () => ({ size: 1, docs: [doc] }) })
      }),
      runTransaction: async () => { registros.transacoes++; }
    };
    const stubs = {
      "firebase-admin": { initializeApp() {}, credential: { cert: () => ({}) }, firestore: () => dbFalso, messaging: () => ({}) },
      "../serviceAccount.json": {},
      "../scripts/marketData": { getCandles: async () => candles },
      "../scripts/statisticsEngine": { idCacheDoPar: (p) => p },
      "../scripts/pushNotifier": {
        enviarPushEncerramento: async () => { registros.pushes.push("encerramento"); },
        enviarPushAvisoParcial: async (_a, _d, s, aviso) => { registros.pushes.push({ tipo: "aviso_parcial", par: s.par, aviso }); }
      },
      "../scripts/horarioMercado": { mercadoForexAberto: () => true, mercadoForexAbertoParaConsulta: () => true }
    };
    const original = Module.prototype.require;
    const logOriginal = console.log;
    Module.prototype.require = function (id) {
      if (this.filename && this.filename.endsWith(path.join("js", "checker.js")) && id in stubs) return stubs[id];
      return original.apply(this, arguments);
    };
    console.log = (...a) => logs.push(a.join(" "));
    delete require.cache[path.join(raiz, "js", "checker.js")];
    try {
      require(path.join(raiz, "js", "checker.js"));
      for (let i = 0; i < 200 && !logs.some(l => l === "Finalizado."); i++) await new Promise(r => setTimeout(r, 10));
    } finally { Module.prototype.require = original; console.log = logOriginal; }
    return { ...registros, logs };
  }

  const entrada = 1.32291, ini = Date.now() - 30 * 60000;
  const sinal = () => ({ par: "GBP/USD", direcao: "BUY", precoEntrada: entrada, inicioOperacao: ini, lote: 0.02, tpUSD: 7.5, slUSD: 5, financeiro: { tpPips: 37.5, slPips: 25, tpUSD: 7.5, slUSD: 5 } });

  await t("verificador real: lucro aberto de 23 pips (61% do TP) => grava avisoParcial, manda UM push e NÃO fecha a operação", async () => {
    const r = await rodaChecker({ sinal: sinal(), config: { saldoInicial: 500 }, movimentoAlvoPips: 23 });
    assert.equal(r.transacoes, 0, "o aviso nunca fecha operação (nenhuma transação de encerramento)");
    const gravacaoAviso = r.updates.find(u => u.avisoParcial);
    assert.ok(gravacaoAviso, "gravou avisoParcial no sinal: " + JSON.stringify(r.updates.map(u => Object.keys(u))));
    assert.equal(gravacaoAviso.avisoParcial.percentualConfigurado, 60);
    assert.ok(gravacaoAviso.avisoParcial.pctAtingido >= 60 && gravacaoAviso.avisoParcial.pips >= 22.5);
    assert.deepStrictEqual(r.pushes.map(p => p.tipo), ["aviso_parcial"], "um push só");
    assert.ok(!r.updates.some(u => u.status === "ENCERRADA"));
    assert.ok(r.logs.some(l => /Aviso parcial enviado: GBP\/USD/.test(l)));
  });

  await t("verificador real: 10 pips (27% do TP) => nada", async () => {
    const r = await rodaChecker({ sinal: sinal(), config: {}, movimentoAlvoPips: 10 });
    assert.equal(r.pushes.length, 0); assert.ok(!r.updates.some(u => u.avisoParcial));
  });

  await t("verificador real: desligado na config => nada, mesmo com 23 pips", async () => {
    const r = await rodaChecker({ sinal: sinal(), config: { avisoParcialAtivo: false }, movimentoAlvoPips: 23 });
    assert.equal(r.pushes.length, 0); assert.ok(!r.updates.some(u => u.avisoParcial));
  });

  await t("verificador real: percentual 50% => avisa com 19 pips (51%)", async () => {
    const r = await rodaChecker({ sinal: sinal(), config: { avisoParcialPct: 50 }, movimentoAlvoPips: 19 });
    assert.equal(r.pushes.length, 1); assert.equal(r.pushes[0].aviso.percentualConfigurado, 50);
  });

  await t("verificador real: sinal já avisado antes => não repete", async () => {
    const r = await rodaChecker({ sinal: { ...sinal(), avisoParcial: { em: 1, pctAtingido: 61 } }, config: {}, movimentoAlvoPips: 24 });
    assert.equal(r.pushes.length, 0);
  });

  await t("verificador real: VENDA com preço caindo 23 pips também avisa (direção respeitada)", async () => {
    const s = { ...sinal(), par: "USD/CAD", direcao: "SELL", precoEntrada: 1.42469, financeiro: { tpPips: 35.6, slPips: 38.1, tpUSD: 5, slUSD: 5 } };
    const r = await rodaChecker({ sinal: s, config: {}, movimentoAlvoPips: 23 });
    assert.equal(r.pushes.length, 1, "queda de 23 pips numa venda com TP de 35,6 = 64%");
  });

  console.log(`TODOS OS ${n} TESTES PASSARAM`);
})().catch(e => { console.error(e); process.exit(1); });
