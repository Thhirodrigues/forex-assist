// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// DESEMPENHO (Dashboard)
//
// Responsabilidade:
// Mostrar no Dashboard a Conta Real (saldoReal - só se
// move pela marcação manual em Histórico, ver
// js/historico.js) e a Conta Simulada (saldoSimulado -
// acumulado desde sempre, somado automaticamente em
// TODO sinal fechado independente do tipoConta ativo,
// ver BUG-020 em js/checker.js), além da contagem de
// WIN/LOSS (desde sempre e num dia filtrável).
//
// FEATURE-006
// ===================================================

// Brasil não tem horário de verão desde 2019 (confirmado via WebSearch
// nesta sessão, DOCUMENTACAO/ENGINEERING.md) - o offset de
// America/Sao_Paulo é sempre -03:00, fixo. Isso permite calcular os
// limites de um dia sem depender de conversão de fuso horário do
// navegador (evita erro de "meio-dia deslocado" perto de virada de
// mês/ano em cálculos ingênuos com Date).
function hojeBrasilStr() {

    return new Date().toLocaleDateString(
        "sv-SE",
        { timeZone: "America/Sao_Paulo" }
    );

}

function limitesDoDiaBrasil(dataStr) {

    const inicio =
        new Date(`${dataStr}T00:00:00-03:00`).getTime();

    const fim =
        inicio + 24 * 60 * 60 * 1000;

    return { inicio, fim };

}

function formatarUSD(valor) {

    const numero = Number(valor) || 0;
    const sinal = numero < 0 ? "-" : "";

    return `${sinal}$${Math.abs(numero).toFixed(2)}`;

}

// BUG-023 (10/09/2026): a versão original desta função, quando
// .count() falhava, caía pra `query.get()` SEM NENHUM limite - uma
// leitura completa da coleção historico inteira filtrada por
// resultado, TODA VEZ que o Dashboard renderiza (a cada troca de aba,
// não só uma vez). Com .count() não confirmado como suportado no SDK
// do navegador (só no SDK Admin do backend - ver histórico deste
// arquivo), isso muito provavelmente era exatamente o fallback sendo
// acionado o tempo todo, e é o motivo mais provável do usuário ter
// esgotado a cota diária do Firestore de novo hoje, o que por sua vez
// intercepta o Scanner (mesmo padrão do BUG-014) e explica também
// "nenhum sinal" - mesma causa raiz, dois sintomas. Corrigido: o
// fallback agora É limitado (mesma cautela do BUG-017/BUG-018) -
// prefere um número aproximado ("500+") a arriscar a cota de novo.
const LIMITE_CONTAGEM_FALLBACK = 500;

async function contarPorResultado(resultado) {

    const query =
        db.collection("historico").where("resultado", "==", resultado);

    try {

        // .count() é uma agregação nativa do Firestore - conta sem
        // baixar o conteúdo dos documentos, custo praticamente
        // irrelevante mesmo com milhares de sinais (confirmado
        // disponível no SDK Admin usado no backend, node_modules/
        // @google-cloud/firestore@6.8.0). Se isso realmente funcionar
        // no navegador, é sempre a via preferida - só chega aqui na
        // exceção.
        const snap = await query.count().get();
        return { valor: snap.data().count, aproximado: false };

    } catch (erro) {

        // SDK sem suporte a .count() (ou qualquer outra falha na
        // agregação) - cai pra leitura normal, mas SEMPRE limitada.
        // Se bater exatamente no limite, o número é um piso, não o
        // total exato - sinalizado pra quem exibe.
        const snap2 = await query.limit(LIMITE_CONTAGEM_FALLBACK).get();
        return {
            valor: snap2.size,
            aproximado: snap2.size >= LIMITE_CONTAGEM_FALLBACK
        };

    }

}

async function obterDesempenhoDoDia(dataStr) {

    const { inicio, fim } = limitesDoDiaBrasil(dataStr);

    // Filtro por intervalo no MESMO campo (timestamp) usa só o índice
    // automático de campo único do Firestore - não exige nenhum índice
    // composto novo. status/resultado são filtrados em memória, mesmo
    // padrão já usado em js/historico.js e js/checker.js. limit(1000)
    // é rede de segurança (um dia real não deve nem chegar perto
    // disso), não uma amostragem.
    const snapshot = await db.collection("historico")
        .where("timestamp", ">=", inicio)
        .where("timestamp", "<", fim)
        .limit(1000)
        .get();

    let wins = 0;
    let losses = 0;
    let somaSimulada = 0;

    snapshot.forEach(doc => {

        const dados = doc.data();

        if (dados.resultado === "WIN" || dados.resultado === "LOSS") {

            if (dados.resultado === "WIN") wins++;
            else losses++;

            somaSimulada += Number(dados.resultadoFinanceiro || 0);

        }

    });

    return {
        wins,
        losses,
        total: wins + losses,
        somaSimulada: Number(somaSimulada.toFixed(2))
    };

}

// AJUSTE-022 (25/09/2026): causa raiz real da lentidão do Dashboard
// que o usuário reportou (motivou a criação da aba Resultados,
// AJUSTE-021) - contarPorResultado() escaneava/contava a coleção
// historico inteira, DUAS VEZES (WIN e LOSS), TODA VEZ que o Dashboard
// renderizava (a cada troca de aba). configuracoes/geral.winsTotal/
// lossesTotal (mantidos incrementalmente por js/checker.js e
// js/historico.js a cada fechamento, ver AJUSTE-022 lá) substituem
// isso por uma leitura O(1) - o mesmo documento configSnap que esta
// função já buscava de qualquer forma, sem nenhuma consulta extra.
//
// Fallback pro método antigo (contarPorResultado) só se os campos
// ainda não existirem no documento (config novo, ou backfill único -
// ferramentas/backfill-contadores-resultado.js - ainda não rodado)
// - garante que o número mostrado nunca fica errado, só mais lento
// até o backfill rodar uma vez.
async function obterResumoGeral() {

    const configSnap =
        await db.collection("configuracoes").doc("geral").get();

    const config =
        configSnap.exists ? configSnap.data() : {};

    const temContadorIncremental =
        typeof config.winsTotal === "number" &&
        typeof config.lossesTotal === "number";

    if (temContadorIncremental) {

        return {
            saldoReal: Number(config.saldoReal || 0),
            saldoSimulado: Number(config.saldoSimulado ?? config.saldoInicial ?? 0),
            winsTotal: config.winsTotal,
            winsAproximado: false,
            lossesTotal: config.lossesTotal,
            lossesAproximado: false,
            totalSinais: config.winsTotal + config.lossesTotal,
            totalAproximado: false
        };

    }

    const [wins, losses] = await Promise.all([
        contarPorResultado("WIN"),
        contarPorResultado("LOSS")
    ]);

    return {
        saldoReal: Number(config.saldoReal || 0),
        saldoSimulado: Number(config.saldoSimulado ?? config.saldoInicial ?? 0),
        winsTotal: wins.valor,
        winsAproximado: wins.aproximado,
        lossesTotal: losses.valor,
        lossesAproximado: losses.aproximado,
        totalSinais: wins.valor + losses.valor,
        totalAproximado: wins.aproximado || losses.aproximado
    };

}

function formatarContagem(valor, aproximado) {
    return aproximado ? `${valor}+` : `${valor}`;
}

// ---------------------------------------------------
// Apresentação do Painel (direção visual "Aurora Glass").
// Só formata e desenha - a leitura dos dados fica nas funções
// obterDesempenhoDoDia / obterResumoGeral acima, inalteradas.
// ---------------------------------------------------

const FORMATO_MOEDA_PAINEL = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

// US$ 1.248,60 / −US$ 7,20 (negativo sempre com sinal, nunca só cor)
function moedaPainel(valor) {

    const n = Number((Number(valor) || 0).toFixed(2));

    return `${n < 0 ? "−" : ""}US$ ${FORMATO_MOEDA_PAINEL.format(Math.abs(n))}`;

}

// Cor e seta de qualquer resultado seguem o sinal do número:
// positivo = ganho, negativo = perda, zero = neutro. Nunca fixar verde.
function tokenResultadoPainel(valor) {

    const n = Number((Number(valor) || 0).toFixed(2));

    if (n > 0) return { classe: "pa-res--ganho", seta: "▲", sinal: "+" };
    if (n < 0) return { classe: "pa-res--perda", seta: "▼", sinal: "−" };

    return { classe: "pa-res--neutro", seta: "•", sinal: "" };

}

function moedaAssinadaPainel(valor) {

    const t = tokenResultadoPainel(valor);
    const n = Math.abs(Number((Number(valor) || 0).toFixed(2)));

    return `${t.sinal}US$ ${FORMATO_MOEDA_PAINEL.format(n)}`;

}

function anelAcertoHTML(dia) {

    const R = 40;
    const C = 2 * Math.PI * R;
    const temAmostra = dia.total > 0;
    const pct = temAmostra ? dia.wins * 100 / dia.total : 0;
    const alvo = C * (1 - pct / 100);
    const rotulo = temAmostra
        ? `Taxa de acerto do dia: ${Math.round(pct)}%, ${dia.wins} de ${dia.total} fechadas`
        : "Sem operações fechadas neste dia";

    return `
        <div class="pa-anel" role="img" aria-label="${rotulo}">
            <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle class="pa-anel-trilho" cx="50" cy="50" r="${R}"></circle>
                <circle class="pa-anel-valor" cx="50" cy="50" r="${R}"
                    stroke-dasharray="${C.toFixed(2)}"
                    stroke-dashoffset="${C.toFixed(2)}"
                    data-alvo="${alvo.toFixed(2)}"></circle>
            </svg>
            <div class="pa-anel-txt">
                <b class="pa-num">${temAmostra ? Math.round(pct) + "%" : "—"}</b>
                <small>acerto</small>
            </div>
        </div>
    `;

}

async function renderizarDesempenhoDiario(dataStr) {

    const alvo = document.getElementById("desempenhoDiario");
    if (!alvo) return;

    alvo.innerHTML = '<p class="pa-carregando">Carregando…</p>';

    let dia;

    try {
        dia = await obterDesempenhoDoDia(dataStr);
    } catch (erro) {
        console.error("Erro ao carregar desempenho do dia:", erro);
        alvo.innerHTML = `<p class="pa-erro">Não foi possível carregar o desempenho deste dia: ${erro.message}</p>`;
        return;
    }

    const res = tokenResultadoPainel(dia.somaSimulada);

    // A taxa só faz sentido com a amostra ao lado: 1 de 1 é 100%, mas
    // não diz nada. Por isso "X de Y fechadas" fica sempre visível.
    alvo.innerHTML = `
        <div class="pa-dia-corpo">
            ${anelAcertoHTML(dia)}
            <div>
                <p class="pa-amostra">${dia.total === 0
                    ? "Sem operações fechadas neste dia"
                    : `${dia.wins} de ${dia.total} fechadas`}</p>
                <div class="pa-chips">
                    <span class="pa-chip pa-chip--ganho">WIN ${dia.wins}</span>
                    <span class="pa-chip pa-chip--perda">LOSS ${dia.losses}</span>
                </div>
            </div>
        </div>

        <div class="pa-resultado">
            <span class="pa-eyebrow">Simulado no dia</span>
            <b class="pa-num ${res.classe}"><span class="pa-seta" aria-hidden="true">${res.seta}</span>${moedaAssinadaPainel(dia.somaSimulada)}</b>
        </div>
    `;

    // anima o anel: parte do vazio e vai até o valor (CSS desliga a
    // transição com prefers-reduced-motion)
    const anel = alvo.querySelector(".pa-anel-valor");

    if (anel) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            anel.style.strokeDashoffset = anel.getAttribute("data-alvo");
        }));
    }

}

async function renderDesempenho() {

    const alvo = document.getElementById("desempenhoCard");
    if (!alvo) return;

    let resumo;

    try {
        resumo = await obterResumoGeral();
    } catch (erro) {
        console.error("Erro ao carregar desempenho:", erro);
        alvo.innerHTML = `<section class="pa-vidro"><p class="pa-erro">Não foi possível carregar o desempenho: ${erro.message}</p></section>`;
        return;
    }

    const dataHoje = hojeBrasilStr();

    alvo.innerHTML = `
        <section class="pa-vidro" aria-label="Conta real">
            <p class="pa-eyebrow">Conta real</p>
            <p class="pa-num pa-conta-valor">${moedaPainel(resumo.saldoReal)}</p>
            <p class="pa-nota">Saldo verdadeiro. Se move pelas operações marcadas em Histórico e por aportes.</p>
            <button id="btnRegistrarAporte" class="pa-btn-sec" type="button">+ Registrar aporte</button>
        </section>

        <section class="pa-vidro" aria-label="Conta simulada">
            <p class="pa-eyebrow">Conta simulada</p>
            <p class="pa-num pa-conta-valor">${moedaPainel(resumo.saldoSimulado)}</p>
            <p class="pa-nota">Acumulado desde sempre, somando todo sinal. Não reseta.</p>
        </section>

        <section class="pa-vidro" aria-label="Desempenho do dia">
            <div class="pa-dia-topo">
                <h2 class="pa-titulo">Desempenho do dia</h2>
                <label class="pa-data">
                    <span class="pa-sr">Dia do desempenho</span>
                    <input type="date" id="desempenhoDataFiltro" value="${dataHoje}">
                </label>
            </div>
            <div id="desempenhoDiario"><p class="pa-carregando">Carregando…</p></div>
        </section>

        <section class="pa-vidro" aria-label="Sinais desde sempre">
            <p class="pa-eyebrow">Sinais desde sempre</p>
            <dl class="pa-sempre">
                <div><dt>WIN</dt><dd class="pa-num pa-res--ganho">${formatarContagem(resumo.winsTotal, resumo.winsAproximado)}</dd></div>
                <div><dt>LOSS</dt><dd class="pa-num pa-res--perda">${formatarContagem(resumo.lossesTotal, resumo.lossesAproximado)}</dd></div>
                <div><dt>Total</dt><dd class="pa-num">${formatarContagem(resumo.totalSinais, resumo.totalAproximado)}</dd></div>
            </dl>
            ${resumo.totalAproximado ? '<p class="pa-nota">Número aproximado (piso): agregação rápida indisponível neste momento.</p>' : ''}
        </section>
    `;

    const inputData = document.getElementById("desempenhoDataFiltro");

    if (inputData) {
        inputData.onchange = () => renderizarDesempenhoDiario(inputData.value);
    }

    const btnAporte = document.getElementById("btnRegistrarAporte");

    if (btnAporte) {
        btnAporte.onclick = () => registrarAporte();
    }

    await renderizarDesempenhoDiario(dataHoje);

}

// FEATURE-006: soma (nunca substitui) um valor ao saldoReal atual -
// para quando o usuário deposita mais dinheiro na corretora depois do
// saldo inicial já ter sido definido no Config. Diferente do botão de
// Config (que SUBSTITUI o valor, ação única de setup).
async function registrarAporte() {

    const valorTexto = prompt("Quanto você está aportando na Conta Real? (use valor negativo para registrar uma retirada)");

    if (valorTexto === null) return;

    const valor = Number(valorTexto.replace(",", "."));

    if (!Number.isFinite(valor) || valor === 0) {
        alert("Valor inválido.");
        return;
    }

    const configRef = db.collection("configuracoes").doc("geral");
    const configSnap = await configRef.get();
    const saldoAtual = Number((configSnap.exists ? configSnap.data() : {}).saldoReal || 0);

    await configRef.set({
        saldoReal: Number((saldoAtual + valor).toFixed(2))
    }, { merge: true });

    await renderDesempenho();

}
