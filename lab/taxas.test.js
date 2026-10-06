const assert = require("assert");
const { parsearBIS, taxaEm, linhasCSV } = require("./taxas");

const csv = [
    'DATAFLOW,FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE,TITLE',
    'BIS:WS_CBPOL(1.0),D,US,2020-01-01,1.75,"Policy rate, United States"',
    'BIS:WS_CBPOL(1.0),D,US,2020-01-02,1.75,"Policy rate, United States"',
    'BIS:WS_CBPOL(1.0),D,US,2020-03-16,0.25,"Policy rate, United States"',
    'BIS:WS_CBPOL(1.0),D,XM,2020-01-01,0,"Policy rate, euro area"',
    'BIS:WS_CBPOL(1.0),D,JP,2020-01-01,-0.1,"x"'
].join("\n");
assert.deepStrictEqual(linhasCSV('a,"b,c",d\n1,2,3')[0], ["a", "b,c", "d"]);
const t = parsearBIS(csv);
assert.deepStrictEqual(t.USD.v, [1.75, 0.25], "só degraus");
assert.strictEqual(t.EUR.v[0], 0);
assert.strictEqual(t.JPY.v[0], -0.1, "taxa negativa preservada");
assert.deepStrictEqual(t.GBP, { ts: [], v: [] }, "área ausente vira série vazia");
const d = (s) => Date.parse(s + "T00:00:00Z");
assert.strictEqual(taxaEm(t.USD, d("2020-03-15")), 1.75, "antes do corte ainda a taxa velha (sem olhar para frente)");
assert.strictEqual(taxaEm(t.USD, d("2020-03-16")), 0.25);
assert.strictEqual(taxaEm(t.USD, d("2019-12-31")), null);
assert.throws(() => parsearBIS("A,B\n1,2"), /cabeçalho/);
console.log("TESTES DAS TAXAS PASSARAM");
