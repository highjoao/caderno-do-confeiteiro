

# Plano: Corrigir mascara monetaria e bug de anexos

## Problema 1: Mascara monetaria

A mascara atual trata digitos como valor inteiro (ex: "1" → "1,00"). O comportamento correto e tratar TODOS os digitos como centavos (dividir por 100):

| Digitado | Atual | Correto |
|---|---|---|
| 1 | 1,00 | 0,01 |
| 10 | 10,00 | 0,10 |
| 100 | 100,00 | 1,00 |
| 1000 | 1.000,00 | 10,00 |

### Correcao

Alterar `maskCurrency` em `src/lib/currency-mask.ts` para SEMPRE dividir por 100:

```typescript
export function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

Alterar `numberToMask` para converter valor numerico do banco para o formato compativel com a mascara (nao muda, pois ja formata corretamente para exibicao em edit forms).

## Problema 2: Bug de anexos (nota fiscal / foto encomenda)

Os buckets `notas_fiscais` e `encomendas_fotos` sao **privados**, mas o codigo usa `getPublicUrl` que retorna uma URL publica que nao funciona em buckets privados. Resultado: imagem salva mas nao aparece.

### Correcao

**Ao salvar**: Gravar apenas o **path** do arquivo (nao a URL publica completa).

**Ao exibir**: Gerar uma signed URL temporaria via `createSignedUrl`.

Arquivos afetados:
- `src/pages/Gastos.tsx` — upload salva path; exibicao usa signed URL
- `src/pages/Encomendas.tsx` — mesma correcao

Implementacao:
1. No upload, salvar apenas o `fileName` (path relativo) no campo `foto_url`
2. Criar helper `getSignedUrl(bucket, path)` que retorna URL assinada
3. No detail dialog, ao abrir item com `foto_url`, gerar signed URL via `useEffect`
4. Tratar backward compatibility: se `foto_url` ja contem URL completa, extrair o path

## Arquivos afetados

| Arquivo | Alteracao |
|---|---|
| `src/lib/currency-mask.ts` | Mudar `maskCurrency` para sempre dividir por 100 |
| `src/pages/Gastos.tsx` | Upload salva path; exibicao usa signed URL |
| `src/pages/Encomendas.tsx` | Upload salva path; exibicao usa signed URL |

