//+------------------------------------------------------------------+
//| XM_ExportarBarras.mq5 - Forex Assist (SCRIPT, roda uma vez)       |
//| Exporta as barras de 5 minutos da XM dos 10 pares do app para um  |
//| arquivo CSV em MQL5\Files\xm_barras_m5.csv. Serve para refazer o  |
//| julgamento WIN/LOSS dos sinais do app com o preço da XM e comparar|
//| com o julgamento feito com o preço do TwelveData.                 |
//| SOMENTE LEITURA: não envia ordens, não acessa a internet.         |
//| A hora das barras é a do SERVIDOR da XM (GMT+3 no horário de verão|
//| dos EUA, GMT+2 fora; virou em 01/11/2026). A análise converte por |
//| data e confere com o preço do app; o offset do arquivo é só do    |
//| instante da exportação.                                           |
//| Ver DOCUMENTACAO/XM-EXECUTOR.md (seção MT5 x TwelveData).         |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.00"
#property script_show_inputs

input datetime Desde   = D'2026.10.04 00:00';   // início (hora do servidor da XM)
input string   Pares   = "EURUSD,GBPUSD,USDJPY,AUDUSD,USDCAD,USDCHF,NZDUSD,EURGBP,EURJPY,GBPJPY";
input string   Sufixo  = "";                     // sufixo dos símbolos, se a corretora usar (ex.: "#")
input string   Arquivo = "xm_barras_m5.csv";

void OnStart()
  {
   string nomes[];
   int k = StringSplit(Pares, ',', nomes);
   long offset = (long)TimeTradeServer() - (long)TimeGMT();     // segundos: hora do servidor - UTC
   int h = FileOpen(Arquivo, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE)
     {
      Print("XM_ExportarBarras: não consegui criar o arquivo, erro ", GetLastError());
      return;
     }
   FileWriteString(h, "offset_servidor_seg=" + IntegerToString(offset) + "\n");
   FileWriteString(h, "simbolo,hora_servidor,open,high,low,close,spread_pontos,digitos\n");
   int total = 0;
   for(int i = 0; i < k; i++)
     {
      string sym = nomes[i] + Sufixo;
      if(!SymbolSelect(sym, true)) { Print("XM_ExportarBarras: símbolo não encontrado: ", sym); continue; }
      int digitos = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      MqlRates r[];
      int n = -1;
      for(int t = 0; t < 10 && n <= 0; t++)              // o histórico pode precisar ser baixado: tenta por até ~10 s
        {
         n = CopyRates(sym, PERIOD_M5, Desde, TimeCurrent(), r);
         if(n <= 0) Sleep(1000);
        }
      if(n <= 0) { Print("XM_ExportarBarras: sem barras para ", sym, ", erro ", GetLastError()); continue; }
      for(int j = 0; j < n; j++)
         FileWriteString(h, sym + "," + IntegerToString((long)r[j].time) + "," +
                         DoubleToString(r[j].open, digitos) + "," + DoubleToString(r[j].high, digitos) + "," +
                         DoubleToString(r[j].low, digitos) + "," + DoubleToString(r[j].close, digitos) + "," +
                         IntegerToString(r[j].spread) + "," + IntegerToString(digitos) + "\n");
      total += n;
      Print("XM_ExportarBarras: ", sym, " ", n, " barras");
     }
   FileClose(h);
   Print("XM_ExportarBarras: pronto, ", total, " barras em MQL5\\Files\\", Arquivo, " (offset do servidor ", offset, " s)");
  }
//+------------------------------------------------------------------+
