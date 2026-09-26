LAUDO TÉCNICO OFICIAL
DESTINO FUTURO
ENGINEERING.md
Separar worklog
Registrar no Worklog: Sim (resumo)
Atualizar Documento Mestre: Não (nenhuma mudança arquitetural identificada)
--------

LAUDO TÉCNICO OFICIAL Nº 001

Arquivo

scripts/scanner.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Objetivo

Auditar a implementação do módulo responsável por coordenar a execução do Scanner.

---

Responsabilidade Implementada

O módulo possui apenas uma responsabilidade:

Coordenar a execução do Scanner.

Não executa diretamente análises de mercado.

Toda lógica operacional foi delegada para módulos especializados.

---

Fluxo Interno

main()

↓

Inicialização

↓

Percorre lista de pares

↓

Executa analisarPar()

↓

Finaliza execução

---

Dependências

firebase.js

pairAnalyzer.js

marketData.js

marketAnalyzer.js

riskManager.js

utils.js

---

Pontos Fortes

Responsabilidade única preservada.

Boa legibilidade.

Fluxo simples.

Modularização consistente.

Baixo acoplamento.

Delegação correta das responsabilidades.

Exportação do método principal para reutilização.

---

Pontos de Atenção

Nenhum problema estrutural identificado.

A documentação ainda não descreve o fluxo interno deste módulo.

---

Dívidas Técnicas

DT-011

Documentar o fluxo interno do Scanner no futuro ENGINEERING.md.

Prioridade

P2

---

Nota Técnica

Responsabilidade: 10/10

Modularização: 10/10

Legibilidade: 9,5/10

Acoplamento: 9,5/10

Escalabilidade: 10/10

Nota Final

9,8 / 10

---

Conclusão

O módulo encontra-se aderente à arquitetura oficial do Forex Assist.

Cumpre exclusivamente a função de orquestrar a execução do Scanner, delegando corretamente a lógica de negócio aos módulos especializados.

Nenhuma refatoração estrutural é recomendada nesta auditoria.

Próximo módulo recomendado:

scripts/pairAnalyzer.js

WORKLOG (RESUMO)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/scanner.js".

Resultado:

- Arquitetura aderente ao Documento Mestre.
- Modularização confirmada.
- Responsabilidade única preservada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-011 (documentação do fluxo interno).

Próxima auditoria definida:

- "scripts/pairAnalyzer.js".

Decisão de engenharia
A partir de agora, todo arquivo auditado gerará exatamente estes dois blocos:
Laudo Técnico Completo (destino futuro: ENGINEERING.md).
Resumo para o Worklog.
O Documento Mestre só será atualizado quando a auditoria resultar em uma mudança permanente de arquitetura, preservando sua função como documento de governança.
Agora sim podemos seguir para o Laudo Técnico Oficial nº 002 do scripts/pairAnalyzer.js, que acredito ser o verdadeiro núcleo da lógica do Scanner.
------

LAUDO TÉCNICO OFICIAL Nº 002

Arquivo

scripts/pairAnalyzer.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Objetivo

Auditar a implementação do módulo responsável pela análise individual de cada par de moedas.

---

Responsabilidade Implementada

O módulo recebe todas as dependências necessárias por injeção de dependência e executa o ciclo completo de análise para um único ativo.

Ao final, registra uma operação apenas quando todos os critérios forem satisfeitos.

---

Fluxo Interno

Receber parâmetros

↓

Verificar cooldown

↓

Obter candles

↓

Preparar preços de fechamento

↓

Calcular EMA 9

↓

Calcular EMA 21

↓

Calcular RSI

↓

Determinar direção (BUY ou SELL)

↓

Calcular qualidade

↓

Salvar operação

↓

Finalizar

---

Dependências

marketData.js

marketAnalyzer.js

utils.js

riskManager.js

firebase.js

---

Regras de Negócio Identificadas

Verificação de cooldown antes de qualquer processamento.

Cálculo de EMA 9.

Cálculo de EMA 21.

Cálculo de RSI.

Determinação da direção da operação.

Cálculo da qualidade do sinal.

Persistência da operação.

Todas essas regras pertencem ao contexto de análise de um único ativo, demonstrando alta coesão.

---

Pontos Fortes

Responsabilidade única preservada.

Fluxo linear e de fácil compreensão.

Baixo acoplamento por meio de injeção de dependências.

Separação clara entre aquisição de dados, análise, gestão de risco e persistência.

Tratamento de exceções presente.

Registro apenas de operações válidas.

---

Pontos de Atenção

Os limiares utilizados para decisão (EMA e RSI) encontram-se definidos diretamente no módulo.

Caso esses parâmetros passem a variar por estratégia ou perfil operacional, recomenda-se centralizá-los em um módulo de configuração.

No estado atual, essa implementação é adequada e não caracteriza dívida técnica.

---

Dívidas Técnicas

DT-012

Título

Externalizar parâmetros fixos de estratégia.

Prioridade

P3

Justificativa

Facilitar futuras alterações de estratégia sem modificar o código do módulo.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Tratamento de exceções: 9,5/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O módulo apresenta excelente aderência à arquitetura oficial.

Toda a lógica implementada pertence ao domínio de análise de um único ativo.

A utilização de injeção de dependências reduz o acoplamento e facilita testes, evolução e manutenção.

Não foi identificada necessidade de refatoração estrutural.

Recomenda-se apenas a futura parametrização dos limiares de decisão, caso novas estratégias sejam incorporadas ao sistema.

WORKLOG (RESUMO)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/pairAnalyzer.js".

Resultado:

- Responsabilidade única confirmada.
- Fluxo de análise consistente.
- Baixo acoplamento por injeção de dependências.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-012 para futura parametrização dos limiares da estratégia.

Próxima auditoria definida:

- "scripts/marketData.js".

Nova descoberta da auditoria
Esta análise revelou uma decisão arquitetural importante:
O pairAnalyzer.js não analisa o mercado inteiro. Ele analisa um único ativo e delega tarefas especializadas para outros módulos. Isso significa que ele atua como um caso de uso da Engine, coordenando a execução da estratégia para um par específico, enquanto o scanner.js coordena o conjunto de pares. Essa divisão está muito bem alinhada com a arquitetura modular definida no Documento Mestre.
------

LAUDO TÉCNICO OFICIAL Nº 003

Arquivo

scripts/marketAnalyzer.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Objetivo

Auditar o módulo responsável pelo cálculo da qualidade do sinal gerado pelo Scanner.

---

Responsabilidade Implementada

O módulo recebe indicadores previamente calculados e produz uma pontuação de qualidade variando de 0 a 100.

Não realiza consultas externas.

Não grava informações.

Não toma decisões sobre geração de operações.

Sua única responsabilidade é atribuir qualidade ao cenário analisado.

---

Fluxo Interno

Receber EMA 9

↓

Receber EMA 21

↓

Calcular distância entre médias

↓

Avaliar força da tendência

↓

Avaliar faixa do RSI

↓

Somar pontuação

↓

Limitar valor máximo

↓

Retornar qualidade

---

Dependências

Nenhuma.

O módulo é completamente desacoplado.

Recebe apenas valores primitivos.

---

Regras de Negócio Identificadas

A pontuação considera:

- distância entre EMA 9 e EMA 21;
- faixa operacional do RSI;
- fortalecimento adicional quando a distância entre médias é elevada;
- limite máximo de 100 pontos.

---

Pontos Fortes

Responsabilidade única.

Alta legibilidade.

Baixíssimo acoplamento.

Função pura.

Sem efeitos colaterais.

Fácil reutilização.

Excelente potencial para testes unitários.

---

Pontos de Atenção

Os pesos utilizados na pontuação encontram-se definidos diretamente no código.

Caso a estratégia evolua para múltiplos perfis operacionais, recomenda-se mover esses parâmetros para uma camada de configuração.

No estado atual isso não representa problema estrutural.

---

Dívidas Técnicas

DT-013

Título

Parametrização futura dos pesos da qualidade.

Prioridade

P3

Justificativa

Permitir ajuste fino da estratégia sem necessidade de alteração do código.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Acoplamento: 10/10

Legibilidade: 10/10

Testabilidade: 10/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O módulo apresenta excelente qualidade arquitetural.

Trata-se de uma função pura, especializada e totalmente aderente ao princípio da responsabilidade única.

Não foram identificadas necessidades de refatoração estrutural.

A única evolução recomendada é a futura externalização dos pesos da estratégia caso o projeto passe a suportar múltiplos perfis de operação.

WORKLOG (RESUMO)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/marketAnalyzer.js".

Resultado:

- Responsabilidade única confirmada.
- Função pura e desacoplada.
- Excelente potencial para testes unitários.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-013 para futura parametrização dos pesos da estratégia.

Próxima auditoria definida:

- "scripts/marketData.js".

Nova descoberta da auditoria
Este módulo confirmou um padrão que está aparecendo em toda a Engine: cada componente possui uma responsabilidade extremamente bem delimitada. O marketAnalyzer.js não busca dados, não decide operações e não persiste informações; ele apenas calcula uma métrica de qualidade a partir dos indicadores recebidos. �
marketAnalyzer.js
Observação do arquiteto
Até agora, os três primeiros laudos mostram um padrão muito positivo:
scanner.js → Orquestrador.
pairAnalyzer.js → Executor da estratégia para um único ativo.
marketAnalyzer.js → Calculadora especializada de qualidade.
Essa separação confirma que a modularização da Engine foi implementada de forma consistente. Minha expectativa é que o próximo arquivo, marketData.js, revele a última peça principal desse fluxo: a camada responsável por aquisição e normalização dos dados de mercado.
------

LAUDO TÉCNICO OFICIAL Nº 004

Arquivo

scripts/marketData.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Objetivo

Auditar o módulo responsável pela aquisição dos dados de mercado utilizados pelo Scanner.

---

Responsabilidade Implementada

O módulo possui uma responsabilidade única:

Obter candles do provedor externo e entregá-los padronizados para a Engine.

Não realiza análises.

Não gera sinais.

Não calcula indicadores.

Não grava informações.

---

Fluxo Interno

Receber símbolo

↓

Selecionar chave de API

↓

Montar URL da requisição

↓

Consultar TwelveData

↓

Validar resposta

↓

Ordenar candles

↓

Retornar dados

---

Dependências

axios

utils.js

Variáveis de ambiente

API TwelveData

---

Regras de Negócio Identificadas

Consulta utilizando intervalo de 5 minutos.

Solicitação de 120 candles.

Utilização de rotação de chaves de API.

Validação da existência dos candles.

Padronização da ordem cronológica antes do retorno.

---

Pontos Fortes

Responsabilidade única preservada.

Baixo acoplamento.

Integração isolada em um único módulo.

Utilização de variáveis de ambiente.

Preparado para rotação de chaves.

Padronização dos dados antes da entrega.

Excelente legibilidade.

---

Pontos de Atenção

O tratamento de falhas limita-se à ausência de candles.

Evoluções futuras poderão contemplar:

- tratamento específico para limite de requisições;
- indisponibilidade temporária da API;
- timeout;
- novas políticas de retry;
- monitoramento de saúde do provedor.

Esses itens representam oportunidades de robustez, não falhas da implementação atual.

---

Dívidas Técnicas

DT-014

Título

Fortalecer tratamento de falhas da camada de aquisição de dados.

Prioridade

P2

Justificativa

Aumentar a resiliência diante de indisponibilidade do provedor ou limites de uso da API.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Acoplamento: 10/10

Legibilidade: 10/10

Robustez: 9,0/10

Escalabilidade: 10/10

Nota Final

9,8 / 10

---

Conclusão

O módulo implementa corretamente a camada de aquisição de dados prevista na arquitetura do Forex Assist.

A separação entre aquisição de dados e análise de mercado foi preservada integralmente.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se ampliar a estratégia de tratamento de falhas para tornar a integração ainda mais resiliente.

WORKLOG (REAUMO)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/marketData.js".

Resultado:

- Responsabilidade única confirmada.
- Camada de aquisição de dados aderente à arquitetura.
- Rotação de chaves de API preservada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-014 para fortalecimento do tratamento de falhas na integração com o provedor de dados.

Próxima auditoria definida:

- "scripts/riskManager.js".

Nova descoberta da auditoria
Este arquivo confirmou outra decisão arquitetural importante: nenhum outro módulo da Engine precisa conhecer detalhes da API externa. Toda a comunicação com o provedor de dados está concentrada em um único ponto, o que facilita a troca futura de provedor ou a inclusão de múltiplas fontes de dados sem impactar os demais módulos. �
marketData.js
Observação do arquiteto
Até este momento, os quatro primeiros laudos mostram um padrão consistente:
scanner.js → Coordena.
pairAnalyzer.js → Executa a estratégia por ativo.
marketAnalyzer.js → Calcula a qualidade do sinal.
marketData.js → Obtém e padroniza os dados.
Isso indica que a Engine está respeitando, na implementação, a separação de responsabilidades que documentamos anteriormente.
Próximo arquivo
Seguindo a ordem estabelecida, o próximo laudo será do scripts/riskManager.js, pois ele fecha o ciclo principal da Engine ao validar risco e registrar as operações antes da persistência.
-----

LAUDO TÉCNICO OFICIAL Nº 005

Arquivo

scripts/riskManager.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Objetivo

Auditar o módulo denominado Risk Manager.

---

Responsabilidade Implementada

O módulo implementa atualmente duas responsabilidades:

- verificar cooldown operacional;
- persistir operações no Firestore.

Não existem regras de gestão de risco implementadas neste estágio.

---

Fluxo Interno

Receber timestamp

↓

Validar cooldown

↓

Retornar resultado

---

Receber operação

↓

Adicionar data

↓

Adicionar timestamp

↓

Persistir no Firestore

---

Dependências

Firestore

---

Regras de Negócio Identificadas

Validação de cooldown.

Persistência padronizada.

Inclusão automática de horário.

Inclusão automática de timestamp.

---

Pontos Fortes

Código extremamente simples.

Alta legibilidade.

Baixo acoplamento.

Funções pequenas.

Boa reutilização.

Persistência centralizada.

---

Pontos de Atenção

O nome do módulo sugere uma responsabilidade maior do que a atualmente implementada.

Não existem regras relacionadas a:

- gestão da banca;
- exposição máxima;
- risco por operação;
- perdas consecutivas;
- bloqueios operacionais.

Essas responsabilidades permanecem como evolução futura.

---

Dívidas Técnicas

DT-015

Título

Alinhar implementação do Risk Manager ao seu propósito arquitetural.

Prioridade

P1

Justificativa

O módulo atualmente implementa infraestrutura operacional, mas ainda não executa regras de gestão de risco previstas na arquitetura.

---

Nota Técnica

Responsabilidade: 9,0/10

Legibilidade: 10/10

Acoplamento: 10/10

Coesão: 9,0/10

Escalabilidade: 9,5/10

Nota Final

9,5 / 10

---

Conclusão

A implementação apresenta excelente qualidade de código.

Entretanto, a responsabilidade efetivamente implementada ainda é inferior à responsabilidade arquitetural prevista para o módulo.

O módulo encontra-se preparado para crescer sem necessidade de refatoração estrutural.

WORKLOG (resumo)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/riskManager.js".

Resultado:

- Código simples e bem organizado.
- Persistência centralizada confirmada.
- Verificação de cooldown implementada.
- Identificada divergência entre o nome do módulo e sua responsabilidade atual.

Foi registrada a DT-015 para evolução futura do módulo em direção à gestão completa de risco.

Próxima auditoria definida:

- "scripts/firebase.js".

Observação do Arquiteto
Esta foi a primeira divergência real encontrada entre arquitetura e implementação.
Ela não representa um defeito.
Representa um módulo preparado para crescer.
Quando criamos a arquitetura, imaginávamos um Risk Manager responsável por decisões de gestão de risco.
O código atual implementa apenas a primeira etapa dessa visão: controle de cooldown e persistência das operações. �
riskManager.js
Minha principal descoberta
Até agora a auditoria mostra um padrão muito interessante.
Os módulos não foram criados "aleatoriamente".
Eles foram criados com visão de futuro.
Ou seja...
A arquitetura já previa componentes que ainda não atingiram sua maturidade funcional.
Isso é um excelente sinal.
Significa que a arquitetura está à frente da implementação, e não o contrário.
Na minha opinião, isso é exatamente o que esperamos encontrar em um projeto que ainda está evoluindo: uma base sólida, preparada para receber funcionalidades futuras sem precisar ser reestruturada.
------

LAUDO TÉCNICO OFICIAL Nº 006

Arquivo

scripts/firebase.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o módulo responsável pela inicialização da infraestrutura Firebase utilizada pela Engine.

---

Responsabilidade Implementada

O módulo possui responsabilidade única:

Inicializar o Firebase Admin SDK e disponibilizar os objetos oficiais utilizados pelos demais módulos da Engine.

Não executa consultas.

Não grava dados.

Não implementa regras de negócio.

Não realiza tratamento operacional.

---

Fluxo Interno

Carregar credenciais

↓

Inicializar Firebase Admin

↓

Obter Firestore

↓

Exportar admin

↓

Exportar db

---

Dependências

firebase-admin

serviceAccount.json

Firestore

---

Regras de Negócio Identificadas

Nenhuma.

O módulo possui exclusivamente responsabilidade de infraestrutura.

---

Pontos Fortes

Responsabilidade única preservada.

Código extremamente simples.

Excelente legibilidade.

Baixíssimo acoplamento.

Centralização da infraestrutura.

Facilidade de reutilização.

Todos os demais módulos utilizam uma única origem oficial para acesso ao Firestore.

---

Pontos de Atenção

O módulo depende diretamente do arquivo serviceAccount.json.

Caso futuramente a aplicação seja executada em múltiplos ambientes (desenvolvimento, homologação e produção), recomenda-se evoluir para uma estratégia de configuração baseada em variáveis de ambiente ou credenciais gerenciadas.

No estado atual isso não representa problema estrutural.

---

Dívidas Técnicas

DT-016

Título

Preparar estratégia de inicialização para múltiplos ambientes.

Prioridade

P3

Justificativa

Facilitar futuras implantações em ambientes distintos sem alterar o código.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Infraestrutura: 10/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O módulo implementa corretamente a camada de infraestrutura prevista na arquitetura.

A centralização da inicialização do Firebase reduz duplicações, facilita manutenção e garante que toda a Engine utilize uma única instância oficial do Firestore.

Não foram identificadas necessidades de refatoração estrutural.

A única evolução recomendada é a futura adaptação para múltiplos ambientes de execução.

WORKLOG (RESUMO)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/firebase.js".

Resultado:

- Responsabilidade única confirmada.
- Inicialização centralizada do Firebase.
- Arquitetura aderente ao Documento Mestre.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-016 para futura adaptação a múltiplos ambientes de execução.

Próxima auditoria definida:

- "scripts/utils.js".

Observação do Arquiteto
Este módulo confirma uma característica muito positiva da Engine: a infraestrutura está isolada da lógica de negócio. Nenhum cálculo de mercado, regra operacional ou persistência é implementado aqui; o arquivo apenas inicializa e fornece a conexão oficial com o Firestore. �
firebase.js
Minha principal descoberta
Depois de seis laudos técnicos, começo a enxergar um padrão muito claro.
A Engine foi construída seguindo uma filosofia consistente:
Infraestrutura (firebase.js) prepara o ambiente.
Aquisição de dados (marketData.js) obtém informações externas.
Análise (marketAnalyzer.js) interpreta indicadores.
Execução da estratégia (pairAnalyzer.js) decide sobre um ativo.
Coordenação (scanner.js) orquestra o processo.
Suporte operacional (riskManager.js) aplica controles e registra operações.
Esse padrão não surgiu por acaso. Ele demonstra que a arquitetura foi evoluindo de forma organizada e reforça a impressão de que o Forex Assist está sendo consolidado como uma plataforma modular, e não apenas como um conjunto de scripts independentes.
-------

LAUDO TÉCNICO OFICIAL Nº 007

Arquivo

scripts/utils.js

Data da Auditoria

26/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o módulo responsável pelas funções utilitárias compartilhadas da Engine.

---

Responsabilidade Implementada

O módulo centraliza funções reutilizáveis utilizadas por diferentes componentes do sistema.

Atualmente implementa:

- rotação de chaves de API;
- cálculo de EMA;
- cálculo de RSI.

Não possui qualquer regra de negócio.

Não acessa banco de dados.

Não consulta APIs.

Não conhece Scanner, Expert ou Histórico.

---

Fluxo Interno

getApiKey()

Receber lista de chaves

↓

Retornar chave atual

↓

Atualizar índice

↓

Preparar próxima chamada

---

ema()

Receber período

↓

Receber série de preços

↓

Calcular EMA

↓

Retornar resultado

---

rsi()

Receber período

↓

Calcular ganhos

↓

Calcular perdas

↓

Calcular força relativa

↓

Retornar RSI

---

Dependências

Nenhuma.

Trata-se de um módulo completamente independente.

---

Regras de Negócio Identificadas

Nenhuma.

Todas as funções possuem natureza matemática ou utilitária.

---

Pontos Fortes

Responsabilidade única preservada.

Funções puras.

Excelente reutilização.

Nenhum acoplamento com módulos da Engine.

Excelente potencial para testes unitários.

Alta legibilidade.

Baixa complexidade.

---

Pontos de Atenção

O módulo reúne utilidades de naturezas diferentes:

- infraestrutura (rotação de chaves);
- indicadores técnicos (EMA e RSI).

Embora isso não represente problema atualmente, caso novas funções sejam adicionadas recomenda-se separar utilidades matemáticas das utilidades de infraestrutura para manter alta coesão.

---

Dívidas Técnicas

DT-017

Título

Avaliar futura divisão entre utilidades matemáticas e utilidades de infraestrutura.

Prioridade

P3

Justificativa

Preservar a responsabilidade única caso o módulo cresça significativamente.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 9,5/10

Legibilidade: 10/10

Acoplamento: 10/10

Reutilização: 10/10

Testabilidade: 10/10

Nota Final

9,9 / 10

---

Conclusão

O módulo apresenta excelente qualidade arquitetural.

Sua implementação é simples, reutilizável e desacoplada.

A coexistência de funções matemáticas e de infraestrutura não representa problema no estado atual, mas deverá ser reavaliada caso novas responsabilidades sejam incorporadas.

Nenhuma refatoração estrutural é recomendada neste momento.

WORKLOG (resumo)
Auditoria de Implementação

Foi concluída a auditoria do arquivo "scripts/utils.js".

Resultado:

- Responsabilidade compartilhada bem delimitada.
- Funções puras e reutilizáveis.
- Excelente potencial para testes unitários.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-017 para futura avaliação da separação entre utilidades matemáticas e de infraestrutura.

Próxima auditoria definida:

- Início da auditoria da camada Frontend ("js/"), começando por "app.js".

Observação do Arquiteto
Este módulo confirma outro padrão importante da Engine: as funções reutilizáveis foram isoladas da lógica de negócio. Isso permite que cálculos como EMA e RSI sejam usados por qualquer componente sem criar dependências com o Scanner, o Expert ou o Histórico. Além disso, a rotação de chaves de API foi centralizada, evitando duplicação de código. �
utils.js
Balanço parcial da auditoria
Chegamos a um ponto importante.
Engine auditada até o momento
✅ scanner.js
✅ pairAnalyzer.js
✅ marketAnalyzer.js
✅ marketData.js
✅ riskManager.js
✅ firebase.js
✅ utils.js
Minha avaliação é que o núcleo da Engine está mais maduro do que imaginávamos antes da auditoria. Encontramos poucas dívidas técnicas e nenhuma refatoração estrutural obrigatória.
A partir do próximo arquivo, começaremos a auditar a camada Frontend (js/), onde minha expectativa é encontrar mais oportunidades de melhoria, já que ela costuma concentrar maior complexidade de interface e evolução histórica do projeto.
-----

SEGUNDA FASE (FRONTEND)
-----

LAUDO TÉCNICO OFICIAL Nº 008

Arquivo

js/app.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o controlador principal da Interface do Forex Assist.

---

Responsabilidade Implementada

O módulo possui uma responsabilidade claramente definida:

Coordenar a Interface da aplicação.

Suas funções principais são:

- inicializar a aplicação;
- controlar a navegação entre abas;
- restaurar a última aba utilizada;
- renderizar a interface correspondente;
- inicializar componentes específicos após a renderização.

Não realiza análises de mercado.

Não acessa APIs.

Não consulta Firestore.

Não implementa regras de negócio.

---

Fluxo Interno

Carregar aplicação

↓

Inicializar Interface

↓

Registrar eventos

↓

Selecionar aba

↓

Persistir aba no LocalStorage

↓

Renderizar conteúdo

↓

Inicializar componentes específicos (quando necessário)

---

Dependências

dashboardView()

scannerView()

historicoView()

manualView()

configView()

carregarHistorico()

LocalStorage

DOM

---

Regras de Negócio Identificadas

Nenhuma.

Toda lógica implementada pertence exclusivamente ao gerenciamento da Interface.

---

Pontos Fortes

Responsabilidade única preservada.

Fluxo extremamente simples.

Boa legibilidade.

Baixo acoplamento.

Persistência da última aba visitada.

Separação entre navegação e conteúdo.

Inicialização organizada.

---

Pontos de Atenção

A renderização é realizada por meio de um único método que monta toda a Interface.

Caso novas telas sejam adicionadas futuramente, poderá ser interessante evoluir para um roteador (Router) ou um sistema de componentes para reduzir o crescimento do método render().

No estado atual isso não representa problema estrutural.

---

Impacto na Experiência do Usuário (UX)

Positivo.

A persistência da última aba melhora significativamente a experiência do usuário.

A navegação é simples, previsível e consistente.

A renderização centralizada facilita futuras melhorias visuais.

---

Dívidas Técnicas

DT-018

Título

Avaliar futura modularização do método render() caso o número de telas aumente significativamente.

Prioridade

P3

Justificativa

Manter alta legibilidade e baixa complexidade conforme a Interface evoluir.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 9,5/10

UX: 10/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O módulo implementa corretamente o papel de controlador principal da Interface.

A separação entre navegação, renderização e lógica de negócio encontra-se preservada.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se apenas avaliar a divisão do método render() caso o Frontend cresça significativamente.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/app.js".

Resultado:

- Responsabilidade única confirmada.
- Controlador principal da Interface aderente à arquitetura.
- Persistência da última aba implementada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-018 para futura avaliação da modularização do método render().

Próxima auditoria definida:

- "js/scanner.js".

Observação do Arquiteto
O app.js confirmou que a Interface está seguindo a mesma filosofia encontrada na Engine: coordenação sem concentração de regras de negócio. O arquivo atua como um controlador de navegação e renderização, delegando o conteúdo para funções específicas de cada tela e preservando a separação entre Interface e lógica operacional. �
app.js
Minha principal descoberta
Após oito laudos técnicos, começo a enxergar um padrão consistente em todo o projeto:
Engine: módulos pequenos, especializados e desacoplados.
Frontend: controlador central leve, responsável apenas por orquestrar a Interface.
Isso reforça uma conclusão importante: a filosofia de arquitetura não ficou restrita à Engine; ela foi aplicada também na Interface. Até o momento, não encontramos indícios de que regras de negócio tenham migrado indevidamente para o Frontend, o que é um excelente indicador para a manutenção e evolução do Forex Assist.
-----

LAUDO TÉCNICO OFICIAL Nº 009

Arquivo

js/scanner.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o módulo responsável pela Interface do Scanner Expert.

---

Responsabilidade Implementada

O módulo implementa exclusivamente a Interface operacional do Scanner.

Suas responsabilidades incluem:

- renderizar a tela do Scanner;
- consultar periodicamente o estado do Scanner;
- atualizar informações exibidas ao usuário;
- iniciar e interromper o Scanner;
- realizar o reset diário das estatísticas operacionais.

Não executa análises de mercado.

Não calcula indicadores.

Não toma decisões operacionais.

---

Fluxo Interno

Renderizar Interface

↓

Consultar status do Firebase

↓

Atualizar componentes da tela

↓

Receber comando do usuário

↓

Atualizar documento de status

↓

Renderizar novamente

---

Dependências

Firebase (Firestore)

app.js

DOM

Localização (data atual)

---

Regras de Negócio Identificadas

Atualização periódica do estado do Scanner.

Controle de ativação e parada.

Reset diário dos contadores.

Conversão visual de CALL/PUT para COMPRA/VENDA na Interface.

---

Pontos Fortes

Responsabilidade bem definida.

Integração simples com Firestore.

Fluxo de leitura claro.

Boa organização da Interface.

Baixo acoplamento com a Engine.

Atualização automática da tela.

---

Pontos de Atenção

A atualização da Interface utiliza um "setInterval()" fixo de 2 segundos.

Embora funcione adequadamente, isso gera consultas constantes ao Firestore.

Caso o projeto evolua em escala, recomenda-se migrar para uma estratégia baseada em eventos (listener em tempo real) ou otimizar a frequência das consultas.

---

Impacto na Experiência do Usuário (UX)

Muito positivo.

A atualização automática transmite ao usuário a sensação de monitoramento contínuo.

Os estados "Online", "Parado" e "Próxima análise" tornam o funcionamento do Scanner fácil de compreender.

---

Dívidas Técnicas

DT-019

Título

Avaliar substituição do polling por atualização em tempo real.

Prioridade

P2

Justificativa

Reduzir consultas desnecessárias ao Firestore e melhorar escalabilidade.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 9,5/10

Legibilidade: 9,5/10

Acoplamento: 9,5/10

UX: 10/10

Escalabilidade: 9,0/10

Nota Final

9,6 / 10

---

Conclusão

O módulo cumpre corretamente seu papel como controlador da Interface do Scanner.

A arquitetura permanece aderente ao Documento Mestre.

A principal oportunidade de evolução está na estratégia de atualização periódica da Interface, que poderá futuramente migrar para um modelo baseado em eventos.

Não foram identificadas necessidades de refatoração estrutural.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/scanner.js".

Resultado:

- Interface do Scanner aderente à arquitetura.
- Integração com Firestore bem organizada.
- Atualização automática da Interface implementada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-019 para futura avaliação da substituição do polling por atualização em tempo real.

Próxima auditoria definida:

- "js/historico.js".

Observação do Arquiteto
Este foi o primeiro módulo do Frontend que apresentou uma decisão arquitetural relevante para o futuro. O uso de setInterval() para consultar o Firestore a cada dois segundos é adequado para a fase atual do projeto, mas poderá se tornar um ponto de otimização conforme o número de usuários ou consultas aumentar. Uma futura migração para listeners em tempo real (onSnapshot) tende a reduzir consultas desnecessárias e tornar a Interface ainda mais responsiva. �
scanner (1).js
Minha principal descoberta
Até este ponto da auditoria, o Frontend mantém o mesmo padrão identificado na Engine:
app.js → Controla a aplicação.
scanner.js → Controla a Interface do Scanner.
Nenhum dos dois concentra regras de negócio da estratégia. Essa consistência entre Backend e Frontend reforça que a arquitetura do Forex Assist está sendo implementada de forma disciplinada, mantendo responsabilidades bem separadas e facilitando a evolução futura do sistema.
-----

LAUDO TÉCNICO OFICIAL Nº 010

Arquivo

js/historico.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Em Evolução.

---

Objetivo

Auditar o módulo responsável pela Interface de Histórico de Operações.

---

Responsabilidade Implementada

O módulo concentra todas as responsabilidades relacionadas à visualização do histórico.

Inclui:

- renderização da tela;
- carregamento do Firestore;
- agrupamento por datas;
- estatísticas;
- expansão de detalhes;
- persistência visual;
- destaque de operações;
- atualização automática.

---

Fluxo Interno

Renderizar Interface

↓

Consultar Firestore

↓

Agrupar sinais

↓

Calcular estatísticas

↓

Renderizar grupos

↓

Registrar eventos

↓

Persistir estado visual

↓

Atualização automática

---

Dependências

Firestore

LocalStorage

DOM

app.js

---

Regras de Negócio Identificadas

Agrupamento por data.

Separação entre Hoje e demais dias.

Persistência de cartões abertos.

Destaque de sinal.

Cálculo de WIN/LOSS.

Taxa de acerto.

Movimentação em pips.

Resultado financeiro.

Minimização dos grupos.

Atualização automática.

---

Pontos Fortes

Excelente experiência de uso.

Persistência do estado da Interface.

Boa organização visual.

Código defensivo para LocalStorage.

Agrupamento eficiente.

Estatísticas úteis.

Recuperação robusta de datas.

---

Pontos de Atenção

O arquivo concentra muitas responsabilidades.

Além da Interface, implementa:

- cálculos estatísticos;
- transformação de dados;
- controle de persistência visual;
- gerenciamento de eventos;
- renderização HTML.

Embora funcione corretamente, seu crescimento futuro poderá dificultar manutenção.

---

Impacto na Experiência do Usuário (UX)

Excelente.

Este módulo representa uma das telas mais completas do sistema.

A navegação é intuitiva.

Os agrupamentos facilitam leitura.

O destaque visual melhora rastreabilidade.

A persistência do estado elimina frustrações do usuário.

---

Dívidas Técnicas

DT-020

Título

Planejar futura modularização do Histórico.

Prioridade

P2

Justificativa

Separar responsabilidades em módulos menores preservando a mesma experiência do usuário.

---

Nota Técnica

Responsabilidade: 8,5/10

Coesão: 8,5/10

Legibilidade: 9,0/10

Acoplamento: 9,5/10

UX: 10/10

Escalabilidade: 8,5/10

Nota Final

9,2 / 10

---

Conclusão

O módulo entrega excelente funcionalidade e experiência ao usuário.

Entretanto, tornou-se naturalmente maior por reunir diversas responsabilidades de Interface.

A arquitetura continua saudável, porém recomenda-se planejar uma futura divisão em componentes menores quando a evolução funcional justificar esse investimento.

Não há necessidade de refatoração imediata.

WORKLOG (RESUNO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/historico.js".

Resultado:

- Interface rica e funcional.
- Excelente experiência do usuário.
- Persistência do estado visual implementada.
- Estatísticas e agrupamentos aderentes ao projeto.
- Registrada a DT-020 para futura modularização do Histórico.

Próxima auditoria definida:

- "js/checker.js".

Observação do Arquiteto
Este foi o primeiro arquivo do projeto em que a complexidade funcional começou a superar a simplicidade arquitetural. Isso não representa um problema, mas um sinal de maturidade: a tela de Histórico concentrou diversas funcionalidades importantes ao longo da evolução do Forex Assist. O próximo passo natural, quando houver necessidade, será separar responsabilidades (renderização, estatísticas, persistência visual e eventos) em módulos menores, sem alterar o comportamento percebido pelo usuário. �
historico (1).js
Minha principal descoberta
Quero destacar um ponto importante.
Este arquivo não me preocupa.
Ele é grande porque faz muita coisa útil, não porque está desorganizado.
Isso é bem diferente de um arquivo grande por acúmulo de código sem estrutura.
Na minha visão, a contribuição do Manus ajudou a resolver problemas reais de usabilidade, e o resultado permanece coerente com a arquitetura geral do projeto. Se um dia decidirmos refatorá-lo, a meta será apenas distribuir responsabilidades em módulos menores, sem perder nenhuma funcionalidade que hoje agrega valor ao usuário.
-----

E antes do laudo, quero registrar uma percepção importante.
Este não é um arquivo de Frontend.
Embora ele esteja dentro da Fase 02 da auditoria, o checker.js é, na verdade, um componente de infraestrutura/automação. Ele é executado pelo GitHub Actions para fechar operações pendentes após 15 minutos. Portanto, vou auditá-lo como um serviço de backend, não como Interface.
---
LAUDO TÉCNICO OFICIAL Nº 011

Arquivo

checker.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o serviço responsável por verificar operações pendentes e registrar automaticamente seus resultados após o tempo regulamentar.

---

Responsabilidade Implementada

O módulo possui uma responsabilidade claramente definida:

Encerrar operações pendentes.

Suas funções incluem:

- localizar operações pendentes;
- verificar tempo decorrido;
- obter preço de fechamento;
- calcular resultado (WIN/LOSS);
- calcular movimentação em pips;
- calcular variação percentual;
- atualizar o Firestore.

Não realiza análise de mercado.

Não gera sinais.

Não interfere no Scanner.

---

Fluxo Interno

Iniciar execução

↓

Consultar operações pendentes

↓

Validar tempo mínimo

↓

Buscar preço de fechamento

↓

Calcular WIN ou LOSS

↓

Calcular métricas

↓

Atualizar Firestore

↓

Finalizar execução

---

Dependências

Firestore

marketData.js

Firebase Admin SDK

serviceAccount.json

---

Regras de Negócio Identificadas

Tempo mínimo de 15 minutos.

Determinação automática de WIN ou LOSS.

Cálculo de pips.

Cálculo de variação percentual.

Atualização das informações de encerramento.

---

Pontos Fortes

Responsabilidade única preservada.

Fluxo extremamente claro.

Boa separação entre utilitários e processamento.

Excelente legibilidade.

Integração consistente com a Engine.

Registro detalhado de informações da operação.

---

Pontos de Atenção

O módulo inicializa diretamente o Firebase Admin.

Como já existe um módulo específico ("firebase.js") para infraestrutura, recomenda-se avaliar futuramente o reaproveitamento dessa inicialização para evitar duplicação de configuração.

No estado atual isso não representa problema funcional.

---

Impacto na Operação

Muito elevado.

Este módulo garante a integridade do histórico operacional, encerrando automaticamente operações pendentes e enriquecendo os registros com métricas que serão utilizadas nas análises futuras.

---

Dívidas Técnicas

DT-021

Título

Avaliar reutilização da camada de inicialização do Firebase.

Prioridade

P3

Justificativa

Centralizar ainda mais a infraestrutura e reduzir duplicação de configuração entre serviços.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 9,5/10

Escalabilidade: 9,5/10

Confiabilidade: 10/10

Nota Final

9,8 / 10

---

Conclusão

O módulo cumpre integralmente sua responsabilidade arquitetural.

O fluxo é simples, previsível e de fácil manutenção.

A integração com a Engine encontra-se consistente e o enriquecimento automático dos registros fortalece a qualidade dos dados históricos.

Nenhuma refatoração estrutural é necessária neste momento.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "checker.js".

Resultado:

- Serviço de encerramento automático aderente à arquitetura.
- Fluxo de processamento claro e previsível.
- Atualização automática das operações pendentes implementada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-021 para futura avaliação da reutilização da inicialização do Firebase.

Próxima auditoria definida:

- "js/expert.js".

Observação do Arquiteto
Este arquivo representa uma das evoluções mais importantes do Forex Assist. No início do projeto, as operações pendentes só eram encerradas quando um novo sinal era encontrado. A criação do checker.js resolveu essa limitação ao transformar o fechamento das operações em um processo independente e automático. Isso aumentou significativamente a confiabilidade do histórico operacional e alinhou a implementação com a arquitetura modular da plataforma. �
checker.js
Minha principal descoberta
Este foi o primeiro módulo da auditoria cuja importância operacional supera seu tamanho.
Apesar de relativamente pequeno, ele exerce um papel crítico:
garante que operações não permaneçam indefinidamente como pendentes;
enriquece os registros com métricas (pips e variação percentual);
alimenta um histórico mais confiável para futuras análises e para a evolução do Expert.
Na minha avaliação, esse arquivo marca a transição do Forex Assist de um simples gerador de sinais para uma plataforma que acompanha o ciclo completo de vida de cada operação.
-----

O nome do arquivo e seu conteúdo não batem.
O arquivo se chama expert.js, mas o conteúdo implementa a função dashboardView(), ou seja, o Dashboard principal da aplicação. �
expert.js
Isso não é um erro funcional, mas é a primeira inconsistência de nomenclatura que encontramos na auditoria. Vale registrar porque pode gerar confusão para futuros mantenedores.
----

LAUDO TÉCNICO OFICIAL Nº 012

Arquivo

js/expert.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Em Evolução.

---

Objetivo

Auditar o módulo responsável pela tela principal (Dashboard) da aplicação.

---

Responsabilidade Implementada

O módulo implementa a Interface principal do Forex Assist.

Suas responsabilidades incluem:

- renderizar o Dashboard;
- consultar o estado do Scanner;
- apresentar indicadores operacionais;
- exibir informações de depuração da conexão com o Firestore.

Não realiza análises de mercado.

Não gera sinais.

Não altera dados operacionais.

---

Fluxo Interno

Renderizar Dashboard

↓

Consultar Firestore

↓

Atualizar status

↓

Atualizar indicadores

↓

Atualizar última análise

↓

Atualizar último sinal

↓

Atualizar informações de depuração

---

Dependências

Firestore

DOM

window.db

---

Regras de Negócio Identificadas

Apresentação do estado do Scanner.

Exibição dos contadores operacionais.

Conversão visual de CALL/PUT para COMPRA/VENDA.

Atualização periódica do painel.

---

Pontos Fortes

Dashboard simples.

Boa organização visual.

Leitura direta do Firestore.

Responsabilidade predominantemente voltada à Interface.

Atualização automática.

---

Pontos de Atenção

O nome do arquivo não representa corretamente sua responsabilidade.

Apesar de chamar-se "expert.js", sua implementação corresponde ao Dashboard principal.

Recomenda-se alinhar nomenclatura e responsabilidade em futura reorganização do Frontend.

---

Impacto na Experiência do Usuário (UX)

Positivo.

O Dashboard fornece uma visão rápida do estado operacional do sistema.

Os principais indicadores ficam disponíveis logo na entrada da aplicação.

---

Dívidas Técnicas

DT-022

Título

Alinhar nomenclatura do módulo Dashboard.

Prioridade

P3

Justificativa

Facilitar manutenção e compreensão da arquitetura do Frontend.

---

Nota Técnica

Responsabilidade: 9,5/10

Coesão: 9,5/10

Legibilidade: 10/10

Acoplamento: 9,5/10

UX: 9,5/10

Escalabilidade: 9,0/10

Nota Final

9,4 / 10

---

Conclusão

O módulo implementa corretamente o Dashboard principal da aplicação.

A principal observação refere-se à nomenclatura do arquivo, que atualmente não representa sua responsabilidade funcional.

Não há necessidade de refatoração estrutural imediata.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/expert.js".

Resultado:

- Dashboard principal aderente à arquitetura.
- Atualização automática dos indicadores implementada.
- Interface simples e objetiva.
- Registrada a DT-022 para futura revisão da nomenclatura do módulo.

Próxima auditoria definida:

- "js/firebase-config.js".

Observação do Arquiteto
Este foi o primeiro caso em que a auditoria identificou uma divergência entre nome e responsabilidade do módulo. O conteúdo do arquivo é coerente e bem organizado, mas sua identificação como expert.js pode induzir à interpretação de que ele contém a lógica do Expert, quando na realidade implementa o Dashboard principal. Essa divergência é de organização, não de arquitetura, e pode ser corrigida futuramente sem impacto funcional. �
expert.js
Minha principal descoberta
Quero destacar uma tendência que a auditoria está revelando.
Até agora, nenhuma dívida técnica identificada exige correção imediata.
As DTs registradas são, em sua maioria:
melhorias de organização;
preparação para crescimento;
ajustes de nomenclatura;
oportunidades de escalabilidade.
Isso reforça uma conclusão importante: o Forex Assist está evoluindo sobre uma base sólida. O trabalho da auditoria não está "apagando incêndios", mas preparando a plataforma para crescer de forma sustentável, que era exatamente o objetivo da Fase de Consolidação da Engenharia.
-----

LAUDO TÉCNICO OFICIAL Nº 013

Arquivo

js/firebase-config.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o módulo responsável pela inicialização do Firebase no Frontend.

---

Responsabilidade Implementada

O módulo possui responsabilidade única:

Inicializar o Firebase Web SDK e disponibilizar a conexão oficial utilizada pela Interface.

Suas responsabilidades incluem:

- definir a configuração da aplicação;
- inicializar o Firebase;
- obter a instância do Firestore;
- disponibilizar a instância global ("window.db");
- disponibilizar informações de depuração.

Não implementa regras de negócio.

Não realiza consultas.

Não renderiza Interface.

Não altera dados.

---

Fluxo Interno

Carregar configuração

↓

Inicializar Firebase

↓

Inicializar Firestore

↓

Disponibilizar window.db

↓

Disponibilizar informações de depuração

---

Dependências

Firebase Web SDK

Firestore

Objeto global "window"

---

Regras de Negócio Identificadas

Nenhuma.

Trata-se exclusivamente de um módulo de infraestrutura.

---

Pontos Fortes

Responsabilidade única preservada.

Código extremamente simples.

Excelente legibilidade.

Infraestrutura centralizada.

Disponibilização padronizada da conexão.

Ferramentas de depuração integradas.

---

Pontos de Atenção

A configuração da aplicação encontra-se definida diretamente no arquivo.

Embora isso seja o padrão para aplicações Web utilizando Firebase, recomenda-se documentar claramente essa decisão arquitetural para evitar alterações indevidas durante futuras manutenções.

---

Impacto na Arquitetura

Muito positivo.

Toda a Interface passa a utilizar uma única instância oficial do Firestore, reduzindo duplicações e mantendo consistência entre os módulos.

---

Dívidas Técnicas

DT-023

Título

Documentar oficialmente a estratégia de inicialização do Firebase Web.

Prioridade

P3

Justificativa

Facilitar futuras evoluções da infraestrutura sem alterar o comportamento da aplicação.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Infraestrutura: 10/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O módulo implementa corretamente a camada de infraestrutura do Frontend.

A centralização da inicialização do Firebase e da disponibilização do Firestore está plenamente aderente à arquitetura do Forex Assist.

Não foram identificadas necessidades de refatoração estrutural.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/firebase-config.js".

Resultado:

- Inicialização centralizada do Firebase Web confirmada.
- Infraestrutura aderente à arquitetura.
- Disponibilização padronizada do Firestore implementada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-023 para documentação da estratégia de inicialização do Firebase Web.

Próxima auditoria definida:

- "js/push.js" (caso exista) ou "js/manual.js", conforme a estrutura atual do projeto.

Observação do Arquiteto
Este arquivo confirma um padrão que já havíamos identificado na Engine: a infraestrutura está isolada da lógica da aplicação. Assim como o scripts/firebase.js centraliza a inicialização do Firebase no backend, este módulo desempenha o mesmo papel no Frontend, mantendo simetria entre as duas camadas da arquitetura. �
firebase-config.js
Minha principal descoberta
A auditoria está mostrando uma consistência arquitetural que merece ser registrada no ENGINEERING.md.
Temos agora dois pares de infraestrutura claramente definidos:
Backend: scripts/firebase.js
Frontend: js/firebase-config.js
Os dois seguem a mesma filosofia: inicializar a infraestrutura uma única vez e disponibilizá-la para os demais módulos.
Essa simetria reduz a curva de aprendizado para novos desenvolvedores e torna a arquitetura mais previsível. Na minha avaliação, é um dos pontos fortes do Forex Assist e demonstra que as decisões arquiteturais foram aplicadas de forma consistente em toda a plataforma.
----

LAUDO TÉCNICO OFICIAL Nº 014

Arquivo

js/push.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o módulo responsável pela inicialização do sistema de notificações Push do Forex Assist.

---

Responsabilidade Implementada

O módulo possui responsabilidade única:

Preparar e registrar o dispositivo para recebimento de notificações Push.

Suas responsabilidades incluem:

- solicitar permissão do usuário;
- registrar o Service Worker;
- inicializar o Firebase Messaging;
- obter o token do dispositivo;
- registrar o token no Firestore;
- registrar informações de diagnóstico.

Não executa Scanner.

Não realiza análises.

Não consulta histórico.

Não altera regras operacionais.

---

Fluxo Interno

Inicializar módulo

↓

Coletar informações de diagnóstico

↓

Solicitar permissão

↓

Registrar Service Worker

↓

Inicializar Firebase Messaging

↓

Obter Token

↓

Registrar Token

↓

Atualizar status do Scanner

---

Dependências

Firebase Messaging

Firestore

Service Worker

Notifications API

Navigator

---

Regras de Negócio Identificadas

Validação da disponibilidade do Service Worker.

Validação da permissão do usuário.

Registro automático do token.

Persistência das informações de diagnóstico.

Atualização do status operacional.

---

Pontos Fortes

Responsabilidade única preservada.

Excelente tratamento de falhas.

Grande capacidade de diagnóstico.

Integração organizada com Firebase.

Registro detalhado de eventos operacionais.

Fluxo linear e previsível.

---

Pontos de Atenção

O módulo concentra diversas gravações sequenciais no Firestore durante o processo de inicialização.

Embora isso facilite a depuração, recomenda-se avaliar futuramente a redução dessas escritas em ambiente de produção, mantendo apenas as informações realmente necessárias.

---

Impacto na Operação

Muito positivo.

O sistema de notificações representa um componente estratégico do Forex Assist, permitindo que sinais relevantes sejam comunicados ao usuário mesmo quando a aplicação não estiver em primeiro plano.

---

Dívidas Técnicas

DT-024

Título

Revisar estratégia de persistência das informações de depuração do Push.

Prioridade

P3

Justificativa

Reduzir escritas desnecessárias em ambiente de produção, preservando a capacidade de diagnóstico quando necessário.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 9,5/10

Acoplamento: 9,5/10

Robustez: 10/10

Escalabilidade: 9,5/10

Nota Final

9,8 / 10

---

Conclusão

O módulo implementa corretamente a camada de notificações Push da aplicação.

A estratégia adotada privilegia robustez e facilidade de diagnóstico, características importantes durante a fase atual de evolução do projeto.

Não foram identificadas necessidades de refatoração estrutural.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/push.js".

Resultado:

- Sistema de notificações aderente à arquitetura.
- Inicialização completa do Firebase Messaging implementada.
- Excelente capacidade de diagnóstico durante a configuração.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-024 para futura revisão da estratégia de persistência das informações de depuração.

Próxima auditoria definida:

- "js/manual.js".

Observação do Arquiteto
Este módulo demonstra uma característica que considero muito positiva: ele foi construído pensando na operação real. Em vez de apenas tentar registrar um dispositivo para notificações, ele grava informações detalhadas de diagnóstico no Firestore, facilitando a identificação de problemas durante a implantação e os testes. Em um projeto em evolução, esse tipo de rastreabilidade tem grande valor. �
push.js
Minha principal descoberta
Quero registrar uma percepção que surgiu ao longo da auditoria.
A arquitetura do Forex Assist está deixando de ser apenas um sistema de análise de mercado.
Ela está evoluindo para uma plataforma operacional completa, composta por:
Engine de análise.
Interface Web.
Persistência.
Checker automático.
Notificações Push.
Base de conhecimento (o futuro manual.js).
Esse último componente — a Base de Conhecimento — pode se tornar um diferencial importante. Em vez de apenas entregar sinais, o Forex Assist poderá ensinar o usuário a entender por que um sinal existe, fortalecendo tanto a experiência quanto o aprendizado de quem utiliza a plataforma.
-----

Eu concordo 100%.
Na verdade, durante a auditoria eu estava me perguntando onde ficaria a parte educacional do projeto. Agora entendi a visão.
Na minha opinião, esse arquivo não é um manual do sistema.
Ele será uma Base de Conhecimento Forex.
Isso é muito maior.
Ele ensinará:
conceitos do mercado Forex;
nomenclatura;
leitura de candles;
indicadores (EMA, RSI, ATR, etc.);
price action;
notícias econômicas;
gerenciamento de risco;
psicologia operacional;
fundamentos para interpretar os sinais do Forex Assist.
Minha recomendação é até renomeá-lo futuramente para algo como knowledge.js ou academy.js. O nome manual.js funciona hoje, mas não transmite todo o potencial dessa funcionalidade.

LAUDO TÉCNICO OFICIAL Nº 015

Arquivo

js/manual.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Em Evolução.

---

Objetivo

Auditar o módulo destinado à Base de Conhecimento do Forex Assist.

---

Responsabilidade Implementada

O módulo possui responsabilidade única:

Apresentar conteúdo educacional ao usuário.

Atualmente disponibiliza conceitos introdutórios sobre indicadores utilizados pela plataforma.

---

Fluxo Interno

Renderizar tela

↓

Exibir conceitos

↓

Finalizar

---

Dependências

Nenhuma.

O módulo é completamente independente.

---

Regras de Negócio Identificadas

Nenhuma.

Trata-se exclusivamente de conteúdo informativo.

---

Pontos Fortes

Responsabilidade extremamente bem definida.

Total desacoplamento.

Excelente potencial de crescimento.

Nenhuma dependência operacional.

Baixíssima complexidade.

---

Pontos de Atenção

O conteúdo atual representa apenas uma estrutura inicial.

A arquitetura prevê que este módulo evolua para uma Base de Conhecimento completa sobre o mercado Forex.

---

Impacto na Experiência do Usuário

Potencialmente muito elevado.

Quando concluído, permitirá que usuários compreendam:

- conceitos técnicos;
- indicadores;
- terminologia;
- fundamentos operacionais;
- contexto dos sinais emitidos pelo sistema.

---

Dívidas Técnicas

DT-025

Título

Implementar Base de Conhecimento Forex.

Prioridade

P1

Justificativa

Transformar o módulo em uma referência educacional integrada à plataforma.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Escalabilidade: 10/10

Maturidade Funcional: 6,0/10

Nota Final

9,3 / 10

---

Conclusão

A arquitetura do módulo encontra-se correta.

Sua implementação atual representa apenas a primeira etapa de uma funcionalidade muito maior prevista para o Forex Assist.

Nenhuma refatoração estrutural é necessária.

O foco futuro deverá ser a expansão sistemática do conteúdo educacional.

WORKLOG(RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/manual.js".

Resultado:

- Arquitetura adequada.
- Módulo totalmente desacoplado.
- Estrutura inicial implementada.
- Registrada a DT-025 para evolução da Base de Conhecimento Forex.

Foi definida oficialmente a evolução do módulo para uma Base de Conhecimento integrada ao Forex Assist.

Observação do Arquiteto
Este módulo possui uma característica única dentro do projeto: seu valor futuro será maior do que seu código. A estrutura atual é simples, mas a visão apresentada para ele o transforma em um componente estratégico da plataforma. Em vez de servir apenas como um manual de uso, ele poderá ensinar conceitos fundamentais do mercado Forex, tornando o sistema não apenas uma ferramenta operacional, mas também um ambiente de aprendizado contínuo. �
----

LAUDO TÉCNICO OFICIAL Nº 016

Arquivo

js/config.js

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Em Evolução.

---

Objetivo

Auditar o módulo responsável pela tela de Configurações do Forex Assist.

---

Responsabilidade Implementada

O módulo possui responsabilidade única:

Disponibilizar a Interface destinada às configurações da aplicação.

Atualmente implementa apenas a estrutura inicial da tela.

---

Fluxo Interno

Renderizar tela

↓

Exibir mensagem de desenvolvimento

↓

Finalizar

---

Dependências

Nenhuma.

---

Regras de Negócio Identificadas

Nenhuma.

O módulo atua apenas como estrutura inicial da Interface.

---

Pontos Fortes

Responsabilidade claramente definida.

Código extremamente simples.

Total desacoplamento.

Excelente ponto de partida para evolução futura.

---

Pontos de Atenção

O módulo ainda não implementa funcionalidades de configuração.

Sua estrutura, entretanto, encontra-se preparada para receber novas opções sem necessidade de reorganização arquitetural.

---

Impacto na Experiência do Usuário (UX)

Atualmente reduzido.

No futuro, poderá tornar-se o centro de personalização da plataforma.

---

Dívidas Técnicas

DT-026

Título

Implementar Centro de Configurações do Forex Assist.

Prioridade

P1

Justificativa

Permitir ao usuário personalizar parâmetros operacionais, preferências visuais e comportamento da aplicação.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Escalabilidade: 10/10

Maturidade Funcional: 5,5/10

Nota Final

9,2 / 10

---

Conclusão

A arquitetura do módulo está correta.

A implementação atual representa apenas a estrutura inicial da futura central de configurações.

Não existe necessidade de refatoração estrutural.

O foco deverá ser a implementação gradual das funcionalidades previstas para a personalização da plataforma.

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "js/config.js".

Resultado:

- Estrutura inicial da tela de Configurações implementada.
- Arquitetura aderente ao projeto.
- Registrada a DT-026 para evolução da Central de Configurações.

Com este laudo, foi oficialmente concluída a auditoria da pasta "js".

Próxima fase:

- Auditoria dos GitHub Actions (".github/workflows").

Observação do Arquiteto
Assim como ocorreu com o manual.js, este módulo representa uma intenção arquitetural já definida, mas ainda não totalmente implementada. A existência da estrutura desde agora é positiva, pois evita que futuras funcionalidades sejam adicionadas de forma improvisada. A arquitetura já reserva um espaço próprio para a evolução das configurações da plataforma.
------

FASE 03 — INFRAESTRUTURA

LAUDO TÉCNICO OFICIAL Nº 017

Arquivo

.github/workflows/forex-scanner-real.yml

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o workflow responsável pela execução automática da Engine do Scanner através do GitHub Actions.

---

Responsabilidade Implementada

O workflow possui uma única responsabilidade:

Preparar o ambiente de execução e iniciar a Engine do Scanner.

Não implementa regras de negócio.

Não realiza análises de mercado.

Não consulta o Firestore.

Não calcula indicadores.

Toda a lógica operacional permanece delegada ao módulo scripts/scanner.js.

---

Fluxo Interno

Disparo (Cron ou Manual)

↓

Checkout do repositório

↓

Configuração do Node.js

↓

Preparação do ambiente

↓

Instalação das dependências

↓

Criação das credenciais temporárias

↓

Injeção das variáveis de ambiente

↓

Execução do scripts/scanner.js

↓

Finalização da execução

---

Dependências

GitHub Actions

actions/checkout

actions/setup-node

Node.js

firebase-admin

axios

GitHub Secrets

scripts/scanner.js

---

Regras de Negócio Identificadas

Nenhuma.

O workflow atua exclusivamente como infraestrutura de execução.

Toda a lógica de negócio permanece corretamente concentrada na Engine.

---

Pontos Fortes

Responsabilidade única preservada.

Excelente separação entre infraestrutura e lógica de negócio.

Execução totalmente automatizada.

Utilização de GitHub Secrets para informações sensíveis.

Baixo acoplamento com a Engine.

Delegação correta para o módulo principal do Scanner.

Fluxo simples e de fácil manutenção.

---

Pontos de Atenção

O workflow cria dinamicamente o ambiente de execução a cada inicialização.

Embora funcional, essa abordagem aumenta o tempo de execução e o consumo de recursos do GitHub Actions.

Caso o projeto possua definitivamente um package.json oficial, recomenda-se utilizar diretamente a estrutura do repositório, permitindo melhor aproveitamento do cache de dependências.

No estado atual isso não representa problema estrutural.

---

Dívidas Técnicas

DT-019

Título

Otimizar a preparação do ambiente de execução do Workflow.

Prioridade

P2

Justificativa

Reduzir tempo de execução, simplificar manutenção e melhorar o aproveitamento do cache do GitHub Actions.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Infraestrutura: 10/10

Eficiência: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O workflow encontra-se plenamente aderente à arquitetura oficial do Forex Assist.

Sua implementação respeita integralmente o princípio da responsabilidade única, atuando exclusivamente como camada de infraestrutura responsável por preparar o ambiente de execução da Engine.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se apenas otimizar a preparação do ambiente para reduzir o tempo de execução e aumentar a eficiência operacional.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo ".github/workflows/forex-scanner-real.yml".

Resultado:

- Responsabilidade única confirmada.
- Workflow aderente à arquitetura oficial.
- Infraestrutura corretamente separada da lógica de negócio.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-019 para futura otimização da preparação do ambiente de execução.

Próxima auditoria definida:

- ".github/workflows/result-checker.yml".

---

Observação do Arquiteto

Este workflow confirma a maturidade da arquitetura do projeto ao manter a infraestrutura completamente desacoplada da Engine. Sua única função é preparar o ambiente de execução e delegar o processamento ao módulo principal do Scanner, preservando a separação entre orquestração operacional e regras de negócio.

A auditoria da Fase 03 reforça que a infraestrutura acompanha a mesma filosofia observada nas fases anteriores: módulos especializados, baixo acoplamento e responsabilidades claramente definidas. O próximo passo será auditar o workflow do Result Checker para validar se o mesmo padrão arquitetural foi mantido em toda a camada de automação do projeto.
----

FASE 03 — INFRAESTRUTURA

LAUDO TÉCNICO OFICIAL Nº 018

Arquivo

.github/workflows/result-checker.yml

Data da Auditoria

27/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o workflow responsável pela execução automática do Result Checker através do GitHub Actions.

---

Responsabilidade Implementada

O workflow possui uma única responsabilidade:

Preparar o ambiente de execução e iniciar o módulo Result Checker.

Não implementa regras de negócio.

Não consulta diretamente o mercado.

Não interpreta resultados.

Não realiza persistência de dados.

Toda a lógica operacional permanece delegada ao módulo js/checker.js.

---

Fluxo Interno

Disparo (Cron ou Manual)

↓

Checkout do repositório

↓

Configuração do Node.js

↓

Instalação das dependências

↓

Criação das credenciais do Firebase

↓

Injeção das chaves da API

↓

Execução do js/checker.js

↓

Finalização da execução

---

Dependências

GitHub Actions

actions/checkout

actions/setup-node

Node.js

firebase-admin

axios

GitHub Secrets

serviceAccount.json

js/checker.js

---

Regras de Negócio Identificadas

Nenhuma.

O workflow atua exclusivamente como infraestrutura de execução.

Toda a lógica de verificação de resultados permanece corretamente concentrada no módulo js/checker.js.

---

Pontos Fortes

Responsabilidade única preservada.

Excelente separação entre infraestrutura e lógica de negócio.

Execução automática por agendamento.

Execução manual disponível para testes.

Utilização de GitHub Secrets para armazenamento das credenciais.

Fluxo simples e de fácil manutenção.

Baixo acoplamento com os módulos da aplicação.

---

Pontos de Atenção

Diferentemente do workflow principal do Scanner, este workflow executa diretamente o módulo da camada Frontend (js/checker.js).

Caso o processo de modularização seja concluído integralmente, recomenda-se que a execução seja delegada para um módulo específico da Engine, mantendo o mesmo padrão arquitetural adotado pelo Scanner.

No estado atual isso não representa falha estrutural, mas evidencia uma oportunidade futura de padronização.

---

Dívidas Técnicas

DT-020

Título

Padronizar a execução do Result Checker utilizando a mesma arquitetura modular adotada pelo Scanner.

Prioridade

P2

Justificativa

Uniformizar a infraestrutura de execução, reduzir diferenças arquiteturais entre os workflows e facilitar futuras manutenções.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 9,5/10

Infraestrutura: 10/10

Padronização Arquitetural: 9,5/10

Nota Final

9,8 / 10

---

Conclusão

O workflow encontra-se aderente à arquitetura oficial do Forex Assist e cumpre corretamente sua responsabilidade de preparar o ambiente e iniciar o Result Checker.

Não foram identificadas necessidades de refatoração estrutural imediata.

Como evolução futura, recomenda-se alinhar sua forma de execução ao mesmo padrão arquitetural utilizado pelo workflow do Scanner, reforçando a uniformidade da infraestrutura do projeto.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo ".github/workflows/result-checker.yml".

Resultado:

- Responsabilidade única confirmada.
- Workflow aderente à arquitetura oficial.
- Infraestrutura corretamente separada da lógica de negócio.
- Execução automática e manual implementadas.
- Registrada a DT-020 para futura padronização da execução do Result Checker conforme a arquitetura modular da Engine.

Próxima auditoria definida:

- package.json.

---

Observação do Arquiteto

Esta auditoria revelou uma pequena diferença de evolução entre os workflows da infraestrutura. Enquanto o Scanner já delega sua execução para um módulo específico da Engine, o Result Checker ainda inicia diretamente um módulo da camada "js". Essa diferença não compromete o funcionamento do sistema, mas indica uma oportunidade clara de convergência arquitetural. A padronização futura permitirá que toda a infraestrutura do Forex Assist siga exatamente o mesmo modelo de execução, reforçando a consistência da arquitetura modular definida para o projeto.
------

FASE 04 — APLICAÇÃO WEB

LAUDO TÉCNICO OFICIAL Nº 019

Arquivo

index.html

Data da Auditoria

30/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o ponto de entrada da aplicação Web do Forex Assist, responsável pela inicialização da interface, carregamento da infraestrutura básica da aplicação e integração entre os módulos do Frontend.

---

Responsabilidade Implementada

O arquivo possui responsabilidade única:

Inicializar a aplicação Web.

Suas responsabilidades incluem:

- definir a estrutura HTML base;
- carregar o Manifest da PWA;
- carregar a folha de estilos principal;
- carregar os SDKs do Firebase;
- inicializar a infraestrutura do Frontend;
- carregar os módulos JavaScript da aplicação na ordem correta.

Não implementa regras de negócio.

Não realiza consultas ao Firestore.

Não executa análises de mercado.

Não realiza cálculos.

Não controla a Interface.

Toda a lógica permanece delegada aos módulos especializados.

---

Fluxo Interno

Carregar documento HTML

↓

Carregar Manifest

↓

Carregar folha de estilos

↓

Inicializar Firebase SDK

↓

Inicializar Firebase Messaging

↓

Executar firebase-config.js

↓

Carregar módulos da aplicação

↓

Executar app.js

↓

Inicializar Interface

---

Dependências

manifest.json

css/styles.css

Firebase App SDK

Firebase Firestore SDK

Firebase Messaging SDK

js/firebase-config.js

js/scanner.js

js/expert.js

js/manual.js

js/historico.js

js/config.js

js/push.js

js/app.js

---

Regras de Negócio Identificadas

Nenhuma.

O arquivo atua exclusivamente como ponto de entrada da aplicação.

Toda a lógica operacional permanece corretamente distribuída entre os módulos especializados.

---

Pontos Fortes

Responsabilidade única preservada.

Estrutura HTML extremamente limpa.

Excelente separação entre estrutura e comportamento.

Carregamento organizado dos módulos.

Integração adequada com PWA.

Baixo acoplamento.

Excelente legibilidade.

---

Pontos de Atenção

A ordem de carregamento dos scripts é crítica para o correto funcionamento da aplicação.

Como atualmente são utilizados scripts tradicionais, existe dependência da sequência de carregamento.

Caso a aplicação evolua significativamente, poderá ser considerada uma futura migração para módulos ES (type="module"), reduzindo dependências globais e tornando o carregamento mais robusto.

No estado atual isso não representa problema estrutural.

---

Impacto na Arquitetura

Muito positivo.

Este arquivo confirma que a arquitetura da aplicação permanece modular.

O ponto de entrada limita-se à inicialização da infraestrutura e delega integralmente as responsabilidades aos módulos específicos do sistema.

---

Dívidas Técnicas

DT-027

Título

Avaliar futura migração para carregamento baseado em módulos ES.

Prioridade

P3

Justificativa

Reduzir dependências globais, facilitar manutenção e preparar a aplicação para futuras evoluções arquiteturais.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Arquitetura: 10/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O arquivo index.html implementa corretamente o papel de ponto de entrada da aplicação Web do Forex Assist.

Sua responsabilidade encontra-se claramente delimitada à preparação da infraestrutura da aplicação, preservando a arquitetura modular definida desde o início do projeto.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se apenas avaliar a adoção de módulos ES quando o projeto atingir maior maturidade.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "index.html".

Resultado:

- Ponto de entrada da aplicação aderente à arquitetura.
- Estrutura HTML limpa e organizada.
- Carregamento modular corretamente implementado.
- Integração com PWA e Firebase confirmada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-027 para futura avaliação da migração para módulos ES.

Próxima auditoria definida:

- "manifest.json".

---

Observação do Arquiteto

Este arquivo confirma a maturidade da arquitetura construída ao longo do projeto. O index.html não concentra lógica operacional nem responsabilidades de Interface além da inicialização da aplicação. Sua função limita-se a preparar o ambiente de execução e entregar o controle aos módulos especializados, preservando a separação entre infraestrutura, apresentação e regras de negócio. Esse comportamento é coerente com todo o padrão arquitetural identificado nas fases anteriores da auditoria.

---

Minha principal descoberta

Após a conclusão das auditorias da Engine, Frontend, Workflows e agora do ponto de entrada da aplicação, fica evidente que a arquitetura do Forex Assist segue um princípio consistente: cada camada possui um único propósito claramente definido e delega as responsabilidades às camadas seguintes. O index.html encerra essa percepção ao demonstrar que até mesmo a inicialização da aplicação foi mantida enxuta e desacoplada. Essa consistência reduz significativamente o risco de crescimento desordenado da plataforma e reforça a qualidade da base arquitetural construída para as próximas evoluções.
------

FASE 04 — APLICAÇÃO WEB

LAUDO TÉCNICO OFICIAL Nº 020

Arquivo

manifest.json

Data da Auditoria

30/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o arquivo responsável pela definição da Progressive Web App (PWA) do Forex Assist, estabelecendo sua identidade, comportamento de instalação e integração com o sistema operacional do dispositivo.

---

Responsabilidade Implementada

O arquivo possui responsabilidade única:

Definir a configuração da Progressive Web App.

Suas responsabilidades incluem:

- definir o nome da aplicação;
- definir o nome abreviado;
- configurar o ponto de entrada da aplicação;
- definir o modo de exibição;
- definir as cores oficiais da aplicação;
- registrar os ícones utilizados durante a instalação da PWA.

Não implementa regras de negócio.

Não executa código.

Não realiza consultas.

Não controla a Interface.

Não participa da lógica operacional da aplicação.

---

Fluxo Interno

Leitura do Manifest

↓

Identificação da aplicação

↓

Configuração da instalação

↓

Registro dos ícones

↓

Disponibilização para o navegador

---

Dependências

index.html

icon-512.png

Navegador compatível com PWA

---

Regras de Negócio Identificadas

Nenhuma.

O arquivo possui exclusivamente responsabilidade de configuração da Progressive Web App.

---

Pontos Fortes

Responsabilidade única preservada.

Configuração simples e objetiva.

Integração correta com a arquitetura PWA.

Identidade visual consistente.

Baixo acoplamento.

Excelente legibilidade.

---

Pontos de Atenção

Atualmente o Manifest registra apenas um ícone principal.

Embora suficiente para o funcionamento da aplicação, recomenda-se futuramente ampliar o conjunto de ícones e metadados para melhorar compatibilidade entre diferentes navegadores, dispositivos e sistemas operacionais.

No estado atual isso não representa limitação funcional.

---

Impacto na Arquitetura

Positivo.

A existência de um Manifest dedicado confirma que o Forex Assist foi concebido para operar como Progressive Web App, permitindo instalação da aplicação e melhor integração com dispositivos móveis.

---

Dívidas Técnicas

DT-028

Título

Expandir a configuração da Progressive Web App.

Prioridade

P3

Justificativa

Melhorar compatibilidade, experiência de instalação e suporte a diferentes plataformas mantendo aderência às boas práticas das PWAs.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Arquitetura: 10/10

Maturidade Funcional: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O arquivo manifest.json implementa corretamente sua função como documento de configuração da Progressive Web App do Forex Assist.

Sua estrutura é simples, aderente às recomendações para aplicações Web modernas e compatível com a arquitetura modular definida para o projeto.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se apenas ampliar os recursos da PWA conforme a plataforma evoluir.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "manifest.json".

Resultado:

- Configuração da Progressive Web App aderente à arquitetura.
- Estrutura simples e consistente.
- Integração correta com a aplicação.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-028 para futura ampliação dos recursos da PWA.

Próxima auditoria definida:

- "sw.js".

---

Observação do Arquiteto

O manifest.json confirma que a arquitetura do Forex Assist foi planejada para oferecer uma experiência semelhante à de uma aplicação nativa, preservando a simplicidade de manutenção característica de uma PWA. Sua implementação permanece enxuta, desacoplada e focada exclusivamente na configuração da aplicação, respeitando o princípio da responsabilidade única observado em todas as fases anteriores da auditoria.

---

Minha principal descoberta

A auditoria da raiz da aplicação começa a demonstrar que a preocupação com organização não ficou restrita ao código-fonte. Mesmo os arquivos de infraestrutura da PWA seguem a mesma filosofia adotada na Engine, no Frontend e nos Workflows: cada componente possui uma responsabilidade claramente delimitada, contribuindo para uma arquitetura previsível, organizada e preparada para evolução contínua.
-----

FASE 04 — APLICAÇÃO WEB

LAUDO TÉCNICO OFICIAL Nº 021

Arquivo

sw.js

Data da Auditoria

30/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o Service Worker responsável pela infraestrutura offline da Progressive Web App, gerenciamento do cache da aplicação e tratamento das notificações Push do Forex Assist.

---

Responsabilidade Implementada

O arquivo possui responsabilidade única:

Gerenciar os recursos da Progressive Web App.

Suas responsabilidades incluem:

- controlar o ciclo de vida do Service Worker;
- criar e manter o cache da aplicação;
- remover versões antigas do cache;
- interceptar requisições elegíveis para utilização do cache;
- preservar as chamadas da API TwelveData fora do cache;
- receber notificações Push;
- exibir notificações locais;
- abrir a aplicação quando uma notificação for selecionada.

Não implementa regras de negócio.

Não executa análises de mercado.

Não realiza cálculos.

Não consulta diretamente o Firestore.

Não interfere na lógica operacional da aplicação.

---

Fluxo Interno

Instalação do Service Worker

↓

Criação do cache inicial

↓

Ativação

↓

Limpeza de caches antigos

↓

Interceptação das requisições

↓

Resposta via Cache ou Rede

↓

Recebimento de Push Notification

↓

Exibição da notificação

↓

Abertura da aplicação após interação do usuário

---

Dependências

Cache Storage API

Service Worker API

Notification API

Push API

index.html

manifest.json

icon-512.png

---

Regras de Negócio Identificadas

Nenhuma.

O arquivo atua exclusivamente como infraestrutura da Progressive Web App.

Toda a lógica operacional permanece corretamente concentrada nos módulos da aplicação.

---

Pontos Fortes

Responsabilidade única preservada.

Boa separação entre infraestrutura e regras de negócio.

Implementação correta do ciclo de vida do Service Worker.

Limpeza automática de versões
--------

FASE 04 — APLICAÇÃO WEB

LAUDO TÉCNICO OFICIAL Nº 022

Arquivo

firebase-messaging-sw.js

Data da Auditoria

30/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar o Service Worker dedicado ao Firebase Cloud Messaging, responsável pelo recebimento e apresentação das notificações Push quando a aplicação não estiver em primeiro plano.

---

Responsabilidade Implementada

O arquivo possui responsabilidade única:

Gerenciar notificações Push em segundo plano utilizando o Firebase Cloud Messaging.

Suas responsabilidades incluem:

- carregar os SDKs necessários do Firebase Messaging;
- inicializar o Firebase dentro do contexto do Service Worker;
- registrar o manipulador de mensagens em segundo plano;
- exibir notificações recebidas pelo Firebase Cloud Messaging.

Não implementa regras de negócio.

Não executa análises de mercado.

Não consulta Firestore.

Não controla a Interface da aplicação.

Não interfere na Engine do Scanner.

---

Fluxo Interno

Carregar Firebase SDK

↓

Inicializar Firebase

↓

Inicializar Firebase Messaging

↓

Aguardar mensagem em segundo plano

↓

Receber payload

↓

Preparar conteúdo da notificação

↓

Exibir notificação ao usuário

---

Dependências

Firebase App SDK

Firebase Messaging SDK

Notification API

Service Worker API

Firebase Cloud Messaging

---

Regras de Negócio Identificadas

Nenhuma.

O arquivo atua exclusivamente como infraestrutura de notificações Push.

Toda a lógica operacional permanece corretamente concentrada nos módulos da aplicação.

---

Pontos Fortes

Responsabilidade única preservada.

Implementação objetiva e de fácil manutenção.

Integração correta com o Firebase Cloud Messaging.

Tratamento adequado para mensagens em segundo plano.

Valores padrão definidos para título e conteúdo da notificação.

Identidade visual padronizada utilizando os ícones oficiais da aplicação.

Baixo acoplamento com os demais módulos.

---

Pontos de Atenção

A configuração do Firebase encontra-se declarada diretamente no arquivo.

Embora seja prática comum em aplicações Web com Firebase Cloud Messaging, recomenda-se manter sincronização rigorosa dessa configuração com o módulo firebase-config.js para evitar divergências futuras.

No estado atual isso não representa problema estrutural.

---

Impacto na Arquitetura

Muito positivo.

A existência de um Service Worker exclusivo para o Firebase Cloud Messaging reforça a separação entre infraestrutura da Progressive Web App e infraestrutura de notificações, mantendo responsabilidades claramente definidas.

---

Dívidas Técnicas

DT-030

Título

Documentar e sincronizar a estratégia de configuração compartilhada do Firebase entre os Service Workers.

Prioridade

P3

Justificativa

Facilitar futuras manutenções e reduzir riscos de divergência entre as configurações utilizadas pela aplicação e pelo Firebase Cloud Messaging.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

Infraestrutura: 10/10

Confiabilidade: 10/10

Nota Final

10,0 / 10

---

Conclusão

O arquivo firebase-messaging-sw.js implementa corretamente a camada de infraestrutura responsável pelas notificações Push em segundo plano.

Sua implementação permanece totalmente aderente à arquitetura do Forex Assist, preservando a separação entre infraestrutura, Interface e lógica operacional.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se apenas formalizar a estratégia de sincronização das configurações compartilhadas do Firebase.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "firebase-messaging-sw.js".

Resultado:

- Infraestrutura de notificações Push aderente à arquitetura oficial.
- Inicialização correta do Firebase Cloud Messaging.
- Tratamento de mensagens em segundo plano implementado.
- Responsabilidade única preservada.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-030 para futura documentação e sincronização das configurações compartilhadas do Firebase.

Próxima auditoria definida:

- "css/styles.css".

---

Observação do Arquiteto

A auditoria confirma que a estratégia de notificações do Forex Assist foi construída sobre uma arquitetura bem segmentada. Enquanto o sw.js administra a infraestrutura geral da Progressive Web App, o firebase-messaging-sw.js dedica-se exclusivamente ao processamento das notificações em segundo plano. Essa separação reduz acoplamento, facilita manutenção e mantém a consistência arquitetural observada desde a primeira fase da auditoria.

---

Minha principal descoberta

A Fase 04 demonstra que até mesmo os componentes invisíveis ao usuário seguem rigorosamente a filosofia do projeto. A infraestrutura da aplicação não concentra responsabilidades indevidas e cada Service Worker possui um propósito claramente definido. Esse padrão fortalece a previsibilidade da arquitetura e reduz significativamente o risco de regressões durante futuras evoluções da plataforma.
-------

FASE 04 — APLICAÇÃO WEB

LAUDO TÉCNICO OFICIAL Nº 023

Arquivo

css/styles.css

Data da Auditoria

30/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar a folha de estilos principal da aplicação, responsável pela padronização visual, identidade gráfica e experiência de utilização do Forex Assist.

---

Responsabilidade Implementada

O arquivo possui responsabilidade única:

Centralizar toda a estilização da Interface da aplicação.

Suas responsabilidades incluem:

- definir o tema visual da aplicação;
- padronizar tipografia;
- controlar espaçamentos;
- definir componentes reutilizáveis;
- estilizar cartões;
- estilizar botões;
- estilizar barra de navegação;
- estilizar Histórico;
- estilizar estados visuais;
- definir comportamento visual de interação.

Não implementa regras de negócio.

Não manipula dados.

Não realiza consultas.

Não controla eventos.

Não interfere na lógica operacional.

---

Fluxo Interno

Carregamento da folha de estilos

↓

Aplicação do Reset CSS

↓

Definição da identidade visual

↓

Estilização dos componentes

↓

Aplicação dos estados visuais

↓

Renderização da Interface

---

Dependências

index.html

DOM

Classes CSS utilizadas pelos módulos JavaScript

---

Regras de Negócio Identificadas

Nenhuma.

Toda a implementação pertence exclusivamente à camada de apresentação da aplicação.

---

Pontos Fortes

Responsabilidade única preservada.

Identidade visual consistente.

Boa organização por componentes.

Baixo acoplamento com JavaScript.

Código simples e de fácil manutenção.

Utilização de classes reutilizáveis.

Boa padronização das cores da aplicação.

Separação clara entre estados visuais.

Interface coerente com a proposta profissional do projeto.

---

Pontos de Atenção

A folha de estilos concentra toda a estilização da aplicação.

Embora permaneça organizada no estado atual, recomenda-se que futuras expansões considerem a divisão por módulos (layout, componentes, histórico, dashboard, configurações e manual), preservando a legibilidade conforme a Interface evoluir.

No estado atual isso não representa problema estrutural.

---

Impacto na Experiência do Usuário (UX)

Muito positivo.

A identidade visual transmite consistência entre todas as telas da aplicação.

A diferenciação visual entre estados operacionais (BUY, SELL, WIN, LOSS, PENDENTE e STATUS) facilita a leitura rápida das informações e melhora significativamente a experiência do operador.

---

Dívidas Técnicas

DT-031

Título

Avaliar futura modularização da folha principal de estilos.

Prioridade

P3

Justificativa

Facilitar manutenção e evolução da Interface caso a quantidade de componentes continue crescendo.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Acoplamento: 10/10

UX: 10/10

Escalabilidade: 9,5/10

Nota Final

9,9 / 10

---

Conclusão

O arquivo styles.css implementa corretamente a camada de apresentação do Forex Assist.

A responsabilidade encontra-se claramente delimitada à estilização da Interface, preservando a separação entre apresentação e lógica operacional estabelecida pela arquitetura do projeto.

Não foram identificadas necessidades de refatoração estrutural.

Como evolução futura, recomenda-se apenas avaliar a divisão da folha de estilos em módulos especializados quando o crescimento da aplicação justificar essa reorganização.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria do arquivo "css/styles.css".

Resultado:

- Camada de apresentação aderente à arquitetura oficial.
- Identidade visual consistente.
- Componentes reutilizáveis corretamente organizados.
- Excelente separação entre Interface e lógica operacional.
- Nenhuma refatoração estrutural necessária.
- Registrada a DT-031 para futura modularização da folha de estilos.

Próxima auditoria definida:

- Inventário e auditoria da pasta "assets/".

---

Observação do Arquiteto

A auditoria confirma que a camada visual do Forex Assist segue o mesmo princípio observado em toda a arquitetura: responsabilidade única. Toda a identidade visual foi centralizada em um único arquivo, mantendo a Interface completamente desacoplada da lógica da aplicação. Essa decisão facilita manutenção, reduz duplicação de estilos e preserva a consistência visual entre todos os módulos da plataforma.

---

Minha principal descoberta

Com a conclusão da auditoria do styles.css, observa-se que todas as camadas fundamentais do Forex Assist — Engine, Frontend, Workflows, PWA e Interface Visual — seguem uma mesma filosofia arquitetural. A uniformidade na separação de responsabilidades evidencia que o projeto foi construído de forma disciplinada desde sua base, reduzindo riscos de regressão e criando uma estrutura sólida para as próximas fases de evolução da plataforma.
----

FASE 04 — APLICAÇÃO WEB

LAUDO TÉCNICO OFICIAL Nº 024

Arquivo

assets/

Data da Auditoria

30/06/2026

Status

Concluído.

---

Classificação Arquitetural

Convergente.

---

Objetivo

Auditar a pasta responsável pelos recursos gráficos da aplicação, utilizados pela Progressive Web App, notificações, identidade visual e componentes da Interface.

---

Responsabilidade Implementada

A pasta possui responsabilidade única:

Centralizar todos os recursos gráficos permanentes da aplicação.

Os ativos atualmente identificados são:

- icon-32.png
- icon-192.png
- icon-512.png
- placeholder.png

Suas responsabilidades incluem:

- fornecer os ícones oficiais da Progressive Web App;
- disponibilizar os ícones utilizados pelo Manifest;
- disponibilizar os ícones utilizados nas notificações Push;
- manter a identidade visual da aplicação;
- armazenar imagens estáticas reutilizáveis.

Não implementa regras de negócio.

Não executa código.

Não participa da lógica operacional.

Não realiza processamento.

Não interfere na Interface além do fornecimento dos recursos gráficos.

---

Fluxo Interno

Solicitação do recurso gráfico

↓

Localização na pasta assets

↓

Entrega ao navegador

↓

Renderização pela aplicação

---

Dependências

manifest.json

sw.js

firebase-messaging-sw.js

index.html

---

Regras de Negócio Identificadas

Nenhuma.

A pasta possui exclusivamente responsabilidade de armazenamento dos recursos gráficos da aplicação.

---

Pontos Fortes

Responsabilidade única preservada.

Estrutura simples.

Organização adequada dos recursos gráficos.

Boa separação entre arquivos estáticos e código-fonte.

Preparada para evolução futura da identidade visual.

Baixo acoplamento.

---

Pontos de Atenção

Atualmente a pasta contém apenas os recursos essenciais da aplicação.

À medida que a Interface evoluir, recomenda-se manter organização por categorias caso novos elementos gráficos sejam adicionados, evitando crescimento desordenado.

No estado atual isso não representa necessidade de reorganização.

---

Impacto na Arquitetura

Positivo.

A separação dos recursos gráficos em uma pasta exclusiva reforça a organização do projeto e mantém a camada visual desacoplada da lógica da aplicação.

---

Dívidas Técnicas

Nenhuma.

---

Nota Técnica

Responsabilidade: 10/10

Coesão: 10/10

Legibilidade: 10/10

Organização: 10/10

Arquitetura: 10/10

Escalabilidade: 10/10

Nota Final

10,0 / 10

---

Conclusão

A pasta assets cumpre corretamente seu papel como repositório central dos recursos gráficos do Forex Assist.

Sua organização está aderente à arquitetura oficial do projeto e não foram identificadas necessidades de refatoração ou reorganização.

---

WORKLOG (RESUMO)

Auditoria de Implementação

Foi concluída a auditoria da pasta "assets/".

Resultado:

- Organização aderente à arquitetura oficial.
- Recursos gráficos centralizados.
- Responsabilidade única preservada.
- Nenhuma dívida técnica identificada.
- Nenhuma refatoração necessária.

Próxima auditoria definida:

Encerramento da Fase 04 — Aplicação Web.

---

Observação do Arquiteto

A auditoria da pasta assets confirma que a organização do Forex Assist foi mantida inclusive para os recursos estáticos. Os arquivos gráficos permanecem desacoplados do código-fonte, facilitando manutenção, evolução da identidade visual e futuras expansões da aplicação sem impactar a arquitetura.

---

Minha principal descoberta

Com a conclusão desta auditoria, todas as camadas fundamentais da aplicação foram analisadas: Engine, Frontend, Workflows, Infraestrutura Web e Recursos Estáticos. A arquitetura demonstra elevada consistência na aplicação do princípio da responsabilidade única e na separação de responsabilidades, formando uma base sólida para a evolução do projeto.
-----

CONSOLIDAÇÃO OFICIAL DA AUDITORIA ARQUITETURAL

CHECKPOINT OFICIAL

Data

30/06/2026

Versão

V5 Expert Alpha

Status do Projeto

Arquitetura Integralmente Auditada.

---

OBJETIVO DESTE CHECKPOINT

Registrar oficialmente o encerramento da Auditoria Arquitetural do Forex Assist e estabelecer um novo marco de governança para todo o desenvolvimento futuro da plataforma.

Este checkpoint substitui definitivamente a dependência da memória das conversas, tornando a documentação oficial a única fonte de verdade do projeto.

---

FASES CONCLUÍDAS

FASE 01

Engine

Status

Concluída.

Arquivos auditados

scripts/

001 scanner.js

002 pairAnalyzer.js

003 marketAnalyzer.js

004 marketData.js

005 riskManager.js

006 firebase.js

007 utils.js

---

FASE 02

Frontend

Status

Concluída.

Arquivos auditados

js/

008 app.js

009 scanner.js

010 historico.js

011 checker.js

012 expert.js

013 manual.js

014 firebase-config.js

015 push.js

016 config.js

---

FASE 03

GitHub Workflows

Status

Concluída.

Arquivos auditados

017 forex-scanner-real.yml

018 result-checker.yml

---

FASE 04

Aplicação Web

Status

Concluída.

Arquivos auditados

019 index.html

020 manifest.json

021 sw.js

022 firebase-messaging-sw.js

023 css/styles.css

024 assets/

---

TOTAL DA AUDITORIA

Arquivos/Pastas auditados

24

Laudos Técnicos Oficiais emitidos

24

Fases concluídas

4

Arquitetura

100% auditada.

---

RESULTADO GERAL

Durante toda a Auditoria Arquitetural não foi identificada nenhuma necessidade de refatoração estrutural obrigatória.

As Dívidas Técnicas registradas representam exclusivamente melhorias futuras relacionadas à escalabilidade, organização, documentação ou evolução funcional.

A arquitetura demonstrou elevada consistência entre:

• Engine

• Frontend

• GitHub Actions

• Progressive Web App

• Infraestrutura

• Interface

Todos os componentes seguem o princípio da Responsabilidade Única e apresentam baixo acoplamento entre si.

---

DECISÃO OFICIAL DE ENGENHARIA

A partir deste checkpoint fica oficialmente definido que:

A documentação oficial passa a ser a única fonte de verdade do projeto.

Em qualquer divergência entre memória da conversa, memória do modelo, memória do usuário ou documentação, prevalecerá obrigatoriamente a documentação oficial.

Os documentos oficiais são:

DOCUMENTO_MESTRE.md

WORKLOG_DEFINITIVO.md

ENGINEERING.md

Nenhuma decisão será considerada oficial enquanto não estiver registrada nesses documentos.

---

NOVO FLUXO OFICIAL DE DESENVOLVIMENTO

Toda evolução do Forex Assist deverá obedecer obrigatoriamente ao seguinte fluxo:

1. Implementar.

2. Testar.

3. Validar.

4. Auditar.

5. Atualizar ENGINEERING.md.

6. Atualizar WORKLOG_DEFINITIVO.md.

7. Atualizar DOCUMENTO_MESTRE.md (quando houver impacto arquitetural).

8. Registrar Checkpoint Oficial.

9. Somente então iniciar a próxima etapa.

---

GOVERNANÇA

Fica oficialmente proibido reconstruir arquitetura baseada apenas na memória.

Toda continuidade do projeto deverá partir exclusivamente dos documentos oficiais auditados.

Esses documentos passam a representar a memória permanente do Forex Assist.

---

PRÓXIMA FASE

FASE 05

Consolidação da Engenharia e Evolução Funcional.

Objetivos

• Evoluir funcionalidades existentes.

• Implementar novas capacidades previstas no Roadmap.

• Reduzir gradualmente as Dívidas Técnicas registradas.

• Evoluir o Expert.

• Evoluir a Inteligência Operacional.

• Manter documentação permanentemente sincronizada.

---

OBSERVAÇÃO DO ARQUITETO

A conclusão desta auditoria representa um dos marcos mais importantes da história do Forex Assist.

O projeto deixa de depender da memória das conversas e passa a apoiar seu desenvolvimento em uma base documental auditada, precisa e verificável.

Isso garante continuidade, rastreabilidade e estabilidade para todas as futuras evoluções da plataforma.

---

MINHA PRINCIPAL DESCOBERTA

A maior entrega desta auditoria não foi a validação do código, mas a construção da memória oficial do projeto.

A partir deste momento, o conhecimento do Forex Assist deixa de existir na memória do desenvolvedor ou da Inteligência Artificial e passa a existir na documentação auditada.

Essa mudança estabelece um novo padrão de desenvolvimento, baseado em fatos registrados, decisões verificadas e engenharia documentada, garantindo que o projeto possa evoluir por muitos anos sem perder sua identidade arquitetural.

---

ENCERRAMENTO OFICIAL

Com a emissão deste Checkpoint Oficial, ficam formalmente encerradas as Fases 01, 02, 03 e 04 da Auditoria Arquitetural do Forex Assist.

A partir deste momento, todo desenvolvimento passará a seguir exclusivamente a documentação oficial consolidada, utilizando-a como referência permanente para implementação, manutenção e evolução da plataforma.
---------

ENGINEERING
Registrar:
Infraestrutura
Foi identificado durante a auditoria que o projeto não possuía um arquivo package.json.
A partir deste Sprint passa a existir um ponto único para gerenciamento de dependências, facilitando reprodutibilidade, integração com GitHub Actions e evolução da Engine.
AÇÃO
Na raiz do repositório (mesmo nível de index.html, manifest.json e .github), crie um novo arquivo chamado:
package.json
No próximo passo eu vou gerar o conteúdo completo desse arquivo, já preparado para o Forex Assist, incluindo as dependências necessárias e compatível com a arquitetura atual. Isso permitirá integrar a biblioteca de indicadores sem quebrar o projeto.
--------

AUDITORIA DE CORREÇÃO — RESTABELECIMENTO DA RMI V2

Data: 06/09/2026

Status: CONCLUÍDA (correção de código); VALIDAÇÃO END-TO-END PENDENTE (mercado fechado no momento da correção)

---

CONTEXTO

Esta auditoria não partiu de leitura de código isolada. Partiu de evidência de
produção: logs reais do GitHub Actions (execução `run 32988076944`, 26/08/2026)
mostraram `Erros: 10` de 10 pares, com a mensagem `scoreTecnico is not defined`
repetida em todo par analisado, e `Operações: 0`. Uma consulta direta ao
Firestore de produção (coleção `historico`, 450 documentos) confirmou que o
último documento gravado era de 28/07/2026 — a véspera exata da regressão.

Isso invalida a conclusão de laudos anteriores deste documento (nº 001 a 024,
Fases 01–04, e as Entregas da FASE 06 no DOCUMENTO_MESTRE 2) sobre o estado
"aprovado" / "workflow GREEN" desses módulos: workflow verde no GitHub Actions
não implica que a Engine produziu resultado válido, porque os scripts deste
projeto capturam exceção e retornam `status: "ERRO"` sem derrubar o processo.
Esta é agora uma regra permanente registrada em `CLAUDE.md`.

---

BUG-001 — scripts/marketAnalyzer.js

Severidade: CRÍTICA (bloqueava 100% da geração de sinais)

`calcularQualidade()` referenciava a variável `scoreTecnico` em `let scoreFinal
= scoreTecnico;` (e no objeto de retorno) sem que ela jamais tivesse sido
declarada na função. `ReferenceError` em toda chamada.

Introduzido no commit `198e55e` (29/07/2026, "Refactor risk calculation logic
in pairAnalyzer.js"), nunca corrigido nos commits seguintes (30–31/07, todos
em `checker.js`).

Correção: `const scoreTecnico = score;` logo após a soma de
`emaScore + rsiScore + tendenciaScore + adxScore`. Validado isoladamente
(chamada direta de `calcularQualidade()` com dados de mercado simulados —
não lança mais exceção, `scoreTecnico` presente e correto na saída).

---

BUG-002 — scripts/marketData.js

Severidade: ALTA (limitava drasticamente o tempo de operação do Scanner)

`getCandles()` chamava `selecionarApi(CONFIG.apiAtiva)` a cada requisição,
resetando `apiIndex.value` para um valor fixo. Isso anulava o incremento
round-robin feito por `getApiKey()` (utils.js) — das 3 chaves TwelveData
configuradas, apenas 1 era efetivamente usada. Confirmado no mesmo log de
produção: 7 dos 10 pares falhavam com HTTP 429 (limite de requisições).

Correção: removida a chamada de `selecionarApi()` de dentro de `getCandles()`.
A função permanece exportada para eventual seleção manual explícita (ex.:
futura Central de Configurações), mas não é chamada em nenhum outro ponto do
código atual (confirmado por busca em todo o repositório). Validado
isoladamente: sequência de chamadas a `getApiKey()` agora cicla
corretamente entre as 3 chaves.

---

BUG-003 — scripts/pairAnalyzer.js

Severidade: CRÍTICA (quebra de contrato entre produtor e consumidor de dados)

O objeto `operacao` salvo no Firestore nunca definia `status`, `precoEntrada`
ou `inicioOperacao`. `js/checker.js` exige exatamente esses três campos
(consulta `where("status", "==", "ABERTA")`, e usa `precoEntrada`/
`inicioOperacao` para calcular resultado) — sem eles, uma operação nunca é
encontrada pelo Result Checker e permanece "⏳ PENDENTE" para sempre no
frontend, mesmo com o Scanner funcionando.

Correção: adicionados `status: "ABERTA"`, `precoEntrada: closes[closes.length
- 1]` e `inicioOperacao: Date.now()` na construção do objeto `operacao`.

Confirmado por consulta direta ao Firestore: nenhuma operação está presa
(`status == "ABERTA"`: 0 resultados) — o histórico existente (até 28/07) foi
gravado por uma versão do código compatível com o `checker.js` e foi resolvido
corretamente. O problema afeta apenas operações que seriam salvas *depois*
desta correção, por isso não havia nada para limpar.

---

BUG-004 — js/historico.js (frontend, não relacionado ao pipeline da RMI)

Severidade: BAIXA (UX)

`mostrarGrupo` (lógica de abrir/fechar grupos de data no Histórico) nunca
considerava `isHoje` — o grupo do dia atual iniciava fechado como qualquer
outro dia, contrariando o comportamento documentado desde a Fase 2.2. O botão
"Minimizar Tudo" limpava `sinaisAbertos` do localStorage mas não
`datasAbertas`, então dias previamente abertos voltavam a abrir sozinhos ao
recarregar a página.

Correção: `mostrarGrupo` agora inclui `isHoje` no OR; "Minimizar Tudo" agora
limpa também `datasAbertas`.

---

VALIDAÇÃO PENDENTE

Os BUG-001 a BUG-003 foram validados unitariamente (funções chamadas
isoladamente com dados simulados) e por leitura de código, mas **não** foram
validados em execução real de ponta a ponta contra o mercado — o mercado
estava fechado (fim de semana) no momento da correção. Uma tentativa de
disparo manual do workflow (`run 34007409592`, 06/09/2026) encerrou em 3s com
`MERCADO FECHADO`, comportamento esperado do `mercadoAberto()`.

Próximo passo formalmente pendente: acompanhar manualmente o primeiro ciclo
real do Scanner após a reabertura do mercado antes de considerar esta
correção encerrada (ver BUG-005, que muda quando isso acontece).
--------

BUG-005 — scripts/scanner.js (mercadoAberto / horarioOperacional)

Severidade: MÉDIA (o Scanner perdia toda a sessão de reabertura de domingo)

Descoberto na conversa, não em log de produção: o usuário apontou que o Forex
reabre domingo às 18h (horário de Brasília), mas o Scanner só voltaria a
analisar segunda-feira 07:30. Duas causas, sobrepostas:

1. `mercadoAberto()` calculava `diaSemana` via `new Date().getDay()` sem
   fuso horário explícito — no runner do GitHub Actions (UTC), isso não
   corresponde ao dia da semana em Brasília perto da virada da meia-noite,
   diferente de `horarioOperacional()`, que já convertia corretamente para
   `America/Sao_Paulo`. As duas funções podiam discordar sobre "que dia é
   hoje" por até 3 horas.

2. Mesmo corrigindo o fuso, `horarioOperacional()` aplicava a mesma janela
   07:30–18:00 configurada para dias úteis também ao domingo — um dia em
   que o pregão só existe a partir das 18h. Resultado: entre domingo 18h
   (reabertura real) e segunda 07:30, o Scanner ficava parado por um
   filtro de janela que nunca previu esse caso.

Correção: criada `obterAgoraBrasil()`, usada por ambas as funções, que
converte o horário atual para `America/Sao_Paulo` uma única vez (via
`toLocaleString` + reparse, sem dependência nova). `mercadoAberto()` agora
trata domingo como aberto a partir das 18h. `horarioOperacional()` aplica
uma janela especial (18:00–23:59) só no domingo, e a janela configurada
normalmente nos demais dias — incluindo sábado, que precisou de checagem
explícita (achado pelo teste abaixo: sem ela, `horarioOperacional()`
sozinha diria "dentro do horário" num sábado às 12h, mascarado em produção
apenas porque `validarExecucao()` já barra em `mercadoAberto()` antes).

Validado com 7 casos cobrindo sexta/sábado/domingo antes e depois das 18h
(inclusive o instante em que o UTC já virou segunda mas ainda é domingo à
noite em Brasília) e segunda antes/depois das 07:30 — todos corretos após a
correção do caso de sábado.

Segunda-feira 07:30–18:00 continua sendo a janela normal de dias úteis; a
janela de domingo é estritamente 18:00–23:59, por pedido explícito do
usuário — não foi estendida para cobrir a madrugada de segunda.
--------

BUG-006 — js/historico.js (onclick de abrir/fechar grupo de data)

Severidade: MÉDIA (UX) — pré-existente, não introduzido pela correção do
BUG-004

Descoberto ao vivo pelo usuário: console do navegador mostrou
`Uncaught ReferenceError: idData is not defined` ao clicar no cabeçalho de
um grupo de data no Histórico.

Causa: o `onclick` é montado dentro de um template string. A primeira linha
interpola corretamente (`` `data${idData}` ``), mas as chamadas
`salvarDataAberta(idData)` e `removerDataAberta(idData)` esqueceram o
`${}` — o HTML gerado continha o texto literal `idData`, uma variável
inexistente no escopo do atributo inline. O clique abria/fechava o grupo
visualmente (isso executa antes do erro), mas travava exatamente antes de
persistir no `localStorage`. Na prática, nenhum clique em nenhum grupo de
data jamais foi salvo desde que este código existe — o que o usuário via
como "dia aberto" era sempre um estado antigo, congelado, que nenhuma
interação subsequente conseguia alterar.

Correção: `salvarDataAberta('${idData}')` e `removerDataAberta('${idData}')`,
interpolando e citando a string como a linha acima já fazia.

Nota: usuários que já tinham uma data presa em `datasAbertas` no
`localStorage` antes desta correção (ex.: uma data antiga aberta que nunca
fechava) precisam clicar nela uma vez após a correção para que essa entrada
específica seja finalmente removida — a correção não limpa retroativamente o
estado salvo, só destrava a escrita futura.
--------

ACHADO OPERACIONAL — cron do GitHub Actions não executa a cada 5 minutos

Não é um bug de código; é uma limitação de infraestrutura que muda a
premissa de "tempo real" da RMI e motivou o BUG-008 abaixo.

Com o mercado reaberto (domingo, 06/09/2026, após a correção do BUG-005),
os horários reais de execução do `forex-scanner-real.yml` (cron
`*/5 * * * *`) no dia foram: 07:19, 11:41 (+4h22), 14:24 (+2h43), 17:11
(+2h47), 19:10 (+1h59) — e nenhuma execução nas 2h seguintes, checado às
21:12. `list_workflow_runs` confirmou: workflow `active`, 0 execuções na
fila (`queued`), repositório público (sem limite de minutos do Actions).
Ou seja, o agendamento simplesmente não dispara no intervalo configurado —
comportamento documentado do próprio GitHub para `schedule` de alta
frequência em contas pessoais, não uma falha nossa.

Efeito real: o Scanner roda ~6-8 vezes por dia, não ~288. O Result Checker
(mesmo cron) sofre o mesmo problema — o que motivou diretamente o BUG-008.

Três opções foram apresentadas ao usuário (aceitar a cadência real, mover
o agendamento para um disparador externo confiável, ou tornar o pipeline
resiliente a execuções irregulares). Escolhida: a terceira.

--------

BUG-007 — js/checker.js (P&L invertido em operações SELL)

Severidade: CRÍTICA (contamina resultadoFinanceiro/saldoDepois/movimentoPips
de toda operação SELL encerrada — dado que alimenta o aprendizado da RMI)

Descoberto ao escrever o teste isolado do BUG-008 (não em log de produção).
`movimentoPips` (e por consequência `lucroAtual`/`resultadoFinanceiro`) era
calculado sempre como `(precoAtual - precoEntrada)`, sem checar
`sinal.direcao` — correto para BUY, invertido para SELL: uma queda de preço
(lucro real numa venda) era reportada como prejuízo, e uma alta (prejuízo
real numa venda) como lucro. As checagens de `maxPipsFavor`/`maxPipsContra`
já eram corretas (já ramificavam por direção); só o P&L financeiro e o
`movimentoPips` exibido no frontend estavam errados. Bug pré-existente, não
introduzido pela correção do BUG-008.

Correção: nova função `calcularMovimentoPips(sinal, preco)`, usada tanto na
checagem de TP/SL financeiro por candle quanto no cálculo final de
`movimentoPips`/`lucroAtual` — espelha exatamente a ramificação por direção
que `maxPipsFavor`/`maxPipsContra` já usavam.

Validado isoladamente (scratchpad, 8 cenários incluindo os dois de
regressão específicos deste bug: SELL que cai reporta lucro positivo, SELL
que sobe reporta prejuízo negativo). Não há outro ponto do código que
recalcule `movimentoPips` de forma independente (`js/historico.js` só
exibe o valor já gravado no Firestore) — corrigir na fonte basta.

CORREÇÃO RETROATIVA APLICADA (06/09/2026)

Auditoria via script somente-leitura (`audit-historico.js`, rodado com a
Service Account de produção) confirmou o alcance real: dos 450 documentos
em `historico`, 137 estavam `ENCERRADA` (72 BUY, 65 SELL). **100% das 65
operações SELL encerradas** fecharam por `TP_FINANCEIRO`/`SL_FINANCEIRO`
(nenhuma por `TP_PIPS`/`SL_PIPS`) — ou seja, 100% delas tinham o rótulo
WIN/LOSS invertido, não uma amostra. Isso é 47% de todo o histórico de
operações fechadas do projeto.

Impacto medido por par (taxa de acerto original vs. corrigida):
GBP/JPY 53%→34%, EUR/JPY 54%→44%, EUR/GBP 20%→60%, USD/CHF 100%→0%,
AUD/USD 100%→0%, GBP/USD 100%→0%. GBP/JPY é o par mais negociado do
histórico (85 operações) e era, no dia da descoberta, classificado como
"BOM" pelo `statisticsEngine.js`/`historyAnalyzer.js` — ou seja, o bug
estava ativamente distorcendo a pontuação de pares em uso corrente, não
só o registro histórico.

Correção aplicada em produção pelo usuário (script `corrigir-bug007.js`,
rodado localmente com a Service Account, fora do sandbox do Claude Code —
a escrita em produção foi bloqueada pelo classificador de auto mode do
Claude Code e não pôde ser executada a partir da sessão). Escopo: os 65
documentos SELL afetados tiveram `resultado`, `motivoEncerramento` e
`resultadoFinanceiro` recalculados com `calcularMovimentoPips()`; os
valores originais foram preservados em `auditoriaBug007` em cada
documento (correção auditável e reversível). Reauditoria pós-correção
(`audit-historico.js`) confirmou **0 documentos divergentes** — todos os
65 corrigidos corretamente, nenhum efeito colateral detectado.

CORREÇÃO — pendência de saldoAntes/saldoDepois não existe (07/09/2026)

Registrado acima, ao concluir a correção do BUG-007, que `saldoAntes`/
`saldoDepois` formariam uma cadeia cronológica pendente de recálculo.
Auditoria dedicada (`audit-saldo.js`, somente leitura) mostrou que isso
estava errado: **nenhum dos 137 documentos `ENCERRADA` tem `saldoAntes`/
`saldoDepois` preenchidos**, em nenhuma era do schema. `configuracoes/
geral.saldoSimulado` está no valor padrão (1000), nunca incrementado por
nenhuma operação histórica; `saldoReal` em 0. Não há ledger a reconstruir
porque nunca houve ledger persistido nesse período. Pendência encerrada
sem ação — não por decisão do usuário, mas porque o problema não existe.

Achado colateral dessa investigação: o schema anterior a 28/07/2026 usava
um campo `lucroAtual` (não `resultadoFinanceiro`, que ficava `null`) para
registrar o P&L. A correção do BUG-007 atualizou `resultado`,
`motivoEncerramento` e `resultadoFinanceiro`, mas não tocou `lucroAtual`
— os 65 documentos corrigidos ficaram com `lucroAtual` no valor antigo
(sinal errado), inconsistente com o `resultado` já corrigido. Confirmado
que isso é inofensivo no estado atual: o frontend (`js/historico.js`) só
renderiza a seção de resultado financeiro quando o documento tem o campo
`movimentoPips`, ausente em todo esse período histórico; nenhum outro
código lê `lucroAtual` de documentos já encerrados. É sujeira de dado,
não um bug ativo — correção de baixa prioridade, opcional, ainda não
solicitada pelo usuário.

---

BUG-008 — js/checker.js (Result Checker não sobrevive a gaps de execução)

Severidade: CRÍTICA (classificação WIN/LOSS e extremos de preço podem estar
errados sempre que o cron atrasar — ver achado operacional acima; com gaps
reais de 2-4h, isso é a regra, não a exceção)

`buscarUltimoCandle()` buscava só o candle mais recente a cada execução e
usava seu high/low para atualizar `precoMaximo`/`precoMinimo`. Com o cron
rodando a cada ~5 min como projetado, isso seria suficiente. Com os gaps
reais documentados no achado acima, um TP ou SL tocado e revertido dentro
do intervalo entre duas execuções nunca era visto — a operação era
classificada pelo estado do mercado no instante da checagem, não pelo que
de fato aconteceu com o preço enquanto ninguém olhava.

Correção: `buscarCandlesDesde(par, desde)` busca todos os candles de 5min
desde `sinal.inicioOperacao` (outputsize dinâmico, proporcional ao tempo
decorrido, limitado a 5000) e `calcularResultadoOperacao()` percorre esses
candles em ordem cronológica, atualizando extremos e checando as condições
de saída a cada passo — para no primeiro candle que dispara TP/SL, não no
último. Isso reconstrói o caminho real do preço independente de quando o
processo rodou.

Assunção não validada ao vivo: o campo `datetime` da resposta da TwelveData
é tratado como UTC (comportamento padrão documentado da API para Forex
quando o parâmetro `timezone` não é enviado, que é o caso aqui). Precisa
ser confirmado contra uma operação real encerrada por este código antes de
considerar a correção plenamente validada.

Validado isoladamente (scratchpad, 8 cenários): TP_PIPS e SL_PIPS
detectados no candle intermediário correto mesmo quando um candle posterior
já reverteu o preço; extremos persistidos de checagens anteriores
respeitados; par JPY (fator 100) correto; ambas direções (BUY/SELL)
corretas. Não validado em execução real de ponta a ponta (depende de uma
operação real ser aberta e encerrada em produção).
--------

BUG-009 — Tela de Configurações RMI nunca teve efeito em produção

Severidade: CRÍTICA (todo o motor de risco/análise sempre rodou com
parâmetros fixos no código, ignorando qualquer configuração feita pelo
usuário, desde a criação da tela)

Descoberto ao vivo pelo usuário: mudou o Perfil Operacional para
"Agressivo" na tela de Config, clicou em "Salvar Configurações", e nada
aconteceu — nem feedback visual, nem entrada no console do DevTools.
Investigação encontrou uma cadeia de três desconexões independentes,
todas presentes desde a criação da tela:

1. **`js/app.js` nunca religava o clique do botão.** `js/config.js`
   chama `bindConfigEvents()` uma única vez, 100ms após o carregamento
   da página — quando a aba ativa por padrão (Dashboard) está visível, não
   a de Config. `app.js` re-renderiza o HTML inteiro a cada troca de aba
   (`app.innerHTML = ...`), mas só chamava um hook de pós-renderização
   para a aba Histórico (`carregarHistorico()`), nunca para Config. O
   botão `#btnSalvarConfig` existia visualmente mas nunca teve
   `onclick` atribuído depois da primeira renderização da página.
   Resultado: o clique nunca fazia absolutamente nada, nem localStorage
   nem Firestore — consistente com o teste do usuário.

2. **Mesmo com o clique funcionando, os nomes de campo não batem com o
   que o backend lê.** O `<select>` de tipo de conta grava
   `conta: "simulada"/"real"` (minúsculo), mas `scripts/scanner.js` e
   `scripts/checker.js` esperam `tipoConta: "SIMULADA"/"REAL"`
   (maiúsculo, chave diferente) em `configuracoes/geral`. A escrita
   original também sobrescreveria `saldoSimulado`/`saldoReal` (o saldo
   CORRENTE, mutado pelo checker a cada operação) com `saldoInicial` a
   cada clique em Salvar — resetaria o saldo em uso toda vez que o
   usuário salvasse qualquer configuração, mesmo sem intenção de reiniciar
   a simulação.

3. **`scripts/pairAnalyzer.js` recebia `configuracao` mas descartava.**
   `scripts/scanner.js` já passava `configuracao: context.configuracao`
   para `analisarPar()` — mas a assinatura da função em
   `pairAnalyzer.js` não incluía `configuracao` nos parâmetros
   desestruturados, então o objeto era silenciosamente ignorado.
   `analisarFinanceiro()` (em `scripts/moneyManager.js`) era chamada sem
   `perfil`, `banca`, `lote`, `tpUSD`, `slUSD` — caindo sempre nos
   valores padrão internos (`perfil = "CONSERVADOR"`, lote/TP/SL fixos),
   que por coincidência numérica batiam com os valores exibidos na tela
   (lote 0,04, TP/SL $5, saldo 1000), mascarando o problema.

   Confirmado por auditoria direta do Firestore: `configuracoes/geral`
   tinha apenas 4 campos (`tipoConta`, `saldoSimulado`,
   `saldoInicialReal`, `saldoReal`) — nenhum `perfil`, `lote`, `tp`, `sl`,
   `pares`, `horarioInicio`/`horarioFim`, `candles`, `scannerAtivo` jamais
   chegou a ser gravado.

Correção:

- `js/app.js`: adicionado o mesmo hook de pós-renderização usado pelo
  Histórico, agora também para a aba `"config"`, chamando
  `bindConfigEvents()` depois de renderizar a view.
- `js/config.js`: o payload gravado no Firestore agora traduz
  `conta` → `tipoConta` (maiúsculo) e nunca sobrescreve
  `saldoSimulado`/`saldoReal` — só grava `saldoInicial` como campo
  informativo separado. O feedback do botão agora reflete o resultado
  real da escrita (`"✅ Configurações Salvas"` só se a gravação no
  Firestore realmente aconteceu; caso contrário, avisa que só salvou
  localmente).
- `scripts/pairAnalyzer.js`: `configuracao` agora está nos parâmetros
  desestruturados de `analisarPar()`; `perfil` (normalizado em
  maiúsculas), `banca` (saldo corrente, não o inicial), `lote`, `tpUSD`
  e `slUSD` agora são repassados de verdade para `analisarFinanceiro()`
  e `avaliarOperacao()`.

Além de destravar a cadeia, o usuário pediu que o rigor da própria
análise (não só a gestão de risco) variasse por perfil — Conservador
sendo o mais seletivo, Agressivo o mais permissivo, mantendo a mesma
engine de análise completa para todos os perfis (a diferença é a barra
de aprovação, não a qualidade do trabalho de análise):

- `scripts/decisionEngine.js`: nova tabela `PERFIL_ANALISE` com score
  mínimo (35/45/55 para Agressivo/Balanceado/Conservador), exigência de
  confirmação multi-timeframe (dispensada só para Agressivo) e histórico
  mínimo de operações (10, exigido só para Conservador). Perfil ausente
  ou desconhecido cai no comportamento antigo (BALANCEADO, score mínimo
  45) — compatibilidade preservada para qualquer chamador que não passe
  `perfil`.

Nota: um 4º perfil "Expert RMI" foi cogitado e chegou a ser implementado
(score mínimo 70 em `decisionEngine.js`, entrada própria em
`PERFIL_FINANCEIRO`) antes de o usuário esclarecer que esse conceito foi
descontinuado quando a decisão de criar a própria RMI foi tomada — o RMI
já É o motor de inteligência completo, não um 4º nível dentre os
perfis operacionais. Revertido no mesmo commit: `js/config.js` mantém
só 3 perfis (`agressivo`/`balanceado`/`conservador`), sem entrada
`EXPERT` em `PERFIL_ANALISE` nem em `PERFIL_FINANCEIRO`.

Validado isoladamente (scratchpad, 11 cenários): score mínimo correto
por perfil nos limiares exatos; perfil ausente/desconhecido preserva o
comportamento antigo; histórico mínimo bloqueia Conservador com poucas
operações mas não Agressivo; multi-timeframe divergente é ignorado só
por Agressivo. Não validado ao vivo além do clique salvar corretamente
(confirmado pelo usuário: "✅ Configurações Salvas" aparece agora) —
falta confirmar, via log do scanner, que o perfil escolhido chega em
`context.configuracao.perfil` e influencia de fato um ciclo real.
--------

REVISÃO DA QUALIDADE ANALÍTICA DA RMI (07/09/2026)

A pedido do usuário, revisão do modelo de análise/score em si (não só
correção de bugs de integração), com a pergunta explícita: dá pra
confiar no histórico atual como base de conhecimento? Achados:

1. **`calcularQualidade()` (marketAnalyzer.js) é uma soma de heurísticas
   com pesos escolhidos manualmente, sem evidência de backtesting** —
   cerca de 12 parcelas somadas (EMA, RSI, ADX, tendência, slope,
   alinhamento, simetria, distância, multi-timeframe, peso histórico,
   bônus de direção, memória operacional, volatilidade). Nenhum teste no
   repositório valida que um score mais alto historicamente correlaciona
   com taxa de acerto real.

2. **Amostra histórica pequena tinha peso desproporcional.** Com só 10
   operações, `historyAnalyzer.js` já aplicava bônus/penalidade de até
   15 pontos no score. Auditoria do histórico de julho (ver correção do
   BUG-007 acima) mostrou pares com 1-5 operações influenciando o score
   com a mesma confiança que pares com 80+ operações.

3. **Multi-timeframe é raso** — só compara alinhamento de EMA entre
   5min e 15min; não considera timeframe maior, sessão de mercado
   (Londres/NY/Tóquio) nem eventos macro.

4. **Nenhuma checagem de correlação entre pares** abertos
   simultaneamente (ex.: EUR/USD e GBP/USD são altamente
   correlacionados via força do dólar; o sistema os trata como apostas
   independentes).

5. **`scripts/riskEngine.js` é um sistema de risco redundante e
   desconectado**, com bug próprio. `calcularRisco()` roda em
   `processarOperacaoSalva()` (scanner.js) só para o log de console,
   *depois* que `moneyManager.js`/`positionSizing.js` já decidiram
   lote/TP/SL de verdade — usa limiares de score completamente
   diferentes (80/85/90/95) dos de `decisionEngine.js`, e recebe
   `atr: resultado.operacao.atr`, campo que não existe no objeto salvo
   (o ATR real fica em `operacao.indicadores.atr`) — então o parâmetro
   ATR desse módulo é sempre 0, silenciosamente, e todo ramo que
   depende dele (`atr > tpUSD * 2`) nunca dispara. Não corrigido ainda
   — registrado para decisão futura (corrigir, integrar de verdade, ou
   remover).

6. **`qualidade === "LATERAL"` em `decisionEngine.js` é código morto.**
   `classificarQualidade()` (marketAnalyzer.js) só retorna
   `INSTITUCIONAL`/`FORTE`/`BOA`/`ACEITAVEL`/`CONFLITO` — nunca
   `"LATERAL"` — então esse branch da condição nunca é alcançado.

7. **Nenhuma justificativa gerada chega ao usuário.** `justificativas`
   (motivo do score, do risco, da decisão) são computadas e salvas no
   Firestore em vários pontos (`decisionEngine.js`, `riskEngine.js`,
   `moneyManager.js`), mas busca em todo `js/` (frontend) não encontra
   nenhuma ocorrência de "justificativa" — o app nunca exibe o "porquê"
   de uma aprovação/reprovação, apesar do dado já existir.

Correção aplicada nesta revisão (a mais barata e consensuada com o
usuário; as demais ficam registradas como recomendação, não decisão
ainda tomada):

- `scripts/statisticsEngine.js`: nova constante
  `OPERACOES_MINIMAS_HISTORICO = 30` (era 10 implícito, repetido em dois
  lugares) — usada tanto em `historicoSuficiente` quanto na
  classificação EXCELENTE/BOM/NEUTRO/RUIM do histórico. Abaixo de 30
  operações, o par permanece `SEM_DADOS` em vez de ser classificado com
  confiança que a amostra não sustenta.
- `scripts/decisionEngine.js`: `PERFIL_ANALISE.CONSERVADOR.operacoesMinimas`
  elevado de 10 para 30, mantido em paridade com o valor acima (módulos
  não compartilham import por design — comentário cruzado nos dois
  arquivos para quem for alterar um dos dois no futuro).

Recomendações não implementadas ainda, em ordem de prioridade sugerida
pelo autor desta revisão: (1) exibir as justificativas já geradas no
frontend; (2) separar o ajuste por histórico do score técnico de forma
mais explícita; (3) decidir o destino de `riskEngine.js` (corrigir,
integrar, ou remover); (4) filtro de correlação entre pares
simultâneos; (5) validação do modelo de score contra backtesting real.

Consenso com o usuário sobre o histórico de julho: ele deve ser tratado
como "contexto, não autoridade" — direcionalmente informativo para os
pares com volume real de operações (GBP/JPY e EUR/JPY, ambos com taxa
de acerto real abaixo de 50% após a correção do BUG-007), mas não como
base estatisticamente sólida para os demais pares. Dados gerados a
partir de 07/09/2026 em diante (pipeline corrigido, cron restaurado,
perfis funcionais) são o que deve construir confiança real daqui para
frente.
--------

BUG-010 — 4 campos da tela de Configurações gravavam no Firestore mas
nunca eram lidos pelo Scanner (delay/pares já funcionavam; cooldown,
candles, apiAtiva e janelaSeguranca não)

Severidade: ALTA para `candles` (risco de regressão grave se corrigido
sem cuidado — ver abaixo), MÉDIA para os outros três (o Scanner sempre
rodou com comportamento hardcoded, mas dentro de valores seguros).

Descoberto ao auditar, a pedido do usuário, cada campo de
`configuracoes/geral` contra o uso real em `scripts/scanner.js` após o
BUG-009. Diferente do BUG-009 (nada era gravado), aqui a gravação
funcionava — o valor chegava ao Firestore, mas o Scanner nunca lia de
volta, ou lia só para imprimir no console.

1. **`cooldown`** — `scripts/riskManager.js`'s `existeCooldown(db, par)`
   usava uma constante interna fixa (`COOLDOWN_MINUTOS = 30`), ignorando
   por completo `configuracao.cooldown`. O valor digitado na tela só
   aparecia em um `console.log` de resumo em `scanner.js`.

2. **`candles`** — existe desde sempre um campo separado, `outputsize`
   (nunca exposto na UI, default 250 hardcoded), que é o que de fato
   controla quantos candles a API retorna
   (`marketData.js`/`getCandles()`). O campo `candles` da tela (dropdown
   10/20/30/50) só era ecoado em log e no resumo salvo — nunca chegava
   perto de `outputsize`.

   **Achado crítico ao investigar o conserto**: `pairAnalyzer.js` calcula
   `ema200 = ema(200, closes)` sobre o array `closes` INTEIRO, sem
   `.slice()`. A função `ema()` retorna `null` sempre que
   `valores.length < periodo`. Ou seja, **qualquer outputsize abaixo de
   200 faz `ema200` retornar `null` sempre**, o que por sua vez faz
   `pairAnalyzer.js` abortar a análise do par com `status: "SEM_DADOS"`
   ("CANDLES INSUFICIENTES") — para TODO par, TODA execução. As 4
   opções que a tela de Config oferecia (10/20/30/50) estavam TODAS
   abaixo desse piso. Se o campo tivesse sido ligado diretamente ao
   `outputsize` sem correção adicional, o efeito seria pior que o bug
   original: o Scanner pararia de gerar qualquer sinal, silenciosamente,
   assim que alguém salvasse a tela de Config com qualquer uma das
   opções disponíveis.

3. **`apiAtiva`** — `selecionarApi(apiAtiva)` existe em `marketData.js`
   desde o BUG-002, mas o próprio comentário no código diz para nunca
   chamá-la dentro de `getCandles()` (resetaria o rodízio round-robin a
   cada requisição, recriando o bug de 429 que o BUG-002 corrigiu). Como
   não havia nenhum outro lugar que a chamasse, `apiAtiva` não tinha
   nenhum efeito — a rotação sempre come do índice 0 a cada
   reinicialização do processo do Scanner (execução do cron), nunca
   respeitando a preferência do usuário.

4. **`janelaSeguranca`** — declarada com default (30) em
   `CONFIG_PADRAO`, gravada pela tela de Config, mas nunca lida em
   nenhuma outra parte de `scanner.js`. Não gatilha nada.

Correção aplicada:

- `scripts/riskManager.js`: `existeCooldown(db, par, minutos)` agora
  aceita o cooldown como parâmetro (fallback `COOLDOWN_MINUTOS_PADRAO =
  30` se omitido). `scripts/pairAnalyzer.js` passa
  `configuracao?.cooldown`.
- `scripts/scanner.js`: `criarContextoExecucao()` agora calcula
  `outputsize = Math.max(configuracao.candles || configuracao.outputsize
  || 250, CANDLES_MINIMO_SEGURO)`, com `CANDLES_MINIMO_SEGURO = 200`
  como piso de segurança (protege inclusive documentos antigos do
  Firestore que ainda tenham um valor de `candles` abaixo do mínimo). O
  valor efetivo (já com o piso aplicado) é regravado em
  `configuracao.candles` para que logs e o resumo salvo reflitam o que
  realmente foi usado. `CONFIG_PADRAO.candles` também foi corrigido de
  20 para 250.
- `js/config.js`: dropdown de "Quantidade de Candles" trocado de
  10/20/30/50 (todos inseguros) para 200 (mínimo)/250
  (recomendado)/350/500, com texto explicando o porquê do piso. Default
  local também corrigido de 20 para 250. Campo "Janela de Segurança"
  ganhou uma frase explicando o que ele faz (antes era um número solto
  sem contexto).
- `scripts/marketData.js`: `configurarMarketData()` agora chama
  `selecionarApi(config.apiAtiva)` uma única vez por execução do
  Scanner (não a cada `getCandles()`) — define só o ponto de partida do
  rodízio round-robin daquela execução, sem reintroduzir o bug do
  BUG-002.
- `scripts/scanner.js`: `horarioOperacional()` agora subtrai
  `janelaSeguranca` (minutos) do `horarioFim` antes de comparar —
  deixa de abrir novas operações nos últimos N minutos antes do fim da
  janela operacional configurada. Com `janelaSeguranca = 0`, o
  comportamento é idêntico ao anterior (corte exatamente no
  `horarioFim`).

Validado via `scripts/riskManager.js` (mock de `db`, sem Firebase real)
e replicando a fórmula exata de `outputsize`/`horarioOperacional` em um
script isolado — 11 cenários, todos passando. Suite de perfis
(`validate-perfis.js`, 13 cenários) revalidada sem regressão.

Não validado ainda: comportamento ao vivo em produção (próxima execução
real do cron após o merge). Como de praxe neste projeto, os primeiros
ciclos após esta mudança devem ser acompanhados manualmente antes de
considerar "funcionando" — em especial confirmar que o outputsize
efetivo aparece corretamente no log e que nenhum par cai em
"CANDLES INSUFICIENTES" por causa desta mudança.
--------

BUG-011 — Janela operacional era global e igual pra todos os pares,
ignorando que cada moeda tem sua própria sessão de maior liquidez

Severidade: MÉDIA/OPORTUNIDADE (não era um bug de correção incorreta,
era uma simplificação que deixava a RMI cega pra sessão asiática por
completo, mesmo pra pares com lastro real nela).

Origem: o usuário lembrou de uma regra de negócio da RMI ("buscar
oportunidades nos melhores mercados e com menos volatilidade") ao ver,
num log real de produção, o scanner saindo com "FORA DO HORÁRIO
OPERACIONAL / 07:30 às 18:00" às 20h. Isso levantou a pergunta: por que
não considerar também a sessão asiática, já que "ser inteligente"
significa procurar o momento certo de cada mercado, não um único
horário fixo pra todo mundo?

Análise (mapa de sessão por moeda, horário de Brasília, sem DST desde
2019 no Brasil):

- JPY → sessão de Tóquio; AUD/NZD → sessão de Sydney/Tóquio.
- EUR/GBP/CHF → sessão de Londres; USD/CAD → sessão de Nova York.
- Dos 10 pares monitorados, aplicar a MESMA janela extra a todos seria
  contraproducente: EUR/GBP, por exemplo, é um cruzamento puramente
  europeu — fica com liquidez pior e mais ruidoso fora do horário de
  Londres. Adicionar uma janela asiática pra ele iria CONTRA a regra
  de "menor volatilidade", não a favor.

Correção/melhoria aplicada em `scripts/scanner.js`:

- `horarioOperacional(context)` renomeada para `dentroJanelaPadrao(context)`
  (mesma lógica de antes, sem mudança de comportamento) — deixou de
  ser chamada como gate único em `validarExecucao()`.
- Nova função `parNaJanelaOperacional(par, context)`: primeiro tenta a
  janela padrão (07:30–18:00 com `janelaSeguranca`); se o par estiver
  fora dela, checa se é um dos 4 pares com lastro real na sessão
  asiática (`PARES_JANELA_ASIA = USD/JPY, EUR/JPY, AUD/USD, NZD/USD`)
  e se está dentro da janela extra (19:00–23:59, segunda a quinta).
  GBP/JPY foi deliberadamente deixado de fora da janela asiática — é
  o cruzamento historicamente mais volátil da lista ("the beast"); a
  decisão foi priorizar "menor volatilidade" sobre "mais sinais" até
  haver dados reais mostrando que compensa incluí-lo.
- Simplificações deliberadas, documentadas no código pra não virarem
  mistério depois: a janela asiática não atravessa a meia-noite (evita
  bug de rollover de data, à custa de não cobrir a madrugada 00h-04h,
  que também tem alguma liquidez de Tóquio) e não inclui sexta à noite
  (o fechamento semanal real do mercado acontece por volta das 19h de
  Brasília na sexta, perto demais da janela extra pra arriscar).
- `validarExecucao()` não aborta mais a execução inteira quando o
  horário padrão fechou — cada par é avaliado individualmente dentro
  do loop (`executarAnalisePar()`), antes de qualquer chamada à API ou
  ao Firestore, pra não gastar cota com pares fora da janela.
- Novo contador `estatisticas.foraDaJanela`, impresso no resumo final,
  pra diferenciar "par fora da janela agora" de erro/sem sinal.

Decisão de arquitetura tomada (autorização direta do usuário: "vamos
seguir com o que for melhor pro app"): a tabela de pares/sessão é regra
fixa da RMI (hardcoded), não configurável na tela — é inteligência de
mercado, não preferência de usuário, consistente com a definição do
próprio usuário de que "RMI é toda a inteligência gerada pelo app".

Validado com script isolado replicando a fórmula exata das duas
funções (16 cenários: janela padrão, janela asiática por par elegível,
limites exatos de início/fim, exclusão de sexta e sábado, exclusão
deliberada de GBP/JPY, reabertura de domingo valendo pra todo par) —
todos passando. Suites `validate-perfis.js` e `validate-4-fixes.js`
revalidadas sem regressão.

Não validado ainda: comportamento ao vivo às 19h+ de um dia útil
(segunda a quinta), quando a janela asiática de fato entra em vigor
pela primeira vez em produção. Verificar no log que USD/JPY, EUR/JPY,
AUD/USD e NZD/USD são analisados nesse horário e que os demais pares
continuam corretamente fora ("fora da janela operacional deste par").

Recomendação registrada, não implementada: se os dados mostrarem que a
janela asiática realmente melhora a assertividade desses pares,
considerar estender pra 00h-04h (cobertura completa da sessão) e
reavaliar a inclusão de GBP/JPY com um critério de risco mais
conservador (ex.: score mínimo mais alto só pra ele nesse horário).

CORREÇÃO (mesmo dia): a versão acima usava `PARES_JANELA_ASIA` como
uma lista fixa de 4 strings. O usuário apontou o furo: a tela de
Config permite escolher entre 20 pares (`TODOS_PARES` em
`js/config.js`), não só os 10 monitorados por padrão — e pelo menos
6 dos outros 10 (`AUD/JPY`, `CAD/JPY`, `CHF/JPY`, `AUD/NZD`, `NZD/JPY`,
`EUR/AUD`) têm lastro asiático tão forte quanto ou mais forte que os 4
da lista fixa, mas cairiam sempre na janela comum se o usuário os
ativasse — a regra quebraria silenciosamente, sem log de erro nenhum,
o mesmo padrão de falha silenciosa do BUG-009/BUG-010.

Corrigido: `PARES_JANELA_ASIA` (lista de pares) virou
`MOEDAS_JANELA_ASIA = {JPY, AUD, NZD}` (conjunto de moedas) mais
`PARES_JANELA_ASIA_EXCLUIDOS = {GBP/JPY}` (única exceção nomeada).
Nova função `parElegivelJanelaAsia(par)` faz `par.split("/")` e checa
se a moeda base OU a cotada está no conjunto elegível, excluindo
GBP/JPY explicitamente. Isso vale automaticamente pra qualquer um dos
20 pares de `TODOS_PARES`, hoje ou se a lista crescer no futuro — não
depende mais de alguém lembrar de atualizar uma lista fixa toda vez
que um par novo for adicionado à tela de Config.

Revalidado com o mesmo script isolado, agora com 24 cenários
(8 novos cobrindo especificamente pares fora da lista fixa antiga:
AUD/JPY, AUD/NZD, NZD/JPY, CAD/JPY, CHF/JPY, EUR/AUD elegíveis;
EUR/CAD, GBP/CHF não-elegíveis) — todos passando, sem regressão nas
demais suítes.

CORREÇÃO (mesmo dia, ao pesquisar fontes pra uma feature nova de
"sugestão por par"): `JANELA_ASIA_INICIO` estava em 19:00, mas a
sessão de Tóquio abre de fato às 00:00 GMT = 21:00 de Brasília
(GMT-3, sem DST) — confirmado via [Babypips - Forex Trading
Sessions](https://www.babypips.com/learn/forex/forex-trading-sessions)
e [Dukascopy - Forex Market Hours](https://www.dukascopy.com/swiss/english/fx-market-tools/forex-market-hours/).
As 19:00–21:00 eram, na prática, um vácuo de liquidez entre o fim de
Nova York e a abertura real de Tóquio - a janela original cobria 2h
que não correspondem a nenhuma sessão ativa. Corrigido pra
`JANELA_ASIA_INICIO = 21 * 60`. Revalidado com o mesmo script (24
cenários, ajustados pro novo horário) — sem regressão.
--------

FEATURE-001 — "Sugestão de Agora" no Dashboard (js/pairInsights.js)

Origem: usuário propôs um "detalhamento sobre cada par" que virasse
sugestão de quando operar. Discussão explícita sobre limites: nem
usuário nem Claude são analistas profissionais de mercado — a saída
adotada foi rotular claramente DUAS camadas separadas, nunca
apresentadas como uma coisa só:

1. **Estrutura de mercado** — fatos públicos (sessão de maior liquidez,
   classificação major/cross, tier de volatilidade histórica: BAIXA/
   MÉDIA/ALTA, nunca pip exato porque o número varia por fonte e fica
   desatualizado). Fontes citadas ao usuário no momento da proposta:
   Babypips (Forex Trading Sessions), Dukascopy (Forex Market Hours e
   10 Most Volatile Forex Pairs), offbeatforex.com (Average Daily
   Range table), PriceActionNinja (Forex Pair Volatility Cheatsheet).
   Tabela completa dos 20 pares revisada e aprovada pelo usuário antes
   de virar código.
2. **Desempenho real do RMI no par** — taxa de acerto e tamanho de
   amostra calculados a partir do histórico real de operações do
   próprio usuário (Firestore), reaproveitando os MESMOS limiares de
   `scripts/statisticsEngine.js` (`OPERACOES_MINIMAS_HISTORICO = 30`
   pra virar EXCELENTE/BOM/NEUTRO/RUIM; abaixo disso, SEM_DADOS).

Implementação: `js/pairInsights.js` (novo arquivo, carregado antes de
`js/app.js` em `index.html`), com um card "Sugestão de Agora" no
Dashboard (`js/expert.js`) e o hook de pós-renderização em `js/app.js`
(mesmo padrão usado pra Histórico/Config desde o BUG-009 - sem esse
hook o card ficaria travado em "Carregando...").

Achado durante a pesquisa de fontes: a janela asiática de BUG-011
estava calibrada errada (19h em vez de 21h) — corrigido junto, ver
entrada de BUG-011 acima.

Duplicação deliberada e documentada: a lógica de janela
(`dentroJanelaPadrao`/`parNaJanelaOperacional`/`parElegivelJanelaAsia`)
é uma cópia manual da mesma lógica em `scripts/scanner.js` — o
frontend roda no navegador e não pode fazer `require()` de um módulo
Node. Qualquer mudança futura na regra de janela em `scanner.js`
precisa ser replicada aqui manualmente, ou o Dashboard passa a sugerir
algo diferente do que o Scanner realmente decide. Mesmo risco existe
pro limiar `OPERACOES_MINIMAS_HISTORICO`, duplicado de
`statisticsEngine.js`.

Validado:
- Lógica de janela: 14 cenários, executados de verdade num sandbox
  Node (`vm.runInContext`) contra o código real de `pairInsights.js`,
  todos batendo com o comportamento do backend.
- `PERFIL_PARES` cobre exatamente os 20 pares de `TODOS_PARES`
  (`js/config.js`) — nem faltando, nem sobrando nenhum.
- `classificarDesempenho()`: 5 cenários (EXCELENTE/BOM/NEUTRO/RUIM/
  SEM_DADOS), todos corretos.
- Testado no navegador de verdade (Playwright, Chromium headless)
  servindo o app localmente: confirmado que o card aparece na posição
  certa, que erro de rede (Firestore/CDN bloqueados neste sandbox) cai
  no fallback gracioso sem quebrar o resto da página, e — com um "db"
  simulado injetado via `page.evaluate` — que o conteúdo real (duas
  camadas combinadas, rótulo de confiabilidade reagindo ao tamanho da
  amostra) renderiza corretamente.

Não validado: comportamento com o Firestore real do projeto (rede
deste ambiente bloqueia o CDN do Firebase - ver seção "Ambiente" no
início deste documento). Usuário precisa confirmar visualmente no app
publicado que o card aparece e faz sentido com os pares reais
monitorados.

Recomendação registrada, não implementada: reaproveitar `PERFIL_PARES`
pra um card por par na tela de Config (ideia mencionada pelo usuário,
não descartada, só não é o escopo desta primeira versão).
--------

BUG-012 — Dashboard mostrava "Modo Atual: Expert" fixo, sempre, pra
qualquer perfil configurado

Severidade: MÉDIA (informação exibida ao usuário estava
sistematicamente errada, contradizendo a própria decisão de reverter
o perfil "Expert RMI" tomada mais cedo nesta mesma sessão).

Descoberto pelo usuário ao vivo, olhando o Dashboard publicado logo
após validar o FEATURE-001 (print mostrando "Modo Atual: Expert" às
20:57 de 07/09/2026). `js/expert.js`'s `dashboardView()` tinha
`<div class="big-number">Expert</div>` como texto literal, sem `id`,
nunca atualizado por nenhum script — sobra de antes da reversão do
perfil "Expert RMI" (ou de uma versão ainda mais antiga do app).
Resultado: o Dashboard sempre exibia "Expert" independente do que
estivesse de fato salvo em `configuracoes/geral.perfil`
(agressivo/balanceado/conservador).

Corrigido: `div` ganhou `id="modoAtual"`; nova função
`renderModoAtual()` em `js/expert.js` lê `configuracoes/geral.perfil`
de verdade e mapeia pro rótulo correspondente (rótulos duplicados de
`PERFIS_OPERACIONAIS` em `js/config.js` de propósito, pra este arquivo
não depender da ordem de carregamento dos `<script>` em `index.html`
- mesmo padrão de duplicação documentada do FEATURE-001). Fallback pra
"Balanceado" se o documento não existir ou o campo estiver vazio,
consistente com o fallback já usado em `scanner.js`/`decisionEngine.js`.
Hook de pós-renderização da aba "dashboard" em `js/app.js` atualizado
pra chamar também `renderModoAtual()`.

Validado com Playwright (Chromium headless) e um `db` simulado
injetado via `page.evaluate`, testando os 3 perfis reais mais o caso
de documento inexistente — os 4 cenários retornaram o rótulo correto
("🟢 Agressivo", "🟡 Conservador", "🔵 Balanceado" e o fallback
"🔵 Balanceado" quando não há config salva).
--------

LIMPEZA-001 — Textos de frontend ainda referenciavam "Expert" (sobra
de antes da RMI existir como conceito)

Usuário notou que, por ter focado a atenção na RMI e não no frontend
em períodos anteriores, vários textos visíveis ficaram para trás
referenciando "Expert" (nome de uma versão/tier anterior do app),
enquanto o nome atual do produto é "Forex Assist — Real Money
Intelligence".

**Convenção de nome definida pelo usuário (08/09/2026): FARMI** —
abreviação de Forex Assist + RMI, para uso em texto de UI/branding
voltado ao usuário daqui em diante. Distinção importante: **FARMI é o
nome de marca (UI-facing)**; **RMI continua sendo o termo técnico
interno** (arquitetura, pipeline de análise, comentários de código,
esta documentação) — não é uma substituição de RMI, é o nome comercial
que aparece pra quem usa o app.

Trocado:
- `index.html`: `<title>` de "Forex Assist V5 Expert Alpha" para
  "Forex Assist - FARMI".
- `js/app.js`: subtítulo no cabeçalho do app, de "V5 Expert Alpha"
  para "FARMI".
- `js/scanner.js`: título do card na aba Scanner, de "Scanner Expert"
  para "Scanner FARMI".

Não alterado (não era "Expert" perdido, já estava correto):
`manifest.json` (nome ao instalar como PWA: "Forex Assist - Real
Money"). Não alterado por ser nome de arquivo interno, não texto de
UI: `js/expert.js` (mantém o nome do arquivo; o conteúdo já foi
corrigido no BUG-012).

Daqui pra frente: ao criar ou revisar qualquer texto voltado ao
usuário (telas, notificações, títulos), usar "FARMI" em vez de
"Expert" ou variações antigas.

**REVERTIDO (mesmo dia)**: usuário decidiu não usar a abreviação
"FARMI" no texto de UI, preferindo o nome por extenso "Real Money
Intelligence". Os 3 mesmos locais trocados de volta:
- `index.html`: `<title>` → "Forex Assist - Real Money Intelligence".
- `js/app.js`: subtítulo do cabeçalho → "Real Money Intelligence".
- `js/scanner.js`: título do card do Scanner → "Scanner Real Money
  Intelligence".

Convenção atualizada: usar "Real Money Intelligence" (por extenso) em
texto de UI voltado ao usuário; "RMI" continua sendo a sigla usada
internamente (código, documentação). "FARMI" não está mais em uso em
nenhum lugar do app.
--------

BUG-013 — js/historico.js: duas tags `</div>` sobrando no card
corrompiam o agrupamento por data quando havia mais de um sinal no
mesmo dia

Severidade: ALTA (bug estrutural pré-existente, não introduzido nesta
sessão, mas que anulava na prática a correção de agrupamento por data
feita mais cedo - o usuário reportou "histórico não está agrupando
por data minimizadas, nem o botão minimizar tudo" com prints mostrando
comportamento inconsistente).

Investigação inicial suspeitou de cache do Service Worker (ver
LIMPEZA-002 abaixo, problema real e corrigido em paralelo), mas ao
testar a lógica isoladamente com Playwright + Firestore simulado,
usando um cenário com 3 sinais no MESMO dia (28/07/2026, reproduzindo
o histórico real do usuário), o bug apareceu de forma reprodutível
mesmo sem cache nenhum: só o PRIMEIRO sinal do dia aparecia dentro da
`<div id="dataXXXXXXXX">` do grupo; os outros dois apareciam soltos no
HTML final, fora da div do grupo.

Causa raiz: o template do card (dentro de `carregarHistorico()`) tinha
duas tags `</div>` sem abertura correspondente, logo após o `<label>`
de "Operação Real" - contagem de `<div`/`</div>` no card renderizado
mostrava sistematicamente 2 fechamentos a mais que aberturas, em
QUALQUER combinação de campos (com/sem `movimentoPips`, com/sem
`status`). Como cada card é uma string HTML concatenada
(`gruposPorData[data] += card`) e inserida via `innerHTML`, esses 2
fechamentos extras "vazavam" e fechavam prematuramente a `div` do
grupo de data e a `div` externa do próprio grupo (bordered container),
corrompendo a estrutura de TODOS os elementos seguintes no HTML - não
só o segundo sinal do mesmo dia, mas potencialmente o agrupamento dos
dias seguintes também, dependendo de quantos sinais cada dia tivesse.

Corrigido: removidas as duas tags `</div>` órfãs (logo após
`</label>` e logo após o bloco condicional "Disponível após o
encerramento da operação"). Verificado que o card agora fecha
exatamente o que abre (`opens === closes`) em 3 combinações de campos
testadas (sem pips; com pips+financeiro+ENCERRADA; com pips+ABERTA).

Validado com Playwright (Chromium headless), Firestore simulado com 5
sinais em 3 datas diferentes (3 no mesmo dia, replicando o cenário
real): antes da correção, o grupo com 3 sinais só continha 1 no DOM;
depois da correção, contém os 3, e o toggle de expandir/colapsar
funciona corretamente pros 3 grupos. Suite anterior (cenário com
"hoje") revalidada sem regressão.

Nota: este bug é anterior a esta sessão - não foi introduzido pelas
mudanças de `datasAbertas`/bordered-container feitas mais cedo. Só
ficou mascarado porque a maioria dos testes anteriores usava datas com
apenas 1 sinal cada.
--------

LIMPEZA-002 — Service Worker podia servir arquivo desatualizado do
cache HTTP do navegador mesmo em modo "network-first"

Origem: usuário notou, em prints, que o `<title>` da aba já mostrava
"Forex Assist - FARMI" (deploy novo) mas o corpo da página ainda
mostrava "V5 Expert Alpha" (deploy antigo) - ou seja, `index.html`
atualizou mas `js/app.js` não, na mesma visita.

Causa: `sw.js`'s handler de "fetch" já era "network-first" (tenta
`fetch()` antes de cache), mas chamava `fetch(e.request)` sem forçar
bypass do cache HTTP do próprio navegador (camada abaixo do Service
Worker) - dependendo dos headers de cache que o GitHub Pages manda pra
cada arquivo, o `fetch()` podia ser silenciosamente respondido pelo
cache do navegador, sem round-trip de rede nenhum, mesmo com a
estratégia "network-first" do SW.

Corrigido: `fetch(e.request, { cache: "no-store" })` - força ignorar o
cache HTTP do navegador em toda requisição, indo sempre à rede de
verdade (o fallback pra `caches.match()` no `.catch()` continua
existindo pra funcionar offline). `CACHE_NAME` elevado de v8 pra v9
pra forçar um ciclo novo de instalação/ativação do Service Worker.

Não elimina 100% a necessidade de um usuário eventualmente limpar
cache manualmente após um deploy problemático anterior a esta
correção (o Service Worker antigo, já instalado no navegador, pode
levar um ciclo de reload pra ativar o novo) - mas previne que o mesmo
problema se repita em deploys futuros.
--------

FEATURE-002 — Botão "Aplicar esses pares na Configuração" na Sugestão
de Agora

Origem: usuário propôs um botão que, ao clicar, "marcasse" os pares
sugeridos como os pares monitorados, e ao desmarcar voltasse ao padrão
da configuração.

Objeção levantada antes de implementar: o Scanner já filtra por par
dinamicamente a cada ciclo (`parNaJanelaOperacional`, ver BUG-011) -
pares fora da janela são pulados automaticamente, sem custo. Se o
botão sobrescrevesse `configuracoes/geral.pares` direto no Firestore
com só os pares sugeridos NO MOMENTO DO CLIQUE, o risco real era o
usuário esquecer de reverter - o Scanner ficaria cego pros outros
pares mesmo quando entrassem na janela deles depois (ex.: aplicar às
21h vendo USD/JPY, esquecer, e o Scanner não tentar mais EUR/USD às 8h
da manhã porque nem está mais na lista). Isso iria contra a própria
razão de existir do BUG-011 (buscar o melhor mercado a cada momento,
não travar num instantâneo).

Usuário escolheu a alternativa mais segura proposta: o botão NÃO grava
nada no Firestore diretamente. Ele prepara um RASCUNHO local
(localStorage, o mesmo mecanismo que a tela de Config já usa antes de
"Salvar Configurações") com `pares` substituído pelos pares
atualmente sugeridos, e leva o usuário pra aba Config pra revisar e
confirmar manualmente. Nada de produção muda até o clique explícito em
"Salvar Configurações".

Implementação:
- `js/pairInsights.js`: botão `#btnAplicarSugestao` (com
  `data-tab="config"`, reaproveitando o listener de navegação global
  já existente em `js/app.js`) aparece só quando há pelo menos 1 par
  sugerido no momento (nunca aparece com a lista vazia - evitaria
  aplicar uma configuração com ZERO pares, que faria o Scanner parar
  de rodar por completo). Onclick lê o rascunho local via
  `carregarConfiguracoes()`, substitui `pares` pelos sugeridos, salva
  via `salvarConfiguracoes()` (ambas funções de `js/config.js`,
  reaproveitadas diretamente - diferente da duplicação deliberada da
  lógica de janela, aqui os dois arquivos rodam no mesmo runtime de
  navegador, então é reuso normal, não duplicação) e marca
  `sessionStorage.sugestaoAplicada`.
- `js/config.js`: nova `avisoSugestaoAplicada()`, chamada no topo da
  seção "Pares Monitorados" - lê e apaga a flag da sessionStorage,
  mostrando um aviso ("pares pré-selecionados... nada foi salvo ainda")
  só na primeira renderização após o clique, nunca em visitas
  seguintes.

Validado com Playwright (Chromium headless), Firestore simulado com 6
pares monitorados (2 elegíveis pra janela agora): confirmado que (1)
o botão só aparece com sugestão não-vazia, (2) o clique troca pra
Config, grava exatamente os pares sugeridos no rascunho local (não no
Firestore), marca certo/errado os 20 checkboxes de `TODOS_PARES`, e
mostra o aviso; (3) o aviso aparece na primeira visita à Config e
desaparece nas seguintes. Suites de regressão anteriores revalidadas
sem falha.
--------

FEATURE-003 — Botão "Voltar para a Última Configuração Salva" na tela
de Config

Origem: contrapartida natural do FEATURE-002 - depois de existir um
jeito de pré-preencher a tela sem salvar (botão "Aplicar esses
pares"), fazia falta um jeito de descartar essa edição não salva (ou
qualquer edição manual) e voltar pro que está de fato gravado no
Firestore.

Achado ao implementar: `configView()` nunca lia o Firestore
diretamente - `carregarConfiguracoes()` sempre lia só o rascunho local
(`localStorage.forexConfig`), preenchido pela última vez que a tela
foi salva OU editada localmente (ex.: pelo botão do FEATURE-002).
Ou seja, a tela de Config nunca teve, até agora, um caminho pra
re-sincronizar com o que está realmente salvo no banco depois de uma
edição não confirmada.

Implementação (`js/config.js`):
- Nova `restaurarConfiguracaoSalva()`: busca `configuracoes/geral` no
  Firestore, mescla com `configuracaoPadrao()` (garante todos os
  campos, mesmo que o documento não tenha sido migrado com algum
  campo novo), traduz `tipoConta` (maiúsculo, formato do Firestore)
  de volta pra `conta` (minúsculo, formato da tela) - o inverso exato
  da tradução feita ao salvar - e grava o resultado como o novo
  rascunho local via `salvarConfiguracoes()`.
- Novo botão `#btnRestaurarConfig`, abaixo de "Salvar Configurações".
  Ao clicar, chama `restaurarConfiguracaoSalva()` e depois `app.render()`
  pra redesenhar a tela com os valores restaurados (o hook de
  pós-renderização da aba "config" em `js/app.js`, já existente desde
  o BUG-009, re-liga os eventos automaticamente). Se não houver
  documento salvo ou a leitura falhar, mostra aviso temporário em vez
  de travar.

Validado com Playwright (Chromium headless): simulado um rascunho
local não salvo (perfil "agressivo", 3 pares diferentes) enquanto o
Firestore simulado tinha outro conjunto salvo (perfil "conservador",
2 pares, conta REAL, horários diferentes). Antes de clicar, a tela
mostrava o rascunho não salvo; depois de clicar em "Voltar para a
Última Configuração Salva", a tela passou a refletir exatamente o que
estava no Firestore simulado, incluindo a tradução `tipoConta` →
`conta`. Suites de regressão anteriores revalidadas sem falha.
--------

FEATURE-004 — Presets de janela horária (Londres/Nova York/Ásia) +
remoção do checkbox morto "Scanner Ativo"

Origem: usuário pediu revisão completa da aba Config e propôs presets
de mercado pra não precisar digitar horário manualmente. Antes de
implementar, análise crítica levantou 3 pontos, todos incorporados na
decisão final:

1. **Nova York estava faltando da lista original** (usuário só citou
   Londres/Ásia/Ambos) - o horário padrão histórico (07:30-18:00) é,
   na prática, Londres+NY, não Londres+Ásia. Resolvido tratando Nova
   York como um preset próprio, não escondido dentro de "Ambos".
2. **Preset "Ásia" precisa atravessar a meia-noite** pra cobrir a
   madrugada (overlap Sydney/Tóquio até ~04:00 de Brasília) - a
   função de janela padrão não suportava isso (limitação conhecida,
   já documentada como recomendação futura no BUG-011).
3. **Risco de colisão com a janela adicional automática do BUG-011**:
   se o preset "Ásia" mudasse a janela PADRÃO global, isso faria a
   RMI escanear TODOS os pares (inclusive os ruins fora de Londres,
   tipo EUR/GBP) de madrugada. Decisão: o preset só mexe na janela
   padrão global (`horarioInicio`/`horarioFim`); a lógica de
   `parElegivelJanelaAsia()` por moeda continua intocada, agindo por
   cima, independente do preset escolhido.

Implementação:

- `scripts/scanner.js` e `js/pairInsights.js` (cópia documentada):
  `dentroJanelaPadrao()` agora suporta `horarioFim < horarioInicio`
  (janela atravessando a meia-noite). Segurança adicional: uma janela
  que atravessa a meia-noite nunca INICIA na sexta à noite (o pregão
  real fecha por volta das 19h de Brasília nesse dia, o que
  `mercadoAberto()` não modela - só exclui sábado inteiro); a
  CONTINUAÇÃO de uma janela que já começou na noite de quinta (viraria
  madrugada de sexta) continua permitida normalmente. Sábado continua
  sempre fechado, sem exceção.
- `js/config.js`: novos campos `presetHorario`
  ("personalizado"/"londres"/"novaYork"/"asia") e `asiaMadrugada`
  (boolean). `PRESETS_HORARIO` mapeia cada preset pros valores reais
  de `horarioInicio`/`horarioFim` - o backend nunca lê `presetHorario`
  diretamente, só os dois campos resultantes, então presets são pura
  conveniência de UI, sem exigir que o Scanner saiba que eles existem.
  Selecionar um preset preenche e desabilita os campos de horário
  manual (ficam somente leitura, visíveis pra transparência); voltar
  pra "Personalizado" reabilita a edição manual. Checkbox extra
  "Operar também de madrugada" só aparece com "Ásia" selecionado.
- Removido o checkbox "Scanner Ativo" da tela (não gravava mais no
  payload, não lia mais do DOM, campo removido de
  `configuracaoPadrao()`). Também removido `scannerAtivo: true` de
  `CONFIG_PADRAO` em `scripts/scanner.js` - nada no backend lia esse
  campo (confirmado por auditoria: o gate real é a função separada
  `scannerAtivo()`, que consulta `scanner/status.ativo`, controlado
  pelos botões Start/Stop da aba Scanner). Documentos antigos no
  Firestore que ainda tenham esse campo ficam com um valor morto
  inofensivo, sem necessidade de migração.

Validado:
- Lógica de virada de meia-noite: 13 cenários isolados (início da
  noite, continuação na madrugada, limite exato do fim com e sem
  `janelaSeguranca`, exclusão de sexta à noite pra iniciar janela nova
  mas permitindo a continuação de quinta, sábado sempre fechado mesmo
  como "continuação", regressão da janela sem virada) - todos
  passando.
- UI testada com Playwright (Chromium headless): checkbox "Scanner
  Ativo" confirmado ausente da tela; estado inicial correto
  (Personalizado, campos habilitados); selecionar Londres preenche e
  desabilita os campos corretamente; selecionar Ásia mostra o
  checkbox de madrugada; marcar madrugada estende o horário final pra
  04:00; voltar a Personalizado reabilita os campos; salvar com Nova
  York selecionado grava exatamente os campos esperados no Firestore
  simulado, sem nenhum resquício de `scannerAtivo` no payload.
- Suites de regressão anteriores (perfis, janela asiática por moeda,
  4 campos do BUG-010, checker, schedule) revalidadas sem falha.
--------

BUG-014 — Zero sinais num dia inteiro: RESOURCE_EXHAUSTED do Firestore
bloqueou até o carregamento da configuração

Severidade: CRÍTICA (não era regra de análise rigorosa nem "dia
fraco" - o Scanner não conseguiu nem ler a configuração nem os
candles em nenhum dos 10 pares, o dia inteiro).

Descoberto ao vivo: usuário perguntou por que nenhum sinal saiu no
dia, achando que fosse rigor demais do perfil ou fraqueza do mercado.
Log real do "Forex Scanner Real" mostrou, pra TODOS os 10 pares:
`ERRO ... 8 RESOURCE_EXHAUSTED: Quota exceeded`, e a mesma mensagem
já no carregamento da configuração, antes de qualquer par ser
analisado. O código `8`/`RESOURCE_EXHAUSTED` é formato de status gRPC
- assinatura do SDK do Firestore, não da API de candles (TwelveData
usa REST simples, erro em outro formato). Ou seja: a cota do
Firestore (não a de dados de mercado) estourou, e isso derrubou o
Scanner inteiro antes de qualquer análise real acontecer.

Causa raiz identificada: `js/expert.js` e `js/scanner.js` cada um tem
um `setInterval` independente, rodando a cada **2 segundos**, lendo o
mesmo documento (`scanner/status`), enquanto a aba correspondente do
app estiver aberta no navegador (o guard `if (!el) return` evita o
fetch quando a aba não está visível, mas ainda assim: com a aba
Dashboard ou Scanner aberta por algumas horas, esse polling sozinho
soma milhares de leituras/dia). Cota do Firestore é do PROJETO
inteiro, compartilhada entre o app no navegador (SDK client) e o
Scanner rodando no GitHub Actions (SDK admin) - estourar de um lado
derruba o outro, mesmo sendo processos totalmente separados.

Achado no mesmo log: depois dos erros de cota, `registrarExecucao()`
também falhava (`Cannot use "undefined" as a Firestore value (found
in field "saldoAtual")`) - quando `carregarConfiguracao()` cai no
fallback `CONFIG_PADRAO` (que não tem `saldoSimulado`/`saldoReal`,
só `saldoInicial`), o cálculo de `saldoAtual` resultava `undefined`,
e o Firestore rejeita isso na escrita.

Correção aplicada:

- `js/expert.js` e `js/scanner.js`: intervalo de polling elevado de
  2000ms pra 15000ms (7,5x menos leituras enquanto a aba estiver
  aberta).
- `scripts/scanner.js`: `saldoAtual` agora cai em
  `configuracao.saldoInicial` (e por fim `0`) se
  `saldoSimulado`/`saldoReal` estiverem `undefined`, em vez de tentar
  gravar `undefined` no Firestore. Validado que `saldoSimulado/saldoReal
  = 0` (saldo genuinamente zerado) continua sendo respeitado como 0,
  não confundido com "não definido" (usa `??`, não `||`).

Validado: cálculo de `saldoAtual` testado isoladamente em 5 cenários
(fallback sem saldo, saldo simulado normal, saldo real normal, pior
caso sem nenhum saldo, saldo genuinamente zero) - todos corretos.
Suites de regressão anteriores revalidadas sem falha.

Achado adicional, não implementado ainda nesta correção - ver
BUG-015: ao recalcular o orçamento de consultas da TwelveData (2400/dia
via rotação de 3 chaves) à luz da janela asiática adicionada no
BUG-011, o consumo estimado ultrapassa o orçamento.
--------

BUG-015 — Janela asiática do BUG-011 estoura o orçamento diário da
TwelveData (não corrigido ainda - proposta registrada)

Origem: ao investigar o BUG-014, usuário lembrou que o orçamento real
da TwelveData (com rotação de 3 chaves) é de ~2400 consultas/dia -
número calculado numa sessão anterior com outra IA, não documentado
até agora neste arquivo.

Cálculo (cron a cada 5 minutos, 2 chamadas por par por ciclo - candle
de 5min + candle de 15min):

- Janela padrão (07:30 até 17:30 com `janelaSeguranca`, 10h = 120
  ciclos) × 10 pares × 2 chamadas = **2.400 chamadas** - já bate o
  teto exato, sozinha.
- Janela asiática adicional do BUG-011 (21:00-23:59, ~36 ciclos) ×
  pares elegíveis (ex.: 4 de 10, JPY/AUD/NZD) × 2 chamadas =
  **+288 chamadas**.
- Total estimado: **~2.688/dia contra um orçamento de 2.400** (~12%
  acima).

A janela asiática foi desenhada e validada olhando só a correção
analítica (sessão de mercado certa por par) - o custo em chamadas de
API não foi calculado na hora, ficando descoberto só agora. Falha do
autor da mudança, registrada aqui sem retoque.

Proposta (não implementada ainda, pendente de validação cuidadosa por
mexer direto no pipeline de busca de candle): cachear o candle de
15min entre ciclos - hoje ele é buscado de novo a cada 5 minutos
mesmo só mudando a cada 15, ou seja, 2 em cada 3 buscas trazem
exatamente o mesmo dado. Como cada execução do Scanner é um processo
novo do GitHub Actions (sem memória entre execuções), o cache
precisaria ser persistido no Firestore (ex.: `cache/candles15min/{par}`
com o candle e o horário da última busca), lido a cada ciclo pra
decidir se uma busca nova é necessária. Estimativa com o cache: janela
padrão cai pra ~1.600 chamadas, janela asiática pra ~192 - total
~1.792/dia, ~25% de folga sobre o orçamento de 2.400.

Não implementado nesta sessão - fica registrado como próximo passo,
condicionado à aprovação do usuário antes de mexer em
`scripts/marketData.js`/`scripts/pairAnalyzer.js`.
--------

FEATURE-005 — Medidor ao vivo de consumo estimado de API na tela de
Config (guarda-corpo pro orçamento do BUG-015)

Origem: usuário decidiu manter a folga negativa atual (não implementar
o cache de candle de 15min agora) mas pediu uma "trava": quantos pares
a mais dá pra analisar sem estourar as 2.400 consultas/dia, e que a
tela avise quando o limite for excedido - assim, se faltar sinal de
novo, dá pra saber na hora se é questão de orçamento de API ou outra
causa, sem precisar reabrir o log do GitHub Actions.

Implementação (`js/config.js`):
- `calcularConsumoEstimadoTwelveData(config)`: reaplica a mesma
  fórmula usada pra chegar em "~2688/dia" no BUG-015 (120 ciclos ×
  pares × 2 chamadas na janela padrão + ciclos da janela asiática
  automática × pares elegíveis × 2), agora calculada a partir do que
  está de fato marcado na tela, com suporte a janela atravessando
  meia-noite (reaproveita a mesma lógica de `dentroJanelaPadrao()`).
  Retorna também o custo marginal de UM par adicional, separado em
  "sem lastro asiático" e "com lastro asiático" (que entra também na
  janela automática do BUG-011, custando mais) - resposta direta a
  "quantos pares a mais".
- `parElegivelJanelaAsiaCfg()`: 3ª cópia documentada da mesma regra de
  `scripts/scanner.js`/`js/pairInsights.js` (BUG-011) - deliberada,
  pra esta tela não depender da ordem de carregamento de outro
  `<script>`.
- Novo card "📡 Consumo estimado de API" acima de "Pares Monitorados":
  mostra o total estimado contra o orçamento de 2.400, com aviso
  vermelho explícito ("Limite de pares excedido") quando ultrapassa,
  ou confirmação verde com a folga restante quando está dentro.
  Recalcula AO VIVO (antes de salvar) a cada mudança que afeta a
  conta: marcar/desmarcar par, trocar preset de horário, marcar
  "madrugada", editar horário manual ou janela de segurança - tudo via
  `atualizarConsumoApi()`, chamada nos mesmos handlers já existentes
  em `bindConfigEvents()`.
- Constante `MINUTOS_POR_CICLO_SCANNER = 5` documentada como
  suposição: o intervalo real do cron é definido externamente
  (cron-job.org), fora do alcance deste app - se mudar lá, esta conta
  precisa ser atualizada aqui manualmente.

Validado:
- `calcularConsumoEstimadoTwelveData()`: 13 cenários isolados (10
  pares padrão batendo exatamente com os ~2688/dia do BUG-015; 8 pares
  voltando pra dentro do orçamento; zero pares; janela atravessando
  meia-noite calculada corretamente; custos marginais corretos).
- UI testada com Playwright: estado inicial mostra 2688/2400 com aviso
  de excesso; desmarcar os 2 pares JPY mais caros (EUR/JPY, GBP/JPY)
  traz de volta pra dentro do orçamento ao vivo, sem precisar salvar;
  remarcar volta a mostrar o aviso.
- Suites de regressão anteriores revalidadas sem falha.

Isso é só o AVISO (visibilidade), não um bloqueio - o usuário ainda
pode salvar uma configuração acima do orçamento se quiser assumir o
risco conscientemente. O cache do candle de 15min (BUG-015) continua
como a correção estrutural pendente, não implementada.
--------

CONFIRMAÇÃO BUG-014 + reforço adicional - cota do Firestore confirmada
estourada no console real; polling pausado em segundo plano

Usuário testou de novo mais tarde no mesmo dia (celular, horário
personalizado até meia-noite, menos pares) e viu o mesmo log de
`RESOURCE_EXHAUSTED`, com a configuração ainda caindo no
`CONFIG_PADRAO` (Horário 07:30-18:00, Pares 10 - não os valores que
ele tinha acabado de salvar). Confirmado: enquanto a leitura da
configuração falhar por causa da cota, o Scanner nunca chega a ver as
mudanças salvas - qualquer teste de configuração nesse estado é
inconclusivo, não reflete o que foi configurado.

Usuário então abriu o console do Firebase (Firestore → Uso) e
confirmou visualmente a causa raiz do BUG-014: aviso "Seu projeto
ultrapassou os limites sem custo financeiro", gráfico mostrando ~55
mil leituras no dia contra o teto gratuito de 50 mil, subindo forte a
partir de ~8h da manhã - consistente com os dois `setInterval` de 2
segundos identificados no BUG-014.

Reforço adicional aplicado no mesmo lote (`js/expert.js` e
`js/scanner.js`): os dois pollings agora checam `document.hidden` logo
no início de cada tick e retornam sem consultar o Firestore se a aba
não estiver em primeiro plano (tela apagada no celular, outro app ou
outra aba em foco). O intervalo de 15s sozinho ainda dependia de
quanto tempo a aba ficava aberta, mesmo em segundo plano - esse é o
cenário real mais provável de pesar na cota (celular com o app aberto
por horas). Com a cota diária do Firestore já estourada no momento
desta correção, o Scanner só volta a funcionar quando a cota resetar
(reset diário automático da Google, horário exato não verificável
daqui) - a correção evita repetição, não desfaz o consumo já feito.

Validado com Playwright: zero leituras simuladas durante 16 segundos
com `document.hidden = true` (mais que um ciclo inteiro de 15s);
volta a ler normalmente ao voltar pro primeiro plano. Suites de
regressão anteriores revalidadas sem falha.
--------

BUG-016 — js/checker.js (Result Checker) quebrava sem tratamento com
a cota do Firestore estourada, gerando enchente de "Run failed"

Severidade: MÉDIA (mesma causa raiz do BUG-014, mas com sintoma
diferente e mais visível - alarme falso repetido, não perda de
funcionalidade nova).

Origem: usuário reportou centenas de e-mails do GitHub
("[Thhirodrigues/forex-assist] Run failed: Result Check"), um a cada
~5 minutos desde as 15:51, e perguntou se tinha relação com a cota do
Firestore (BUG-014/015).

Confirmado: sim, mesma causa, sintoma diferente. `scripts/scanner.js`
sempre isolou a leitura de configuração e a análise de cada par em
`try/catch` próprios - por isso aparece ✅ verde no GitHub Actions
mesmo com `RESOURCE_EXHAUSTED` acontecendo o tempo todo (loga o erro,
degrada pro fallback, continua). `js/checker.js` nunca teve essa
proteção nas duas primeiras leituras da função `verificarSinais()`
(buscar `configuracoes/geral` e buscar operações com `status ==
"ABERTA"`, linhas 262-267) - só o processamento de cada operação
pendente, individualmente, tinha `try/catch`. Com a cota estourada,
essas duas leituras iniciais lançavam exceção sem nenhuma captura,
virando uma promise rejeitada sem tratamento - o processo Node
encerrava com erro, e o GitHub Actions marcava a execução inteira como
"failed", gerando um e-mail a cada ciclo do cron (5 em 5 minutos).

Corrigido: as duas leituras iniciais agora estão dentro de um
`try/catch` que loga a mensagem de erro real e retorna (sem lançar),
mesmo padrão de degradação graciosa já usado em
`scripts/scanner.js`. Mantida uma rede de segurança final
(`verificarSinais().catch(...)`) que ainda derruba a execução
(`process.exit(1)`) para qualquer erro genuinamente inesperado que
escape dos `try/catch` internos - a intenção é parar o alarme falso
específico da cota, não mascarar um bug novo e real.

Validado: função extraída e testada isoladamente (sem depender das
credenciais reais do Firebase Admin, indisponíveis neste ambiente) com
Firestore simulado - 6 cenários (cota estourada na leitura de
configuração, cota estourada na leitura do histórico, cenário normal
sem pendências) - todos corretos: a função retorna normalmente e loga
a causa em vez de lançar exceção, tanto na config quanto no histórico;
o fluxo normal continua funcionando sem regressão. Suites de
regressão anteriores revalidadas sem falha.

Não validado: comportamento real no GitHub Actions (só pode ser
confirmado depois do deploy, na próxima execução real do
`result-checker.yml`).
--------

BUG-017 — scripts/statisticsEngine.js: consulta sem limite (custo
crescente de Firestore) + ordenação por campo que nunca é gravado
("últimas operações" nunca foram as mais recentes de verdade)

Severidade: CRÍTICA (dois problemas empilhados - um de custo de
infraestrutura, outro de integridade estatística - ambos afetando o
núcleo da RMI silenciosamente há tempos).

Origem: usuário estranhou o volume de leituras do BUG-014/015 (55 mil
leituras/dia) não bater com o cálculo baseado só nos pollings de 2s.
Investigação apontou pra `obterEstatisticasPar()`, chamada uma vez por
par a cada ciclo do Scanner.

**Achado 1 - consulta sem limite, custo crescente pra sempre**:
`db.collection("historico").where("par","==",par).get()` buscava
TODO o histórico do par, sem `.limit()`. Firestore cobra 1 leitura
por documento RETORNADO, não por consulta - com pares acumulando
dezenas de operações ao longo de ~1,5 mês de uso, cada ciclo do
Scanner (a cada 5 minutos) re-lia o histórico inteiro de cada par,
do zero, mesmo sendo os MESMOS documentos antigos relidos
repetidamente. É a explicação real do descompasso entre os
"~2688/dia" calculados no BUG-015 (só a TwelveData) e as 55 mil
leituras reais do Firestore vistas no console: essa consulta sozinha,
crescendo a cada operação nova salva, é a maior fonte de leitura do
projeto, não os pollings de 2s (esses contribuíam, mas eram menores).

**Achado 2 - "últimas operações" nunca foram as mais recentes de
verdade**: o código ordenava os resultados por `a.dataHora`/`b.dataHora`
- campo que, confirmado por busca em todo o repositório, **nunca é
gravado em lugar nenhum**. `new Date(undefined || 0)` é sempre a
mesma data (epoch) pra todo documento, então o comparador do `.sort()`
sempre devolvia 0 (nenhuma reordenação) - a "ordem" final era
simplesmente a ordem arbitrária de retorno do Firestore, não a mais
recente primeiro. Combinado com o corte fixo em 10 operações
(`.slice(0, 10)`), isso tinha dois efeitos:
- A fórmula de confiabilidade em `scripts/historyAnalyzer.js`
  (`confiabilidade = min(100, operacoes/50*100)`) nunca passava de
  20% (10/50), então o multiplicador de confiança do histórico no
  score ficava travado no patamar mais baixo (0,80) pra sempre,
  mesmo pra pares com dezenas de operações reais - o mecanismo de
  "mais dado real = mais confiança" nunca funcionou de fato.
- O gate `operacoesMinimas` do perfil Conservador em
  `scripts/decisionEngine.js` (elevado de 10 para 30 mais cedo nesta
  sessão, ver acima) ficou estruturalmente inatingível: a amostra
  usada em `estatisticas.operacoes` nunca excedia 10, então
  `>= 30` nunca era verdadeiro - o Conservador nunca mais aprovaria
  sinal nenhum, um efeito colateral não percebido na hora daquela
  mudança.

Corrigido (`scripts/statisticsEngine.js`):
- Nova constante `AMOSTRA_MAXIMA_HISTORICO = 50`, igual ao
  denominador da fórmula de confiabilidade.
- Consulta agora usa `.orderBy("timestamp", "desc").limit(50)` -
  reaproveita o MESMO índice composto (par + timestamp) que
  `scripts/riskManager.js`'s `existeCooldown()` já usa em produção há
  tempos (confirmado por leitura do código - a mesma combinação
  where+orderBy já funciona ali), então não deveria exigir criação de
  índice novo. Custo de leitura por consulta agora se estabiliza em
  no máximo 50, para sempre, em vez de crescer indefinidamente.
- Removido o `.sort()` por `dataHora` (campo morto) - o resultado já
  vem ordenado corretamente pelo Firestore, usando `timestamp`, campo
  que `salvarOperacao()` de fato grava em toda operação.
  `ultimasOperacoes` deixou de ser fixo em 10, passou a ser a amostra
  inteira buscada (até 50); `ultimos5`/`ultimos10` continuam sendo
  cortes de exatamente 5/10 itens dessa amostra maior.

Não corrigido agora (fora de escopo, confirmado sem efeito na
decisão): o campo `confianca` (ALTA/MÉDIA/BAIXA, limiares 100/50) não
é lido em nenhum lugar do pipeline de decisão - só documentado que o
patamar ALTA ficou estruturalmente inatingível com a nova amostra
máxima de 50.

Validado: função testada isoladamente com Firestore simulado - 11
cenários (consulta usa where/orderBy/limit corretos; 35 operações
agora atingem `historicoSuficiente`, antes impossível; `ultimos5`/
`ultimos10` com o tamanho certo; respeita o limite de 50 mesmo com 80
disponíveis; amostra pequena continua corretamente classificada como
insuficiente; ordem de mais-recente-primeiro preservada de verdade) -
todos passando. Confirmado também, isoladamente, que
`confidenceMultiplier` agora sai de 0,80 fixo para 0,90 (30 operações)
e 1,00 (50 operações), como a fórmula sempre pretendeu. Suites de
regressão anteriores revalidadas sem falha.

Não validado: se o índice composto (par + timestamp) realmente já
existe no Firestore de produção (evidência forte via
`existeCooldown()`, mas não confirmação direta - se não existir, o
Firestore retorna um erro pedindo a criação do índice, capturado pelo
mesmo `try/catch` por par que já isola outros erros de Firestore no
Scanner, sem derrubar a execução inteira).
--------

BUG-018 — scripts/statisticsEngine.js (pool estatístico compartilhado
entre perfis operacionais)

Severidade: CRÍTICA (contamina silenciosamente o histórico usado pelo
score de qualquer perfil - o tipo de problema que a seção "Qualidade de
sinal da RMI" do CLAUDE.md trata como não-negociável).

Origem: usuário ia testar o perfil Agressivo (score mínimo 35, sem
exigência de multi-timeframe) como diagnóstico, e perguntou se cada
perfil deveria ter sua própria avaliação - preocupado que operações
abertas num perfil mais permissivo acabassem influenciando o Balanceado
e principalmente o Conservador, que deveria ser o mais rigoroso.

Confirmado no código: cada operação salva em `historico` já é gravada
com o campo `perfil` (o que a aprovou - ver `scripts/pairAnalyzer.js`
linhas 183/231, existente desde antes desta sessão). Mas
`obterEstatisticasPar()` sempre consultou só por
`where("par","==",par)`, sem nenhum filtro por perfil - o
`taxaAcerto`/`winStreak`/`pesoEstatistico`/`status` usados por
QUALQUER perfil vinham do mesmo pool misto. Uma operação aprovada pelo
Agressivo (barra mais baixa) virava "evidência" também para o
Conservador, que nunca teria aprovado aquele sinal.

Correção: hierarquia de rigor entre perfis (AGRESSIVO=1, BALANCEADO=2,
CONSERVADOR=3 - ver `PERFIL_ANALISE` em `scripts/decisionEngine.js`).
Nova função `operacaoAtendeRigorDoPerfil(perfilOperacao, perfilAtual)`:
uma operação só conta como evidência pro perfil atual se foi aprovada
por um perfil igual ou mais rigoroso. Na prática: Conservador só
aprende com o que o próprio Conservador aprovou; Balanceado aprende com
Balanceado+Conservador; Agressivo aprende com todos os três (é o mais
permissivo, então qualquer evidência mais rigorosa continua válida pra
ele). Documento sem campo `perfil` (histórico anterior ao recurso, se
existir) é tratado como BALANCEADO - mesmo fallback que o próprio
`pairAnalyzer.js` já usava na gravação.

Decisão deliberada de implementação: o filtro é aplicado em memória,
sobre a mesma amostra de até 50 documentos que o BUG-017 já busca
(`where par== + orderBy timestamp desc + limit 50`, sem nenhuma
alteração) - não como `where("perfil","in",[...])` adicional na
consulta. Um filtro assim exigiria um índice composto novo (par +
perfil + timestamp) ainda não provisionado no Firestore de produção; a
primeira execução real quebraria pedindo criação manual do índice,
justamente no momento em que o usuário ia rodar o diagnóstico do
Agressivo. Filtrar em memória evita esse risco operacional sem
aumentar o custo de leitura por consulta (continua no máximo 50,
mesmo limite de sempre).

Efeito colateral aceito e correto: como o filtro atua sobre a mesma
amostra de 50 (não busca mais documentos pra compensar), o perfil
Conservador pode enxergar MENOS de 50 operações mesmo quando o par tem
50+ no Firestore, se boa parte delas foi aprovada por outros perfis -
isso é o comportamento pretendido (evidência escassa e correta é
melhor que evidência abundante e emprestada de um perfil mais
permissivo).

`scripts/scanner.js`: `executarAnalisePar()` agora passa
`context.configuracao?.perfil` como terceiro argumento pra
`obterEstatisticasPar()`.

Validado isoladamente (scratchpad, 16 cenários): tabela de rigor
completa (cada perfil vendo/não vendo evidência de cada outro);
case-insensitive; documento sem `perfil` tratado como BALANCEADO;
`perfilAtual` não informado não quebra (fallback BALANCEADO); consulta
ao Firestore inalterada (mesmo where/orderBy/limit de sempre, sem novo
campo); cenário com 50 operações misturadas entre os 3 perfis
confirma contagem exata por perfil atual (Agressivo vê 50, Balanceado
vê 40, Conservador vê 15). Suite de regressão do BUG-017 revalidada
sem falha (11/11).

Não fixado nesta correção (fora de escopo, registrado para o futuro):
`js/pairInsights.js`'s `calcularDesempenhoPorPar()` - a função que
alimenta o card "Sugestão de Agora" do Dashboard - é uma implementação
duplicada e independente que também consulta `historico` (com
`.limit(500)`) sem filtro por perfil. Ela é só informativa (não
alimenta o Decision Engine), mas sofre da mesma inconsistência
conceitual: o desempenho mostrado ao usuário no Dashboard mistura
operações de todos os perfis, podendo divergir do que o score real do
perfil ativo está considerando. Correção pendente de decisão do
usuário sobre se vale a pena replicar a mesma hierarquia ali.
--------

LIMPEZA-003 — remoção do campo "API Ativa" do Config + rotação
automática do ponto de partida (scripts/marketData.js, scripts/
scanner.js, js/config.js)

Origem: usuário notou que `scripts/utils.js`'s `getApiKey()` já faz
round-robin de verdade nas 3 chaves da TwelveData a cada chamada,
tornando o campo "API Ativa" do Config redundante - o campo só definia
o PONTO DE PARTIDA desse rodízio a cada execução do Scanner, não se a
rotação acontecia.

Confirmado no código antes de remover: `apiAtiva` fixo em 1 (padrão,
nunca alterado na prática) fazia a Chave 1 sistematicamente pegar a
chamada "extra" em todo ciclo em que o total de chamadas não fosse
múltiplo de 3 - desbalanceamento pequeno por ciclo, mas cumulativo ao
longo de meses.

Correção: campo removido do Config (`js/config.js` - `<select>
#cfgApi`, `configuracaoPadrao()`, `obterConfiguracoesTela()`, payload
de salvamento) e de `CONFIG_PADRAO`/chamada a `configurarMarketData()`
em `scripts/scanner.js`. Nova função `indiceInicialRotativo()` em
`scripts/marketData.js`: ponto de partida passa a girar sozinho a cada
janela de 5 minutos (`Math.floor(Date.now()/(5*60*1000)) %
API_KEYS.length`), sem depender de nenhum campo manual.

Validado isoladamente (scratchpad): `configurarMarketData()` sem
`apiAtiva` não lança erro; índice calculado sempre no intervalo válido
[0,2]; 3 janelas de 5 min consecutivas cobrem as 3 chaves sem repetir.
--------

BUG-019 — js/historico.js (alternarOperacaoReal nunca movia saldoReal)

Severidade: CRÍTICA (a Conta Real - o saldo verdadeiro do usuário -
nunca refletia nenhuma operação marcada/desmarcada como real, desde
que essa função existe).

Origem: usuário descreveu o desenho original da Conta Real (marcar
manualmente quais sinais operou de verdade na corretora; WIN soma,
LOSS subtrai) e pediu avaliação de se isso estava funcionando.

Achado: a função primeiro ATUALIZAVA o documento com
`operacaoReal: marcado` (o novo estado) e só DEPOIS relia o mesmo
documento pra descobrir `jaMarcado` (se já estava marcado antes) -
nesse ponto o documento já tinha o valor novo, então `jaMarcado` saía
sempre igual a `marcado`. As duas condições que movem `saldoReal`
(`marcado && !jaMarcado` / `!marcado && jaMarcado`) exigem
`jaMarcado !== marcado` - logicamente impossíveis do jeito que
estavam. `saldoReal` nunca mudava, reescrito com o mesmo valor a cada
clique no checkbox, não importa quantas operações fossem marcadas.

Correção: lê o estado ANTERIOR (`jaMarcado`) antes de escrever o novo
valor, não depois.

Validado isoladamente (scratchpad, 10 cenários): marcar operação WIN
pela 1ª vez soma o lucro; desmarcar operação já marcada subtrai de
volta; marcar de novo uma operação já marcada não soma duas vezes;
sequência de múltiplas marcações/desmarcações resulta no saldo líquido
correto; operação sem `resultadoFinanceiro` (ainda ABERTA) só marca o
campo, não mexe no saldo nem quebra por falta de
`configuracoes/geral`.
--------

BUG-020 — js/checker.js (Conta Simulada só atualizava no modo
Simulada, mutuamente exclusiva com a Conta Real)

Severidade: CRÍTICA (o desenho original da Conta Simulada - somar
TODOS os sinais fechados, sempre, servindo de comparação "quanto eu
teria ganho seguindo tudo" - não existia; ela só rodava enquanto o
modo global não fosse o mesmo necessário pra Conta Real funcionar).

Origem: mesma conversa do BUG-019 - usuário descreveu que a Conta
Simulada deveria somar/subtrair automaticamente com TODO sinal que o
aplicativo buscar, independente de qualquer outra coisa, e começar
zerada (depois ajustado: sem reset, acumulado desde sempre, com filtro
diário separado no Dashboard - ver FEATURE-006).

Achado: `saldoAntes`/`saldoDepois` só eram calculados, e
`configuracoes/geral.saldoSimulado` só era incrementado na transação
de fechamento, quando `configuracao.tipoConta === "SIMULADA"`.
`tipoConta` é um switch global único (`<select>` "Conta" no Config:
Simulada OU Real) - no modo Real (o modo necessário pra usar a
marcação manual da Conta Real, ver BUG-019), a Conta Simulada
simplesmente parava de ser atualizada.

Correção: `saldoAntes`/`saldoDepois` agora vêm sempre de
`configuracao.saldoSimulado` (fallback `saldoInicial`, depois 0),
independente de `tipoConta`; a transação em
`db.runTransaction()` atualiza `configuracoes/geral.saldoSimulado`
incondicionalmente a cada operação fechada. `saldoReal` nunca é tocado
por este arquivo - continua responsabilidade exclusiva da marcação
manual em `js/historico.js`. Variável `configuracaoTransacao`, que só
existia pra alimentar o `if` removido, também removida (órfã).

Validado isoladamente (scratchpad, 7 cenários, extraindo as funções
puras do arquivo sem tocar no `firebase-admin`/`serviceAccount.json`
do topo): modo REAL agora calcula saldoAntes/saldoDepois normalmente
(antes ficava `undefined`/travado); modo SIMULADA sem regressão;
`saldoSimulado` ausente cai pro `saldoInicial`, não `NaN`; `saldoReal`
da configuração nunca influencia o cálculo.
--------

FEATURE-006 — Card "Desempenho" no Dashboard (js/desempenho.js)

Origem: consequência direta dos BUG-019/BUG-020 - corrigido o backend,
faltava onde o usuário pudesse efetivamente ver Conta Real, Conta
Simulada e a contagem de sinais. Também consolida, no Dashboard, uma
visão "desde sempre" mais confiável que o card equivalente já
existente em `js/historico.js` (`#historicoStats`, o card "Histórico
de Sinais" com ✅/❌/🎯) - que conta só os últimos 300 sinais (
`orderBy("timestamp","desc").limit(300)`), não o total real. As duas
telas agora podem, de propósito, mostrar números diferentes
(Dashboard = total verdadeiro; Histórico = janela dos últimos 300) -
documentado aqui pra não parecer inconsistência não-intencional se
alguém comparar os dois no futuro.

Decisões de design (confirmadas com o usuário antes de implementar):
- Card fica no Dashboard, não no Config.
- Conta Simulada mostra o acumulado desde sempre, sem reset automático.
- Filtro por dia é uma seção separada abaixo do acumulado (não
substitui o total, complementa).
- Conta Real permanece como está (BUG-019 já corrigiu o mecanismo).

Implementação (`js/desempenho.js`, novo arquivo):
- `hojeBrasilStr()`/`limitesDoDiaBrasil()`: usam o offset fixo
-03:00 de America/Sao_Paulo (Brasil não tem horário de verão desde
2019, confirmado via WebSearch nesta sessão) - evita depender de
conversão de fuso horário do navegador.
- `contarPorResultado()`: usa `.count()` (agregação nativa do
Firestore - conta sem baixar os documentos, custo irrelevante mesmo
com milhares de sinais; confirmado disponível no SDK Admin instalado,
`node_modules/@google-cloud/firestore@6.8.0`) com fallback pra leitura
normal em `catch` - **não foi possível confirmar `.count()` no SDK do
navegador** (`firebase-firestore-compat.js@10.12.2`) porque a política
de rede deste ambiente bloqueia `gstatic.com` (confirmado via
`/__agentproxy/status` - `connect_rejected`/403 pra esse host); o
fallback existe justamente pra cobrir essa incerteza sem arriscar
quebrar a tela em produção. Validar no primeiro uso real.
- `obterDesempenhoDoDia()`: consulta só com `where("timestamp",">=",
inicio).where("timestamp","<",fim)` - intervalo no MESMO campo não
exige índice composto novo (usa o índice automático de campo único);
`resultado`/soma de `resultadoFinanceiro` filtrados em memória, mesmo
padrão já usado em `js/historico.js`/`js/checker.js`. Mesma cautela do
BUG-018 (evitar `where` composto que dependa de índice não
provisionado).

Wiring: `js/expert.js` (`dashboardView()`, novo `#desempenhoCard`
entre "Modo Atual" e "Sinais Hoje"), `js/app.js` (hook de pós-render
do Dashboard, mesmo padrão `typeof === "function"` + `setTimeout` já
usado por `renderSugestaoAgora`/`renderModoAtual`), `index.html`
(`<script src="js/desempenho.js">` antes de `js/app.js`).

Validado isoladamente (scratchpad, 15 cenários): limites de dia
corretos (24h exatas); formatação de USD (positivo/negativo/
undefined); contagem via `.count()` e via fallback dão o mesmo
resultado; consulta diária separa corretamente o dia filtrado de dias
adjacentes e ignora operações ainda `ABERTA`; `obterResumoGeral()` lê
saldoReal/saldoSimulado corretos, cai pro `saldoInicial` quando
`saldoSimulado` está ausente, e não quebra se `configuracoes/geral`
não existir. HTML gerado renderizado e checado (balanceamento de tags
`<div>`) - mesma classe de bug do BUG-013 (HTML corrompido) verificada
preventivamente aqui.

Pendente, fora de escopo desta correção: `#historicoStats` (o card de
Histórico) roda sua própria consulta de 300 documentos toda vez que a
aba abre - migrar pra `.count()` também é uma melhoria futura possível,
não feita agora por não ter sido pedida.
--------

BUG-021 — sinal aprovado nunca era salvo de verdade + lote/TP/SL
adaptativo desligado desde a separação em arquivos (scripts/
pairAnalyzer.js, scripts/decisionEngine.js, scripts/moneyManager.js)

Severidade: MÁXIMA (nenhum sinal aprovado consegue ser salvo desde
29/07/2026; quando consegue, o ajuste de lote/TP/SL por condição de
mercado nunca roda).

Origem: usuário relatou que o app costumava sugerir lote/TP/SL
diferentes conforme a análise de mercado (tinha prints antigos
mostrando isso), mas hoje só vê o valor fixo do Config (lote 0,04,
TP/SL $5). Disse acreditar que a quebra veio "da separação das funções
de cada arquivo" e que foi provavelmente o ponto em que parou de mexer
no app com a IA anterior.

**Achado 1 (o mais grave, não é o que o usuário reportou - achado
durante a investigação) - scripts/pairAnalyzer.js nunca salva um sinal
aprovado**: `analisarPar()` chama `await salvarOperacao(db, operacao)`
na linha 405, mas `salvarOperacao` NUNCA fez parte dos parâmetros
desestruturados da função - `scripts/scanner.js` sempre passou
`salvarOperacao` corretamente na chamada, mas `pairAnalyzer.js` nunca
recebia. Confirmado via `git log -L` que isso existe desde a criação
do arquivo (commit `198e55e`, "Refactor risk calculation logic in
pairAnalyzer.js", **29/07/2026**) - nunca foi corrigido depois.
Confirmado empiricamente (scratchpad, chamando `analisarPar()` de
verdade com um cenário que aprova o sinal): lança
`ReferenceError: salvarOperacao is not defined`, capturado pelo
`try/catch` da própria função (linha 446), que devolve
`{status:"ERRO", motivo: e.message}` - **nenhuma operação aprovada é
persistida no Firestore**, e aparece só como "erro interno" genérico
nas estatísticas do Scanner (`context.estatisticas.erros++`), sem
nenhum sinal visível de que o problema é justamente não conseguir
salvar. Esse bug nunca foi percebido porque, no período analisado
nesta sessão, os pares ativos estavam todos REPROVADO (score abaixo do
mínimo do perfil) - o código nunca chegava a tentar salvar. No momento
em que qualquer sinal passar a ser aprovado (por exemplo, testando o
perfil Agressivo, ou por mudança real de mercado), ele vai falhar
silenciosamente. Isso bate com a suspeita do usuário: a "separação das
funções de cada arquivo" (o refactor de 29/07) é literalmente onde e
quando isso quebrou, e coincide com a época em que ele relata ter
parado de mexer no projeto com a IA anterior.

Correção: `salvarOperacao` adicionado de volta aos parâmetros
desestruturados de `analisarPar()`.

**Achado 2 - scripts/moneyManager.js's decidirConfiguracaoMercado()
nunca chegava a ajustar lote/TP/SL**: recebe `score: probabilidade`,
onde `probabilidade` é, na verdade, `estatisticas.resumo.taxaAcerto` -
a taxa de acerto HISTÓRICA do par (0-100), não a qualidade do sinal
atual (nome herdado da separação em arquivos). A primeira linha da
função era `if (score < 80) { decisao: "NAO_OPERAR"; risco: "ALTO";
return; }` - taxa de acerto real em Forex bater 80% é raríssima (os 5
pares ativos hoje estão entre 29-45%), então essa condição disparava
quase sempre e SAÍA ANTES de qualquer ajuste por ADX (mercado fraco),
ATR (mercado lento) ou expectativa matemática negativa - lote/TP/SL
saíam sempre iguais ao valor bruto do Config. Esse "NAO_OPERAR" nunca
bloqueava nada de verdade (nada lê `decisaoMercado.decisao` pra
reprovar o sinal - quem bloqueia é `avaliarConfiguracao()`, separada,
ver Achado 3) - só desligava o próprio ajuste que deveria fazer.
Explica por que o comportamento antigo (visto nos prints do usuário)
sumiu: com histórico pequeno, a taxa de acerto passa de 80% por acaso
com facilidade (2-3 WINs seguidos); com histórico maduro (30-50
operações), ela se estabiliza numa faixa realista e a trava nunca mais
abre.

Correção: removida a saída antecipada; os ajustes por ADX/ATR/
expectativa agora sempre rodam. Taxa de acerto baixa continua
registrada (`risco: "HISTORICO_FRACO"`), só que como informação, não
mais bloqueando o ajuste.

**Achado 3 - avaliarConfiguracao() (o gate que REALMENTE bloqueia,
via `recomendacaoFinanceira` lido por `decisionEngine.js`'s
`avaliarOperacao()`) ignorava o perfil**: usava
`DEFAULT_CONFIG.riscoMaximo` (1,0% fixo) e `rewardRisk < 1` fixo pra
QUALQUER perfil, mesmo `PERFIL_FINANCEIRO` definindo
`riscoPorOperacao`/`rrMinimo` diferentes por perfil (Conservador 1%/
1.2, Balanceado 2%/1.0, Agressivo 3%/1.0).
`validarPerfilFinanceiro()` já fazia a conta certa, por perfil, mas
seu resultado (`validacaoPerfil`) nunca era lido por ninguém - campo
morto. Na prática, todo perfil operava sob o teto do Conservador
sem saber.

Correção: `avaliarConfiguracao()` e `sugerirConfiguracao()` passam a
receber `perfil` e usar `obterPerfilFinanceiro(perfil)` pras regras
certas, a mesma fonte que `validarPerfilFinanceiro()` já usava
corretamente.

**Achado 4 - o `risco` que decisionEngine.js devolvia pro sinal
aprovado (BUY/SELL) estava quebrado E escondia o fallback correto**:
`avaliarOperacao()` devolvia `risco: {lote: resultado.financeiro?.
lote, ..., riscoRetorno: null, riscoPercentual: null}` -
`resultado.financeiro` nunca existe (pairAnalyzer.js nunca passa
`financeiro` nessa chamada), então lote/tpUSD/slUSD saíam `undefined`,
e riscoRetorno/riscoPercentual eram hardcoded `null` de qualquer
forma. Pior: por ser um objeto (truthy, mesmo quebrado), isso fazia
`pairAnalyzer.js`'s `const risco = decisao.risco || {fallback
correto}` SEMPRE escolher esse objeto quebrado - o fallback certo
(que já tinha acesso direto ao `financeiro` real, calculado
corretamente) nunca era alcançado. `operacao.rewardRisk`/
`riscoPercentual` salvos no Firestore eram sempre `null`, mesmo depois
do Achado 2/3 corrigidos.

Correção: removido o bloco `risco: {...}` de `decisionEngine.js` (nos
dois branches, COMPRA e VENDA) - `pairAnalyzer.js` volta a cair no
próprio fallback, que já usa `financeiro.rewardRisk`/
`financeiro.riscoPercentual` reais. Também adicionado `expectativa:
financeiro.expectativa` no nível raiz de `operacao` (antes só existia
aninhado em `operacao.financeiro.expectativa`).

**Limpeza relacionada (scripts/scanner.js)**: `processarOperacaoSalva()`
chamava `riskEngine.js`'s `calcularRisco()` - um SEGUNDO motor de
risco, nunca escrito no Firestore, calculando com o `score` de
mercado correto (diferente do Achado 2) mas só pra imprimir um resumo
no log do GitHub Actions. Como usava premissas diferentes do
`moneyManager.js` (que decide o que é salvo de verdade), o log exibia
números que não batiam com a operação real - silenciosamente
enganoso. Removida a chamada; o log agora imprime os valores REAIS
salvos em `resultado.operacao`. `scripts/riskEngine.js` continua no
repositório, sem nenhum uso ativo - fica como está, é provavelmente o
início da tentativa "RMI V2" que o usuário lembra ter abandonado nesse
mesmo ponto. Destino (integrar/remover) segue em aberto.

Validado: 12 cenários isolados em `moneyManager.js` (ajuste dinâmico
volta a rodar; perfil correto em `avaliarConfiguracao`/
`sugerirConfiguracao`) + 7 cenários end-to-end chamando
`analisarPar()` de verdade (sinal aprovado agora É salvo; rewardRisk/
riscoPercentual/expectativa não são mais `null`) + 1 cenário adicional
confirmando que ADX fraco reduz lote/TP/SL até o documento salvo
(0,04→0,02, 5→3) + 1 cenário SELL (branch de venda, também corrigida).
Toda a suíte de testes das correções anteriores desta sessão
(BUG-017, BUG-018, BUG-019, BUG-020, LIMPEZA-003, FEATURE-006)
revalidada sem falha.

**Pendência conforme a regra não-negociável do CLAUDE.md**: esta
correção mexe direto no que decide se um sinal é salvo e com que
lote/risco. Antes de deixar o Scanner rodando sozinho via cron sem
supervisão, validar manualmente os primeiros ciclos reais após o
deploy - conferir no Firestore/log do GitHub Actions se sinais
aprovados estão sendo salvos, com lote/TP/SL variando quando as
condições de mercado justificarem.
--------

FEATURE-007 — Histórico agrupado por mês/dia com placar próprio por
grupo (js/historico.js)

Origem: usuário confirmou o desenho - lista continua limitada aos
últimos 300 sinais (mesma consulta de sempre), mas agora agrupada
mês → dia, cada grupo (dia e mês) com seu próprio ✅/❌/🎯, em vez de
um total único misturando os 300. O resumo fixo no topo da tela passa
a mostrar o MÊS CORRENTE, não mais o total dos 300 - calculado sobre a
mesma amostra já buscada (sem consulta extra ao Firestore).

Implementação: `statsPorData` acumula wins/losses por dia junto com
`gruposPorData` (que já existia, guardando o HTML dos cards). Meses
agrupados a partir das datas já ordenadas (`mesChaveDe`/`mesLabelDe`,
novas funções). Mês que contém "hoje" (ou o sinal em destaque) vem
expandido; dentro dele, o dia de hoje também. "Minimizar Tudo" agora
colapsa mês E dia.

**Bug pego durante a implementação, antes de subir**: o cabeçalho de
cada grupo (dia e mês) precisou de dois `<span>` lado a lado (rótulo +
placar, com `justify-content:space-between`) - isso quebrou o padrão
antigo de `this.querySelector('span')` pra achar a seta ▼/▶ (com dois
spans no cabeçalho, ele pegava o span ERRADO - o externo, que envolve
rótulo inteiro - e sobrescrevia o texto todo do rótulo ao
expandir/colapsar). Corrigido dando à seta uma classe própria
(`.seta-grupo`) e trocando todos os `querySelector('span')` relevantes
(clique no dia, clique no mês, "Minimizar Tudo") por
`querySelector('.seta-grupo')`.

Validado isoladamente (scratchpad, 13 cenários, simulando 4 dias reais
distribuídos em 2 meses): HTML balanceado (mesma checagem preventiva
do BUG-013, com o cenário de múltiplos sinais por dia que expôs aquele
bug originalmente); resumo do topo mostra o mês corrente com WIN/LOSS
corretos; cada grupo de mês mostra placar próprio, diferente do total
geral; "HOJE" aparece e vem expandido; `mesChaveDe`/`mesLabelDe`
tratam "Data Indefinida" sem quebrar.
--------

FEATURE-008 — Definir/aportar saldo da Conta Real (js/config.js,
js/desempenho.js)

Origem: usuário confirmou que vai depositar dinheiro real na
corretora pra começar a operar - precisa de um jeito de registrar esse
saldo inicial, e depois só ele deve mudar por WIN/LOSS (já corrigido
no BUG-019) ou por aporte manual futuro.

Dois mecanismos, propositalmente separados (semânticas diferentes):

1. **Config → "💰 Definir Saldo Inicial da Conta Real Agora"**: ação
   única de setup, separada do "Salvar Configurações" - usa o valor do
   campo "Saldo Inicial" e SUBSTITUI `configuracoes/geral.saldoReal`.
   `confirm()` obrigatório antes de gravar (é destrutivo se usado por
   engano depois da primeira vez - sobrescreve qualquer WIN/LOSS/aporte
   já acumulado). Valor precisa ser um número ≥ 0.

2. **Dashboard (card Desempenho) → "➕ Registrar Aporte"**: `prompt()`
   pede um valor (aceita vírgula decimal BR, aceita negativo pra
   registrar retirada) e SOMA ao `saldoReal` atual, nunca substitui -
   uso recorrente, não só a primeira vez.

Validado isoladamente (scratchpad): handler de Config - 6 cenários
(valor válido grava, confirm cancelado não grava, texto inválido não
grava e alerta, negativo rejeitado, zero é válido); handler de aporte
- 9 cenários (soma corretamente, retirada com valor negativo, vírgula
decimal BR, texto inválido não altera saldo, zero rejeitado, prompt
cancelado não faz nada, ausência de `configuracoes/geral` prévia trata
como 0).
--------

BUG-022 — js/historico.js (checkbox "Operação Real" falhava em
silêncio pra sinais antigos, parecendo que o BUG-019 não funcionou)

Origem: usuário testou o checkbox "Operação Real" (corrigido no
BUG-019) num sinal de 28/07/2026 e reportou que a Conta Real não
mudou.

Achado: o guard `if (!sinal || !sinal.resultadoFinanceiro)` (linha
logo após a correção do BUG-019) sai sem tocar `saldoReal` sempre que
o documento não tem `resultadoFinanceiro` numérico - o caso exato de
sinais de antes de 28/07/2026, quando o schema usava `lucroAtual` em
vez de `resultadoFinanceiro` (documentado no BUG-007). O sinal
testado pelo usuário é datado exatamente 28/07/2026 - bem na fronteira
dessa transição de schema, então muito provavelmente cai do lado
antigo. O código em si estava correto (não dá pra somar/subtrair um
valor que não existe), mas saía **em silêncio** - sem nenhuma
indicação de que a marcação foi salva mas o saldo não pôde ser
ajustado, dando a impressão de que a correção do BUG-019 não tinha
funcionado.

Correção: `alert()` explicando o motivo quando isso acontece. Also
trocado o guard de `!sinal.resultadoFinanceiro` (falsy) para
`typeof sinal.resultadoFinanceiro !== "number"` - um resultado
genuinamente igual a `0` é um valor válido (operação empatou/fechou
sem lucro nem prejuízo), não deveria ser tratado como "ausente".

Validado isoladamente (scratchpad, 6 cenários): sinal sem
`resultadoFinanceiro` dispara o alerta e não mexe no saldo;
`resultadoFinanceiro === 0` NÃO dispara alerta e processa normalmente;
sinal com valor válido continua funcionando sem regressão do BUG-019.
--------

LIMPEZA-004 — pequenos ajustes de clareza pedidos pelo usuário após
revisar o Histórico e o Config ao vivo

- **"Qualidade: BOA%" não fazia sentido** (`js/historico.js`):
  `sinal.qualidade` é uma categoria (INSTITUCIONAL/FORTE/BOA/
  ACEITAVEL/CONFLITO, de `classificarQualidade()` em
  `marketAnalyzer.js`), não um número - o template sempre apendava um
  "%" nela, pra TODO sinal, sempre, desde que esse card existe. Não é
  evidência de sinais analisados de forma diferente ao longo do tempo
  (preocupação que o usuário levantou ao ver "ACEITAVEL%" e "BOA%" em
  sinais próximos) - são só dois sinais reais com scores diferentes
  (a classificação funcionando como esperado), mal exibidos. Corrigido
  pra mostrar `Qualidade: BOA (85%)` - categoria + o score numérico
  real (`sinal.score`) entre parênteses, só quando presente.
- **"Saldo Inicial" sem indicar a moeda** (`js/config.js`): outros
  campos monetários do Config já tinham "(USD)" no rótulo (Take
  Profit, Stop Loss) - Saldo Inicial não tinha. Adicionado.
- **Campo "Conta Simulada/Conta Real" no Config parecia inútil**
  (`js/config.js`): não é - `scripts/pairAnalyzer.js` usa
  `configuracao.tipoConta` pra decidir qual saldo (`saldoSimulado` ou
  `saldoReal`) vira a `banca` usada no cálculo de risco por operação
  (`riscoPercentual = slUSD/banca*100`, parte do BUG-021 já corrigido
  hoje). Ficou confuso DEPOIS do BUG-020 (que fez as duas contas
  atualizarem sempre, juntas) porque parecia que esse campo não fazia
  mais diferença nenhuma - só não é mais sobre "qual conta é
  rastreada", e sim "qual saldo referencia o cálculo de risco".
  Renomeado o rótulo pra "Base de Cálculo de Risco", opções
  reescritas ("Usar saldo da Conta Simulada"/"...Real"), com texto
  explicativo abaixo.
--------

FERRAMENTA — calcular-saldo-simulado-historico.js (raiz do repo)

Origem: usuário pediu o cálculo de quanto a Conta Simulada valeria se
recalculada com TODOS os sinais já fechados no histórico, pra decidir
entre aplicar esse total como saldo inicial ou começar a contabilizar
do zero a partir de agora - motivado pela preocupação (ver LIMPEZA-004
acima, esclarecida como não sendo o problema real) de sinais antigos
não terem sido analisados do mesmo jeito que os de hoje. Confirmado
depois: aplicar o recálculo.

Soma `resultadoFinanceiro` de todo sinal `ENCERRADA` com `resultado`
WIN/LOSS; sinais sem `resultadoFinanceiro` numérico (schema anterior a
28/07/2026 - ver BUG-007) são contados separadamente e EXCLUÍDOS da
soma - não tem como saber quanto teriam valido com o padrão de análise
atual. Imprime o total geral, quebrado por mês e por par.

Por padrão é somente leitura (mesmo cuidado de `corrigir-bug007.js`/
`audit-historico.js`, que também nunca existiram versionados neste
repositório - rodados localmente pelo usuário, com a Service Account,
fora do sandbox do Claude Code, que não tem essas credenciais). Com a
flag `--aplicar`, depois de mostrar o total, pede confirmação
digitada ("sim") e só então grava em `configuracoes/geral.
saldoSimulado` (substitui o valor atual, não soma).

Uso:
  `node calcular-saldo-simulado-historico.js` (só calcula e mostra)
  `node calcular-saldo-simulado-historico.js --aplicar` (calcula, confirma, grava)

Rodar localmente, com `serviceAccount.json` presente na raiz do
projeto.

Validado isoladamente (scratchpad, 6 cenários, carregando o arquivo
real via `require()` com `readline`/`firebase-admin`/
`serviceAccount.json` mockados): sem `--aplicar` nunca escreve, mesmo
confirmando; com `--aplicar` + "sim" grava a soma exata; com
`--aplicar` + qualquer outra resposta cancela sem gravar; sinais sem
`resultadoFinanceiro` continuam excluídos da soma em ambos os modos.
--------

BUG-023 — js/desempenho.js (contarPorResultado sem .count() lia a
coleção historico INTEIRA, sem limite, toda vez que o Dashboard abria)

Severidade: MÁXIMA (esgotou a cota diária do Firestore de novo em
produção, 10/09/2026 - o mesmo tipo de sintoma do BUG-014, incluindo
"nenhum sinal" no dia, porque quota esgotada intercepta a leitura de
configuração do Scanner, mesmo padrão de sempre).

Origem: usuário reportou "esgotei novamente os limites diários" ao
tentar editar `saldoSimulado` pelo Console do Firebase, e que não
recebeu nenhum sinal no dia - "durante julho não aconteceu".

Achado: `contarPorResultado()` (FEATURE-006, escrita nesta mesma
sessão, algumas horas antes) tenta `.count()` primeiro (agregação
nativa do Firestore, custo irrelevante) - mas o fallback, pro caso de
`.count()` não ser suportado no SDK do navegador (nunca confirmado
diretamente aqui, só no SDK Admin do backend - ver nota já registrada
na FEATURE-006 original), fazia `query.get()` **sem nenhum `.limit()`**
- uma leitura completa da coleção `historico` inteira, filtrada por
`resultado`, DUAS vezes (WIN e LOSS) a cada vez que
`obterResumoGeral()` roda, que por sua vez roda toda vez que o
Dashboard renderiza (não só uma vez por sessão). Com 450+ documentos
no histórico e o usuário navegando entre abas várias vezes ao longo do
dia testando as mudanças de hoje, é o candidato mais provável pra ter
esgotado a cota - exatamente o mesmo tipo de erro do BUG-017 (query
sem `.limit()`), reintroduzido numa função nova antes desse padrão
estar automático.

Correção: fallback agora usa `.limit(LIMITE_CONTAGEM_FALLBACK)` (500).
`contarPorResultado()` passa a devolver `{valor, aproximado}` em vez
de um número cru - `aproximado: true` quando o resultado bate
exatamente no limite (sinal de que pode haver mais documentos não
contados, o piso, não o total exato). Interface mostra "500+" nesse
caso, com uma nota explicando, em vez de fingir um número exato.

Validado isoladamente (scratchpad, 17 cenários no total, incluindo os
já existentes revalidados): com 900 documentos falsos e `.count()`
indisponível, o fallback para exatamente em 500 (não lê os 900) e o
resultado vem marcado como aproximado; com poucos documentos (abaixo
do limite), o resultado continua exato, marcado como não-aproximado;
`.count()` disponível continua sendo o caminho preferido, sem
regressão. Toda a suíte de testes desta sessão revalidada sem falha.

**Ainda não confirmado diretamente (real dependência de acesso ao
Firestore de produção, que este ambiente não tem)**: se `.count()`
realmente falha no SDK do navegador deste projeto (`firebase-
firestore-compat.js@10.12.2`), ou se o esgotamento de cota teve outra
causa concorrente. Pedido ao usuário: conferir no Console do Firebase
→ Firestore → aba "Uso"/"Usage" qual operação/coleção consumiu as
leituras hoje, pra confirmar (ou descartar) esta hipótese com certeza.

CONFIRMAÇÃO (10/09/2026): usuário trouxe os gráficos reais de uso do
Firestore. 50 mil leituras (teto exato), 355 gravações, curva subindo
de forma CONSTANTE desde ~2h da manhã, não em pico concentrado à
tarde (quando o usuário estava de fato testando o Dashboard). Isso
descarta o BUG-023 como causa principal - um bug de UI só geraria
carga quando a tela é aberta, não durante a madrugada. Padrão de
subida constante o dia inteiro aponta pro cron de fundo
(`scripts/scanner.js`, a cada 5 min) como driver dominante.

Conta que sustenta essa hipótese: `statisticsEngine.js` (BUG-017) lê
até 50 documentos por par, TODO ciclo do Scanner. Com 5 pares ativos:
até 250 leituras só nessa consulta por ciclo, mais `existeCooldown()`
(mais ~5). Com o cron tentando rodar a cada 5 min (288 ciclos/dia
teóricos, tipicamente menos na prática pelo atraso conhecido do
GitHub Actions grátis), mesmo metade disso já ultrapassa 50 mil
leituras/dia. O BUG-017 de ontem trocou "sem limite, crescendo pra
sempre" por "limite de 50, cobrado em todo ciclo, o dia inteiro" -
resolveu um problema e deixou consumo alto de outro jeito.

Decisão (conversada com o usuário, priorizando confiabilidade do
sinal sobre velocidade - NÃO reduzir a amostra de 50, que foi
calibrada de propósito pra bater com a fórmula de confiabilidade):
reduzir a frequência do cron do Scanner de 5 para 15 minutos
(`.github/workflows/forex-scanner-real.yml`) - corta o número teórico
de ciclos/dia de 288 pra 96 (~3x), sem tocar em nenhuma lógica de
análise ou tamanho de amostra. `result-checker.yml` mantido em 5 min
(seu custo é proporcional ao número de operações ABERTAS, não por par
do histórico - não é o driver principal, e fechar operações mais
rápido continua valioso). Solução "certa" de mais longo prazo
(cachear a estatística por par, recalculando só quando uma operação
daquele par fecha, não a cada ciclo) registrada como pendência, fora
de escopo pra decidir às pressas.
--------

CACHE-001 — cache de estatísticas por par (scripts/statisticsEngine.js,
js/checker.js)

Origem: usuário reportou medo concreto de perder sinais de qualidade
se o intervalo do cron ficasse mais espaçado (15 min) - a análise usa
velas de 5 minutos, então checar com menos frequência pode significar
chegar depois do ponto de entrada ideal já ter passado. Pediu a
solução "certa", não só reduzir a frequência - e uma nova varredura
por outros erros antes de esperar mais um dia inteiro pra descobrir
algo quebrado.

Implementa a "solução de longo prazo" já registrada como pendência no
BUG-023: `obterEstatisticasPar()` custava até `AMOSTRA_MAXIMA_HISTORICO`
(50) leituras por par, EM TODO ciclo do Scanner - o driver dominante
identificado no estouro de cota de hoje. Mas um par só ganha
informação nova quando uma operação dele fecha de verdade (WIN/LOSS) -
não a cada 5 minutos. Não fazia sentido pagar o custo de reler tudo
toda vez que nada mudou.

Implementação: nova coleção `cacheEstatisticas/{par}` (par sanitizado,
"/" vira "_", já que Firestore não aceita "/" cru num ID de documento -
nova função `idCacheDoPar()`). `obterOperacoesBrutasDoPar()` (extraída
de dentro de `obterEstatisticasPar()`) lê o cache primeiro (1 leitura);
se existir, usa o conteúdo dele direto, sem consultar `historico`. Se
não existir, faz a consulta de sempre (até 50 leituras) e grava o
resultado no cache pro próximo ciclo. Importante: o que é cacheado é o
resultado BRUTO da consulta (sem filtro de perfil) - o filtro por
rigor de perfil (BUG-018) continua rodando por cima, toda vez, porque
o perfil ativo pode mudar entre uma chamada e outra; cachear o
resultado já filtrado serviria dado errado pra um perfil diferente do
que gerou o cache.

Invalidação: `js/checker.js`, na MESMA transação que fecha uma
operação (`status: "ENCERRADA"`), agora também `transaction.delete()`
o documento de cache daquele par - a próxima vez que
`obterEstatisticasPar()` for chamada pra esse par, o cache não existe
mais, busca fresco no `historico` (agora incluindo a operação
recém-fechada) e repovoa o cache. Ou seja: o cache não expira por
tempo, expira por evento (uma operação daquele par fechou).

Efeito esperado no custo: pares sem operação fechada no meio tempo
custam 1 leitura por ciclo (era até 51, incluindo `existeCooldown()`)
- a maioria esmagadora dos ciclos, já que operações fecham bem menos
frequentemente que o cron roda. Deve reduzir o consumo diário de
`statisticsEngine.js` de dezenas de milhares de leituras pra uma
fração pequena disso, permitindo manter o Scanner rodando a cada 5
minutos sem repetir o estouro de hoje.

Validado isoladamente (scratchpad, 14 cenários): sanitização do ID;
sem cache prévio busca no historico e grava o cache; COM cache prévio
não consulta o historico nem uma vez, mesmo com 50 documentos
disponíveis (o teste que prova a economia real); filtro de perfil
(BUG-018) continua correto com dados vindos do cache, perfis
diferentes veem quantidades diferentes da mesma amostra cacheada;
cache vazio/malformado não quebra; fechamento de operação em
`js/checker.js` (rodando o arquivo real via `require()`, com Firebase
Admin/marketData mockados) invalida o cache do par certo, na mesma
transação que fecha a operação.

Toda a suíte de testes desta sessão (15 arquivos) revalidada sem
falha - dois arquivos de teste anteriores (BUG-018) precisaram só de
um mock a mais (`cacheEstatisticas` sempre "sem cache"), sem mudar
nenhuma asserção existente.

**Decisão deliberada de NÃO reverter o cron pra 5 min ainda**: o
CLAUDE.md deste projeto é explícito - validar manualmente os primeiros
ciclos reais de qualquer correção no pipeline antes de deixar rodando
sozinho, e isso vale em dobro depois de dois estouros de cota no mesmo
dia. Cron do Scanner segue em 15 min (BUG-023) até o usuário confirmar,
via Console do Firebase, que a coleção `cacheEstatisticas` está sendo
criada/lida corretamente em produção - só então reverter pra 5 min.
--------

CONFIRMAÇÃO (10/09/2026): usuário trouxe a informação oficial do
Firebase - "A utilização é redefinida todos os dias à meia-noite do
horário do Pacífico". Isso é sobre QUANDO o contador de cota zera
(útil - equivale a ~04h da manhã em Brasília, considerando horário de
verão dos EUA em setembro/2026), não necessariamente sobre o fuso do
eixo do gráfico de uso em si. A dúvida original ("por que leituras às
2h da manhã, se a janela começa às 7h30") **não foi totalmente
resolvida** - o rastreio manual do código (`dentroJanelaPadrao()`)
confirma que a janela configurada bloqueia corretamente esse horário,
então não é um bug na lógica de janela. Provavelmente é o gráfico do
Firebase mostrando horas num fuso diferente do de Brasília, mas isso
não foi confirmado com certeza. Não perseguido mais a fundo por ora -
a causa dominante do estouro de cota (`statisticsEngine.js` relendo
até 50 documentos por par em todo ciclo) já foi identificada e
corrigida (CACHE-001), o que importa mais do que fechar essa dúvida
secundária.
--------

LIMPEZA-005 — IDs de documento ilegíveis no Console do Firebase
(scripts/riskManager.js)

Origem: usuário relatou (navegando direto no Console do Firebase, sem
passar pelo app) que a listagem de sinais em `historico` vem com IDs
de documento sendo "uma série de letras e números desordenados", e
que o sinal mais recente aparece em posições inconsistentes na lista -
"às vezes em cima, às vezes no meio".

Achado: `salvarOperacao()` usava `.collection("historico").add({...})`
- o Firestore gera um ID aleatório opaco quando nenhum ID é
especificado. Sem nenhum `where()`/`orderBy()` aplicado manualmente
pelo usuário na tela do Console, a listagem de documentos não segue
nenhuma ordem cronológica - exatamente o sintoma relatado.

Correção: ID próprio, `${timestamp}_${par sanitizado}` (ex.:
`1757520234567_EUR_USD`) em vez de `.add()`. `Date.now()` sempre tem
13 dígitos (até o ano ~2286), então ordenar os IDs como STRING no
Console já reproduz a ordem cronológica real - e o par fica visível
direto no ID, sem precisar abrir cada documento pra saber qual sinal
é. Par+timestamp juntos evitam colisão mesmo se dois pares diferentes
salvarem no mesmo milissegundo (o mesmo par não colide - tem cooldown
entre operações). Nenhum código lê `doc.id` esperando o formato antigo
(só usado como identificador opaco em `js/historico.js`), então a
troca não quebra nada existente.

Validado isoladamente (scratchpad, 7 cenários): ID contém par
sanitizado e timestamp de 13 dígitos; dois pares no mesmo milissegundo
não colidem; ordenar os IDs como string reproduz a ordem cronológica
real mesmo com sinais salvos fora de ordem; campos originais do
documento preservados sem regressão.
--------

LIMPEZA-006 — clearHistorico.js quebraria acima de 500 documentos
(scripts/clearHistorico.js)

Origem: descoberto durante a varredura geral por consultas sem limite
pedida pelo usuário; confirmado relevante porque o histórico de hoje
já tem 450+ documentos, perto do limite.

Achado: `db.batch()` do Firestore aceita no máximo 500 operações por
commit - o script fazia um único batch com TODOS os documentos da
coleção de uma vez, então rodar a limpeza manual (usada antes pelo
usuário pra descartar sinais analisados com um padrão antigo/
inconsistente, conforme BUG-007) ia falhar assim que a coleção
passasse de 500 documentos.

Correção: processa em lotes de até 500, um commit por lote,
imprimindo o progresso.

Validado isoladamente (scratchpad, 6 cenários, extraindo a função real
do arquivo): 1200 documentos dividem em 3 lotes (500+500+200), nenhum
lote passa de 500; exatamente 500 continua sendo 1 lote só; poucos
documentos e coleção vazia continuam funcionando sem regressão.
--------

BUG-024 — Valor do pip errado pra pares com USD como moeda base
(scripts/moneyManager.js, scripts/pairAnalyzer.js)

Origem: usuário revisou 5 prints reais da conta XM (saldo $5.11,
alavancagem 1000:1) e uma análise de mercado real (EUR/USD), a pedido
do usuário para avaliar utilidade das ferramentas da corretora.
Durante essa revisão, ao reler `moneyManager.js` pra confirmar o
comportamento do position sizing sobre o saldo real de $5.11, foi
identificado que `calcularValorPip(lote)` sempre retornava
`lote * 10`, sem considerar qual par estava sendo operado. Usuário
autorizou a correção explicitamente ("achado 2, pode resolver").

Achado: `lote * 10` só está certo quando USD é a moeda de COTAÇÃO do
par (o pip já nasce em USD) - é o caso de EUR/USD e AUD/USD, 2 dos 5
pares ativos. Nos outros 3 pares ativos (USD/JPY, USD/CAD, USD/CHF),
USD é a moeda BASE: o pip nasce na outra moeda (JPY/CAD/CHF) e precisa
ser convertido pra USD dividindo pela cotação atual do par - conversão
que a fórmula fixa nunca fazia. O próprio comentário original da
função já antecipava isso ("Futuramente poderá utilizar: Par
negociado, Cotação atual, Conversão automática") - limitação
documentada desde a criação da função, nunca implementada. Efeito
prático: `tpPips`/`slPips` calculados a partir de `tpUSD`/`slUSD`
configurados pelo usuário saíam errados nesses 3 pares, e
`riscoPercentual`/position sizing (que dependem de `valorPip` estar
certo) herdavam o erro - um SL configurado como "$5" não correspondia
de fato a uma perda de $5 nesses pares.

Correção: `calcularValorPip(lote, par, precoAtual)` agora calcula
`tamanhoPip` (0.01 se o par tem JPY, senão 0.0001) e, quando a moeda
base do par é USD, divide `tamanhoPip * 100000 * lote` pela cotação
atual antes de retornar; quando USD é a moeda de cotação, mantém o
comportamento antigo (`lote * 10`, equivalente a
`tamanhoPip * 100000 * lote` sem conversão). `analisarFinanceiro()`
passou a aceitar `par`/`precoAtual` e repassá-los pra
`calcularValorPip()`; `pairAnalyzer.js` agora envia `par` (já
disponível nos parâmetros da função) e `precoAtual: closes[closes.length - 1]`
(o preço de fechamento mais recente, já usado logo depois como
`precoEntrada` da operação) na chamada a `analisarFinanceiro()`. Sem
`par`/`precoAtual` informados, cai no ramo antigo (`lote * 10`) - não
quebra nenhuma chamada que não passe esses campos.

Validado isoladamente (scratchpad, 14 cenários): EUR/USD e AUD/USD
mantêm exatamente `lote * 10` (regressão zero pros pares onde USD é
cotação); USD/JPY, USD/CAD e USD/CHF agora convertem pela cotação
atual e produzem valores diferentes (e corretos) da fórmula antiga;
`analisarFinanceiro()` ponta-a-ponta com EUR/USD e USD/JPY produz
`tpPips`/`slPips` finitos e positivos nos dois casos, com o par
realmente influenciando o resultado; chamada sem `par` informado não
quebra (cai no fallback antigo). Suíte de regressão do BUG-021
(validate-bug021-moneymanager.js) e da hierarquia de perfil
(validate-hierarquia-perfil.js) revalidada sem falhas após a mudança
de assinatura de `analisarFinanceiro()`.
--------

FEATURE-009 — Botão para definir saldo inicial da Conta Simulada
(js/config.js)

Origem: usuário decidiu não aportar dinheiro real na XM ainda ("não
vou fazer o aporte enquanto não tiver confiança nos sinais"); plano
combinado: lançar um "aporte" fictício de $200 na Conta Simulada pra
observar o RMI funcionando numa escala realista de banca, sem risco
real, e só depois zerar e trocar pra Conta Real com dinheiro de
verdade quando os sinais provarem consistência.

Achado: não existia forma de fazer isso pela tela. O botão
`btnDefinirSaldoReal` (FEATURE-006) grava `saldoReal` diretamente, mas
não tinha equivalente pra `saldoSimulado`. O "Salvar Configurações"
normal só grava `saldoInicial` (campo informativo) - e
`pairAnalyzer.js` usa `saldoSimulado ?? saldoInicial` como banca
quando a Base de Cálculo de Risco está em "Conta Simulada". Como o
usuário já tinha zerado `saldoSimulado` direto no Firebase Console
(sessão anterior), o campo ficou em `0` - não `null`/`undefined` -
então o operador `??` não cai mais pro `saldoInicial`. Se o usuário
tivesse digitado 200 em "Saldo Inicial" e clicado em "Salvar
Configurações", a banca real usada no cálculo de risco continuaria
`$0`, e toda operação seria reprovada silenciosamente (SL/$0 = risco
percentual infinito) - sem nenhum aviso de que o valor digitado não
tinha efeito nenhum.

Correção: novo botão `btnDefinirSaldoSimulada`, espelhando
exatamente o `btnDefinirSaldoReal` (mesma validação, mesmo confirm()
de segurança, mesmo padrão de feedback), mas gravando `saldoSimulado`
em vez de `saldoReal`. Usa o mesmo campo "Saldo Inicial" da tela como
origem do valor. Também serve pro passo seguinte do plano do usuário:
zerar a Conta Simulada de novo (digitar 0) quando for hora de migrar
pra dinheiro real.

Validado isoladamente (scratchpad, 5 cenários, extraindo o handler
real do arquivo): valor válido grava `saldoSimulado` e NÃO grava
`saldoReal` (contas não se misturam); cancelar o confirm() não grava
nada; valor inválido (texto) e valor negativo são rejeitados com
alerta; zero é aceito (permite re-zerar a conta simulada depois).
Suíte de regressão do `btnDefinirSaldoReal`
(validate-definir-saldo-inicial.js) revalidada sem falhas após a
mudança de offset de linha no arquivo.
--------

BUG-025 — Checker fechava toda operação em $5/$5/50 pips fixos,
ignorando o que o sinal realmente configurou (js/checker.js)

Origem: usuário pediu explicação didática de como saldoSimulado/
saldoReal/TP/SL/lote se relacionam; ao reler `js/checker.js` (quem
decide se uma operação virou WIN ou LOSS) pra responder com precisão,
foi identificado que ele nunca lia `tp`/`sl` da configuração real,
nem o `tpUSD`/`slUSD` do próprio sinal salvo. Usuário autorizou a
correção explicitamente ("pode aplicar a correção da pipeline"), com
a exigência de que nada ficasse fixo/hardcoded.

Achado: `calcularResultadoOperacao()` lia `configuracao?.limites ??
LIMITES`, onde `LIMITES = {TP_USD:5, SL_USD:-5, TP_PIPS:50,
SL_PIPS:-50}` - constantes fixas no topo do arquivo. `configuracao.
limites` nunca existiu de fato em `configuracoes/geral` (`js/config.js`
nunca grava um campo chamado `limites`), então esse fallback SEMPRE
era usado, para qualquer `tp`/`sl`/`lote` que o usuário configurasse
na tela, e mesmo depois de `decidirConfiguracaoMercado()` (moneyManager.
js) ajustar dinamicamente TP/SL pra 3 (ADX fraco/mercado lento) - o
checker fechava a operação em $5/$5 mesmo assim, ignorando o valor
real decidido na abertura. Além disso, `calcularLucroUSD()` usava
`10 * lote` fixo pro valor do pip - a MESMA fórmula que o BUG-024
corrigiu em `moneyManager.js`, só que numa cópia paralela e
independente, do lado do FECHAMENTO da operação em vez da abertura -
errada pros mesmos 3 pares (USD/JPY, USD/CAD, USD/CHF). Resultado
prático: o WIN/LOSS e o valor em dólares registrados no histórico
para esses 3 pares nunca correspondiam ao que a análise/gestão de
risco realmente decidiu para aquela operação específica.

Correção: nova função `limitesDoSinal(sinal)` lê `tpUSD`/`slUSD`
diretamente do PRÓPRIO sinal salvo (o que foi decidido quando aquela
operação abriu - não a configuração atual, que pode já ter mudado
entre a abertura e o fechamento) e `financeiro.tpPips`/`financeiro.
slPips` (também já salvos no sinal) para os limites em pips -
substituindo os $5/$5/50 pips fixos. `CONFIG.LIMITES` vira só
fallback pra sinais salvos antes desta correção, que não têm esses
campos (não quebra o histórico já existente). `calcularLucroUSD()`
agora recebe `par`/`precoAtual` e chama `calcularValorPip()`
importado direto de `scripts/moneyManager.js` (mesma fonte da
verdade do BUG-024, não uma 3ª cópia da fórmula).

Validado isoladamente (scratchpad, 13 cenários, extraindo o módulo
real sem o auto-exec do cron): sinal com tpUSD/slUSD diferentes do
$5 fixo faz o checker respeitar o valor real do sinal, não o fixo;
sinal sem esses campos (schema antigo) cai no fallback $5/$5/50 pips
sem quebrar; USD/JPY fecha em TP_FINANCEIRO com lucro correto usando
a cotação real (não o gatilho de preço que a fórmula antiga geraria);
EUR/USD SELL continua fechando em LOSS corretamente quando o preço
sobe (regressão do BUG-007 preservada). Suítes de regressão
`validate-checker.js` (8 cenários) e `validate-checker-error-handling.
js` (6 cenários) revalidadas sem falhas; `validate-cache-invalidacao-
checker.js` também revalidada após corrigir uma fragilidade própria
do teste (data de candle fixa no passado, sem relação com esta
correção - não regressão de código).
--------

FEATURE-010 — Risco financeiro vira aviso, não bloqueio; bloqueio de
verdade migra pro checkbox "Operação Real"
(scripts/decisionEngine.js, scripts/moneyManager.js,
scripts/pairAnalyzer.js, js/historico.js)

Origem: discussão direta com o usuário sobre por que
`avaliarConfiguracao()` (BUG-021) REPROVA (bloqueia) um sinal inteiro
quando o risco calculado passa do teto do perfil. Usuário argumentou
que a análise técnica (score/qualidade/tendência, calculada por
`marketAnalyzer.js`) não recebe banca nem lote como entrada - não
piora nem melhora com o tamanho da conta - então bloquear o sinal
inteiro por causa do saldo não protege o aprendizado (`taxaAcerto` é
sobre a direção do preço ter acertado, não sobre quanto dinheiro
estava em jogo), só impede o usuário de decidir se quer assumir o
risco. Argumento verificado contra o código e confirmado correto:
nenhuma entrada de `marketAnalyzer.js` depende de banca/lote/saldo.
Combinado com o usuário (mensagem "3.1"/"3.2"): o sinal deve salvar
normal (Conta Simulada sempre acompanha, como já era) mesmo com risco
alto - mas o usuário NÃO pode marcar esse sinal como "Operação Real"
se o saldo real dele não seria suficiente pra ter coberto o SL
daquela operação (ele não teria conseguido executar isso de verdade
na XM com esse saldo).

Achado/Decisão: dois pontos de controle diferentes, cada um no lugar
onde a decisão realmente pertence:

1. Geração do sinal (`decisionEngine.js`'s `avaliarOperacao()`): o
   bloqueio "Operação reprovada pelo Money Manager" (return
   `aprovado:false`/`SEM_VIABILIDADE`) foi removido. Em seu lugar, um
   `avisoRisco = {ativo, mensagem}` é montado e incluído nos retornos
   de aprovação (BUY/SELL) - o sinal segue aprovado, salva
   normalmente, e carrega o aviso junto. Os outros gates (score
   mínimo, histórico mínimo por perfil, multi-timeframe divergente)
   continuam bloqueando de verdade - não têm relação com risco
   financeiro, então não foram tocados.

2. `moneyManager.js`'s `gerarRecomendacao()`: a mensagem, que antes
   era um código genérico (`"UTILIZAR_CONFIGURACAO_SUGERIDA"`), agora
   descreve a situação real (saldo atual, SL em dólar, % de risco,
   pedindo confirmação do usuário) quando o motivo é `RISCO_ELEVADO`,
   ou a relação risco/retorno quando o motivo é `RISK_REWARD_INVALIDO`
   - essa mensagem é o texto que vai aparecer como aviso pro usuário.

3. `pairAnalyzer.js`: `avisoRisco: decisao.avisoRisco || null` passou
   a ser salvo junto com o resto da operação em `historico`.

4. `js/historico.js`: exibe um banner de aviso (⚠️) no card do sinal
   quando `sinal.avisoRisco?.ativo`. E o bloqueio de verdade migrou
   pra `window.alternarOperacaoReal()`: ao tentar MARCAR (não ao
   desmarcar) o checkbox "Operação Real", se `sinal.slUSD` for maior
   que o `saldoReal` atual, a marcação é recusada com um alert
   explicativo - não grava `operacaoReal` nem mexe no `saldoReal`.
   Serve também como checagem indireta: se isso disparar, ou o saldo
   real cadastrado está desatualizado (aporte feito e não registrado
   na tela de Config), ou a operação realmente não foi executada como
   o usuário estava tentando marcar.

Validado isoladamente (scratchpad):
`validate-feature010-aviso-risco.js` (9 cenários) - risco elevado
aprova o sinal com `avisoRisco.ativo=true` e mensagem descritiva
(antes reprovava com SEM_VIABILIDADE); risco dentro do perfil aprova
sem aviso (`avisoRisco: null`); score insuficiente continua
bloqueando de verdade (gate não tocado). `validate-feature010-
bloqueio-real.js` (12 cenários) - saldo insuficiente bloqueia marcar
como Real (sem gravar nada, com alerta); saldo suficiente marca e
soma normalmente; desmarcar nunca é bloqueado por saldo; saldo
EXATAMENTE igual ao SL não bloqueia (limite é estritamente maior);
sinal sem `resultadoFinanceiro` continua caindo no guard do BUG-022,
sem chegar na checagem nova. Suítes de regressão `validate-bug021-
moneymanager.js`, `validate-hierarquia-perfil.js`, `validate-bug024-
valorpip.js`, `validate-bug025-checker-limites.js`, `validate-
bug019-alternar-operacao-real.js` e `validate-bug022-feedback-
checkbox.js` (esta última com offset de linha corrigido) revalidadas
sem falhas.
--------

PENTE-FINO-001 — Perfil Conservador permanentemente inoperante
(scripts/pairAnalyzer.js)

Origem: usuário pediu uma auditoria completa do pipeline inteiro
(scanner.js → marketAnalyzer.js/historyAnalyzer.js/scoreEngine.js →
statisticsEngine.js → decisionEngine.js → moneyManager.js →
checker.js) antes de reativar o Scanner, dado o volume de correções
feitas no mesmo dia. Lendo `scripts/statisticsEngine.js`'s
`operacaoAtendeRigorDoPerfil()` (RIGOR_PERFIL: cada operação salva só
conta como evidência pro perfil atual se foi aprovada por um perfil
igualmente ou mais rigoroso) e comparando com `pairAnalyzer.js`, foi
identificado que o `perfil` calculado (linha "const perfil =
(configuracao?.perfil || "balanceado").toUpperCase();") nunca era
incluído no objeto `analise`/`operacao` salvo no Firestore.

Achado: sem o campo `perfil` no documento salvo,
`operacaoAtendeRigorDoPerfil(dados.perfil, perfilAtual)` sempre recebia
`undefined` como `perfilOperacao`, caindo no fallback
`"BALANCEADO"` (rigor 2). Pro perfil CONSERVADOR (rigor 3), a
comparação `rigorOperacao(2) >= rigorAtual(3)` é sempre falsa - ou
seja, NENHUMA operação, de nenhum par, jamais contava como evidência
pro Conservador, não importa quanto histórico real se acumulasse.
`decisionEngine.js` exige 30 operações mínimas pro perfil Conservador
(`PERFIL_ANALISE.CONSERVADOR.operacoesMinimas`) - como essa contagem
ficava travada em 0 pra sempre, o Conservador nunca conseguia aprovar
nenhum sinal, sempre retornando `SEM_VIABILIDADE` ("Histórico
insuficiente"), mesmo com milhares de sinais reais no histórico.
Estava dormente na prática (perfil padrão do app é Balanceado), mas
quebraria silenciosamente - sem erro nenhum, parecendo "mercado
ruim" - assim que o perfil Conservador fosse selecionado.

Correção: `perfil` (já calculado) adicionado ao objeto `analise`
salvo em `pairAnalyzer.js`.

Validado isoladamente (scratchpad): teste que reproduz o bug
(`validate-pentefino-conservador-quebrado.js`) confirma que, com o
schema anterior (sem `perfil`), 0 de 100 operações contam pro
Conservador e o gate de `decisionEngine.js` fica travado em
`SEM_VIABILIDADE` mesmo com histórico muito acima do mínimo - e que,
com o campo presente, as mesmas operações passam a contar
normalmente. Teste de ponta a ponta (`validate-pentefino001-perfil-
salvo.js`, via `analisarPar()` completo com mocks) confirma que o
documento efetivamente salvo agora carrega `perfil: "CONSERVADOR"`
(maiúsculo, consistente com o resto do pipeline).
--------

PENTE-FINO-002 — Gate de "mercado sem tendência" comparava o campo
errado, bloqueando sinais válidos por score (scripts/decisionEngine.js)

Origem: mesma auditoria completa do PENTE-FINO-001. Ao ler
`marketAnalyzer.js`'s `analisarEMAs()`/`classificarQualidade()`,
confirmado que nenhuma das duas funções jamais produz o valor
`"LATERAL"` - `classificarQualidade(scoreFinal)` só retorna
INSTITUCIONAL/FORTE/BOA/ACEITAVEL/CONFLITO; `analisarEMAs()` inicia
`tendencia = "LATERAL"` mas todo branch do if/else é exaustivo
(sempre sobrescreve pra ALTA/BAIXA/COMPRESSAO/CONFLITO) - o valor
inicial nunca sobrevive.

Achado: `decisionEngine.js`'s `avaliarOperacao()` tinha `if
(qualidade === "LATERAL" || qualidade === "CONFLITO")` - comparando
`qualidade` (a categoria por SCORE final) contra "LATERAL" (que
`qualidade` nunca assume - metade da condição sempre falsa,
inofensiva, porque o mesmo caso já caía no catch-all genérico no fim
da função com o mesmo resultado, só motivo/status menos específicos).
Mas a outra metade, `qualidade === "CONFLITO"`, tinha efeito colateral
real: `classificarQualidade()` retorna "CONFLITO" sempre que
`scoreFinal < 70`, então QUALQUER sinal - mesmo com tendência ALTA/
BAIXA clara e aprovado pelo `scoreMinimo` do próprio perfil
(AGRESSIVO: 35, BALANCEADO: 45) - era bloqueado aqui se o score final
ficasse entre o mínimo do perfil e 70. Um segundo gate de score,
fixo e cego ao perfil, sobrepondo silenciosamente o `scoreMinimo` por
perfil já definido em `PERFIL_ANALISE` (o motivo de existir esse
gate por perfil, em primeiro lugar). Usuário autorizou a correção
explicitamente ao revisar o achado.

Correção: a condição passou a checar `tendencia` (o campo que de
fato representa "mercado sem direção definida": `COMPRESSAO`/
`CONFLITO`), não mais `qualidade`. `motivo` da resposta também
corrigido pra bater com a `justificativa` ("Mercado sem tendência
definida" em vez do genérico "Qualidade insuficiente").

Efeito esperado em produção: sinais com tendência clara (ALTA/BAIXA)
e score entre o mínimo do perfil e 70 - principalmente perfil
AGRESSIVO (mínimo 35) e BALANCEADO (mínimo 45) - deixam de ser
bloqueados por essa checagem redundante; o `scoreMinimo` de cada
perfil volta a ser o único gate de score que vale, como o desenho
original de `PERFIL_ANALISE` pretendia.

Validado isoladamente (scratchpad, 5 cenários,
`validate-pentefino002-mercado-lateral.js`): tendência ALTA/BAIXA
clara com `qualidade: "CONFLITO"` e score acima do mínimo do perfil
agora aprova (antes bloqueava incorretamente); tendência `COMPRESSAO`
e `CONFLITO` (mercado realmente sem direção) continuam bloqueando,
agora com motivo específico; regressão de sinal forte/score alto
continua aprovando normalmente. Suítes `validate-feature010-aviso-
risco.js` e `validate-bug021-moneymanager.js` revalidadas sem falhas.
--------

PENTE-FINO-003 — Cooldown não impedia posições simultâneas no mesmo
par (scripts/riskManager.js)

Origem: usuário observou, nos primeiros sinais reais gerados após
ligar o Scanner, que USD/JPY e AUD/USD acumularam 2 operações
`ABERTA` cada ao mesmo tempo, com intervalos de 36 e 52 minutos entre
elas - maior que o cooldown configurado (30 min) - e perguntou se o
cooldown não deveria ter bloqueado. Confirmado com a conta exata:
36min e 52min > 30min, então pela lógica antiga o bloqueio realmente
não deveria disparar. Usuário confirmou explicitamente a expectativa
correta: "o cooldown deve bloquear enquanto o sinal, que já foi
aprovado, está em andamento".

Achado: `existeCooldown()` só checava "a última operação deste par
foi ABERTA há menos de X minutos?" - nunca checava se essa última
operação ainda estava com `status === "ABERTA"` (ainda não fechou).
Como o cooldown conta a partir da ABERTURA, não do fechamento, um par
cujo TP/SL demorasse mais que o cooldown pra bater - bem provável,
dado TP/SL de $3 e lote pequeno (0.02) nas condições atuais de
mercado - ficava livre pra abrir uma SEGUNDA posição simultânea no
mesmo par assim que o timer passasse, mesmo com a primeira ainda em
andamento. Cada posição calcula seu próprio risco isoladamente
contra a banca total (`riscoPercentual`, `avisoRisco`) - nada no
pipeline soma a exposição real quando há mais de uma posição aberta
no mesmo par ao mesmo tempo, então essa lacuna multiplicava risco
não contabilizado.

Correção: `existeCooldown()` agora bloqueia imediatamente quando a
última operação salva do par tem `status === "ABERTA"`, independente
de quanto tempo passou desde a abertura. Só cai no cálculo por tempo
(comportamento original) quando a última operação já está
`ENCERRADA`.

Validado isoladamente (scratchpad, 6 cenários): operação ABERTA há
52min (acima do cooldown) continua bloqueando - reproduz e corrige o
caso real de produção; operação ABERTA há 5min continua bloqueando
(comportamento já esperado, sem regressão); operação ENCERRADA há
52min libera normalmente; operação ENCERRADA há 5min ainda bloqueia
pelo timer (regressão do comportamento original preservada); sem
operação anterior libera; status diferente de "ABERTA" não trava por
si só, cai no timer. Suíte de regressão `validate-limpeza005-
salvaroperacao.js` (mesmo arquivo) revalidada sem falhas.

Efeito esperado em produção: as duplicatas já abertas (USD/JPY x2,
AUD/USD x2) continuam normalmente até fechar - a correção só evita
NOVAS duplicatas a partir de agora, não fecha as que já existem.
--------

PENTE-FINO-004 — expectativaMinima nunca era aplicada; RSI/EMA
sempre "--" no detalhe do sinal; sem indicação de ajuste automático
(scripts/decisionEngine.js, scripts/moneyManager.js,
scripts/pairAnalyzer.js, js/historico.js)

Origem: usuário revisou o detalhe de um sinal real no app e perguntou
(a) se o TP/SL de $3 exibido era configuração manual ou sugestão do
sistema, (b) por que RSI e as EMAs apareciam como "--", e definiu a
regra pro achado da expectativa negativa do turno anterior: bloquear
de verdade no Conservador e no Balanceado, só avisar no Agressivo.

Achado 1 (expectativaMinima morta): `moneyManager.js`'s
`PERFIL_FINANCEIRO` define `expectativaMinima` por perfil (0/0/-1)
desde sempre, mas nenhuma função no arquivo - nem `avaliarConfiguracao()`,
nem `validarPerfilFinanceiro()` (já campo morto por outro motivo, ver
BUG-021) - nunca lê esse campo. Os 3 sinais reais abertos no mesmo dia
tinham expectativa negativa (-0.45, -0.52, -2.06) e foram aprovados
sem nenhuma checagem sobre isso.

Achado 2 (RSI/EMAs sempre "--"): `pairAnalyzer.js` salva os
indicadores técnicos ANINHADOS em `operacao.indicadores.{rsi, ema9,
ema21, ema200, ...}` - mas `js/historico.js` lia os campos NO NÍVEL
RAIZ do documento (`sinal.rsi`, `sinal.ema9`, `sinal.ema21`,
`sinal.ema200`), que nunca existiram ali. Bug pré-existente (não
introduzido nesta sessão), só agora percebido porque foi a primeira
vez que um sinal real foi conferido com atenção no detalhe.

Achado 3 (nenhuma indicação de ajuste automático): a tela mostrava
Lote/TP/SL como se fossem sempre o valor configurado manualmente,
mesmo quando `decidirConfiguracaoMercado()` os havia reduzido
automaticamente (ADX fraco, ATR baixo ou expectativa negativa) -
gerando a pergunta do usuário.

Correção:

1. `moneyManager.js` exporta `obterPerfilFinanceiro` (única fonte da
   tabela 0/0/-1, não duplicada em outro arquivo).
2. `decisionEngine.js`'s `avaliarOperacao()` agora usa essa tabela: se
   `expectativa < expectativaMinima` do perfil, e o perfil é
   CONSERVADOR ou BALANCEADO, reprova de verdade (`aprovado:false`,
   `SEM_VIABILIDADE` - sinal nem salva); se o perfil é AGRESSIVO,
   aprova normalmente mas anexa `avisoExpectativa: {ativo, mensagem}`
   ao resultado (mesmo padrão do `avisoRisco` da FEATURE-010).
   `pairAnalyzer.js` passa `expectativa: financeiro.expectativa` na
   chamada e salva `avisoExpectativa: decisao.avisoExpectativa ||
   null` no documento.
3. `js/historico.js`: os 4 campos (RSI/EMA9/EMA21/EMA200) agora leem
   de `sinal.indicadores?.X`, com fallback pro campo raiz antigo
   (`sinal.X`) só por segurança - não quebra nenhum schema anterior
   que porventura tivesse usado o formato plano. Novo banner ⚠️/📉
   pro `avisoExpectativa` (mesmo estilo do banner de risco). Nova
   função `bannerConfiguracaoAjustada()`: lê
   `sinal.financeiro.decisaoMercado.decisao` e mostra um aviso 🤖
   "ajustado automaticamente" com o motivo (ADX fraco / baixa
   volatilidade / expectativa negativa reduziu o lote) quando o
   sistema alterou Lote/TP/SL, ou uma confirmação ✅ "conforme
   configurado" quando não houve ajuste (`decisao === "MANTER"` ou
   campo ausente, schema antigo).

Validado isoladamente (scratchpad): `validate-pentefino004-
expectativa.js` (13 cenários) - expectativa abaixo do mínimo bloqueia
de verdade no Conservador/Balanceado; a mesma expectativa (-0.5,
dentro do limite -1 do Agressivo) aprova sem aviso; expectativa bem
negativa (-2.06, replicando o caso real) no Agressivo aprova COM
aviso; expectativa ausente não quebra a função; risco financeiro e
expectativa ruins coexistem como dois avisos independentes no
Agressivo. `validate-historico-rsi-ema-ajuste.js` (12 cenários) -
banner mostra "ajustado automaticamente" com o motivo certo por
código de decisão, banner "sem ajuste" quando MANTER ou campo
ausente, e os 4 campos de indicador agora leem o valor real
aninhado (antes sempre "--"). Suítes de regressão `validate-
feature010-aviso-risco.js`, `validate-pentefino002-mercado-
lateral.js`, `validate-bug021-moneymanager.js`, `validate-
pentefino001-perfil-salvo.js`, `validate-feature010-bloqueio-
real.js` e `validate-bug022-feedback-checkbox.js` (offset de linha
corrigido de novo) revalidadas sem falhas.
--------

FEATURE-011 — Push notification na abertura e no encerramento do
sinal, com deep link pra XM (scripts/pushNotifier.js,
scripts/pairAnalyzer.js, scripts/scanner.js, js/checker.js,
firebase-messaging-sw.js)

Origem: pedido explícito do usuário, retomando uma funcionalidade que
"chegou a funcionar" numa versão anterior do projeto e quebrou sem
nunca ser consertada. Investigação anterior (mesmo dia) já tinha
confirmado que só o CADASTRO do dispositivo existia (`js/push.js`,
`messaging().getToken()`) - nenhum código em lugar nenhum do
repositório chamava `admin.messaging().send()`. Usuário pediu push
na abertura E no encerramento do sinal, com uma estimativa de "tempo
hábil pra agir" baseada em ATR (não um número arbitrário) - a mesma
ideia da versão antiga. Link de destino ao tocar a notificação:
decidido com o usuário como a área geral da conta XM
(`my.xm.com/pt/member`) - XM não expõe URL pública que abra uma
ordem pronta ou logue automaticamente.

Design:

1. **`scripts/pushNotifier.js`** (novo módulo): NÃO chama
   `admin.initializeApp()` - recebe `admin`/`db` já inicializados de
   quem chama. Motivo: `js/checker.js` já inicializa o próprio Admin
   diretamente (`admin.initializeApp()` no topo do arquivo);
   `scripts/scanner.js` inicializa via `./firebase`. Chamar
   `initializeApp()` de novo no mesmo processo derruba com "the
   default Firebase app already exists" - confirmado como risco real
   antes de escrever qualquer código, não depois de quebrar em
   produção.

   - `estimarTempoHabilMinutos(atrAtual, slPips, par)`: ATR de 14
     períodos em candles de 5min representa a amplitude MÉDIA de UM
     candle de 5min (não dos 14 juntos) - dividido por 5, vira uma
     velocidade média de pips/minuto. A janela "hábil" é o tempo, nessa
     velocidade, pra percorrer 15%-30% do SL em pips (banda
     conservadora: além disso, a entrada já não reflete bem o que
     gerou o sinal). Teto de 10-15 min (sinal validado em candles de
     5min não deveria prometer janelas de dezenas de minutos). Fallback
     3-5min quando falta ATR/SL.
   - `enviarPushAbertura(admin, db, operacao)` / `enviarPushEncerramento(admin, db, sinal)`:
     leem tokens ativos (`tokens` where `ativo==true`), montam
     notification+data, enviam token por token (não multicast - poucos
     tokens esperados, evita qualquer dúvida de compatibilidade de
     versão do SDK). Cada uma envolvida no próprio try/catch: uma
     falha de envio (FCM fora do ar, Firestore indisponível pra ler
     tokens) NUNCA propaga pra quem chamou - só loga um aviso. Token
     que o FCM reporta como não registrado/inválido é desativado
     (`ativo:false`) automaticamente, sem interromper o envio pros
     demais tokens.
   - `data.url` sempre `https://my.xm.com/pt/member` (constante
     `URL_XM_MEMBER`) - centralizado num só lugar, fácil de trocar se
     a decisão mudar depois.

2. **`scripts/pairAnalyzer.js`**: novo parâmetro OPCIONAL
   `enviarPushAbertura`, injetado (mesmo padrão de `salvarOperacao`/
   `existeCooldown`) - preserva a testabilidade da função sem precisar
   mockar Firebase Admin quando o teste não se importa com push.
   Chamado logo depois de `salvarOperacao()`, com a `operacao` recém
   salva - envolvido no PRÓPRIO try/catch local (achado durante o
   teste, não depois: sem esse try/catch local, uma falha no push
   escapava pro try/catch GERAL da função e fazia `analisarPar()`
   retornar status "ERRO" mesmo com o sinal já salvo com sucesso no
   Firestore - um sinal real, persistido, reportado como se tivesse
   falhado).

3. **`scripts/scanner.js`**: importa `enviarPushAbertura` de
   `pushNotifier.js` e cria uma versão pré-vinculada a `admin`/`db`
   reais (`./firebase`) antes de passar pra `analisarPar()` - assim
   `pairAnalyzer.js` só chama `enviarPushAbertura(operacao)`, sem
   precisar saber nada sobre Firebase Admin.

4. **`js/checker.js`**: chama `enviarPushEncerramento(admin, db,
   {...})` logo depois que a transação de fechamento confirma
   (`await db.runTransaction(...)` já resolvido - nunca dentro da
   própria transação, pra não segurar uma chamada de rede lenta
   com a transação aberta), com try/catch próprio, mesmo
   `enviarPushEncerramento` já engolindo os próprios erros - defesa
   em camada dupla, barata e sem custo real.

5. **`firebase-messaging-sw.js`**: `onBackgroundMessage()` agora
   repassa `data: payload.data` pro `showNotification()` (antes não
   repassava nada - a notificação aparecia, mas sem informação
   nenhuma de destino). Novo listener de `notificationclick` - antes
   NÃO EXISTIA nenhum (tocar na notificação não fazia nada, o usuário
   tinha que abrir a XM manualmente por fora). Reaproveita uma aba já
   aberta do app na mesma URL, se existir; senão abre uma nova.

Validado isoladamente (scratchpad):
`validate-push-estimativa-tempo.js` (10 cenários) - janela cresce
quando o mercado está mais lento (ATR menor), nunca degenera num
único minuto, respeita o teto de segurança, cai no fallback 3-5min
sem ATR/SL. `validate-push-envio.js` (19 cenários) - envia pra todos
os tokens ativos com título/corpo/data corretos; token
inválido é desativado sem impedir o envio pros demais; erro genérico
do FCM não desativa o token nem propaga; Firestore indisponível ao
ler tokens não derruba a função (achado e corrigido no meio do teste:
formatação de valor negativo mostrava "$-3.20" em vez de "-$3.20" -
`toFixed()` já inclui o sinal, concatenar "$" na frente duplicava a
posição do sinal). `validate-push-integracao-pairanalyzer.js` (6
cenários) - confirma a ordem certa (push depois de salvar), que
ausência do parâmetro não quebra chamadas antigas, e o achado do
try/catch local descrito acima (push falhando não derruba o SALVO).
`validate-push-integracao-checker.js` (10 cenários, via require real
do módulo com mocks) - push chamado com par/resultado/valor corretos
depois da transação confirmar; falha no push não impede o resto do
ciclo do Result Checker. Suítes de regressão `validate-checker.js`,
`validate-checker-error-handling.js`, `validate-cache-invalidacao-
checker.js`, `validate-bug025-checker-limites.js`, `validate-
pentefino001-perfil-salvo.js` e `validate-pentefino004-
expectativa.js` revalidadas sem falhas. `node --check` limpo nos 4
arquivos JS tocados (não há framework de teste automatizado pra
Service Worker/browser neste projeto - `firebase-messaging-sw.js`
validado só por sintaxe e revisão manual).

Pendente, fora do escopo desta correção: nenhuma tela do app mostra
hoje se o push está de fato ativo/qual erro ocorreu além do que já
existia em `js/push.js` (grava em `scanner/status.pushDebug`, sem UI
dedicada) - se o primeiro sinal real não gerar notificação, o
primeiro lugar a olhar é esse documento no Firestore, não um log de
tela.
--------
FEATURE-012 — Movimento completo do preço (entrada → encerramento) no
detalhe do sinal (js/checker.js, js/historico.js)

Origem: pedido do usuário, depois de ver o primeiro sinal real
fechar: "conseguimos depois do fechamento analisar o movimento
completo desde a entrada do sinal até o encerramento?".

Achado que tornou isso quase de graça: `js/checker.js`'s
`buscarCandlesDesde()` já busca TODOS os candles desde
`sinal.inicioOperacao` a cada ciclo (não incremental - ver comentário
já existente sobre atrasos do cron do GitHub Actions) - no ciclo que
efetivamente fecha a operação, a variável `candles` já contém o
caminho inteiro do preço, do início ao fim. Não foi preciso nenhuma
chamada extra à API nem redesenho do fluxo existente.

Correção/Feature:

1. `js/checker.js`: nova função `amostrarCaminhoPrecos(candles,
   maxPontos=300)` - grava até 300 pontos `{t, c}` (timestamp +
   close) no documento fechado, como `caminhoPrecos`. Teto de 300
   pontos de propósito: sem isso, uma operação que ficasse aberta por
   muitas horas geraria um array enorme e sem controle - mesmo
   princípio de "nunca deixar algo crescer sem teto" já aplicado em
   CACHE-001/LIMPEZA-006/BUG-017. Sempre inclui o ÚLTIMO candle (o do
   fechamento) mesmo quando isso significa passar do teto por 1 -
   sem isso o gráfico "mentiria" sobre onde a operação realmente
   fechou.
2. `js/historico.js`: nova função `renderizarCaminhoPrecos(sinal)` -
   SVG inline (sem biblioteca externa, mesma filosofia vanilla-JS do
   resto do app), uma polyline simples colorida por resultado (verde
   WIN / vermelho LOSS), com uma linha tracejada marcando o preço de
   entrada como referência. Só aparece no detalhe de sinais já
   `ENCERRADA` (sinais pendentes ou antigos, sem `caminhoPrecos`, não
   mostram nada - função retorna string vazia, sem gráfico quebrado).

Validado isoladamente (scratchpad, 14 cenários,
`validate-caminho-precos.js`): amostragem retorna tudo quando está
abaixo do teto; acima do teto, nunca passa muito de 300 e SEMPRE
inclui o candle de fechamento real; array vazio e exatamente-no-teto
não quebram; SVG gera cor certa por resultado (WIN/LOSS), inclui a
linha de referência da entrada, e retorna vazio com segurança quando
falta `caminhoPrecos` ou há só 1 ponto (não dá pra traçar linha).
`node --check` limpo nos dois arquivos. Suítes de regressão
`validate-checker.js`, `validate-checker-error-handling.js`,
`validate-cache-invalidacao-checker.js`, `validate-bug025-checker-
limites.js` e `validate-push-integracao-checker.js` revalidadas sem
falhas.
--------
FEATURE-013 — Dashboard: remoção de cards redundantes e reordenação do
card Desempenho (js/expert.js, js/desempenho.js)

Origem: pedido do usuário revisando o app real (prints do dashboard e
do histórico). Três observações diretas: "sinais hoje não contabilizou
os sinais, mas com o placar acima, não vejo necessidade desse campo",
"qualidade do mercado tbm não entendi, mas acho que não precisamos
tbm", "último sinal tbm não" - e, à parte, pedido pra inverter a ordem
de "Filtrar por dia" e "Sinais desde sempre" dentro do card Desempenho
(o filtro por dia subindo, o total "desde sempre" descendo, virando o
fechamento do card).

Correção/Feature:

1. `js/expert.js`: removidos os 3 cards `Sinais Hoje`, `Qualidade do
   Mercado` e `Último Sinal` de `dashboardView()`, junto com o bloco
   de JS que escrevia neles (`dados.sinaisHoje`, `dados.ultimaAnalise`,
   `dados.ultimoSinal` - leitura pura, sem efeito colateral em nenhum
   outro lugar do sistema, confirmado por grep antes de remover).
   `Cooldowns Hoje` foi mantido (não fazia parte do pedido).
2. `js/desempenho.js`: `renderDesempenho()` reordenado - o bloco
   `Filtrar por dia` + resultado do dia filtrado (`desempenhoDiario`)
   agora vem logo após Conta Real/Conta Simulada, e `Sinais desde
   sempre` (o total agregado, mais estático dos três) virou o último
   item do card, em vez de ficar espremido entre o input de data e o
   resultado que depende dele.

Validado: `node --check` limpo nos dois arquivos.
`validate-aporte-saldo-real.js` e `validate-desempenho.js`
revalidados sem falhas (testam as funções de dado por trás do card,
não o HTML em si - a reordenação de template não tinha cobertura
automatizada prévia, mudança de baixo risco).
--------
FEATURE-014 — Correção do texto do aviso de risco elevado
(scripts/moneyManager.js)

Origem: usuário revisando o aviso real em produção (print de um sinal
com SL de $3.00 contra saldo de $4.89), pedindo uma frase mais
objetiva.

Achado, apontado antes de reescrever: a frase antiga ("Essa operação
tem SL de $X (Y% da sua banca) - acima do limite recomendado... Você
concorda em operar mesmo assim?") tinha dois problemas, não só
tamanho. (1) Desde a FEATURE-010, esse aviso não bloqueia mais nada -
perguntar "você concorda?" sugere uma ação de aceitar/recusar que não
existe, o que é enganoso sobre o que o sistema realmente faz. (2) A
primeira reformulação proposta pelo usuário ("X% acima do
recomendado") confundia dois números diferentes: o risco percentual
da operação (quanto do saldo o SL representa) não é o mesmo que "o
quanto esse risco excede o recomendado" - "102% acima do recomendado"
só bate com "102% da banca" por coincidência numérica nesse caso
específico (2% + 100% = 102%); com outros números (ex.: risco de 5%
contra teto de 2%) as duas frases dariam valores diferentes.

Correção: `gerarRecomendacao()` agora recebe `perfil` como segundo
parâmetro (antes só recebia `simulacao`) e usa
`obterPerfilFinanceiro(perfil).riscoPorOperacao` pra citar o teto real
do perfil (1%/2%/3% Conservador/Balanceado/Agressivo). Mensagem nova:
"Essa operação arrisca X% da sua banca - acima do máximo recomendado
(Y%). Em caso de Loss, pode ser necessário um novo aporte." - mantém
os números concretos (que são a parte que ajuda a decidir), tira a
pergunta retórica sem função, e não mistura risco percentual com
delta acima do teto. O emoji ⚠️ não entra na mensagem em si porque
`js/historico.js` já prefixa o aviso com ⚠️ ao renderizar
(`sinal.avisoRisco.mensagem`) - colocar no texto também duplicaria.

Validado: teste isolado confirmando a mensagem com números reais
("SL 3 / banca 4.89 -> risco 61.3%, teto Balanceado 2%"), e
`validate-feature010-aviso-risco.js` revalidado (a asserção antiga,
que checava a presença literal das palavras "saldo/SL/risco" no
texto, foi atualizada pra "banca/recomendado/aporte" - reflete a
mudança de copy deliberada desta correção, não uma quebra). `node
--check` limpo.
--------
FEATURE-015 — Comparação de sinais do mesmo par, lado a lado
(js/historico.js)

Origem: usuário pediu pra comparar sinais manualmente (3 sinais reais
de AUD/USD SELL, verificados via TwelveData/result-checker.yml antes
desta feature - ver conversa) e gostou do formato de tabela usado
nessa checagem manual. Pediu pra virar recurso do app: checkbox por
sinal pra selecionar quais comparar, restrito ao mesmo par, seleção
livre (sem limite de quantidade), abrindo como seção nova dentro do
próprio Histórico (não modal) - pra caber melhor girando o celular.

Achado que tornou a feature barata: `js/checker.js` já grava
`precoAtual`, `precoMaximo`, `precoMinimo`, `maxPipsFavor`,
`maxPipsContra` e `resultadoFinanceiro` no documento a cada ciclo de
5 min, tanto pra sinais ainda `ABERTA` (branch else da atualização,
antes do fechamento) quanto pra `ENCERRADA` (dentro da transação de
fechamento) - os mesmos nomes de campo nos dois casos. Ou seja: os
"campos atuais" que a comparação precisa já existem no documento,
sem exigir nenhuma captura nova nem chamada extra à API. Confirmado
lendo o código antes de implementar, não suposto.

Feature:

1. Checkbox `.chk-comparar` no fim da linha de resumo de cada sinal
   (ao lado do badge de resultado) - ausente em linhas de COOLDOWN
   (não faz sentido comparar um cooldown). `onclick="event.
   stopPropagation()"` no próprio input, não só no `onchange` -
   necessário porque o listener de expandir/recolher o card está no
   `click` do `<div data-sinal-id>` que envolve a linha inteira;
   sem isso, marcar o checkbox também expandiria/recolheria o card
   (mesma armadilha que o clique no checkbox "Operação Real", dentro
   do detalhe, já tem hoje - não corrigida aqui por estar fora do
   escopo pedido).
2. `alternarSelecaoComparacao()`: mantém `sinaisComparacaoSelecionados`
   (Set de ids). Ao marcar um sinal de par diferente do(s) já
   selecionado(s), bloqueia com alert explicando o motivo e desmarca
   o checkbox de volta - sem limite de quantidade quando o par bate.
3. `cacheSinaisHistorico` (id -> {sinal, dataObj}) populado a cada
   `carregarHistorico()`, evitando nova leitura ao Firestore só pra
   montar a comparação - reusa os mesmos 300 docs já buscados pra
   lista normal.
4. Barra flutuante fixa (`#barraComparacao`) aparece com 1+
   selecionados, mostrando a contagem e os botões "Limpar"/"Comparar".
5. `abrirComparacao()`: exige 2+ selecionados (com menos, alerta e
   não abre). Monta uma tabela (Horário, Direção, Status, Entrada,
   Atual, Máx, Mín, Favor, Contra, USD) dentro de `#historicoComparacao`,
   escondendo a lista normal e a barra flutuante. Wrapper com
   `overflow-x:auto` pra rolar a tabela sem quebrar o layout girando
   o celular. `fecharComparacao()` ("← Voltar") restaura a lista.
   `limparSelecaoComparacao()` zera a seleção e fecha a comparação.

Validado isoladamente (scratchpad, 23 cenários,
`validate-comparacao-sinais.js`, historico.js carregado via
`vm.runInContext` já que é script de browser sem module.exports):
primeira seleção nunca bloqueia; par diferente bloqueia com alert e
desmarca o checkbox de volta; mesmo par aceita 3+ sinais sem limite;
desmarcar remove da seleção e atualiza a contagem; `abrirComparacao()`
recusa com menos de 2 selecionados; a tabela reproduz corretamente o
caso real usado como referência (AUD/USD SELL pendente com entrada
0.71621/atual 0.71608/favor 9.7/contra -4.2/USD +$0.78, comparado com
um sinal já fechado em WIN); "Voltar" restaura a lista; "Limpar" zera
o Set de verdade (confirmado selecionando um par totalmente diferente
logo depois, sem bloqueio). `node --check` limpo, `validate-bug022-
feedback-checkbox.js` revalidado com offset de linha atualizado (a
extração por `linhas.slice()` quebrou com as ~180 linhas novas antes
de `alternarOperacaoReal` - mesma fragilidade de teste já documentada
em sessões anteriores, não regressão de código).
--------
Ajuste na FEATURE-015 (mesmo dia): a dica "Gire o celular pra ver a
tabela inteira mais confortável" aparecia sempre, mesmo depois de
girar e a tabela já caber sem precisar de scroll - encontrado testando
visualmente no navegador (Chromium via Playwright, screenshots em
retrato e paisagem, antes de reportar como pronto). Corrigido:
`abrirComparacao()` agora mede `scrollWidth` vs `clientWidth` do
wrapper da tabela e só mostra a dica quando ela realmente não cabe,
reavaliando a cada evento de `resize` (a própria rotação do celular)
enquanto a comparação estiver aberta. Validado visualmente (400px
retrato: dica visível; 800px paisagem: dica some) e via
`validate-comparacao-sinais.js` (mock de `window.addEventListener`
adicionado ao teste, que antes não previa essa chamada).
--------
Ajustes na FEATURE-012 e FEATURE-015 (mesmo dia, feedback do usuário
depois de ver as duas em produção real no celular):

1. Régua de preço no gráfico do detalhe do sinal (js/historico.js,
   `renderizarCaminhoPrecos`). Pedido: "faltou a régua na lateral do
   início e na lateral do fim" - o gráfico (FEATURE-012) só tinha a
   linha colorida e a referência tracejada da entrada, sem nenhum
   número de preço visível. Agora o SVG reserva uma margem de cada
   lado (`margemRegua = 32` unidades do viewBox) e mostra o preço
   Máximo (topo) e Mínimo (base) do período, repetidos nas duas
   laterais (início e fim da linha do tempo) - dá referência de preço
   onde quer que o usuário esteja olhando, sem precisar caçar num
   canto só. Casas decimais adaptadas ao par (3 pra pares com JPY, 5
   pros demais - mesma convenção de pip usada em scripts/moneyManager.js).
   Verificado visualmente (Chromium/Playwright, screenshot com zoom no
   SVG) que o texto não sai distorcido apesar do
   `preserveAspectRatio="none"` (que estica X e Y de forma
   independente) - risco real que só apareceria testando de verdade,
   não em `node --check`.

2. Botão "⤢ Expandir" na comparação de sinais (js/historico.js,
   `abrirComparacao`/nova `alternarExpandirComparacao`). Dois achados
   do usuário testando no celular real: (a) a mensagem de aviso de
   risco (FEATURE-014) ainda aparecia com o texto antigo - **não é
   regressão**: `avisoRisco.mensagem` é gravada no documento no
   momento da análise (scanner.js) e nunca recalculada na leitura;
   nenhum sinal com risco elevado foi gerado desde o deploy (logs reais
   do `forex-scanner-real.yml` conferidos - só COOLDOWN/SEM_VIABILIDADE
   nos últimos ciclos), então o usuário só viu sinais antigos, gravados
   antes da correção. O texto novo vai aparecer no primeiro sinal novo
   que cair nessa condição. (b) girar o celular físico não estava
   reformatando a tabela de comparação como no teste (Chromium
   headless via Playwright reflow perfeitamente, mas emulação não é o
   dispositivo real) - suspeita, não confirmada: zoom/rotação manual de
   alguns navegadores mobile (ex.: o botão de "girar só esta aba" do
   Chrome Android quando a rotação automática do sistema está
   desligada) às vezes só amplia a renderização em retrato em vez de
   recalcular o layout. Em vez de perseguir esse comportamento
   específico de dispositivo/navegador (não reproduzível neste
   ambiente), o usuário pediu um equivalente pro computador - decidido
   resolver os dois com a mesma solução: um botão manual "Expandir"
   que joga a seção de comparação pra tela cheia (`position:fixed`
   cobrindo a viewport, ganhando a largura toda disponível sem depender
   de girar nada, físico ou de navegador). Funciona igual em qualquer
   dispositivo/janela. `reavaliarDicaGirar()` (antes só uma função
   fechada dentro de `abrirComparacao()`) virou função de módulo pra
   poder ser chamada também pelo toggle do botão.

Validado: `node --check` limpo. `validate-comparacao-sinais.js`
ampliado pra 27 cenários (4 novos: botão "Expandir" presente no
cabeçalho, alterna `position:fixed`/`zIndex` corretamente, e recolhe
de volta). Visual real via Chromium/Playwright: régua legível e sem
distorção (zoom no SVG isolado); botão "Expandir" testado numa janela
de desktop estreita (700px) - antes de expandir a coluna USD ficava
cortada, depois de expandir a tabela usa a largura cheia da tela e o
botão vira "Recolher"; recolher restaura o layout normal
corretamente.
--------
FEATURE-016 — "Modo Atual" gigante demais no dashboard
(css/styles.css, js/expert.js)

Origem: usuário revisando o app real, print do dashboard - "aquele
modo bola azul balanceado está muito grande no dashboard".

Achado: o card usava a classe `.big-number` (font-size:52px),
pensada pra números curtos de estatística (ex.: "0" em Cooldowns
Hoje, "156" em Total) - reaproveitada por engano pro rótulo de texto
"🔵 Balanceado"/"🟢 Agressivo"/"🟡 Conservador". Nesse tamanho, tanto o
emoji quanto a palavra inteira saem enormes, desproporcionais ao
resto do dashboard.

Correção: nova classe `.perfil-atual` (font-size:22px) substituindo
`.big-number` só no `#modoAtual` - mesma lógica de exibição
(`ROTULOS_PERFIL`), só o tamanho mudou. `.big-number` continua igual
pros cards numéricos (Cooldowns Hoje, etc.), não afetados.

Validado visualmente (Chromium/Playwright, harness isolado com
`dashboardView()` + `renderModoAtual()` mockando só
`configuracoes/geral.perfil`): card fica proporcional ao resto do
dashboard, sem alterar a lógica de qual perfil é mostrado. `node
--check` limpo.
--------
FEATURE-017 — Modo tabela no Histórico (girar o celular, ou botão no
computador) - js/historico.js

Origem: correção de rumo do usuário sobre a FEATURE-015/016. Ele não
queria só a comparação de sinais selecionados virando tabela ao girar
- queria o HISTÓRICO INTEIRO trocando de formato (cards -> tabela),
igual a uma referência visual que já tinha mandado antes (a mesma do
pedido de mover o checkbox "Operação Real" pro final da linha):
colunas Horário/Par/Direção/Tempo/Resultado/Resultado Financeiro/
Operação Real, agrupado por dia. Perguntei duas coisas antes de
construir (mudança grande demais pra arriscar errado): (1) o que
acontece com o detalhe rico (RSI/EMA/gráfico/Saldo Antes-Depois) em
modo tabela - resposta: continua expansível por linha, mesmo formato
de hoje; e ele comentou gostar do campo "Tempo" da referência, que não
existia ainda como coluna. (2) manter o agrupamento por mês/dia que já
existe, ou trocar por paginação numérica (a referência tinha "1 de
3") - resposta: manter o agrupamento (mais barato de construir e não
perde a organização por data já em uso).

Implementação:

1. `construirDetalheSinal(sinal, docId, estaAberto)` - o bloco de
   detalhe (RSI/EMA/ENTRADA-SAÍDA/gráfico do preço/Configuração
   Utilizada/LOTE/TP-SL/SALDO ANTES-DEPOIS/checkbox Operação Real) foi
   EXTRAÍDO do template do card pra uma função própria, reutilizada
   nos dois modos - card mode embute o div direto, modo tabela embute
   o mesmo div dentro de um `<td colspan="8">` numa linha própria. O
   listener de clique que expande/recolhe (`document.querySelectorAll
   ('[data-sinal-id]')`, já existente) não precisou de nenhuma
   mudança - ele já procura o elemento por `id="detalhe-${sinalId}"` e
   alterna `display:none/block`, e isso funciona igual não importa se
   esse id está dentro de um `<div>` de card ou de um `<td>` de
   tabela. Colocar a `<tr>` do detalhe SEMPRE presente (só o `<div>`
   interno alterna display) evitou o bug de tentar alternar
   `display:block` numa `<tr>` (quebraria o layout da tabela -
   `<tr>` precisa ficar em `display:table-row`).
2. `construirLinhaTabela(sinal, docId, dataObj, isCooldown,
   borderStyle, detalheHtml)` - linha de tabela equivalente ao card,
   mesmas colunas da referência + uma coluna extra "Cmp" (o checkbox
   de comparação da FEATURE-015, que precisa continuar acessível nos
   dois modos). Aviso de risco/expectativa (que no card aparece como
   banner sempre visível) vira um ícone (⚠️/📉) com tooltip (`title`)
   na coluna Resultado - continua visível sem precisar expandir a
   linha, só compacto.
3. Coluna "Tempo" nova - `obterTempoOperacaoMs()`/`formatarDuracaoMs()`.
   Sinais `ENCERRADA` usam `sinal.tempoOperacao` (já gravado por
   `js/checker.js` no fechamento); sinais ainda `ABERTA` calculam
   "tempo decorrido até agora" a partir de `inicioOperacao` (mesmo
   campo que `checker.js` já usa pra buscar candles) - uma foto do
   momento do carregamento, não fica contando ao vivo (mesmo padrão
   do resto do app, sem `setInterval`).
4. Troca automática por rotação real: `inicializarDeteccaoOrientacao()`
   usa `window.matchMedia("(orientation: landscape)")` - o mecanismo
   nativo do CSS pra isso (mais confiável que comparar
   `window.innerWidth` a cada `resize`, que foi o que pareceu falhar
   no celular real do usuário antes). Registrado uma única vez (guard
   `deteccaoOrientacaoInicializada`) porque `historicoView()` recarrega
   toda vez que o usuário entra na aba. O listener de `change` da
   media query atualiza `modoTabela` e chama `carregarHistorico()` de
   novo - sem precisar recarregar a página.
5. Botão manual "📊 Ver como tabela"/"📋 Ver como lista"
   (`alternarModoTabela()`) sempre visível no cabeçalho - equivalente
   pro computador (que não tem rotação física) e reforço no celular
   caso a detecção automática falhe nalgum navegador específico. O
   agrupamento por mês/dia (cabeçalho clicável, placar por dia)
   continua idêntico nos dois modos - só o conteúdo de dentro de cada
   dia troca entre lista de cards e `<table>` (com
   `overflow-x:auto`, mesmo padrão da FEATURE-015).

Validado: `node --check` limpo. Novo `validate-modo-tabela-
historico.js` (29 cenários): formatação de tempo (encerrado usa o
campo gravado, aberto calcula ao vivo, não quebra sem nenhum dos
dois); colunas da linha de tabela batem com a referência; aviso de
risco vira ícone com tooltip sem esconder atrás de um toque;
COOLDOWN não ganha checkbox de comparação; detecção de orientação
liga/desliga modoTabela automaticamente no evento de mudança e
recarrega a lista; guard contra registrar o listener mais de uma vez;
botão manual alterna independente da orientação atual. Suítes de
regressão revalidadas: `validate-comparacao-sinais.js` (27 cenários,
sem mudança de comportamento), `validate-caminho-precos.js` (14
cenários), `validate-bug022-feedback-checkbox.js` (offset de linha
atualizado - função `alternarOperacaoReal` moveu por causa das
~500 linhas novas antes dela no arquivo).

Validado visualmente, ponta a ponta, via Chromium/Playwright: (1)
retrato nasce em modo card com o botão manual disponível; (2)
redimensionar de verdade pra paisagem (simulando a rotação física, SEM
recarregar a página) troca pra tabela automaticamente via o listener
de `matchMedia`, com as colunas exatas pedidas; (3) tocar numa linha
expande o mesmo detalhe rico (RSI/EMA/Configuração/SALDO) dentro da
própria tabela; (4) redimensionar de volta pro retrato reverte pra
card automaticamente, preservando o estado de expandido/recolhido de
cada sinal entre os dois modos.
--------
FEATURE-018 — Modo compacto do Histórico em paisagem de tela curta
(js/historico.js)

Origem: usuário mandou um print real do celular deitado (pedido
explícito, "não faça nada ainda vou mandar um print") mostrando o
problema de verdade - cabeçalho fixo (título + estatísticas do mês +
"Minimizar Tudo"), a logo do app ("Forex Assist"/subtítulo) e a barra
de navegação inferior (fixa) juntos comiam quase toda a altura de
~430px do celular deitado, sobrando 1-2 linhas de tabela visíveis (o
próprio cabeçalho da tabela já estava sendo empurrado pra fora). Ideia
do usuário: mesmo padrão de um projeto de cardápio dele - quando
expande, mostra só o conteúdo relevante, minimizando o "chrome" ao
redor. Confirmado com o usuário via pergunta objetiva: o cabeçalho de
totais E a barra de navegação inferior somem COMPLETAMENTE (não fica
um resumo colapsável) - com um botão fixo pra voltar, não um toque em
qualquer lugar (toque na linha já é o gesto de expandir o detalhe
RSI/EMA/gráfico - usar o mesmo toque pros dois ia confundir).

Implementação: `aplicarModoCompactoSeNecessario()`, chamada no fim de
`carregarHistorico()`. Gatilho não é "celular vs computador" - é
`window.innerHeight < 500` (limite de altura de tela) combinado com
`modoTabela === true`. É a causa real do problema (a mesma coisa
aconteceria numa janela de desktop redimensionada baixa), e explica
por que o desktop do usuário (bem mais alto) nunca aciona isso mesmo
em modo tabela - ele mesmo confirmou "no computador ficou
maravilhoso, sobrou espaço", então não fazia sentido esconder nada
lá. Quando aciona: esconde `#historicoHeader` (id, específico do
Histórico), `.header` (classe, logo do app inteiro - renderizada por
js/app.js, fora deste arquivo) e `.bottom-nav` (classe, navegação
principal do app) via `style.display = "none"`; cria um botão `✕`
fixo (`position:fixed; top/right`) que restaura os três de uma vez.
Reavaliado a cada `carregarHistorico()` (então girar de volta pro
retrato, ou a barra de navegação nunca ter sido escondida por causa
de retomar em altura normal, já corrige sozinho - sem depender do
usuário lembrar de clicar no ✕).

Validado: `node --check` limpo. Novo `validate-modo-compacto-
historico.js` (14 cenários): aciona só com altura curta E modo
tabela juntos (não aciona em modo card mesmo com tela curta, não
aciona com tela alta mesmo em modo tabela); esconde os 3 elementos
(cabeçalho, logo, navegação) e cria o botão; botão restaura os 3 e se
autorremove; reavaliação automática (sem precisar clicar no ✕)
remove o botão órfão e restaura tudo quando a altura volta ao
normal. Suítes de regressão revalidadas: `validate-comparacao-
sinais.js` (27), `validate-caminho-precos.js` (14), `validate-modo-
tabela-historico.js` (29), `validate-bug022-feedback-checkbox.js`
(offset de linha atualizado de novo - mesma fragilidade de sempre
desse teste específico, não regressão).

Validado visualmente via Chromium/Playwright, com harness incluindo a
logo e a navegação reais do app (não só o Histórico isolado): (1)
celular deitado curto (900x420) já nasce em modo compacto - logo,
cabeçalho de totais e navegação inferior somem, só sobra o
agrupamento por dia + a tabela + o botão ✕; (2) clicar no ✕ restaura
os três; (3) janela alta (1000x700, cenário desktop) NUNCA aciona o
modo compacto, confirmando que o critério de altura (não de
dispositivo) preserva o comportamento que o usuário já aprovou no
computador.
--------
FEATURE-019 — Atualização automática do Histórico, ligada de verdade
(js/historico.js)

Origem: usuário viu, na prática, um sinal AUD/USD já fechado como WIN
havia 23 minutos ainda aparecendo como PENDENTE na tela - não era um
problema de dado (o Firestore já tinha o resultado certo, confirmado
nos logs reais do result-checker.yml), era a tela nunca se atualizar
sozinha. O código de auto-atualização existia no arquivo, mas estava
inteiro comentado desde sempre (nunca chegou a ser ligado) - `//
setInterval(() => { ... }, 5000);`.

Não liguei com os 5 segundos originais. Antes de ligar, conferimos
juntos o console do Firebase (print real do usuário: 51 mil leituras
do Firestore no dia) - esse número por si só já bate ou passa o teto
gratuito do plano Spark (50 mil leituras/dia), e o projeto já tinha
um precedente documentado EXATAMENTE desse tipo de estouro: o
polling de status do Scanner no dashboard (`js/expert.js`) precisou
subir de 2s pra 15s depois de "confirmado no console do Firebase: 55
mil leituras/dia contra um teto gratuito de 50 mil" (ver entrada mais
antiga deste arquivo). `carregarHistorico()` lê até 300 documentos
por chamada (`.limit(300)`) - bem mais caro que o polling de 1
documento do status do Scanner. Aplicar os mesmos 15s usados lá
custaria 300 leituras a cada 15s = ~72 mil leituras/hora só desta
tela, o que estouraria a cota (já perto do limite) em minutos.

Implementação: `setInterval(..., 90000)` (90s) - mais frequente que o
próprio ciclo do backend (5 min), então ainda pega um fechamento real
bem mais rápido que esperar o usuário lembrar de recarregar a página,
sem multiplicar a leitura que acabou de estourar. Guard idêntico ao
já usado em `js/expert.js`: só atualiza com `!document.hidden` (aba
em primeiro plano) E `app.currentTab === "historico"` (usuário
realmente olhando essa tela) - não gasta cota com o app minimizado ou
noutra aba.

Validado: `node --check` limpo. Novo `validate-auto-atualizacao-
historico.js` (6 cenários): setInterval registrado com 90000ms exatos
(não 5000 nem 15000); chama carregarHistorico() só com aba visível E
na tela Histórico; NÃO chama com aba em segundo plano; NÃO chama
estando noutra aba do app; volta a chamar quando as duas condições
voltam a ser verdadeiras. Suítes de regressão revalidadas
(comparação, modo tabela, modo compacto, caminho do preço, BUG-022) -
os 3 mocks de sandbox (vm.runInContext, já que historico.js não é
módulo Node) precisaram ganhar um `setInterval: () => {}` no-op, já
que esse ambiente isolado não tem o `setInterval` global do
navegador/Node por padrão - sem isso o carregamento do arquivo
inteiro quebrava com "setInterval is not defined" (só nos testes;
não afeta o app real, que sempre roda num browser de verdade).
--------
FEATURE-020 — Favor/Contra em pips na tabela principal do Histórico
(js/historico.js)

Origem: usuário fechou o dia com 8x2, revisando os resultados e
pedindo dois esclarecimentos/ajustes de manhã. (1) Pergunta: o que
são "Máx"/"Mín" na tela de comparação (FEATURE-015)? Resposta: são o
preço mais alto e mais baixo que o par tocou desde a entrada,
independente de direção - "Favor"/"Contra" é esse mesmo dado já
convertido pra pips considerando a direção do sinal (confirmado com o
próprio print do usuário: AUD/USD VENDA, entrada 0.71621, Mín 0.71507
= 11.4 pips a favor, Máx 0.71756 = 13.5 pips contra, que bateu o SL e
virou LOSS mesmo tendo chegado a estar no lucro). (2) Pedido: mesma
lógica de Favor/Contra que já existia só na comparação de sinais,
agora também na tabela principal do Histórico (modo tabela,
FEATURE-017) - motivo dado pelo usuário: "olhando num geral dá pra
ver os pares que quase bateram [o TP]", sem precisar abrir cada
sinal ou montar uma comparação manual pra isso.

Implementação: `construirLinhaTabela()` ganhou duas colunas novas,
"Favor" e "Contra", lendo os mesmos campos `sinal.maxPipsFavor`/
`maxPipsContra` que `js/checker.js` já grava a cada ciclo (nenhuma
captura nova de dado) - posicionadas entre "Resultado" e "Resultado
Financeiro", mesma ordem lógica da tabela de comparação. `colspan` da
linha de detalhe expandido subiu de 8 pra 10 (2 colunas a mais).
`min-width` da tabela ajustado de 600px pra 720px pra acomodar sem
apertar demais.

Validado: `node --check` limpo. `validate-modo-tabela-historico.js`
ampliado (novas asserções: colunas Favor/Contra presentes com os
valores certos, colspan=10) - suíte completa segue em 31 cenários,
todos passando. Regressão revalidada (comparação de sinais, modo
compacto, caminho do preço, BUG-022 com offset de linha atualizado
mais uma vez - mesma fragilidade de sempre desse teste específico).
Visual real via Chromium/Playwright: colunas aparecem coloridas
(Favor verde, Contra vermelho) com os valores corretos pros sinais
que têm o campo, e "--" sem quebrar nada pros sinais antigos que não
têm (schema anterior).
--------
FEATURE-021 — Ajustes de manhã (12/09/2026): Máx/Mín saem da
comparação, régua do gráfico vira HTML (bug real de corte no
celular) - js/historico.js

Origem: usuário fechou o dia anterior 8x2, satisfeito, e trouxe dois
ajustes antes de seguir pro planejamento do dia (Blaze/operação 24h,
ver ESTADO_ATUAL.md). Também mandou um print real confirmando um bug
que eu tinha certeza que uma versão anterior (FEATURE-018, régua com
`<text>` dentro do SVG) resolvia - não resolvia completamente.

1. **Comparação de sinais**: colunas Máx/Mín removidas (ficam
   Horário/Direção/Status/Entrada/Atual/Favor/Contra/USD).
   Confirmado antes com o usuário (conversa da noite anterior): Favor/
   Contra já É o Máx/Mín convertido pra pips relativo à Entrada -
   remover o preço bruto não perde informação de "até onde foi",
   só simplifica a leitura (pips são comparáveis de cabeça, preço
   bruto depende da escala de cada par). `min-width` do wrapper
   ajustado de 640px pra 520px (2 colunas a menos).

2. **Régua do gráfico (bug real, achado pelo usuário num print do
   celular de verdade)**: a "régua" de Máx/Mín implementada na
   FEATURE-018 usava `<text>` DENTRO do `<svg>` - funcionava bem no
   teste feito na sessão anterior (viewport de desktop, ~380-900px),
   mas o SVG usa `preserveAspectRatio="none"` (esticar o gráfico pra
   preencher a largura do card, não importa o tamanho do container) -
   isso estica X muito mais que Y quando o container é MUITO mais
   largo que o viewBox (300 unidades). Em paisagem no celular real
   (~2000px de largura), esse esticão de X chega a ~6-7x, e texto
   SVG sob transformação não-uniforme extrema não escala/posiciona
   de forma confiável entre motores de renderização - os números
   apareciam cortados na borda ("154.5" em vez de "154.560",
   confirmado no print do usuário). `<line>`/`<polyline>` não sofrem
   esse problema (só ficam visualmente mais "esticados", sem cortar
   nada) - por isso só a régua precisou mudar.

   Correção: a régua virou 4 `<div>` HTML (`position:absolute`) por
   cima do SVG, dentro de um container `position:relative` - HTML
   normal, fora do sistema de coordenadas do SVG, imune ao esticão
   do `preserveAspectRatio`. A linha/polyline/linha tracejada de
   entrada continuam exatamente como estavam (pedido explícito do
   usuário: "gráfico fica do jeito que está, só ajuste os números").

Validado: `node --check` limpo. `validate-comparacao-sinais.js`
ganhou 2 asserções novas (Máx/Mín realmente sumiram, checado pelo
texto do cabeçalho da coluna - não pelo valor numérico, que podia
coincidir por acaso com outra coluna do mesmo range de preço).
`validate-caminho-precos.js` ganhou 2 cenários novos (régua não usa
mais `<text>`, vira 4 `<div position:absolute>`, casas decimais
continuam corretas por par - JPY vs não-JPY). Suíte completa
revalidada (comparação, modo tabela, modo compacto, auto-atualização,
BUG-022 com offset de linha atualizado mais uma vez). Visual real via
Chromium/Playwright numa viewport de exatamente 2000x900 (a mesma
largura da tela real do usuário que reproduziu o bug original) - os 4
números da régua aparecem completos, sem corte, confirmando a
correção no cenário exato que falhou.
--------
BUG-026 — Push chegando com atraso de vários minutos
(scripts/pushNotifier.js)

Origem: usuário reportou, com timestamp real ("recebi a mensagem
10:12, muita margem") - sinais salvos às 09:50 (USD/CAD, AUD/USD) e
10:05 (GBP/USD), push só chegou às 10:12. Mais de 20 minutos de
atraso no pior caso.

Achado, conferindo o código: `enviarParaTokens()` nunca marcava
nenhuma urgência na mensagem enviada ao FCM. Como os tokens registrados
(`js/push.js`, via `VAPID_KEY` + `firebase.messaging()` do browser)
são tokens de **web push** (não um app Android nativo), o campo que
controla prioridade de entrega é `webpush.headers.Urgency`, não
`android.priority` (que só vale pra apps nativos). Sem `Urgency`
explícito, o FCM/navegador trata como prioridade normal - em Doze ou
economia de bateria agressiva do Android (comum em MIUI/Xiaomi,
Samsung, etc. - compatível com o aparelho do usuário pelos prints já
vistos nesta sessão), push de prioridade normal pode ser segurado e
entregue só em lote, bem depois do envio real. O service worker
(`firebase-messaging-sw.js`) foi conferido e não introduz atraso
nenhum por conta própria - chama `showNotification()` assim que a
mensagem chega, sem espera artificial.

Correção: `webpush: { headers: { Urgency: "high" } }` adicionado nos
dois envios (`enviarPushAbertura`/`enviarPushEncerramento`). Pede
entrega imediata ao sistema de push.

**Ressalva honesta pro usuário** (não é garantia só de código): mesmo
com `Urgency: high`, o Android ainda pode restringir push de um app/
navegador específico se a otimização de bateria estiver ativa pra
ele - vale conferir nas configurações do aparelho (Bateria > Chorme/
navegador usado > "sem restrições" ou "permitir atividade em segundo
plano") como complemento, não como substituto desta correção.

Validado: `node --check` limpo. `validate-push-envio.js` ampliado (2
asserções novas: os dois tipos de push marcam `webpush.headers.
Urgency === "high"`). Suíte completa de push revalidada
(`validate-push-estimativa-tempo.js`, `validate-push-integracao-
checker.js`, `validate-push-integracao-pairanalyzer.js`) sem
regressão.
--------
FEATURE-022 — Total do MÊS vigente some do cabeçalho do agrupamento
(js/historico.js)

Origem: usuário reportou a tela do Histórico "confusa, muita
informação de totais" - print com seta apontando pro cabeçalho do
agrupamento de Setembro (mês vigente) mostrando o mesmo placar
(✅/❌/🎯) que já aparece no card grande do topo (`#historicoStats`) E
no cabeçalho do dia "HOJE" - a mesma informação repetida 3 vezes na
tela. Pedido exato: "só vamos colocar os totais ali onde marquei com
uma seta, quando o mês vigente for o seguinte, ou seja os resultados
totais grande do mês vigente, e no agrupamento só fica o total geral
quando não for mais o mês vigente, igual está em julho, setembro deve
ficar em branco, quando entrarmos em outubro, aí aparece o total geral
do mês no agrupamento de setembro" - ou seja, o comportamento correto
já existia pra meses PASSADOS (Julho já mostrava seu total no
agrupamento), faltava só suprimir isso enquanto o mês ainda está em
andamento.

Correção: em `carregarHistorico()`, o span de placar do cabeçalho do
MÊS (`✅ ${winsDoMes} ❌ ${lossesDoMes} 🎯 ${taxaDoMes}%`) passou a ser
condicional em `!mesContemHoje` (variável já calculada no mesmo loop) -
fica em branco enquanto `mesContemHoje` é true, e mostra o placar
normalmente assim que o mês deixa de ser o vigente. Nenhuma outra
camada foi tocada: o card grande do topo (`#historicoStats`, que já é
só do mês vigente) continua exatamente como estava, e o placar por DIA
(cabeçalho "HOJE"/datas passadas) também não foi alterado - interpretação
deliberada, já que o exemplo do usuário (Julho/Setembro/Outubro) fala
inteiramente em nível de MÊS. Fica pendente confirmar com o usuário se
o placar por dia também deveria mudar; não alterado nesta rodada por
falta de pedido explícito nesse nível.

Validado: `node --check` limpo. `validate-historico-agrupamento.js`
ganhou 4 asserções novas (span do mês vigente vem vazio; card do topo
não foi afetado; placar por dia continua aparecendo; span do mês
PASSADO - Agosto - continua mostrando o placar, provando que a
condição não quebrou o caso que já funcionava). Esse teste também
precisou de 2 mocks novos (`document.querySelector`, `localStorage`,
`element.remove()`) pra voltar a carregar `carregarHistorico()` até o
fim - fragilidade de mock desatualizado conforme o arquivo cresce
(FEATURE-018/019 passaram a chamar essas APIs), não regressão de
código; mesma classe de manutenção já documentada antes pro offset de
linha do BUG-022. Suíte completa de Histórico revalidada (comparação,
modo tabela, modo compacto, auto-atualização, BUG-022) sem regressão.
--------
FEATURE-023 — Orientação sobre otimização de bateria no Manual
(js/manual.js)

Origem: usuário confirmou ter desativado manualmente a otimização de
bateria do Chrome (print mostrando "Nenhuma restrição" selecionado,
complemento da correção de BUG-026) e pediu pra essa orientação ficar
documentada dentro do próprio app, não só ter sido dita na conversa.

Correção: nova seção "Notificação atrasando?" na tela Manual
(`manualView()`), explicando em linguagem direta por que o push pode
atrasar (Doze/economia de bateria do Android) e o caminho exato nas
configurações do Android (Bateria > Chrome > Sem restrições) - mesmo
texto que já constava como comentário de código em
`scripts/pushNotifier.js` desde o BUG-026, agora também visível pro
usuário dentro do app.

Validado: `node --check` limpo. Sem lógica nova (só HTML estático
dentro da view), não foi criado teste automatizado dedicado - conferido
visualmente que a string renderiza corretamente dentro do template
literal existente.
--------
BUG-027 — EUR/JPY fechando com SL de -$104/-$128 em vez de ~-$5
(scripts/moneyManager.js, scripts/pairAnalyzer.js, js/checker.js)

Origem: usuário reportou, com print real do app, duas operações de
EUR/JPY fechando com resultado financeiro muito maior que o TP/SL
configurado ($5): -$104 (21:46, 13/09) e -$128 (21:11, 13/09).

Achado, confirmado direto no Firestore de produção (chave de acesso
fornecida pelo usuário especificamente pra esta investigação):
`calcularValorPip()` (BUG-024, 10/09) só sabia tratar dois casos -
"USD é a moeda BASE" (USD/JPY, USD/CAD...) e "USD é a moeda de
COTAÇÃO" (EUR/USD, AUD/USD...). Qualquer par onde USD não é NENHUMA
das duas pernas (EUR/JPY, GBP/JPY, EUR/GBP - os 3 "pares cruzados"
monitorados) caía no segundo ramo por eliminação, tratando um pip
nascido em JPY/GBP como se já fosse USD, sem nenhuma conversão. Pra
EUR/JPY isso inflava o valor do pip em ~150x (a própria cotação
USD/JPY). Como `calcularSL()`/`calcularTP()` convertem o TP/SL em
dólar pra pips dividindo pelo valor do pip, um SL de $5 virava um SL
de **0,125 pips** (confirmado nos dois documentos reais: `financeiro.
slPips: 0.125`, contra 10-19 pips nos pares normais) - pequeno o
bastante pra qualquer ruído normal de vela de 5min fechar a operação,
com o resultado em dólar final dependendo só de quanto o preço já
tinha se afastado até o checker (rodando a cada 5min) avaliar aquele
candle - não do SL/TP real de $5 tendo qualquer chance de se
desenvolver.

Levantamento no histórico completo (484 documentos reais no
Firestore): EUR/JPY (75 sinais, 45 fechados, |resultado| médio
$24,02, máximo $382), GBP/JPY (122 sinais, 85 fechados, médio
$10,13) e EUR/GBP (50 sinais, 5 fechados, médio $9,05) - todos bem
acima dos pares normais de referência ($2,63-$4,98 médio,
exatamente o design de $3-5). Ativo desde 02/07/2026 (mais de 2
meses). Como o mecanismo fecha a operação por ruído de ~1 vela em vez
do SL/TP real, WIN e LOSS desses 3 pares nesse período são
igualmente não confiáveis como medida de qualidade do sinal -
contamina `statisticsEngine.js`/PENTE-FINO-004 especificamente pra
esses 3 pares. **Os 247 documentos desses 3 pares foram removidos do
`historico` de produção** (autorizado pelo usuário), sem nenhuma
operação aberta no momento da remoção (conferido antes).

Correção: `calcularValorPip()` ganhou um terceiro caso explícito -
par cruzado (nem base nem cotação é USD) precisa de um parâmetro novo,
`cotacaoCruzada` (a cotação da moeda de cotação contra o dólar,
buscada por quem chama). **Sem esse parâmetro, a função agora lança
erro em vez de silenciar** (mesma filosofia do resto do projeto:
nenhum sinal é melhor que um sinal com número inventado). Novos
helpers em `moneyManager.js`: `parEhCruzado(par)` e
`simboloCotacaoCruzada(par)` (decide qual símbolo buscar - `USD/JPY`
com inversão pra moedas onde USD é base tradicionalmente [JPY, CAD,
CHF], `<moeda>/USD` direto pra moedas cotadas contra USD [EUR, GBP,
AUD, NZD] - regra por moeda, não lista fixa de pares, seguindo o
mesmo padrão já usado em `parElegivelJanelaAsia()`). `analisarFinanceiro()`
(moneyManager.js) e `calcularLucroUSD()` (checker.js) passaram a
aceitar/repassar `cotacaoCruzada`. Dois pontos novos de busca dessa
cotação, cada um reusando a infraestrutura já existente sem custo de
configuração: `pairAnalyzer.js` (abertura do sinal, reusa o
`getCandles` já injetado pelo scanner) e `checker.js` (fechamento,
reusa o `getCandles` já importado de `marketData.js`, buscado uma vez
por sinal pendente antes do loop de velas, não a cada vela). Falha
nessa busca (API fora do ar, símbolo desconhecido) propaga o erro de
`calcularValorPip()` pro try/catch já existente em `analisarPar()`/no
loop do checker - o sinal simplesmente não é gerado/fechado nesse
ciclo, tenta de novo no próximo, nunca salva um número errado.

Validado: `node --check` limpo nos 3 arquivos. `validate-bug024-
valorpip.js` ampliado (cenário de "sem par informado" mudou de
"fallback silencioso" pra "lança erro" - mudança de comportamento
intencional - mais 20+ cenários novos: `parEhCruzado`/
`simboloCotacaoCruzada` pros 3 pares cruzados e pros normais, valor do
pip com/sem `cotacaoCruzada`, `analisarFinanceiro` de ponta a ponta).
Novo arquivo `validate-bugcruzado-eurjpy.js`: reproduz os DOIS sinais
reais do Firestore (mesmo par, mesma entrada, mesmo preço de
fechamento) através do `js/checker.js` REAL (extraído dinamicamente
do arquivo atual, não uma cópia estática) - com a correção, os
mesmos dois casos que fecharam em -$104/-$128 em produção fecham em
**-$0,68 e -$0,83** no teste, batendo com a estimativa manual feita
durante a investigação (~-$0,75/-$0,85). `validate-bug021-
moneymanager.js`/`validate-perfis.js`/`validate-push-integracao-
pairanalyzer.js`/`validate-pentefino001-perfil-salvo.js` precisaram
de ajuste (passar `par: "EUR/USD"` explícito, ou mockar `parEhCruzado`/
`simboloCotacaoCruzada` pra quem intercepta moneyManager.js) - não é
regressão de código, é consequência esperada de deixar de aceitar
chamada sem par informado. Suíte completa revalidada (só a falha
pré-existente e não relacionada de `validate-pentefino-conservador-
quebrado.js` continua de pé, já documentada antes).
--------
BUG-028 — Estimador de orçamento de API desatualizado (3x pessimista)
(js/config.js)

Origem: investigando se dava pra monitorar mais pares (pedido do
usuário, 13-15/09/2026), fui conferir o orçamento real de consultas
à TwelveData e achei `MINUTOS_POR_CICLO_SCANNER = 5` em
`calcularConsumoEstimadoTwelveData()` - mas o cron real do Scanner
(`forex-scanner-real.yml`) roda a cada 15 minutos desde a correção da
cota do Firestore, há tempos. A constante nunca foi atualizada junto
- o próprio comentário no código já avisava "se o intervalo do cron
mudar, esta conta precisa ser atualizada manualmente", e isso não
tinha acontecido.

Efeito prático: a tela de Config mostrava o consumo estimado de API
**3x maior** que o real, e podia estar sinalizando "excede o
orçamento" (⚠️) pra configurações que na verdade cabem tranquilamente
- com os 10 pares padrão e janela 07:30-18:00, por exemplo, o cálculo
antigo dava 2.688 consultas/dia (acima do orçamento de 2.400) quando
o real, com cron de 15min, é 896/dia (bem abaixo, ~1.500 de folga).

Correção: `MINUTOS_POR_CICLO_SCANNER` de `5` para `15`, comentário
atualizado explicando a defasagem encontrada. Nenhuma outra
constante deste arquivo precisou mudar (`CHAMADAS_POR_PAR_POR_CICLO`
e `ORCAMENTO_DIARIO_TWELVEDATA` continuam corretas, são independentes
do cadence do cron). Constante não duplicada em nenhum outro arquivo
- conferido via grep, só existe aqui.

Validado: `node --check` limpo. `validate-orcamento-api.js`
recalculado por completo (todos os cenários dependiam do valor antigo
de ciclos/dia) - inclusive o cenário 1 (10 pares padrão), que antes
esperava "excede o orçamento" e agora corretamente espera "dentro do
orçamento, com folga de 1.504/dia". Suíte completa revalidada, sem
regressão nova.
--------
CORREÇÃO DE DADO — saldoSimulado desatualizado após limpeza do
BUG-027 (configuracoes/geral, produção)

Origem: usuário perguntou por que a Conta Simulada no Dashboard
continuava mostrando -$710,20 mesmo depois da remoção dos 247
documentos contaminados do BUG-027. `saldoSimulado` é um acumulador
persistido em `configuracoes/geral` - `checker.js` soma o resultado
de cada operação nele no momento em que ela fecha, mas nada
recalcula esse total a partir do histórico depois. Remover os
documentos não corrigiu retroativamente o acumulador, que já tinha
absorvido a contaminação antes da remoção.

Achado ao recalcular do zero (soma de `resultadoFinanceiro`/
`lucroAtual` dos 36 sinais `ENCERRADA` restantes no histórico, todos
de pares não afetados pelo BUG-027): o valor real é **-$22,47**, não
-$710,20. Ou seja, **$687,73 (97% do saldo negativo mostrado)** era
resultado direto do bug de conversão de moeda, não desempenho real
de mercado.

Correção: `configuracoes/geral.saldoSimulado` recalculado do zero
(soma real dos sinais restantes) e gravado, autorizado pelo usuário.
Não é uma mudança de código - é uma correção pontual de estado, feita
uma vez, com o valor conferido antes e depois da escrita direto no
Firestore de produção.

Nota pro futuro: `saldoSimulado` continua sendo um acumulador
incremental, não recalculado automaticamente - se aparecer disparidade
de novo (nova remoção de dados contaminados, por exemplo), o mesmo
recálculo manual precisa ser repetido. Não foi criada nenhuma rotina
automática de reconciliação neste momento - fora do escopo do pedido.
--------
FEATURE-024 — Gate de perda diária + disjuntor de losses consecutivos
(scripts/riskManager.js, scripts/scanner.js)

Origem: item nº 1 combinado entre as duas auditorias estratégicas
recebidas (13-15/09/2026) - `PERFIL_FINANCEIRO` (moneyManager.js) já
definia `riscoDiario` (3/5/8% por perfil) e `perdasConsecutivas`
(3/4/5) desde a sprint original, mas nenhum gate os lia. Busca em
todo o repositório confirmou: campos mortos, só existiam na
definição. Não existia nada que impedisse o sistema de continuar
abrindo operações depois de uma sequência de losses, nem depois que
a perda acumulada do dia já tivesse passado do teto do perfil.

Correção: `limiteDiarioAtingido(db, perfil, banca)`, nova função em
`scripts/riskManager.js` (mesmo módulo de `existeCooldown`, já
Firestore-aware - `pairAnalyzer.js` deliberadamente não acessa
Firestore direto pra estatísticas). Duas checagens:

1. **Perda líquida do dia** (fuso de Brasília, ganhos abatem perdas -
   é "o saldo do dia caiu X%", não "perdeu X vezes") comparada contra
   `riscoDiario`% da banca atual.
2. **Losses consecutivos**, entre TODOS os pares (é um limite de
   conta inteira, não por par) - as últimas N operações fechadas, N =
   `perdasConsecutivas` do perfil, todas LOSS em sequência.

Checado UMA vez por ciclo do Scanner, dentro de `validarExecucao()`
(mesma função que já teria os gates de "scanner desativado"/"mercado
fechado"/"nenhum par configurado") - se bloqueado, a execução inteira
para ali, antes de gastar qualquer chamada de API analisando pares.

**Bug real pego só ao testar contra produção, não no teste isolado**
(exatamente o alerta que veio junto com o pedido): a consulta original
(`where(status==ENCERRADA).where(fimOperacao>=desde).orderBy(fimOperacao,desc)`)
passou limpo no teste com banco falso, mas falhou em produção com
`FAILED_PRECONDITION: The query requires an index` - Firestore exige
índice composto manual pra igualdade + range + orderBy assim, e este
projeto não gerencia índices como código. Corrigido trocando o filtro
por range por um único `orderBy(fimOperacao,desc).limit(200)` (mesmo
formato de "1 igualdade + 1 orderBy" de `existeCooldown()`, que já
tinha índice composto pronto de antes) - o corte por dia continua
feito em JS, comparando string de data formatada, nunca aritmética de
epoch entre fusos. Mesmo assim esse formato AINDA exigiu um índice
composto próprio (`status` + `fimOperacao`), que não existia -
criado programaticamente via `FirestoreAdminClient` (mesma
credencial de produção desta investigação), confirmado `READY` antes
de revalidar.

Validado: `node --check` limpo nos 2 arquivos. `validate-
limitediario-riskmanager.js` (11 cenários): perda líquida abaixo/
acima do limite, WIN abatendo LOSS no mesmo dia, streak completo/
quebrado/incompleto, perfis diferentes (mesma perda bloqueia
CONSERVADOR mas não AGRESSIVO), operação de ontem não contando pro
limite de hoje, `diaBrasiliaDe()` determinístico. **Revalidado contra
o Firestore de produção real** (não só o teste isolado) com o
perfil/banca reais (AGRESSIVO, banca atual -$22,47) - resultado
`{bloqueado: false}`, coerente com o estado real (sem streak nem
perda diária relevante agora). Suíte completa revalidada, sem
regressão nova (só a falha pré-existente e não relacionada de
`validate-pentefino-conservador-quebrado.js` continua de pé).

Pendente, fora do escopo desta rodada: nenhuma indicação visual no
Dashboard/Histórico de que o gate bloqueou um ciclo - hoje só aparece
no log do GitHub Actions. Considerar expor isso na tela se o gate vier
a disparar de verdade em produção.
--------
CORREÇÃO DO BUG-028 — cadence real do Scanner é 5min, não 15min
(js/config.js)

Origem: usuário reportou um sinal de EUR/JPY às 08:05 de hoje
(15/09/2026) e perguntou como isso era possível com o scanner
"desligado". Investigando o log real do GitHub Actions (não a
suposição), duas coisas ficaram claras:

1. **O scanner não estava desligado** - a execução exata das 08:05
   (11:05 UTC) rodou análise completa de 8 pares em ~31s (não os ~2-3s
   de um ciclo que aborta em "SCANNER DESATIVADO"), aprovou EUR/JPY
   SELL com score 43. Todas as execuções desde 06:00 UTC daquele dia
   mostram o mesmo padrão - scanner ativo o tempo todo, sem lacuna.

2. **BUG-028 (commit anterior, um dia antes) estava errado.** Ele
   mudou `MINUTOS_POR_CICLO_SCANNER` de 5 pra 15 lendo só o
   `cron: '*/15 * * * *'` declarado em `forex-scanner-real.yml`, sem
   checar o histórico real de execuções do Actions. Checando agora:
   **centenas de execuções reais, via `workflow_dispatch` (o pinger
   externo cron-job.org), disparam a cada 5 minutos, de forma contínua
   e sem lacuna** - o `schedule:` nativo do YAML existe mas não é o
   que governa o cadence de produção. BUG-028 corrigiu na direção
   errada: a tela de Config estava SUBESTIMANDO o consumo real (não
   superestimando), fazendo parecer que sobrava ~1.500 consultas/dia
   de folga quando na verdade **os 10 pares padrão já excedem o
   orçamento de 3 chaves em ~288 consultas/dia no cadence real**.

Correção: `MINUTOS_POR_CICLO_SCANNER` revertido pra `5` (valor
original). Comentário do código atualizado documentando as duas
mudanças de direção nesta mesma linha - evidência de que "ler a
configuração declarada" não é o mesmo que "confirmar contra o log de
execução real", a mesma lição já registrada várias vezes neste
projeto, desta vez cometida pelo próprio Code.

Validado: `node --check` limpo. `validate-orcamento-api.js` revertido
pros valores originais (10 pares padrão voltam a EXCEDER o orçamento
de 2.400/dia, margem -288). Suíte completa revalidada, sem regressão
nova.

**Implicação real pra decidir**: com o cadence de 5min confirmado, os
10 pares padrão já consomem mais do que as 3 chaves atuais suportam.
Isso muda a conversa sobre expandir pra mais pares (13-15/09/2026) -
a folga que eu tinha reportado não existe; o caminho mais imediato pra
não estourar cota é reduzir pares, aumentar chaves, ou aceitar operar
perto/acima do limite (com risco de "Quota exceeded" silencioso em
alguns ciclos, já documentado antes em BUG-015).
--------
BUG-029 — ultimos5/ultimos10 embutindo documento bruto: crescimento
recursivo estourava o limite de 1 MiB do Firestore, matando sinais
silenciosamente (scripts/statisticsEngine.js)

Origem: investigando um pedido do Claudinho (varrer logs do Actions
atrás de 429/Quota exceeded/RESOURCE_EXHAUSTED na janela dos 36/37
sinais do dataset de backtest do item 4, checando viés de
disponibilidade), a varredura real não achou nenhum 429/quota - mas
achou outra coisa, num ciclo real de 14/09 às 00:10 UTC:

```
Status............ERRO
Motivo............3 INVALID_ARGUMENT: Document '.../historico/..._USD_JPY'
cannot be written because its size (1,249,115 bytes) exceeds the
maximum allowed size of 1,048,576 bytes.
```

Confirmado em 3 ciclos reais separados (14/09 00:10 UTC, 14/09 00:50
UTC, e AO VIVO em 15/09 11:05 UTC - o mesmo ciclo que gerou o EUR/JPY
das 08:05) - USD/JPY falhava com o mesmo erro em TODO ciclo em que
teria um sinal aprovado pra salvar. AUD/USD confirmado no mesmo estado
em 13-14/09 (não reconfirmado ao vivo em 15/09 porque nesse ciclo
específico ele caiu em REPROVADO antes de tentar salvar).

Causa raiz (confirmada no código, não suposição): `obterEstatisticasPar()`
monta `ultimos5`/`ultimos10` a partir de `ultimasOperacoes.slice(0,5/10)` -
os documentos BRUTOS (`doc.data()` inteiro, com indicadores, financeiro,
risco, avisoRisco, caminhoPrecos e a própria `estatisticas` aninhada de
quando cada um foi salvo). `pairAnalyzer.js` (linha 396) grava esse
objeto `estatisticas` inteiro em toda operação NOVA via
`riskManager.js`'s `salvarOperacao()`. Como cada documento salvo
embutia até 10 documentos anteriores, cada um deles já embutindo até
10 outros (a própria `estatisticas.ultimos10` de quando FOI salvo) -
crescimento recursivo/combinatório, não linear. `historyAnalyzer.js`
(único consumidor real de `ultimos5`/`ultimos10`) só lê
`op.resultado` de cada item - nunca usa o resto do documento.
`marketAnalyzer.js` também referencia `historicoDirecao.ultimos5`
(linha ~769), mas esse caminho é código morto: `historicoDirecao` vem
de `estatisticas.BUY`/`estatisticas.SELL`, que nunca tiveram campo
`ultimos5` - sempre avaliava `[] `, `memoriaOperacional` sempre 0 por
esse caminho. Não mexido agora (fora do escopo deste bug), só
registrado.

Correção: `ultimos5`/`ultimos10` agora guardam só `{ resultado }` de
cada operação, não o documento bruto inteiro - elimina a recursão na
origem, sem mudar nenhum resultado de `historyAnalyzer.js` (único
consumidor real).

Validado:
1. Teste isolado (`validate-statisticsEngine.js`) - suíte completa
   passou, incluindo 2 cenários novos confirmando que `ultimos5[0]`/
   `ultimos10[0]` não carregam mais nenhum campo além de `resultado`.
2. **Validado contra dados reais de produção** (não só teste
   isolado): buscou `obterEstatisticasPar()` real de USD/JPY e
   AUD/USD (os dois pares confirmados travados) e EUR/USD (controle),
   simulou o documento completo que seria gravado (mesma estrutura
   real de campos + a `estatisticas` nova). Resultado: campo
   `estatisticas` isolado caiu de >1.048.576 bytes pra ~740 bytes;
   documento completo simulado ficou em ~4-5 KB pros três pares -
   bem dentro do limite de 1 MiB, com margem de ~250x.

Pendente, fora do escopo desta correção: os documentos JÁ salvos no
`historico` antes desta correção continuam com a `estatisticas`
aninhada antiga (bloat histórico, não afeta gravações novas - só
ocupa espaço/custa mais bytes de leitura nesses docs específicos).
Não limpos agora por não bloquear nada; considerar um script de
limpeza pontual se o custo de leitura desses documentos específicos
vier a importar. Também não mexido: o código morto de
`historicoDirecao.ultimos5` em `marketAnalyzer.js` (registrado acima).
--------
CACHE-002 — cache local do leg de 15min (scripts/pairAnalyzer.js)

Contexto: usuário perguntou se cachear dado localmente ajudaria a
abrir margem pra monitorar mais pares. Conferido: cada par consome 2
chamadas TwelveData/ciclo (`getCandles(par)` em `5min` + `getCandles(par,
"15min")`). O leg de `5min` precisa ser fresco todo ciclo (o Scanner
roda a cada 5min, sempre há candle novo). O leg de `15min` NÃO - como
um candle de 15min só fecha a cada 3 ciclos do Scanner, 2 de cada 3
chamadas traziam exatamente o mesmo dado da anterior.

Implementado: `obterCandles15ComCache(db, par, getCandles)` em
`pairAnalyzer.js` - cache em `cacheCandles15min/{par}` no Firestore,
invalidado por JANELA DE TEMPO (bucket de 15min via
`Math.floor(Date.now()/(15*60*1000))`), não por evento (diferente do
CACHE-001, que invalida quando fecha uma operação nova - aqui não
existe evento equivalente, só a passagem do tempo). Fail-soft no
mesmo padrão do CACHE-001: falha de leitura ou escrita do cache nunca
bloqueia a análise, só degrada pra "sem cache" naquele par/ciclo -
inclusive quando `db` não suporta `.collection()` (mocks antigos tipo
`db: {}` usados em vários testes existentes).

Efeito esperado: ~2 chamadas/par/ciclo caem pra ~1,33 em média. Com
os 10 pares padrão, isso tira a demanda diária de 2.688 (acima do
orçamento de 2.400/3 chaves) pra ~1.792/dia - margem real de +608/dia,
maior que a de simplesmente somar uma 4ª chave (+512/dia). Abre espaço
pra ~13-14 pares dentro do orçamento atual (3 chaves) sem estourar
cota - usuário confirmou que esse é um alvo bom pra esta fase (não os
28 pares do plano original, que exigiriam algo estrutural a mais,
ainda não investigado).

Validado:
1. Teste isolado (`validate-cache002-candles15.js`): duas análises no
   mesmo bucket de 15min chamam `getCandles("15min")` só 1 vez; ao
   simular a virada de bucket, busca de novo; `db` sem `.collection()`
   não quebra a análise (degrada pra sem cache, sinal continua sendo
   aprovado normalmente).
2. Suíte completa revalidada - sem regressão nova em nenhum teste que
   já passava antes desta mudança.
3. **Validado contra Firestore real de produção** (não só mock): doc
   de teste em `cacheCandles15min` criado com os campos esperados
   (`candles`/`bucket`/`atualizadoEm`); segunda chamada no mesmo
   bucket confirmadamente NÃO re-chamou `getCandles`; doc de teste
   removido ao final, sem deixar lixo em produção.
--------
AJUSTE-001 — gate de risco diário só ativo em conta REAL + base do %
corrigida pra saldoInicial (scripts/scanner.js)

Origem: usuário relatou "hoje gerou apenas 1 sinal em modo agressivo,
acho que tem algo errado". Investigado contra logs reais do GitHub
Actions (6 ciclos amostrados ao longo do dia 15/09): confirmado que,
após o único sinal do dia (EUR/JPY LOSS, 08:05 Brasília), TODO ciclo
seguinte por mais de 9 horas caiu em ~5s de execução (contra os ~30s
normais de uma análise completa) com:

```
LIMITE DE RISCO DIÁRIO ATINGIDO (RISCO_DIARIO_ATINGIDO)
Perda líquida do dia (US$ -2.87) atingiu o limite de 8% da banca (US$ -2.03) do perfil AGRESSIVO.
```

Causa: o gate (FEATURE-024, implementado um dia antes) calculava o
teto como `8% × banca`, onde `banca` em modo SIMULADA é o
`saldoSimulado` CORRENTE - que está negativo (-$22,47 e piorando). 8%
de um saldo negativo dá um teto minúsculo (~-$1,80) que qualquer
perda única de um dia já estoura, travando o resto do dia inteiro.
Pior: quanto mais a conta perde, MENOR fica o teto - um efeito
autodestrutivo, o oposto de um disjuntor de proteção de capital.

Decisão do usuário (16/09/2026): nesta fase de teste (SIMULADA, sem
capital real em jogo), o objetivo é gerar volume de sinais suficiente
pra validar se o modo Agressivo funciona antes de avançar pro
Conservador - o disjuntor de perda diária não deveria travar isso.
Confirmado também o critério correto pro % de risco: capital de
REFERÊNCIA fixo (saldoInicial), não o saldo corrente flutuante.

Correção em `validarExecucao()`:
1. O gate (`limiteDiarioAtingido` + disjuntor de losses consecutivos)
   só roda quando `tipoConta === "REAL"`. Em SIMULADA, pulado
   inteiramente - a RMI gera sinal em todo ciclo elegível, sem limite
   de perda diária ou de losses consecutivos.
2. Quando roda (REAL), a base do % passa a ser `saldoInicial`, não
   `saldoReal`/`saldoSimulado` corrente - o teto fica fixo em dólares
   (ex.: 8% de $1.000 = $80/dia), não encolhe conforme a conta perde.

Validado: teste isolado novo (`validate-ajuste001-gate-scanner.js`,
mock de `scripts/firebase.js` via `require.cache` - evita precisar de
credencial real só pra testar esta lógica de roteamento) - 3
cenários: SIMULADA não bloqueia mesmo com perda de $500 "hoje" no
histórico; REAL bloqueia com a mesma perda; REAL com saldo corrente
já negativo NÃO bloqueia uma perda pequena (prova que a base do %
voltou a ser saldoInicial, não o saldo corrente). Suíte de testes
relacionados a `scripts/scanner.js` (`validate-janela-asia.js`,
`validate-janela-meia-noite.js`, `validate-schedule.js`,
`validate-pentefino003-cooldown-em-andamento.js`) revalidada
individualmente, sem regressão.

Pendente: quando a conta migrar de SIMULADA pra REAL, o disjuntor
volta a valer automaticamente (sem precisar de outro deploy) - vale
uma checagem manual dos primeiros ciclos nesse momento, seguindo a
mesma disciplina já registrada neste documento pra qualquer reativação
de gate depois de correção.
--------
MARCO ZERO — execução da ESPEC-EXECUCAO-RMI-MARCO-ZERO.md (17/09/2026)

Origem: usuário trouxe uma especificação completa produzida pelo
Claude "Claudinho" (auditoria/arquitetura), com diagnóstico,
evidência real de produção, mudança exata e critério de aceitação
pra 5 itens (MUD-01 a MUD-05), pedindo execução. Cada mudança abaixo
foi implementada, testada isoladamente e revalidada contra a suíte
completa (sem regressão nova além das 5 falhas pré-existentes já
documentadas: bug020, definir-saldo-inicial, definir-saldo-simulada,
limitediario-riskmanager [flakiness de horário perto da meia-noite,
já registrada], pentefino-conservador-quebrado [rastreador de achado
conhecido, intencional]) antes de passar pra próxima.

--------
MUD-01 — Persistir `multi` no documento do sinal (scripts/pairAnalyzer.js)

`qualidade.multi` já era usado por `avaliarOperacao()` pra aprovar/
reprovar (exigência de multi-timeframe por perfil) e aparecia no log
("Multi TF..."), mas nunca era gravado no documento salvo - sem esse
dado, nenhuma reavaliação retroativa desse critério era possível.
Campo aditivo: `multi: qualidade.multi,` junto dos outros campos de
`qualidade` no objeto `analise`.

Validado: teste isolado (`validate-mud01-mud04.js`) confirmando que o
valor persistido reflete exatamente o que `calcularQualidade()`
devolveu (2 cenários, valores diferentes - não é fixo). Suíte
completa sem regressão.
--------
MUD-02 — Destrava o CONSERVADOR: elegibilidade de histórico por
score, não por rótulo (scripts/statisticsEngine.js, scripts/pairAnalyzer.js)

Achado da espec, confirmado: `historico` com `perfil == "CONSERVADOR"`
retornava 0 documentos - nunca houve UMA operação sob esse perfil em
toda a história do app. Causa: trava circular entre dois mecanismos
que se somam - `operacoesMinimas: 30` (decisionEngine.js) exige 30
operações "elegíveis"; `operacaoAtendeRigorDoPerfil()`
(statisticsEngine.js) só conta como elegível pro CONSERVADOR uma
operação rotulada CONSERVADOR; pra existir uma operação CONSERVADOR
ela precisa primeiro ser aprovada. Impossível por construção.

Decisão de produto (da espec, não reaberta): histórico antigo conta
pelo SCORE (`score >= scoreMinimo` do perfil atual), mesmo sem saber
se teria multi-timeframe confirmado - esse dado nunca existiu antes
do MUD-01. A exigência de multi continua valendo pro sinal NOVO.

Decisão de arquitetura (da espec, não reaberta): calculado À PARTE do
filtro estatístico global (`operacaoAtendeRigorDoPerfil`, que
continua intacto, alimentando wins/loss/streaks/taxaAcerto de todos
os perfis) - trocar aquele filtro globalmente mudaria a base
estatística de todos os perfis de uma vez, sem conseguir medir o
efeito isolado. `operacoesElegiveis` serve EXCLUSIVAMENTE o gate
`operacoesMinimas`.

Implementação: `statisticsEngine.js` importa `obterPerfilAnalise` de
`decisionEngine.js` (sem duplicar os números 35/45/55; confirmado sem
risco de import circular antes de implementar - `decisionEngine.js`
só importa `moneyManager.js`). Dentro de `obterEstatisticasPar()`,
sobre o MESMO `operacoesRaw` já carregado (zero consulta nova ao
Firestore - restrição real de orçamento, ver abaixo), calcula
`operacoesElegiveis = operacoesRaw.filter(WIN/LOSS com score >=
scoreMinimoPerfil).length`, devolvido junto do resto. `pairAnalyzer.js`
passa `operacoesHistoricas: estatisticas.operacoesElegiveis ??
estatisticas.operacoes` (fallback preserva o comportamento antigo se
o campo faltar).

Validado: teste isolado novo (`validate-mud02-conservador.js`, 10
cenários) - conta corretamente por score independente do rótulo;
zero quando o score não bate; relativo ao perfil atual (mesmo score
conta pro BALANCEADO mas não pro CONSERVADOR); documentos sem `score`
gravado não contam (não quebra); ponta-a-ponta via `analisarPar()`
confirmando que `operacoesElegiveis=35` destrava o CONSERVADOR e
`operacoesElegiveis=10` continua bloqueando. Suíte completa sem
regressão.

**Checkpoint obrigatório da espec, RESOLVIDO (17/09/2026)**: "antes de
dar a MUD-02 por concluída, medir quantas das últimas 50 operações por
par têm score >= 55 (real) e reportar os números - se a maioria ficar
abaixo de 30, a correção é necessária mas não suficiente, decisão
seguinte é do usuário". Cota do Firestore resetou (confirmado por
leitura mínima bem-sucedida) e a medição real rodou
(`medir-mud02-viabilidade.js`) contra os 8 pares monitorados:

```
Pares configurados: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD, EUR/JPY
Amostra maxima por par: 50 | scoreMinimo CONSERVADOR: 55 | operacoesMinimas exigido: 30

EUR/USD  | amostra=42 | score>=55=38 | DESTRAVADO (>=30)
GBP/USD  | amostra=46 | score>=55=33 | DESTRAVADO (>=30)
USD/JPY  | amostra=43 | score>=55=35 | DESTRAVADO (>=30)
AUD/USD  | amostra=43 | score>=55=34 | DESTRAVADO (>=30)
USD/CAD  | amostra=44 | score>=55=37 | DESTRAVADO (>=30)
USD/CHF  | amostra=40 | score>=55=31 | DESTRAVADO (>=30)
NZD/USD  | amostra=31 | score>=55=21 | AINDA TRAVADO (<30)
EUR/JPY  | amostra=10 | score>=55= 0 | AINDA TRAVADO (<30)

Resumo: 6/8 pares destravados pro CONSERVADOR com a MUD-02.
```

Decisão (regra da própria espec: maioria destravada -> correção
necessária E suficiente, sem mudança adicional): **`operacoesMinimas`
não é alterado**. NZD/USD e EUR/JPY continuam travados por terem
histórico genuinamente pequeno (EUR/JPY foi zerado pela limpeza do
BUG-027 e está reconstruindo do zero) - não é falha da correção, é
amostra insuficiente ainda, que se resolve sozinha com o tempo/mais
sinais.
--------
MUD-03 — SL e TP financeiros pelo extremo intrabar, não pelo close da
vela (js/checker.js)

Achado da espec, com dado real: operações fechadas por
`SL_FINANCEIRO` registravam prejuízo 81%-235% acima do `slUSD`
combinado no sinal (AUD/USD: SL $3 / real $6,88; USD/JPY: SL $5 /
real $9,06; USD/CHF: SL $3 / real $10,04). Causa: o critério de pips
já usava os extremos intrabar corretos (`precoMaximo`/`precoMinimo`,
acumulados a cada candle), mas o critério FINANCEIRO - o que fecha a
maioria das operações reais - media o lucro só no `close` da vela de
5min. O preço atravessava o SL no meio da vela, voltava um pouco, e a
operação só fechava quando o CLOSE já tinha passado muito do limite.

Correção: dentro do laço de candles, calcula `precoFavoravel`/
`precoAdverso` conforme a direção (BUY: favorável=máximo corrente,
adverso=mínimo corrente; SELL: espelho) - reaproveitando os mesmos
`precoMaximo`/`precoMinimo` que os pips já usam. TP é comparado contra
o lucro no extremo FAVORÁVEL; SL contra o lucro no extremo ADVERSO -
não mais os dois contra o mesmo `close`. Regra de desempate (decisão
de engenharia da espec, documentada no código): se a MESMA vela
satisfaz TP e SL ao mesmo tempo (candle muito volátil - com OHLC não
dá pra saber qual foi tocado primeiro), assume-se SL primeiro
(hipótese pessimista, convenção padrão de backtest). Ao encerrar por
critério financeiro, grava o extremo que efetivamente disparou o
encerramento como `precoAtual` (não mais `candleFinal.close`) - sem
isso o `resultadoFinanceiro` continuaria refletindo o fechamento da
vela mesmo com a detecção corrigida. TP_PIPS/SL_PIPS continuam
gravando `candle.close`, como antes - fora do escopo desta correção
(só o critério financeiro estava errado).

Validado: teste isolado novo (`validate-mud03-extremo-intrabar.js`, 11
cenários, extrai `calcularResultadoOperacao()` do arquivo REAL via
regex+requre, não uma cópia hardcoded) - reproduz o padrão exato do
incidente real de AUD/USD com uma sequência de 3 velas (a função para
JÁ na 1ª vela, que toca o SL no low mas fecha recuperada - antes
disto ela teria continuado até a 3ª vela, terminando 2-3x pior);
confirma o mesmo pro lado TP; confirma a regra de desempate SL-primeiro
quando uma vela toca os dois; confirma que TP_PIPS/SL_PIPS não foram
tocados. Suíte completa de testes relacionados a `checker.js`
revalidada - 1 teste pré-existente (`validate-push-integracao-checker.js`)
tinha uma vela cujo low e high batiam TP e SL ao mesmo tempo (ambiguidade
que a lógica antiga não enxergava, por só olhar o close) - corrigido o
fixture do teste (não o código), documentando por quê, já que o teste
queria validar integração de push, não a regra de desempate.
--------
MUD-04 — `horario` gravado em fuso de Brasília, não UTC do runtime
(scripts/riskManager.js)

Achado da espec: `new Date().toLocaleString("pt-BR")` formata no
padrão brasileiro mas usa o fuso do RUNTIME (GitHub Actions = UTC) -
o campo parecia horário de Brasília mas ficava consistentemente 3h
adiantado (confirmado comparando com o `timestamp` epoch, sempre
correto, do mesmo documento). Corrigido:
`toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })`.

Validado: teste isolado (`validate-mud01-mud04.js`, forçando
`TZ=UTC` no processo de teste pra reproduzir o ambiente real do
GitHub Actions) - `horario` bate com o formato calculado
explicitamente pra America/Sao_Paulo e NÃO bate mais com o formato
UTC. Não altera documentos antigos (fora do escopo, como definido na
espec).
--------
MUD-05 — Order blocks SMC como bônus/penalidade de score, com
interruptor (scripts/pairAnalyzer.js, scripts/scoreEngine.js,
scripts/marketAnalyzer.js)

Escopo (da espec, não reaberto): só order blocks nesta primeira
implementação (liquidity sweeps e fair value gaps ficam de fora).
Camada secundária de confirmação, DELIBERADAMENTE conservadora - a
revisão de literatura da espec não encontrou evidência revisada por
pares de vantagem estatística própria de SMC/ICT testado
isoladamente. Um order block nunca aprova nem reprova sozinho.

Detecção (`detectarOrderBlock`, pairAnalyzer.js - é quem tem os
candles, calcula sem interpretar): varre as últimas 50 velas de 5min,
do mais recente pro mais antigo. Order block de ALTA = último candle
de baixa (close<open) imediatamente antes de um movimento impulsivo
de alta (deslocamento >= 1,5×ATR dentro de 3 velas seguintes,
medido close-a-close); order block de BAIXA = espelho. Zona = [low,
high] do próprio candle, com margem de 20% do tamanho da zona pra
"perto" contar. Retorna o PRIMEIRO (mais recente) OB relevante
encontrado, ou `null`.

Peso (`aplicarBonusSMC`, scoreEngine.js - nova constante
`SMC_ORDER_BLOCK: 3` em `ENGINE_WEIGHTS`, mesma ordem do
`BONUS_BOA`): OB na MESMA direção do sinal + preço na zona -> +3; OB
CONTRÁRIO + preço na zona -> -3; sem OB, ou fora da zona -> 0 (nunca
penaliza AUSÊNCIA de order block).

Aplicação (marketAnalyzer.js): `calcularQualidade()` ganha um 13º
parâmetro OPCIONAL (`smc = null`) no FIM da lista - as 12 chamadas
posicionais existentes continuam funcionando sem alteração nenhuma.
Bônus somado ANTES da normalização (`calcularScoreBase`), junto do
resto do score técnico.

Interruptor: `configuracao.smcAtivo === true` (padrão: qualquer outro
valor, incluindo ausente, é DESLIGADO). Com a flag desligada, a
detecção NUNCA roda (nem o log "SMC.............." aparece) - zero
chance de qualquer efeito colateral. Log claro quando ativo: mostra o
OB detectado (direção, se o preço está na zona) ou "nenhum OB
relevante".

Validado: teste isolado novo (`validate-mud05-smc-orderblock.js`, 21
cenários) - detecção pura (OB de alta e de baixa, sem deslocamento
suficiente não detecta nada, preço fora da zona reportado
corretamente, entradas inválidas não quebram); `aplicarBonusSMC`
isolado (todos os casos de neutro/bônus/penalidade); `calcularQualidade()`
REAL (não mock) confirmando REGRESSÃO ZERO byte-a-byte entre chamar
sem o 13º parâmetro e chamar com `smc=null` explícito, e impacto de
exatamente ±3 no score pré-normalização (documentado que um dos lados
pode bater no teto/piso 0-100 depois da normalização, sem invalidar o
delta pré-normalização que é o que a espec pede); ponta-a-ponta via
`analisarPar()` confirmando que com a flag ausente/desligada nenhuma
linha de log de SMC aparece - a detecção literalmente nunca executa.
Suíte completa sem regressão.
--------
AJUSTE-002 — cor do valor em USD segue o resultado WIN/LOSS, não o
sinal bruto do número (js/historico.js)

Origem: usuário revisando a tabela de comparação de sinais reportou
ver "+$0,74" em VERDE do lado de um "❌ LOSS" (NZD/USD, 16/09/2026
15:11) - com razão pra estranhar, já que intuitivamente verde deveria
significar WIN.

Causa: a cor (`usdCor`) era decidida só pelo SINAL matemático do
`resultadoFinanceiro` (`usd >= 0 ? verde : vermelho`), numa lógica
completamente desconectada do campo `resultado` (WIN/LOSS - a fonte
real da verdade). As duas normalmente concordam, mas podem discordar
- e discordaram aqui: o sinal fechou por SL_PIPS (critério de pips já
usa o extremo intrabar correto pra decidir WIN/LOSS - ver MUD-03),
mas o valor em dólar gravado (`resultadoFinanceiro`) ainda vem de
`candleFinal.close`, que pode terminar do lado positivo por
coincidência de onde a vela fechou, mesmo a operação sendo LOSS de
verdade. TP_PIPS/SL_PIPS ficaram deliberadamente fora do escopo do
MUD-03 (só o critério FINANCEIRO foi corrigido lá) - efeito colateral
visível: o número e o rótulo podem contar histórias diferentes.

Correção (2 ocorrências no arquivo - tabela de comparação e tabela
principal do Histórico): pra sinal já `ENCERRADA`, a cor agora segue
`sinal.resultado` (WIN=verde, LOSS=vermelho), nunca o sinal bruto do
número. Só usa o sinal do número pra sinal ainda `PENDENTE` (P&L
flutuante em tempo real, sem resultado definido ainda - ali o sinal
bruto É a informação certa).

Validado: teste isolado novo (`validate-ajuste002-cor-usd.js`, 6
cenários, mesmo padrão `vm.runInContext` contra o arquivo real usado
em `validate-comparacao-sinais.js`) - reproduz o caso real exato
(LOSS com resultadoFinanceiro +$0,74, cor agora vermelha);
contraprova (WIN com número negativo continua verde); PENDENTE
continua colorindo pelo sinal bruto (sem regressão). Suíte completa
de testes de `historico.js` revalidada sem regressão.

Causa raiz confirmada e corrigida (17/09/2026, js/checker.js): com a
cota do Firestore liberada, o documento real de origem (NZD/USD,
16/09/2026 15:11, id `1789582295793_NZD_USD`) foi consultado direto -
confirma a hipótese ponto a ponto: `motivoEncerramento: "SL_PIPS"`,
`maxPipsContra: -13` (rompeu o limite de 12,5 pips no extremo
`precoMaximo: 0.57657` intrabar), mas `resultadoFinanceiro: +0.74`
gravado veio de `precoAtual/precoFechamento: 0.5749` - o `close` da
vela final, que tinha recuado de volta pra perto da entrada, não o
extremo que efetivamente disparou o SL. Mesmo padrão de bug que o
MUD-03 já tinha corrigido pro caminho financeiro (SL_FINANCEIRO/
TP_FINANCEIRO), só que ali TP_PIPS/SL_PIPS foram deixados de fora por
decisão de escopo.

Correção: dentro do mesmo laço de candles de `calcularResultadoOperacao()`,
os branches `TP_PIPS`/`SL_PIPS` agora também gravam
`precoExtremoEncerramento` (`precoFavoravel`/`precoAdverso`,
respectivamente) - reaproveitando as mesmas variáveis que o critério
financeiro (MUD-03) já usa. `precoAtual` deixa de cair no fallback
`candleFinal.close` pra esses dois motivos de encerramento, igual já
acontecia pros financeiros.

Validado: teste isolado novo (`validate-ajuste002-precoAtual-pips.js`,
10 cenários, mesmo padrão de extração dinâmica de
`validate-mud03-extremo-intrabar.js`) - reproduz o caso real exato do
NZD/USD com uma vela sintética que toca 0.57657 no high (extremo
adverso, dispara SL_PIPS) e fecha em 0.5749 (close, que dava o +$0,74
errado): confirma `precoAtual` agora grava 0.57657 (o extremo) e
`resultadoFinanceiro` sai negativo, consistente com o LOSS; mesma
prova pro lado TP_PIPS (extremo favorável, não o close); contraprova
de não regressão pro critério financeiro (MUD-03, continua gravando o
extremo certo) e pra operação que nunca toca TP/SL (continua sem
fechar). Suíte completa de testes de `checker.js` revalidada sem
regressão - único teste que precisou de ajuste foi o cenário 5 de
`validate-mud03-extremo-intrabar.js`, cuja asserção original
("TP_PIPS continua gravando close") descrevia o comportamento ANTES
desta correção, por desenho; atualizado pra não afirmar mais isso,
com nota explicando a superseded por esta mudança.

Com isso, o valor em dólar gravado (não só a cor exibida) passa a ser
consistente com o rótulo WIN/LOSS pra QUALQUER motivo de encerramento
(financeiro ou pips) - o gap de escopo aberto pelo MUD-03 está
fechado.
--------
AJUSTE-003 — TwelveData responde com "&timezone=UTC" explícito
(scripts/marketData.js, js/checker.js)

Origem: pedido do usuário (16/09/2026) pra medir o atraso real da
TwelveData, comparando o `datetime` do último candle contra o horário da
requisição (log `[DIAG-ATRASO]` em `pairAnalyzer.js`, adicionado no
commit `74ee02e`). Retomado por trigger agendado no dia seguinte
(17/09/2026), primeiro ciclo real dentro da janela operacional.

Achado, com dado real (6 medições em 25min de janela real, GitHub
Actions runs 4442-4447): o `datetime` retornado pela TwelveData e o
horário real da requisição (UTC) diferem consistentemente em
~9h54min-55min (variação de só 13s entre medições) - a assinatura de um
offset de fuso horário fixo, não de atraso de mercado variável. Causa:
a chamada em `scripts/marketData.js` não passava o parâmetro
`&timezone`, e a TwelveData usa "Exchange" como padrão nesse caso -
NÃO UTC, como `js/checker.js` sempre assumiu (comentário de
`buscarCandlesDesde()`, nunca confirmado contra dado real até agora).

Efeito colateral sério, achado ao investigar - não só cosmético no log
de diagnóstico: `buscarCandlesDesde()` busca os `outputsize =
minutosDecorridos + 10` candles mais recentes (buffer de 10 candles
extras de segurança) e filtra `timestamp >= desde` (`desde` =
`sinal.inicioOperacao`, epoch real) pra cortar esse buffer. Com o
`timestamp` calculado a partir de um `datetime` falsamente ~10h "no
futuro", o filtro nunca cortava nada (qualquer candle recente já
satisfazia a comparação trivialmente) - até 50min de candles de ANTES
da abertura da operação entravam na reconstrução do caminho de preço
usado por `calcularResultadoOperacao()` pra decidir TP/SL. Ou seja: o
fechamento de operações podia (não necessariamente sempre, depende de
quão cedo a operação fechava) considerar movimento de preço anterior à
entrada como se fosse posterior a ela.

Correção: `&timezone=UTC` adicionado à URL da TwelveData em
`getCandles()` (`scripts/marketData.js`) - corrige a origem pros dois
efeitos de uma vez, já que tanto o log de diagnóstico quanto
`buscarCandlesDesde()` (via `js/checker.js`) consomem a mesma função.
Comentário desatualizado em `buscarCandlesDesde()` corrigido pra
registrar o achado real, não mais a suposição não verificada.

Validado: teste isolado novo (`validate-ajuste003-timezone-utc.js`, 4
cenários, axios mockado via injeção em `require.cache` + extração
dinâmica de `checker.js`) - confirma que a URL construída por
`getCandles()` inclui `&timezone=UTC`; reproduz o cenário exato do bug
(10 candles sintéticos ANTES de `desde` + 4 candles DEPOIS, simulando
datetime já em UTC de verdade) e confirma que `buscarCandlesDesde()`
agora corta corretamente o buffer de 10 candles anteriores, mantendo
só os 4 posteriores à abertura - o primeiro candle que sobra é
exatamente o de `desde`, não um dos 10 de antes. Suíte completa de
`checker.js`/`pairAnalyzer.js`/janela operacional revalidada sem
regressão.

Pendente, per a diretriz do CLAUDE.md de validar manualmente os
primeiros ciclos após qualquer correção no pipeline antes de deixar
rodando sozinho via cron: confirmar no próximo ciclo real do
`forex-scanner-real.yml` que o `[DIAG-ATRASO]` passa a mostrar um
atraso pequeno (poucos minutos, não mais ~10h) e acompanhar o próximo
fechamento real via `result-checker.yml` pra confirmar que o
comportamento em produção bate com o validado isoladamente.
--------
AJUSTE-004 — GBP/USD passa a operar com R/R 1,5:1 (TP mais largo, SL
igual); corrigida a staleness de expectativa/R-R no cálculo financeiro
(scripts/moneyManager.js)

Origem: usuário reportou Balanceado/Conservador travados sem gerar
sinal (22/09/2026). Investigado: taxa de acerto histórica real de
TODOS os pares está abaixo de 50% com R/R 1:1 (a config sempre gerava
`tpUSD === slUSD`, de todo ramo de `decidirConfiguracaoMercado()`) - o
gate de expectativa mínima (PENTE-FINO-004) bloqueia matematicamente
qualquer sinal nessas condições, não importa a qualidade técnica do
sinal específico. Confirmado que não é bug: com taxa de acerto abaixo
de 50% e R/R 1:1, expectativa é estruturalmente negativa.

Ferramenta nova (`ferramentas/analise-rr-simulacao.js`, workflow
avulso `analise-rr-simulacao.yml`, só `workflow_dispatch`, nunca cron)
testou empiricamente "TP mais largo ajudaria?" contra candles OHLC
reais buscados da TwelveData - não contra suposição teórica (que
assume taxa de acerto constante com TP maior, falso: preço precisa
percorrer mais distância, taxa de acerto cai). Três rodadas até a
simulação ficar confiável:
1. 1ª versão só checava critério financeiro, ignorando TP_PIPS/
   SL_PIPS (o motivo de fechamento mais comum na prática) - fidelidade
   contra o resultado real gravado só batia 25-64%.
2. Corrigido pra replicar os dois critérios reais de `js/checker.js`
   na ordem certa - fidelidade continuou baixa (27-75%).
3. Achado real: 103 das 142 operações ENCERRADAS (72,5%) fecharam
   ANTES do AJUSTE-003 (bug de timezone) - o resultado real delas foi
   calculado com candle errado, nunca poderia bater contra uma
   simulação com candle correto. Restrita a fidelidade ao subconjunto
   pós-fix (39 operações): **82,1% (32/39)**, com 3 pares em 100% e o
   resto sendo amostras de 1-4 operações (um único caso decide a
   porcentagem) - considerado confiável o bastante pra decidir.

Resultado da simulação (TP 1x/1,5x/2x o SL, SL fixo): alargar o TP
**piora** a expectativa na maioria dos pares (AUD/USD, USD/JPY,
USD/CHF, EUR/JPY) - a queda na taxa de acerto supera o payout maior.
Só **GBP/USD** mostra melhora real e crescente: expectativa 0,36 (1:1)
→ 0,75 (1,5:1) → 1,74 (2:1). USD/CAD e EUR/USD já nascem positivos em
1:1 mas com amostra pequena demais (11-12 operações) pra decidir
qualquer coisa. Decisão: ajuste restrito a GBP/USD, R/R 1,5:1 (ponto
validado sem se apoiar no extremo menos testado, 2:1) - não uma
mudança de R/R geral.

Implementação (`scripts/moneyManager.js`):
- `decidirConfiguracaoMercado()` ganha o parâmetro `par`; no fim da
  função (depois dos ramos de ADX/ATR/expectativa), se `par ===
  "GBP/USD"`, `tpUSD` é recalculado como `slUSD × 1.5` (usando o
  `slUSD` JÁ DECIDIDO pelos ramos anteriores, não o bruto) - SL nunca
  muda, só o alvo de lucro alarga.
- **Bug de staleness corrigido junto** (necessário pra este ajuste
  funcionar, não é scope creep): `tpPips`/`slPips`/`rewardRisk`/
  `riscoPercentual`/`expectativa` em `analisarFinanceiro()` eram
  calculados com o `tpUSD`/`slUSD` BRUTO (antes de
  `decidirConfiguracaoMercado()` rodar), não com o valor REALMENTE
  usado. Nunca importou enquanto todo ramo mantinha `tpUSD===slUSD`
  (a mudança de magnitude não muda o SINAL da expectativa) - mas com
  R/R≠1 agora existindo pro GBP/USD, usar o valor bruto faria o gate
  de expectativa (`decisionEngine.js`) ignorar completamente o
  alargamento, o próprio propósito da mudança. Corrigido: os cinco
  campos agora são calculados DEPOIS de `decidirConfiguracaoMercado()`,
  a partir de `decisaoMercado.tpUSD`/`decisaoMercado.slUSD`.

Validado: teste isolado novo (`validate-ajuste004-rr-gbpusd.js`, 10
cenários) - GBP/USD sai com `tpUSD` 1,5× `slUSD` (SL inalterado),
`rewardRisk` 1.5, expectativa positiva onde seria negativa em R/R 1:1;
prova end-to-end contra o gate REAL de produção
(`decisionEngine.js`'s `avaliarOperacao`, não só
`validarPerfilFinanceiro` de `moneyManager.js`, que não checa
expectativa): sinal GBP/USD que seria bloqueado por expectativa
negativa em R/R 1:1 passa a ser APROVADO com o R/R 1,5:1 corrigido;
EUR/USD idêntico continua corretamente BLOQUEADO (contraprova de não
regressão); GBP/USD com ADX baixo (ramo REDUZIR_EXPOSICAO, SL cai pra
3) alarga o TP a partir do SL JÁ REDUZIDO (4.5), não do bruto; outro
par (USD/JPY) com ADX baixo continua 3/3 normal, sem nenhum
alargamento. Suíte completa de `moneyManager.js`/`decisionEngine.js`/
`pairAnalyzer.js` revalidada sem regressão.

Pendente, per CLAUDE.md: validar os primeiros sinais reais de GBP/USD
gerados sob o R/R novo antes de considerar isso definitivamente
resolvido - a amostra que embasou a decisão (28 operações, 10
comparáveis) ainda é pequena. Os outros 7 pares continuam sem ajuste,
travados enquanto mais histórico pós-AJUSTE-003 não se acumula (ver
`PENDENCIAS-ESTRATEGICAS-RMI.md`).
--------
AJUSTE-005 — pares com lastro asiático (JPY/AUD/NZD) passam a operar
EXCLUSIVAMENTE na janela asiática de seg-qui, não mais também na
janela padrão (scripts/scanner.js)

Origem: usuário pediu (23/09/2026) pra investigar escalonamento
automático de pares por horário - a ideia maior era rotacionar entre
os 20 pares cadastrados em `TODOS_PARES` (`js/config.js`) conforme a
sessão de mercado fecha/abre, mantendo sempre ~8 pares ativos.
Investigação encontrou um problema estrutural que bloqueia a ideia
maior por ora (gate de histórico mínimo é por par - um par novo entra
com `taxaAcerto=0`, expectativa sempre fortemente negativa, preso num
ciclo "precisa de operação pra sair do zero, mas só opera se já tiver
saído do zero" - só o AGRESSIVO, que não bloqueia por expectativa,
escaparia disso). Registrado em detalhe, com pedido explícito do
usuário pra não esquecer, em `PENDENCIAS-ESTRATEGICAS-RMI.md` seção 6.

Escopo dividido em duas frentes; só a frente 1 foi implementada agora:
- **Frente 1 (implementada):** reorganizar a janela dos 8 pares já
  monitorados, sem mexer no universo de pares.
- **Frente 2 (NÃO implementada, registrada como pendência):** expandir
  de fato pro universo de 20 pares com rotação automática, incluindo
  preencher o vácuo de liquidez das 18h-21h (hoje proposital, ver
  comentário em `scripts/scanner.js` sobre "otimismo sem base"
  removido) - depende de resolver o cold-start de histórico acima
  antes de fazer sentido.

Implementação da frente 1 (`scripts/scanner.js`,
`parNaJanelaOperacional()`): antes, TODO par testava primeiro a janela
padrão (07:30-18:00 Brasília) e só caía pra janela asiática
(21:00-23:59, seg-qui) se estivesse fora dela - ou seja, pares
JPY/AUD/NZD (exceto GBP/JPY, excluído de propósito por volatilidade)
tinham acesso às DUAS janelas todo santo dia útil, disputando
ciclo/chamada de API com os pares que já cobrem bem o horário de
Londres/NY sem necessidade real (a sessão de maior liquidez desses
pares É a asiática). Agora: de seg-qui, esses pares checam a janela
asiática PRIMEIRO e de forma EXCLUSIVA (se são elegíveis nesse dia,
só operam 21:00-23:59, nunca durante o dia); fora de seg-qui (sex/sáb/
dom), sem janela asiática definida por regra de negócio já existente,
continuam na janela padrão normal - não tira o único horário
disponível deles nesses dias. Pares sem lastro asiático (EUR/USD,
GBP/USD, USD/CAD, USD/CHF) e GBP/JPY (excluído explícito) não mudam
em nada.

Validado: teste isolado novo
(`validate-ajuste005-janela-exclusiva.js`, 15 cenários, já que
`scripts/scanner.js` não pode ser `require()`ado direto pra teste -
`main()` roda como efeito colateral do próprio módulo, chamaria
Firebase de verdade - então o teste copia verbatim as três funções
puras editadas com `obterAgoraBrasil()` trocado por parâmetro
mockável). Cobre: par asiático excluído da janela padrão em dia útil
com janela asiática disponível (novo comportamento); mesmo par
preservado na janela padrão em dia sem janela asiática (sexta,
domingo - sem regressão); pares sem lastro asiático e GBP/JPY
inalterados em todos os cenários (sem regressão); vácuo 18h-21h
continua sem janela pra ninguém; sábado sem janela pra ninguém.
15/15 cenários passaram.

Pendente, per CLAUDE.md: validar os primeiros ciclos reais após o
deploy, especialmente a transição de horário (pares JPY/AUD/NZD
devem sumir da lista de pares analisados durante o dia útil e voltar
a aparecer só às 21h). Frente 2 (universo de 20 pares) segue registrada
como pendência estratégica, sem decisão de implementação.
--------
AJUSTE-006 — janela asiática deixa de cortar em 23:59, passa a virar
a meia-noite e ir até 04:00 (scripts/scanner.js)

Origem: usuário perguntou (23/09/2026) se fazia sentido liberar o
horário da janela asiática além de 23:59 pra acumular mais histórico
dos pares JPY/AUD/NZD (gargalo documentado em
`PENDENCIAS-ESTRATEGICAS-RMI.md` seção 6, e agravado pelo AJUSTE-005
do mesmo dia, que tornou esses pares exclusivos da janela asiática).
Analisado antes de implementar: o corte em 23:59 nunca teve base em
dado real - era só um atalho de engenharia (comentário original:
"simplificada de propósito... evita bug de rollover de dia"). A fonte
externa já documentada no próprio código (Babypips/Dukascopy) mostra
que o overlap real Sydney/Tóquio vai até por volta de 04:00 de
Brasília - o corte em 23:59 perdia justamente o trecho de maior
liquidez da sessão. Como a conta roda em `SIMULADA` (`CONFIG_PADRAO`,
comentário AJUSTE-001: "fase de teste atual, sem capital de verdade em
jogo"), estender o horário não expõe capital automático - só acelera
o acúmulo de histórico. Ressalva registrada e aceita: a taxa de
acerto continua pooled por par (não segmentada por sub-horário da
janela), então misturar 21h-23h59 com 00h-04h pode juntar regimes de
liquidez diferentes numa estatística só - mesma limitação já conhecida
("expectativa usa taxa de acerto do par, não do sinal específico",
`PENDENCIAS-ESTRATEGICAS-RMI.md`), não resolvida aqui, só não piorada
a ponto de bloquear a decisão.

Implementação (`parNaJanelaOperacional()`): `JANELA_ASIA_FIM` (23:59)
substituído por `JANELA_ASIA_FIM_MADRUGADA` (04:00 = 4×60). Lógica
agora tem duas condições pra elegibilidade asiática: `abreJanelaNova`
(seg-qui, ≥21:00 - igual antes) e `continuaMadrugada` (NOVO: ter-sex,
≤04:00 - note o deslocamento de +1 dia em relação a abreJanelaNova,
porque é a CONTINUAÇÃO do dia anterior). Confirmado explicitamente com
o usuário: quinta 21h→sexta de madrugada CONTINUA valendo (fim de uma
janela já aberta, não abertura nova) - só abertura NOVA às 21h de
sexta continua de fora, pelo motivo de sempre (perto do fechamento
semanal). Cuidado central da implementação: segunda de madrugada
(continuação hipotética de domingo) tem que ficar de fora, porque
domingo nunca abre janela asiática nova - por isso o intervalo de dias
de `continuaMadrugada` é [2,5] (terça a sexta), não [1,4] deslocado
ingenuamente.

Validado: teste isolado novo
(`validate-ajuste006-janela-madrugada.js`, 20 cenários, mesmo motivo
de não poder `require()` o módulo real dos testes anteriores) - inclui
regressão completa dos 9 cenários mais relevantes do AJUSTE-005 (sem
mudança) mais 11 cenários novos do rollover: continuação terça/quarta/
sexta de madrugada dentro do limite; corte exato às 04:00 (03:59
passa, 04:01 não); vácuo 04:00-07:30 ainda sem janela; sexta de manhã
cedo cai certo pra janela padrão; e o cenário crítico - segunda de
madrugada NÃO virar continuação fantasma de domingo. Sábado/domingo
de madrugada também conferidos (nenhum dos dois abre janela nova, en-
tão não há continuação possível). GBP/JPY (excluído de propósito) e
pares sem lastro asiático confirmados sem nenhuma mudança.

Pendente, per CLAUDE.md: validar os primeiros ciclos reais da
madrugada (00:00-04:00, ter-sex) depois do deploy, e observar se o
volume de operações dos pares JPY/AUD/NZD nesse intervalo realmente
acelera o acúmulo de histórico como esperado, sem indício de que o
regime de liquidez de madrugada é sistematicamente pior que o de
21h-23h59 (o que justificaria segmentar a estatística por sub-horário
no futuro, item que fica em aberto, não decidido agora).
--------
AJUSTE-007 — SMC (order block) ligado em produção, persistido no
sinal salvo e controlável pela tela de Config (scripts/pairAnalyzer.js,
js/config.js, js/historico.js, ferramentas/ativar-smc.js)

Origem: usuário achou (24/09/2026) que o SMC já estava em uso na
análise de hoje. Conferido no código antes de aceitar a afirmação
(disciplina do CLAUDE.md): a flag `smcAtivo` (MUD-05, 17/09/2026)
sempre nasceu DESLIGADA por padrão e nunca teve campo nenhum na tela
de Config - só dava pra ligar escrevendo direto no Firestore via
Console. Chequei dois logs reais do dia (um do horário do pedido, um
do meio do dia) procurando a linha `"SMC.............."` (só aparece
com a flag ligada) - não apareceu em nenhum dos dois, embora nos dois
casos os pares tenham parado no cooldown antes de chegar nesse ponto
do código (não é prova conclusiva de que estava desligado, só ausência
de evidência de que estava ligado). Reportado ao usuário como correção,
não como validação da observação dele. Pedido explícito depois:
"deve ficar ligado como parte da análise" + expor controle na tela de
Config + mostrar o resultado nos detalhes do sinal.

Também esclarecida a pergunta "tem outros critérios de análise [SMC]
também não tem?": só Order Blocks foi implementado no MUD-05 - a
especificação original incluía Liquidity Sweeps e Fair Value Gaps
(FVG), deliberadamente fora de escopo dessa primeira rodada ("da
espec, não reaberto"). Não implementados agora, seguem registrados
como pendência.

Quatro mudanças:

1. **Bug de visibilidade corrigido** (`scripts/pairAnalyzer.js`):
   `calcularQualidade()` já devolvia `smcDetectado`/`smcScore` desde o
   MUD-05 - o bônus/penalidade de ±3 já influenciava `scoreFinal`
   corretamente, mas os dois campos nunca eram copiados pro objeto
   `analise`/`operacao` salvo no Firestore. O SMC já afetava o score
   há uma semana sem deixar rastro visível de QUAL order block, em
   qual direção, ou se o preço estava na zona - só dava pra inferir
   pela diferença no score, não pra confirmar diretamente. Corrigido:
   os dois campos agora entram no documento salvo, mesmo shape de
   sempre (`null`/`0` quando a flag está desligada ou nenhum OB
   relevante foi encontrado - sem mudança de comportamento nesse
   caso).

2. **Controle exposto na tela de Config** (`js/config.js`): novo card
   "🧠 Análise Institucional (SMC)" com checkbox `cfgSmcAtivo`, padrão
   **ligado** (`smcAtivo: true` em `configuracaoPadrao()` - já validado
   com 21 cenários isolados desde o MUD-05, camada secundária que
   nunca decide sozinha). Lido em `obterConfiguracoesTela()` e gravado
   em `configuracoes/geral` junto do resto da configuração, no mesmo
   clique de "Salvar Configurações" que já existia - não precisa de
   fluxo novo.

3. **Detalhe do sinal mostra o SMC** (`js/historico.js`): nova função
   `bannerSMC()`, chamada em `construirDetalheSinal()` logo após o
   grid de RSI/EMAs - mostra a direção do order block, se o preço
   estava na zona, e o pontos (+3/-3) aplicado ao score, com cor
   verde/vermelha conforme o sinal do score. Não renderiza nada quando
   `sinal.smcDetectado` é `null` (sinal salvo antes desta mudança, flag
   desligada, ou nenhum OB relevante encontrado naquele ciclo) - sem
   quebrar sinais antigos.

4. **Ativação real em produção** (`ferramentas/ativar-smc.js` +
   `.github/workflows/ativar-smc.yml`): ferramenta administrativa
   avulsa, só `workflow_dispatch`, mesmo padrão de
   `analise-rr-simulacao.js` - escreve `smcAtivo: true` em
   `configuracoes/geral` (Firebase Admin com o secret já usado pelos
   workflows de produção) e confirma lendo de volta antes de retornar
   sucesso. Necessária porque este ambiente de código não tem
   credencial de Firestore pra escrever direto (ver CLAUDE.md) - editar
   `js/config.js` sozinho não muda o valor já gravado no banco, só
   controla saves futuros feitos pela tela.

Validado: teste isolado novo
(`validate-ajuste007-smc-persistencia.js`, 2 cenários) - isola só a
FIAÇÃO da mudança #1 (a detecção de order block em si já tem os 21
cenários do MUD-05, não repetidos aqui): com `calcularQualidade()`
mockado devolvendo `smcDetectado`/`smcScore` definidos, confirma que
`analisarPar()` copia os dois valores pro documento que
`salvarOperacao()` recebe; contraprova com `smcDetectado: null`/
`smcScore: 0` (flag desligada) confirma que o resto do documento
(`tpUSD`/`slUSD` etc.) continua salvando normalmente, sem regressão.

Pendente, per CLAUDE.md: rodar o workflow `ativar-smc.yml` uma vez pra
ligar de fato em produção, e validar o primeiro ciclo real depois
(linha `"SMC.............."` aparecendo no log de algum par elegível,
fora de cooldown, com a flag confirmada ligada). Liquidity Sweeps e
Fair Value Gaps (FVG) seguem fora de escopo, registrados aqui como
pendência, não implementados.
--------
AJUSTE-008 — fechamento manual de operação (resultado real da
corretora) + detecção de rotação de tela reforçada (js/historico.js)

Origem: usuário fechou manualmente na XM um sinal real (EUR/JPY SELL,
23/09/2026 21:55) por +$3, preferindo travar lucro a esperar o TP/SL
automático - decisão de risco razoável, mas expôs um problema real: a
operação continuaria `ABERTA` no Firestore até `checker.js` bater o
TP/SL dele sozinho, gravando um resultado que **não é o que realmente
aconteceu com o dinheiro real do usuário**. Como toda operação
encerrada alimenta a taxa de acerto/expectativa usada por
`decisionEngine.js` pra aprovar sinais futuros, isso contaminaria
silenciosamente a base de aprendizado - exatamente o tipo de risco que
`CLAUDE.md` trata como não-negociável ("Qualidade de sinal da RMI").
Não existia nenhum jeito de registrar isso: `alternarOperacaoReal`
(já existente) só liga/desliga se uma operação JÁ FECHADA conta pra
Conta Real, nunca reescreve o resultado em si.

Também aproveitado pra corrigir um bug relatado separadamente: no
celular, virar a tela não trocava pra "modo lista" sozinho - precisava
atualizar a página manualmente.

Duas mudanças, ambas em `js/historico.js`:

1. **Fechamento manual** (`fecharOperacaoManualmente`, exposta como
   `window.fecharOperacaoManualmente`): novo botão "🔒 Fechei
   Manualmente na Corretora", visível só em operações ainda sem
   `resultado` (PENDENTE). Pede o resultado financeiro real via
   `prompt()`, confirma, e grava `status: "ENCERRADA"`, `resultado`
   (WIN/LOSS pelo sinal do valor informado), `resultadoFinanceiro`,
   `motivoEncerramento: "MANUAL_CORRETORA"` (valor novo e distinto dos
   fechamentos automáticos - SL_FINANCEIRO/TP_FINANCEIRO/SL_PIPS/
   TP_PIPS - pra dar pra filtrar numa análise de qualidade depois),
   `fechadoManualmente: true`, `fimOperacao`. Atualiza `saldoSimulado`
   com a MESMA fórmula de `js/checker.js` (linha ~364-368) - Conta
   Simulada acompanha todo sinal fechado, sempre, independente do
   `tipoConta` ativo (comportamento documentado lá, preservado aqui).
   Não mexe em `saldoReal` - marcar como "conta de verdade" continua
   sendo o passo separado de sempre, pelo checkbox
   `alternarOperacaoReal` já existente (reutilizado, não duplicado).

2. **Detecção de rotação reforçada** (`inicializarDeteccaoOrientacao`):
   o mecanismo original (`matchMedia("(orientation: landscape)")` +
   evento `change`) já existia e, na teoria, deveria funcionar sozinho
   - mas é um comportamento conhecido de alguns navegadores móveis não
   disparar esse evento de forma confiável, ou disparar antes do
   viewport terminar de recalcular. Reforçado com dois fallbacks
   redundantes, sem remover o original: listener de `resize` (relê
   `mq.matches` em vez de supor, porque `resize` dispara por qualquer
   motivo, não só rotação de verdade) e a API `screen.orientation`,
   quando disponível. Debounce de 150ms antes de reler a orientação,
   pra dar tempo do navegador terminar de recalcular dimensões.
   `aplicarOrientacaoAtual()` centraliza os três caminhos e só
   re-renderiza se o valor de fato mudou.

Validado: `node -c` (sintaxe) nos dois arquivos - o teste funcional de
verdade fica pro usuário confirmar no próprio app, já que
`fecharOperacaoManualmente` depende de `firebase.firestore()`/`prompt`/
`confirm` reais de browser (não dá pra isolar num teste Node puro como
os scripts de `scripts/`), e a rotação depende de dispositivo físico
real, que não existe neste ambiente. Pendente, per CLAUDE.md: validar
o primeiro uso real do botão de fechamento manual (o usuário já tem um
caso real esperando - o próprio EUR/JPY que motivou esta mudança) e
confirmar se a rotação melhorou no celular dele.
--------
AJUSTE-009 — veto de RSI extremo (entrada tardia), item #1 das
pendências estratégicas, implementado (scripts/decisionEngine.js,
scripts/pairAnalyzer.js, scripts/scanner.js)

Origem: usuário identificou "entrada tardia" como preocupação,
analisando o mesmo sinal real de EUR/JPY SELL (23/09/2026, RSI 19.33)
- bate exatamente com o achado #1, já registrado e priorizado, dos
dois relatórios de auditoria estratégica de 13/09/2026
(`PENDENCIAS-ESTRATEGICAS-RMI.md`, seção 5): "RSI nunca veta direção -
só desconta score" / "Veto de RSI extremo... o achado mais concreto e
acionável". Usuário confirmou avançar agora.

Implementação (`decisionEngine.js`'s `avaliarOperacao()`): novo gate,
inserido depois do gate de expectativa e antes do gate de tendência
COMPRESSAO/CONFLITO. BLOQUEIA (`SEM_VIABILIDADE`) quando BUY (tendência
ALTA) tem RSI>73 (sobrecomprado) OU quando SELL (tendência BAIXA) tem
RSI<27 (sobrevendido). Limiares no meio da faixa sugerida pelos
relatórios (72-75 sobrecomprado, 25-28 sobrevendido) - escolha inicial
sem validação empírica própria ainda, mesma ressalva de sempre.
Decisão de design explícita: o veto vale **igual pros três perfis**,
diferente da expectativa/risco financeiro (que variam por tolerância a
risco) - a lógica é que RSI extremo contradiz a própria direção que o
sinal está propondo, não é uma questão de quanto risco o perfil
aceita. `pairAnalyzer.js` precisou passar `rsi: rsiAtual` (já
calculado, nunca repassado pra `avaliarOperacao()` antes).

Companheiro necessário: `scanner.js`'s switch de status->log nunca
tinha `case` pra `SEM_VIABILIDADE` (bug já identificado numa sessão
anterior, nunca corrigido) - caía no `default`, incrementando
`erros` e logando "Erro interno" pra um bloqueio esperado (histórico
insuficiente, expectativa negativa, e agora também o veto de RSI).
Como o veto novo usa esse mesmo status com frequência bem maior que os
outros dois motivos, corrigido agora: `case` próprio, conta como
`semSinal` (não `erros`) e loga o motivo real
(`resultado.motivo`) em vez do rótulo genérico.

Validado: teste isolado novo (`validate-ajuste009-rsi-veto.js`, 14
cenários) - reproduz o caso real (SELL RSI=19.33, bloqueado); BUY
RSI=80 bloqueado; BUY/SELL com RSI normal aprovados normalmente;
limites exatos conferidos (73/27 NÃO vetam, só estritamente acima/
abaixo veta); veto confirmado idêntico nos três perfis (agressivo/
balanceado/conservador); RSI ausente não quebra nem veta (guard
`Number.isFinite`); contraprovas de não-regressão - score insuficiente
continua bloqueando sem interferência do veto novo, expectativa
negativa no agressivo continua só avisando (PENTE-FINO-004 preservado).

`PENDENCIAS-ESTRATEGICAS-RMI.md` atualizado: item #1 da lista de
prioridade combinada marcado como RESOLVIDO, com esta entrada como
evidência.

Pendente, per CLAUDE.md: validar os primeiros ciclos reais - quantos
sinais que antes seriam aprovados agora ficam de fora por RSI extremo,
e se isso reduz de fato o padrão de "entrada tardia" que motivou a
mudança. Limiares (73/27) não foram validados contra dado histórico
próprio - só contra a faixa sugerida pelos relatórios - candidato a
ajuste fino quando houver amostra de sinais vetados/não-vetados
suficiente pra comparar.
--------
AJUSTE-010 — tabela compacta vira o modo padrão do Histórico, não só
girando a tela (js/historico.js)

Origem: usuário achou os cards do Histórico grandes demais, com
rolagem excessiva pra comparar muitos sinais ("como trabalhamos com
muita informação de comparativo, precisa estar tudo num campo
visual"). Perguntado sobre o formato preferido (tabela compacta densa
vs. cards mais enxutos vs. referência própria) - escolheu tabela
compacta densa.

Achado ao investigar: essa tabela **já existia**, construída na
rodada de 11/09/2026 (colunas Horário/Par/Direção/Tempo/Resultado/
Favor/Contra/Resultado Financeiro/Operação Real/Cmp, agrupada por dia,
com modo compacto pra tela baixa) - só ficava escondida atrás da
orientação da tela (só aparecia em paisagem) ou de um botão manual,
com cards como padrão. Em vez de construir do zero, só trocado o
padrão: `modoTabela` passa a nascer `true` (era `false`, sobrescrito
por `matchMedia` no primeiro carregamento). Reaproveita código já
testado, risco bem menor que uma tela nova.

Efeito colateral direto, resolvendo o AJUSTE-008 de raiz: como a
tabela agora é sempre o modo ativo, não existe mais nada pra "trocar"
numa rotação de tela - o pedido de "virar e já ficar em lista" deixa
de fazer sentido como problema separado. Por isso a detecção de
orientação inteira (a função `inicializarDeteccaoOrientacao`, com os
fallbacks de `resize`/`screen.orientation` que o próprio AJUSTE-008
tinha acabado de reforçar horas antes) foi **removida**, não deixada
desativada - ela forçaria de volta pro card em tela retrato, brigando
com o novo padrão. Botão manual (`alternarModoTabela`) continua
existindo, sem mudança, pra quem quiser voltar pro card em algum
momento.

Validado: `node -c` (sintaxe); conferido que os 5 pontos do código que
ramificam em `modoTabela` (renderização das linhas, conteúdo por dia,
padding, rótulo do botão, modo compacto) continuam intactos, só a
variável inicial mudou - o teste funcional de verdade é visual, fica
pro usuário confirmar no app.
--------
AJUSTE-011 — casas decimais do preço seguem a convenção do par
(JPY=3, outros=5) em vez do bruto sem formatação (js/historico.js)

Origem: usuário notou preços de entrada com quantidade de casas
decimais inconsistente entre sinais (ex: "179,75494", 5 casas, num par
JPY). Causa: o preço bruto vem da TwelveData sem nenhum arredondamento
na exibição - cada sinal aparecia com quantas casas o candle daquele
ciclo trouxe, sem regra nenhuma. Os CÁLCULOS de pip/lucro já estavam
corretos (scripts/moneyManager.js já usa `tamanhoPip = ehJPY ? 0.01 :
0.0001` internamente) - o problema era só na exibição.

Convenção real do mercado Forex: pares com JPY cotam com 3 casas
decimais (pip = 2ª casa, 3ª é a "pipette" - fração de pip); pares sem
JPY cotam com 5 (pip = 4ª casa, 5ª é a pipette). Essa regra já existia
LOCALIZADA dentro de `renderizarCaminhoPrecos()` (usada só pro gráfico
de caminho de preço) - extraída pra uma função compartilhada nova,
`formatarPrecoPar(valor, par)`, no topo do arquivo, e aplicada em
todo lugar que antes mostrava o valor bruto sem formatação: preço de
entrada (linha da tabela e card de detalhe), preço de saída, e os três
EMAs no card de detalhe (antes fixos em 5 casas sempre, mesmo em par
JPY). `renderizarCaminhoPrecos()` passou a chamar a função
compartilhada em vez de manter sua própria cópia da regra.

Validado: `node -c` (sintaxe); conferido que não sobrou nenhuma
exibição de preço sem passar por `formatarPrecoPar()`.
--------
AJUSTE-012 — Histórico carrega só hoje+ontem por padrão, resto sob
demanda (js/historico.js)

Origem: usuário reportou demora de ~30s TODA VEZ que abre/atualiza o
app (não só na primeira vez) - descartando hospedagem/cold-start como
causa raiz (GitHub Pages é CDN estático, sem cold-start; o padrão
"sempre lento" também não bate com o comportamento típico de Render,
que só é lento na primeira abertura do dia). Achado real: `carregarHistorico()`
buscava até 300 documentos INTEIROS do Firestore toda vez que carregava
(cada um com indicadores/estatísticas/financeiro/caminhoPrecos
aninhados) - como a última aba visitada fica salva
(`localStorage`), um refresh comum (e o usuário fica majoritariamente
no Histórico) recarregava direto nessa busca pesada.

Pedido do usuário: carregar só hoje e ontem por padrão; dias mais
antigos só sob demanda, clicando em "Carregar mais".

Implementação: `.limit(300)` fixo substituído por
`.where("timestamp", ">=", inicioDiaBrasiliaUTCms(diasCarregados - 1))`
(campo único com `orderBy` no mesmo campo - não precisa de índice
composto, mesma cautela de sempre neste projeto contra
"FAILED_PRECONDITION: requires an index") + `.limit(600)` como teto de
segurança bem folgado. `diasCarregados` começa em 2 (hoje+ontem),
variável de módulo que cresce +1 a cada clique em "Carregar mais"
(botão novo, `carregarMaisHistorico()`, no fim da lista) - persiste
entre trocas de aba na mesma sessão da página, reseta só num reload de
verdade (o cenário que motivou a mudança).

Efeito colateral que precisou de correção: o card de estatísticas do
topo ("Setembro 2026: 68✅ 112❌ 37,8%") era calculado sobre a MESMA
amostra buscada (sem consulta extra, característica preservada) - com
a amostra agora limitada a poucos dias, manter o rótulo de mês inteiro
ficaria enganoso (mostraria só 2-3 dias com cara de mês completo).
Rótulo passa a dizer "Hoje e ontem" ou "Últimos N dias", refletindo o
que de fato está carregado, sem prometer um total que não está ali.

O polling automático de 90s (que já existia, recarrega o Histórico
sozinho enquanto a aba está em primeiro plano) herda a mesma economia
automaticamente, sem mudança de código - o comentário que citava os
números antigos (300 docs, conta de cota) foi atualizado pra não ficar
desatualizado/enganoso.

Validado: `node -c` (sintaxe). Teste funcional de verdade (tempo real
de carregamento, comportamento do botão "Carregar mais") fica pro
usuário confirmar no app - não dá pra medir performance de rede real
neste ambiente.

**Achado relacionado, NÃO corrigido ainda**: `js/pairInsights.js`'s
`calcularDesempenhoPorPar()` (usado pela "Sugestão de Agora" do
Dashboard) busca até **500** documentos inteiros do Firestore - maior
ainda que o problema do Histórico - toda vez que o Dashboard renderiza
(inclusive depois de clicar em Iniciar/Parar Scanner, já que
`app.render()` reconstrói a aba inteira). Diferente do Histórico,
NÃO dá pra aplicar a mesma janela de dias aqui: essa função calcula
taxa de acerto por par pra sugerir quais ativar, e precisa de uma
amostra histórica profunda (mínimo 30 operações por par,
`OPERACOES_MINIMAS_HISTORICO`) - "hoje e ontem" teria amostra
praticamente vazia pra a maioria dos pares, quebrando a sugestão. O
fix certo aqui é outro (cache/memoização da conta, não refazer a busca
a cada render) - registrado, não implementado, aguardando decisão
explícita do usuário sobre a abordagem antes de mexer numa
funcionalidade de sugestão que ninguém pediu pra revisar ainda.
--------
AJUSTE-013 — cache com TTL na busca de desempenho por par, usada pela
Sugestão de Agora do Dashboard (js/pairInsights.js)

Origem: continuação direta do AJUSTE-012 - usuário confirmou querer o
mesmo tipo de correção no Dashboard/fluxo de Iniciar-Parar Scanner.
`calcularDesempenhoPorPar()` buscava até 500 documentos inteiros do
Firestore toda vez que rodava (maior que o problema já corrigido no
Histórico). Diferente de lá, não dava pra limitar por dias recentes -
a taxa de acerto por par exige amostra funda (mínimo 30 operações,
`OPERACOES_MINIMAS_HISTORICO`); "hoje e ontem" deixaria a maioria dos
pares sem dado suficiente pra classificar, quebrando a sugestão.

Implementação: cache em memória (`cacheDesempenho`, variável de
módulo) com TTL de 5 minutos - mesma ordem de grandeza do ciclo real
do Scanner (~5min via pinger externo, não o `schedule: */15` do YAML -
ver `PENDENCIAS-ESTRATEGICAS-RMI.md`), não faz sentido recalcular mais
rápido que a taxa em que histórico novo de fato pode aparecer.
Enquanto o cache está válido, `calcularDesempenhoPorPar()` retorna na
hora, sem nenhuma leitura no Firestore - qualquer render do Dashboard
dentro da janela de 5min (incluindo depois de Iniciar/Parar Scanner)
reaproveita o mesmo resultado. Cuidado adicional: só cacheia em caso
de sucesso (`sucesso = true` só depois do `snapshot.forEach` completar
sem exceção) - uma falha passageira de rede não pode travar o
Dashboard mostrando dado vazio pelos 5 minutos inteiros do TTL.

Validado: `node -c` (sintaxe). Teste funcional de verdade (queda real
no tempo de resposta) fica pro usuário confirmar no app.

**Achado novo, relacionado mas fora do escopo desta mudança**: o
comentário no topo do próprio arquivo (linhas ~21-27) já avisa que
`dentroJanelaPadrao`/`parNaJanelaOperacional`/`parElegivelJanelaAsia`
aqui são uma CÓPIA deliberada da lógica de `scripts/scanner.js`
(BUG-011, já documentado) - **e essa cópia está desatualizada**: não
reflete nem o AJUSTE-005 (23/09/2026, exclusividade da janela asiática
pra pares JPY/AUD/NZD de seg-qui) nem o AJUSTE-006 (mesma data, janela
asiática virando a meia-noite até 04:00). Efeito prático: a "Sugestão
de Agora" do Dashboard pode estar recomendando um par como "dentro da
janela" num horário em que o Scanner real já não analisa mais esse
par (ou vice-versa) - o Dashboard e o Scanner real podem estar
mostrando janelas diferentes pro mesmo par agora mesmo. Não corrigido
nesta mudança (fora do que foi pedido); registrado aqui pra não se
perder, mesma disciplina de sempre - decisão de prioridade fica para o
usuário.
--------
AJUSTE-014 — aba Scanner removida (botão migra pro Dashboard),
Sugestão de Agora desativada por ora (js/app.js, js/expert.js,
js/scanner.js removido, index.html)

Origem: pedido do usuário, na sequência direta do AJUSTE-013. Duas
mudanças de simplificação da interface:

1. **Aba Scanner removida.** Tinha "Última Análise" (não batia com o
   Histórico) e "Próxima Análise" - usuário avaliou que não
   acrescentava informação, só o botão Iniciar/Parar valia manter.
   Botão migrado pro card "Scanner Status" já existente no Dashboard
   (`js/expert.js`), que já lia o mesmo documento
   (`scanner/status`) - o estado dos botões (disabled conforme
   `dados.ativo`) passou a ser atualizado pelo MESMO polling de 15s
   que já existia ali, sem consulta nova. `verificarResetDiario()` e
   os handlers de clique migraram junto (únicos lugares que os
   usavam, conferido antes de apagar `js/scanner.js`). Efeito
   colateral bom: elimina um poller de 15s duplicado (a aba antiga e
   o Dashboard liam o MESMO documento cada um no seu próprio
   intervalo).

   Cuidado de compatibilidade: quem tinha `"scanner"` salvo como
   última aba em `localStorage` (de uma sessão anterior) cairia numa
   aba que não existe mais - `app.js`'s `render()` normaliza esse
   valor pra `"dashboard"` automaticamente (e já corrige o que está
   salvo), evitando tela em branco na próxima visita.

2. **"Sugestão de Agora" desativada no Dashboard** (não apagada) -
   usuário: "por enquanto estamos trabalhando com pares fixos, quando
   chegar o momento que conseguirmos trabalhar com todos os pares...
   vai fazer mais sentido esse card". `renderSugestaoAgora()` parou de
   ser chamada em `app.js`, mas `js/pairInsights.js` continua
   carregado e intacto (inclusive o cache do AJUSTE-013) - reativar é
   só voltar a chamar a função, quando a expansão de universo de pares
   (`PENDENCIAS-ESTRATEGICAS-RMI.md`, seção 6) sair do papel.

**Decisão explícita tomada, NÃO implementada ainda**: o usuário tinha
confirmado atualizar a cópia desatualizada da lógica de janela em
`pairInsights.js` (ver achado registrado no AJUSTE-013) antes de pedir
essas duas remoções na mesma mensagem. Como o card que usa essa lógica
está sendo desativado agora, corrigir a cópia teria efeito zero
imediato (nada renderiza ela) e a lógica toda provavelmente vai
precisar de um redesenho maior quando "Sugestão de Agora" for
reativada pro universo completo de pares (a mesma pendência do
AJUSTE-005/006/007's discussão de rotação por sessão). Adiado por
julgamento próprio, comunicado ao usuário - não é a mesma coisa que
"decidido não fazer": fica registrado que ele confirmou querer, só o
timing mudou.

Validado: `node -c` em `app.js`/`expert.js`; `grep` confirmando
nenhuma referência solta a `scannerView`/ids da aba removida depois de
apagar `js/scanner.js`. Teste visual de verdade (os dois botões
funcionando no Dashboard, sem regressão no Cooldowns Hoje/Modo
Atual/Desempenho que já viviam ali) fica pro usuário confirmar no
app.
--------
AJUSTE-015 — detalhe do sinal reorganizado em grades de 3 colunas,
altura reduzida pela metade, fechamento manual vira edição in-line dos
campos ENTRADA/SAÍDA (js/historico.js)

Origem: usuário comparou lado a lado a XM (com o preço real de mercado
visível, ex. AUD/USD) e o app, e pediu três mudanças no card de
detalhe do sinal:

1. Layout em 3 colunas por linha em vez de 2, mais estreito: EMA9/
   EMA21/EMA200 numa linha, RSI/Entrada/Saída na linha seguinte, SMC
   como mensagem (não é um número, fica como banner de sempre).
   Configuração Utilizada também vira 3 colunas: Lote/TP/SL numa
   linha, Saldo Antes/Resultado (campo NOVO)/Saldo Depois na
   seguinte.
2. Cards mais baixos - padding e fonte reduzidos pela metade
   (`miniCard()`, função nova reutilizada em todas as grades, evita
   repetir o mesmo bloco de CSS 9 vezes como antes).
3. Fechamento manual (AJUSTE-008) redesenhado: em vez de `prompt()`
   pedindo só o resultado em USD, o botão "Fechei Manualmente"
   agora LIBERA os próprios campos ENTRADA/SAÍDA pra edição in-line
   (viram `<input>` no lugar do texto, com o valor atual pré-
   preenchido) - o usuário digita o preço real que vê na corretora
   direto ali, sem abrir outra tela. Campo de Resultado Financeiro
   (USD) continua existindo como confirmação final (decisão
   deliberada: NÃO calcular o $ a partir da diferença de preço no
   navegador - pares cruzados tipo EUR/JPY precisam de cotação
   cruzada pra converter pip em dólar corretamente,
   scripts/moneyManager.js já faz isso no backend; replicar essa
   conta no cliente arriscava um número de dinheiro errado por
   simplificação, contra a disciplina de qualidade de sinal do
   CLAUDE.md - mais seguro pedir o valor que o usuário já vê pronto
   na tela da corretora).

Campo novo "Resultado" (entre Saldo Antes e Saldo Depois): mostra
`sinal.resultadoFinanceiro` (com fallback pra `lucroEstimado`, sinais
antigos) - substitui o bloco legado que só aparecia condicionado a
`movimentoPips`/`lucroEstimado` (campos de um schema anterior,
raramente presentes em sinais atuais) por um campo sempre visível,
igual os outros.

`ativarEdicaoFechamentoManual()`/`confirmarFechamentoManual()`
substituem a função antiga (`fecharOperacaoManualmente`, removida) -
mesma disciplina de sempre (motivoEncerramento MANUAL_CORRETORA,
saldoSimulado atualizado com a mesma fórmula do checker.js real,
Conta Real continua sendo um passo separado pelo checkbox já
existente). `precoEntrada`/`precoSaida` só são sobrescritos se o
usuário de fato editou o campo (guard `Number.isFinite`).

Validado: `node -c` (sintaxe); `grep` confirmando nenhuma referência
solta ao nome antigo da função depois do rename. Teste visual de
verdade (as 3 colunas, a edição in-line funcionando de ponta a ponta)
fica pro usuário confirmar no app.
--------
AJUSTE-016 — todo placar (card do topo, cabeçalho de mês, cabeçalho de
dia) passa a mostrar o valor ganho/perdido no final (js/historico.js)

Origem: mesma mensagem do AJUSTE-015 - usuário pediu que, em qualquer
lugar que já mostra ✅wins/❌losses/🎯taxa, apareça também o valor em
dólar ganho ou perdido daquele período, igual o Dashboard já mostra
pro saldo simulado. Regra explícita: ao carregar mais dias
(AJUSTE-012), o total do card do topo acompanha - "últimos 3 dias"
mostra o valor dos últimos 3, "últimos 7" o valor dos últimos 7, e
assim por diante.

`statsPorData[data]` ganha um terceiro campo, `financeiro` - soma
`resultadoFinanceiro` (ou `lucroEstimado`, sinais antigos) de toda
operação ENCERRADA daquele dia, independente de WIN/LOSS (é o valor
real que entrou ou saiu, não uma contagem). Aplicado nos três lugares
que já mostravam placar: o card do topo (soma de todo o período
carregado), o cabeçalho de cada grupo de mês, e o cabeçalho de cada
grupo de dia.

Correção lateral necessária: o card do topo somava só os dias cujo
mês batia com o mês corrente (`mesChaveDe`) - fazia sentido quando a
busca vinha de até 300 documentos que podiam ultrapassar um mês
inteiro (antes do AJUSTE-012); hoje a busca já é limitada a
`diasCarregados` dias, então esse filtro de mês só cortaria dado
errado perto da virada do mês (ex.: "últimos 3 dias" incluindo 1 dia
do mês anterior seria descartado da conta, inconsistente com o
rótulo "Últimos 3 dias"). Removido - agora soma tudo que está
carregado, sem filtro de mês.

Validado: `node -c` (sintaxe). Teste funcional (os valores batendo
com o que o Dashboard mostra pro saldo simulado) fica pro usuário
confirmar no app.
--------
AJUSTE-017 — fechamento manual calcula o resultado financeiro
automaticamente, pra pares sem cruzamento (js/historico.js)

Origem: usuário questionou, com razão, por que o fechamento manual
(AJUSTE-015) pedia o resultado em USD digitado à mão, já que o
fechamento AUTOMÁTICO (`js/checker.js`) calcula isso sozinho a partir
de entrada/saída/lote. Resposta honesta: dá sim pra fazer o mesmo no
navegador, PARA a maioria dos pares - só não pros pares cruzados
(nem base nem cotação é USD: EUR/JPY, GBP/JPY, EUR/GBP), que
precisam de uma cotação cruzada contra USD que só o backend busca
(a chave da TwelveData nunca fica exposta no navegador, por
segurança) e que nunca fica salva no documento original pra
reaproveitar depois.

Implementação: `calcularValorPipCliente()`/`calcularPipsCliente()`/
`calcularResultadoManual()` (js/historico.js) são uma cópia
DELIBERADA, só das duas fórmulas seguras de `calcularValorPip()`
(scripts/moneyManager.js, a mesma que `checker.js` usa pros
fechamentos automáticos) - retornam `null` explicitamente pro caso de
par cruzado, em vez de arriscar inventar um número. Os campos ENTRADA/
SAÍDA (liberados pelo AJUSTE-015) ganham `oninput` que recalcula o
campo de Resultado ao vivo enquanto o usuário digita, via
`recalcularResultadoManual()` - o campo continua um `<input>` normal
por cima do valor sugerido, o usuário revisa/corrige antes de
confirmar, nunca é sobrescrito silenciosamente sem ele ver. Pra pares
cruzados, o aviso no campo muda pra deixar explícito que precisa
calcular fora e informar manualmente (não finge que também calculou).

Validado: `node -c` (sintaxe) e teste isolado novo
(`validate-ajuste017-calculo-manual.js`, 14 cenários) - `valorPip`
batendo EXATAMENTE (`===`, não aproximado) contra a função real do
backend pra EUR/USD, USD/JPY, AUD/USD, USD/CAD; pares cruzados
(EUR/JPY, GBP/JPY, EUR/GBP) confirmados retornando `null` no cliente,
igual o backend real recusa (lança erro) sem `cotacaoCruzada`;
`calcularResultadoManual()` ponta-a-ponta com BUY/SELL nas duas
direções (preço a favor e contra), incluindo o caso análogo ao EUR/JPY
real que motivou o AJUSTE-015 (SELL com preço subindo = resultado
negativo, mas testado num par sem cruzamento pra poder validar contra
o backend); entrada inválida (NaN) retorna `null` sem quebrar.
--------
AJUSTE-018 — preset "Mercado Asiático" da tela de Config corrigido pra
refletir o horário real (até 04:00), checkbox redundante removido
(js/config.js)

Origem: usuário reportou, olhando a tela de Config, que o preset
"Mercado Asiático (21:00–23:59)" não batia com o horário real de
funcionamento ("se não me engano até às 4"). Confirmado: o preset
`asia` em `PRESETS_HORARIO` ia só até 23:59 por padrão, exigindo um
checkbox extra ("Operar também de madrugada") marcado à parte pra
cobrir o resto do overlap Sydney/Tóquio (até ~04:00) - o mesmo horário
que o scanner real já usa desde o AJUSTE-006 (23/09/2026) pra sua
própria janela asiática (JPY/AUD/NZD).

Removido o passo extra: `PRESETS_HORARIO.asia` passa a ser
`{horarioInicio: "21:00", horarioFim: "04:00"}` diretamente - o
checkbox `asiaMadrugada` (config, UI, `obterConfiguracoesTela()`,
payload salvo no Firestore, listener de evento) foi removido por
inteiro, não só desativado, por ficar redundante. `horarioDoPreset()`
perde o parâmetro `madrugada`, sem uso depois da simplificação.
Rótulo do preset atualizado pra "(21:00–04:00)". A virada de meia-
noite já era suportada de antes por `duracaoJanelaPadraoMinutos()`
(usada no card de consumo estimado de API) e por
`dentroJanelaPadrao()` no scanner real - nenhuma lógica de rollover
nova precisou ser escrita.

Nota: este preset controla a janela PADRÃO da Config (vale pra TODOS
os pares monitorados, se selecionado) - é uma configuração
INDEPENDENTE da janela asiática automática só pra JPY/AUD/NZD do
AJUSTE-005/006 em `scripts/scanner.js` (mesma regra de negócio,
duplicação deliberada documentada desde o BUG-011). As duas já
concordam no horário (21:00-04:00) depois desta correção, mas
continuam sendo dois mecanismos diferentes - um dá pra ligar por
qualquer par via Config, o outro é automático e exclusivo dos três
pares JPY/AUD/NZD.

Validado: `node -c` (sintaxe); `grep` confirmando zero referências
remanescentes a `asiaMadrugada`/`cfgAsiaMadrugada` depois da remoção;
checagem manual via Node (fora do navegador, só a lógica pura) -
`horarioDoPreset("asia")` devolve `{21:00, 04:00}` e
`duracaoJanelaPadraoMinutos()` calcula 420 minutos (7h) corretamente
pra essa janela que atravessa a meia-noite.

Pendente, per pedido do usuário na mesma mensagem: trocar os radio
buttons de preset por checkbox, permitindo selecionar múltiplos
horários simultaneamente (ex.: Londres + Nova York + Ásia juntos) ou
só Personalizado. NÃO implementado ainda - muda o modelo de dado
(`horarioInicio`/`horarioFim` como par único vira precisar suportar
múltiplas janelas) e toca a leitura real de `scripts/scanner.js`
(`dentroJanelaPadrao`), não só a tela de Config. Perguntas de escopo
enviadas ao usuário antes de implementar (mesclar janelas sobrepostas
vs. manter várias janelas separadas com vácuo entre elas;
Personalizado combinável com os presets ou exclusivo).
--------
AJUSTE-019 — "Janela de Horário" vira modo por SESSÕES (checkbox,
múltiplas simultâneas), com filtro de pares por moeda em Londres/Nova
York além da Ásia já existente (js/config.js, scripts/scanner.js)

Origem: pendência aberta no AJUSTE-018. Depois de 3 rodadas de
clarificação com o usuário (radios → checkbox; comportamento no
"buraco" entre sessões não-adjacentes; classificação de pares por
sessão), o requisito confirmado ficou bem mais amplo do que "trocar
radio por checkbox": cada sessão (Londres/Nova York/Ásia) passa a ter
sua PRÓPRIA janela fixa de horário E seus PRÓPRIOS pares elegíveis
(por moeda) - um par só opera numa sessão marcada se pertencer a ela.
Se as sessões marcadas não são adjacentes (ex.: Londres + Ásia sem
Nova York, buraco das 13h às 21h), o scanner fica parado nesse
intervalo - decisão explícita do usuário, sem tentar preencher o
vácuo. "Personalizado" continua existindo como alternativa EXCLUSIVA
(não combinável com as sessões) - a janela livre de sempre.

Implementação (`scripts/scanner.js`, o GATE real de produção):
`dentroJanelaPadrao()` foi fatiada numa função genérica
`dentroDeJanela(horarioInicio, horarioFim, janelaSeguranca, context)`
reutilizável, mantendo 100% da lógica de dia da semana/virada de
meia-noite que já existia (sábado nunca opera, domingo só a partir das
18h, atravessar meia-noite igual à janela asiática). Duas janelas
fixas novas, mesmos horários dos presets antigos: `SESSAO_LONDRES`
(04:00-13:00) e `SESSAO_NOVA_YORK` (10:00-19:00), com elegibilidade
por moeda (`MOEDAS_SESSAO_LONDRES = EUR/GBP/CHF`,
`MOEDAS_SESSAO_NOVA_YORK = USD/CAD`) no mesmo padrão que a Ásia já
usava (`MOEDAS_JANELA_ASIA`, AJUSTE-005). `parNaJanelaOperacional()`
reescrita com uma regra central: **par com lastro asiático
(JPY/AUD/NZD, exceto GBP/JPY) preserva a exclusividade Mon-Thu do
AJUSTE-005/006 nos dois modos** - a diferença é que, no modo
Personalizado (`configuracao.sessoesAtivas` vazio/ausente - é o que
TODO usuário existente tem hoje, campo novo), essa janela asiática
continua INCONDICIONAL, exatamente como sempre foi (nunca esteve
amarrada a nenhum preset da tela). Só no modo por sessões (usuário
marcou 1+ checkbox) é que passa a depender do checkbox "Ásia" estar
marcado - do contrário o checkbox seria decorativo, e dar controle
real era justamente o pedido. Este é o ponto mais delicado do ajuste:
a primeira versão implementada tinha um bug real de regressão aqui
(a janela asiática incondicional teria virado condicional também pra
quem nunca tocou no checkbox novo) - pego e corrigido ANTES de
qualquer commit, ao escrever os testes isolados abaixo.

GBP/JPY (única exceção explícita da Ásia) passa a ser elegível pra
Londres (tem GBP) - mudança de comportamento CONFIRMADA
explicitamente com o usuário via AskUserQuestion (antes só operava na
janela única configurada, sem filtro por sessão).

`main()` (rodava incondicionalmente ao fim do arquivo) ganhou um guard
`if (require.main === module)` - achado ao escrever os testes: sem
ele, `require("./scanner")` a partir de qualquer outro script (com
credenciais reais presentes) dispararia um ciclo de scanner de
verdade como efeito colateral silencioso de um import. Zero mudança
de comportamento em produção (`forex-scanner-real.yml` já chama
`node scripts/scanner.js` diretamente, onde `require.main === module`
é sempre verdadeiro).

`js/config.js`: `PRESETS_HORARIO` (radio) vira base de
`renderizarSessoesHorario()` (checkboxes `.cfgSessao` + checkbox
exclusivo `#cfgPersonalizado`, com `aplicarSessoesNaTela()` cuidando
da exclusividade mútua nos dois sentidos). Novo campo de config
`sessoesAtivas: []` substitui `presetHorario` (vazio = Personalizado,
não-vazio = modo por sessões) - persistido em
`configuracoes/geral.sessoesAtivas`. `calcularConsumoEstimadoTwelveData()`
ganhou um branch pro modo por sessões: soma consultas estimadas por
sessão ativa (ciclos da janela dela × pares elegíveis pra ela, por
moeda), mostrando um detalhamento por sessão no card de consumo; modo
Personalizado mantém a conta original inalterada (janela única +
bônus asiático incondicional).

Validado: `node -c` nos dois arquivos. Dois scripts isolados no
scratchpad, requerendo `scripts/scanner.js` DIRETO (não uma cópia) -
`scripts/firebase.js` stubado no cache do Node (sem
`serviceAccount.json` neste ambiente, ver CLAUDE.md) e o relógio
global mockado pra testes determinísticos de dia da semana/hora:
(1) `validate-ajuste019-sessoes.js`, 24 cenários - regressão explícita
do modo Personalizado (EUR/USD e USD/JPY se comportando IDÊNTICO ao
scanner antigo do AJUSTE-005/006, incluindo a janela asiática
incondicional e sua exclusividade Mon-Thu) mais o modo por sessões
novo (Londres sozinha, overlap Londres+NY, buraco Londres+Ásia sem NY
retornando `false` no horário do buraco, USD/JPY sem operar quando só
Londres+NY marcadas sem Ásia, GBP/JPY passando a operar em Londres,
EUR/JPY continuando de fora de Londres mesmo tendo EUR); (2)
`validate-ajuste019-paridade-config-scanner.js`, 60 cenários (3
sessões × 20 pares de `TODOS_PARES`) - confirma que a classificação
por moeda em `js/config.js` (usada só pro estimador) bate EXATAMENTE
com a classificação real usada pelo gate de produção em
`scripts/scanner.js`, pra nunca mostrar um número de consultas
enganoso na tela.

Pendente: `js/pairInsights.js` continua com a cópia antiga de janela
(BUG-011, já sinalizada como desatualizada desde o AJUSTE-013) - não
tocada aqui, decisão de deferir mantida (card que a usa,
"Sugestão de Agora", está desativado desde o AJUSTE-014). Modo por
sessões não trata o fim de semana/sexta-feira com o mesmo detalhe que
o modo Personalizado tinha pra pares com lastro asiático (ex.: no
Personalizado, USD/JPY fora da janela asiática cai na janela padrão
única às sextas; no modo por sessões, ele simplesmente fica de fora
até a Ásia abrir de novo) - tradeoff deliberado, documentado nos
comentários de `parNaJanelaOperacional()`, baixo risco (conta roda em
SIMULADA hoje) e não mencionado explicitamente pelo usuário no escopo
pedido.

AJUSTE-019b (mesmo dia, follow-up): campo `janelaOrigem` no sinal
salvo, mostrando QUAL janela admitiu o par ("asia"/"londres"/
"novaYork"/"personalizado")

Origem: usuário, olhando o Histórico, viu um sinal de USD/JPY às
03:55 com o modo Personalizado selecionado na Config (07:30-18:00) e
perguntou por quê, esperando que "agora o horário deve seguir a
seleção". Resposta: não é bug, é o comportamento incondicional da
janela asiática (AJUSTE-005/006) preservado de propósito no modo
Personalizado (ver nota acima) - mas não havia como o usuário
confirmar isso olhando só o sinal salvo, precisava confiar na
explicação. Pedido explícito do usuário: "devemos ter um lugar, no
sinal, pra marcar em qual modo o sinal foi gerado".

Implementação: `scripts/scanner.js` ganhou
`identificarOrigemJanela(par, context)`, espelhando
`parNaJanelaOperacional()` ramo a ramo mas devolvendo qual janela
admitiu (string) em vez de só true/false. Chamada em
`executarAnalisePar()` logo depois da checagem normal, resultado
passado como `janelaOrigem` pra `analisarPar()`
(`scripts/pairAnalyzer.js`), que persiste no objeto `analise`/
`operacao` salvo. `js/historico.js` ganhou `bannerJanelaOrigem()`,
mostrado no detalhe do sinal (mesmo estilo do banner de SMC/ajuste de
config) com um texto explicativo por origem - a Ásia deixa claro que
é incondicional, independente do modo selecionado.

Validado: `node -c` nos 3 arquivos. Script isolado no scratchpad
(`validate-ajuste019-origem-janela.js`), requerendo `scripts/scanner.js`
real - grade de 5.040 combinações (7 dias × 9 horários × 8
combinações de sessão × 10 pares), confirmando que
`identificarOrigemJanela()` devolve uma origem não-nula SE E SOMENTE
SE `parNaJanelaOperacional()` devolve `true`, sem nenhuma divergência.

Nota separada, achado ao investigar o print do usuário: os prints
mostravam a tela de Config com radio buttons e o rótulo antigo
"Mercado Asiático (21:00–23:59)" - isso só é possível vendo uma cópia
em cache de `js/config.js` de ANTES do AJUSTE-018 (que já trocou esse
rótulo hoje) e do AJUSTE-019 (que trocou radio por checkbox). Sinal de
cache desatualizado (Service Worker `sw.js` ou HTTP cache do
navegador) - não confirmado como causa raiz (sem acesso ao dispositivo
do usuário), comunicado a ele pra confirmar com um refresh forçado.
CONFIRMADO pelo usuário depois de atualizar: era isso mesmo - perfil
real é Agressivo, janela Ásia real já ia até às 04:00, checkbox
funcionando.

AJUSTE-019c (mesmo dia, 2º follow-up): perfil (Agressivo/Balanceado/
Conservador) exibido no detalhe do sinal

Origem: o usuário esclareceu o pedido do AJUSTE-019b - não era sobre
JANELA de horário, era sobre PERFIL OPERACIONAL: "quero saber se o
sinal foi gerado em modo agressivo, balanceado ou conservador".
Achado ao investigar: esse dado já existia! `perfil` é calculado e
persistido em todo sinal salvo desde o PENTE-FINO-001 (10/09/2026,
uppercase - AGRESSIVO/BALANCEADO/CONSERVADOR), só nunca tinha sido
exibido em lugar nenhum da tela - zero mudança de schema ou de
`scripts/pairAnalyzer.js` necessária, só exibição.

Implementação: `bannerJanelaOrigem()` (AJUSTE-019b) renomeado pra
`bannerOrigemSinal()` e ampliado - mostra as duas informações juntas
numa linha só ("Perfil: 🟢 Agressivo · Janela: 🌏 Ásia (...)"), mesmos
emojis já usados em `PERFIS_OPERACIONAIS` na tela de Config, pra
manter consistência visual. Cada metade aparece independente (sinais
antigos sem `janelaOrigem` ainda mostram o perfil; hipoteticamente o
inverso também, embora não exista sinal salvo sem `perfil`).

Validado: `node -c`; `grep` confirmando que a função antiga
(`bannerJanelaOrigem`) não ficou referenciada em lugar nenhum depois
do rename.
--------
AJUSTE-020 — corrige header sticky "travado" ao girar o celular na
tela de Histórico (js/historico.js)

Origem: usuário reportou precisar de refresh manual da página depois
de girar o celular no Histórico, achando que era sobre o modo
cartão/lista (que já tinha sido investigado e descartado - ver
conversa do mesmo dia). Print real mostrou o problema verdadeiro: o
`#historicoHeader` (título + botão "Ver como lista" + placar,
`position:sticky; top:0`) fica visualmente travado no lugar errado,
sobrepondo a lista de sinais, só destravando com o refresh manual -
bug conhecido de `position:sticky` em alguns navegadores Android
(Chrome/WebView), que não recalculam a posição sticky sozinhos depois
de uma mudança de viewport (rotação), só depois de algum reflow
forçado.

IMPORTANTE - não confundir com o mecanismo do AJUSTE-008/010 (troca
automática cartão↔tabela por orientação, removido de propósito porque
tabela/lista virou padrão permanente): aquele problema já não existe
mais, é outro completamente diferente, descoberto só depois de pedir
o print pro usuário pra não regredir uma decisão já tomada.

Implementação: `forcarReflowHeaderHistorico()` - truque padrão de CSS
(tira o elemento de `position:sticky`, lê `offsetHeight` forçando o
navegador a recalcular layout ali, devolve pra `sticky`). Disparado
por `aoRotacionarTelaHistorico()`, ligado no evento `orientationchange`
e, como fallback, no `screen.orientation.addEventListener("change", ...)`
pra navegadores que não disparam mais o evento legado. Debounce de
150ms (mesmo valor usado no AJUSTE-008 pro mesmo tipo de evento), só
age se `app.currentTab === "historico"`. NÃO dispara `carregarHistorico()`
nem nenhuma leitura no Firestore - é só um empurrão de CSS, custo zero
de quota.

Validado: `node -c`. NÃO validado em dispositivo real - este ambiente
não tem browser/emulador conectado (sem ferramenta de controle de
navegador disponível nesta sessão). Pendente, per CLAUDE.md: usuário
confirmar no celular real se o header para de travar depois de girar,
sem precisar de refresh manual.
--------
AJUSTE-021 — aba nova "Resultados" (placar/filtros/comparação),
Histórico vira só monitoramento (js/resultados.js NOVO, js/historico.js,
js/app.js, index.html)

Origem: usuário testando o perfil Conservador pediu mais agilidade no
Histórico pra acompanhar sinais recebidos ("Histórico ficaria só para
receber e verificar sinais"). Discussão de escopo em 3 rodadas antes
de implementar (per disciplina deste projeto de não tocar em UI de
análise sem confirmar o design primeiro): (1) proposta inicial do
usuário foi criar a aba só pra isolar a lentidão de uma consulta
pesada; (2) investigação mostrou que a lentidão real (Dashboard,
"Desempenho") vem de `contarPorResultado()` em js/desempenho.js
recalculando WIN/LOSS/total do zero a cada render (fallback de até
500 docs quando `.count()` falha) - sinalizado como a causa raiz de
verdade, ainda NÃO corrigida (fica pendente, não fazia parte deste
pedido); (3) usuário refinou o pedido: não é só isolar lentidão, é uma
separação de responsabilidade de propósito - Histórico = monitorar
sinais recebidos (rápido, day-windowed), Resultados = analisar
performance (placar, filtros por par/direção/perfil, comparação de
sinais, "lotes"), com o usuário ciente e aceitando que Resultados
carrega mais devagar por concentrar mais dado ali.

Implementação:

1. **js/historico.js** (trimmed): removida a feature de comparação de
   sinais inteira (`sinaisComparacaoSelecionados`, `atualizarBarraComparacao`,
   `alternarSelecaoComparacao`, `limparSelecaoComparacao`, `fecharComparacao`,
   `reavaliarDicaGirar`, `alternarExpandirComparacao`, `abrirComparacao`,
   containers `historicoComparacao`/`barraComparacao`, coluna "Cmp" da
   tabela) - moveu pra Resultados. Removido o card de estatísticas do
   topo (`winsMes`/`lossesMes`/`financeiroMes`) e os números de
   placar (✅/❌/🎯/💵) dos cabeçalhos de dia/mês - viram só navegação
   (label, sem número), placar de verdade agora só em Resultados.
   `cacheSinaisHistorico` continua aqui (usado pelo fechamento manual,
   que continua sendo ação do Histórico) - também é escrito por
   js/resultados.js, mesmo cache compartilhado entre as duas telas
   (chave = docId Firestore, sem risco de colisão). Duas funções
   extraídas pra reuso: `extrairDataObjSinal(sinal)` (parsing de
   timestamp/horario/data, antes só dentro de `carregarHistorico()`) e
   `construirLinhaTabela()` ganhou o parâmetro opcional `comCmp` (só
   Resultados passa `true`, pra reusar a MESMA linha de tabela com a
   coluna de comparação de volta, sem duplicar HTML/lógica em dois
   arquivos). `alternarOperacaoReal()` agora chama uma função nova,
   `atualizarTelaAposOperacaoReal()`, que atualiza a lista que
   realmente estiver na tela (Histórico OU Resultados - o checkbox
   "Operação Real" é o mesmo elemento reusado nas duas).

2. **js/resultados.js** (NOVO): aba de análise. Filtros: Período
   (Hoje/7 dias/30 dias/Tudo), Par (dropdown de `TODOS_PARES`,
   js/config.js), Direção (Compra/Venda) e Perfil (Agressivo/
   Balanceado/Conservador - direto relevante pro teste em andamento).
   Decisão deliberada de arquitetura: os filtros de par/direção/perfil
   são aplicados CLIENT-SIDE (depois de buscar o período pelo Firestore),
   não via `.where()` do Firestore - só o período usa
   `.where("timestamp", ...)` + `.orderBy("timestamp")` (campo único,
   mesmo padrão de sempre deste projeto, nunca precisa de índice
   composto). Combinar múltiplos `.where()` de igualdade com um range +
   orderBy exigiria um índice composto DIFERENTE pra cada combinação de
   filtro que o usuário escolhesse - complexidade e fragilidade
   desnecessárias. O custo aceito é ler mais documentos do que o
   estritamente necessário pra um filtro estreito (ex.: filtrar só
   EUR/USD ainda lê os outros pares do período inteiro) - exatamente o
   tradeoff que o usuário confirmou aceitar ("estou ciente que o
   carregamento vai ser um pouco mais demorado"). Teto de segurança
   `LIMITE_RESULTADOS = 2000` documentos por período (igual ao padrão
   `aproximado`/truncamento já usado em js/desempenho.js), com aviso
   na tela se for atingido.

   Reusa (sem duplicar) várias funções de js/historico.js:
   `formatarPrecoPar`, `construirLinhaTabela` (com `comCmp: true`),
   `construirDetalheSinal`, `miniCard`, `LEGENDA_PERFIL`,
   `extrairDataObjSinal`, `inicioDiaBrasiliaUTCms`, `mesChaveDe`/
   `mesLabelDe`, `cacheSinaisHistorico`, `obterSinaisAbertos`/
   `salvarSinalAberto`/`removerSinalAberto`, `alternarOperacaoReal` -
   possível porque `js/historico.js` carrega ANTES deste arquivo (ver
   `index.html`), tudo global (sem módulos ES, mesmo padrão do resto
   do app). Placar (✅/❌/🎯/💵) por período total, por mês e por dia,
   igual ao que existia no Histórico antes desta mudança - só que
   calculado sobre o conjunto JÁ FILTRADO, refletindo exatamente o que
   está sendo mostrado. Comparação de sinais migrada inteira (mesmos
   nomes de função, containers novos `resultadosComparacao`/
   `barraComparacaoResultados`).

   Interpretação registrada (não 100% explícita no pedido): "lotes"
   foi entendido como o campo LOTE já visível ao expandir o detalhe do
   sinal (miniCard existente, reusado via `construirDetalheSinal`) -
   não uma feature nova separada. Se o usuário quis dizer outra coisa
   (ex.: filtro por tamanho de lote, ou agrupamento por lote), fica
   como pendência a esclarecer.

3. **js/app.js**: nova aba no switch (`case "resultados"`), botão de
   navegação na ORDEM pedida pelo usuário (Dashboard, Histórico,
   Resultados, Config, Manual - Manual saiu do meio, foi pro fim), e o
   gatilho de carregamento (`setTimeout` chamando `carregarResultados()`)
   no mesmo padrão das outras abas.

4. **index.html**: `<script src="js/resultados.js">` adicionado depois
   de `js/config.js` (precisa de `TODOS_PARES`) e antes de `js/app.js`
   (que referencia `resultadosView`/`carregarResultados`).

Achado registrado, NÃO corrigido nesta mudança (fora de escopo,
guardado pra decisão futura): a lentidão real do Dashboard vem de
`contarPorResultado()` (js/desempenho.js) recalculando WIN/LOSS/total
do zero a cada render - o fallback de `.limit(500)` quando `.count()`
falha é o "mais de 500" que o usuário citou. Correção ideal seria um
contador incremental (`winsTotal`/`lossesTotal` como campos em
`configuracoes/geral`, atualizados a cada fechamento) em vez de
recalcular sempre - conversa registrada, usuário priorizou a aba
Resultados primeiro.

Validado: `node -c` nos 5 arquivos tocados (js/historico.js,
js/resultados.js, js/app.js, js/config.js, js/desempenho.js - os dois
últimos só re-checados, não alterados nesta mudança). `grep` completo
por referências pendentes aos elementos/funções removidos do Histórico
(`historicoComparacao`, `barraComparacao` sozinho, `sinaisComparacaoSelecionados`,
`abrirComparacao`, `chk-comparar`, `historicoStats`) - zero ocorrências
fora de comentários. Conferência manual de todo par
id/getElementById entre `resultadosView()` e as funções que os
consomem (`resultadosLista`, `resultadosStats`, `resultadosComparacao`,
`barraComparacaoResultados`, `barraComparacaoResultadosTexto`).

Pendente, per CLAUDE.md (sem browser real neste ambiente): validação
end-to-end na tela de verdade - a aba nunca foi aberta num navegador
real a partir daqui. Também pendente: corrigir a causa raiz da
lentidão do Dashboard (contador incremental, ver acima); esclarecer
com o usuário o que "lotes" deveria significar, caso a interpretação
registrada acima não seja a pretendida.
--------
AJUSTE-022 — Dashboard: contador incremental de WIN/LOSS em vez de
escanear/contar `historico` a cada render (js/checker.js, js/historico.js,
js/desempenho.js, ferramentas/backfill-contadores-resultado.js NOVO)

Origem: causa raiz da lentidão do Dashboard, identificada durante a
investigação do AJUSTE-021 (usuário citou "mais de 500 pares" -
exatamente `LIMITE_CONTAGEM_FALLBACK` em js/desempenho.js). Usuário
confirmou explicitamente querer a correção depois de ver a explicação.

Implementação: `configuracoes/geral` ganha dois campos novos,
`winsTotal`/`lossesTotal`, mantidos INCREMENTALMENTE (nunca
recalculados do zero) nos dois únicos lugares que fecham uma operação
com resultado:
1. `js/checker.js` (fechamento automático, transação já existente) -
   `admin.firestore.FieldValue.increment(1)` no campo certo (WIN ou
   LOSS), na MESMA transação que já grava `status:"ENCERRADA"` -
   atômico, nunca dessincroniza do resultado real.
2. `js/historico.js` `confirmarFechamentoManual()` (fechamento
   manual) - mesma ideia, `firebase.firestore.FieldValue.increment(1)`
   (SDK cliente, mesma API). Essa função também passou a chamar
   `atualizarTelaAposOperacaoReal()` (já existente desde o AJUSTE-021)
   em vez de `carregarHistorico()` direto, pra continuar funcionando
   certo se disparada a partir da aba Resultados.

`js/desempenho.js` `obterResumoGeral()` reescrita: se
`config.winsTotal`/`lossesTotal` existem (números), usa direto - ZERO
consulta extra além do `configSnap` que a função já buscava de
qualquer forma (antes: até 2 buscas de até 500 documentos cada, a
CADA render do Dashboard). Se não existem ainda (config antigo, ou
backfill não rodado), cai no método antigo (`contarPorResultado()`,
inalterado) - nunca mostra um número errado, só mais lento até o
backfill rodar.

`ferramentas/backfill-contadores-resultado.js` (NOVO, mesmo padrão de
`ativar-smc.js`/`analise-rr-simulacao.js` - `workflow_dispatch` via
`.github/workflows/backfill-contadores-resultado.yml`, Firebase Admin
com o secret): conta o WIN/LOSS real já acumulado em `historico` via
`.count()` (agregação nativa, suportada no SDK Admin) e grava como
ponto de partida dos contadores - sem isso, winsTotal/lossesTotal
começariam do zero, contradizendo o histórico real. Ação única;
disparada nesta sessão via `mcp__github__actions_run_trigger` (sem
acesso direto ao Firestore daqui, ver CLAUDE.md).

Validado: `node -c` nos 4 arquivos tocados. Lógica de fallback
conferida por leitura (não há como rodar contra o Firestore real
nesta sessão) - `temContadorIncremental` checa `typeof === "number"`
nos dois campos, não só truthy (0 é um total real válido, não pode
cair no fallback por engano).

Pendente: confirmar no GitHub Actions que o backfill rodou com
sucesso (ver log do workflow disparado) e que o Dashboard carrega
visivelmente mais rápido depois - sem browser real neste ambiente,
não dá pra confirmar a percepção de velocidade a partir daqui.
--------
AJUSTE-023 — corrige penalidade histórica "SEM_BASE" morta no
scoreEngine.js (achado ao pesquisar pra escrever o Manual)

Origem: usuário pediu um Manual completo, explicando de verdade como
o RMI decide - pra escrever isso com precisão (não confiar em memória,
conferir contra o código, per CLAUDE.md), reli scripts/scoreEngine.js,
scripts/historyAnalyzer.js e scripts/statisticsEngine.js a fundo.
Achado: `aplicarPenalidadeHistorico()` (scoreEngine.js) testa
`historico.status === "SEM_BASE"` pra aplicar -5 no score, mas
`historyAnalyzer.js`'s `analisarHistorico()` (quem realmente produz
esse `historico.status`, consumido por scoreEngine.js) NUNCA retorna
essa string - o estado real "sem estatística nenhuma pro par" se
chama `"SEM_DADOS"` (só no `if (!estatisticas)` early-return da
função). Confirmado com `grep` que `"SEM_BASE"` não existe em nenhum
lugar de `historyAnalyzer.js`. Essa penalidade nunca disparou desde
que foi escrita.

Corrigido: a comparação passa a checar `"SEM_DADOS"` (o nome real).
Impacto: baixo (±5 pontos num score 0-100, só no caso raro de análise
sem NENHUMA estatística histórica do par ainda) mas real - sinais
gerados sem histórico nenhum passam a receber a penalidade que sempre
deveria ter existido, tornando o score ligeiramente mais conservador
nesse cenário específico.

Validado: `node -c`; teste isolado direto (`require` real do módulo,
sem mock) confirmando que `{status:"SEM_DADOS"}` agora aplica -5,
`{status:"SEM_BASE"}` (nome antigo) não aplica nada (0, esperado - não
existe mais no mundo real), e `{status:"RUIM"}` continua aplicando -10
(não regressivo).
--------
AJUSTE-024 — Manual reescrito como Base de Conhecimento completa
(js/manual.js)

Origem: usuário pediu um Manual "bem completo, o usuário não precisa
ir na internet, temos aqui e são termos que a gente usa também" -
seguindo o escopo do DT-025 (`DOCUMENTACAO/BACKLOG-E-VISAO.md` seção
2.2), priorizando primeiro os dois itens que o próprio documento
aponta como os únicos que "ninguém além deste projeto pode escrever":
o que o score/perfil significa, e como ler um sinal salvo.

Processo: antes de escrever qualquer explicação de como o RMI decide,
reli `scripts/marketAnalyzer.js`, `scoreEngine.js`, `decisionEngine.js`,
`moneyManager.js`, `historyAnalyzer.js`, `statisticsEngine.js`,
`riskManager.js` e `js/checker.js` inteiros (parte via subagente
Explore, parte lido diretamente e conferido - per CLAUDE.md, nunca
documentar de memória) - esse processo encontrou e corrigiu o
AJUSTE-023 (penalidade histórica morta). Todo número/limiar/regra do
Manual (pesos de EMA/RSI/ADX, faixas de qualidade, score mínimo por
perfil, risco por operação/diário, perdas consecutivas, RR mínimo,
fórmula de expectativa, motivos de encerramento, sessões de horário)
foi tirado direto do código real nesta data, não de memória da
conversa nem do documento DT-025 original (que é mais antigo).

Estrutura (7 seções, `js/manual.js` dividido em uma função por
seção): (1) Como o RMI decide um sinal - pipeline completo, as 5 EMAs
e a tabela de tendência, RSI/ADX com pontuação, composição do score,
faixas de qualidade, SMC/Order Blocks (com a limitação conhecida de
zonaLow/zonaHigh não persistidos, registrada explicitamente),
multi-timeframe, tabela comparativa dos 3 perfis, veto de RSI extremo,
cooldown e circuit breaker diário, janelas de sessão; (2) Como ler um
sinal salvo - cada campo do Histórico/Resultados explicado, incluindo
a tabela de `motivoEncerramento` (TP_FINANCEIRO/SL_FINANCEIRO/
TP_PIPS/SL_PIPS/MANUAL_CORRETORA) e o desempate pessimista quando TP e
SL batem no mesmo ciclo; (3) Gestão de risco e dinheiro - lote, RR,
fórmula de expectativa com exemplo numérico, pip/pipette; (4)
Glossário de indicadores (EMA/RSI/ADX/ATR/RR/Spread); (5) Estrutura de
mercado (sessões, pares/cruzados, candlestick, S/R, pullback/breakout);
(6) Psicologia do trader (curta, ligada a comportamentos reais que o
app já reforça - circuit breaker, avisos vs. bloqueios, Conservador
gerando poucos sinais de propósito); (7) Notificações (conteúdo
original preservado, sem mudança).

Validado: `node -c`. Conferência manual de contas (ex.: exemplo de
expectativa 60%/TP$5/SL$5 = +$1,00, recalculado à mão contra a
fórmula real). Uma imprecisão encontrada e corrigida antes de
publicar: a explicação inicial do multiplicador de confiança dizia
"menos de 50 operações reduz o peso", mas o limiar real pra peso cheio
(confidenceMultiplier=1.0) é ~40 operações (confiabilidade =
min(100, round(operacoes/50*100)) ≥80 - matematicamente equivale a
operacoes≥40, não 50) - corrigido antes do commit.

Pendente, per CLAUDE.md: doc vivo, não definitivo - precisa ser
reconferido contra o código se o pipeline (marketAnalyzer/scoreEngine/
decisionEngine/moneyManager) mudar de novo, mesma disciplina do
ENGINEERING.md. Sem browser real neste ambiente, não foi possível
verificar visualmente o resultado renderizado (tabelas HTML, quebras
de linha) - conferido só por leitura do HTML gerado.
--------
AJUSTE-024b (mesmo dia, follow-up) - padrões de candlestick no Manual
(js/manual.js)

Origem: usuário notou a falta real (a seção "Candlestick" do AJUSTE-024
só explicava a anatomia de UM candle, não os padrões de múltiplos
candles) e pediu os "18 principais" com uma referência específica (URL
da XP Investimentos). Tentativa de `WebFetch` naquela URL bloqueada
pelo proxy de rede deste ambiente (`conteudos.xpi.com.br` fora da
lista liberada) - comunicado ao usuário. Escrito, em vez disso, o
conjunto clássico de padrões de candlestick (conhecimento consolidado
de análise técnica, não exclusivo de nenhuma fonte) - 19 padrões ao
todo (8 de reversão de alta, 8 de reversão de baixa, 3 de
indecisão/continuação, com variantes do Doji mencionadas à parte).

Implementação: 3 tabelas novas dentro de `secaoEstruturaMercado()`
(reversão de alta / reversão de baixa / indecisão-continuação), cada
padrão com nome em português e inglês e a descrição de como reconhecer
visualmente. Nota explícita adicionada: isso é conhecimento geral de
mercado, não algo que o RMI detecta ou usa na decisão automática hoje
(o app usa EMA/RSI/ADX/ATR + SMC) - pra não sugerir, por engano, que o
scanner reconhece esses padrões.

Validado: `node -c`. Conteúdo é educacional/estável (definições
clássicas de candlestick não mudam com o pipeline do app) - risco de
ficar desatualizado é baixo, diferente das outras seções do Manual que
dependem do código real.
--------
AJUSTE-024c (mesmo dia, 2º follow-up) - padrões de candlestick
substituídos pela lista exata da XP (18 itens, na ordem da fonte)

Origem: `WebFetch` na URL da XP tinha sido bloqueado pelo proxy
(AJUSTE-024b). Usuário colou o conteúdo completo do artigo direto na
conversa. A lista genérica de 19 padrões escrita antes (própria,
sem fonte específica) foi SUBSTITUÍDA pela lista exata da XP - 18
padrões, mesma numeração/ordem/agrupamento do artigo (6 de reversão de
alta, 7 de reversão de baixa, 5 de indecisão - incluindo padrões que a
lista genérica anterior não tinha: Harami de Fundo/Topo como versão de
3 candles - diferente do Harami clássico de 2 candles -, Chute/Kicker,
Dia Longo, Dia Curto).

Conteúdo reescrito com PALAVRAS PRÓPRIAS (não copiado verbatim do
artigo da XP - direito autoral de terceiro), preservando os fatos
técnicos corretos (formato do corpo/sombra, sinal de alta/baixa/
indecisão) e a estrutura em tabela já usada no resto do Manual. Uma
inconsistência encontrada na fonte original foi corrigida silenciosamente
sem repassar: o texto da XP sobre "Nuvem Negra" tem um erro aparente
(cabeçalho diz "reversão de baixa", corpo do texto diz "tendência de
reversão de alta") - escrito aqui de forma consistente com a
definição correta e universal do padrão (Dark Cloud Cover é
definitivamente um padrão de reversão de BAIXA).

Também adicionado (presente na fonte, ausente na versão anterior):
seção "Como analisar candlestick na prática" (3 passos) e "Dicionário
rápido" (Candle Gatilho, Rompimento de Candle, Candles de reversão).

Validado: `node -c`.
--------
AJUSTE-025 — detecção de padrões de candlestick (Fase 1) entra no
pipeline real, como camada secundária de score (scripts/candlePatterns.js
NOVO, scoreEngine.js, marketAnalyzer.js, pairAnalyzer.js, js/historico.js,
js/manual.js)

Origem: depois de escrever os 18 padrões de candlestick no Manual
(AJUSTE-024b/c), usuário perguntou se o RMI lê candles do mesmo jeito
que esses padrões clássicos - resposta (conferida no código real):
não, o RMI usa EMA/RSI/ADX/ATR (tudo baseado em fechamento, sem olhar
forma de corpo/sombra) + SMC (que olha direção do candle e
deslocamento, não formato). Usuário decidiu que queria implementar
detecção de candlestick de verdade, "uma forma a mais de pegar um
sinal mais consistente". Escopo definido via AskUserQuestion (3
perguntas) antes de escrever qualquer código de produção, mesma
disciplina já usada pro SMC (MUD-05) e pro redesenho de sessões
(AJUSTE-019):
1. Fase 1 = só os 6 padrões de 1-2 candles (Martelo, Enforcado,
   Martelo Invertido, Estrela Cadente, Engolfo de Alta, Engolfo de
   Baixa) - os de 3 candles (Harami, Três Corvos, Estrela Manhã/
   Tarde) e os de gap (Chute/Kicker) ficam pra uma Fase 2, registrada
   como pendência, não implementada agora.
2. Peso ±5 no score (maior que o ±3 do SMC, por pedido explícito -
   "quero isso como reforço de consistência").
3. Sempre ativo, sem checkbox na tela de Config (diferente do SMC,
   que nasceu com opt-in).

Implementação: **scripts/candlePatterns.js** (NOVO) - módulo puro
(sem I/O, sem Firestore), mesmo padrão arquitetural de scoreEngine.js/
decisionEngine.js. `detectarPadraoCandlestick(candles, atr)` roda os 6
detectores sobre o candle mais recente (e o anterior, no caso do
Engolfo) e devolve `{padrao, direcao} | null`. Geometria calibrada
pelo ATR do par (`CANDLE_PATTERNS`: corpo pequeno ≤30% do ATR, sombra
longa ≥2x o corpo E ≥40% do ATR, sombra curta ≤15% do ATR, corpo
mínimo de engolfo ≥20% do ATR) - valores iniciais, sem validação
empírica própria ainda, mesma ressalva de sempre nesta base de código
(RSI_VETO em decisionEngine.js, SMC_ORDER_BLOCK em scoreEngine.js).
Martelo/Enforcado e Martelo Invertido/Estrela Cadente são a MESMA
forma geométrica cada par - `tendenciaRecente()` (compara o fechamento
de 5 candles atrás com o fechamento do candle imediatamente anterior
ao candidato) decide qual rótulo/direção aplicar, dependendo de o
candle vir de uma queda ou de uma alta recente. Engolfo de Alta/Baixa
não precisa desse contexto - a cor e a relação geométrica dos 2
candles já definem sozinhas qual dos dois é.

**scoreEngine.js**: `CANDLESTICK_PATTERN: 5` em `ENGINE_WEIGHTS`,
`aplicarBonusCandlestick(candlestick, tendencia)` - MESMO contrato do
`aplicarBonusSMC` (concorda com a tendência do sinal → soma, discorda
→ subtrai, sem padrão detectado → 0, tendência sem direção clara →
0).

**marketAnalyzer.js**: `calcularQualidade()` ganha um 14º parâmetro
opcional `candlestick = null` (mesmo padrão do `smc` - AJUSTE
preserva as 13 chamadas anteriores intactas). Nota registrada no
código: RMI-011 (crescimento excessivo desta função, já documentado
em PENDENCIAS-ESTRATEGICAS-RMI.md/BACKLOG-E-VISAO.md) piora mais um
pouco com isso - não resolvido aqui de propósito, mudar a assinatura
de uma função tão usada é risco desnecessário fora do escopo pedido.
Retorna `candlestickDetectado`/`candlestickScore` no mesmo shape do
`smcDetectado`/`smcScore`.

**pairAnalyzer.js**: `candlesNumericos` (remap pra number) extraído
pra fora do `if` do SMC, já que agora dois detectores independentes
precisam dele (SMC continua condicional à flag `smcAtivo`;
candlestick sempre roda, por decisão do usuário). `detectarPadraoCandlestick`
requerido direto de `candlePatterns.js` (módulo puro, mesmo padrão de
moneyManager/decisionEngine - diferente de getCandles/existeCooldown/
salvarOperacao, que são injetados por serem I/O real). Log novo
(`Candlestick......`) espelhando o log já existente do SMC.
`candlestickDetectado`/`candlestickScore` persistidos no objeto
`analise` salvo no Firestore, mesmo padrão do AJUSTE-007 pro SMC.

**js/historico.js**: `bannerCandlestick()` (com `LEGENDA_CANDLESTICK`
pros 6 nomes) - mesmo estilo visual do `bannerSMC()`, mostrado no
detalhe do sinal (Histórico e Resultados, que reusa
`construirDetalheSinal`).

**js/manual.js**: nova seção "Padrão de Candlestick (Fase 1)" dentro
de "Como o RMI decide", explicando a mesma coisa que este texto
explica. A ressalva da seção "Os 18 principais padrões de
candlestick" (que antes dizia "nenhum é usado pelo RMI") foi
corrigida - 6 dos 18 agora são detectados de verdade, marcados com 🕯️
nas tabelas; os outros 12 continuam só conhecimento geral (Fase 2,
pendência).

Validado: `node -c` nos 5 arquivos tocados. Script isolado no
scratchpad (`validate-ajuste025-candlestick.js`), requerendo os 3
módulos reais direto (candlePatterns.js, scoreEngine.js,
marketAnalyzer.js - nenhum toca Firestore/rede) - 21 cenários:
detecção geométrica de cada um dos 6 padrões (incluindo os casos
Martelo-vs-Enforcado e Martelo Invertido-vs-Estrela Cadente com a
MESMA forma geométrica, só mudando o contexto de tendência anterior),
rejeição de formas inválidas (sombra fora do limiar, engolfo trivial),
candles insuficientes/ATR inválido não derrubam a detecção,
`aplicarBonusCandlestick` nos 4 casos (concorda/discorda/nenhum
padrão/tendência sem direção), e REGRESSÃO explícita confirmando que
`calcularQualidade()` com candlestick ausente ou `null` devolve
EXATAMENTE o mesmo `scoreFinal` de antes desta mudança (mesmo padrão
de regressão já usado pro SMC no AJUSTE-007).

Pendente: Fase 2 (Harami, Três Corvos, Estrela da Manhã/Tarde, Chute/
Kicker - padrões de 3 candles ou com gap, mais complexos de detectar
com segurança) - registrada, não iniciada. Confirmação por contexto
de suporte/resistência (o próprio Manual explica que um padrão vale
mais nesse contexto) não implementada - o app não tem detecção de
suporte/resistência ainda, mesmo nível de simplificação aceito pro
SMC. Validação end-to-end contra um sinal real gerado em produção
ainda não aconteceu (só validação isolada com candles sintéticos) -
primeiros ciclos reais devem ser conferidos manualmente antes de
confiar cegamente na detecção, per CLAUDE.md.
--------
AJUSTE-026 (mesmo dia, follow-up) - desenho de cada candle no Manual,
antes da definição (js/manual.js)

Origem: ao pedir a implementação de detecção de candlestick
(AJUSTE-025), usuário também pediu que o Manual mostrasse "o desenho
exato do candle antes da sua definição" pra cada um dos 18 padrões
(não só o texto). Uma primeira tentativa de desenhar isso à mão,
direto em SVG dentro do código, foi interrompida pelo usuário: "seria
melhor um desenho externo, seus desenhos manuais ficam muito feios".
Em vez de insistir cegamente, a resposta foi: (a) explicar por que uma
imagem hospedada de verdade na internet conflitaria com o
funcionamento offline/self-contained do app e teria o mesmo risco de
direito autoral que copiar texto de terceiros, e (b) montar um preview
separado (fora do código de produção) usando o tema visual exato do
app (cores, fundo escuro) pra o usuário aprovar ANTES de qualquer
coisa entrar no `js/manual.js` real. Preview publicado como Artifact
(https://claude.ai/artifact/NsutMNsCmaDHheyAuTJXG7) e enviado ao
usuário via arquivo - aprovado ("Pode seguir com as imagens tbm") sem
pedido de mudança.

Implementação: **js/manual.js** ganhou `velaSVG(x, largura, spec)`
(desenha um corpo+pavio em coordenadas 0-100), `candleIconSVG(specs)`
(agrupa 1-3 velas lado a lado, pra padrões multi-candle), e
`DESENHO_CANDLE` - objeto com as coordenadas dos 18 padrões, as
MESMAS já aprovadas no preview (nenhuma escolha de design nova feita
na hora da integração). `desenho(chave)` é o helper chamado direto
dentro das 3 tabelas de padrões (Reversão de Alta/Baixa, Indecisão),
numa nova coluna "Desenho" à esquerda da coluna "#" - o desenho
aparece ANTES do nome/definição do padrão em cada linha, exatamente
como pedido. Verificação automática (scratchpad): as 18 chaves usadas
via `desenho("...")` nas tabelas batem 1-para-1 com as 18 chaves
declaradas em `DESENHO_CANDLE` (sem chave usada e não declarada, sem
chave declarada e não usada).

Além da grade de 18 padrões, a seção "Candlestick (velas) - anatomia"
(que antes só tinha texto) ganhou `anatomiaCandleSVG()` - um candle de
alta único, anotado com linhas de chamada pra Máxima, Sombra superior,
Corpo, Sombra inferior, Mínima, Fechamento e Abertura - mesmo painel
de anatomia mostrado e aprovado no preview, inserido antes do parágrafo
explicativo (mesmo princípio de "desenho antes da definição").

Validado: `node -c js/manual.js` depois de cada edição (bloco de
funções novo, e depois cada uma das 3 tabelas reescritas). Script
node isolado no scratchpad conferindo que as chaves usadas em
`desenho("...")` e as chaves declaradas em `DESENHO_CANDLE` são
exatamente o mesmo conjunto de 18. Não validado (e não dá pra validar
neste ambiente): renderização visual real no navegador - o preview
aprovado usa exatamente as mesmas coordenadas SVG portadas aqui, mas
o usuário ainda precisa abrir a aba Manual de verdade pra confirmar
que ficou como esperado num navegador real (sem emulador disponível
neste ambiente, mesma limitação de sempre).

Pendente: nenhuma mudança de escopo pendente aqui - isso fecha o
pedido original do AJUSTE-024/025 sobre desenhos no Manual. Fase 2 da
detecção de candlestick (Harami, Três Corvos, Estrela Manhã/Tarde,
Chute/Kicker) continua registrada como pendência no AJUSTE-025, não
nesta entrada.
--------
AJUSTE-027 (26/09/2026) - log do score numérico também no caminho de
reprovação (scripts/pairAnalyzer.js)

Origem: usuário testando o perfil CONSERVADOR (scoreMinimo 55) desde
24/09, relatou zero sinal gerado "antes de ontem e ontem até as 18h,
antes do mercado fechar". Auditoria em logs reais do GitHub Actions
(forex-scanner-real.yml, per CLAUDE.md - nunca confiar em workflow
verde sozinho) confirmou: `Erros..............0` em toda execução
conferida (24/09 18:05 UTC e 25/09 16:55/20:00/21:15 UTC), e toda
reprovação com o MESMO motivo - "Score abaixo do mínimo (55, perfil
CONSERVADOR)" - nunca histórico insuficiente, nunca multi-timeframe
divergente. Não é erro silencioso.

Hipótese inicial errada, corrigida em público: primeiro suspeitei do
AJUSTE-023 (penalidade -5 por SEM_DADOS, que passou a disparar de
verdade um dia antes) como causa. Descartada ao conferir o log de
24/09 18:05 UTC - já mostrava perfil CONSERVADOR reprovando por score
ANTES do AJUSTE-023 sequer existir (commitado só às 04:04 UTC de
25/09). Causa estrutural real, achada em statisticsEngine.js:
`RIGOR_PERFIL` (AGRESSIVO=1, BALANCEADO=2, CONSERVADOR=3) +
`operacaoAtendeRigorDoPerfil()` filtram o histórico usado pra
wins/loss/confiabilidade pelo rigor do perfil - nenhuma operação
gerada sob Agressivo/Balanceado conta pro Conservador (rigor 3, o
mais alto). Por isso todo par aparecia com `Histórico...........0W/0L`
/ `Confiabilidade......SEM_DADOS` assim que o perfil mudou pra
Conservador, mesmo com histórico real de dezenas de operações sob
outros perfis - "cold start" por design (hierarquia de rigor), não
bug, empilhado sobre a barra técnica já mais alta (55 contra 35 do
Agressivo) + exigência de multi-timeframe.

Lacuna real encontrada no código: `pairAnalyzer.js`'s bloco
`if (!decisao.aprovado)` (o caminho de toda reprovação) só logava
`decisao.status`/`decisao.motivo` - o valor de `qualidade.score`
nunca era impresso nesse caminho, e um sinal reprovado não é salvo no
Firestore (só operações aprovadas passam por `salvarOperacao`). Ou
seja, não havia como saber, nem pelo log nem pelo banco, se as
reprovações estavam na margem (ex.: 52 contra 55) ou longe (ex.: 20).

Implementação: duas linhas novas dentro do bloco de reprovação,
`console.log` de `qualidade.score` e `qualidade.qualidade`, antes das
linhas de Status/Motivo que já existiam. Puramente aditivo - não toca
em nenhum cálculo, não muda `decisao` nem o que é salvo. Validado com
`node -c` e um `require()` isolado do módulo confirmando que carrega
sem efeito colateral (não dispara nenhuma chamada de rede/Firestore
só por ser importado).

Pendente: com essa linha em produção, os próximos ciclos do scanner
vão finalmente mostrar o score numérico das reprovações - só aí dá
pra saber se o Conservador está feito certo ou perto disso, ou se está
estruturalmente inatingível pra este par/mercado no momento. Nenhuma
mudança de comportamento sugerida ainda - decisão fica pra depois de
ver os números reais.
--------
AJUSTE-028 (26/09/2026) - cascata de aprovação CONSERVADOR →
BALANCEADO → AGRESSIVO, contorno temporário do "ovo e galinha"
(scripts/pairAnalyzer.js, js/historico.js)

Origem: discussão estratégica (mesma sessão do AJUSTE-027) sobre
próximos passos da RMI. Usuário confirmou que o "ovo e galinha" do
CONSERVADOR (PENDENCIAS-ESTRATEGICAS-RMI.md, seção 6 - o gate de 30
operações do próprio perfil nunca se auto-alimenta, porque
`RIGOR_PERFIL` em statisticsEngine.js só conta operação já aprovada
NO CONSERVADOR) precisa de decisão própria, mas não quis ficar com o
app "completamente parado" até essa decisão acontecer. Proposta:
manter CONSERVADOR configurado, mas se um sinal não bater o critério
dele, tentar BALANCEADO e depois AGRESSIVO automaticamente, avisando
claramente no sinal qual critério realmente aprovou - o usuário decide
se opera com base nessa informação. Três decisões de escopo fechadas
via AskUserQuestion antes de codar:
1. Escopo só quando o perfil CONFIGURADO é CONSERVADOR (não genérico
   pra qualquer perfil) - resposta do usuário elaborou a mecânica
   (tenta Conservador, cai pra Balanceado, cai pra Agressivo) mas
   confirmou o mesmo escopo estreito perguntado.
2. Risco financeiro (lote/TP/SL/validação) usa as regras do NÍVEL QUE
   REALMENTE APROVOU, não sempre as do Conservador.
3. Sempre automático quando Conservador é o perfil configurado - sem
   checkbox novo em Config.

Importante, comunicado ao usuário antes de implementar: isso NÃO
resolve o "ovo e galinha" - uma operação aprovada em BALANCEADO
continua não contando como evidência do CONSERVADOR (`RIGOR_PERFIL`
exige rigor igual ou maior, e está certo assim - não seria honesto
contar evidência mais fraca como prova do nível mais exigente). É um
problema complementar ("não ficar parado enquanto a decisão de
verdade não é tomada"), registrado separado da pendência real (que
continua aberta, ver PENDENCIAS-ESTRATEGICAS-RMI.md).

Implementação: **scripts/pairAnalyzer.js** - o bloco que antes fazia
UMA chamada de `analisarFinanceiro()` + `avaliarOperacao()` virou um
loop sobre `perfisParaTentar` (`["CONSERVADOR","BALANCEADO","AGRESSIVO"]`
quando o perfil configurado é CONSERVADOR, senão só `[perfil]` -
comportamento idêntico ao de antes pros outros dois perfis, confirmado
por teste). Cada iteração recalcula financeiro E decisão com aquele
perfil - primeira que aprovar (`decisao.aprovado`) vence o loop. Log
novo por tentativa reprovada (`Cascata...........X reprovado (motivo)`)
e um log de sucesso quando o nível que aprovou é diferente do
configurado. `analise.perfil` (persistido) passa a ser o nível que
REALMENTE aprovou (`perfilResolvido`) - correto pro `RIGOR_PERFIL`
funcionar (uma operação Balanceado deve contar como evidência
Balanceado, nunca Conservador). Dois campos novos persistidos:
`perfilConfigurado` (o que estava selecionado em Config no momento) e
`rebaixadoDaCascata` (boolean).

**js/historico.js** - `bannerCascata(sinal)`, mesmo padrão visual dos
outros banners (SMC/Candlestick/Origem), mas com cor de aviso
(laranja, não verde/neutro) por ser informação de confiança, não só
detalhe técnico: só aparece quando `sinal.rebaixadoDaCascata` é
`true`, mostra o perfil configurado E o que realmente aprovou, com o
texto pedido pelo usuário ("avaliar sua própria confiança antes de
operar"). Chamado em `construirDetalheSinal()` antes de
`bannerOrigemSinal()` (que já lê `sinal.perfil` pro emoji do perfil -
como esse campo agora reflete o nível resolvido, já mostra o rótulo
certo sem mudança nenhuma ali). `js/resultados.js` reusa
`construirDetalheSinal()`, herda o banner automaticamente.

Simplificação assumida, registrada e não escondida: `estatisticas`
(taxaAcerto/operacoesElegiveis, usada tanto no score quanto na
expectativa financeira) é calculada UMA VEZ upstream em scanner.js,
filtrada pelo rigor do perfil CONFIGURADO (Conservador). Ao tentar
BALANCEADO/AGRESSIVO dentro da cascata, a expectativa financeira desses
níveis usa essa MESMA taxaAcerto (a visão do Conservador - hoje
0%/SEM_DADOS pra todo par, ver AJUSTE-027), não a própria história de
cada nível. Recalcular por nível exigiria nova consulta ao Firestore
dentro de `pairAnalyzer.js` (`obterEstatisticasPar` é assíncrono, hoje
só chamado em `scanner.js`) - fora de escopo deste contorno temporário.

Validado: `node -c` nos dois arquivos tocados; `require()` isolado de
`pairAnalyzer.js` confirmando zero efeito colateral. Script isolado no
scratchpad (`validate-ajuste028-cascata.js`), chamando
`decisionEngine.js`/`moneyManager.js` reais direto (sem mock) - 10
cenários: aprovação direta no Conservador com histórico suficiente;
mesmo score alto SEM histórico cascateando pro Balanceado (confirma
que a cascata contorna tanto o gate de score quanto o de histórico);
cascata em score decrescente (Balanceado, depois Agressivo);
reprovação em todos os níveis; os dois perfis fora do escopo
(Balanceado/Agressivo) NUNCA cascateiam; o financeiro do sinal
rebaixado usa de fato as regras do nível que aprovou (rrMinimo 1.0 do
Balanceado, não o 1.2 do Conservador, com RR=1 - `recomendacao.operar`
muda de `false` pra `true` entre os dois); veto de RSI extremo (regra
igual pros três perfis) barra em TODOS os níveis mesmo com score alto,
cascata não "escapa" dele; multi-timeframe divergente reprova em
Conservador/Balanceado mas aprova em Agressivo (único que não exige
confirmação multi-timeframe) - todos os 10 passaram.

Pendente: a decisão de verdade sobre o "ovo e galinha" (perfil interno
"APRENDIZADO" ou equivalente, PENDENCIAS-ESTRATEGICAS-RMI.md seção 6)
continua em aberto - este ajuste é um contorno, não a solução.
Validação end-to-end contra ciclo real de produção ainda não
aconteceu (mercado fechado no momento da implementação - AJUSTE-027).
A simplificação da taxaAcerto/expectativa (acima) deve ser revisitada
se/quando a decisão do item 6 for tomada, já que a solução definitiva
provavelmente muda a forma como o histórico por perfil é consultado.
--------
AJUSTE-029 (26/09/2026) - diagnóstico retroativo (só leitura) pra
decidir a solução real do "ovo e galinha" do CONSERVADOR
(ferramentas/diagnostico-retroativo-conservador.js NOVO,
.github/workflows/diagnostico-retroativo-conservador.yml NOVO)

Origem: depois do AJUSTE-028 (cascata, contorno temporário), usuário
pediu planejamento completo das pendências estratégicas com ordem de
prioridade e perguntou se algum item dependia do "ovo e galinha" (item
6 de PENDENCIAS-ESTRATEGICAS-RMI.md). Resposta, conferida item a item:
nenhum dos outros 6 itens do planejamento depende tecnicamente dele -
usuário decidiu deixá-lo por último e pediu uma ideia pra resolvê-lo de
verdade. Usuário também compartilhou (e descartou por conta própria,
antes de eu precisar apontar) uma ideia alternativa - lançar sinais
falsos manualmente com score >= 55 só pra destravar o gate, removendo
depois - descartada pelo próprio usuário por não combinar com a índole
do app (contaminaria a base de aprendizado com dado fabricado,
exatamente o que CLAUDE.md/RMI existem pra evitar).

Investigação (conferida no código, não suposição) revelou que existem
DOIS mecanismos de cold-start diferentes, não um só:
- **Mecanismo A (ainda circular de verdade)**: `statisticsEngine.js`'s
  `operacaoAtendeRigorDoPerfil()` só conta, pra taxa de acerto/bônus-
  penalidade histórico (a fonte do "0W/0L, SEM_DADOS" visto no
  AJUSTE-027), operação ROTULADA "CONSERVADOR" - precisa de operação
  Conservador pra existir taxa de acerto Conservador.
- **Mecanismo B (já corrigido sem querer, MUD-02, 17/09/2026)**: o
  gate `operacoesMinimas:30` usa `operacoesElegiveis`, que conta
  QUALQUER operação histórica (independente do rótulo) com
  `score >= scoreMinimo` do perfil - não é mais circular, só lento
  (comentário do próprio MUD-02 em statisticsEngine.js confirma a
  intenção: "histórico antigo conta pelo SCORE... calculado À PARTE do
  filtro estatístico usado no resto desta função").

Ideia proposta e aprovada pelo usuário: estender ao Mecanismo A a
mesma lógica que o MUD-02 já validou no Mecanismo B - contar evidência
pelo que a operação REALMENTE atingiu (score + multi-timeframe +
expectativa, os três critérios reais de `decisionEngine.js` pro
CONSERVADOR, exceto `operacoesMinimas` que não faz sentido reavaliar
sobre si mesmo), não pelo rótulo de perfil que a aprovou. Verificado
no código antes de propor: nenhum dos três campos (`score`, `multi`,
`financeiro.expectativa`) depende do perfil que estava configurado no
momento em que a operação foi salva - só o LIMIAR de aprovação (não o
valor calculado) depende do perfil. Ou seja, dá pra reclassificar
RETROATIVAMENTE o histórico já existente (~400 operações reais, ver
AJUSTE-022), sem esperar semanas de dado novo.

Implementação desta entrada: só o DIAGNÓSTICO, não a reclassificação
em si - ferramenta administrativa avulsa, mesmo padrão de
`backfill-contadores-resultado.js`, mas **só leitura, não escreve nada
no Firestore**. Conta, sobre o histórico real: quantas operações batem
score≥55 sozinho; quantas batem score≥55 + multi confirmado; quantas
batem os 3 critérios completos (score + multi + expectativa≥0) -
critério COMPLETO do CONSERVADOR aplicado retroativamente. Quebra o
resultado por perfil ORIGINAL que aprovou (pra confirmar que operações
Balanceado/Agressivo realmente qualificariam) e por PAR (o gate
`operacoesMinimas` é por par, não global - precisa de 30 no MESMO
par). Single-field query (`resultado in [WIN, LOSS]`) - sem índice
composto, mesma disciplina de sempre.

Validado: `node -c` no script; YAML do workflow validado com
`python3 -c "import yaml; yaml.safe_load(...)"`. Execução real (via
GitHub Actions, workflow_dispatch) e leitura dos números ainda
pendente nesta entrada - próximo passo imediato.

Pendente: rodar o diagnóstico e ler o resultado real decide se a
reclassificação de verdade (mudar `operacaoAtendeRigorDoPerfil()` ou
adicionar um campo tipo `rigorMaximoAtingido` calculado e usado no
lugar do rótulo `perfil` pra fins estatísticos) vale a pena agora ou
se o histórico real ainda não tem massa suficiente pra isso destravar
o CONSERVADOR de fato. Nenhuma mudança de código de produção proposta
ainda - decisão fica pra depois de ver o número real, mesma disciplina
do AJUSTE-027.

**Resultado real (26/09/2026, executado via GitHub Actions,
workflow_dispatch, run #1, job `diagnostico`, conclusion `success`):**

```
Total de operações WIN/LOSS no histórico: 412
Sem campo "score" gravado: 0
Bate score >= 55: 261
Bate score >= 55 + multi-timeframe confirmado: 30
Bate os 3 critérios completos (score + multi + expectativa >= 0): 2
  BALANCEADO: 1 | AGRESSIVO: 1
  USD/JPY: 1 | GBP/USD: 1
```

**Leitura honesta, sem maquiagem**: a ideia (reclassificar por mérito
técnico em vez de rótulo) está correta, mas os NÚMEROS não sustentam
implementá-la agora - só 2 operações em 412 bateriam os 3 critérios
completos do CONSERVADOR, uma por par, longe das 30 NO MESMO par que
`operacoesMinimas` exige. Implementar a reclassificação hoje daria ao
CONSERVADOR um placar de 1/30 no melhor par - progresso real, mas
irrelevante na prática. **Decisão: não implementar a reclassificação
agora** - construir o código pra um ganho de 1 operação não se
justifica; revisitar quando houver mais massa (a cascata do AJUSTE-028
deve gerar novas operações que ajudam a alimentar esse número com o
tempo, mesmo que indiretamente).

O funil revela algo mais importante que a pergunta original: a queda
de 261→30 (só 11% mantêm multi-timeframe confirmado) e principalmente
de 30→2 (só 7% têm expectativa≥0) mostra que a maioria esmagadora do
histórico real tem `probabilidade` (taxa de acerto do par no momento)
abaixo de 50% - com RR fixo em 1:1 (TP=SL=$5, configuração padrão),
`expectativa >= 0` exige `probabilidade >= 50%` por definição
matemática (`calcularExpectativa` em moneyManager.js). Isso não é um
problema de rótulo de perfil - é um problema de taxa de acerto real
do sistema, que afeta TODOS os perfis, não só o Conservador. Registrado
como achado novo pra discussão com o usuário, não decidido aqui.

Ressalva sobre o dado, não investigada a fundo: o campo `multi` só
passou a ser gravado de forma confiável a partir do MUD-01 (17/09/2026)
- parte da queda de 261→30 pode incluir documentos mais antigos com o
campo `multi` ausente (tratado como reprovação, mesma cautela de
sempre), não necessariamente "DIVERGENTE" de verdade. Não muda a
conclusão prática (o teto de 30→2 pela expectativa já é o suficiente
pra não implementar agora), mas registrado pra não confundir o número
"30" com uma medida limpa de divergência real.
--------
