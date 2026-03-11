

# Plano: Mascara de Moeda Brasileira em Campos Financeiros

## Resumo

Criar um componente `CurrencyInput` reutilizavel e funcoes utilitarias (`maskCurrency`, `parseCurrency`) para aplicar mascara de moeda brasileira (1.000,00) em todos os campos monetarios. O input sera `type="text"` com mascara em tempo real.

## Logica da Mascara

| Digitado | Exibido |
|---|---|
| 1 | 1,00 |
| 10 | 10,00 |
| 100 | 100,00 |
| 1000 | 1.000,00 |
| 01 | 0,01 |
| 010 | 0,10 |

Regra: digitos que comecam com 0 sao interpretados como centavos (dividir por 100). Demais sao valores inteiros formatados com 2 casas decimais.

## Alteracoes

### 1. `src/lib/currency-mask.ts` (novo)

```typescript
export function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    return (Number(digits) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Number(digits).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCurrency(formatted: string): number {
  return Number(formatted.replace(/\./g, "").replace(",", ".")) || 0;
}
```

### 2. `src/components/ui/currency-input.tsx` (novo)

Componente wrapper do `Input` que aplica `maskCurrency` no onChange e exibe valor formatado. Props: `value` (string formatada), `onChange` (string formatada), demais props do Input.

### 3. Substituicoes nos formularios

Todos os campos `type="number" step="0.01"` com label contendo "R$" ou "Valor" serao trocados por `<CurrencyInput>`.

| Arquivo | Campos |
|---|---|
| `Gastos.tsx` | valor |
| `Faturamento.tsx` | cartao, pix, dinheiro, delivery |
| `CustosFixos.tsx` | valor, metaInput |
| `Encomendas.tsx` | valor_total, valor_entrada |
| `Cartoes.tsx` | itemForm.valor |
| `Insumos.tsx` | valor_pago |

### 4. Ajuste no `handleSubmit` de cada pagina

Onde hoje faz `toNumber(form.valor)`, passara a usar `parseCurrency(form.valor)` para converter "1.000,00" em `1000`.

### 5. Ajuste no `openEdit`

Ao abrir edicao, converter o valor numerico do banco para string formatada usando `maskCurrency`.

## Arquivos Afetados

| Arquivo | Tipo |
|---|---|
| `src/lib/currency-mask.ts` | Novo |
| `src/components/ui/currency-input.tsx` | Novo |
| `src/pages/Gastos.tsx` | Editar |
| `src/pages/Faturamento.tsx` | Editar |
| `src/pages/CustosFixos.tsx` | Editar |
| `src/pages/Encomendas.tsx` | Editar |
| `src/pages/Cartoes.tsx` | Editar |
| `src/pages/Insumos.tsx` | Editar |

