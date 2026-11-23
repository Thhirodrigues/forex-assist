//+------------------------------------------------------------------+
//| XM_Executor.mq5 - Forex Assist                                   |
//| Replica na conta DEMO os sinais OFICIAIS do app (fila no Firestore|
//| do projeto forex-assist-lab), com lote fixo e TP/SL do proprio   |
//| sinal. SO DEMO. Comeca em MODO ENSAIO (SoLog=true): so escreve no|
//| log o que FARIA, sem enviar ordens.                              |
//| Nao fecha nem altera posicoes (TP/SL fecham). Nao envia dados.   |
//| v1.20 (23/11/2026): GESTAO de risco, cada grupo com 3 modos      |
//| (0 desligado, 1 SO REGISTRA no log o que bloquearia [padrao],    |
//| 2 BLOQUEIA): (a) exposicao por MOEDA (limite de posicoes do mesmo|
//| lado na mesma moeda, ex. 2 contra o dolar; conta o iene nos      |
//| cruzados) e pausa 17h-19h de Brasilia; (b) PERDA do dia (padrao: |
//| BLOQUEIA, decisao do usuario em 23/11) e (c) META do dia (padrao:|
//| so registra), sobre o resultado FECHADO de hoje (Brasilia).      |
//| Ver DOCUMENTACAO/XM-EXECUTOR.md                                  |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.20"
#property description "Executor de sinais do app na conta DEMO (comeca em modo ensaio)"

#include <Trade\Trade.mqh>

input string FirebaseProjeto   = "forex-assist-lab";   // projeto Firebase (laboratorio)
input string FirebaseApiKey    = "AIzaSyCShYzOaXiQTLfmArT5h8t7IeUTGEacUFc";      // chave web (publica por desenho)
input string TokenIngest       = "";                   // o MESMO token do exportador (secret XM_INGEST_TOKEN)
input bool   SoLog             = true;                 // true = ENSAIO: so registra no log, NAO envia ordens
input double LoteFixo          = 0.02;                 // lote de cada operacao
input int    MaxPosicoes       = 3;                    // maximo de posicoes abertas ao mesmo tempo (todas)
input double MaxDerrapagemFracSL = 0.25;               // pula a entrada se o preco ja andou CONTRA mais que esta fracao do SL (0,10 a 1,00)
input int    ModoExposicao     = 1;                    // gestao de EXPOSICAO e horario: 0 = desligada, 1 = so REGISTRA no log (padrao), 2 = BLOQUEIA
input int    MaxPorMoeda       = 2;                    // exposicao liquida maxima na mesma moeda (2 = ate 2 posicoes do mesmo lado, ex.: contra o dolar)
input bool   PausaRolloverBrt  = true;                 // nao entra 17h-19h de Brasilia (rollover: spread de 7 a 16 pips)
input int    ModoPerdaDia      = 2;                    // PERDA do dia: 0 = desligada, 1 = so REGISTRA no log, 2 = BLOQUEIA (padrao: bloqueia)
input double PerdaDiaUsd       = 15.0;                 // perda do dia: resultado FECHADO de hoje (Brasilia) <= -este valor (US$)
input int    ModoMetaDia       = 1;                    // META do dia: 0 = desligada, 1 = so REGISTRA no log (padrao), 2 = BLOQUEIA
input double MetaDiaUsd        = 10.0;                 // meta do dia: resultado FECHADO de hoje (Brasilia) >= +este valor (US$)
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

//--- gestao de risco (v1.20): so LE posicoes e historico ----------
int HoraBrt()
  {
   MqlDateTime d;
   TimeToStruct(TimeGMT() - 3 * 3600, d);
   return d.hour;
  }

// +1 se a posicao e COMPRADA na moeda, -1 se VENDIDA, 0 se o par nao tem a moeda (par de 6 letras: BASE+COTADA)
int ExpMoeda(const string moeda, const string sym, const bool compra)
  {
   if(StringLen(sym) < 6) return 0;
   string base = StringSubstr(sym, 0, 3);
   string cota = StringSubstr(sym, 3, 3);
   if(moeda == base) return compra ? 1 : -1;
   if(moeda == cota) return compra ? -1 : 1;
   return 0;
  }

int ExposicaoAtual(const string moeda)
  {
   int soma = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong tk = PositionGetTicket(i);
      if(tk == 0) continue;
      string s = PositionGetString(POSITION_SYMBOL);
      bool c = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
      soma += ExpMoeda(moeda, s, c);
     }
   return soma;
  }

// "" se estiver dentro dos limites; senao o motivo (primeira regra violada)
string RegrasExposicao(const string sym, const bool compra)
  {
   string motivo = "";
   if(StringLen(sym) >= 6)
     {
      string base = StringSubstr(sym, 0, 3);
      string cota = StringSubstr(sym, 3, 3);
      int nb = ExposicaoAtual(base) + (compra ? 1 : -1);
      int nq = ExposicaoAtual(cota) + (compra ? -1 : 1);
      int ab = (nb < 0) ? -nb : nb;
      int aq = (nq < 0) ? -nq : nq;
      if(ab > MaxPorMoeda)
         motivo = base + (nb > 0 ? " comprada" : " vendida") + " em " + IntegerToString(ab) + " posicoes (limite " + IntegerToString(MaxPorMoeda) + ")";
      else if(aq > MaxPorMoeda)
         motivo = cota + (nq > 0 ? " comprada" : " vendida") + " em " + IntegerToString(aq) + " posicoes (limite " + IntegerToString(MaxPorMoeda) + ")";
     }
   if(motivo == "" && PausaRolloverBrt)
     {
      int h = HoraBrt();
      if(h == 17 || h == 18) motivo = "17h-19h de Brasilia (rollover, spread alto)";
     }
   return motivo;
  }

// resultado FECHADO de hoje (dia de Brasilia) das ordens deste EA: lucro + swap + comissao das saidas
double LucroDiaBrt()
  {
   MqlDateTime d;
   TimeToStruct(TimeGMT() - 3 * 3600, d);
   d.hour = 0; d.min = 0; d.sec = 0;
   datetime meiaNoiteBrt = StructToTime(d);                                   // meia-noite de Brasilia escrita como se fosse GMT
   long desloc = (long)TimeTradeServer() - (long)TimeGMT();                   // hora do servidor - GMT
   datetime inicio = (datetime)((long)meiaNoiteBrt + 3 * 3600 + desloc);      // inicio do dia de Brasilia na hora do servidor
   if(!HistorySelect(inicio, TimeCurrent() + 86400)) return 0.0;
   double soma = 0.0;
   int n = HistoryDealsTotal();
   for(int i = 0; i < n; i++)
     {
      ulong tk = HistoryDealGetTicket(i);
      if(tk == 0) continue;
      if(HistoryDealGetInteger(tk, DEAL_MAGIC) != NumeroMagico) continue;
      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(tk, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      soma += HistoryDealGetDouble(tk, DEAL_PROFIT) + HistoryDealGetDouble(tk, DEAL_SWAP) + HistoryDealGetDouble(tk, DEAL_COMMISSION);
     }
   return soma;
  }

string TextoPerdaDia(const double lucro)
  {
   if(lucro <= -PerdaDiaUsd) return "perda do dia US$ " + DoubleToString(lucro, 2) + " (limite -" + DoubleToString(PerdaDiaUsd, 2) + ")";
   return "";
  }

string TextoMetaDia(const double lucro)
  {
   if(lucro >= MetaDiaUsd) return "meta do dia US$ " + DoubleToString(lucro, 2) + " batida (+" + DoubleToString(MetaDiaUsd, 2) + ")";
   return "";
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
   // gestao de risco (v1.20): modo 0 desligado, 1 so registra o que bloquearia (o sinal segue), 2 bloqueia (descarta o sinal)
   string motivoExp = (ModoExposicao > 0) ? RegrasExposicao(sym, compra) : "";
   if(motivoExp != "")
     {
      if(ModoExposicao >= 2)
        {
         Print("XM_Executor: PULADO (gestao: ", motivoExp, "): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
         GlobalVariableSet(chave, 1);
         return;
        }
      Print("XM_Executor [GESTAO-LOG]: BLOQUEARIA (", motivoExp, "): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
     }
   double lucroDia = (ModoPerdaDia > 0 || ModoMetaDia > 0) ? LucroDiaBrt() : 0.0;
   string motivoPerda = (ModoPerdaDia > 0) ? TextoPerdaDia(lucroDia) : "";
   if(motivoPerda != "")
     {
      if(ModoPerdaDia >= 2)
        {
         Print("XM_Executor: PULADO (parada do dia: ", motivoPerda, "): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
         GlobalVariableSet(chave, 1);
         return;
        }
      Print("XM_Executor [GESTAO-LOG]: PARARIA O DIA (", motivoPerda, "): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
     }
   string motivoMeta = (ModoMetaDia > 0) ? TextoMetaDia(lucroDia) : "";
   if(motivoMeta != "")
     {
      if(ModoMetaDia >= 2)
        {
         Print("XM_Executor: PULADO (parada do dia: ", motivoMeta, "): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
         GlobalVariableSet(chave, 1);
         return;
        }
      Print("XM_Executor [GESTAO-LOG]: PARARIA O DIA (", motivoMeta, "): ", (compra ? "COMPRA " : "VENDA "), sym, " | sinal ", id);
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
   if(ModoExposicao < 0 || ModoExposicao > 2 || ModoPerdaDia < 0 || ModoPerdaDia > 2 || ModoMetaDia < 0 || ModoMetaDia > 2)
     {
      Print("XM_Executor: ModoExposicao, ModoPerdaDia e ModoMetaDia devem ser 0, 1 ou 2; encerrando.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(MaxPorMoeda < 1 || MaxPorMoeda > 12 || PerdaDiaUsd <= 0.0 || MetaDiaUsd <= 0.0)
     {
      Print("XM_Executor: MaxPorMoeda (1 a 12), PerdaDiaUsd e MetaDiaUsd (> 0) fora do limite; encerrando.");
      return INIT_PARAMETERS_INCORRECT;
     }
   EventSetTimer(MathMax(5, IntervaloSeg));
   Print("XM_Executor iniciado em modo ", (SoLog ? "ENSAIO (nao envia ordens)" : "REAL NA DEMO (envia ordens)"),
         ". Lote ", DoubleToString(LoteFixo, 2), ", maximo ", MaxPosicoes, " posicoes, sinal valido por ", MaxIdadeSinalSeg, " s, derrapagem maxima ",
         DoubleToString(MaxDerrapagemFracSL * 100.0, 0), "% do SL.");
   Print("XM_Executor v1.20 gestao: exposicao modo ", ModoExposicao, " (max ", MaxPorMoeda, " por moeda, pausa 17h-19h ", (PausaRolloverBrt ? "sim" : "nao"),
         "), perda do dia modo ", ModoPerdaDia, " (-", DoubleToString(PerdaDiaUsd, 2), "), meta do dia modo ", ModoMetaDia, " (+", DoubleToString(MetaDiaUsd, 2),
         "). Modos: 0 desligado, 1 so registra, 2 bloqueia.");
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
