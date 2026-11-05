//+------------------------------------------------------------------+
//| XM_Executor.mq5 - Forex Assist                                   |
//| Replica na conta DEMO os sinais OFICIAIS do app (fila no Firestore|
//| do projeto forex-assist-lab), com lote fixo e TP/SL do proprio   |
//| sinal. SO DEMO. Comeca em MODO ENSAIO (SoLog=true): so escreve no|
//| log o que FARIA, sem enviar ordens.                              |
//| Nao fecha nem altera posicoes (TP/SL fecham). Nao envia dados.   |
//| Ver DOCUMENTACAO/XM-EXECUTOR.md                                  |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.10"
#property description "Executor de sinais do app na conta DEMO (comeca em modo ensaio)"

#include <Trade\Trade.mqh>

input string FirebaseProjeto   = "forex-assist-lab";   // projeto Firebase (laboratorio)
input string FirebaseApiKey    = "AIzaSyCShYzOaXiQTLfmArT5h8t7IeUTGEacUFc";      // chave web (publica por desenho)
input string TokenIngest       = "";                   // o MESMO token do exportador (secret XM_INGEST_TOKEN)
input bool   SoLog             = true;                 // true = ENSAIO: so registra no log, NAO envia ordens
input double LoteFixo          = 0.02;                 // lote de cada operacao
input int    MaxPosicoes       = 3;                    // maximo de posicoes abertas ao mesmo tempo (todas)
input double MaxDerrapagemFracSL = 0.25;               // pula a entrada se o preco ja andou CONTRA mais que esta fracao do SL (0,10 a 1,00)
input int    MaxIdadeSinalSeg  = 600;                  // ignora sinal mais velho que isto (10 min)
input int    DesvioPontos      = 30;                   // desvio maximo de preco aceito
input long   NumeroMagico      = 20261104;             // identifica as ordens deste EA
input int    IntervaloSeg      = 10;                   // de quantos em quantos segundos consulta a fila
input string SufixoSimbolo     = "";                   // sufixo dos simbolos da corretora, se houver (ex.: "#")

CTrade trade;
datetime g_ultimoAviso = 0;
int      g_falhas = 0;

//--- util ---------------------------------------------------------
void Aviso(const string msg)
  {
   if(TimeLocal() - g_ultimoAviso < 60) return;
   g_ultimoAviso = TimeLocal();
   Print("XM_Executor: ", msg);
  }

double Num(const string s)
  {
   return StringToDouble(s);
  }

//--- busca a fila: devolve o texto "v1;..." ou "" ------------------
string BuscarFila()
  {
   string url = "https://firestore.googleapis.com/v1/projects/" + FirebaseProjeto +
                "/databases/(default)/documents/xm_exec/fila_" + TokenIngest + "?key=" + FirebaseApiKey;
   char dados[];
   char resp[];
   string respHdr;
   ArrayResize(dados, 0);
   ResetLastError();
   int code = WebRequest("GET", url, "", 10000, dados, resp, respHdr);
   if(code == -1)
     {
      int err = GetLastError();
      if(err == 4014) Aviso("URL nao liberada: Ferramentas > Opcoes > Expert Advisors > 'Permitir WebRequest' e adicione https://firestore.googleapis.com");
      else Aviso("falha de rede ao ler a fila, erro " + IntegerToString(err));
      g_falhas++;
      return "";
     }
   if(code != 200)
     {
      Aviso("HTTP " + IntegerToString(code) + " ao ler a fila (se isolado: falha de rede transitoria; se repetido: token errado ou fila nao criada)");
      g_falhas++;
      return "";
     }
   g_falhas = 0;
   string txt = CharArrayToString(resp, 0, WHOLE_ARRAY, CP_UTF8);
   int ini = StringFind(txt, "v1;");
   if(ini < 0) return "";
   int fim = StringFind(txt, "\"", ini);
   if(fim < 0) return "";
   return StringSubstr(txt, ini, fim - ini);
  }

//--- posicoes -------------------------------------------------------
bool TemPosicaoNoSimbolo(const string sym)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong tk = PositionGetTicket(i);
      if(tk == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) == sym) return true;   // qualquer posicao (inclusive manual): uma por par
     }
   return false;
  }

//--- um sinal da fila: ID|SIMBOLO|B/S|t|preco|tp_pips|sl_pips|lote ----
void Processar(const string item)
  {
   string c[];
   if(StringSplit(item, '|', c) != 8) { Aviso("item da fila fora do formato: " + item); return; }
   string id = c[0];
   string sym = c[1] + SufixoSimbolo;
   bool compra = (c[2] == "B");
   datetime tSinal = (datetime)(long)StringToInteger(c[3]);
   double precoApp = Num(c[4]);
   double tpPips = Num(c[5]);
   double slPips = Num(c[6]);

   string chave = "XMEX_" + id;
   if(GlobalVariableCheck(chave)) return;                          // ja tratado (executado, ensaiado ou descartado)

   long idade = (long)TimeGMT() - (long)tSinal;
   if(idade > MaxIdadeSinalSeg)
     {
      Print("XM_Executor: DESCARTADO por idade (", idade, " s): ", id, " ", sym, " ", c[2]);
      GlobalVariableSet(chave, 1);
      return;
     }
   if(!SymbolSelect(sym, true))
     {
      Print("XM_Executor: simbolo nao encontrado na corretora: ", sym, " (ajuste SufixoSimbolo?)");
      GlobalVariableSet(chave, 1);
      return;
     }
   if(tpPips <= 0 || slPips <= 0)
     {
      Print("XM_Executor: TP/SL invalido no sinal ", id);
      GlobalVariableSet(chave, 1);
      return;
     }
   if(TemPosicaoNoSimbolo(sym))
     {
      Print("XM_Executor: PULADO (ja existe posicao em ", sym, "): sinal ", id);
      GlobalVariableSet(chave, 1);
      return;
     }
   if(PositionsTotal() >= MaxPosicoes)
     {
      Print("XM_Executor: PULADO (limite de ", MaxPosicoes, " posicoes): sinal ", id, " ", sym);
      GlobalVariableSet(chave, 1);
      return;
     }

   MqlTick tick;
   if(!SymbolInfoTick(sym, tick) || tick.ask <= 0 || tick.bid <= 0) { Aviso("sem cotacao para " + sym); return; }
   int    digitos = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   double ponto   = SymbolInfoDouble(sym, SYMBOL_POINT);
   double pip     = (digitos == 3 || digitos == 5) ? ponto * 10.0 : ponto;
   double preco   = compra ? tick.ask : tick.bid;
   double tp      = compra ? preco + tpPips * pip : preco - tpPips * pip;
   double sl      = compra ? preco - slPips * pip : preco + slPips * pip;
   tp = NormalizeDouble(tp, digitos);
   sl = NormalizeDouble(sl, digitos);

   double minimo = (double)SymbolInfoInteger(sym, SYMBOL_TRADE_STOPS_LEVEL) * ponto;
   if(MathAbs(preco - tp) < minimo || MathAbs(preco - sl) < minimo)
     {
      Print("XM_Executor: PULADO (TP/SL mais perto que o minimo da corretora): sinal ", id, " ", sym);
      GlobalVariableSet(chave, 1);
      return;
     }
   double vmin = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   if(LoteFixo < vmin)
     {
      Print("XM_Executor: lote ", DoubleToString(LoteFixo, 2), " menor que o minimo do simbolo ", sym);
      GlobalVariableSet(chave, 1);
      return;
     }

   double derrapagem = (compra ? preco - precoApp : precoApp - preco) / pip;   // positivo = pior que o preco do sinal
   double spread = (tick.ask - tick.bid) / pip;
   // guarda de derrapagem: preco ja andou contra o sinal mais que a fracao permitida do SL -> nao entra (vale no ensaio tambem)
   if(derrapagem > MaxDerrapagemFracSL * slPips)
     {
      Print("XM_Executor: PULADO (derrapagem ", DoubleToString(derrapagem, 1), " pips > ", DoubleToString(MaxDerrapagemFracSL * 100.0, 0),
            "% do SL de ", DoubleToString(slPips, 1), " pips): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
      GlobalVariableSet(chave, 1);
      return;
     }
   string resumo = (compra ? "COMPRA " : "VENDA ") + sym + " lote " + DoubleToString(LoteFixo, 2) +
                   " preco " + DoubleToString(preco, digitos) + " TP " + DoubleToString(tp, digitos) +
                   " SL " + DoubleToString(sl, digitos) + " | atraso " + IntegerToString((int)idade) + " s" +
                   " | derrapagem " + DoubleToString(derrapagem, 1) + " pips | spread " + DoubleToString(spread, 1) + " pips | sinal " + id;

   if(SoLog)
     {
      Print("XM_Executor [ENSAIO]: FARIA ", resumo);
      GlobalVariableSet(chave, 1);
      return;
     }

   // contador de tentativas: no maximo 3 por sinal (evita repetir ordem em erro persistente)
   string chaveN = "XMEXN_" + id;
   double n = GlobalVariableCheck(chaveN) ? GlobalVariableGet(chaveN) : 0;
   if(n >= 3) { Print("XM_Executor: DESISTIU apos 3 tentativas: ", id); GlobalVariableSet(chave, 1); return; }
   GlobalVariableSet(chaveN, n + 1);

   trade.SetExpertMagicNumber(NumeroMagico);
   trade.SetDeviationInPoints(DesvioPontos);
   trade.SetTypeFillingBySymbol(sym);
   bool ok = trade.PositionOpen(sym, compra ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, LoteFixo, preco, sl, tp, "XMEX " + id);
   if(ok && (trade.ResultRetcode() == TRADE_RETCODE_DONE || trade.ResultRetcode() == TRADE_RETCODE_PLACED))
     {
      Print("XM_Executor: ENTROU ", resumo);
      GlobalVariableSet(chave, 1);
     }
   else
      Print("XM_Executor: FALHOU (tentativa ", (int)(n + 1), "): retcode ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription(), " | ", resumo);
  }

//--- ciclo de vida -------------------------------------------------
int OnInit()
  {
   if(StringLen(TokenIngest) < 16)
     {
      Print("XM_Executor: preencha TokenIngest (o mesmo do exportador).");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(AccountInfoInteger(ACCOUNT_TRADE_MODE) != ACCOUNT_TRADE_MODE_DEMO)
     {
      Print("XM_Executor: so funciona em conta DEMO; encerrando.");
      return INIT_FAILED;
     }
   if(LoteFixo <= 0.0 || LoteFixo > 0.05)
     {
      Print("XM_Executor: LoteFixo fora do limite de seguranca (0,01 a 0,05); encerrando.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(MaxPosicoes < 1 || MaxPosicoes > 12)
     {
      Print("XM_Executor: MaxPosicoes fora do limite de seguranca (1 a 12); encerrando.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(MaxDerrapagemFracSL < 0.10 || MaxDerrapagemFracSL > 1.0)
     {
      Print("XM_Executor: MaxDerrapagemFracSL fora do limite (0,10 a 1,00); encerrando.");
      return INIT_PARAMETERS_INCORRECT;
     }
   EventSetTimer(MathMax(5, IntervaloSeg));
   Print("XM_Executor iniciado em modo ", (SoLog ? "ENSAIO (nao envia ordens)" : "REAL NA DEMO (envia ordens)"),
         ". Lote ", DoubleToString(LoteFixo, 2), ", maximo ", MaxPosicoes, " posicoes, sinal valido por ", MaxIdadeSinalSeg, " s, derrapagem maxima ",
         DoubleToString(MaxDerrapagemFracSL * 100.0, 0), "% do SL.");
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

void OnTimer()
  {
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) && !SoLog)
     {
      Aviso("negociacao algoritmica desligada no terminal (botao Algotrading)");
      return;
     }
   string fila = BuscarFila();
   if(fila == "") return;
   string partes[];
   int n = StringSplit(fila, ';', partes);
   for(int i = 2; i < n; i++)          // partes[0]="v1", partes[1]=hora GMT, depois os sinais
     {
      if(StringLen(partes[i]) < 10) continue;
      Processar(partes[i]);
     }
  }

void OnTick() {}
//+------------------------------------------------------------------+
