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
const URL_XM_MEMBER = "https://my.xm.com/pt/member";

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
                    `Janela pra agir: ${min}-${max} min`
            },

            data: {
                url: URL_XM_MEMBER,
                tipo: "abertura",
                par: String(operacao.par || ""),
                direcao: String(operacao.direcao || "")
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
                body: `${valorFormatado}${sinal.motivoEncerramento ? ` | ${sinal.motivoEncerramento}` : ""}`
            },

            data: {
                url: URL_XM_MEMBER,
                tipo: "encerramento",
                par: String(sinal.par || ""),
                resultado: String(sinal.resultado || "")
            }

        });

    } catch (erro) {

        console.log(`Aviso: falha ao enviar push de encerramento: ${erro.message}`);

    }

}

module.exports = {

    URL_XM_MEMBER,

    estimarTempoHabilMinutos,

    obterTokensAtivos,

    enviarParaTokens,

    enviarPushAbertura,

    enviarPushEncerramento

};
