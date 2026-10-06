// Rodízio de chaves da TwelveData: 3 chaves (como antes) ou 4 quando API_KEY_4 existe; 429 pula para a próxima chave.
const assert = require("assert");
const { execFileSync } = require("child_process");

function roda(env) {
  const codigo = `
    const axios = require("axios");
    const usadas = [];
    axios.get = async (url) => { const k = /apikey=([^&]+)/.exec(url)[1]; usadas.push(k); if (global.__429 && global.__429.has(k)) { const e = new Error("429"); e.response = { status: 429 }; throw e; } return { data: { values: [{ datetime: "2026-10-06 12:00:00", close: "1" }] } }; };
    const { getCandles, configurarMarketData } = require("./marketData");
    (async () => {
      configurarMarketData({});
      const ordem = [];
      for (let i = 0; i < 8; i++) { usadas.length = 0; await getCandles("EUR/USD", "5min", 5); ordem.push(usadas[0]); }
      global.__429 = new Set(["A"]); usadas.length = 0;
      let r429 = []; for (let i = 0; i < 4; i++) { usadas.length = 0; await getCandles("EUR/USD", "5min", 5); r429.push(usadas.slice()); }
      console.log(JSON.stringify({ ordem, r429 }));
    })();`;
  return JSON.parse(execFileSync("node", ["-e", codigo], { cwd: __dirname, env: { ...process.env, ...env }, encoding: "utf8" }).trim().split("\n").pop());
}

const tres = roda({ API_KEY_1: "A", API_KEY_2: "B", API_KEY_3: "C", API_KEY_4: "" });
assert.deepStrictEqual([...new Set(tres.ordem)].sort(), ["A", "B", "C"], "sem a 4ª chave: 3 chaves, como antes");

const quatro = roda({ API_KEY_1: "A", API_KEY_2: "B", API_KEY_3: "C", API_KEY_4: "D" });
assert.deepStrictEqual([...new Set(quatro.ordem)].sort(), ["A", "B", "C", "D"], "com a 4ª chave: as 4 entram no rodízio");
assert.deepStrictEqual(quatro.ordem.slice(0, 4).sort(), ["A", "B", "C", "D"], "cada chave uma vez a cada 4 chamadas");
assert.ok(quatro.r429.every(u => u[u.length - 1] !== "A"), "429 em A: a chamada termina numa chave que funciona");
assert.ok(quatro.r429.some(u => u.includes("A") && u.length > 1), "e a chave com 429 foi pulada na hora (tentou A, depois a próxima)");
console.log("TESTES DO RODÍZIO DE CHAVES PASSARAM");
