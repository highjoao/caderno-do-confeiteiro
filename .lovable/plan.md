

# Plano: Refatorar Design das Telas de Receitas e Ficha Técnica

## Resumo

Reorganizar visualmente os formulários de criação/edição em `Bases.tsx` e `Produtos.tsx` usando cards por seção, títulos destacados com ícones, cores sutis por tipo de componente e um resumo final premium. Sem mudar lógica, paleta ou identidade.

## Alterações

### 1. `Bases.tsx` — Dialog de criação/edição

Reorganizar o form em seções com cards:

**Seção 1 — Dados Principais** (card branco com borda sutil)
- Ícone + título "Dados Principais" em `text-base font-semibold`
- Campo Nome

**Seção 2 — Insumos** (card com fundo `bg-muted/20`)
- Ícone + título "Insumos da Receita"
- Botão "Adicionar" no header
- Cada item com padding, borda e botão remover alinhado
- Custo calculado inline por item (texto discreto)

**Seção 3 — Rendimento** (card)
- Ícone + título "Rendimento"
- Grid 2 colunas: quantidade + unidade

**Seção 4 — Resumo** (card com `bg-primary/5` e borda `border-primary/20`)
- Ícone + título "Resumo"
- Custo total em destaque
- Custo por rendimento

**Botão Salvar** com `mt-6` separado do resumo

### 2. `Produtos.tsx` — Dialog de criação/edição

Reorganizar em seções:

**Seção 1 — Dados Principais**
- Nome + Tipo de Venda em grid 2 colunas

**Seção 2 — Componentes**
- Cada componente com fundo por tipo:
  - Insumo: `bg-white` / `bg-card` (neutro)
  - Base/Receita: `bg-[#FFF3F8]` (rosa clarinho)
  - Embalagem: `bg-[#F8F4FF]` (lilás suave)
- Layout compacto: linha 1 (tipo + seletor + remover), linha 2 (qtd + unidade)

**Seção 3 — Rendimento**
- Card próprio com "Quantas unidades a receita rende?"

**Seção 4 — Percentuais de Formação de Preço**
- Título destacado com ícone
- Grid 2x2 de mini-cards, cada um com:
  - Toggle no topo
  - Nome do percentual
  - Input abaixo
  - Fundo `bg-muted/30`, borda sutil, padding

**Seção 5 — Resumo de Precificação** (visual premium)
- Fundo `bg-primary/5` com borda `border-primary/20`
- Custo de insumos
- Divisória
- Bloco "Preço Loja" com percentuais e preço em destaque
- Divisória
- Bloco "Preço Delivery" idem
- Texto explicativo em `text-[10px]` bem discreto
- Preços finais em `text-lg font-bold`

**Botão Salvar** com `mt-6`

### 3. `DialogContent` — Scroll

Ambos os dialogs: adicionar `max-h-[85vh] overflow-y-auto` no form wrapper para receitas grandes não saírem da tela.

### 4. Títulos de seção — Padrão visual

Criar padrão consistente para títulos:
```
<div className="flex items-center gap-2 mb-3">
  <Icon className="h-4 w-4 text-primary" />
  <h3 className="text-sm font-semibold text-foreground">Título</h3>
</div>
```

Ícones: `FileText` (dados), `Package` (componentes), `Scale` (rendimento), `Percent` (percentuais), `Calculator` (resumo).

## Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/pages/Bases.tsx` | Refatorar dialog form com seções em cards |
| `src/pages/Produtos.tsx` | Refatorar dialog form com seções em cards, cores por tipo, mini-cards percentuais, resumo premium |

## Não muda

- Lógica de cálculo
- Lógica de submit/banco
- Paleta de cores (rosa, branco, neutros)
- Auto-save / draft recovery
- Listagem e detalhes

