

# Plano: Dashboard Financeira + Receitas + Conversor de Medidas

## Parte 1: Dashboard Financeira

A Dashboard (`src/pages/Dashboard.tsx`) **já foi refatorada** na mensagem anterior com todas as alterações solicitadas:
- "Despesas Pagas" separando gastos não-cartão + faturas pagas
- "Faturas em Aberto" mostrando faturas pendentes
- "Média Diária" substituindo "Ticket Médio"
- Filtro personalizado de datas
- Lucro Estimado = Faturamento − Despesas Pagas − Custos Fixos

**Nenhuma alteração adicional necessária na Dashboard.** O código atual já implementa toda a lógica descrita.

---

## Parte 2: Renomear "Bases" para "Receitas"

### Arquivo: `src/components/AppLayout.tsx`
- Alterar label no navItems de `"Bases"` para `"Receitas"`

### Arquivo: `src/pages/Bases.tsx`
- Alterar título `"Bases"` → `"Receitas"`
- Alterar `"Nova Base"` → `"Nova Receita"`
- Alterar `"Editar Base"` → `"Editar Receita"`
- Alterar `"Detalhes da Base"` → `"Detalhes da Receita"`
- Alterar `"Nenhuma base cadastrada"` → `"Nenhuma receita cadastrada"`
- Alterar toast e labels `"base"` → `"receita"`

---

## Parte 3: Conversor de Medidas nos Ingredientes da Receita

### Arquivo: `src/pages/Bases.tsx`

**Problema:** Quando o insumo é cadastrado em Kg, o usuário precisa digitar `0.5` para 500g. Confuso.

**Solução:** Adicionar um seletor de unidade ao lado da quantidade de cada ingrediente. O sistema converte automaticamente para a unidade do insumo antes de salvar e calcular custo.

### Mudanças específicas:

1. **Novo estado nos ingredientes:** Cada item em `insumosBase` passa a ter `{ insumo_id, quantidade_usada, unidade_receita }`.

2. **Seletor de unidade por ingrediente:** Ao lado do input de quantidade, adicionar um `Select` com as unidades compatíveis. Quando o usuário seleciona um insumo:
   - Se insumo é `Kg` ou `g`: opções = `g`, `Kg`
   - Se insumo é `L` ou `ml`: opções = `ml`, `L`
   - Se insumo é `Unidade`: opções = `Unidade`
   - A unidade padrão pré-selecionada será a menor (g para peso, ml para volume)

3. **Conversão automática no cálculo de custo (`calcCustoTotal`):**
   ```text
   Se unidade_receita = g e insumo = Kg: qtd_convertida = qtd / 1000
   Se unidade_receita = Kg e insumo = g: qtd_convertida = qtd * 1000
   Se unidade_receita = ml e insumo = L: qtd_convertida = qtd / 1000
   Se unidade_receita = L e insumo = ml: qtd_convertida = qtd * 1000
   Senão: qtd_convertida = qtd
   ```
   Custo = `qtd_convertida * custo_por_unidade`

4. **Salvar no banco:** O `quantidade_usada` salvo no `base_insumos` será sempre na unidade do insumo (convertida). Assim não precisa mudar o schema do banco.

5. **Exibição nos detalhes:** Mostrar a quantidade na unidade do insumo (como já faz hoje).

### Sem alteração de banco necessária
A conversão ocorre no frontend antes de salvar. O `base_insumos.quantidade_usada` continua armazenando na unidade padrão do insumo.

---

## Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/components/AppLayout.tsx` | Renomear "Bases" → "Receitas" no menu |
| `src/pages/Bases.tsx` | Renomear textos + adicionar seletor de unidade por ingrediente com conversão automática |

