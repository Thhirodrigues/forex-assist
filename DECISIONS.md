DECISIONS

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
