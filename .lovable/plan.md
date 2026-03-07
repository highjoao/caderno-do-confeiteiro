

# Plano: Melhorar Upload de Imagens (Gastos + Encomendas)

## Análise Atual

Ambas as páginas (Gastos e Encomendas) já fazem upload de uma única foto para os buckets `notas_fiscais` e `encomendas_fotos` respectivamente, salvando a URL no campo `foto_url`. O fluxo funciona mas falta validação, tratamento de erro, compressão e suporte a múltiplas imagens.

## Decisão de Design

Não criar tabela `order_attachments` separada. Manter o campo `foto_url` existente (uma imagem por registro), que é suficiente para o caso de uso (foto de nota fiscal / foto de encomenda). Focar em robustez do upload.

## Alterações

### 1. Criar utilitário de upload: `src/lib/image-upload.ts`

Função reutilizável com:
- **Validação de tipo**: aceitar apenas `image/jpeg`, `image/png`, `image/webp`
- **Validação de tamanho**: máximo 5MB
- **Compressão automática**: usar Canvas API para redimensionar imagens > 1920px de largura e comprimir para JPEG 0.8 quality
- **Upload para bucket**: recebe bucket name, empresaId, file → retorna publicUrl
- **Tratamento de erro**: retorna `{ url, error }` com mensagens claras em português
- **Compatibilidade mobile**: o input `accept="image/*"` já permite câmera no mobile; adicionar `capture="environment"` como opção

### 2. Atualizar `src/pages/Gastos.tsx`

- Importar e usar a função de upload do utilitário
- Adicionar feedback visual (toast) em caso de erro no upload
- Adicionar `accept="image/jpeg,image/png,image/webp"` no input
- Mostrar preview da imagem selecionada antes de enviar

### 3. Atualizar `src/pages/Encomendas.tsx`

- Mesmas melhorias do Gastos
- Adicionar preview da imagem selecionada
- Garantir que ao abrir detalhes, a `foto_url` existente é exibida (já funciona)

### 4. Compatibilidade Mobile

- Adicionar atributo `capture="environment"` no input file para abrir câmera diretamente no mobile
- O `accept="image/*"` já suportado dá opção de galeria ou câmera

## Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/lib/image-upload.ts` | **Novo** - utilitário de compressão, validação e upload |
| `src/pages/Gastos.tsx` | Usar utilitário, preview, validação |
| `src/pages/Encomendas.tsx` | Usar utilitário, preview, validação |

## Sem alteração de banco

O campo `foto_url` já existe em ambas as tabelas. Os buckets `notas_fiscais` e `encomendas_fotos` já existem e são públicos.

