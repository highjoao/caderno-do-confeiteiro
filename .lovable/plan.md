

# Plano de Correções - 5 Itens

## 1. PWA Auto-Update (Near Real-Time)

O Service Worker atual usa cache-first, servindo versões antigas indefinidamente no mobile. A solução:

- **Mudar SW para network-first** para assets HTML/JS/CSS (app shell), mantendo cache-first apenas para imagens/fontes
- Adicionar lógica de **skip waiting + clients.claim** com notificação ao usuário quando nova versão estiver disponível
- No `main.tsx`, detectar `controllerchange` no SW e recarregar a página automaticamente
- Bumpar `CACHE_NAME` para `confeiteiro-v3`

## 2. Casas Decimais e Zeros nos Inputs

**Problema dos zeros:** Inputs numéricos inicializados com `"0"` fazem o usuário digitar "023". Solução: inicializar com `""` (string vazia) e usar `placeholder="0"`.

**Casas decimais incorretas:** Criar funções de formatação específicas em `src/lib/format.ts`:
- `formatDecimal(value, decimals)` - genérica
- Valores monetários: 2 casas (`R$ 89,00`)
- Custo por grama: 4 casas (`R$ 0,0050/g`)  
- Custo por Kg: 2 casas (`R$ 5,00/Kg`)
- Custo por Unidade: 2 casas (`R$ 0,89/un`)
- Percentuais: 1 casa (`38,0%`)
- Quantidades: sem decimais desnecessários (usar `parseFloat` para limpar trailing zeros)

**Arquivos afetados:** `format.ts`, `Insumos.tsx`, `Bases.tsx`, `Produtos.tsx`, `Encomendas.tsx`, `CustosFixos.tsx`, `Gastos.tsx`

Nos formulários de Produtos, trocar `perc_custo_fixo: "0"` → `perc_custo_fixo: ""` etc. Aplicar `placeholder="0"` nos inputs.

## 3. Mobile Dialog Alignment

- Adicionar CSS global para `DialogContent` no mobile: `max-w-[95vw]`, `mx-auto`
- Garantir `overflow-y-auto` e `max-h-[85vh]` nos dialogs
- Adicionar `padding-bottom: env(safe-area-inset-bottom)` nos dialogs para PWA standalone
- Revisar todos os `DialogContent` para incluir classes responsivas consistentes

## 4. Unidades/Medidas com Decimais Corretos

Criar helper `formatQuantidade(valor, unidade)`:
- `g` → sem decimais desnecessários (ex: `500g`, `1.5g`)
- `Kg` → até 3 casas (ex: `1.500 Kg`)
- `L/ml` → até 3 casas
- `Unidade` → inteiro (ex: `100`)

Aplicar em `Insumos.tsx`, `Bases.tsx`, `Produtos.tsx` na listagem e detalhes.

## 5. Unidade de Medida nos Componentes de Produtos

**Migração DB:** Adicionar coluna `unidade_medida` (text, nullable, default null) na tabela `produto_componentes`.

**UI em Produtos.tsx:**
- Ao selecionar um componente (Insumo ou Base), auto-preencher a unidade padrão do componente
- Adicionar dropdown de unidade de medida ao lado do campo de quantidade em cada componente (g, Kg, ml, L, Unidade)
- No cálculo de custo, converter automaticamente: se insumo armazena custo em `custo_por_grama` e a receita usa `Kg`, multiplicar por 1000

**Lógica de conversão:**
```text
Se unidade_receita == unidade_insumo → custo = custo_unitario × qtd
Se unidade_receita = Kg e insumo = g  → custo = custo_por_grama × qtd × 1000
Se unidade_receita = g e insumo = Kg  → custo = custo_por_grama × qtd
Se unidade_receita = L e insumo = ml  → custo = custo_por_ml × qtd × 1000
etc.
```

## Resumo de Arquivos

| Arquivo | Alterações |
|---|---|
| `public/sw.js` | Network-first para app shell, bump versão |
| `src/main.tsx` | Auto-reload no SW update |
| `src/lib/format.ts` | Novas funções de formatação |
| `src/index.css` | Safe-area padding para dialogs PWA |
| `src/pages/Produtos.tsx` | Unidade nos componentes, decimais, inputs vazios |
| `src/pages/Insumos.tsx` | Decimais corretos, inputs vazios |
| `src/pages/Bases.tsx` | Decimais corretos |
| `src/pages/Gastos.tsx` | Decimais, layout mobile |
| `src/pages/CustosFixos.tsx` | Decimais, inputs vazios |
| `src/pages/Encomendas.tsx` | Decimais |
| `src/pages/Cartoes.tsx` | Layout mobile |
| `src/pages/Faturamento.tsx` | Decimais |
| **DB Migration** | `ALTER TABLE produto_componentes ADD COLUMN unidade_medida text` |

