

# Plano: Estabilidade e Auto-Save na Edição de Receitas/Fichas Técnicas

## Causa Raiz

O **Service Worker** em `src/main.tsx` (linhas 30-38) faz `window.location.reload()` automaticamente quando detecta uma nova versão. Durante edições longas, isso recarrega a página e perde todo o trabalho. Além disso, o evento `controllerchange` (linha 43) também dispara reload.

## Alterações

### 1. Controlar reload do Service Worker (`src/main.tsx`)

Criar flag global `window.__editingInProgress` que bloqueia o reload automático do SW. Quando a flag está ativa, o SW aguarda o usuário sair da edição antes de recarregar.

### 2. Hook `useAutoSaveDraft` (`src/hooks/use-auto-save-draft.ts`) — NOVO

Hook reutilizável que:
- Salva rascunho no `localStorage` a cada 20s via `setInterval`
- Salva imediatamente quando dados mudam (debounced 2s)
- Detecta rascunho existente ao montar
- Oferece funções `clearDraft`, `hasDraft`, `loadDraft`
- Gerencia indicador de status: "Salvando..." / "Rascunho salvo" / "Alterações não salvas"

### 3. Aplicar auto-save em `Bases.tsx`

- Ao abrir dialog (criar/editar): ativar `window.__editingInProgress = true`
- Ao fechar dialog: desativar flag e limpar rascunho
- Ao montar: verificar se existe rascunho e perguntar se deseja recuperar
- Mostrar indicador de status no header do dialog
- `beforeunload` warning quando há alterações não salvas

### 4. Aplicar auto-save em `Produtos.tsx`

Mesma lógica do Bases.tsx — proteger form + componentes.

### 5. Componente `DraftStatusIndicator` (`src/components/DraftStatusIndicator.tsx`) — NOVO

Pequeno badge que mostra o status do rascunho no topo do dialog:
- 🟢 "Rascunho salvo" (verde, some após 3s)
- 🟡 "Salvando..." (amarelo)  
- 🔴 "Alterações não salvas" (vermelho)

### 6. Dialog de recuperação

Ao detectar rascunho não finalizado, exibir `AlertDialog`:
- "Encontramos uma edição não finalizada. Deseja continuar de onde parou?"
- Botões: "Continuar edição" / "Descartar rascunho"

## Arquivos

| Arquivo | Tipo |
|---|---|
| `src/main.tsx` | Editar — condicionar reload do SW |
| `src/hooks/use-auto-save-draft.ts` | Novo — hook de auto-save |
| `src/components/DraftStatusIndicator.tsx` | Novo — indicador visual |
| `src/pages/Bases.tsx` | Editar — integrar auto-save |
| `src/pages/Produtos.tsx` | Editar — integrar auto-save |

## Não muda

- Lógica de submit/banco de dados
- Estrutura das tabelas
- Outras páginas (Gastos, Faturamento, etc.)

