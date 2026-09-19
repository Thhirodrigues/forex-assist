//+------------------------------------------------------------------+
//|                                                        SMC_EA.mq5 |
//|                               Smart Money Concepts - Forex Assist |
//|                                                                    |
//|  Este EA lê os buffers do SMC_Suite.mq5 e executa ordens          |
//|  automaticamente numa conta DEMO.                                  |
//|                                                                    |
//|  IMPORTANTE:                                                       |
//|    1. O SMC_Suite.mq5 deve estar compilado e disponível.           |
//|    2. O EA deve ser anexado ao MESMO símbolo e timeframe            |
//|       em que o SMC_Suite está rodando.                             |
//|    3. Teste SEMPRE em conta demo antes de qualquer uso real.        |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\AccountInfo.mqh>

//+------------------------------------------------------------------+
//| Inputs                                                           |
//+------------------------------------------------------------------+
input group "=== SINAL ==="
input string InpIndicatorName  = "SMC_Suite";    // Nome exato do indicador
input int    InpMinSignals      = 1;              // Mínimo de gatilhos SMC para entrar
                                                  // (1=qualquer, 2=combinação de 2, etc.)
input bool   InpUseOB           = true;           // Aceitar Order Block
input bool   InpUseFVG          = true;           // Aceitar Fair Value Gap
input bool   InpUseSweep        = true;           // Aceitar Liquidity Sweep
input bool   InpUseEngulf       = true;           // Aceitar Engulfing
input bool   InpUseBOS          = true;           // Aceitar Break of Structure
input bool   InpUseCHoCH        = true;           // Aceitar Change of Character

input group "=== FILTROS ==="
input bool   InpFilterEMA       = true;           // Filtrar por EMA de tendência
input int    InpEMAPeriod       = 200;            // Período da EMA de tendência
input bool   InpFilterSession   = true;           // Filtrar por sessão (evitar Asia)
input int    InpSessionStart    = 7;              // Hora início (Brasília = GMT-3)
input int    InpSessionEnd      = 19;             // Hora fim

input group "=== GESTÃO DE RISCO ==="
input double InpRiskPct         = 1.0;            // Risco por operação (% do saldo)
input double InpRRRatio         = 2.0;            // Relação Risco/Retorno (TP = RR * SL)
input double InpSLPips          = 15.0;           // Stop Loss em pips
input double InpMaxSpread       = 3.0;            // Spread máximo permitido (pips)
input int    InpMaxPositions     = 1;             // Máximo de posições abertas no símbolo
input double InpMaxDailyLossPct = 3.0;           // Drawdown diário máximo (% saldo)

input group "=== EXECUÇÃO ==="
input ulong  InpMagicNumber     = 202609;         // Magic number (identifica as ordens do EA)
input int    InpSlippage        = 3;              // Slippage máximo (pips)
input bool   InpTrailingStop    = false;          // Ativar trailing stop
input double InpTrailingPips    = 10.0;           // Trailing stop em pips

//+------------------------------------------------------------------+
//| Variáveis globais                                               |
//+------------------------------------------------------------------+
CTrade      trade;
CPositionInfo posInfo;
CAccountInfo  accInfo;

int    g_handleSMC  = INVALID_HANDLE;
int    g_handleEMA  = INVALID_HANDLE;
double g_point;
double g_pipSize;

datetime g_lastBar = 0;       // evita múltiplas entradas na mesma barra
datetime g_dailyReset = 0;    // controle de drawdown diário
double   g_balanceAtDayStart = 0.0;
double   g_dailyLoss = 0.0;

//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage * 10);
   trade.SetTypeFilling(ORDER_FILLING_FOK);

   g_point   = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   g_pipSize = (digits == 3 || digits == 5) ? g_point * 10.0 : g_point;

   // Carrega o indicador SMC_Suite (deve estar na pasta Indicators)
   g_handleSMC = iCustom(_Symbol, PERIOD_CURRENT, InpIndicatorName);
   if (g_handleSMC == INVALID_HANDLE)
   {
      Alert(StringFormat("SMC_EA: não foi possível carregar '%s'. "
                         "Verifique se o indicador está compilado.", InpIndicatorName));
      return INIT_FAILED;
   }

   if (InpFilterEMA)
   {
      g_handleEMA = iMA(_Symbol, PERIOD_CURRENT, InpEMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
      if (g_handleEMA == INVALID_HANDLE)
      {
         Alert("SMC_EA: erro ao criar handle da EMA.");
         return INIT_FAILED;
      }
   }

   g_balanceAtDayStart = accInfo.Balance();
   g_dailyReset = iTime(_Symbol, PERIOD_D1, 0);

   Print("SMC_EA iniciado. Magic=", InpMagicNumber, " | Símbolo=", _Symbol);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if (g_handleSMC != INVALID_HANDLE) IndicatorRelease(g_handleSMC);
   if (g_handleEMA != INVALID_HANDLE) IndicatorRelease(g_handleEMA);
}

//+------------------------------------------------------------------+
void OnTick()
{
   // ---- Atualiza trailing stop de posições abertas ----
   if (InpTrailingStop) ManageTrailingStop();

   // ---- Só analisa no início de uma nova barra ----
   datetime currentBar = iTime(_Symbol, PERIOD_CURRENT, 0);
   if (currentBar == g_lastBar) return;
   g_lastBar = currentBar;

   // ---- Reset diário ----
   datetime dayBar = iTime(_Symbol, PERIOD_D1, 0);
   if (dayBar != g_dailyReset)
   {
      g_dailyReset = dayBar;
      g_balanceAtDayStart = accInfo.Balance();
      g_dailyLoss = 0.0;
      Print("SMC_EA: reset diário — saldo base $", DoubleToString(g_balanceAtDayStart, 2));
   }

   // ---- Verificação de drawdown diário ----
   if (DailyDrawdownAtLimit()) return;

   // ---- Filtro de sessão ----
   if (InpFilterSession && !IsInSession()) return;

   // ---- Spread ----
   double spreadPips = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * g_point / g_pipSize;
   if (spreadPips > InpMaxSpread) return;

   // ---- Máximo de posições abertas ----
   if (CountOpenPositions() >= InpMaxPositions) return;

   // ---- Lê buffers do SMC_Suite ----
   double bullBuf[3], bearBuf[3];
   double bullType[3], bearType[3];

   if (CopyBuffer(g_handleSMC, 0, 1, 3, bullBuf)  < 3) return; // buffer 0: compra
   if (CopyBuffer(g_handleSMC, 1, 1, 3, bearBuf)  < 3) return; // buffer 1: venda
   if (CopyBuffer(g_handleSMC, 2, 1, 3, bullType) < 3) return; // buffer 2: tipo compra
   if (CopyBuffer(g_handleSMC, 3, 1, 3, bearType) < 3) return; // buffer 3: tipo venda

   // Barra mais recente fechada = índice 0 no CopyBuffer (com offset 1 = pula a atual)
   double bullSignal = bullBuf[0];
   double bearSignal = bearBuf[0];
   int    bType      = (int)bullType[0];
   int    sType      = (int)bearType[0];

   bool hasBull = (bullSignal > 0.0 && IsSignalTypeEnabled(bType));
   bool hasBear = (bearSignal > 0.0 && IsSignalTypeEnabled(sType));

   if (!hasBull && !hasBear) return;

   // ---- Filtro de EMA ----
   double emaVal = 0.0;
   if (InpFilterEMA)
   {
      double emaBuf[1];
      if (CopyBuffer(g_handleEMA, 0, 1, 1, emaBuf) < 1) return;
      emaVal = emaBuf[0];
   }

   double askPrice = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bidPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   // ---- Sinal de COMPRA ----
   if (hasBull)
   {
      bool emaOk = !InpFilterEMA || (bidPrice > emaVal);   // preço acima da EMA
      if (emaOk)
      {
         double sl   = askPrice - InpSLPips * g_pipSize;
         double tp   = askPrice + InpSLPips * g_pipSize * InpRRRatio;
         double lots = CalcLotSize(sl);

         if (lots > 0.0)
         {
            string comment = StringFormat("SMC_%s_BUY", SigCode(bType));
            if (trade.Buy(lots, _Symbol, askPrice, sl, tp, comment))
               Print("SMC_EA BUY | Lote=", lots, " | SL=", sl, " | TP=", tp,
                     " | Gatilho=", SigCode(bType));
            else
               Print("SMC_EA BUY erro: ", trade.ResultRetcodeDescription());
         }
      }
   }

   // ---- Sinal de VENDA ----
   if (hasBear)
   {
      bool emaOk = !InpFilterEMA || (bidPrice < emaVal);   // preço abaixo da EMA
      if (emaOk)
      {
         double sl   = bidPrice + InpSLPips * g_pipSize;
         double tp   = bidPrice - InpSLPips * g_pipSize * InpRRRatio;
         double lots = CalcLotSize(sl);

         if (lots > 0.0)
         {
            string comment = StringFormat("SMC_%s_SELL", SigCode(sType));
            if (trade.Sell(lots, _Symbol, bidPrice, sl, tp, comment))
               Print("SMC_EA SELL | Lote=", lots, " | SL=", sl, " | TP=", tp,
                     " | Gatilho=", SigCode(sType));
            else
               Print("SMC_EA SELL erro: ", trade.ResultRetcodeDescription());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| GESTÃO DAS POSIÇÕES ABERTAS (Trailing Stop)                     |
//+------------------------------------------------------------------+
void ManageTrailingStop()
{
   double trailDist = InpTrailingPips * g_pipSize;

   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if (!posInfo.SelectByIndex(i)) continue;
      if (posInfo.Symbol()      != _Symbol)        continue;
      if (posInfo.Magic()       != InpMagicNumber) continue;

      double sl = posInfo.StopLoss();
      double price = posInfo.PriceCurrent();

      if (posInfo.PositionType() == POSITION_TYPE_BUY)
      {
         double newSL = price - trailDist;
         if (newSL > sl + g_pipSize)
            trade.PositionModify(posInfo.Ticket(), NormalizeDouble(newSL, _Digits), posInfo.TakeProfit());
      }
      else
      {
         double newSL = price + trailDist;
         if (newSL < sl - g_pipSize || sl == 0.0)
            trade.PositionModify(posInfo.Ticket(), NormalizeDouble(newSL, _Digits), posInfo.TakeProfit());
      }
   }
}

//+------------------------------------------------------------------+
//| CÁLCULO DE LOTE (risco fixo % do saldo)                         |
//+------------------------------------------------------------------+
double CalcLotSize(double slPrice)
{
   double balance    = accInfo.Balance();
   double riskAmount = balance * InpRiskPct / 100.0;
   double askPrice   = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double slDist     = MathAbs(askPrice - slPrice);

   if (slDist < g_pipSize) return 0.0;

   double tickValue  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if (tickValue == 0.0 || tickSize == 0.0) return 0.0;

   double valuePerPip = tickValue / tickSize * g_pipSize;
   if (valuePerPip == 0.0) return 0.0;

   double rawLot  = riskAmount / (slDist / g_pipSize * valuePerPip);
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   double lot = MathFloor(rawLot / stepLot) * stepLot;
   lot = MathMax(minLot, MathMin(maxLot, lot));

   return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Controle de drawdown diário                                      |
//+------------------------------------------------------------------+
bool DailyDrawdownAtLimit()
{
   if (InpMaxDailyLossPct <= 0.0) return false;
   double currentBalance = accInfo.Balance();
   double lossToday = g_balanceAtDayStart - currentBalance;
   if (lossToday <= 0.0) return false;
   double lossPct = (lossToday / g_balanceAtDayStart) * 100.0;
   if (lossPct >= InpMaxDailyLossPct)
   {
      static datetime lastWarning = 0;
      if (TimeCurrent() - lastWarning > 3600)
      {
         Print("SMC_EA: limite de drawdown diário atingido (", DoubleToString(lossPct, 1), "%). Sem novas entradas hoje.");
         lastWarning = TimeCurrent();
      }
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Verifica se está dentro da janela de sessão                     |
//+------------------------------------------------------------------+
bool IsInSession()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   // Ajusta GMT-3 (Brasília) → UTC: adiciona 3 horas
   // Na prática o servidor MT5 já entrega hora UTC — o usuário
   // configura InpSessionStart/End em UTC (ou ajusta conforme a corretora).
   int hour = dt.hour;
   return (hour >= InpSessionStart && hour < InpSessionEnd);
}

//+------------------------------------------------------------------+
//| Conta posições abertas no símbolo com o magic number            |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
   int count = 0;
   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if (!posInfo.SelectByIndex(i)) continue;
      if (posInfo.Symbol() == _Symbol && posInfo.Magic() == InpMagicNumber)
         count++;
   }
   return count;
}

//+------------------------------------------------------------------+
//| Verifica se o tipo de sinal está habilitado nos inputs           |
//+------------------------------------------------------------------+
bool IsSignalTypeEnabled(int sigType)
{
   switch (sigType)
   {
      case 1: return InpUseOB;
      case 2: return InpUseFVG;
      case 3: return InpUseSweep;
      case 4: return InpUseEngulf;
      case 5: return InpUseBOS;
      case 6: return InpUseCHoCH;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Código curto do sinal para comment da ordem                     |
//+------------------------------------------------------------------+
string SigCode(int t)
{
   switch (t)
   {
      case 1: return "OB";
      case 2: return "FVG";
      case 3: return "SWP";
      case 4: return "ENG";
      case 5: return "BOS";
      case 6: return "CHoCH";
   }
   return "SMC";
}
