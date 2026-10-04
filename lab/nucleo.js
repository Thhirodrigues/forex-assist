// ===================================================
// FOREX ASSIST - LABORATÓRIO - NÚCLEO DO ROTULADOR (funções puras, sem I/O)
//
// Recebe, para UM par: as análises novas, as entradas do laboratório ainda abertas, o estado
// do "cooldown virtual" e os candles; devolve as entradas a gravar e os incrementos dos
// contadores. Quem grava (Firestore) está em rotulador.js. Nada aqui toca no sinal oficial.
//
// Dois universos de entradas (ver caderno 6.7/6.8):
//   OFICIAL - toda análise que o scanner APROVOU (o que virou sinal). Base do E2: o mesmo
//             sinal visto com saídas alternativas.
//   LAB     - fluxo virtual: toda análise com direção (tendência ALTA/BAIXA, ou a direção
//             aprovada) respeitando o MESMO cooldown do oficial. Base das regras H1-H5.
// ===================================================

const { simularOperacao, variantesPadrao } = require("./simulador");
const { spreadDoPar } = require("./spreads");
const CFG = require("./config");

const MIN = 60000;

// FNV-1a: sorteio determinístico (mesmo id -> mesma direção) para o baseline ALEATORIO
function paridadeDoId(id) {
    let h = 0x811c9dc5;
    for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return (h & 1) === 1;
}

function direcaoDaAnalise(a) {
    if (a.aprovado === true && (a.direcao === "BUY" || a.direcao === "SELL")) return a.direcao;
    if (a.tendencia === "ALTA") return "BUY";
    if (a.tendencia === "BAIXA") return "SELL";
    return null;
}

function chaveContador(tipo, variante, preRegistro, grupo = "TODOS") {
    return `${tipo}__${variante}__${preRegistro ? "pre" : "pos"}__${grupo}`;
}

// Grupos das hipóteses PRÉ-REGISTRADAS em 03/10/2026 (PENDENCIAS-ESTRATEGICAS-RMI.md, H1-H5) +
// L1 (ideia do usuário: "só as condições que estão funcionando melhor"; limiares tirados dos
// MESMOS dados que a geraram -> na época `pre` não vale como prova). Mudar uma definição aqui
// exige registrar a data no caderno e rodar `lab/recontar.js`.
const USD_BASE = new Set(["USD/JPY", "USD/CAD", "USD/CHF"]);
const USD_COTADO = new Set(["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD"]);

function ladoDolar(par, direcao) {
    if (USD_BASE.has(par)) return direcao === "BUY" ? "comprado" : "vendido";
    if (USD_COTADO.has(par)) return direcao === "BUY" ? "vendido" : "comprado";
    return "cruzado";   // EUR/JPY, GBP/JPY, EUR/GBP: não há lado do dólar
}

function gruposDaEntrada(e) {
    const g = ["TODOS"];
    const score = Number(e.score), adx = Number(e.adx);
    if (Number.isFinite(score)) {
        if (score >= 50) g.push("H1_score50mais");
        else if (score >= 35) g.push("H1_score35a49");
    }
    if (Number.isFinite(adx)) g.push(adx >= 30 ? "H2_adx30mais" : "H2_adx_ate29");
    g.push(e.candlestick ? "H3_com_candle" : "H3_sem_candle");
    g.push(`H4_dolar_${ladoDolar(e.par, e.direcao)}`);
    if (e.perfil === "BALANCEADO" || e.perfil === "AGRESSIVO" || e.perfil === "CONSERVADOR") {
        g.push(`H5_${e.perfil.toLowerCase()}`);
    }
    if (Number.isFinite(score) && Number.isFinite(adx) && score >= 40 && score < 45 && adx < 25) g.push("L1_score40a44_adx25menos");

    // ---- EXPLORATÓRIOS (declarados em 04/10/2026, antes dos dados `pos`; NÃO decidem nada) ----
    const rsi = Number(e.rsi);
    if (Number.isFinite(rsi)) {
        const esticado = (e.direcao === "BUY" && rsi >= 70) || (e.direcao === "SELL" && rsi <= 30);
        g.push(esticado ? "X1_rsi_esticado" : "X1_rsi_normal");
    }
    if (Number.isFinite(Number(e.t))) {
        const h = new Date(Number(e.t)).getUTCHours();
        g.push(`X2_sessao_${h < 7 ? "asia" : h < 12 ? "londres" : h < 16 ? "sobreposicao" : h < 21 ? "ny" : "fora"}`);
    }
    if (Number.isFinite(Number(e.lote))) g.push(`X3_lote_${Number(e.lote)}`);
    if (e.par) g.push(`X4_par_${String(e.par).replace("/", "_")}`);
    return g;
}

function registrarMudancas(deltas, e, mudancas) {
    const epoca = e.preRegistro ? "pre" : "pos";
    const grupos = gruposDaEntrada(e);
    for (const m of mudancas) {
        for (const grupo of grupos) {
            somarDelta(deltas, chaveContador(e.tipo, m.variante, e.preRegistro, grupo),
                { tipo: e.tipo, variante: m.variante, epoca, grupo }, m.r);
        }
    }
}

function somarDelta(deltas, chave, meta, r) {
    const d = deltas[chave] || (deltas[chave] = { ...meta, n: 0, pos: 0, neg: 0, zero: 0, pips: 0, dur: 0, amb: 0, ab: 0 });
    d.n += 1;
    if (r.pips > 0) d.pos += 1; else if (r.pips < 0) d.neg += 1; else d.zero += 1;
    d.pips = Number((d.pips + r.pips).toFixed(2));
    d.dur += r.duracaoMin || 0;
    if (r.ambiguo) d.amb += 1;
}

function novaEntrada(tipo, id, par, a, dir, preRegistro) {
    const tp = Math.abs(Number(a.tpPips));
    const sl = Math.abs(Number(a.slPips));
    const spread = spreadDoPar(par);
    const base = {
        id, tipo, par,
        t: Number(a.timestamp),
        direcao: dir,
        precoEntrada: Number(a.precoEntrada),
        tpPips: tp, slPips: sl, spreadPips: spread,
        aprovado: a.aprovado === true,
        perfil: a.perfilResolvido || null,
        tendencia: a.tendencia || null,
        score: a.score ?? null,
        adx: a.indicadores?.adx ?? null,
        rsi: a.indicadores?.rsi ?? null,
        atr: a.indicadores?.atr ?? null,
        lote: Number.isFinite(Number(a.lote)) ? Number(a.lote) : null,
        candlestick: a.candlestickDetectado ? true : false,
        smc: a.smcDetectado ? true : false,
        preRegistro,
        reanalises: [],
        reanalisesAteT: Number(a.timestamp),
        resolvida: false
    };
    const variantes = {};
    for (const v of variantesPadrao({ ...a, par, tpPips: tp, slPips: sl })) {
        variantes[v.id] = { r: "ABERTA", cfg: { tpPips: v.tpPips, slPips: v.slPips, opcoes: v.opcoes } };
    }
    base.variantes = variantes;
    return base;
}

// Resimula as variantes ainda abertas de uma entrada; devolve o que mudou (para os contadores).
function atualizarVariantes(e, candles, agora) {
    const mudancas = [];
    const candlesDaEntrada = candles;
    for (const [id, v] of Object.entries(e.variantes)) {
        if (v.r !== "ABERTA") continue;
        const opcoes = { ...v.cfg.opcoes };
        if (opcoes.aleatorio) { opcoes.inverter = paridadeDoId(e.id); delete opcoes.aleatorio; }
        if (opcoes.usaReanalises) {
            opcoes.reanalises = e.reanalises.map(r => ({ t: r.t, preco: r.p, tendencia: r.d }));
            delete opcoes.usaReanalises;
        }
        const r = simularOperacao({
            par: e.par, direcao: e.direcao, tEntrada: e.t, precoEntrada: e.precoEntrada,
            tpPips: v.cfg.tpPips, slPips: v.cfg.slPips, spreadPips: e.spreadPips * (opcoes.spreadMult ?? 1),
            candles: candlesDaEntrada, opcoes
        });
        if (r.resultado === "ABERTA") {
            if (agora - e.t > CFG.MAX_DIAS_ABERTA * 24 * 60 * MIN) v.r = "EXPIRADA";
            continue;
        }
        if (r.resultado === "INVALIDA") { v.r = "INVALIDA"; v.motivo = r.motivo; continue; }
        e.variantes[id] = { ...v, r: r.resultado, p: r.pips, d: r.duracaoMin, f: r.tFechamento, amb: r.ambiguo === true };
        mudancas.push({ variante: id, r });
    }
    e.resolvida = Object.values(e.variantes).every(v => v.r !== "ABERTA");
    return mudancas;
}

/**
 * @param {object} p
 * @param {string} p.par
 * @param {Array} p.analises            novas, ordenadas por timestamp (cada uma com .id)
 * @param {Array} p.abertas             entradas já gravadas deste par ainda não resolvidas
 * @param {object|null} p.ultimoLab     {t, atualR, atualF} da última entrada LAB deste par
 * @param {Array} p.candles             candles de 5 min (ordenados, já filtrados por horário de mercado)
 * @param {number} p.registradoEm
 * @param {number} p.agora
 * @returns {{entradas: object[], deltas: object, ultimoLab: object|null, ignoradas: object}}
 */
function processarPar({ par, analises, abertas, ultimoLab, candles, registradoEm, agora }) {

    const deltas = {};
    const ignoradas = { semDirecao: 0, semTpSl: 0, cooldown: 0 };
    const entradas = new Map();   // id -> entrada (as novas e as abertas atualizadas)

    for (const e of abertas) entradas.set(e.id, e);

    // reanálises novas entram nas entradas já abertas (a entrada só enxerga o que veio DEPOIS dela)
    const adicionarReanalises = (e) => {
        for (const a of analises) {
            if (a.timestamp <= e.reanalisesAteT) continue;
            if (e.reanalises.length >= CFG.MAX_REANALISES) break;
            if (a.tendencia && Number.isFinite(Number(a.precoEntrada))) {
                // objeto, não array de arrays: o Firestore não aceita array aninhado
                e.reanalises.push({ t: Number(a.timestamp), p: Number(a.precoEntrada), d: a.tendencia });
            }
            e.reanalisesAteT = Number(a.timestamp);
        }
    };

    let lab = ultimoLab ? { ...ultimoLab } : null;
    const atualizarLab = (e) => {
        if (e.tipo !== "LAB") return;
        const v = e.variantes.ATUAL;
        if (!lab || e.t >= lab.t) lab = { t: e.t, atualR: v.r, atualF: v.f ?? null };
    };

    // 1) entradas já abertas: reanálises novas + resimulação
    for (const e of abertas) {
        adicionarReanalises(e);
        const antes = e.variantes.ATUAL.r;
        registrarMudancas(deltas, e, atualizarVariantes(e, candles, agora));
        if (antes === "ABERTA") atualizarLab(e);
    }

    // 2) análises novas, em ordem cronológica
    for (const a of analises) {

        const dir = direcaoDaAnalise(a);
        const tp = Math.abs(Number(a.tpPips)), sl = Math.abs(Number(a.slPips));
        if (!dir) { ignoradas.semDirecao++; continue; }
        if (!(tp > 0) || !(sl > 0) || !Number.isFinite(Number(a.precoEntrada))) { ignoradas.semTpSl++; continue; }

        const preRegistro = Number(a.timestamp) < registradoEm;
        const tipos = [];
        if (a.aprovado === true) tipos.push("OFICIAL");

        const livre = !lab ||
            (a.timestamp >= lab.t + CFG.COOLDOWN_MIN * MIN && lab.atualR !== "ABERTA" && (lab.atualF ?? 0) <= a.timestamp);
        if (livre) tipos.push("LAB"); else ignoradas.cooldown++;

        for (const tipo of tipos) {
            const e = novaEntrada(tipo, `${tipo}_${a.id}`, par, a, dir, preRegistro);
            // reanálises: as análises deste par posteriores à entrada que já temos em mãos
            adicionarReanalises(e);
            registrarMudancas(deltas, e, atualizarVariantes(e, candles, agora));
            entradas.set(e.id, e);
            atualizarLab(e);
        }
    }

    return { entradas: [...entradas.values()], deltas, ultimoLab: lab, ignoradas };
}

// Reconstrói TODOS os contadores a partir das entradas gravadas (variantes já resolvidas).
// Serve para trocar a definição de um grupo sem perder dado e para recuperar contadores.
function contarEntradas(entradas, { tetos = [1, 2] } = {}) {
    const deltas = {};
    const todas = [...entradas, ...tetos.flatMap(K => aplicarTeto(entradas, K))];
    for (const e of todas) {
        const mudancas = [];
        const abertas = [];
        for (const [id, v] of Object.entries(e.variantes || {})) {
            if (v.r === "ABERTA") abertas.push(id);   // só informativo: casos ainda sem desfecho (viés de sobrevivência)
            if (v.r === "ABERTA" || v.r === "EXPIRADA" || v.r === "INVALIDA" || !Number.isFinite(v.p)) continue;
            mudancas.push({ variante: id, r: { pips: v.p, duracaoMin: v.d, ambiguo: v.amb === true } });
        }
        registrarMudancas(deltas, e, mudancas);
        for (const id of abertas) {
            for (const grupo of gruposDaEntrada(e)) {
                const chave = chaveContador(e.tipo, id, e.preRegistro, grupo);
                const d = deltas[chave] || (deltas[chave] = { tipo: e.tipo, variante: id, epoca: e.preRegistro ? "pre" : "pos", grupo, n: 0, pos: 0, neg: 0, zero: 0, pips: 0, dur: 0, amb: 0, ab: 0 });
                d.ab += 1;
            }
        }
    }
    return deltas;
}

// Teto de exposição (pendência da auditoria): "e se o app só mantivesse K sinais abertos por LADO
// DO DÓLAR ao mesmo tempo?". Sobre as entradas OFICIAL (o que virou sinal) em ordem de tempo:
// aceita a entrada se, naquele instante, houver menos de K aceitas e ainda abertas (variante ATUAL)
// do mesmo lado; cruzados (EUR/JPY...) não têm lado e passam sempre. Só mede - nada é bloqueado de verdade.
function aplicarTeto(entradas, K) {
    const base = entradas.filter(e => e.tipo === "OFICIAL").sort((a, b) => a.t - b.t);
    const aceitas = [];
    const resultado = [];
    for (const e of base) {
        const lado = ladoDolar(e.par, e.direcao);
        const abertas = lado === "cruzado" ? 0 : aceitas.filter(x => x.lado === lado &&
            (x.e.variantes.ATUAL.r === "ABERTA" || (x.e.variantes.ATUAL.f ?? Infinity) > e.t)).length;
        if (abertas < K) { aceitas.push({ e, lado }); resultado.push({ ...e, tipo: `OFICIAL_TETO${K}` }); }
    }
    return resultado;
}

module.exports = { aplicarTeto, paridadeDoId, contarEntradas, processarPar, direcaoDaAnalise, chaveContador, gruposDaEntrada, registrarMudancas, somarDelta };
