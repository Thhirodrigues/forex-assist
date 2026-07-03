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
            .where("resultado", "in", [
                "WIN",
                "LOSS"
            ])
            .get();

    let wins = 0;
    let loss = 0;

    snapshot.forEach(doc => {

        const dados = doc.data();

        if (dados.resultado === "WIN")
            wins++;

        if (dados.resultado === "LOSS")
            loss++;

    });

    const operacoes =
        wins + loss;

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

    taxaAcerto,

    status

};

}

module.exports = {

    obterEstatisticasPar

};
