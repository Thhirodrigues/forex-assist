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

async function obterResumoGeral() {

    const configSnap =
        await db.collection("configuracoes").doc("geral").get();

    const config =
        configSnap.exists ? configSnap.data() : {};

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

async function renderizarDesempenhoDiario(dataStr) {

    const alvo = document.getElementById("desempenhoDiario");
    if (!alvo) return;

    alvo.innerHTML = "Carregando...";

    const dia = await obterDesempenhoDoDia(dataStr);

    const taxa =
        dia.total === 0
            ? 0
            : Number((dia.wins * 100 / dia.total).toFixed(1));

    alvo.innerHTML = `
        <div style="display:flex; gap:15px; flex-wrap:wrap; align-items:center; margin-top:10px; font-size:14px;">
            <span>✅ ${dia.wins}</span>
            <span>❌ ${dia.losses}</span>
            <span>🎯 ${taxa}%</span>
            <span>Simulado no dia: ${formatarUSD(dia.somaSimulada)}</span>
        </div>
    `;

}

async function renderDesempenho() {

    const alvo = document.getElementById("desempenhoCard");
    if (!alvo) return;

    const resumo = await obterResumoGeral();
    const dataHoje = hojeBrasilStr();

    alvo.innerHTML = `
        <div class="card-title">💰 Desempenho</div>

        <div class="list-item">
            Conta Real
            <br>
            <span style="font-size:11px; color:#8c95b3;">Saldo verdadeiro - se move pelas operações marcadas em Histórico e por aportes</span>
            <div class="big-number">${formatarUSD(resumo.saldoReal)}</div>
            <button id="btnRegistrarAporte" style="margin-top:8px; width:100%; padding:8px; border:none; border-radius:8px; background:#132852; color:white; font-size:12px; cursor:pointer;">
                ➕ Registrar Aporte
            </button>
        </div>

        <div class="list-item">
            Conta Simulada
            <br>
            <span style="font-size:11px; color:#8c95b3;">Acumulado desde sempre, somando todo sinal (não reseta)</span>
            <div class="big-number">${formatarUSD(resumo.saldoSimulado)}</div>
        </div>

        <div class="list-item">
            Filtrar por dia
            <br><br>
            <input type="date" id="desempenhoDataFiltro" value="${dataHoje}" style="width:100%;">
        </div>

        <div id="desempenhoDiario">Carregando...</div>

        <div class="list-item">
            Sinais desde sempre: ✅ ${formatarContagem(resumo.winsTotal, resumo.winsAproximado)} · ❌ ${formatarContagem(resumo.lossesTotal, resumo.lossesAproximado)} · Total ${formatarContagem(resumo.totalSinais, resumo.totalAproximado)}
            ${resumo.totalAproximado ? '<div style="font-size:10px; color:#8c95b3; margin-top:2px;">Número aproximado (piso) - agregação rápida indisponível neste momento</div>' : ''}
        </div>
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
