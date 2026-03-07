

# Plano: Refatorar Dashboard Financeira

## Resumo das Alterações

Apenas o arquivo `src/pages/Dashboard.tsx` será alterado. Nenhuma mudança de estrutura de banco de dados é necessária — todas as informações já existem nas tabelas `gastos`, `faturas` e `fechamentos_diarios`.

## 1. Card "Despesas Pagas" (substituindo "Gastos")

**Query atual:** Soma todos os gastos do período sem distinção.

**Nova lógica:** Filtrar gastos onde `forma_pagamento != 'Cartão'`. Esses são os pagamentos efetivados (Pix, Dinheiro, Boleto, Débito).

Para compras no cartão, só contar como "paga" se a fatura vinculada estiver com `paga = true`.

```text
despesas_pagas = gastos(forma_pagamento != 'Cartão') 
               + faturas(paga = true).valor_total  (no período)
```

## 2. Novo Card "Faturas em Aberto"

**Query:** Buscar faturas onde `paga = false`, somar `valor_total`.

Exibe o total de compromissos com cartão ainda não quitados. Sem filtro de período — mostra todas as faturas abertas.

## 3. Card "Média Diária" (substituindo "Ticket Médio")

**Fórmula:**
```text
media_diaria = faturamento_total / dias_com_lancamento
```

Onde `dias_com_lancamento = fechamentos.length` (já disponível). Se zero, não exibe.

## 4. Lucro Estimado — Fórmula Revisada

```text
lucro = faturamento - despesas_pagas - custos_fixos
```

Não inclui faturas em aberto (compromissos futuros). Adicionar tooltip com a fórmula.

## 5. Novo Layout dos Cards

Ordem:
1. Faturamento
2. Despesas Pagas
3. Custos Fixos
4. Faturas em Aberto (novo)
5. Lucro Estimado
6. Meta
7. % Meta Atingida
8. Média Diária (renomeado)
9. Encomendas

Ícone do "Faturas em Aberto": `CreditCard` do lucide-react.
Ícone da "Média Diária": `BarChart3` ou `TrendingUp`.

## 6. Dados já existentes — retroativo

- Gastos passados já têm `forma_pagamento` preenchido, então a separação funciona retroativamente
- Faturas existentes já têm campo `paga` (boolean), então "Faturas em Aberto" mostra dados históricos também

## Arquivo afetado

| Arquivo | Alteração |
|---|---|
| `src/pages/Dashboard.tsx` | Nova query para separar despesas pagas vs cartão, novo card Faturas em Aberto, renomear Ticket Médio para Média Diária, revisar cálculo do lucro |

