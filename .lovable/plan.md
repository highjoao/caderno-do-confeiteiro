

# Plano: Refatorar Dashboard Financeira

## Alterações em `src/pages/Dashboard.tsx`

### 1. Filtro de Período Personalizado
Substituir o `Select` atual por um filtro com opções predefinidas (Hoje, 7 dias, Mês Atual) **mais** uma opção "Personalizado" que exibe dois inputs de data (início e fim). Usar `react-day-picker` via componente `Calendar` + `Popover` já existente no projeto.

### 2. Card "Despesas Pagas" (substitui "Gastos")
**Query:** Buscar gastos onde `forma_pagamento != 'Cartão'` no período selecionado + somar `valor_total` das faturas com `paga = true` cujo `mes_referencia` esteja no período.

```text
despesas_pagas = gastos(forma_pagamento != 'Cartão', data no período)
               + faturas(paga = true, mes_referencia no período).valor_total
```

### 3. Novo Card "Faturas em Aberto"
**Query:** Buscar faturas onde `paga = false`, somar `valor_total`. Sem filtro de período -- mostra todas as faturas abertas.

### 4. Card "Média Diária" (substitui "Ticket Médio")
**Fórmula:** `faturamento_total / dias_no_período` (usando diferença entre data início e data fim, mínimo 1).

### 5. Lucro Estimado Revisado
**Fórmula:** `faturamento - despesas_pagas - custos_fixos`. Não inclui faturas em aberto. O card "Custos Fixos" continua somando todos os custos fixos cadastrados (valor mensal).

### 6. Nova Ordem dos Cards
1. Faturamento
2. Despesas Pagas
3. Faturas em Aberto
4. Custos Fixos
5. Lucro Estimado
6. Meta
7. % Meta Atingida
8. Média Diária
9. Encomendas

### 7. Ícones atualizados
- Faturas em Aberto: `CreditCard`
- Média Diária: `TrendingUp` ou `BarChart3`

## Nenhuma alteração de banco necessária

As tabelas `gastos` (com `forma_pagamento`), `faturas` (com `paga`, `valor_total`, `mes_referencia`) já possuem todos os campos necessários. Os dados existentes já funcionam retroativamente.

## Arquivo afetado

| Arquivo | Alteração |
|---|---|
| `src/pages/Dashboard.tsx` | Filtro personalizado, separar despesas/cartão, novo card Faturas em Aberto, Média Diária, revisar lucro |

