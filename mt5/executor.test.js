// Garantias estáticas do EA executor (não dá para compilar MQL5 aqui; isto só impede regressões perigosas).
const assert = require("assert");
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/XM_Executor.mq5", "utf8");
const codigo = src.replace(/(^|\s)\/\/.*$/gm, "$1");
const semTextos = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""');

// SÓ DEMO e limites de segurança
assert.ok(/ACCOUNT_TRADE_MODE\)\s*!=\s*ACCOUNT_TRADE_MODE_DEMO/.test(codigo) && codigo.includes("INIT_FAILED"), "recusa conta que não seja demo");
assert.ok(/LoteFixo\s*>\s*0\.05/.test(codigo), "teto de lote");
assert.ok(/MaxPosicoes\s*>\s*12/.test(codigo), "teto de posições");
// COMEÇA EM ENSAIO
assert.ok(/input bool\s+SoLog\s*=\s*true;/.test(codigo), "SoLog (ensaio) deve começar ligado");
assert.ok(/input double LoteFixo\s*=\s*0\.02;/.test(codigo));
assert.ok(/input string TokenIngest\s*=\s*"";/.test(codigo));
assert.ok(!src.includes("__CHAVE_WEB__"), "chave web preenchida");
// o ensaio nunca envia ordem: o retorno do ensaio vem ANTES de PositionOpen
const iEnsaio = codigo.indexOf("if(SoLog)"), iOrdem = codigo.indexOf("trade.PositionOpen");
assert.ok(iEnsaio > 0 && iOrdem > iEnsaio, "ensaio antes do envio de ordem");
assert.ok(codigo.slice(iEnsaio, iOrdem).includes("return;"), "ensaio retorna antes de abrir ordem");
// única função de negociação: abrir posição a mercado com SL e TP. Nada de fechar, modificar ou apagar
const usos = semTextos.match(/trade\.\w+\(/g) || [];
for (const u of usos) assert.ok(["trade.SetExpertMagicNumber(", "trade.SetDeviationInPoints(", "trade.SetTypeFillingBySymbol(", "trade.PositionOpen(", "trade.ResultRetcode(", "trade.ResultRetcodeDescription("].includes(u), `uso de CTrade não permitido: ${u}`);
for (const proibido of ["PositionClose", "PositionModify", "OrderDelete", "OrderSend", "trade.Buy", "trade.Sell", "OrderModify"]) assert.ok(!semTextos.includes(proibido), `não pode usar ${proibido}`);
assert.strictEqual((semTextos.match(/trade\.PositionOpen\(/g) || []).length, 1, "um único ponto de envio de ordem");
// guarda de derrapagem: existe, vem ANTES do ensaio e do envio, e é validada no OnInit
const iGuarda = codigo.indexOf("derrapagem > MaxDerrapagemFracSL * slPips");
assert.ok(iGuarda > 0 && iGuarda < iEnsaio && iGuarda < iOrdem, "guarda de derrapagem antes do ensaio e da ordem");
assert.ok(/input double MaxDerrapagemFracSL\s*=\s*0\.25;/.test(codigo), "guarda de derrapagem padrão 25% do SL");
assert.ok(/MaxDerrapagemFracSL\s*<\s*0\.10\s*\|\|\s*MaxDerrapagemFracSL\s*>\s*1\.0/.test(codigo), "limites do guarda validados");
assert.ok(/input int\s+MaxPosicoes\s*=\s*12;/.test(codigo), "MaxPosicoes padrão 12 (decisão de 24/11/2026: paridade app x XM)");
assert.ok(codigo.includes('" pips | spread "'), "spread registrado no log");
// uma por par, limite de posições, idade máxima, tentativas limitadas
assert.ok(semTextos.includes("TemPosicaoNoSimbolo(") && semTextos.includes("PositionsTotal() >= MaxPosicoes") && semTextos.includes("idade > MaxIdadeSinalSeg") && /n >= 3/.test(semTextos));
// nada que identifique a conta; só o host do Firestore; token fora de Print/Aviso
for (const id of ["ACCOUNT_LOGIN", "ACCOUNT_NAME", "ACCOUNT_SERVER", "ACCOUNT_COMPANY"]) assert.ok(!codigo.includes(id), `não usar ${id}`);
const hosts = [...codigo.matchAll(/https?:\/\/[^\/"]+/g)].map(m => m[0]);
assert.deepStrictEqual([...new Set(hosts)], ["https://firestore.googleapis.com"]);
assert.ok(!/(Print|Aviso)\([^;]*TokenIngest/.test(semTextos), "token fora do log");
// a leitura da fila é só GET
assert.ok(/WebRequest\("GET"/.test(codigo) && !/WebRequest\("(POST|PATCH|PUT|DELETE)"/.test(codigo));
for (const [a, b] of [["{", "}"], ["(", ")"], ["[", "]"]]) {
    const limpo = codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    assert.strictEqual(limpo.split(a).length, limpo.split(b).length, `${a}${b} desbalanceado`);
}
// ---- v1.20: gestão de risco (modos 0 desligado / 1 só registra / 2 bloqueia) ----
assert.ok(/#property version\s+"1\.30"/.test(src), "versão 1.30");
assert.ok(/input int\s+ModoExposicao\s*=\s*1;/.test(codigo) && /input int\s+ModoMetaDia\s*=\s*1;/.test(codigo) && /input int\s+ModoPerdaDia\s*=\s*1;/.test(codigo), "exposição, perda e meta: TODOS só REGISTRAM por padrão (o usuário decidiu em 23/11: 'não quero que bloqueie ainda por perda')");
assert.ok(/input int\s+MaxPorMoeda\s*=\s*2;/.test(codigo) && /input double PerdaDiaUsd\s*=\s*15\.0;/.test(codigo) && /input double MetaDiaUsd\s*=\s*10\.0;/.test(codigo) && /input bool\s+PausaRolloverBrt\s*=\s*true;/.test(codigo), "limites aprovados");
const iGestao = codigo.indexOf("RegrasExposicao(sym, compra)", codigo.indexOf("string motivoExp"));
assert.ok(iGestao > 0 && iGestao < iEnsaio && iGestao < iOrdem && codigo.indexOf("LucroDiaBrt()", codigo.indexOf("double lucroDia")) < iEnsaio && codigo.indexOf("TextoMetaDia(lucroDia)") < iEnsaio, "gestão antes do ensaio e da ordem");
assert.ok(/ModoExposicao\s*>=\s*2/.test(codigo) && /ModoPerdaDia\s*>=\s*2/.test(codigo) && /ModoMetaDia\s*>=\s*2/.test(codigo), "só bloqueia no modo 2");
assert.ok(!codigo.includes("ModoParadaDia"), "a chave única antiga saiu");
assert.ok(codigo.includes("BLOQUEARIA (") && codigo.includes("PARARIA O DIA ("), "modo 1 registra o que faria");
for (const f of ["HistorySelect(", "HistoryDealGetTicket(", "DEAL_ENTRY_OUT", "DEAL_MAGIC", "PositionGetTicket("]) assert.ok(codigo.includes(f), `usa ${f}`);
assert.ok(/ModoPerdaDia\s*<\s*0\s*\|\|\s*ModoPerdaDia\s*>\s*2/.test(codigo) && /ModoMetaDia\s*<\s*0\s*\|\|\s*ModoMetaDia\s*>\s*2/.test(codigo), "modos da perda e da meta validados");
assert.ok(/ModoExposicao\s*<\s*0\s*\|\|\s*ModoExposicao\s*>\s*2/.test(codigo) && /MaxPorMoeda\s*<\s*1\s*\|\|\s*MaxPorMoeda\s*>\s*12/.test(codigo), "limites validados no OnInit");
// especificação espelhada em JS (o EA não roda aqui): exposição líquida por moeda, o mesmo algoritmo de ExpMoeda/RegrasExposicao
const exp = (m, sym, compra) => sym.length < 6 ? 0 : m === sym.slice(0, 3) ? (compra ? 1 : -1) : m === sym.slice(3, 6) ? (compra ? -1 : 1) : 0;
const viola = (posicoes, sym, compra, lim = 2) => {
    const atual = (m) => posicoes.reduce((a, [s, c]) => a + exp(m, s, c), 0);
    const b = sym.slice(0, 3), q = sym.slice(3, 6);
    return Math.abs(atual(b) + (compra ? 1 : -1)) > lim ? b : Math.abs(atual(q) + (compra ? -1 : 1)) > lim ? q : null;
};
// o caso de 23/11/2026: EUR/USD e GBP/USD comprados (dólar fraco) + USD/CHF vendido (dólar fraco) = 3 contra o dólar
assert.strictEqual(viola([["EURUSD", true], ["GBPUSD", true]], "USDCHF", false), "USD", "terceira aposta contra o dólar é barrada");
assert.strictEqual(viola([["EURUSD", true], ["GBPUSD", true]], "USDCHF", true), null, "USD/CHF comprado compensa, passa");
// o iene nos cruzados: EUR/JPY e GBP/JPY comprados + USD/JPY comprado = 3 contra o iene
assert.strictEqual(viola([["EURJPY", true], ["GBPJPY", true]], "USDJPY", true), "JPY");
assert.strictEqual(viola([["EURJPY", true], ["GBPJPY", true]], "EURUSD", true), null);
assert.strictEqual(viola([["GOLD", true], ["GOLD", true], ["GOLD", true]], "EURUSD", true), null, "ativos que não são par de moedas não contam");

// ---- v1.30: sinais de materias-primas/indice (item da fila com 9o campo "M") ----
assert.ok(/nCampos != 8 && nCampos != 9/.test(src), "aceita item de 8 (forex) ou 9 (materia) campos");
assert.ok(/bool materia = \(nCampos == 9 && c\[8\] == "M"\);/.test(src), "marcador M no 9o campo");
assert.ok(/double lote = LoteFixo;/.test(src) && /lote = Num\(c\[7\]\);/.test(src), "materia usa o lote do sinal; forex continua com LoteFixo");
assert.ok(/SYMBOL_VOLUME_STEP/.test(src) && /MathFloor\(lote \/ passo/.test(src), "lote ajustado ao passo do simbolo");
assert.ok(/lote > LoteMaxMaterias\) lote = LoteMaxMaterias/.test(src), "teto de lote para materias");
assert.ok(/input double LoteMaxMaterias\s*=\s*0\.30;/.test(src), "teto padrao 0,30");
assert.ok(/LoteMaxMaterias < 0\.01 \|\| LoteMaxMaterias > 1\.0/.test(src), "validacao do teto no OnInit");
assert.ok(/PositionOpen\(sym, compra \? ORDER_TYPE_BUY : ORDER_TYPE_SELL, lote, preco, sl, tp/.test(src), "a ordem usa a variavel lote");
assert.ok(!/PositionOpen\([^;]*LoteFixo/.test(src), "nenhuma ordem usa mais LoteFixo direto");
// espelho em JS do ajuste de lote: passo 0,01, teto 0,30, minimo do simbolo
const ajustaLote = (sinal, passo, vmin, vmax, teto) => { let l = Math.floor(sinal / passo + 1e-9) * passo; l = Math.round(l * 100) / 100; if (l > teto) l = teto; if (vmax > 0 && l > vmax) l = vmax; return l < vmin || l <= 0 ? null : l; };
assert.strictEqual(ajustaLote(0.0128, 0.01, 0.01, 100, 0.3), 0.01); assert.strictEqual(ajustaLote(0.22, 0.01, 0.01, 100, 0.3), 0.22);
assert.strictEqual(ajustaLote(0.5, 0.01, 0.01, 100, 0.3), 0.3, "teto"); assert.strictEqual(ajustaLote(0.004, 0.01, 0.01, 100, 0.3), null, "abaixo do minimo: nao opera");

console.log("TODOS OS TESTES ESTÁTICOS DO EXECUTOR PASSARAM");
