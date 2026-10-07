// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// PUSH NOTIFIER
//
// Responsabilidade:
// Enviar notificações push na abertura e no encerramento
// de um sinal, com deep link pra XM.
//
// Não inicializa o Firebase Admin (admin.initializeApp() só pode
// rodar uma vez por processo) - recebe `admin`/`db` já inicializados
// por quem chama (scripts/scanner.js via ./firebase, js/checker.js
// com a própria inicialização direta). Chamar initializeApp() de novo
// aqui derrubaria o processo com "the default Firebase app already
// exists".
// ===================================================

// Link de destino ao tocar a notificação - decidido com o usuário:
// área geral da conta (saldo, Gerir, Depositar), não a tela de
// mercados nem uma ordem pronta (XM não expõe isso via URL pública).
//
// AJUSTE-045 (29/09/2026): o usuário achou a URL que abre direto a página
// do PAR na XM (`https://my.xm.com/pt/symbol-info/EURJPY`) e pediu que
// cada sinal use a do seu par. A notificação agora leva pra página do
// par do sinal (abertura e encerramento); a área da conta continua como
// fallback quando o par não gera um símbolo válido. Continua sem abrir a
// ORDEM pronta - a XM não expõe isso. Mesma regra de urlCorretoraXM() em
// js/historico.js (backend e navegador não compartilham código -
// manter iguais).
const URL_XM_MEMBER = "https://my.xm.com/pt/member";
const URL_XM_SIMBOLO = "https://my.xm.com/pt/symbol-info/";

// "EUR/JPY" -> "https://my.xm.com/pt/symbol-info/EURJPY". Só letras, 6
// caracteres; qualquer outra coisa cai na área da conta.
function urlXmParaPar(par) {

    const simbolo = String(par || "").replace(/[^A-Za-z]/g, "").toUpperCase();

    return simbolo.length === 6 ? URL_XM_SIMBOLO + simbolo : URL_XM_MEMBER;

}

// ===================================================
// ESTIMATIVA DE TEMPO HÁBIL (baseada em ATR, não arbitrária)
// ---------------------------------------------------
// ATR de 14 períodos em candles de 5min representa a amplitude MÉDIA
// de UM candle de 5min (não dos 14 juntos) - dividindo por 5, temos
// uma velocidade média de movimento em pips por minuto. A "janela pra
// agir" é quanto tempo, nessa velocidade, o preço leva pra se afastar
// de uma fração do SL (15%-30%) - além disso, a entrada já não
// reflete bem as condições que geraram o sinal. Faixa de 15%-30% é
// conservadora de propósito (não promete tempo demais). Teto de 10-15
// min porque o sinal foi validado com candles de 5min - promessa de
// "40 minutos" não faria sentido nessa escala.
// ===================================================

function estimarTempoHabilMinutos(atrAtual, slPips, par) {

    const atrPips =
        Number(atrAtual) *
        (String(par).includes("JPY") ? 100 : 10000);

    const slPipsNumero = Number(slPips);

    if (!atrPips || atrPips <= 0 || !slPipsNumero || slPipsNumero <= 0) {

        // Fallback conservador quando falta ATR/SL (não deveria
        // acontecer com um sinal salvo de verdade, mas não impede o
        // envio da notificação por causa disso).
        return { min: 3, max: 5 };

    }

    const velocidadePipsPorMinuto = atrPips / 5;

    const minPips = slPipsNumero * 0.15;
    const maxPips = slPipsNumero * 0.30;

    const minMinutos = Math.max(
        1,
        Math.round(minPips / velocidadePipsPorMinuto)
    );

    const maxMinutos = Math.max(
        minMinutos + 1,
        Math.round(maxPips / velocidadePipsPorMinuto)
    );

    return {

        min: Math.min(minMinutos, 10),

        max: Math.min(maxMinutos, 15)

    };

}

// ===================================================
// TOKENS ATIVOS
// ===================================================

async function obterTokensAtivos(db) {

    const snapshot = await db
        .collection("tokens")
        .where("ativo", "==", true)
        .get();

    return snapshot.docs.map(doc => doc.id);

}

// ===================================================
// ENVIO (por token, não multicast - poucos tokens esperados, e
// evita qualquer dúvida de compatibilidade de versão do SDK com
// sendEachForMulticast). Token inválido/expirado é desativado
// automaticamente (ativo:false), sem derrubar o envio pros outros.
// ===================================================

// AJUSTE-064 (03/10/2026): horário (Brasília, HH:MM) mostrado nas notificações.
// Pedido do usuário: todo push informa a hora em que o sinal foi emitido. Fica
// como linha própria no fim do corpo (o corpo já é menor que o título; o Android
// não deixa um app escolher o tamanho da fonte do texto da notificação). Sem
// horário válido, devolve null e a linha some.
function horaBrasilia(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

async function enviarParaTokens(admin, db, tokens, payload) {

    if (!tokens.length) return;

    await Promise.all(tokens.map(async (token) => {

        try {

            await admin.messaging().send({
                token,
                ...payload
            });

        } catch (erro) {

            const codigosTokenInvalido = [
                "messaging/registration-token-not-registered",
                "messaging/invalid-registration-token"
            ];

            if (codigosTokenInvalido.includes(erro.code)) {

                await db.collection("tokens").doc(token)
                    .set({ ativo: false }, { merge: true })
                    .catch(() => {});

            } else {

                console.log(`Aviso: falha ao enviar push pra um token: ${erro.message}`);

            }

        }

    }));

}

// ===================================================
// PUSH DE ABERTURA
// ===================================================

async function enviarPushAbertura(admin, db, operacao) {

    try {

        const tokens = await obterTokensAtivos(db);

        if (!tokens.length) return;

        const direcaoLabel = operacao.direcao === "BUY" ? "COMPRA" : "VENDA";

        const { min, max } = estimarTempoHabilMinutos(
            operacao.indicadores?.atr,
            operacao.financeiro?.slPips,
            operacao.par
        );

        await enviarParaTokens(admin, db, tokens, {

            notification: {
                title: `🔔 Novo sinal: ${operacao.par} ${direcaoLabel}`,
                body: `Entrada ~${operacao.precoEntrada} | Score ${operacao.score}% | ` +
                    `Janela pra agir: ${min}-${max} min` +
                    (horaBrasilia(operacao.inicioOperacao)
                        ? `\n🕐 Sinal emitido às ${horaBrasilia(operacao.inicioOperacao)}`
                        : "")
            },

            data: {
                url: urlXmParaPar(operacao.par),
                tipo: "abertura",
                // AJUSTE-064: epoch ms da emissão - o sw.js usa como `timestamp`
                // nativo da notificação (hora pequena do próprio Android).
                emitidoEm: String(Number(operacao.inicioOperacao) || ""),
                par: String(operacao.par || ""),
                direcao: String(operacao.direcao || "")
            },

            // FEATURE-011 nunca marcou urgência - por padrão o FCM (e o
            // sistema de push do Android por trás dele) trata push web
            // como prioridade normal, que pode ser segurada e entregue
            // em lote durante o Doze/economia de bateria do Android
            // (bem comum em MIUI/Xiaomi, Samsung, etc.) - exatamente o
            // tipo de atraso de vários minutos que o usuário reportou
            // (sinal às 09:50/10:05, push só às 10:12). "high" pede
            // pro sistema entregar imediatamente, acordando o
            // dispositivo se precisar - não é garantia (o Android ainda
            // pode restringir por app, ver aviso separado sobre
            // otimização de bateria), mas é o que o código controla.
            webpush: {
                headers: { Urgency: "high" }
            }

        });

    } catch (erro) {

        console.log(`Aviso: falha ao enviar push de abertura: ${erro.message}`);

    }

}

// ===================================================
// PUSH DE ENCERRAMENTO
// ===================================================

async function enviarPushEncerramento(admin, db, sinal) {

    try {

        const tokens = await obterTokensAtivos(db);

        if (!tokens.length) return;

        const emoji = sinal.resultado === "WIN" ? "✅" : "❌";

        const valor = Number(sinal.resultadoFinanceiro || 0);

        // Number.prototype.toFixed já inclui o "-" pra negativos - só
        // concatenar "$" na frente dava "$-3.20" em vez de "-$3.20".
        const valorFormatado = `${valor >= 0 ? "+" : "-"}$${Math.abs(valor).toFixed(2)}`;

        await enviarParaTokens(admin, db, tokens, {

            notification: {
                title: `${emoji} ${sinal.par} encerrado: ${sinal.resultado}`,
                body: `${valorFormatado}${sinal.motivoEncerramento ? ` | ${sinal.motivoEncerramento}` : ""}` +
                    // AJUSTE-064: hora do sinal e hora (do candle) em que o preço
                    // tocou o alvo. Se o push chegar bem depois, a diferença
                    // mostra que o verificador demorou a ver (ex.: limite 429
                    // da TwelveData), não que o mercado fechou agora.
                    (horaBrasilia(sinal.inicioOperacao)
                        ? `\n🕐 Sinal das ${horaBrasilia(sinal.inicioOperacao)}` +
                          (horaBrasilia(sinal.fimOperacao) ? ` · alvo tocado às ${horaBrasilia(sinal.fimOperacao)}` : "")
                        : "")
            },

            data: {
                url: urlXmParaPar(sinal.par),
                tipo: "encerramento",
                par: String(sinal.par || ""),
                resultado: String(sinal.resultado || "")
            },

            // Mesmo motivo do push de abertura - ver comentário lá.
            webpush: {
                headers: { Urgency: "high" }
            }

        });

    } catch (erro) {

        console.log(`Aviso: falha ao enviar push de encerramento: ${erro.message}`);

    }

}

// ===================================================
// PUSH DE AVISO DE LUCRO PARCIAL (07/10/2026) - só informa; ver scripts/avisoParcial.js
// ===================================================

async function enviarPushAvisoParcial(admin, db, sinal, aviso) {

    try {

        const tokens = await obterTokensAtivos(db);

        if (!tokens.length) return;

        const direcaoLabel = sinal.direcao === "BUY" ? "COMPRA" : "VENDA";
        const usd = Number.isFinite(Number(aviso.usd)) ? ` (≈ ${Number(aviso.usd) >= 0 ? "+" : "-"}$${Math.abs(Number(aviso.usd)).toFixed(2)}` +
            (Number.isFinite(Number(sinal.tpUSD)) ? ` de $${Number(sinal.tpUSD).toFixed(2)})` : ")") : "";

        await enviarParaTokens(admin, db, tokens, {

            notification: {
                title: `💰 ${sinal.par} ${direcaoLabel}: ${Math.round(aviso.pctAtingido)}% do alvo`,
                body: `Lucro aberto +${aviso.pips} pips de ${aviso.tpPips}${usd}. ` +
                    `Encerrar agora ou esperar o TP? A decisão é sua; o app não fecha nada sozinho.` +
                    (horaBrasilia(sinal.inicioOperacao) ? `\n🕐 Sinal das ${horaBrasilia(sinal.inicioOperacao)}` : "")
            },

            data: {
                url: urlXmParaPar(sinal.par),
                tipo: "aviso_parcial",
                par: String(sinal.par || ""),
                direcao: String(sinal.direcao || "")
            },

            webpush: {
                headers: { Urgency: "high" }
            }

        });

    } catch (erro) {

        console.log(`Aviso: falha ao enviar push de aviso parcial: ${erro.message}`);

    }

}

module.exports = {

    URL_XM_MEMBER,

    URL_XM_SIMBOLO,

    urlXmParaPar,

    horaBrasilia,

    estimarTempoHabilMinutos,

    obterTokensAtivos,

    enviarParaTokens,

    enviarPushAbertura,

    enviarPushEncerramento,

    enviarPushAvisoParcial

};
