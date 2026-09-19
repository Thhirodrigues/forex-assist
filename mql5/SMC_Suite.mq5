//+------------------------------------------------------------------+
//|                                                     SMC_Suite.mq5 |
//|                               Smart Money Concepts - Forex Assist |
//|                                                                    |
//|  Conceitos implementados:                                          |
//|    - Order Blocks  (bullish / bearish)                            |
//|    - Fair Value Gaps  (bullish / bearish)                         |
//|    - Liquidity Sweeps  (varredura de topo e fundo)                |
//|    - Engulfing  (bullish / bearish)                               |
//|    - Break of Structure (BOS)                                     |
//|    - Change of Character (CHoCH)                                  |
//|                                                                    |
//|  Buffers para leitura pelo EA:                                    |
//|    Buffer 0 (BullSignal): preço do sinal de compra  (0 = nada)   |
//|    Buffer 1 (BearSignal): preço do sinal de venda   (0 = nada)   |
//|    Buffer 2 (BullType) : código do gatilho de compra             |
//|    Buffer 3 (BearType) : código do gatilho de venda              |
//|                                                                    |
//|  Códigos de gatilho:                                              |
//|    1 = Order Block   2 = FVG   3 = Sweep                         |
//|    4 = Engulfing     5 = BOS   6 = CHoCH                         |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.10"
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_plots   2

#property indicator_label1  "SMC Compra"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLime
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2

#property indicator_label2  "SMC Venda"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrTomato
#property indicator_style2  STYLE_SOLID
#property indicator_width2  2

//--- prefixo para todos os objetos desenhados
#define OBJ_PREFIX "SMC_"

//--- códigos de sinal (lidos pelo EA via BullTypeBuffer / BearTypeBuffer)
#define SIG_OB     1.0
#define SIG_FVG    2.0
#define SIG_SWEEP  3.0
#define SIG_ENGULF 4.0
#define SIG_BOS    5.0
#define SIG_CHOCH  6.0

//+------------------------------------------------------------------+
//| Inputs                                                           |
//+------------------------------------------------------------------+
input group "=== ORDER BLOCKS ==="
input bool   InpShowOB         = true;            // Mostrar Order Blocks
input int    InpOBConfirm      = 3;               // Candles de confirmação após o OB
input color  InpBullOBColor    = clrDodgerBlue;   // Cor OB Bullish
input color  InpBearOBColor    = clrTomato;       // Cor OB Bearish
input int    InpOBTransp       = 80;              // Transparência (0=sólido, 100=inv.)

input group "=== FAIR VALUE GAPS ==="
input bool   InpShowFVG        = true;            // Mostrar FVGs
input int    InpFVGMinPips     = 3;               // Tamanho mínimo do FVG (pips)
input color  InpBullFVGColor   = C'0,80,160';     // Cor FVG Bullish
input color  InpBearFVGColor   = C'160,40,0';     // Cor FVG Bearish
input int    InpFVGExtend      = 30;              // Extensão do retângulo (candles à direita)

input group "=== LIQUIDITY SWEEPS ==="
input bool   InpShowSweeps     = true;            // Mostrar Sweeps
input int    InpSweepLookback  = 15;              // Janela para localizar swing (candles)
input int    InpSweepMinPips   = 2;               // Penetração mínima do nível (pips)
input color  InpSweepBullColor = clrAqua;         // Cor Sweep Bullish (fundo varrido)
input color  InpSweepBearColor = clrMagenta;      // Cor Sweep Bearish (topo varrido)

input group "=== ENGULFING ==="
input bool   InpShowEngulf     = true;            // Mostrar Engulfing
input double InpEngulfRatio    = 1.0;             // Proporção mínima corpo/corpo anterior
input color  InpBullEngulfColor = clrSpringGreen; // Cor Engulf Bullish
input color  InpBearEngulfColor = clrOrangeRed;   // Cor Engulf Bearish

input group "=== BREAK OF STRUCTURE / CHoCH ==="
input bool   InpShowStructure  = true;            // Mostrar BOS / CHoCH
input int    InpSwingLen       = 5;               // Barras cada lado para confirmar swing
input color  InpBOSColor       = clrGold;         // Cor linha BOS
input color  InpCHoCHColor     = clrFuchsia;      // Cor linha CHoCH

input group "=== ALERTAS ==="
input bool   InpAlerts         = true;            // Alertas pop-up
input bool   InpAlertEmail     = false;           // Alertas por e-mail
input bool   InpAlertPush      = false;           // Alertas Push

input group "=== GERAL ==="
input int    InpHistory        = 300;             // Candles de histórico

//+------------------------------------------------------------------+
//| Buffers                                                          |
//+------------------------------------------------------------------+
double BullSignal[];   // buffer 0 — posição do sinal de compra
double BearSignal[];   // buffer 1 — posição do sinal de venda
double BullType[];     // buffer 2 — tipo do gatilho bullish  (cálculo)
double BearType[];     // buffer 3 — tipo do gatilho bearish  (cálculo)

datetime g_lastAlert = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   SetIndexBuffer(0, BullSignal, INDICATOR_DATA);
   SetIndexBuffer(1, BearSignal, INDICATOR_DATA);
   SetIndexBuffer(2, BullType,   INDICATOR_CALCULATIONS);
   SetIndexBuffer(3, BearType,   INDICATOR_CALCULATIONS);

   PlotIndexSetInteger(0, PLOT_ARROW, 233);   // seta para cima
   PlotIndexSetInteger(1, PLOT_ARROW, 234);   // seta para baixo
   PlotIndexSetDouble(0,  PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetDouble(1,  PLOT_EMPTY_VALUE, 0.0);

   IndicatorSetString(INDICATOR_SHORTNAME, "SMC Suite v1.1");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ObjectsDeleteAll(0, OBJ_PREFIX);
}

//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double   &open[],
                const double   &high[],
                const double   &low[],
                const double   &close[],
                const long     &tick_volume[],
                const long     &volume[],
                const int      &spread[])
{
   //--- mínimo de barras necessário
   int minBars = InpHistory + InpSwingLen * 2 + InpOBConfirm + 5;
   if (rates_total < minBars) return 0;

   double point   = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int    digits  = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double pipSize = (digits == 3 || digits == 5) ? point * 10.0 : point;

   //--- em recalculo completo, apaga todos os objetos anteriores
   if (prev_calculated == 0)
      ObjectsDeleteAll(0, OBJ_PREFIX);

   //--- intervalo de recálculo
   int start = (prev_calculated == 0)
               ? (InpHistory + InpSwingLen * 2 + InpOBConfirm + 2)
               : MathMax(prev_calculated - 2, InpSwingLen * 2 + InpOBConfirm + 2);

   //--- garante que não ultrapassa o fim (a barra atual ainda está se formando)
   int end = rates_total - 1;

   for (int i = start; i < end; i++)
   {
      BullSignal[i] = 0.0;
      BearSignal[i] = 0.0;
      BullType[i]   = 0.0;
      BearType[i]   = 0.0;

      bool bull = false, bear = false;
      double sigBull = 0, sigBear = 0;

      // ============================================================
      // 1. ORDER BLOCKS
      // ============================================================
      if (InpShowOB)
      {
         if (IsBullishOB(i, rates_total, open, high, low, close, time, pipSize))
         {
            if (!bull) { bull = true; sigBull = SIG_OB; }
         }
         if (IsBearishOB(i, rates_total, open, high, low, close, time, pipSize))
         {
            if (!bear) { bear = true; sigBear = SIG_OB; }
         }
      }

      // ============================================================
      // 2. FAIR VALUE GAPS
      // ============================================================
      if (InpShowFVG && i >= 2)
      {
         // Bullish FVG: high[i-2] < low[i]  →  gap acima do high da vela antiga
         if (high[i-2] < low[i])
         {
            double gapSize = low[i] - high[i-2];
            if (gapSize >= InpFVGMinPips * pipSize)
            {
               DrawRect("FVG_Bull", i, time, high[i-2], low[i],
                        InpBullFVGColor, InpFVGExtend);
               if (!bull) { bull = true; sigBull = SIG_FVG; }
            }
         }
         // Bearish FVG: low[i-2] > high[i]  →  gap abaixo do low da vela antiga
         if (low[i-2] > high[i])
         {
            double gapSize = low[i-2] - high[i];
            if (gapSize >= InpFVGMinPips * pipSize)
            {
               DrawRect("FVG_Bear", i, time, high[i], low[i-2],
                        InpBearFVGColor, InpFVGExtend);
               if (!bear) { bear = true; sigBear = SIG_FVG; }
            }
         }
      }

      // ============================================================
      // 3. LIQUIDITY SWEEPS
      // ============================================================
      if (InpShowSweeps && i >= InpSweepLookback + 1)
      {
         if (IsBullishSweep(i, high, low, close, time, pipSize))
         {
            if (!bull) { bull = true; sigBull = SIG_SWEEP; }
         }
         if (IsBearishSweep(i, high, low, close, time, pipSize))
         {
            if (!bear) { bear = true; sigBear = SIG_SWEEP; }
         }
      }

      // ============================================================
      // 4. ENGULFING
      // ============================================================
      if (InpShowEngulf && i >= 1)
      {
         double prevBody = MathAbs(close[i-1] - open[i-1]);
         double currBody = MathAbs(close[i]   - open[i]);

         bool prevBear = close[i-1] < open[i-1];
         bool prevBull = close[i-1] > open[i-1];
         bool currBull = close[i]   > open[i];
         bool currBear = close[i]   < open[i];

         // Bullish engulfing: atual bullish engolfa anterior bearish
         if (currBull && prevBear
             && open[i]  <= close[i-1]
             && close[i] >= open[i-1]
             && currBody >= prevBody * InpEngulfRatio)
         {
            DrawArrow("EngBull", i, time, low[i] - 5.0 * pipSize, true);
            if (!bull) { bull = true; sigBull = SIG_ENGULF; }
         }

         // Bearish engulfing: atual bearish engolfa anterior bullish
         if (currBear && prevBull
             && open[i]  >= close[i-1]
             && close[i] <= open[i-1]
             && currBody >= prevBody * InpEngulfRatio)
         {
            DrawArrow("EngBear", i, time, high[i] + 5.0 * pipSize, false);
            if (!bear) { bear = true; sigBear = SIG_ENGULF; }
         }
      }

      // ============================================================
      // 5. BOS / CHoCH
      // ============================================================
      if (InpShowStructure && i >= InpSwingLen * 2 + 1)
      {
         int strResult = DetectStructure(i, rates_total, high, low, close, time);
         // 1=BOS Bull, 2=BOS Bear, 3=CHoCH Bull, 4=CHoCH Bear
         if (strResult == 1) { if (!bull) { bull = true; sigBull = SIG_BOS;   } }
         if (strResult == 2) { if (!bear) { bear = true; sigBear = SIG_BOS;   } }
         if (strResult == 3) { if (!bull) { bull = true; sigBull = SIG_CHOCH; } }
         if (strResult == 4) { if (!bear) { bear = true; sigBear = SIG_CHOCH; } }
      }

      // ============================================================
      // Preenche buffers
      // ============================================================
      if (bull)
      {
         BullSignal[i] = low[i]  - 8.0 * pipSize;
         BullType[i]   = sigBull;
      }
      if (bear)
      {
         BearSignal[i] = high[i] + 8.0 * pipSize;
         BearType[i]   = sigBear;
      }
   }

   // ============================================================
   // Alertas (dispara na barra recém-fechada, não na atual)
   // ============================================================
   if (InpAlerts && rates_total > 2)
   {
      int last = rates_total - 2;   // última barra fechada
      if (time[last] != g_lastAlert)
      {
         if (BullSignal[last] > 0.0 || BearSignal[last] > 0.0)
         {
            string dir = (BullSignal[last] > 0.0) ? "COMPRA" : "VENDA";
            double tp  = (BullSignal[last] > 0.0) ? BullType[last] : BearType[last];
            string msg = StringFormat("SMC Suite | %s %s | %s | %s",
                                      dir, _Symbol, EnumToString((ENUM_TIMEFRAMES)Period()),
                                      SigName((int)tp));
            Alert(msg);
            if (InpAlertEmail) SendMail("SMC Suite Alert", msg);
            if (InpAlertPush)  SendNotification(msg);
            g_lastAlert = time[last];
         }
      }
   }

   return rates_total;
}

//+------------------------------------------------------------------+
//| ORDER BLOCK DETECTION                                            |
//+------------------------------------------------------------------+

// Bullish OB: vela bearish em i, seguida de InpOBConfirm velas bullish
// (i+1, i+2 ... i+InpOBConfirm) — a vela bearish foi o "combustível"
// do impulso para cima e vira zona de suporte (mitigação futura).
bool IsBullishOB(int i, int total,
                 const double &open[], const double &high[],
                 const double &low[],  const double &close[],
                 const datetime &time[], double pipSize)
{
   if (i + InpOBConfirm >= total) return false;
   if (close[i] >= open[i]) return false;   // deve ser bearish

   // InpOBConfirm candles seguintes devem ser bullish
   for (int j = i + 1; j <= i + InpOBConfirm; j++)
      if (close[j] <= open[j]) return false;

   // Movimento mínimo: close da última vela de confirmação acima do high do OB
   if (close[i + InpOBConfirm] <= high[i]) return false;

   string name = StringFormat("%sBullOB_%d", OBJ_PREFIX, i);
   if (ObjectFind(0, name) < 0)
   {
      DrawOBRect(name, time[i], time[i + InpOBConfirm],
                 low[i], high[i], InpBullOBColor, InpOBTransp, "Bullish OB");
   }
   return true;
}

// Bearish OB: vela bullish em i, seguida de InpOBConfirm velas bearish.
bool IsBearishOB(int i, int total,
                 const double &open[], const double &high[],
                 const double &low[],  const double &close[],
                 const datetime &time[], double pipSize)
{
   if (i + InpOBConfirm >= total) return false;
   if (close[i] <= open[i]) return false;   // deve ser bullish

   for (int j = i + 1; j <= i + InpOBConfirm; j++)
      if (close[j] >= open[j]) return false;

   if (close[i + InpOBConfirm] >= low[i]) return false;

   string name = StringFormat("%sBearOB_%d", OBJ_PREFIX, i);
   if (ObjectFind(0, name) < 0)
   {
      DrawOBRect(name, time[i], time[i + InpOBConfirm],
                 low[i], high[i], InpBearOBColor, InpOBTransp, "Bearish OB");
   }
   return true;
}

//+------------------------------------------------------------------+
//| SWEEP DETECTION                                                  |
//+------------------------------------------------------------------+

// Bullish sweep (stop hunt de fundo):
//   - Identifica o swing low mais baixo no lookback ANTES de i.
//   - A barra i penetra abaixo do swing low (≥ InpSweepMinPips).
//   - A barra i fecha ACIMA do swing low (rejeição = combustível para subida).
bool IsBullishSweep(int i,
                    const double &high[], const double &low[], const double &close[],
                    const datetime &time[], double pipSize)
{
   double swingLow = low[i - 1];
   for (int j = i - 2; j >= i - InpSweepLookback; j--)
      if (j >= 0 && low[j] < swingLow) swingLow = low[j];

   double penetration = swingLow - low[i];
   if (penetration < InpSweepMinPips * pipSize) return false;
   if (close[i] <= swingLow) return false;   // não fechou acima → sem rejeição

   string name = StringFormat("%sSweepBull_%d", OBJ_PREFIX, i);
   if (ObjectFind(0, name) < 0)
   {
      ObjectCreate(0, name, OBJ_ARROW_UP, 0, time[i], low[i] - 8.0 * pipSize);
      ObjectSetInteger(0, name, OBJPROP_COLOR,     InpSweepBullColor);
      ObjectSetInteger(0, name, OBJPROP_WIDTH,     2);
      ObjectSetString(0,  name, OBJPROP_TOOLTIP,   "Sweep Bullish — stop hunt de fundo");
   }
   return true;
}

// Bearish sweep (stop hunt de topo):
//   - Identifica o swing high mais alto no lookback ANTES de i.
//   - A barra i ultrapassa o swing high (≥ InpSweepMinPips).
//   - A barra i fecha ABAIXO do swing high (rejeição).
bool IsBearishSweep(int i,
                    const double &high[], const double &low[], const double &close[],
                    const datetime &time[], double pipSize)
{
   double swingHigh = high[i - 1];
   for (int j = i - 2; j >= i - InpSweepLookback; j--)
      if (j >= 0 && high[j] > swingHigh) swingHigh = high[j];

   double penetration = high[i] - swingHigh;
   if (penetration < InpSweepMinPips * pipSize) return false;
   if (close[i] >= swingHigh) return false;

   string name = StringFormat("%sSweepBear_%d", OBJ_PREFIX, i);
   if (ObjectFind(0, name) < 0)
   {
      ObjectCreate(0, name, OBJ_ARROW_DOWN, 0, time[i], high[i] + 8.0 * pipSize);
      ObjectSetInteger(0, name, OBJPROP_COLOR,     InpSweepBearColor);
      ObjectSetInteger(0, name, OBJPROP_WIDTH,     2);
      ObjectSetString(0,  name, OBJPROP_TOOLTIP,   "Sweep Bearish — stop hunt de topo");
   }
   return true;
}

//+------------------------------------------------------------------+
//| BOS / CHoCH DETECTION                                           |
//+------------------------------------------------------------------+

// Encontra o swing high mais recente antes de `bar` (lookback = InpSwingLen*2).
// Um swing high é confirmado quando `InpSwingLen` barras de cada lado são menores.
double FindLastSwingHigh(int bar, const double &high[], int &swingBar)
{
   swingBar = -1;
   double sh = -DBL_MAX;
   for (int j = bar - InpSwingLen - 1; j >= bar - InpSwingLen * 2 - 1; j--)
   {
      if (j - InpSwingLen < 0) break;
      bool isSwing = true;
      for (int k = j - InpSwingLen; k <= j + InpSwingLen; k++)
         if (k != j && high[k] >= high[j]) { isSwing = false; break; }
      if (isSwing && high[j] > sh) { sh = high[j]; swingBar = j; }
   }
   return sh;
}

double FindLastSwingLow(int bar, const double &low[], int &swingBar)
{
   swingBar = -1;
   double sl = DBL_MAX;
   for (int j = bar - InpSwingLen - 1; j >= bar - InpSwingLen * 2 - 1; j--)
   {
      if (j - InpSwingLen < 0) break;
      bool isSwing = true;
      for (int k = j - InpSwingLen; k <= j + InpSwingLen; k++)
         if (k != j && low[k] <= low[j]) { isSwing = false; break; }
      if (isSwing && low[j] < sl) { sl = low[j]; swingBar = j; }
   }
   return sl;
}

// Determina tendência atual: 1 = alta, -1 = baixa, 0 = indefinida.
// Baseia-se em HH/HL para alta e LH/LL para baixa nos últimos swings.
int CurrentTrend(int bar, const double &high[], const double &low[])
{
   int sh1Bar = -1, sh2Bar = -1, sl1Bar = -1, sl2Bar = -1;
   double sh1 = FindLastSwingHigh(bar,            high, sh1Bar);
   double sh2 = FindLastSwingHigh(MathMax(sh1Bar - 1, InpSwingLen * 2), high, sh2Bar);
   double sl1 = FindLastSwingLow(bar,             low,  sl1Bar);
   double sl2 = FindLastSwingLow(MathMax(sl1Bar - 1, InpSwingLen * 2), low,  sl2Bar);

   if (sh1Bar < 0 || sh2Bar < 0 || sl1Bar < 0 || sl2Bar < 0) return 0;

   bool higherHighs = sh1 > sh2;
   bool higherLows  = sl1 > sl2;
   bool lowerLows   = sl1 < sl2;
   bool lowerHighs  = sh1 < sh2;

   if (higherHighs && higherLows) return  1;   // tendência de alta
   if (lowerLows   && lowerHighs) return -1;   // tendência de baixa
   return 0;
}

// Retorna:
//   0 = nada   1 = BOS Bullish   2 = BOS Bearish
//   3 = CHoCH Bullish   4 = CHoCH Bearish
int DetectStructure(int i, int total,
                    const double &high[], const double &low[], const double &close[],
                    const datetime &time[])
{
   int shBar, slBar;
   double swingH = FindLastSwingHigh(i, high, shBar);
   double swingL = FindLastSwingLow(i,  low,  slBar);

   if (shBar < 0 || slBar < 0) return 0;

   int trend = CurrentTrend(i, high, low);
   bool breaksHigh = close[i] > swingH;
   bool breaksLow  = close[i] < swingL;

   if (!breaksHigh && !breaksLow) return 0;

   // Evita redesenhar a mesma linha
   string name;
   int result = 0;

   if (breaksHigh)
   {
      result = (trend >= 0) ? 1 : 3;   // uptrend → BOS, downtrend → CHoCH
      name = StringFormat("%s%s_Bull_%d", OBJ_PREFIX, (result==1?"BOS":"CHoCH"), i);
      if (ObjectFind(0, name) < 0)
         DrawStructLine(name, time[shBar], time[i],
                        swingH, (result==1) ? InpBOSColor : InpCHoCHColor,
                        (result==1) ? "BOS ↑" : "CHoCH ↑");
   }
   else
   {
      result = (trend <= 0) ? 2 : 4;   // downtrend → BOS, uptrend → CHoCH
      name = StringFormat("%s%s_Bear_%d", OBJ_PREFIX, (result==2?"BOS":"CHoCH"), i);
      if (ObjectFind(0, name) < 0)
         DrawStructLine(name, time[slBar], time[i],
                        swingL, (result==2) ? InpBOSColor : InpCHoCHColor,
                        (result==2) ? "BOS ↓" : "CHoCH ↓");
   }
   return result;
}

//+------------------------------------------------------------------+
//| FUNÇÕES DE DESENHO                                               |
//+------------------------------------------------------------------+

void DrawOBRect(string name,
                datetime t1, datetime t2,
                double price1, double price2,
                color clr, int transp, string tip)
{
   ObjectCreate(0, name, OBJ_RECTANGLE, 0, t1, price1, t2, price2);
   ObjectSetInteger(0, name, OBJPROP_COLOR,     clr);
   ObjectSetInteger(0, name, OBJPROP_FILL,      true);
   ObjectSetInteger(0, name, OBJPROP_BACK,      true);
   ObjectSetInteger(0, name, OBJPROP_STYLE,     STYLE_SOLID);
   ObjectSetInteger(0, name, OBJPROP_WIDTH,     1);
   ObjectSetString(0,  name, OBJPROP_TOOLTIP,   tip);
}

void DrawRect(string tag, int i,
              const datetime &time[],
              double bottom, double top,
              color clr, int extendBars)
{
   string name = StringFormat("%s%s_%d", OBJ_PREFIX, tag, i);
   if (ObjectFind(0, name) >= 0) return;

   // calcula o time da barra de extensão (pode não existir ainda → usa o time do bar i)
   datetime tRight = time[MathMin(i + extendBars, ArraySize(time) - 1)];

   ObjectCreate(0, name, OBJ_RECTANGLE, 0, time[i-1], bottom, tRight, top);
   ObjectSetInteger(0, name, OBJPROP_COLOR,  clr);
   ObjectSetInteger(0, name, OBJPROP_FILL,   true);
   ObjectSetInteger(0, name, OBJPROP_BACK,   true);
   ObjectSetInteger(0, name, OBJPROP_STYLE,  STYLE_DOT);
   ObjectSetInteger(0, name, OBJPROP_WIDTH,  1);
}

void DrawArrow(string tag, int i,
               const datetime &time[], double price, bool up)
{
   string name = StringFormat("%s%s_%d", OBJ_PREFIX, tag, i);
   if (ObjectFind(0, name) >= 0) return;

   color  clr  = up ? InpBullEngulfColor : InpBearEngulfColor;
   string tip  = up ? "Engulfing Bullish" : "Engulfing Bearish";

   ObjectCreate(0, name, OBJ_ARROW, 0, time[i], price);
   ObjectSetInteger(0, name, OBJPROP_ARROWCODE, up ? 233 : 234);
   ObjectSetInteger(0, name, OBJPROP_COLOR,     clr);
   ObjectSetInteger(0, name, OBJPROP_WIDTH,     2);
   ObjectSetString(0,  name, OBJPROP_TOOLTIP,   tip);
}

void DrawStructLine(string name,
                    datetime t1, datetime t2,
                    double price,
                    color clr, string tip)
{
   ObjectCreate(0, name, OBJ_TREND, 0, t1, price, t2, price);
   ObjectSetInteger(0, name, OBJPROP_COLOR,    clr);
   ObjectSetInteger(0, name, OBJPROP_WIDTH,    2);
   ObjectSetInteger(0, name, OBJPROP_STYLE,    STYLE_DASH);
   ObjectSetInteger(0, name, OBJPROP_RAY_RIGHT, false);
   ObjectSetString(0,  name, OBJPROP_TOOLTIP,  tip);
   ObjectSetString(0,  name, OBJPROP_TEXT,     tip);
}

//+------------------------------------------------------------------+
//| Utilitário                                                        |
//+------------------------------------------------------------------+
string SigName(int t)
{
   switch (t)
   {
      case 1: return "Order Block";
      case 2: return "Fair Value Gap";
      case 3: return "Liquidity Sweep";
      case 4: return "Engulfing";
      case 5: return "Break of Structure";
      case 6: return "Change of Character";
   }
   return "SMC";
}
