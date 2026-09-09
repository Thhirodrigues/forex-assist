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

