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

module.exports = {
  existeCooldown
};
