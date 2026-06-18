
## 2026-06-18

### DEC-003

# Padronização da função buscarPrecoFechamento

Status:
Concluído.

Descrição

Foi decidido padronizar toda a lógica do Result Checker utilizando a função `buscarPrecoFechamento()`.

Essa função passa a representar oficialmente a obtenção do preço utilizado na validação dos sinais, eliminando nomenclaturas antigas e preparando a evolução da implementação.

Motivação

- padronização da arquitetura;
- melhoria da legibilidade do código;
- preparação para utilização do fechamento oficial do candle;
- redução de ambiguidades na regra de negócio.

Impacto

Todo o projeto passa a utilizar uma única nomenclatura para obtenção do preço de fechamento, facilitando futuras evoluções sem necessidade de alterar o restante da lógica.

2026-06-18

Validação por Fechamento de Candle

Foi decidido que o Result Checker deixará de utilizar o preço instantâneo ("/price") para validar operações.

A partir desta decisão, toda verificação de resultado será baseada no fechamento do candle correspondente ao timeframe da operação.

A implementação passa a utilizar o endpoint "time_series" da TwelveData, consultando os dois últimos candles de 15 minutos e considerando o fechamento do último candle encerrado ("values[1].close").

Motivos:

- maior fidelidade ao comportamento real do mercado;
- eliminação de diferenças causadas por oscilações instantâneas de preço;
- maior consistência estatística;
- padronização da validação dos resultados;
- preparação da plataforma para análises históricas e aprendizado futuro.

Status:

Concluído.
---


Padronização BUY / SELL

Foi decidido padronizar toda a regra de negócio utilizando os termos BUY e SELL.

Caso seja necessário apresentar "Compra" e "Venda" ao usuário, essa tradução ocorrerá exclusivamente na camada de interface.

Motivos:

- compatibilidade com o mercado Forex;
- compatibilidade futura com outras corretoras;
- padronização da regra de negócio;
- separação entre lógica interna e apresentação ao usuário.

Status:

Concluído.
---

2026-06-16

Arquitetura Modular

Foi decidido que o projeto seguirá uma arquitetura modular.

Cada arquivo deve possuir uma única responsabilidade.

Nenhum módulo deve conter lógica pertencente a outro módulo.

Objetivos:

- facilitar manutenção;
- facilitar testes;
- reduzir acoplamento;
- permitir evolução contínua.

Status:

Em andamento.
