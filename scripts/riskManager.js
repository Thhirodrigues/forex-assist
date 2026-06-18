function existeCooldown(ultimoTimestamp, cooldownMinutos) {

  if (!ultimoTimestamp)
    return false;

  const limite =
    Date.now() -
    cooldownMinutos *
    60 *
    1000;

  return ultimoTimestamp > limite;

}

async function salvarOperacao(db, dados) {

  await db
  .collection("historico")
  .add({
    ...dados,
    horario: new Date().toLocaleString("pt-BR"),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

module.exports = {
  existeCooldown,
  salvarOperacao
};
