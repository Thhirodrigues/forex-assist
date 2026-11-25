const assert = require("assert");
const { parseBarras, montarTexto } = require("./barras");
const motor = require("./motor");
const { executar } = require("./rodar");
const mat = require("../../lab/materias");

const MIN = 60000, T0 = Date.UTC(2026, 10, 25, 6, 0);                         // 06:00Z: minuto 0, as decisões caem em i = 29 + 30k
const meta = { simbolo: "GOLD", dig: 2, volMin: 0.01, passo: 0.01, contrato: 100, offsetSeg: 7200, swapCompra: -69.5, swapVenda: 15.07, triplo: 3 };
const bar = (i, c) => ({ ms: T0 + i * MIN, o: c, h: c + 0.02, l: c - 0.02, c, sp: 10, dig: 2 });
function serie(plano, trend, passo = 0.05) { const b = []; let c = 1000; for (let i = 0; i < plano; i++) b.push(bar(i, c)); for (let i = 0; i < trend; i++) { c += passo; b.push(bar(plano + i, c)); } return b; }
const agoraDe = (b) => b[b.length - 1].ms + MIN + 5000;                         // logo depois de a última vela fechar

// formato: ida e volta; vela ainda se formando é descartada; lixo não quebra
{
    const b = serie(1500, 50), txt = montarTexto(meta, b);
    const p = parseBarras(txt, { agoraMs: agoraDe(b) });
    assert.strictEqual(p.barras.length, 1550); assert.strictEqual(p.meta.contrato, 100); assert.strictEqual(p.barras[0].ms, b[0].ms); assert.ok(Math.abs(p.barras[49].c - b[49].c) < 1e-9);
    assert.strictEqual(parseBarras(txt, { agoraMs: b[b.length - 1].ms + 30000 }).barras.length, 1549, "a última vela ainda estava se formando");
    assert.strictEqual(parseBarras("lixo"), null); assert.strictEqual(parseBarras("v1;GOLD;2|1,2,3"), null);
}
// motor: tendência limpa gera sinal de COMPRA com alvo = stop pelo mercado, lote por risco e tp/sl em "pips" do executor
const b = serie(1500, 300);
const { sinais } = motor.novosSinais(b, "GOLD", meta, { aposMs: b[1499].ms });
assert.ok(sinais.length >= 1, "deveria haver sinal na tendência"); const s0 = sinais[0];
assert.strictEqual(s0.direcao, "BUY"); assert.strictEqual(s0.par, "GOLD"); assert.strictEqual(s0.tipo, "MATERIAS"); assert.strictEqual(s0.origem, "TESTE"); assert.strictEqual(s0.status, "ABERTA");
assert.strictEqual(s0.financeiro.tpPreco, s0.financeiro.slPreco); assert.ok(s0.financeiro.tpPreco >= 0.8 - 1e-9, "mercado calmo: T = 8 x spread (0,80)");
assert.ok(Math.abs(s0.financeiro.tpPips - s0.financeiro.tpPreco / 0.01) < 0.06, "tp em pips do executor (gold: pip = 0,01)");
assert.ok(s0.riscoUsd <= 7.5 && s0.lote >= 0.01); assert.strictEqual(s0.id, `${s0.timestamp}_GOLD`);
// aposMs: o que já foi processado não decide de novo
assert.strictEqual(motor.novosSinais(b, "GOLD", meta, { aposMs: b[b.length - 1].ms }).sinais.length, 0);
// paridade com o avaliador offline: onde os dois PODEM decidir (a vela de entrada já existe) as decisões são idênticas, nos dois sentidos.
// (Ao vivo dá para decidir também na última vela fechada; offline não, porque ainda não há vela de entrada.)
const off = mat.candidatos(b).map(c => c.ms), ultimaMs = b[b.length - 1].ms;
const vivo = motor.novosSinais(b, "GOLD", meta, { aposMs: -Infinity }).sinais.map(x => x.timestamp);
assert.deepStrictEqual(vivo.filter(ms => ms <= ultimaMs), off, "mesmas decisões que o avaliador offline");
assert.ok(off.length >= 2);
// julgamento: a tendência segue, o alvo é batido (R = +1) com todas as políticas decididas ou P3 estendida
const j = motor.julgarSinal(s0, b, meta);
assert.strictEqual(j.estado, "OK"); assert.strictEqual(j.politicas.P1.estado, "WIN"); assert.ok(Math.abs(j.politicas.P1.r - 1) < 0.02, JSON.stringify(j.politicas.P1));
assert.strictEqual(motor.julgarSinal({ ...s0, timestamp: s0.timestamp + 7 }, b, meta).estado, "SEM_BARRA");

// ciclo completo com banco em memória
(async () => {
    const mem = { estado: {}, docs: new Map() }, avisos = [];
    const bd = {
        lerEstado: async a => mem.estado[a] || null, gravarEstado: async (a, x) => { mem.estado[a] = { ...(mem.estado[a] || {}), ...x }; },
        contarAbertos: async a => [...mem.docs.values()].filter(d => d.par === a && d.status === "ABERTA").length,
        criar: async (id, d) => { if (mem.docs.has(id)) return false; mem.docs.set(id, { id, ...d }); return true; },
        atualizar: async (id, p) => { mem.docs.set(id, { ...mem.docs.get(id), ...p }); },
        listarPendentes: async () => [...mem.docs.values()].filter(d => d.status === "ABERTA" || d.politicasPendentes === true)
    };
    const avisar = { abertura: async s => avisos.push(["abertura", s.id]), encerramento: async s => avisos.push(["encerramento", s.id, s.resultado]) };
    const ciclo = (arr) => executar({ lerBarras: async a => a === "GOLD" ? montarTexto(meta, arr) : "", bd, avisar, agora: agoraDe(arr), log: () => {} });
    // 1º ciclo: só inicia o estado, sem sinal
    let r = await ciclo(serie(1500, 20));
    assert.strictEqual(r.criados, 0); assert.ok(mem.estado.GOLD.ultimaBarraMs);
    // 2º ciclo: a tendência avança -> sinal novo + 1 aviso de abertura
    r = await ciclo(serie(1500, 60));
    assert.ok(r.criados >= 1, JSON.stringify(r)); assert.strictEqual(avisos.filter(a => a[0] === "abertura").length, 1);
    // repetir o mesmo ciclo não duplica (idempotência)
    const n = mem.docs.size; await ciclo(serie(1500, 60)); assert.strictEqual(mem.docs.size, n);
    // ciclo tardio: a tendência segue e o alvo é batido -> encerra com WIN e avisa
    r = await ciclo(serie(1500, 300));
    const fechados = [...mem.docs.values()].filter(d => d.status === "ENCERRADA");
    assert.ok(fechados.length >= 1 && fechados[0].resultado === "WIN" && Math.abs(fechados[0].resultadoR - 1) < 0.02, JSON.stringify(fechados[0]));
    assert.ok(avisos.some(a => a[0] === "encerramento" && a[2] === "WIN"));
    // MT5 parado: velas velhas não geram sinal novo
    const antes = mem.docs.size; r = await executar({ lerBarras: async a => a === "GOLD" ? montarTexto(meta, serie(1500, 300)) : "", bd, avisar, agora: T0 + 2000 * MIN + 3 * 3600e3, log: () => {} });
    assert.strictEqual(mem.docs.size, antes); assert.ok(r.velhas.some(v => v.ativo === "GOLD"));
    console.log("materias (barras, motor, ciclo): OK");
})().catch(e => { console.error(e); process.exit(1); });
