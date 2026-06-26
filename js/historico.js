function historicoView() {
  return `
    <div class="card">
      <div id="historicoHeader" style="position:sticky; top:0; z-index:999; background:#081733; padding-bottom:10px;">
        <div class="card-title">Histórico de Sinais</div>
        <div id="historicoStats" style="margin-bottom:15px;">Carregando estatísticas...</div>
      </div>
      <div id="historicoLista">Carregando histórico...</div>
    </div>
  `;
}

// Gerenciar estado de sinais abertos com persistência blindada
function obterSinaisAbertos() {
  try {
    const stored = localStorage.getItem('sinaisAbertos');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Erro ao obter sinais abertos:", e);
    return [];
  }
}

function salvarSinalAberto(sinalId) {
  try {
    const abertos = obterSinaisAbertos();
    if (!abertos.includes(sinalId)) {
      abertos.push(sinalId);
      localStorage.setItem('sinaisAbertos', JSON.stringify(abertos));
    }
  } catch (e) {
    console.error("Erro ao salvar sinal aberto:", e);
  }
}

function removerSinalAberto(sinalId) {
  try {
    const abertos = obterSinaisAbertos();
    const index = abertos.indexOf(sinalId);
    if (index > -1) {
      abertos.splice(index, 1);
      localStorage.setItem('sinaisAbertos', JSON.stringify(abertos));
    }
  } catch (e) {
    console.error("Erro ao remover sinal aberto:", e);
  }
}

async function carregarHistorico() {
  const lista = document.getElementById("historicoLista");
  const stats = document.getElementById("historicoStats");
  if (!lista) return;

  try {
    const snapshot = await db
      .collection("historico")
      .orderBy("timestamp", "desc")
      .limit(300)
      .get();

    let wins = 0;
    let losses = 0;
    const gruposPorData = {};

    const hojeStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const sinaisAbertos = obterSinaisAbertos();

    snapshot.forEach((doc) => {
      const sinal = doc.data();
      let dataObj = null;

      if (sinal.timestamp) {
          let ts = sinal.timestamp;
          if (ts.toDate) ts = ts.toDate();
          else if (typeof ts === "number" && ts < 1000000000000) ts = ts * 1000;
          
          const d = new Date(ts);
          if (!isNaN(d.getTime())) dataObj = d;
      }

      if (!dataObj && (sinal.horario || sinal.data)) {
          const str = sinal.horario || sinal.data;
          const partes = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (partes) {
              dataObj = new Date(partes[3], partes[2] - 1, partes[1]);
          }
      }

      if (sinal.resultado === "WIN") wins++;
      if (sinal.resultado === "LOSS") losses++;

      const dataSinal = dataObj 
          ? dataObj.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) 
          : "Data Indefinida";

      const isCooldown = sinal.status === "COOLDOWN" || sinal.origem === "cooldown";

      const isDestaque = app.sinalParaDestacar === doc.id;
      const estaAberto = sinaisAbertos.includes(doc.id) || isDestaque;
      const detalheId = `detalhe-${doc.id}`;
      const borderStyle = isDestaque ? 'border: 2px solid #00ff88; background: rgba(0, 255, 136, 0.1);' : '';
      
      const card = `
        <div class="list-item" id="sinal-${doc.id}" style="${borderStyle}" data-sinal-id="${doc.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:bold;">
            <span>
              ${isCooldown ? "🚫" : (sinal.direcao === "BUY" || sinal.direcao === "CALL" ? "🟢" : "🔴")}
              ${sinal.par || "-"}
              |
              ${(sinal.direcao || "-").replace("CALL", "COMPRA").replace("PUT", "VENDA")}
            </span>
            <span>
              ${isCooldown ? "COOLDOWN" : (sinal.resultado === "WIN" ? "✅ WIN" : sinal.resultado === "LOSS" ? "❌ LOSS" : "⏳ PENDENTE")}
            </span>
          </div>
          <div style="margin-top:4px; font-size:12px; color:#8c95b3;">
            ${sinal.loteUtilizado ? `💳 Lote: <b>${sinal.loteUtilizado}</b> | ` : ""}${dataSinal} &nbsp; 
            ${dataObj ? dataObj.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }).substring(0, 5) : "--:--"}
            ${!isCooldown ? ` | Qualidade: ${sinal.qualidade ?? "-"}%` : ""}
          </div>
          ${sinal.movimentoPips !== undefined ? `
            <div style="margin-top:6px; font-size:12px; color:${sinal.resultado === 'WIN' ? '#00ff88' : '#ff4444'}; font-weight:bold;">
              📊 Movimentação: ${sinal.movimentoPips > 0 ? '+' : ''}${sinal.movimentoPips} pips
            </div>
          ` : ''}
          
          <div id="${detalheId}" style="display: ${estaAberto ? 'block' : 'none'}; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px; color:#8c95b3;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              <div>📉 RSI: <b>${sinal.rsi ? Number(sinal.rsi).toFixed(2) : '-'}</b></div>
              <div>📊 EMA 9: <b>${sinal.ema9 ? Number(sinal.ema9).toFixed(5) : '-'}</b></div>
              <div>📊 EMA 21: <b>${sinal.ema21 ? Number(sinal.ema21).toFixed(5) : '-'}</b></div>
              <div>🏠 EMA 200: <b>${sinal.ema200 ? Number(sinal.ema200).toFixed(5) : '-'}</b></div>
              <div>💰 Entrada: <b>${sinal.precoEntrada || '-'}</b></div>
              <div>🏁 Saída: <b>${sinal.precoFechamento || '-'}</b></div>
            </div>
            ${sinal.movimentoPips !== undefined ? `
              <div style="margin-top:10px; padding:8px; border-radius:4px; background:rgba(255,255,255,0.05); text-align:center; font-weight:bold;">
                <div style="color:${sinal.resultado === 'WIN' ? '#00ff88' : (sinal.resultado === 'LOSS' ? '#ff4444' : '#8c95b3')};">
                  VARIAÇÃO: ${sinal.movimentoPips > 0 ? '+' : ''}${sinal.movimentoPips} PIPS
                </div>
                ${sinal.lucroEstimado !== undefined ? `
                  <div style="margin-top:5px; font-size:14px; color:${sinal.lucroEstimado >= 0 ? '#00ff88' : '#ff4444'};">
                    RESULTADO: ${sinal.lucroEstimado >= 0 ? '+' : ''}$${sinal.lucroEstimado.toFixed(2)}
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      if (!gruposPorData[dataSinal]) gruposPorData[dataSinal] = "";
      gruposPorData[dataSinal] += card;
    });

    // Estatísticas
    const total = wins + losses;
    const taxa = total > 0 ? ((wins / total) * 100).toFixed(1) : "0";
    if (stats) {
      stats.innerHTML = `
        <div class="card" style="padding:10px;">
          <div style="text-align:center; font-size:17px; font-weight:bold;">
            ✅ ${wins} &nbsp;&nbsp;&nbsp; ❌ ${losses} &nbsp;&nbsp;&nbsp; 🎯 ${taxa}%
          </div>
          <button id="btnMinimizarTudo" style="margin-top:10px; width:100%; padding:8px; border:none; border-radius:8px; background:#132852; color:white; font-size:13px; cursor:pointer;">
            Minimizar Tudo
          </button>
        </div>
      `;
    }

    // Renderização dos Grupos
    let finalHtml = "";
    const datasOrdenadas = Object.keys(gruposPorData).sort((a, b) => {
      if (a === "Data Indefinida") return 1;
      if (b === "Data Indefinida") return -1;
      const [da, ma, aa] = a.split("/");
      const [db, mb, ab] = b.split("/");
      return new Date(ab, mb - 1, db) - new Date(aa, ma - 1, da);
    });

    datasOrdenadas.forEach((data) => {
      const idData = data.replaceAll("/", "");
      const isHoje = data === hojeStr;
      const label = isHoje ? `HOJE (${data})` : data;

      const temSinalDestacado = app.sinalParaDestacar && gruposPorData[data].includes(`id="sinal-${app.sinalParaDestacar}"`);
      const mostrarGrupo = isHoje || temSinalDestacado;

      finalHtml += `
        <div onclick="const el = document.getElementById('data${idData}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" 
             style="margin-top:20px; margin-bottom:10px; font-size:12px; color:#8c95b3; font-weight:bold; cursor:pointer; display:flex; align-items:center;">
          <span style="margin-right:8px;">${mostrarGrupo ? "▼" : "▶"}</span> ${label}
        </div>
        <div id="data${idData}" style="display: ${mostrarGrupo ? 'block' : 'none'};">
          ${gruposPorData[data]}
        </div>
      `;
    });

    lista.innerHTML = finalHtml || '<div class="list-item">Nenhum sinal encontrado.</div>';

    // Adicionar listeners de clique APÓS renderizar - BLINDADO
    setTimeout(() => {
      document.querySelectorAll('[data-sinal-id]').forEach(el => {
        // Remover listeners antigos para evitar duplicação
        el.onclick = null;
        
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          const sinalId = this.dataset.sinalId;
          const detalheId = `detalhe-${sinalId}`;
          const detalhe = document.getElementById(detalheId);
          
          if (detalhe) {
            const estaAberto = detalhe.style.display !== 'none';
            detalhe.style.display = estaAberto ? 'none' : 'block';
            
            // Persistir estado IMEDIATAMENTE
            if (estaAberto) {
              removerSinalAberto(sinalId);
            } else {
              salvarSinalAberto(sinalId);
            }
          }
        }, { once: false });
      });
    }, 100);

    if (app.sinalParaDestacar) {
      const el = document.getElementById(`sinal-${app.sinalParaDestacar}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        app.sinalParaDestacar = null;
      }
    }

    // Lógica do botão Minimizar Tudo
    const btnMinimizar = document.getElementById("btnMinimizarTudo");
    if (btnMinimizar) {
      btnMinimizar.onclick = () => {
        datasOrdenadas.forEach(data => {
          const idData = data.replaceAll("/", "");
          const el = document.getElementById(`data${idData}`);
          if (el) el.style.display = "none";
        });
        localStorage.setItem('sinaisAbertos', JSON.stringify([]));
      };
    }

  } catch (erro) {
    console.error("Erro histórico:", erro);
    lista.innerHTML = `<div class="list-item">Erro ao carregar histórico: ${erro.message}</div>`;
  }
}

// Atualização automática a cada 5 segundos - PRESERVA ESTADO
setInterval(() => {
  if (app.currentTab === "historico") {
    carregarHistorico();
  }
}, 5000);
