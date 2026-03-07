

# Plano: Image Viewer Modal + Correção de Layout

## Problema 1 — Image Viewer Modal

Nas telas de Gastos (linha 253) e Encomendas (linha 395), as imagens são exibidas com `<img>` simples sem `onClick`. Não há modal de visualização ampliada.

### Solução

Adicionar estado `viewerImage` em ambas as páginas. Ao clicar na imagem, abrir um Dialog fullscreen com a imagem em resolução completa.

**Em `src/pages/Gastos.tsx`:**
- Adicionar estado: `const [viewerImage, setViewerImage] = useState<string | null>(null)`
- Na imagem da nota fiscal (linha 253): adicionar `onClick={() => setViewerImage(detailItem.foto_url)}` e `cursor-pointer`
- Adicionar Dialog de visualização com fundo escuro, imagem `max-h-[90vh] object-contain`, botão fechar, e fechar ao clicar fora

**Em `src/pages/Encomendas.tsx`:**
- Mesma lógica: estado `viewerImage`, onClick na imagem (linha 395), Dialog de visualização

### Componente do viewer (inline em cada página):
```tsx
<Dialog open={!!viewerImage} onOpenChange={(o) => { if (!o) setViewerImage(null); }}>
  <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/90 border-none">
    <img src={viewerImage!} alt="Visualização" className="max-h-[90vh] w-full object-contain" />
  </DialogContent>
</Dialog>
```

## Problema 2 — Campo "Valor" desalinhado em Encomendas

Na tela de Encomendas, o formulário de criação/edição tem os campos "Valor Total" e "Valor Entrada" em `grid grid-cols-2 gap-4` (linha 227-229), que está correto e alinhado. O layout do formulário já usa padrão consistente.

Vou verificar visualmente se há algum campo específico desalinhado na renderização e garantir que todos os campos sigam o mesmo padrão de espaçamento.

O campo "Restante" (linha 232-233) está fora do grid como texto solto — isso pode parecer desalinhado. Vou mantê-lo como informação auxiliar mas garantir espaçamento consistente.

## Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/pages/Gastos.tsx` | Adicionar image viewer modal + cursor-pointer na imagem |
| `src/pages/Encomendas.tsx` | Adicionar image viewer modal + cursor-pointer na imagem + verificar alinhamento de campos |

