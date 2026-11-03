//+------------------------------------------------------------------+
//| XM_Exporter.mq5 - Forex Assist                                   |
//| SOMENTE LEITURA: exporta estado da conta, posicoes abertas e     |
//| historico de deals para o Firestore do projeto forex-assist-lab  |
//| (colecao xm_conta). NAO abre, fecha nem altera ordens.           |
//| Nao envia numero da conta, nome nem servidor.                    |
//| Uso: so em conta DEMO. Ver DOCUMENTACAO/XM-EXPORTADOR.md         |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.00"
#property description "Exporta historico e posicoes (somente leitura) para o banco do Forex Assist"

input string FirebaseProjeto   = "forex-assist-lab";   // projeto Firebase (laboratorio)
input string FirebaseApiKey    = "AIzaSyCShYzOaXiQTLfmArT5h8t7IeUTGEacUFc";   // chave web (publica por desenho)
input string TokenIngest       = "";                   // token secreto (o mesmo do secret XM_INGEST_TOKEN)
input int    IntervaloEstadoSeg = 60;                  // a cada quantos segundos envia conta+posicoes
input int    IntervaloHistSeg   = 300;                 // a cada quantos segundos reenvia os ultimos dias de historico
input int    DiasHistoricoInicial = 120;               // dias de historico enviados na partida
input int    DiasHistoricoRecente = 3;                 // dias reenviados a cada ciclo

datetime g_ultimoHist = 0;
bool     g_backfillFeito = false;
string   g_metodo = "PATCH";       // cai para POST+override se o PATCH falhar
int      g_falhasSeguidas = 0;
datetime g_ultimoAviso = 0;

//--- util ---------------------------------------------------------
string Esc(const string s)
  {
   string r = "";
   int n = StringLen(s);
   for(int i = 0; i < n; i++)
     {
      ushort c = StringGetCharacter(s, i);
      if(c == '"')       r += "\\\"";
      else if(c == '\\')  r += "\\\\";
      else if(c < 32)    r += " ";
      else if(c > 126)   r += "?";
      else               r += ShortToString(c);
     }
   return r;
  }

string N(const double v, const int d = 5)
  {
   if(!MathIsValidNumber(v)) return "0";
   return DoubleToString(v, d);
  }

string IsoUtc(const datetime t)
  {
   MqlDateTime m;
   TimeToStruct(t, m);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ", m.year, m.mon, m.day, m.hour, m.min, m.sec);
  }

void Aviso(const string msg)
  {
   if(TimeLocal() - g_ultimoAviso < 60) return;   // no maximo 1 por minuto
   g_ultimoAviso = TimeLocal();
   Print("XM_Exporter: ", msg);
  }

//--- envio --------------------------------------------------------
bool Enviar(const string docId, const string jsonPayload)
  {
   string url = "https://firestore.googleapis.com/v1/projects/" + FirebaseProjeto +
                "/databases/(default)/documents/xm_conta/" + docId +
                "?key=" + FirebaseApiKey +
                "&updateMask.fieldPaths=t&updateMask.fieldPaths=json&updateMask.fieldPaths=em";
   string corpo = "{\"fields\":{\"t\":{\"stringValue\":\"" + Esc(TokenIngest) + "\"},"
                  "\"json\":{\"stringValue\":\"" + Esc(jsonPayload) + "\"},"
                  "\"em\":{\"stringValue\":\"" + IsoUtc(TimeGMT()) + "\"}}}";
   char dados[];
   char resp[];
   string respHdr;
   StringToCharArray(corpo, dados, 0, StringLen(corpo), CP_UTF8);
   ArrayResize(dados, StringLen(corpo));   // so ASCII (Esc garante): bytes == caracteres

   for(int tentativa = 0; tentativa < 2; tentativa++)
     {
      string hdr = "Content-Type: application/json\r\n";
      string metodo = g_metodo;
      if(g_metodo == "POST") hdr += "X-HTTP-Method-Override: PATCH\r\n";
      ResetLastError();
      int code = WebRequest(metodo, url, hdr, 15000, dados, resp, respHdr);
      if(code == 200) { g_falhasSeguidas = 0; return true; }
      if(code == -1)
        {
         int err = GetLastError();
         if(err == 4014)
           {
            Aviso("URL nao liberada: Ferramentas > Opcoes > Expert Advisors > 'Permitir WebRequest' e adicione https://firestore.googleapis.com");
            g_falhasSeguidas++;
            return false;
           }
         if(g_metodo == "PATCH" && tentativa == 0)
           {
            Print("XM_Exporter: PATCH recusado pelo terminal (erro ", err, "); tentando POST com override");
            g_metodo = "POST";
            continue;
           }
         Aviso("falha de rede, erro " + IntegerToString(err));
         g_falhasSeguidas++;
         return false;
        }
      string txt = CharArrayToString(resp, 0, MathMin(ArraySize(resp), 300), CP_UTF8);
      if(g_metodo == "POST" && tentativa == 0 && code == 405) { continue; }
      Aviso("HTTP " + IntegerToString(code) + " ao gravar " + docId + ": " + txt);
      g_falhasSeguidas++;
      return false;
     }
   return false;
  }

//--- estado: conta + posicoes abertas -----------------------------
bool EnviarEstado()
  {
   datetime gmt = TimeGMT();
   datetime srv = TimeTradeServer();
   long off = (long)srv - (long)gmt;
   long offArred = (long)MathRound((double)off / 1800.0) * 1800;   // fuso do servidor em segundos (multiplo de 30 min)

   string j = "{\"v\":1,\"gmt\":" + IntegerToString((long)gmt) + ",\"srv\":" + IntegerToString((long)srv) +
              ",\"off\":" + IntegerToString(offArred) +
              ",\"conta\":{\"balance\":" + N(AccountInfoDouble(ACCOUNT_BALANCE), 2) +
              ",\"equity\":" + N(AccountInfoDouble(ACCOUNT_EQUITY), 2) +
              ",\"margin\":" + N(AccountInfoDouble(ACCOUNT_MARGIN), 2) +
              ",\"free\":" + N(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) +
              ",\"nivel\":" + N(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) +
              ",\"moeda\":\"" + Esc(AccountInfoString(ACCOUNT_CURRENCY)) + "\"" +
              ",\"alav\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE)) + "}" +
              ",\"pos\":[";
   int total = PositionsTotal();
   bool primeiro = true;
   for(int i = 0; i < total; i++)
     {
      ulong tk = PositionGetTicket(i);
      if(tk == 0) continue;
      if(!primeiro) j += ",";
      primeiro = false;
      j += "{\"tk\":" + (string)tk +
           ",\"sym\":\"" + Esc(PositionGetString(POSITION_SYMBOL)) + "\"" +
           ",\"tipo\":" + IntegerToString(PositionGetInteger(POSITION_TYPE)) +
           ",\"vol\":" + N(PositionGetDouble(POSITION_VOLUME), 2) +
           ",\"px\":" + N(PositionGetDouble(POSITION_PRICE_OPEN)) +
           ",\"sl\":" + N(PositionGetDouble(POSITION_SL)) +
           ",\"tp\":" + N(PositionGetDouble(POSITION_TP)) +
           ",\"atual\":" + N(PositionGetDouble(POSITION_PRICE_CURRENT)) +
           ",\"lucro\":" + N(PositionGetDouble(POSITION_PROFIT), 2) +
           ",\"swap\":" + N(PositionGetDouble(POSITION_SWAP), 2) +
           ",\"t\":" + IntegerToString(PositionGetInteger(POSITION_TIME)) + "}";
     }
   j += "]}";
   return Enviar("estado", j);
  }

//--- historico: deals de um dia (hora do servidor) ----------------
// Retorna true se nao havia nada a enviar ou se o envio deu certo.
bool EnviarDia(const datetime inicioDia)
  {
   if(!HistorySelect(inicioDia, inicioDia + 86400 - 1)) return true;
   int total = HistoryDealsTotal();
   if(total <= 0) return true;
   MqlDateTime m;
   TimeToStruct(inicioDia, m);
   string docId = StringFormat("d_%04d%02d%02d", m.year, m.mon, m.day);
   string j = "{\"v\":1,\"dia\":\"" + StringFormat("%04d-%02d-%02d", m.year, m.mon, m.day) + "\",\"deals\":[";
   bool primeiro = true;
   for(int i = 0; i < total; i++)
     {
      ulong tk = HistoryDealGetTicket(i);
      if(tk == 0) continue;
      if(!primeiro) j += ",";
      primeiro = false;
      j += "{\"id\":" + (string)tk +
           ",\"t\":" + IntegerToString(HistoryDealGetInteger(tk, DEAL_TIME)) +
           ",\"tipo\":" + IntegerToString(HistoryDealGetInteger(tk, DEAL_TYPE)) +
           ",\"ent\":" + IntegerToString(HistoryDealGetInteger(tk, DEAL_ENTRY)) +
           ",\"pos\":" + (string)HistoryDealGetInteger(tk, DEAL_POSITION_ID) +
           ",\"sym\":\"" + Esc(HistoryDealGetString(tk, DEAL_SYMBOL)) + "\"" +
           ",\"vol\":" + N(HistoryDealGetDouble(tk, DEAL_VOLUME), 2) +
           ",\"px\":" + N(HistoryDealGetDouble(tk, DEAL_PRICE)) +
           ",\"sl\":" + N(HistoryDealGetDouble(tk, DEAL_SL)) +
           ",\"tp\":" + N(HistoryDealGetDouble(tk, DEAL_TP)) +
           ",\"lucro\":" + N(HistoryDealGetDouble(tk, DEAL_PROFIT), 2) +
           ",\"swap\":" + N(HistoryDealGetDouble(tk, DEAL_SWAP), 2) +
           ",\"com\":" + N(HistoryDealGetDouble(tk, DEAL_COMMISSION), 2) +
           ",\"fee\":" + N(HistoryDealGetDouble(tk, DEAL_FEE), 2) +
           ",\"razao\":" + IntegerToString(HistoryDealGetInteger(tk, DEAL_REASON)) +
           ",\"cmt\":\"" + Esc(HistoryDealGetString(tk, DEAL_COMMENT)) + "\"}";
     }
   j += "]}";
   return Enviar(docId, j);
  }

datetime InicioDoDia(const datetime t)
  {
   MqlDateTime m;
   TimeToStruct(t, m);
   m.hour = 0; m.min = 0; m.sec = 0;
   return StructToTime(m);
  }

void EnviarHistorico(const int dias)
  {
   datetime hoje = InicioDoDia(TimeTradeServer());
   bool tudoOk = true;
   for(int d = dias; d >= 0; d--)
     {
      if(!EnviarDia(hoje - (datetime)d * 86400)) { tudoOk = false; if(g_falhasSeguidas >= 3) break; }
     }
   if(dias == DiasHistoricoInicial && tudoOk) g_backfillFeito = true;
  }

//--- ciclo de vida -------------------------------------------------
int OnInit()
  {
   if(StringLen(TokenIngest) < 16)
     {
      Print("XM_Exporter: preencha TokenIngest (minimo 16 caracteres) nas entradas do EA.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL)
     {
      Print("XM_Exporter: conta REAL detectada. Este exportador foi feito so para DEMO; encerrando.");
      return INIT_FAILED;
     }
   EventSetTimer(MathMax(15, IntervaloEstadoSeg));
   Print("XM_Exporter iniciado (somente leitura). Estado a cada ", IntervaloEstadoSeg, " s; historico a cada ", IntervaloHistSeg, " s.");
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

void OnTimer()
  {
   bool ok = EnviarEstado();
   if(!ok) return;
   if(!g_backfillFeito)
     {
      EnviarHistorico(DiasHistoricoInicial);
      g_ultimoHist = TimeLocal();
      if(g_backfillFeito) Print("XM_Exporter: historico inicial enviado (", DiasHistoricoInicial, " dias).");
     }
   else if(TimeLocal() - g_ultimoHist >= IntervaloHistSeg)
     {
      EnviarHistorico(DiasHistoricoRecente);
      g_ultimoHist = TimeLocal();
     }
  }

void OnTick() {}
//+------------------------------------------------------------------+
