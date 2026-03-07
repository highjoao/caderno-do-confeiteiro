

# Plano de Correção - Cálculo de Preço, Rendimento e Recálculo Automático

## Problema 1: Fórmula de Preço Ideal Incorreta

A fórmula atual usa **markup sobre preço de venda** (`custo / (1 - %total/100)`), o que com 91% de percentuais resulta em `63 / 0.09 = R$ 700`. 

O correto é **markup sobre custo** (soma aditiva):
```text
Preço = Custo × (1 + soma_percentuais / 100)
Preço = 63 × (1 + 0.91) = 63 × 1.91 = R$ 120,33
```

Também precisa dividir pelo rendimento (quantas unidades a receita faz):
```text
Preço por unidade = Preço Total / rendimento
```

**Alteração em `Produtos.tsx`:**
- Mudar `calcPrecoIdeal`: `custo * (1 + totalPerc / 100) / rendimento`
- Atualizar o breakdown exibido para mostrar valores corretos

## Problema 2: Campo de Rendimento no Produto

A tabela `produtos` não tem campo de rendimento. Precisa adicionar:

**Migração DB:**
```sql
ALTER TABLE produtos ADD COLUMN rendimento_quantidade numeric DEFAULT 1;
```

**UI:** Adicionar campo "Quantas unidades rende?" no formulário, entre os componentes e os percentuais. Valor padrão = 1.

O preço ideal passa a ser dividido pelo rendimento para mostrar o preço **por unidade**.

## Problema 3: Recálculo Automático ao Alterar Insumos

Quando o preço de um insumo muda, os produtos e bases que o usam ficam desatualizados.

**Solução:** Criar uma **database function + trigger** que, ao atualizar um insumo, recalcula automaticamente:
1. Todas as **bases** que usam esse insumo (via `base_insumos`)
2. Todos os **produtos** que usam esse insumo ou essas bases (via `produto_componentes`)

A function percorre as tabelas de junção, recalcula `custo_total`, `custo_por_rendimento` (bases) e `custo_total` + `preco_ideal` (produtos).

## Resumo de Arquivos

| Arquivo | Alteração |
|---|---|
| **DB Migration** | `ADD COLUMN rendimento_quantidade` em produtos + trigger de recálculo |
| `src/pages/Produtos.tsx` | Corrigir fórmula, adicionar campo rendimento, dividir preço por rendimento |

