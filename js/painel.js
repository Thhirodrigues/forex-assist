// ===================================================
// FOREX ASSIST - PAINEL (direção visual "Aurora Glass")
//
// Componentes copiados do projeto aprovado (Lovable, repositório
// Thhirodrigues/forex-assist-visuals): cartão de sinal com anel,
// saldo e resultado do dia, curva de saldo com períodos e operações
// recentes com detalhe. Aqui eles são alimentados com DADOS REAIS
// do Firestore, sem inventar nada:
//
//   - Sinal ativo   = operação mais recente SEM `resultado` (pendente)
//                     aberta há menos de 24h. Sem ela: estado "Espera".
//   - Anel          = `score` (0-100) do sinal. O protótipo o chama de
//                     "RMI"; aqui o rótulo é SCORE, porque RMI é o nome
//                     da inteligência do app inteira, não um número
//                     (ver DOCUMENTACAO/ESTADO_ATUAL.md, seção 1).
//   - Stop / Alvo   = `slUSD` / `tpUSD` (o sistema guarda em dólar, não
//                     em preço) e Entrada = `precoEntrada`.
//   - Saldo         = Conta Simulada (`configuracoes/geral.saldoSimulado`).
//   - Hoje          = soma de `resultadoFinanceiro` das operações
//                     fechadas hoje (fuso de Brasília).
//   - Curva         = `saldoDepois` de cada operação fechada no período
//                     (gravado pelo js/checker.js).
//   - Recentes      = 3 últimas operações fechadas.
//
// Custo: UMA consulta a `historico` (últimas 200, orderBy timestamp,
// sem índice composto) + 1 leitura da config, com cache de 60s em
// memória - trocar de aba e voltar não lê de novo.
// ===================================================

const PN_LIMITE_HISTORICO = 200;
const PN_TTL_CACHE_MS = 60 * 1000;
const PN_JANELA_ATIVO_MS = 24 * 60 * 60 * 1000;

const PN_PERIODOS = ["1D", "1S", "1M", "3M", "Tudo"];
const PN_DIAS_PERIODO = { "1D": 1, "1S": 7, "1M": 30, "3M": 90, "Tudo": Infinity };

let pnPeriodo = "1D";
let pnCache = { t: 0, dados: null };
let pnSeqGradiente = 0;

// ---------- tons (mesmos do protótipo) ----------
const PN_TOM = {
    compra: { cor: "var(--pa-ganho)",  fundo: "var(--pa-ganho-suave)",  rotulo: "Compra" },
    venda:  { cor: "var(--pa-perda)",  fundo: "var(--pa-perda-suave)",  rotulo: "Venda" },
    espera: { cor: "var(--pa-espera)", fundo: "oklch(0.88 0.12 92 / 18%)", rotulo: "Espera" }
};

const PN_ICONE = {
    compra: '<path d="M7 17L17 7M8 7h9v9"/>',
    venda:  '<path d="M7 7l10 10M17 8v9H8"/>',
    espera: '<path d="M7 4h10M7 20h10"/><path d="M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18"/>'
};

function pnSvgIcone(nome, tam, traco) {
    return `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="${traco}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PN_ICONE[nome]}</svg>`;
}

// ---------- formatação ----------
function pnHora(ts) {
    return new Date(ts).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function pnDiaBrasilia(ts) {
    return new Date(ts).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function pnDuracao(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return "";
    const min = Math.max(1, Math.round(n / 60000));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

const PN_FMT_PIPS = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PN_FMT_PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function pnPips(v) {
    const t = tokenResultadoPainel(v);
    return `${t.sinal}${PN_FMT_PIPS.format(Math.abs(Number(v) || 0))} pips`;
}

function pnPct(v) {
    const t = tokenResultadoPainel(v);
    return `${t.sinal}${PN_FMT_PCT.format(Math.abs(Number(v) || 0))}%`;
}

function pnPreco(valor, par) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return "—";
    return typeof formatarPrecoPar === "function"
        ? formatarPrecoPar(n, par)
        : n.toFixed(String(par || "").includes("JPY") ? 3 : 5);
}

// ---------- dados ----------
function pnEhCooldown(o) {
    return o.status === "COOLDOWN" || o.origem === "cooldown";
}

function pnDirecao(o) {
    return o.direcao === "BUY" ? "compra" : "venda";
}

async function pnCarregar() {

    if (pnCache.dados && Date.now() - pnCache.t < PN_TTL_CACHE_MS) return pnCache.dados;

    const [cfgSnap, histSnap] = await Promise.all([
        db.collection("configuracoes").doc("geral").get(),
        db.collection("historico").orderBy("timestamp", "desc").limit(PN_LIMITE_HISTORICO).get()
    ]);

    const cfg = cfgSnap.exists ? cfgSnap.data() : {};

    const ops = [];
    histSnap.forEach(doc => {
        const o = { id: doc.id, ...doc.data() };
        if (!pnEhCooldown(o) && Number.isFinite(Number(o.timestamp))) ops.push(o);
    });

    const dados = {
        saldo: Number(cfg.saldoSimulado ?? cfg.saldoInicial ?? 0),
        ops,
        // se veio o máximo, o começo do período mais longo pode estar cortado
        truncado: histSnap.size >= PN_LIMITE_HISTORICO
    };

    pnCache = { t: Date.now(), dados };

    return dados;

}

function pnFechadas(ops) {
    return ops
        .filter(o => o.resultado === "WIN" || o.resultado === "LOSS")
        .sort((a, b) => a.timestamp - b.timestamp);
}

function pnSinalAtivo(ops) {
    const agora = Date.now();
    return ops.find(o => !o.resultado && agora - o.timestamp < PN_JANELA_ATIVO_MS) || null;
}

function pnResumoHoje(fechadas, saldo) {

    const hoje = hojeBrasilStr();
    const doDia = fechadas.filter(o => pnDiaBrasilia(o.timestamp) === hoje);
    const usd = Number(doDia.reduce((s, o) => s + Number(o.resultadoFinanceiro || 0), 0).toFixed(2));
    const base = saldo - usd;

    return { usd, n: doDia.length, pct: base > 0 ? (usd / base) * 100 : 0 };

}

function pnCurva(fechadas, periodo, saldo) {

    let janela = fechadas;

    if (periodo === "1D") {
        const hoje = hojeBrasilStr();
        janela = fechadas.filter(o => pnDiaBrasilia(o.timestamp) === hoje);
    } else if (PN_DIAS_PERIODO[periodo] !== Infinity) {
        const corte = Date.now() - PN_DIAS_PERIODO[periodo] * 24 * 60 * 60 * 1000;
        janela = fechadas.filter(o => o.timestamp >= corte);
    }

    if (janela.length < 1) return null;

    const temSaldos = janela.every(o => Number.isFinite(Number(o.saldoDepois)));
    const variacao = Number(janela.reduce((s, o) => s + Number(o.resultadoFinanceiro || 0), 0).toFixed(2));

    let valores;

    if (temSaldos) {
        const inicio = Number.isFinite(Number(janela[0].saldoAntes))
            ? Number(janela[0].saldoAntes)
            : Number(janela[0].saldoDepois) - Number(janela[0].resultadoFinanceiro || 0);
        valores = [inicio, ...janela.map(o => Number(o.saldoDepois))];
    } else {
        // sem saldos gravados: reconstrói de trás pra frente a partir do saldo atual
        let acc = saldo;
        valores = [acc];
        for (let i = janela.length - 1; i >= 0; i--) {
            acc -= Number(janela[i].resultadoFinanceiro || 0);
            valores.unshift(acc);
        }
    }

    const base = valores[0];

    return { valores, variacao, pct: base > 0 ? (variacao / base) * 100 : 0, n: janela.length };

}

// ---------- componentes ----------
function pnAnelHTML(valor, { tamanho = 104, espessura = 9, cor, legenda = "Score" } = {}) {

    const raio = (tamanho - espessura) / 2;
    const circ = 2 * Math.PI * raio;
    const c = tamanho / 2;
    const v = Math.max(0, Math.min(100, Math.round(valor)));

    return `
        <div class="pn-anel" style="width:${tamanho}px;height:${tamanho}px;--pn-cor:${cor};" role="img" aria-label="Score do sinal: ${v} por cento">
            <div class="pn-anel-brilho" aria-hidden="true"></div>
            <svg width="${tamanho}" height="${tamanho}" aria-hidden="true">
                <circle cx="${c}" cy="${c}" r="${raio}" fill="none" stroke="var(--pa-vidro-forte)" stroke-width="${espessura}"></circle>
                <circle class="pn-anel-valor" cx="${c}" cy="${c}" r="${raio}" fill="none" stroke="${cor}" stroke-width="${espessura}"
                    stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${circ.toFixed(2)}"
                    data-alvo="${(circ * (1 - v / 100)).toFixed(2)}"></circle>
            </svg>
            <div class="pn-anel-txt">
                <span class="pa-num" style="font-size:${Math.max(15, tamanho * 0.235).toFixed(1)}px;">${v}%</span>
                ${legenda ? `<span class="pn-anel-leg">${legenda}</span>` : ""}
            </div>
        </div>`;

}

function pnSparkHTML(valores, cor, altura) {

    const id = "pn-g-" + (++pnSeqGradiente);
    const L = 100, A = 40;
    const min = Math.min(...valores), max = Math.max(...valores);
    const span = max - min || 1;

    const pts = valores.map((v, i) => ({
        x: (i / (valores.length - 1)) * L,
        y: A - ((v - min) / span) * (A - 4) - 2
    }));

    const linha = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const ult = pts[pts.length - 1];

    return `
        <svg class="pn-spark" viewBox="0 0 ${L} ${A}" preserveAspectRatio="none" style="height:${altura}px;" aria-hidden="true">
            <defs>
                <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${cor}" stop-opacity="0.32"></stop>
                    <stop offset="100%" stop-color="${cor}" stop-opacity="0"></stop>
                </linearGradient>
            </defs>
            <path class="pn-spark-area" d="${linha} L${L},${A} L0,${A} Z" fill="url(#${id})"></path>
            <path class="pn-spark-linha" d="${linha}" fill="none" stroke="${cor}" stroke-width="1.1"
                stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
                pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"></path>
            <circle class="pn-spark-ponto" cx="${ult.x}" cy="${ult.y}" r="1.6" fill="${cor}" vector-effect="non-scaling-stroke"></circle>
        </svg>`;

}

function pnAnimar(raiz) {

    // anel e curva partem do vazio; CSS desliga as transições com prefers-reduced-motion
    requestAnimationFrame(() => requestAnimationFrame(() => {
        raiz.querySelectorAll(".pn-anel-valor").forEach(c => { c.style.strokeDashoffset = c.getAttribute("data-alvo"); });
        raiz.querySelectorAll(".pn-spark").forEach(s => s.classList.add("pn-spark--desenhado"));
    }));

}

// contagem suave até o valor final (desliga com prefers-reduced-motion)
function pnContar(el, valor, formatar) {

    if (!el) return;

    const reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduzido) { el.textContent = formatar(valor); return; }

    const inicio = performance.now();

    const passo = (agora) => {
        const t = Math.min(1, (agora - inicio) / 900);
        const e = 1 - Math.pow(1 - t, 3);
        el.textContent = formatar(valor * e);
        if (t < 1 && document.body.contains(el)) requestAnimationFrame(passo);
    };

    requestAnimationFrame(passo);

}

// ---------- seções ----------
// AJUSTE-068 (03/10/2026): com o mercado de forex fechado (sexta 17:00 a domingo 17:00,
// Nova York) o scanner não procura nada e o verificador não consulta - "Sem sinal agora"
// enganava (parecia que o scanner estava procurando). Regra única em
// scripts/horarioMercado.js; sem ela carregada, assume aberto (comportamento de antes).
function pnMercadoFechado() {
    const h = window.horarioMercado;
    return Boolean(h) && !h.mercadoForexAberto();
}

function pnTextoReabertura() {
    const h = window.horarioMercado;
    const t = h && h.proximaAberturaForex ? h.proximaAberturaForex() : null;
    if (!t) return "";
    const dia = new Date(t).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });
    const hora = new Date(t).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
    return `Reabre ${dia} às ${hora} (Brasília).`;
}

function pnHeroHTML(sinal) {

    if (!sinal) {
        const fechado = pnMercadoFechado();
        const t = PN_TOM.espera;
        return `
        <section class="pa-vidro pa-vidro--forte pn-hero pn-surgir" style="--pn-cor:${t.cor};--pn-fundo:${t.fundo};" aria-labelledby="pn-tit-sinal">
            <div class="pn-glow" aria-hidden="true"></div>
            <div class="pn-hero-grade">
                <div class="pn-min0">
                    <p class="pa-eyebrow" id="pn-tit-sinal">${fechado ? "Mercado fechado" : "Sem sinal agora"}</p>
                    <span class="pn-badge" style="margin-top:12px;">${pnSvgIcone("espera", 16, 2.6)}${fechado ? "Fechado" : t.rotulo}</span>
                </div>
            </div>
            <div class="pn-hero-base">
                <p class="pn-texto">${fechado
                    ? `O mercado de forex está fechado (sexta 17h a domingo 17h, horário de Nova York). O scanner não procura sinais agora. ${pnTextoReabertura()}`
                    : "Nenhum sinal aberto no momento. O scanner segue observando o mercado e avisa quando surgir um sinal."}</p>
            </div>
        </section>`;
    }

    const dir = pnDirecao(sinal);
    const t = PN_TOM[dir];
    const score = Number(sinal.score);
    const tp = Number(sinal.tpUSD), sl = Number(sinal.slUSD);
    const perfil = sinal.perfil ? ` · ${String(sinal.perfil).toLowerCase()}` : "";

    return `
    <section class="pa-vidro pa-vidro--forte pn-hero pn-surgir" style="--pn-cor:${t.cor};--pn-fundo:${t.fundo};" aria-labelledby="pn-tit-sinal">
        <div class="pn-glow" aria-hidden="true"></div>
        <div class="pn-hero-grade">
            <div class="pn-min0">
                <p class="pa-eyebrow" id="pn-tit-sinal">Sinal ativo${perfil}</p>
                <h2 class="pa-num pn-par">${sinal.par}</h2>
                <span class="pn-badge" style="margin-top:12px;">${pnSvgIcone(dir, 16, 2.6)}${t.rotulo}</span>
            </div>
            ${Number.isFinite(score) ? pnAnelHTML(score, { cor: t.cor }) : ""}
        </div>
        <div class="pn-hero-base">
            <dl class="pn-niveis">
                <div><dt>Entrada</dt><dd class="pa-num" style="color:var(--pa-fg);">${pnPreco(sinal.precoEntrada, sinal.par)}</dd></div>
                <div><dt>Stop</dt><dd class="pa-num" style="color:var(--pa-perda);">${Number.isFinite(sl) ? "−US$ " + FORMATO_MOEDA_PAINEL.format(Math.abs(sl)) : "—"}</dd></div>
                <div><dt>Alvo</dt><dd class="pa-num" style="color:var(--pa-ganho);">${Number.isFinite(tp) ? "+US$ " + FORMATO_MOEDA_PAINEL.format(Math.abs(tp)) : "—"}</dd></div>
            </dl>
            <p class="pn-atualizado pa-num-sans">Aberto às ${pnHora(sinal.timestamp)}${sinal.lote ? ` · lote ${sinal.lote}` : ""}</p>
            ${pnMercadoFechado() ? `<p class="pn-texto" style="margin-top:8px;">Mercado fechado: este sinal só volta a ser acompanhado quando o mercado reabrir. ${pnTextoReabertura()}</p>` : ""}
        </div>
    </section>`;

}

function pnStatsHTML(saldo, hoje) {

    const r = tokenResultadoPainel(hoje.usd);

    return `
    <section class="pn-stats" aria-label="Saldo e resultado do dia">
        <div class="pa-vidro pn-stat pn-surgir">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">Simulada</p>
            <p class="pa-num pn-stat-valor" id="pnSaldo">${moedaPainel(saldo)}</p>
        </div>
        <div class="pa-vidro pn-stat pn-surgir">
            <p class="pa-eyebrow" style="letter-spacing:.12em;">Hoje</p>
            <p class="pa-num pn-stat-valor ${r.classe}"><span class="pa-seta" aria-hidden="true">${r.seta}</span><span id="pnHoje">${moedaAssinadaPainel(hoje.usd)}</span></p>
            <p class="pn-stat-sub pa-num-sans">${pnPct(hoje.pct)} · ${hoje.n} ${hoje.n === 1 ? "operação" : "operações"}</p>
        </div>
    </section>`;

}

function pnCurvaHTML(fechadas, saldo) {

    const c = pnCurva(fechadas, pnPeriodo, saldo);

    const chips = PN_PERIODOS.map(p =>
        `<button type="button" role="tab" class="pn-chip pa-num-sans${p === pnPeriodo ? " pn-chip--ativo" : ""}" aria-selected="${p === pnPeriodo}" data-periodo="${p}">${p}</button>`
    ).join("");

    let corpo;

    if (!c) {
        corpo = `<div class="pn-vazio">Sem operações fechadas neste período.</div>`;
    } else {
        const r = tokenResultadoPainel(c.variacao);
        const cor = "var(--pa-primary)";
        const spark = c.valores.length >= 2
            ? pnSparkHTML(c.valores, cor, 104)
            : `<div class="pn-vazio">Só uma operação neste período.</div>`;
        corpo = `
            <p class="pa-num pn-curva-valor ${r.classe}"><span class="pa-seta" aria-hidden="true">${r.seta}</span>${moedaAssinadaPainel(c.variacao)} <span class="pn-curva-pct">${pnPct(c.pct)}</span></p>
            <div style="margin-top:12px;">${spark}</div>`;
    }

    return `
    <section class="pa-vidro pn-curva pn-surgir" aria-label="Curva de saldo">
        <p class="pa-eyebrow" style="letter-spacing:.12em;">Curva de saldo</p>
        ${corpo}
        <div class="pn-chips" role="tablist" aria-label="Período do gráfico">${chips}</div>
    </section>`;

}

function pnLinhaHTML(o) {

    const dir = pnDirecao(o);
    const t = PN_TOM[dir];
    const usd = Number(o.resultadoFinanceiro);
    const pips = Number(o.movimentoPips);
    const r = tokenResultadoPainel(Number.isFinite(pips) ? pips : usd);
    const meta = [t.rotulo, pnHora(o.timestamp), pnDuracao(o.tempoOperacao)].filter(Boolean).join(" · ");

    return `
    <li>
        <button type="button" class="pa-vidro pn-linha" data-op="${o.id}" style="--pn-cor:${t.cor};--pn-fundo:${t.fundo};">
            <span class="pn-tile" aria-hidden="true">${pnSvgIcone(dir, 18, 2.6)}</span>
            <span class="pn-min0">
                <span class="pn-linha-par">${o.par}</span>
                <span class="pn-linha-meta pa-num-sans">${meta}</span>
            </span>
            <span class="pn-linha-res">
                ${Number.isFinite(pips) ? `<span class="pa-num pn-linha-pips ${r.classe}">${pnPips(pips)}</span>` : ""}
                <span class="pa-num pn-linha-usd ${Number.isFinite(pips) ? "" : r.classe}">${Number.isFinite(usd) ? moedaAssinadaPainel(usd) : "—"}</span>
            </span>
        </button>
    </li>`;

}

function pnRecentesHTML(fechadas) {

    const ult = fechadas.slice(-3).reverse();

    return `
    <section aria-label="Operações recentes">
        <div class="pn-recentes-topo">
            <h2 class="pn-h2">Operações recentes</h2>
            <button type="button" class="pn-ver" data-tab="historico">Ver histórico ${'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'}</button>
        </div>
        ${ult.length
            ? `<ul class="pn-lista">${ult.map(pnLinhaHTML).join("")}</ul>`
            : `<div class="pa-vidro pn-vazio">Ainda não há operações fechadas.</div>`}
    </section>`;

}

// ---------- detalhe da operação (folha inferior) ----------
function pnAbrirDetalhe(o) {

    pnFecharDetalhe();

    const dir = pnDirecao(o);
    const t = PN_TOM[dir];
    const usd = Number(o.resultadoFinanceiro);
    const pips = Number(o.movimentoPips);
    const r = tokenResultadoPainel(Number.isFinite(pips) ? pips : usd);
    const hoje = pnDiaBrasilia(o.timestamp) === hojeBrasilStr();
    const dia = hoje ? "Hoje" : new Date(o.timestamp).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" });
    const score = Number(o.score);
    const saida = o.precoFechamento ?? o.precoSaida ?? o.precoAtual;

    const el = document.createElement("div");
    el.id = "pnFolha";
    el.className = "pn-folha-fundo";
    el.innerHTML = `
        <div class="pn-folha" role="dialog" aria-modal="true" aria-labelledby="pn-folha-tit" style="--pn-cor:${t.cor};--pn-fundo:${t.fundo};">
            <button type="button" class="pn-folha-fechar" aria-label="Fechar">${pnSvgIcone("fechar", 18, 2)}</button>
            <h2 class="pn-folha-tit" id="pn-folha-tit">${o.par}</h2>
            <p class="pn-folha-desc pa-num-sans">${t.rotulo} · ${dia} às ${pnHora(o.timestamp)}</p>
            <div class="pn-folha-res">
                <div class="pn-min0">
                    <p class="pa-eyebrow" style="letter-spacing:.12em;">Resultado</p>
                    <p class="pa-num pn-folha-pips ${r.classe}">${Number.isFinite(pips) ? pnPips(pips) : moedaAssinadaPainel(usd)}</p>
                    ${Number.isFinite(pips) && Number.isFinite(usd) ? `<p class="pa-num pn-folha-usd">${moedaAssinadaPainel(usd)}</p>` : ""}
                </div>
                ${Number.isFinite(score) ? pnAnelHTML(score, { tamanho: 84, espessura: 8, cor: "var(--pn-cor)", legenda: "Score" }) : ""}
            </div>
            <dl class="pa-vidro pn-folha-grade">
                <div><dt>Entrada</dt><dd class="pa-num">${pnPreco(o.precoEntrada, o.par)}</dd></div>
                <div><dt>Saída</dt><dd class="pa-num">${pnPreco(saida, o.par)}</dd></div>
                <div><dt>Duração</dt><dd class="pa-num">${pnDuracao(o.tempoOperacao) || "—"}</dd></div>
                <div><dt>Direção</dt><dd class="pa-num">${t.rotulo}</dd></div>
            </dl>
            <div class="pn-folha-rodape">
                <span class="pn-badge pn-badge--sm">${pnSvgIcone(dir, 14, 2.6)}${t.rotulo}</span>
                <button type="button" class="pn-ver" data-tab="historico" data-fechar-folha="1">Abrir no histórico</button>
            </div>
        </div>`;

    document.body.appendChild(el);

    el.addEventListener("click", (e) => {
        if (e.target === el || e.target.closest(".pn-folha-fechar") || e.target.closest("[data-fechar-folha]")) pnFecharDetalhe();
    });

    document.addEventListener("keydown", pnTeclaFolha);

    const fechar = el.querySelector(".pn-folha-fechar");
    if (fechar) fechar.focus();

    pnAnimar(el);

}

function pnTeclaFolha(e) {
    if (e.key === "Escape") pnFecharDetalhe();
}

function pnFecharDetalhe() {
    const el = document.getElementById("pnFolha");
    if (el) el.remove();
    document.removeEventListener("keydown", pnTeclaFolha);
}

// ---------- montagem ----------
function dashboardView() {

    // Ordem: componentes do projeto (sinal, saldo/hoje, curva, recentes) e,
    // abaixo, os controles que só existem no app real (scanner, contas,
    // desempenho detalhado). Os id de scanner/contas são lidos por
    // js/expert.js e js/desempenho.js - não renomear sem ajustar os dois.
    return `
    <div class="painel">

        <div id="pnSinal"></div>
        <div id="pnStats"></div>
        <div id="pnCurva"></div>
        <div id="pnRecentes"></div>

        <section class="pa-vidro" aria-label="Scanner">
            <div>
                <p class="pa-eyebrow">Modo atual</p>
                <div id="modoAtual" class="pa-modo-valor">Carregando…</div>
            </div>

            <div class="pa-acoes">
                <button class="button start-btn pa-btn" id="startScanner">
                    Iniciar scanner
                </button>

                <button class="button stop-btn pa-btn" id="stopScanner">
                    Parar scanner
                </button>
            </div>

            <div class="pa-linha">
                <span>Cooldowns hoje</span>
                <b id="cooldownsHoje" class="pa-num">0</b>
            </div>
        </section>

        <div id="desempenhoCard">
            <p class="pa-carregando">Carregando…</p>
        </div>

        <p class="pa-rodape">Firebase: <span id="debugFirebase">Iniciando...</span></p>

    </div>
    `;
}

function pnMensagemErro(texto) {
    return `<section class="pa-vidro"><p class="pa-erro">${texto}</p></section>`;
}

async function renderPainel() {

    const sinalEl = document.getElementById("pnSinal");
    if (!sinalEl) return;

    const esqueleto = '<section class="pa-vidro pa-vidro--forte pn-hero"><p class="pa-carregando">Carregando…</p></section>';
    sinalEl.innerHTML = esqueleto;

    let dados;

    try {
        dados = await pnCarregar();
    } catch (erro) {
        console.error("Erro ao carregar o Painel:", erro);
        sinalEl.innerHTML = pnMensagemErro(`Não foi possível carregar o sinal e o histórico: ${erro.message}`);
        return;
    }

    // a aba pode ter mudado enquanto a consulta rodava
    if (!document.getElementById("pnSinal")) return;

    const fechadas = pnFechadas(dados.ops);
    const hoje = pnResumoHoje(fechadas, dados.saldo);

    sinalEl.innerHTML = pnHeroHTML(pnSinalAtivo(dados.ops));
    document.getElementById("pnStats").innerHTML = pnStatsHTML(dados.saldo, hoje);

    const curvaEl = document.getElementById("pnCurva");
    const desenharCurva = () => {
        curvaEl.innerHTML = pnCurvaHTML(fechadas, dados.saldo);
        pnAnimar(curvaEl);
    };

    desenharCurva();

    curvaEl.onclick = (e) => {
        const b = e.target.closest("[data-periodo]");
        if (!b) return;
        pnPeriodo = b.getAttribute("data-periodo");
        desenharCurva();
    };

    const recEl = document.getElementById("pnRecentes");
    recEl.innerHTML = pnRecentesHTML(fechadas);

    recEl.onclick = (e) => {
        const b = e.target.closest("[data-op]");
        if (!b) return;
        const op = dados.ops.find(o => o.id === b.getAttribute("data-op"));
        if (op) pnAbrirDetalhe(op);
    };

    pnAnimar(sinalEl);

    pnContar(document.getElementById("pnSaldo"), dados.saldo, moedaPainel);
    pnContar(document.getElementById("pnHoje"), hoje.usd, moedaAssinadaPainel);

}
