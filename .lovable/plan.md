

# Plano: Auto-preenchimento de Data e Hora

## Analise do Estado Atual

| Pagina | Campo DB | Tipo DB | Input Frontend |
|---|---|---|---|
| Gastos | `data` | `date` | `type="date"` |
| Faturamento | `data` | `date` | `type="date"` |
| Encomendas | `data_retirada` + `hora_retirada` | `date` + `time` | `type="date"` + `type="time"` |

## Decisoes de Design

**Fechamentos Diarios**: Manter como `date` — o conceito e "um por dia". A logica de unicidade (linha 51 Faturamento.tsx) depende disso. Adicionar hora quebraria o modelo.

**Gastos**: Converter para `datetime-local` no frontend e `timestamptz` no banco. Permite registrar hora exata do gasto. A funcao `lancarNaFatura` sera ajustada para parsear o timestamp.

**Encomendas**: Ja tem date + time separados. Apenas auto-preencher.

## Alteracoes

### 1. Migracao SQL
- Converter `gastos.data` de `date` para `timestamptz` (dados existentes ganham hora 00:00 automaticamente)

### 2. `src/pages/Gastos.tsx`
- Mudar input de `type="date"` para `type="datetime-local"`
- Auto-preencher com data/hora atual ao abrir dialog de criacao:
  ```tsx
  // No onOpenChange do Dialog, quando nao e edicao:
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  setForm({ ...resetValues, data: local });
  ```
- Ajustar `lancarNaFatura` para parsear timestamp em vez de `data + "T00:00:00"`
- Ajustar `openEdit` para formatar timestamp como `datetime-local` value

### 3. `src/pages/Faturamento.tsx`
- Auto-preencher com data atual ao abrir dialog de criacao:
  ```tsx
  const today = new Date().toISOString().slice(0, 10);
  setForm({ ...resetValues, data: today });
  ```

### 4. `src/pages/Encomendas.tsx`
- Auto-preencher `data_retirada` e `hora_retirada` ao abrir dialog de criacao

### 5. `src/lib/format.ts`
- Atualizar `formatDate` para detectar timestamps e exibir hora quando presente:
  ```tsx
  // "07/03/2026 14:35" para timestamps
  // "07/03/2026" para dates simples
  ```

### 6. Exibicao em Gastos
- Onde mostra `formatDate(g.data)`, agora mostrara data + hora

## Arquivos Afetados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | `gastos.data` de `date` para `timestamptz` |
| `src/pages/Gastos.tsx` | datetime-local + auto-fill + ajuste lancarNaFatura |
| `src/pages/Faturamento.tsx` | Auto-fill data atual |
| `src/pages/Encomendas.tsx` | Auto-fill data + hora |
| `src/lib/format.ts` | formatDate com suporte a timestamp |

