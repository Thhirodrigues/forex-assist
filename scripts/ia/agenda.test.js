const assert = require("assert");
const { slotGerar, slotFechar, SLOTS_GERAR } = require("./agenda");
const { principalAgendado } = require("./agendado");
const U = (d, h, m = 0, s = 0) => Date.UTC(2026, 10, d, h, m, s);   // novembro de 2026: 05/11 = quinta; 06 = sexta; 07 = sábado; 08 = domingo; 09 = segunda

// GERAR: horário fixo até +25 min; antes ou depois, não
assert.deepStrictEqual(SLOTS_GERAR, ["08:07", "10:07", "12:07", "14:07", "16:07", "18:07"]);
assert.strictEqual(slotGerar(U(5, 14, 7)), "gerar_2026-11-05T14:07", "exatamente no horário");
assert.strictEqual(slotGerar(U(5, 14, 10, 30)), "gerar_2026-11-05T14:07", "o ciclo do scanner das 14:10");
assert.strictEqual(slotGerar(U(5, 14, 31, 59)), "gerar_2026-11-05T14:07", "até 25 min depois");
assert.strictEqual(slotGerar(U(5, 14, 32, 0)), null, "passou da janela");
assert.strictEqual(slotGerar(U(5, 14, 6, 59)), null, "antes do horário");
assert.strictEqual(slotGerar(U(5, 9, 0)), null); assert.strictEqual(slotGerar(U(5, 13, 0)), null);
assert.strictEqual(slotGerar(U(5, 18, 20)), "gerar_2026-11-05T18:07"); assert.strictEqual(slotGerar(U(5, 19, 0)), null);
assert.strictEqual(slotGerar(U(5, 8, 12)), "gerar_2026-11-05T08:07");
assert.strictEqual(slotGerar(U(5, 7, 59)), null);
// fim de semana: nenhum
assert.strictEqual(slotGerar(U(7, 14, 10)), null, "sábado"); assert.strictEqual(slotGerar(U(8, 14, 10)), null, "domingo");
assert.strictEqual(slotGerar(U(6, 16, 10)), "gerar_2026-11-06T16:07", "sexta vale"); assert.strictEqual(slotGerar(U(9, 8, 10)), "gerar_2026-11-09T08:07", "segunda vale");
// 6 horários por dia útil, nenhum a mais
let n = 0; for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 5) if (slotGerar(U(5, h, m))) n++;
assert.ok(n > 0); const chaves = new Set(); for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) { const k = slotGerar(U(5, h, m)); if (k) chaves.add(k); }
assert.strictEqual(chaves.size, 6, "exatamente 6 horários de gerar por dia");

// FECHAR: :00 e :30 (+10 min), dias úteis
assert.strictEqual(slotFechar(U(5, 14, 0)), "fechar_2026-11-05T14:00"); assert.strictEqual(slotFechar(U(5, 14, 9, 59)), "fechar_2026-11-05T14:00");
assert.strictEqual(slotFechar(U(5, 14, 10)), null); assert.strictEqual(slotFechar(U(5, 14, 29)), null);
assert.strictEqual(slotFechar(U(5, 14, 30)), "fechar_2026-11-05T14:30"); assert.strictEqual(slotFechar(U(5, 14, 39)), "fechar_2026-11-05T14:30");
assert.strictEqual(slotFechar(U(5, 14, 40)), null); assert.strictEqual(slotFechar(U(7, 14, 0)), null, "sábado");
const fechamentos = new Set(); for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) { const k = slotFechar(U(5, h, m)); if (k) fechamentos.add(k); }
assert.strictEqual(fechamentos.size, 48, "48 fechamentos por dia útil");

(async () => {
    // fora dos horários: sai sem carregar Firebase nem SDK (rápido, nunca derruba o scanner)
    const saida = []; const r = await principalAgendado({ agora: U(5, 9, 20), log: (m) => saida.push(m) });
    assert.strictEqual(r.acao, "NENHUMA"); assert.match(saida[0], /fora dos horários fixos/);
    assert.strictEqual((await principalAgendado({ agora: U(7, 14, 10), log: () => {} })).acao, "NENHUMA", "fim de semana");

    // PROGRAMADO só com IA_SLOT_OK (definido por agendado.js depois de validar o horário): execução manual não vira PROGRAMADO
    const { principal } = require("./cli");
    const salva = { ...process.env };
    try {
        process.env.IA_MODO = "gerar"; process.env.IA_MODELO = "claude-haiku-5-5"; process.env.ANTHROPIC_API_KEY = "x"; process.env.IA_ORIGEM = "PROGRAMADO"; process.env.IA_DRY = "0";
        delete process.env.IA_SLOT_OK; delete process.env.IA_FORCAR_DECISAO; delete process.env.IA_MIN_PARES;
        await assert.rejects(principal(), /só é permitida dentro de um horário fixo/);
    } finally { for (const k of Object.keys(process.env)) if (!(k in salva)) delete process.env[k]; Object.assign(process.env, salva); }
    console.log("TODOS OS TESTES DA AGENDA DA IA PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
