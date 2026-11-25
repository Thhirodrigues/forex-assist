// ===================================================
// FOREX ASSIST - MATÉRIAS-PRIMAS: CICLO AO VIVO (passo extra do scanner; pré-registro 6.78)
// 1) lê as velas M1 que o MT5 enviou ao LAB (`xm_barras/<símbolo>`); 2) decide entradas novas com o avaliador do Lab (mesma função do offline)
// e grava em `historico_materias` (coleção SEPARADA do `historico` do forex); 3) julga os sinais abertos com as velas (P1 = a ordem real, P2 e P3
// virtuais); 4) avisa por push na abertura (só se o ativo não tinha outro sinal aberto) e no encerramento. Nunca toca em `historico`.
// Sem velas novas (MT5 parado) não decide nada. Primeiro ciclo só inicia o estado (sem backfill). Idempotente: o id do sinal é `<ms>_<ativo>`.
// ===================================================
const { parseBarras } = require("./barras");
const motor = require("./motor");
const mat = require("../../lab/materias");

const ATIVOS = Object.keys(mat.ATIVOS);
const VELAS_VELHAS_MIN = 15, SEM_DADOS_H = 20;

async function executar({ lerBarras, bd, avisar, agora = Date.now(), log = console.log }) {
    const resumo = { criados: 0, descartados: [], encerrados: 0, atualizados: 0, velhas: [], erros: [] };
    const dados = {};
    for (const ativo of ATIVOS) {
        try {
            const p = parseBarras(await lerBarras(ativo), { agoraMs: agora });
            if (!p || p.barras.length < mat.PARAMS.HIST_SPREAD + 1) { resumo.erros.push(`${ativo}: sem velas suficientes`); continue; }
            dados[ativo] = p;
            const ultima = p.barras[p.barras.length - 1].ms, idade = (agora - ultima) / 60000;
            if (idade > VELAS_VELHAS_MIN) { resumo.velhas.push({ ativo, minutos: Math.round(idade) }); log(`${ativo}: última vela há ${Math.round(idade)} min (MT5 parado ou mercado fechado): nada a decidir`); continue; }
            const est = await bd.lerEstado(ativo);
            if (!est || !Number.isFinite(est.ultimaBarraMs)) { await bd.gravarEstado(ativo, { ultimaBarraMs: ultima }); log(`${ativo}: estado iniciado (sem backfill)`); continue; }
            const { sinais, descartados } = motor.novosSinais(p.barras, ativo, p.meta, { aposMs: est.ultimaBarraMs });
            resumo.descartados.push(...descartados.map(d => ({ ativo, ...d })));
            for (const s of sinais) {
                const abertosAntes = await bd.contarAbertos(ativo);
                if (await bd.criar(s.id, s)) { resumo.criados++; log(`${ativo}: novo sinal ${s.direcao} lote ${s.lote} alvo ${s.financeiro.tpPreco} stop ${s.financeiro.slPreco}`); if (abertosAntes === 0) await avisar.abertura(s); }
            }
            await bd.gravarEstado(ativo, { ultimaBarraMs: ultima, atualizadoEm: new Date(agora).toISOString() });
        } catch (e) { resumo.erros.push(`${ativo}: ${e.message}`); }
    }
    for (const doc of await bd.listarPendentes()) {
        try {
            const p = dados[doc.par]; if (!p) continue;
            const r = motor.julgarSinal(doc, p.barras, p.meta);
            if (r.estado !== "OK") {
                if (doc.status === "ABERTA" && agora - doc.timestamp > SEM_DADOS_H * 3600e3) { await bd.atualizar(doc.id, { status: "ENCERRADA", resultado: "SEM_DADOS", fimOperacao: agora, politicasPendentes: false }); resumo.encerrados++; }
                continue;
            }
            const pol = r.politicas, p1 = pol.P1;
            const patch = { politicas: pol, flutuanteUsd: r.flutuanteUsd, precoAtual: r.precoAtual, atualizadoEm: new Date(agora).toISOString(), politicasPendentes: ["P2", "P3"].some(k => pol[k].estado === "ABERTA") };
            const fecha = doc.status === "ABERTA" && p1.estado !== "ABERTA";
            if (fecha) Object.assign(patch, { status: "ENCERRADA", resultado: p1.estado, resultadoFinanceiro: p1.usd, resultadoR: p1.r, fimOperacao: p1.fimMs, motivoFechamento: p1.motivo, tempoOperacao: p1.fimMs - doc.timestamp });
            await bd.atualizar(doc.id, patch); resumo.atualizados++;
            if (fecha) { resumo.encerrados++; await avisar.encerramento({ ...doc, ...patch }); }
        } catch (e) { resumo.erros.push(`${doc.id}: ${e.message}`); }
    }
    return resumo;
}

module.exports = { executar, ATIVOS };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const oficial = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }, "mat_oficial");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }, "mat_lab").firestore();
        const db = oficial.firestore(), col = db.collection("historico_materias");
        const push = require("../pushNotifier");
        const nome = (s) => `${s.par} ${s.direcao === "BUY" ? "COMPRA" : "VENDA"}`;
        const enviar = async (title, body, s, tipo) => {
            try { await push.enviarParaTokens(oficial, db, await push.obterTokensAtivos(db), { notification: { title, body }, data: { url: push.urlXmParaPar(s.par), tipo, emitidoEm: String(s.timestamp), par: s.par, direcao: s.direcao }, webpush: { headers: { Urgency: "high", TTL: "600" } } }); }
            catch (e) { console.log(`Aviso: falha no push: ${e.message}`); }
        };
        const avisar = {
            abertura: (s) => enviar(`🧪 TESTE · ${nome(s)}`, `Alvo US$ ${s.financeiro.tpUsd} · Stop US$ ${s.financeiro.slUsd} · lote ${s.lote}. Sinal de teste na conta demo.`, s, "materias_abertura"),
            encerramento: (s) => enviar(`🧪 TESTE · ${nome(s)} ${s.resultado === "WIN" ? "✅ WIN" : "❌ LOSS"}`, `Resultado US$ ${s.resultadoFinanceiro} (${s.resultadoR} R) · ${s.motivoFechamento}`, s, "materias_encerramento")
        };
        const bd = {
            lerEstado: async (a) => { const d = await db.collection("materias_estado").doc(a).get(); return d.exists ? d.data() : null; },
            gravarEstado: (a, x) => db.collection("materias_estado").doc(a).set(x, { merge: true }),
            contarAbertos: async (a) => (await col.where("par", "==", a).where("status", "==", "ABERTA").get()).size,
            criar: async (id, doc) => { try { await col.doc(id).create(doc); return true; } catch (e) { if (e.code === 6 || /already exists/i.test(String(e.message))) return false; throw e; } },
            atualizar: (id, patch) => col.doc(id).update(patch),
            listarPendentes: async () => {
                const m = new Map();
                for (const q of [col.where("status", "==", "ABERTA"), col.where("politicasPendentes", "==", true)]) (await q.get()).forEach(d => m.set(d.id, { id: d.id, ...d.data() }));
                return [...m.values()];
            }
        };
        const lerBarras = async (a) => { const d = await lab.collection("xm_barras").doc(a).get(); return d.exists ? String(d.data().json || "") : ""; };
        const r = await executar({ lerBarras, bd, avisar });
        console.log(`MATERIAS ciclo = ${JSON.stringify(r).replace(/{/g, "(").replace(/}/g, ")")}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
