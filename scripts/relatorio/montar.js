// ===================================================
// FOREX ASSIST - RELATÓRIO NO TELEGRAM - TEXTO (funções puras; SEM IA: todo número sai de cálculo)
//
// Os números vêm do MESMO leitor já validado da regra 6.25 (scripts/marco/regra625.js: mesma seleção de fechadas, mesmo spread da
// tabela do Lab, mesmo bootstrap em blocos de dia). Aqui só se recorta por dia/semana e se formata.
// Princípios (combinados com o usuário): o número do dia é quase ruído e vem SEMPRE junto do acumulado; cortes descritivos levam o `n`;
// o relatório INFORMA, não decide (a decisão do marco das 400 é mecânica, pela regra 6.25 e pela comparação com o ALEATORIO).
// ===================================================
const { ZERAR, selecionarFechadas, metricas, relatorio } = require("../marco/regra625");
const { spreadDoPar } = require("../../lab/spreads");

const BRT = 3 * 3600e3;
const diaBrt = (ms) => new Date(ms - BRT).toISOString().slice(0, 10);                 // AAAA-MM-DD em Brasília
const inicioDiaBrt = (dia) => Date.parse(dia + "T00:00:00Z") + BRT;                    // instante (UTC ms) em que o dia de Brasília começa
const ddmm = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const hhmmBrt = (ms) => new Date(ms - BRT).toISOString().slice(11, 16);

const fmt = (x, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? "?" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(d).replace(".", ","));
const sinal = (x, d = 1) => (x > 0 ? "+" : "") + fmt(x, d);

// recorte simples (sem bootstrap): n, WIN, LOSS, acerto, líquido médio em pips/op (bruto − spread da tabela), US$ do app (sem spread)
function resumoSimples(lista) {
    const n = lista.length;
    if (!n) return { n: 0, win: 0, loss: 0 };
    let win = 0, liq = 0, usd = 0;
    for (const s of lista) {
        const tp = Math.abs(Number(s.financeiro.tpPips)), sl = Math.abs(Number(s.financeiro.slPips));
        const w = s.resultado === "WIN";
        win += w ? 1 : 0;
        liq += (w ? tp : -sl) - spreadDoPar(s.par);
        usd += Number(s.resultadoFinanceiro) || 0;
    }
    return { n, win, loss: n - win, acertoPct: 100 * win / n, liqPips: liq / n, usd };
}

const linhaResultado = (r) => r.n === 0 ? "nenhum fechado" : `WIN ${r.win} · LOSS ${r.loss} (${fmt(r.acertoPct, 0)}%)`;

// status da IA nos horários de GERAR de um conjunto de dias UTC (docs de `ia_agenda`: {id, status})
function linhaIA(iaDocs) {
    const g = (iaDocs || []).filter(d => String(d.id).startsWith("gerar_"));
    if (!g.length) return "IA: nenhum horário registrado";
    const c = {};
    for (const d of g) c[d.status || "?"] = (c[d.status || "?"] || 0) + 1;
    return `IA: ${g.length} horário(s) · ` + Object.entries(c).map(([k, v]) => `${k} ${v}`).join(", ");
}

function linhaSistema({ mt5IdadeMin, scannerConclusao, iaDocs }) {
    const mt5 = mt5IdadeMin === null || mt5IdadeMin === undefined ? "MT5: sem leitura" : mt5IdadeMin > 10 ? `MT5: parado há ${Math.round(mt5IdadeMin)} min ⚠️` : `MT5: enviando (há ${Math.round(mt5IdadeMin)} min)`;
    const sc = scannerConclusao ? `Scanner: último ciclo = ${scannerConclusao} (status do GitHub, não prova resultado)` : null;
    return [sc, mt5, linhaIA(iaDocs)].filter(Boolean).join("\n");
}

function acumulado(fe, agoraMs) {
    const m = metricas(fe, "acum");
    const dias = Math.floor((agoraMs - ZERAR) / 86400000);
    if (!m.n) return { m, linhas: [`Acumulado: 0/400 fechadas · ${dias}/30 dias`] };
    return {
        m, linhas: [
            `Acumulado: ${m.n}/400 fechadas · ${dias}/30 dias desde 04/10${m.n >= 400 && dias >= 30 ? " · MARCO ATINGIDO" : ""}`,
            `Líquido: ${fmt(m.liquidoPips, 2)} pips/op (IC95 ${fmt(m.icLiquido[0], 2)} a ${fmt(m.icLiquido[1], 2)}) · acerto ${fmt(m.acertoPct, 1)}%`,
            m.n < 400 ? `Faltam ${400 - m.n} para as 400` : null
        ].filter(Boolean)
    };
}

/**
 * Relatório DIÁRIO. historico = docs do `historico` oficial; extras = { mt5IdadeMin, scannerConclusao, iaDocs }.
 * @returns {{title:string, body:string}}
 */
function diario({ historico, agoraMs, extras = {}, teste = false }) {
    const dia = diaBrt(agoraMs), ini = inicioDiaBrt(dia), fim = ini + 24 * 3600e3;
    const fe = selecionarFechadas(historico);
    const emitidos = historico.filter(s => s.timestamp >= Math.max(ini, ZERAR) && s.timestamp < fim).length;
    const fechadosDia = fe.filter(s => s.fimOperacao >= ini && s.fimOperacao < fim);
    const r = resumoSimples(fechadosDia);
    const abertas = historico.filter(s => s.timestamp >= ZERAR && s.status === "ABERTA").length;
    const ac = acumulado(fe, agoraMs);
    const body = [
        `Sinais emitidos: ${emitidos} · fechados hoje: ${r.n}`,
        linhaResultado(r),
        r.n ? `Líquido do dia: ${fmt(r.liqPips, 1)} pips/op (n=${r.n}) · US$ ${fmt(r.usd, 2)} no app (sem spread)` : null,
        "",
        ...ac.linhas,
        `Abertas agora: ${abertas}`,
        "",
        linhaSistema(extras),
        "",
        "O número do dia é quase ruído (dias vêm em blocos correlacionados). Quem decide é o acumulado."
    ].filter(x => x !== null).join("\n");
    return { title: `${teste ? "TESTE: " : ""}📊 Resumo de ${ddmm(dia)} (Brasília)`, body };
}

/**
 * Relatório SEMANAL (segunda 00:00 de Brasília até agora). Cortes só descritivos, com n.
 */
function semanal({ historico, agoraMs, extras = {}, teste = false }) {
    const diaHoje = diaBrt(agoraMs);
    const dow = new Date(inicioDiaBrt(diaHoje) + 12 * 3600e3).getUTCDay();                // 0=dom..6=sáb, do dia de Brasília
    const diasDesdeSegunda = (dow + 6) % 7;
    const ini = inicioDiaBrt(diaHoje) - diasDesdeSegunda * 24 * 3600e3;
    const diaIni = diaBrt(ini);
    const fe = selecionarFechadas(historico);
    const semana = fe.filter(s => s.fimOperacao >= ini && s.fimOperacao <= agoraMs);
    const emitidos = historico.filter(s => s.timestamp >= Math.max(ini, ZERAR) && s.timestamp <= agoraMs).length;
    const r = resumoSimples(semana);
    const ac = acumulado(fe, agoraMs);
    const pares = [...new Set(fe.map(s => s.par))].sort().map(p => ({ par: p, ...resumoSimples(fe.filter(s => s.par === p)) }))
        .sort((a, b) => b.n - a.n);
    const linhasPares = pares.map(p => `${p.par}: n=${p.n} · acerto ${fmt(p.acertoPct, 0)}% · ${fmt(p.liqPips, 1)} pips/op`);
    const body = [
        `Semana ${ddmm(diaIni)} a ${ddmm(diaHoje)}`,
        `Sinais emitidos: ${emitidos} · fechados: ${r.n}`,
        linhaResultado(r),
        r.n ? `Líquido da semana: ${fmt(r.liqPips, 1)} pips/op (n=${r.n}) · US$ ${fmt(r.usd, 2)} no app (sem spread)` : null,
        "",
        ...ac.linhas,
        "",
        "Por par (acumulado, DESCRITIVO):",
        ...linhasPares,
        `Com ${pares.length} pares, ao menos um parecerá "bom" ou "ruim" só por acaso: não é base para mexer no sinal.`,
        "",
        linhaSistema(extras),
        "",
        "Marco das 400: a decisão é mecânica (regra 6.25 + comparação com o ALEATORIO), não sai deste relatório."
    ].filter(x => x !== null).join("\n");
    return { title: `${teste ? "TESTE: " : ""}📈 Semana ${ddmm(diaIni)}–${ddmm(diaHoje)}`, body };
}

/**
 * /marco: onde estamos em relação às 400 fechadas E 30 dias, com as janelas da regra 6.25 que já existem (100, 200, todas).
 * Só informa: a decisão (R1/R2/R3 + comparação com o ALEATORIO) é mecânica e fica para o marco.
 */
function marco({ historico, agoraMs }) {
    const r = relatorio(historico, agoraMs);
    const linhaJanela = (j) => j.n ? `${j.rot}: n=${j.n} · líquido ${fmt(j.liquidoPips, 2)} pips/op (IC95 ${fmt(j.icLiquido[0], 2)} a ${fmt(j.icLiquido[1], 2)}) · acerto ${fmt(j.acertoPct, 1)}%` : null;
    // "N primeiras" só aparece quando já existem N fechadas (senão repetiria a linha TODAS com outro rótulo); a de 400 fica de fora até o marco
    const janelas = r.janelas.filter(j => { const k = /^(\d+) primeiras/.exec(String(j.rot)); return j.n && !String(j.rot).startsWith("400") && (!k || j.n === Number(k[1])); }).map(linhaJanela).filter(Boolean);
    const falta = Math.max(0, 400 - r.fechadasConfig);
    const body = [
        `Fechadas: ${r.fechadasConfig}/400${falta ? ` (faltam ${falta})` : ""} · dias desde 04/10: ${r.diasCorridosDesdeZerar}/30`,
        r.marco400Atingido ? "MARCO ATINGIDO (400 fechadas e 30 dias): congelar a contagem antes de olhar o resultado." : "Marco ainda não atingido: precisa das duas condições (400 fechadas E 30 dias).",
        `Abertas no app: ${r.abertasNoApp}`,
        "",
        ...janelas,
        "",
        "Só informa. A decisão é mecânica (regra 6.25 + comparação com o ALEATORIO) e não sai daqui."
    ].join("\n");
    return { title: "🎯 Marco das 400", body };
}

module.exports = { diaBrt, inicioDiaBrt, hhmmBrt, fmt, sinal, resumoSimples, linhaIA, linhaSistema, diario, semanal, marco };
