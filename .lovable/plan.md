

# Plano de Correções

## Problema 1: Substituir ícones de editar/excluir por menu de 3 pontinhos + Detalhes ao clicar

### O que será feito
- Substituir os botões de lápis (editar) e lixeira (excluir) por um menu dropdown com ícone de 3 pontinhos (`MoreVertical`) em **todas as páginas** que usam esse padrão
- Ao clicar no item da lista, abrir um Dialog/Sheet com os detalhes completos do registro
- O menu de 3 pontinhos terá as opções "Editar" e "Excluir" (com confirmação para exclusão)
- Layout responsivo com melhor enquadramento dos cards para mobile e desktop

### Páginas afetadas
1. **Encomendas** - lista de encomendas (+ calendário)
2. **Produtos** - lista de produtos
3. **Insumos** - lista de insumos
4. **Bases** - lista de bases
5. **Gastos** - extrato de gastos
6. **Custos Fixos** - lista de custos
7. **Cartões** - cards de cartões
8. **Faturamento** - extrato de fechamentos

### Detalhes técnicos
- Usar `DropdownMenu` do shadcn/ui com `MoreVertical` do lucide-react
- Criar Dialog de detalhes para Encomendas (com todos os campos: cliente, telefone, data, hora, produtos, valor, entrada, restante, status, foto, observação)
- Para as demais páginas, aplicar o mesmo padrão de clique para detalhes
- Ajustar layout `flex` dos itens para `flex-wrap` e espaçamento adequado no mobile
- Usar `AlertDialog` para confirmação de exclusão

## Problema 2: Teclado PWA não sobe no mobile

### O que será feito
- Adicionar meta tag `interactive-widget=resizes-content` no viewport do `index.html`
- Atualizar a meta viewport para: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content`
- Adicionar CSS para garantir que inputs dentro de Dialogs funcionem corretamente no modo standalone PWA (`env(safe-area-inset-bottom)`)

