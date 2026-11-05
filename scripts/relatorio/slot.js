// Passo barato do workflow: diz se AGORA é um horário de relatório (para pular npm install e Firebase nos outros ~99% dos ciclos).
// Só escreve `quando=sim|nao` no GITHUB_OUTPUT; a reserva atômica (uma vez por horário) fica em agendado.js.
const fs = require("fs");
const { slotDiario, slotSemanal } = require("./agenda");

const agora = Date.now();
const d = slotDiario(agora), s = slotSemanal(agora);
const quando = d || s ? "sim" : "nao";
console.log(`relatorio: ${quando === "sim" ? [d, s].filter(Boolean).join(" + ") : "fora dos horários, nada a fazer"}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `quando=${quando}\n`);
