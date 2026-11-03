// ===================================================
// FOREX ASSIST - leitura do que o exportador MT5 (mt5/XM_Exporter.mq5) gravou em `xm_conta` (projeto LAB).
// SOMENTE LEITURA e sem tocar no sinal oficial. Funções puras + CLI.
//
// Formato gravado pelo EA (cada documento tem t, em e `json` = texto JSON):
//   xm_conta/estado     -> {v,gmt,srv,off,conta:{balance,equity,margin,free,nivel,moeda,alav},pos:[{tk,sym,tipo,vol,px,sl,tp,atual,lucro,swap,t}]}
//   xm_conta/d_AAAAMMDD -> {v,dia,deals:[{id,t,tipo,ent,pos,sym,vol,px,sl,tp,lucro,swap,com,fee,razao,cmt}]}
// Horários `t` dos deals/posições = hora do SERVIDOR da corretora (segundos); UTC = t - off (off vem do estado).
// ===================================================

const TIPO_DEAL = { 0: "BUY", 1: "SELL", 2: "BALANCE", 3: "CREDIT", 4: "CHARGE", 5: "CORRECTION", 6: "BONUS", 7: "COMMISSION" };
const RAZAO = { 0: "CLIENTE", 1: "MOBILE", 2: "WEB", 3: "EXPERT", 4: "SL", 5: "TP", 6: "STOPOUT", 7: "ROLLOVER", 8: "VMARGIN", 9: "SPLIT" };
const ENT_ABRE = new Set([0]);            // DEAL_ENTRY_IN
const ENT_FECHA = new Set([1, 2, 3]);     // OUT, INOUT, OUT_BY

// "EURUSD", "EURUSD#", "EURUSD.r" -> "EUR/USD"; desconhecido -> null
function normalizarPar(sym) {
    const m = /^([A-Za-z]{3})([A-Za-z]{3})/.exec(String(sym || ""));
    return m ? `${m[1].toUpperCase()}/${m[2].toUpperCase()}` : null;
}

function lerJson(doc) {
    try { return JSON.parse(doc && doc.json); } catch { return null; }
}

// docs: [{id, json, em}] (como vêm do Firestore)
function organizar(docs) {
    let estado = null;
    const deals = new Map();     // id do deal -> deal (reenvios dos mesmos dias não duplicam)
    const dias = [];
    for (const d of docs) {
        const j = lerJson(d);
        if (!j) continue;
        if (d.id === "estado") estado = { ...j, gravadoEm: d.em || null };
        else if (/^d_\d{8}$/.test(d.id) && Array.isArray(j.deals)) {
            dias.push(d.id);
            for (const x of j.deals) deals.set(String(x.id), x);
        }
    }
    return { estado, deals: [...deals.values()].sort((a, b) => a.t - b.t || Number(a.id) - Number(b.id)), dias: dias.sort() };
}

// Emparelha abertura e fechamento por posição. Posição sem abertura no que foi exportado (aberta antes da janela) sai com `semAbertura`.
function parear(deals, off = 0) {
    const porPos = new Map();
    const saldos = [];
    for (const d of deals) {
        if (d.tipo === 0 || d.tipo === 1) {
            const k = String(d.pos);
            if (!porPos.has(k)) porPos.set(k, { pos: k, entradas: [], saidas: [] });
            (ENT_ABRE.has(d.ent) ? porPos.get(k).entradas : ENT_FECHA.has(d.ent) ? porPos.get(k).saidas : []).push(d);
        } else {
            saldos.push({ id: String(d.id), tUtc: d.t - off, tipo: TIPO_DEAL[d.tipo] || `TIPO_${d.tipo}`, valor: Number(d.lucro) + Number(d.com || 0) + Number(d.fee || 0) + Number(d.swap || 0), cmt: d.cmt || "" });
        }
    }
    const fechadas = [], abertasNaJanela = [];
    for (const p of porPos.values()) {
        if (!p.saidas.length) { abertasNaJanela.push(p.pos); continue; }
        const ent = p.entradas[0], sai = p.saidas[p.saidas.length - 1];
        const lucro = [...p.entradas, ...p.saidas].reduce((a, x) => a + Number(x.lucro || 0), 0);
        const swap = [...p.entradas, ...p.saidas].reduce((a, x) => a + Number(x.swap || 0), 0);
        const com = [...p.entradas, ...p.saidas].reduce((a, x) => a + Number(x.com || 0) + Number(x.fee || 0), 0);
        // o deal de SAÍDA de uma compra é do tipo SELL (e vice-versa): a direção da posição é a do deal de ENTRADA
        const dirTipo = ent ? ent.tipo : (sai.tipo === 0 ? 1 : 0);
        fechadas.push({
            pos: p.pos, par: normalizarPar((ent || sai).sym), simbolo: (ent || sai).sym,
            direcao: dirTipo === 0 ? "BUY" : "SELL", lote: Number((ent || sai).vol),
            abertoUtc: ent ? ent.t - off : null, fechadoUtc: sai.t - off,
            precoEntrada: ent ? Number(ent.px) : null, precoSaida: Number(sai.px),
            sl: ent ? Number(ent.sl) || null : null, tp: ent ? Number(ent.tp) || null : null,
            lucro: Number(lucro.toFixed(2)), swap: Number(swap.toFixed(2)), comissao: Number(com.toFixed(2)),
            liquido: Number((lucro + swap + com).toFixed(2)), motivo: RAZAO[sai.razao] || `RAZAO_${sai.razao}`,
            semAbertura: !ent
        });
    }
    fechadas.sort((a, b) => a.fechadoUtc - b.fechadoUtc);
    return { fechadas, saldos, abertasNaJanela };
}

function resumir({ estado, deals, dias }, agoraMs = Date.now()) {
    const off = estado ? Number(estado.off) || 0 : 0;
    const { fechadas, saldos, abertasNaJanela } = parear(deals, off);
    const somaLiq = fechadas.reduce((a, x) => a + x.liquido, 0);
    const somaSaldos = saldos.reduce((a, x) => a + x.valor, 0);
    const calc = Number((somaSaldos + somaLiq).toFixed(2));
    const bal = estado ? estado.conta.balance : null;
    const idadeS = estado ? Math.round(agoraMs / 1000 - estado.gmt) : null;
    return {
        estadoEm: estado ? new Date(estado.gmt * 1000).toISOString() : null,
        idadeEstadoMin: idadeS === null ? null : Math.round(idadeS / 6) / 10,
        conta: estado ? estado.conta : null,
        posicoesAbertas: estado ? estado.pos.length : null,
        diasExportados: dias.length, fechadas: fechadas.length,
        semAbertura: fechadas.filter(x => x.semAbertura).length,
        movimentosDeSaldo: saldos.length, somaMovimentosDeSaldo: Number(somaSaldos.toFixed(2)),
        somaLiquidoFechadas: Number(somaLiq.toFixed(2)),
        balanceCalculado: calc, balanceReal: bal,
        // se a janela exportada cobre a vida inteira da conta, a diferença deve ser ~0; senão há histórico fora da janela
        diferencaBalance: bal === null ? null : Number((bal - calc).toFixed(2)),
        // detalhe para auditar a origem do saldo e achar o marco de partida do teste (último ajuste de saldo)
        movimentos: saldos.map(x => ({ emUtc: new Date(x.tUtc * 1000).toISOString(), tipo: x.tipo, valor: Number(x.valor.toFixed(2)), cmt: x.cmt })),
        primeiroFechamentoUtc: fechadas.length ? new Date(fechadas[0].fechadoUtc * 1000).toISOString() : null,
        ultimoFechamentoUtc: fechadas.length ? new Date(fechadas[fechadas.length - 1].fechadoUtc * 1000).toISOString() : null,
        porDia: fechadas.reduce((m, x) => { const d = new Date(x.fechadoUtc * 1000).toISOString().slice(0, 10); const o = (m[d] = m[d] || { n: 0, liquido: 0 }); o.n++; o.liquido = Number((o.liquido + x.liquido).toFixed(2)); return m; }, {}),
        porMotivo: fechadas.reduce((m, x) => ((m[x.motivo] = (m[x.motivo] || 0) + 1), m), {}),
        porPar: fechadas.reduce((m, x) => ((m[x.par || "?"] = Number(((m[x.par || "?"] || 0) + x.liquido).toFixed(2))), m), {})
    };
}

module.exports = { normalizarPar, organizar, parear, resumir, TIPO_DEAL, RAZAO };

if (require.main === module) {
    (async () => {
        const fs = require("fs");
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccountLab.json")) }, "lab").firestore();
        const snap = await lab.collection("xm_conta").get();
        const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        if (!docs.length) { console.log("xm_conta está vazia: o exportador ainda não gravou nada (EA fora do ar, WebRequest não liberado ou token diferente do secret)."); return; }
        const org = organizar(docs);
        const r = resumir(org);
        console.log(JSON.stringify(r, null, 2));
        const pasta = process.env.XM_SAIDA;
        if (pasta) {
            fs.mkdirSync(pasta, { recursive: true });
            const off = org.estado ? Number(org.estado.off) || 0 : 0;
            fs.writeFileSync(`${pasta}/xm_resumo.json`, JSON.stringify(r, null, 2));
            fs.writeFileSync(`${pasta}/xm_operacoes.json`, JSON.stringify({ estado: org.estado, ...parear(org.deals, off) }));
        }
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
