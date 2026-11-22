// ===================================================
// FOREX ASSIST - APOIO À DECISÃO ("Histórico real" no cartão do sinal ativo)
//
// Pedido do usuário (19-20/11/2026): o app não prevê o futuro; ele mostra, para o sinal que acabou de sair, o que aconteceu
// com sinais parecidos ANTES, e o usuário decide se entra. Inspirado no veredito honesto da "Máquina do Tempo" (6.57).
// O que mostra (sem prever nada):
//   - três recortes do histórico do app desde 04/10/2026 00:42Z (época atual, `regimeTPSL = CONFIG`, só WIN/LOSS fechadas):
//     este par; este horário (todos os pares, hora de Brasília do sinal ±1 h); geral.
//   - acerto com margem (intervalo de Wilson, 95%) e o EMPATE com custo deste sinal: (SL + spread) / (TP + SL), em pips.
//   - veredito por recorte: abaixo do empate (margem inteira abaixo), acima (margem inteira acima), indefinido (margem cruza),
//     amostra pequena (< 20).
//   - aviso fixo: medido pelo app; com o preço real da XM (bid/ask) o acerto foi 4 a 6 pontos menor (LABORATORIO 6.44/6.48/6.52).
// SOMENTE LEITURA: uma consulta a `historico` (timestamp >= época, campo único, sem índice composto), cache de 10 min.
// Não toca no pipeline de sinais.
// ===================================================

const DC_EPOCA_MS = Date.UTC(2026, 9, 4, 0, 42);
const DC_TTL_MS = 10 * 60 * 1000;
const DC_MIN_AMOSTRA = 20;
let dcCache = { t: 0, fechadas: null, todos: null };

const dcHoraBrt = (ms) => new Date(Number(ms) - 3 * 3600e3).getUTCHours();

function dcSelecionar(docs) {
    return docs.filter(s => Number(s.timestamp) >= DC_EPOCA_MS && s.financeiro && s.financeiro.regimeTPSL === "CONFIG"
        && s.status === "ENCERRADA" && (s.resultado === "WIN" || s.resultado === "LOSS"));
}

// intervalo de Wilson (95%) para uma proporção, em %
function dcWilson(win, n) {
    if (!n) return [null, null];
    const z = 1.96, p = win / n, z2 = z * z;
    const centro = (p + z2 / (2 * n)) / (1 + z2 / n);
    const meia = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n);
    return [100 * Math.max(0, centro - meia), 100 * Math.min(1, centro + meia)];
}

// empate (% de acerto) com custo para ESTE sinal: (SL + spread) / (TP + SL)
function dcEmpate(tpPips, slPips, spreadPips) {
    const tp = Math.abs(Number(tpPips)), sl = Math.abs(Number(slPips)), s = Number(spreadPips) || 0;
    return tp + sl > 0 ? 100 * (sl + s) / (tp + sl) : null;
}

function dcVeredito(lo, hi, n, empate) {
    if (n < DC_MIN_AMOSTRA) return { chave: "pequena", texto: "Amostra pequena" };
    if (empate === null) return { chave: "indef", texto: "Indefinido" };
    if (hi < empate) return { chave: "abaixo", texto: "Abaixo do empate" };
    if (lo > empate) return { chave: "acima", texto: "Acima do empate" };
    return { chave: "indef", texto: "Indefinido: a margem inclui o empate" };
}

function dcLinha(rotulo, lista, empate) {
    const n = lista.length, win = lista.filter(s => s.resultado === "WIN").length;
    const [lo, hi] = dcWilson(win, n);
    return { rotulo, n, win, acerto: n ? 100 * win / n : null, lo, hi, veredito: dcVeredito(lo, hi, n, empate) };
}

// fechadas: já selecionadas; sinal: o ativo (par, timestamp, financeiro.tpPips/slPips)
function dcResumo(fechadas, sinal, spreadPips) {
    const tp = sinal.financeiro ? sinal.financeiro.tpPips : null, sl = sinal.financeiro ? sinal.financeiro.slPips : null;
    const empate = dcEmpate(tp, sl, spreadPips);
    const h = dcHoraBrt(sinal.timestamp), horas = [(h + 23) % 24, h, (h + 1) % 24];
    const fmtH = (x) => String(x).padStart(2, "0") + "h";
    return {
        empate,
        linhas: [
            dcLinha(`${sinal.par}`, fechadas.filter(s => s.par === sinal.par), empate),
            dcLinha(`Das ${fmtH(horas[0])} às ${fmtH((h + 2) % 24)} (todos os pares)`, fechadas.filter(s => horas.includes(dcHoraBrt(s.timestamp))), empate),
            dcLinha("Geral (todos os sinais)", fechadas, empate)
        ]
    };
}

async function dcCarregar() {
    if (dcCache.fechadas && Date.now() - dcCache.t < DC_TTL_MS) return dcCache.fechadas;
    const snap = await db.collection("historico").where("timestamp", ">=", DC_EPOCA_MS).get();
    const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    const fechadas = dcSelecionar(docs);
    dcCache = { t: Date.now(), fechadas, todos: drSelecionar(docs) };
    return fechadas;
}

const dcPct = (x) => x === null || !Number.isFinite(x) ? "—" : Math.round(x) + "%";
// margem e empate com uma casa: com inteiros, "margem até 54%" e "empate 54%" pareciam se contradizer
const dcPct1 = (x) => x === null || !Number.isFinite(x) ? "—" : x.toFixed(1).replace(".", ",") + "%";

function dcHTML(resumo) {
    const cor = { abaixo: "var(--pa-perda)", acima: "var(--pa-ganho)", indef: "var(--pa-espera)", pequena: "var(--pa-muted)" };
    const linhas = resumo.linhas.map(l => `
        <li class="dc-linha">
            <div class="dc-rotulo">${l.rotulo}</div>
            <div class="dc-num pa-num">${dcPct(l.acerto)} <span class="dc-margem">de acerto · ${l.win} de ${l.n}</span></div>
            ${l.n ? `<div class="dc-margem">margem de ${dcPct1(l.lo)} a ${dcPct1(l.hi)}</div>` : ""}
            <div class="dc-veredito" style="color:${cor[l.veredito.chave]};">${l.veredito.texto}</div>
        </li>`).join("");
    return `
    <section class="pa-vidro dc-bloco" aria-labelledby="dc-tit">
        <p class="pa-eyebrow" id="dc-tit">Histórico real · você decide</p>
        <p class="pn-texto" style="margin-top:6px;">Para este sinal empatar, sinais assim precisam acertar <strong class="pa-num">${dcPct1(resumo.empate)}</strong> (já com o spread). O que aconteceu antes:</p>
        <ul class="dc-lista">${linhas}</ul>
        <p class="dc-nota">Medido pelo app desde 04/10/2026. Com o preço real da XM (bid/ask), o acerto foi de 4 a 6 pontos menor. É histórico, não previsão.</p>
    </section>`;
}

// ===================================================
// LIMITES DE RISCO (aprovados pelo usuário em 21/11/2026; números sugeridos por mim e aceitos: "vamos seguir assim").
// IMPORTANTE: o app NÃO sabe quais operações o usuário abriu de verdade enquanto estão abertas (a caixa "Operação Real" só liga depois
// do encerramento). Por isso as regras são calculadas sobre os SINAIS DO APP, que é o que o usuário segue ("seguir o que o app pede",
// 6.37), e são AVISO, não trava: o app não manda nem bloqueia ordem na corretora.
//   1. perda do dia: soma do resultado (US$) dos sinais fechados HOJE (Brasília) <= -US$ 15 (3 stops) -> fora do limite
//   2. posições abertas ao mesmo tempo: já >= 3 abertas -> fora do limite
//   3. mesmo lado do dólar: já >= 2 abertas apostando no mesmo lado (comprado/vendido; cruzados sem USD não contam) -> fora do limite
//   4. horário: 17h e 18h de Brasília (rollover, spread de 7 a 16 pips) -> fora do limite
// ===================================================
const DR_LIMITES = { perdaDiaUsd: 15, abertas: 3, mesmoLado: 2, horasProibidasBrt: [17, 18] };

const drLado = (par, direcao) => {
    const [base, cot] = String(par).split("/");
    const compra = /BUY|COMPRA/i.test(String(direcao));
    if (base === "USD") return compra ? "comprado" : "vendido";
    if (cot === "USD") return compra ? "vendido" : "comprado";
    return "cruzado";
};
const drDiaBrt = (ms) => new Date(Number(ms) - 3 * 3600e3).toISOString().slice(0, 10);

// sinais do app da época atual, qualquer estado, sem cooldown
function drSelecionar(docs) {
    return docs.filter(s => Number(s.timestamp) >= DC_EPOCA_MS && s.financeiro && s.financeiro.regimeTPSL === "CONFIG"
        && s.status !== "COOLDOWN" && s.origem !== "cooldown");
}

// docs: sinais do app (drSelecionar); sinal: o que está sendo avaliado; t: instante da avaliação (ms)
// aberta em t = abriu antes de t e (ainda ABERTA ou fechou depois de t); fechada hoje = fechou antes de t no mesmo dia (Brasília)
function drAvaliar(docs, sinal, t, limites = DR_LIMITES) {
    const outros = docs.filter(s => s.id !== sinal.id && Number(s.timestamp) < t);
    const abertas = outros.filter(s => s.status === "ABERTA" || (s.fimOperacao && Number(s.fimOperacao) > t));
    const fechadasHoje = outros.filter(s => s.status === "ENCERRADA" && Number(s.fimOperacao) <= t && drDiaBrt(s.fimOperacao) === drDiaBrt(t));
    const perda = fechadasHoje.reduce((a, s) => a + (Number(s.resultadoFinanceiro) || 0), 0);
    const lado = drLado(sinal.par, sinal.direcao);
    const mesmoLado = lado === "cruzado" ? 0 : abertas.filter(s => drLado(s.par, s.direcao) === lado).length;
    const hora = Number(new Date(t - 3 * 3600e3).getUTCHours());
    const regras = [
        { chave: "perdaDia", ok: !(perda <= -limites.perdaDiaUsd), texto: "Perda do dia",
          detalhe: `${perda < 0 ? "−" : perda > 0 ? "+" : ""}US$ ${Math.abs(perda).toFixed(2).replace(".", ",")} nos sinais fechados hoje · limite −US$ ${limites.perdaDiaUsd}` },
        { chave: "abertas", ok: abertas.length < limites.abertas, texto: "Posições abertas",
          detalhe: `${abertas.length} abertas agora · limite ${limites.abertas}` },
        { chave: "mesmoLado", ok: mesmoLado < limites.mesmoLado, texto: "Mesmo lado do dólar",
          detalhe: lado === "cruzado" ? "par sem USD: não conta" : `${mesmoLado} abertas apostando no dólar ${lado === "comprado" ? "forte" : "fraco"} · limite ${limites.mesmoLado}` },
        { chave: "horario", ok: !limites.horasProibidasBrt.includes(hora), texto: "Horário",
          detalhe: limites.horasProibidasBrt.includes(hora) ? "17h–19h de Brasília: spread do rollover de 7 a 16 pips" : "fora do rollover (17h–19h)" }
    ];
    return { ok: regras.every(r => r.ok), regras, abertas: abertas.length };
}

function drHTML(av) {
    const itens = av.regras.map(r => `
        <li class="dc-linha dr-linha">
            <div class="dc-rotulo">${r.ok ? "✓" : "⚠"} ${r.texto}</div>
            <div class="dc-margem">${r.detalhe}</div>
        </li>`).join("");
    return `
    <section class="pa-vidro dc-bloco" aria-labelledby="dr-tit">
        <p class="pa-eyebrow" id="dr-tit">Seus limites de risco</p>
        <p class="pn-texto" style="margin-top:6px;"><strong style="color:${av.ok ? "var(--pa-ganho)" : "var(--pa-perda)"};">${av.ok ? "Dentro dos limites" : "Fora dos limites"}</strong>${av.ok ? "" : ": melhor não entrar neste sinal"}</p>
        <ul class="dc-lista">${itens}</ul>
        <p class="dc-nota">Calculado sobre os sinais do app (o app não vê as suas ordens na XM). É um aviso: quem decide é você. Limites: perda do dia US$ 15, 3 abertas, 2 por lado do dólar, sem 17h–19h.</p>
    </section>`;
}

// ===================================================
// REGISTRO DA DECISÃO DO USUÁRIO ("Entrei" / "Não entrei"), 22/11/2026.
// Só registra: não manda ordem, não muda o sinal. Serve para, depois de semanas, comparar o resultado dos sinais em que o usuário entrou
// com o de pegar todos (se o "você decide" agrega valor). Regras que protegem a avaliação:
//   - só para sinal ainda ABERTO (decisão antes do desfecho); a hora (`em`) fica gravada;
//   - UMA decisão por sinal: depois de registrada não muda (nada de corrigir depois de ver o resultado).
// Campo novo no documento do sinal: decisaoUsuario = (entrei: bool, em: ms). Mesmo padrão de `operacaoReal` (update no doc do historico).
// ===================================================
function dcPodeDecidir(sinal) {
    return !!sinal && sinal.status !== "ENCERRADA" && !sinal.resultado && !sinal.decisaoUsuario;
}

function dcDecisaoHTML(sinal) {
    const d = sinal && sinal.decisaoUsuario;
    const hora = (ms) => new Date(Number(ms)).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
    if (d) {
        return `<section class="pa-vidro dc-bloco" aria-labelledby="dd-tit">
            <p class="pa-eyebrow" id="dd-tit">Sua decisão</p>
            <p class="pn-texto" style="margin-top:6px;">Você registrou: <strong>${d.entrei ? "Entrei" : "Não entrei"}</strong> às ${hora(d.em)}. Fica guardado para avaliarmos depois se escolher ajuda.</p>
        </section>`;
    }
    if (!dcPodeDecidir(sinal)) return "";
    return `<section class="pa-vidro dc-bloco" aria-labelledby="dd-tit">
        <p class="pa-eyebrow" id="dd-tit">Sua decisão</p>
        <p class="pn-texto" style="margin-top:6px;">Só registra o que você decidiu; não envia ordem. Vale uma vez por sinal.</p>
        <div class="dc-botoes">
            <button type="button" class="pa-btn start-btn" data-decisao="entrei">Entrei</button>
            <button type="button" class="pa-btn stop-btn" data-decisao="nao">Não entrei</button>
        </div>
        <p class="dc-nota" data-decisao-msg></p>
    </section>`;
}

// grava e devolve o documento atualizado; não sobrescreve decisão que já exista
async function dcRegistrarDecisao(id, entrei, agora = Date.now()) {
    const ref = db.collection("historico").doc(id);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("sinal não encontrado");
        const s = snap.data();
        if (s.decisaoUsuario) return { ...s, id };
        if (s.status === "ENCERRADA" || s.resultado) throw new Error("o sinal já encerrou: a decisão precisa vir antes do desfecho");
        const decisaoUsuario = { entrei: !!entrei, em: agora };
        tx.update(ref, { decisaoUsuario });
        return { ...s, id, decisaoUsuario };
    });
}

// export para os testes no Node (no navegador não existe `module`)
if (typeof module !== "undefined" && module.exports) module.exports = { dcPodeDecidir, dcDecisaoHTML, dcRegistrarDecisao, dcSelecionar, dcWilson, dcEmpate, dcVeredito, dcResumo, dcHTML, DC_EPOCA_MS, DR_LIMITES, drLado, drSelecionar, drAvaliar, drHTML };
