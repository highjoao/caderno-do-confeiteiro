

# Plano: Precificação em Cascata com Preço Loja e Delivery

## O que muda

A fórmula atual soma todos os percentuais de uma vez (`custo * (1 + totalPerc/100)`). O correto é aplicar cada percentual em sequência, dividindo por `(1 - perc)`.

## Lógica de cálculo

```text
custoBase = custoInsumos / rendimento

precoLoja = custoBase
se custoFixo ativo:  precoLoja = precoLoja / (1 - custoFixo/100)
se lucro ativo:      precoLoja = precoLoja / (1 - lucro/100)
se taxaCartao ativa: precoLoja = precoLoja / (1 - taxaCartao/100)

precoDelivery = precoLoja
se taxaDelivery ativa: precoDelivery = precoDelivery / (1 - taxaDelivery/100)
```

## Alterações em `src/pages/Produtos.tsx`

### 1. Substituir `calcPrecoIdeal` por duas funções
- `calcPrecoLoja(custo, form)` — cascata: custo fixo → lucro → taxa cartão
- `calcPrecoDelivery(precoLoja, form)` — aplica taxa delivery sobre precoLoja
- Ambas respeitam toggles de ativação por percentual

### 2. Adicionar estado de toggles
- `toggles: { custoFixo: true, lucro: true, taxaCartao: true, taxaDelivery: true }`
- Checkboxes (Switch) ao lado de cada percentual no formulário e no resumo

### 3. Atualizar resumo no formulário (linhas 274-286)
Substituir bloco atual por:
- **Custo de Insumos**: R$ X,XX
- **Formação Preço Loja** (lista dos percentuais ativos com valores em cascata)
- **Preço Ideal Loja**: R$ XX,XX
- **Formação Preço Delivery** (mesma lista + taxa delivery)
- **Preço Ideal Delivery**: R$ XX,XX
- Nota explicativa sobre cálculo em cascata

### 4. Atualizar resumo no dialog de detalhes (linhas 350-358)
Mesma estrutura: Custo de Insumos + Preço Loja + Preço Delivery, usando valores salvos no banco com recálculo em cascata.

### 5. Atualizar `handleSubmit`
Salvar `preco_ideal` como `precoDelivery` (valor mais completo) para manter compatibilidade com listagem e trigger de recálculo.

### 6. Atualizar trigger de recálculo no DB
A migration existente calcula `preco_ideal` com fórmula aditiva. Precisa atualizar para cascata:
```sql
price := cost;
IF perc_custo_fixo > 0 THEN price := price / (1 - perc_custo_fixo/100); END IF;
IF perc_lucro > 0 THEN price := price / (1 - perc_lucro/100); END IF;
...
```

## Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/pages/Produtos.tsx` | Nova lógica cascata, toggles, UI com Loja/Delivery separados |
| **DB Migration** | Atualizar function `recalcular_custos_ao_atualizar_insumo` para cascata |

