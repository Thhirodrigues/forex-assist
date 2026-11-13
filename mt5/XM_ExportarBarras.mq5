//+------------------------------------------------------------------+
//| XM_ExportarBarras.mq5 - Forex Assist (SCRIPT, roda uma vez)       |
//| Exporta as barras da XM (M1 ou M5, à escolha) dos 10 pares do app |
//| para UM ARQUIVO POR PAR em MQL5\Files\xm_barras_<M1|M5>_<PAR>.csv |
//| (arquivos pequenos, fáceis de enviar). Serve para (a) refazer o   |
//| julgamento WIN/LOSS dos sinais com o preço da XM e (b) a base de  |
//| 1 minuto. SOMENTE LEITURA: não envia ordens, não usa a internet.  |
//| v1.10: abre um gráfico de cada par para o MT5 SINCRONIZAR o       |
//| histórico (a v1.00 exportou 7 pares sem 06-13/11 porque só os que |
//| tinham gráfico aberto estavam completos), confere lacunas e avisa.|
//| A hora das barras é a do SERVIDOR da XM (GMT+3 no horário de verão|
//| dos EUA, GMT+2 fora; virou em 01/11/2026). A análise converte por |
//| data e confere com o preço do app; o offset do arquivo é só do    |
//| instante da exportação.                                           |
//| Ver DOCUMENTACAO/XM-EXECUTOR.md.                                  |
//+------------------------------------------------------------------+
#property copyright "Forex Assist"
#property version   "1.10"
#property script_show_inputs

input datetime        Desde      = D'2026.10.04 00:00';   // início (hora do servidor da XM)
input ENUM_TIMEFRAMES Periodo    = PERIOD_M5;             // PERIOD_M5 (padrão) ou PERIOD_M1
input string          Pares      = "EURUSD,GBPUSD,USDJPY,AUDUSD,USDCAD,USDCHF,NZDUSD,EURGBP,EURJPY,GBPJPY";
input string          Sufixo     = "";                    // sufixo dos símbolos, se a corretora usar (ex.: "#")
input int             EsperaSeg  = 60;                    // por par: tempo máximo para o MT5 baixar/sincronizar o histórico

string Rotulo()
  {
   if(Periodo == PERIOD_M1) return "M1";
   if(Periodo == PERIOD_M5) return "M5";
   return "P" + IntegerToString(PeriodSeconds(Periodo) / 60);
  }

// conta lacunas suspeitas: entre 1 h e 40 h sem barras (o fim de semana tem ~47 h e é normal)
int ContarLacunas(const MqlRates &r[], const int n, long &maiorLacunaSeg)
  {
   int suspeitas = 0;
   maiorLacunaSeg = 0;
   for(int j = 1; j < n; j++)
     {
      long g = (long)(r[j].time - r[j - 1].time);
      if(g > 3600 && g < 40 * 3600)
        {
         suspeitas++;
         if(g > maiorLacunaSeg) maiorLacunaSeg = g;
        }
     }
   return suspeitas;
  }

void OnStart()
  {
   string nomes[];
   int k = StringSplit(Pares, ',', nomes);
   long offset = (long)TimeTradeServer() - (long)TimeGMT();     // segundos: hora do servidor - UTC (do instante da exportação)
   string rot = Rotulo();
   int totalBarras = 0, paresComAviso = 0;
   for(int i = 0; i < k; i++)
     {
      string sym = nomes[i] + Sufixo;
      if(!SymbolSelect(sym, true)) { Print("XM_ExportarBarras: símbolo não encontrado: ", sym); continue; }
      int digitos = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      // um gráfico aberto faz o MT5 carregar o histórico completo do servidor; é fechado no fim
      long ch = ChartOpen(sym, Periodo);
      uint ini = GetTickCount();
      while(!(bool)SeriesInfoInteger(sym, Periodo, SERIES_SYNCHRONIZED) && (GetTickCount() - ini) < (uint)(EsperaSeg * 1000))
         Sleep(500);
      MqlRates r[];
      int n = -1, tentativa = 0, suspeitas = 0;
      long maiorLacuna = 0;
      while(tentativa < 4)
        {
         n = CopyRates(sym, Periodo, Desde, TimeCurrent(), r);
         if(n > 0)
           {
            suspeitas = ContarLacunas(r, n, maiorLacuna);
            if(suspeitas == 0) break;           // sem lacuna estranha: pronto
           }
         tentativa++;
         Sleep(5000);                           // dá tempo ao MT5 de baixar o que falta e tenta de novo
        }
      if(n <= 0)
        {
         Print("XM_ExportarBarras: sem barras para ", sym, ", erro ", GetLastError());
         if(ch > 0) ChartClose(ch);
         continue;
        }
      string arquivo = "xm_barras_" + rot + "_" + nomes[i] + ".csv";
      int h = FileOpen(arquivo, FILE_WRITE | FILE_TXT | FILE_ANSI);
      if(h == INVALID_HANDLE)
        {
         Print("XM_ExportarBarras: não consegui criar ", arquivo, ", erro ", GetLastError());
         if(ch > 0) ChartClose(ch);
         continue;
        }
      FileWriteString(h, "offset_servidor_seg=" + IntegerToString(offset) + "\n");
      FileWriteString(h, "simbolo,hora_servidor,open,high,low,close,spread_pontos,digitos\n");
      for(int j = 0; j < n; j++)
         FileWriteString(h, sym + "," + IntegerToString((long)r[j].time) + "," +
                         DoubleToString(r[j].open, digitos) + "," + DoubleToString(r[j].high, digitos) + "," +
                         DoubleToString(r[j].low, digitos) + "," + DoubleToString(r[j].close, digitos) + "," +
                         IntegerToString(r[j].spread) + "," + IntegerToString(digitos) + "\n");
      FileClose(h);
      if(ch > 0) ChartClose(ch);
      totalBarras += n;
      string aviso = suspeitas > 0 ? "  <<< ATENCAO: " + IntegerToString(suspeitas) + " lacuna(s) de 1-40 h (maior " + IntegerToString((int)(maiorLacuna / 3600)) + " h)" : "";
      if(suspeitas > 0) paresComAviso++;
      Print("XM_ExportarBarras: ", sym, " ", rot, " ", n, " barras, de ", TimeToString(r[0].time), " a ", TimeToString(r[n - 1].time), " -> ", arquivo, aviso);
     }
   Print("XM_ExportarBarras: pronto, ", totalBarras, " barras (", rot, "), ", paresComAviso, " par(es) com aviso de lacuna. Arquivos em MQL5\\Files\\ (offset do servidor no export: ", offset, " s)");
  }
//+------------------------------------------------------------------+
