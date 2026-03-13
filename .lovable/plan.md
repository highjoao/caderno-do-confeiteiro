

# Plano: Refatorar Aba Faturas para Gerenciamento Completo de Cartao

## Contexto

Hoje as faturas so existem como resultado automatico de gastos registrados na aba Gastos com forma "Cartao". O usuario nao consegue criar faturas manualmente, adicionar compras diretamente na fatura, nem reconstruir faturas antigas. Isso impede usuarios que ja tinham faturas antes de comecar a usar o app.

A aba "Cartoes" (`Cartoes.tsx`) ja mostra cartoes + faturas + itens. Vamos transformar essa pagina no gerenciador completo de faturas.

## Alteracoes

### 1. Migracao SQL

Adicionar coluna `gasto_id` na tabela `itens_fatura` para vincular itens criados via Gastos (ja existe no schema). Adicionar coluna `data_compra` para registrar quando a compra foi feita:

```sql
ALTER TABLE public.itens_fatura ADD COLUMN IF NOT EXISTS data_compra date;
```

Criar trigger para sincronizar exclusao: quando um gasto com cartao e deletado, remover os itens_fatura correspondentes e recalcular valor_total da fatura.

```sql
CREATE OR REPLACE FUNCTION public.sync_delete_gasto_itens_fatura()
RETURNS trigger AS $$ ... $$
-- Deleta itens_fatura onde gasto_id = OLD.id
-- Recalcula valor_total das faturas afetadas
```

### 2. Refatorar `Cartoes.tsx` — Gerenciador Completo de Faturas

A pagina atual ja tem: lista de cartoes, lista de faturas por cartao, itens expandiveis.

Adicionar:

**a) Botao "Nova Fatura"** (quando um cartao esta selecionado)
- Dialog com: mes de referencia (select de mes/ano), status inicial
- Cria fatura vazia no banco

**b) Botao "Adicionar Compra" dentro de cada fatura expandida**
- Dialog com: descricao, valor, data da compra, categoria (opcional), parcelas
- Se parcelas > 1: campo "parcela atual" (ex: 5 de 10)
- Ao salvar:
  - Cria item na fatura atual
  - Se parcelado com parcela_atual informada: cria automaticamente itens nas faturas anteriores e futuras (criando as faturas se nao existirem)
  - Recalcula valor_total de todas as faturas afetadas

**c) Edicao de itens da fatura**
- Cada item tera botoes editar/excluir
- Editar: altera descricao, valor, data
- Excluir: remove item, recalcula valor_total da fatura
- Se o item tem gasto_id vinculado, excluir tambem remove o gasto

**d) Edicao de fatura**
- Alterar mes de referencia
- Marcar como paga/aberta (ja existe via togglePaga)

**e) Exclusao de fatura**
- Remove fatura e todos seus itens (CASCADE ja configurado)

### 3. Sincronizacao Gastos <-> Faturas

**Ao deletar gasto na aba Gastos:**
- Trigger no banco remove itens_fatura com gasto_id correspondente
- Recalcula valor_total da fatura

**Ao deletar item na fatura que tem gasto_id:**
- Frontend deleta o gasto correspondente tambem

**Compras criadas diretamente na fatura (sem gasto_id):**
- NAO aparecem na aba Gastos
- So impactam despesas quando fatura e marcada como paga (logica do Dashboard ja funciona assim)

### 4. Parcelamento no Meio do Ciclo

Quando usuario informa parcela_atual > 1:
- Sistema calcula faturas anteriores baseado no dia_fechamento do cartao
- Cria faturas passadas se nao existirem
- Distribui parcelas automaticamente
- Cada parcela mostra "X/Y" (ja existe no frontend)

Exemplo: compra 10x, parcela atual 5, mes atual marco
- Cria parcelas 1-4 em nov, dez, jan, fev
- Cria parcelas 6-10 em abr, mai, jun, jul, ago

## Arquivos Afetados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Coluna `data_compra`, trigger sync exclusao |
| `src/pages/Cartoes.tsx` | Refatoracao completa: criar fatura, adicionar/editar/excluir itens, parcelamento meio ciclo |
| `src/pages/Gastos.tsx` | Ajustar `handleDelete` para tambem limpar itens_fatura (trigger faz isso) |

## Nao Muda

- Logica do Dashboard (despesas pagas = faturas pagas + gastos nao-cartao)
- Aba Faturamento (fechamentos diarios, conceito diferente)
- RLS policies (itens_fatura ja tem policies via join com faturas/cartoes)

