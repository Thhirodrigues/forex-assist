// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// SUGESTÃO DE AGORA (Dashboard)
//
// Responsabilidade:
// Mostrar ao usuário, para os pares que ele monitora,
// quais estão dentro da janela de sessão ideal AGORA -
// combinando duas camadas, sempre rotuladas separadamente:
//
// 1) ESTRUTURA DE MERCADO: fatos públicos (sessão de
//    maior liquidez, classificação major/cross, tier de
//    volatilidade histórica), com fonte citada. Isto é
//    leitura do RMI sobre dados públicos, não uma
//    garantia - percepção de mercado é sempre
//    interpretação, e a nossa é esta, declarada.
//
// 2) DESEMPENHO REAL DO RMI NESSE PAR: taxa de acerto e
//    tamanho da amostra, calculados a partir do histórico
//    real de operações do próprio usuário (Firestore).
//
// A lógica de janela (dentroJanelaPadrao/parNaJanelaOperacional/
// parElegivelJanelaAsia) é uma CÓPIA deliberada da mesma lógica
// em scripts/scanner.js (Node, roda no cron - não pode ser
// importada direto pelo navegador). Qualquer mudança na regra
// de janela em scanner.js precisa ser replicada aqui também,
// ou o Dashboard passa a mostrar sugestão desalinhada do que o
// Scanner realmente decide. Ver BUG-011 em DOCUMENTACAO/ENGINEERING.md.
// ===================================================

// ===================================================
// CAMADA 1 — ESTRUTURA DE MERCADO
// ---------------------------------------------------
// Classificação e volatilidade em NÍVEIS (baixa/média/alta), não em
// pips exatos - o valor exato varia por fonte e muda com o tempo;
// o nível é o que essas fontes sustentam de forma consistente.
// Fontes consultadas em 07/09/2026:
// - Babypips, "Forex Trading Sessions" (sessões e horários)
// - Dukascopy, "Forex Market Hours" e "10 Most Volatile Forex Pairs"
// - offbeatforex.com, "Average Daily Range for Forex Currency Pairs"
// - PriceActionNinja, "Forex Pair Volatility Cheatsheet"
// ===================================================

const PERFIL_PARES = {

    "EUR/USD": { classificacao: "Major", sessao: "Londres/Nova York", volatilidade: "MÉDIA" },
    "GBP/USD": { classificacao: "Major", sessao: "Londres/Nova York", volatilidade: "ALTA" },
    "USD/JPY": { classificacao: "Major", sessao: "Tóquio + Nova York/Londres", volatilidade: "MÉDIA" },
    "AUD/USD": { classificacao: "Major", sessao: "Sydney/Tóquio", volatilidade: "MÉDIA" },
    "USD/CAD": { classificacao: "Major", sessao: "Nova York", volatilidade: "MÉDIA" },
    "USD/CHF": { classificacao: "Major", sessao: "Londres/Nova York", volatilidade: "MÉDIA" },
    "NZD/USD": { classificacao: "Major", sessao: "Sydney/Tóquio", volatilidade: "MÉDIA" },

    "EUR/JPY": { classificacao: "Cross", sessao: "Tóquio + Londres", volatilidade: "ALTA" },
    "GBP/JPY": { classificacao: "Cross", sessao: "Tóquio + Londres", volatilidade: "ALTA (a mais volátil da lista)" },
    "EUR/GBP": { classificacao: "Cross", sessao: "Londres", volatilidade: "MÉDIA" },
    "EUR/AUD": { classificacao: "Cross", sessao: "Londres + Sydney", volatilidade: "MÉDIA" },
    "EUR/CAD": { classificacao: "Cross", sessao: "Londres/Nova York", volatilidade: "BAIXA" },
    "EUR/CHF": { classificacao: "Cross", sessao: "Londres", volatilidade: "BAIXA" },
    "GBP/CHF": { classificacao: "Cross", sessao: "Londres", volatilidade: "BAIXA" },
    "GBP/CAD": { classificacao: "Cross", sessao: "Londres/Nova York", volatilidade: "MÉDIA" },
    "AUD/JPY": { classificacao: "Cross", sessao: "Sydney/Tóquio", volatilidade: "ALTA" },
    "CAD/JPY": { classificacao: "Cross", sessao: "Tóquio + Nova York", volatilidade: "ALTA" },
    "CHF/JPY": { classificacao: "Cross", sessao: "Tóquio + Londres", volatilidade: "MÉDIA/ALTA" },
    "AUD/NZD": { classificacao: "Cross", sessao: "Sydney/Tóquio (100% Pacífico)", volatilidade: "BAIXA/MÉDIA" },
    "NZD/JPY": { classificacao: "Cross", sessao: "Tóquio + Sydney", volatilidade: "ALTA" }

};

// ===================================================
// CAMADA 1 — JANELA DE SESSÃO (cópia da regra de scanner.js)
// ===================================================

function agoraBrasil() {

    const agora = new Date();

    const brasiliaStr = agora.toLocaleString(
        "en-US",
        { timeZone: "America/Sao_Paulo" }
    );

    const brasilia = new Date(brasiliaStr);

    return {
        diaSemana: brasilia.getDay(),
        minutosDoDia: brasilia.getHours() * 60 + brasilia.getMinutes()
    };

}

function dentroJanelaPadrao(diaSemana, minutosDoDia, configuracao) {

    if (diaSemana === 6) return false;
    if (diaSemana === 0) return minutosDoDia >= (18 * 60);

    const [horaInicio, minutoInicio] = (configuracao.horarioInicio || "07:30").split(":").map(Number);
    const [horaFim, minutoFim] = (configuracao.horarioFim || "18:00").split(":").map(Number);

    const inicio = horaInicio * 60 + minutoInicio;
    const fim = horaFim * 60 + minutoFim;

    const janelaSeguranca = Number(configuracao.janelaSeguranca) || 0;
    const fimComSeguranca = fim - janelaSeguranca;

    // Janela normal (não atravessa a meia-noite).
    if (fim >= inicio) {
        return minutosDoDia >= inicio && minutosDoDia <= fimComSeguranca;
    }

    // Janela atravessa a meia-noite (preset "Ásia + madrugada") - ver
    // a mesma lógica, com a mesma justificativa, em
    // scripts/scanner.js's dentroJanelaPadrao().
    const comecaANoite = minutosDoDia >= inicio && diaSemana !== 5;
    const continuaNaMadrugada = minutosDoDia <= fimComSeguranca;

    return comecaANoite || continuaNaMadrugada;

}

const MOEDAS_JANELA_ASIA = new Set(["JPY", "AUD", "NZD"]);
const PARES_JANELA_ASIA_EXCLUIDOS = new Set(["GBP/JPY"]);
const JANELA_ASIA_INICIO = 21 * 60;
const JANELA_ASIA_FIM = 23 * 60 + 59;

function parElegivelJanelaAsia(par) {

    if (PARES_JANELA_ASIA_EXCLUIDOS.has(par)) return false;

    const [moedaBase, moedaCotada] = par.split("/");

    return (
        MOEDAS_JANELA_ASIA.has(moedaBase) ||
        MOEDAS_JANELA_ASIA.has(moedaCotada)
    );

}

function parNaJanelaOperacional(par, diaSemana, minutosDoDia, configuracao) {

    if (dentroJanelaPadrao(diaSemana, minutosDoDia, configuracao))
        return true;

    const elegivelJanelaAsia =
        parElegivelJanelaAsia(par) &&
        diaSemana >= 1 &&
        diaSemana <= 4;

    if (!elegivelJanelaAsia) return false;

    return (
        minutosDoDia >= JANELA_ASIA_INICIO &&
        minutosDoDia <= JANELA_ASIA_FIM
    );

}

// ===================================================
// CAMADA 2 — DESEMPENHO REAL DO RMI NO PAR
// ---------------------------------------------------
// Mesmo limite mínimo de amostra usado em scripts/statisticsEngine.js
// (OPERACOES_MINIMAS_HISTORICO) - mantido em paridade manualmente,
// os dois arquivos não compartilham import.
// ===================================================

const OPERACOES_MINIMAS_HISTORICO = 30;

function classificarDesempenho(taxaAcerto, operacoes) {

    if (operacoes < OPERACOES_MINIMAS_HISTORICO)
        return "SEM_DADOS";

    if (taxaAcerto >= 80) return "EXCELENTE";
    if (taxaAcerto >= 70) return "BOM";
    if (taxaAcerto >= 55) return "NEUTRO";

    return "RUIM";

}

async function calcularDesempenhoPorPar() {

    const desempenho = {};

    try {

        const snapshot = await db
            .collection("historico")
            .orderBy("timestamp", "desc")
            .limit(500)
            .get();

        snapshot.forEach((doc) => {

            const dados = doc.data();

            if (dados.resultado !== "WIN" && dados.resultado !== "LOSS")
                return;

            if (!desempenho[dados.par]) {
                desempenho[dados.par] = { wins: 0, operacoes: 0 };
            }

            desempenho[dados.par].operacoes++;

            if (dados.resultado === "WIN")
                desempenho[dados.par].wins++;

        });

    } catch (erro) {

        console.error("Erro ao calcular desempenho por par:", erro);

    }

    Object.keys(desempenho).forEach((par) => {

        const item = desempenho[par];

        item.taxaAcerto = Number(
            (item.wins * 100 / item.operacoes).toFixed(1)
        );

        item.status = classificarDesempenho(item.taxaAcerto, item.operacoes);

    });

    return desempenho;

}

// ===================================================
// RENDER — CARD "SUGESTÃO DE AGORA" NO DASHBOARD
// ===================================================

async function renderSugestaoAgora() {

    const el = document.getElementById("sugestaoAgora");

    if (!el) return;

    try {

        const doc = await db
            .collection("configuracoes")
            .doc("geral")
            .get();

        const configuracao = doc.exists ? doc.data() : {};

        const pares = configuracao.pares || Object.keys(PERFIL_PARES);

        const { diaSemana, minutosDoDia } = agoraBrasil();

        const paresNaJanela = pares.filter((par) =>
            parNaJanelaOperacional(par, diaSemana, minutosDoDia, configuracao)
        );

        if (!paresNaJanela.length) {

            el.innerHTML = `
                <div style="opacity:.7;">
                    Nenhum dos seus pares monitorados está na janela de
                    sessão ideal agora.
                </div>
            `;

            return;

        }

        const desempenho = await calcularDesempenhoPorPar();

        el.innerHTML = paresNaJanela.map((par) => {

            const perfil = PERFIL_PARES[par] || {
                classificacao: "-",
                sessao: "Não catalogado",
                volatilidade: "-"
            };

            const desempenhoPar = desempenho[par];

            const linhaDesempenho = desempenhoPar
                ? `Desempenho real: ${desempenhoPar.taxaAcerto}% de acerto em ${desempenhoPar.operacoes} ${desempenhoPar.operacoes === 1 ? "operação" : "operações"} (${desempenhoPar.status})`
                : "Desempenho real: sem operações suficientes no seu histórico ainda";

            return `
                <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,.08);">
                    <div style="font-weight:bold;">✅ ${par}</div>
                    <div style="font-size:12px; opacity:.85;">
                        Estrutura de mercado: ${perfil.classificacao} · ${perfil.sessao} · volatilidade ${perfil.volatilidade}
                    </div>
                    <div style="font-size:12px; opacity:.85;">
                        ${linhaDesempenho}
                    </div>
                </div>
            `;

        }).join("") + `
            <div style="font-size:11px; opacity:.6; margin-top:8px;">
                Estrutura de mercado: leitura do RMI sobre fontes públicas
                (sessões e volatilidade histórica) - ver Manual. Desempenho
                real: calculado a partir do seu próprio histórico de
                operações salvas.
            </div>
            <button
                id="btnAplicarSugestao"
                data-tab="config"
                style="margin-top:10px; width:100%; padding:8px; border:none; border-radius:8px; background:#132852; color:white; font-size:13px; cursor:pointer;"
            >
                Aplicar esses pares na Configuração
            </button>
        `;

        // O clique também tem data-tab="config" (o listener global de
        // navegação em app.js troca de aba ao ver esse atributo) - aqui
        // só preparamos o rascunho ANTES da troca de aba. Nada é
        // gravado no Firestore: só localStorage (rascunho da tela de
        // Config), que exige um clique explícito em "Salvar
        // Configurações" pra virar mudança real - de propósito, pra
        // não sobrescrever um parâmetro de produção com um clique só.
        const btnAplicar = document.getElementById("btnAplicarSugestao");

        if (btnAplicar) {

            btnAplicar.onclick = () => {

                if (typeof carregarConfiguracoes !== "function" || typeof salvarConfiguracoes !== "function") {
                    return;
                }

                const configRascunho = carregarConfiguracoes();

                configRascunho.pares = [...paresNaJanela];

                salvarConfiguracoes(configRascunho);

                sessionStorage.setItem("sugestaoAplicada", "1");

            };

        }

    } catch (erro) {

        console.error("Erro ao renderizar sugestão de agora:", erro);

        el.innerHTML = `<div style="opacity:.7;">Não foi possível carregar a sugestão agora.</div>`;

    }

}
