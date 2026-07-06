// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// STATISTICS ENGINE
//
// Responsabilidade:
// Calcular estatísticas históricas para auxiliar
// a Engine RMI.
//
// SPRINT 05
// ===================================================

async function obterEstatisticasPar(
    db,
    par
) {
    const snapshot =
    await db
        .collection("historico")
        .where("par", "==", par)
        .get();
    
    let wins = 0;
    let loss = 0;

    const operacoesHistorico = [];

snapshot.forEach(doc => {

    const dados = doc.data();

    if (
        dados.resultado === "WIN" ||
        dados.resultado === "LOSS"
    ) {

        operacoesHistorico.push(dados);

    }

});

operacoesHistorico.sort((a, b) => {

    const dataA = new Date(a.dataHora || 0);

    const dataB = new Date(b.dataHora || 0);

    return dataB - dataA;

});

const ultimasOperacoes =
    operacoesHistorico.slice(0, 10);

ultimasOperacoes.forEach(dados => {

    if (dados.resultado === "WIN")
        wins++;

    if (dados.resultado === "LOSS")
        loss++;

});

    const operacoes =
        wins + loss;
// ===================================================
// CONFIABILIDADE DO HISTÓRICO
// ===================================================

const historicoSuficiente =
    operacoes >= 10;
    
    const taxaAcerto =
        operacoes === 0
            ? 0
            : Number(
                (
                    wins * 100 /
                    operacoes
                ).toFixed(1)
            );

// ===================================================
// CONFIANÇA ESTATÍSTICA
// ===================================================

let confianca = "BAIXA";

if (operacoes >= 100) {

    confianca = "ALTA";

}

else if (operacoes >= 50) {

    confianca = "MÉDIA";

}
    
// ===================================================
// CLASSIFICAÇÃO DO HISTÓRICO
// ===================================================

let status = "SEM_DADOS";

if (operacoes >= 20) {

    if (taxaAcerto >= 80) {

        status = "EXCELENTE";

    }

    else if (taxaAcerto >= 70) {

        status = "BOM";

    }

    else if (taxaAcerto >= 55) {

        status = "NEUTRO";

    }

    else {

        status = "RUIM";

    }

}
    
    return {

    wins,

    loss,

    operacoes,

    historicoSuficiente,

    confianca,

    taxaAcerto,

    status

    ultimos5: ultimos.slice(0, 5),

    ultimos10: ultimos.slice(0, 10),

};

}

module.exports = {

    obterEstatisticasPar

};
