// ===================================================
// FOREX ASSIST - FILA DE SINAIS PARA O EXECUTOR DA CONTA DEMO XM (mt5/XM_Executor.mq5)
//
// Copia os sinais OFICIAIS ainda abertos e recentes do `historico` (banco oficial, trancado) para UM documento do projeto LAB
// (`xm_exec/fila_<token>`), que o EA lê sem credencial: o id do documento contém o token secreto (regra do LAB: só `get`, nunca `list`).
// SOMENTE LEITURA do oficial; escreve só no LAB. Não toca no scanner nem no sinal.
// Formato de texto (sem aspas nem barras, para o EA analisar sem biblioteca de JSON):
//   v1;<gmt_seg>;ID|SIMBOLO|B/S|t_seg|preco|tp_pips|sl_pips|lote;ID|...
// ===================================================

const IDADE_MAX_MIN = 30;   // só entram na fila sinais emitidos há até 30 min (o EA ainda aplica o seu próprio limite)

const num = (x, casas = 5) => (Number.isFinite(Number(x)) ? String(Number(Number(x).toFixed(casas))) : null);
const simbolo = (par) => String(par || "").replace("/", "").toUpperCase();

function montarFila(sinais, agoraMs, { marcoMs = 0, idadeMaxMin = IDADE_MAX_MIN } = {}) {
    const itens = [];
    for (const s of sinais) {
        if (s.status !== "ABERTA") continue;
        const ini = Number(s.inicioOperacao);
        if (!Number.isFinite(ini) || ini < marcoMs || agoraMs - ini > idadeMaxMin * 60000 || ini > agoraMs + 60000) continue;
        if (s.direcao !== "BUY" && s.direcao !== "SELL") continue;
        const f = s.financeiro || {};
        const campos = [s.id, simbolo(s.par), s.direcao === "BUY" ? "B" : "S", String(Math.floor(ini / 1000)), num(s.precoEntrada), num(f.tpPips, 1), num(f.slPips, 1), num(s.lote, 2)];
        if (campos.some(c => c === null || c === "" || /[|;"\\]/.test(c))) continue;   // sinal incompleto ou com caractere que quebraria o formato: fora
        itens.push({ t: ini, texto: campos.join("|") });
    }
    itens.sort((a, b) => a.t - b.t);
    return `v1;${Math.floor(agoraMs / 1000)};${itens.map(i => i.texto).join(";")}`;
}

const docIdDaFila = (token) => `fila_${token}`;

module.exports = { montarFila, docIdDaFila, simbolo, IDADE_MAX_MIN };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const { MARCO_TESTE_UTC } = require("./ler");
        const { TOKEN_VALIDO } = require("../../lab/publicar-regras");
        const token = (process.env.XM_INGEST_TOKEN || "").trim();
        if (!TOKEN_VALIDO.test(token)) throw new Error("XM_INGEST_TOKEN ausente ou inválido");
        const oficial = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }, "oficial").firestore();
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }, "lab").firestore();
        const agora = Date.now();
        const snap = await oficial.collection("historico").where("status", "==", "ABERTA").get();
        const sinais = []; snap.forEach(d => sinais.push({ id: d.id, ...d.data() }));
        const texto = montarFila(sinais, agora, { marcoMs: Date.parse(MARCO_TESTE_UTC) });
        await lab.collection("xm_exec").doc(docIdDaFila(token)).set({ json: texto, em: new Date(agora).toISOString() });
        const n = texto.split(";").slice(2).filter(Boolean).length;
        console.log(`fila atualizada: ${n} sinal(is) recente(s) aberto(s) de ${sinais.length} abertos no total (token e texto da fila não são impressos)`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
