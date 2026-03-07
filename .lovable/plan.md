

# Revisao Estrategica - Auditoria CTO

## Estado Atual do Projeto

O projeto esta bem estruturado para um MVP. A interface e consistente, a autenticacao funciona, e o isolamento multi-tenant via `empresa_id` e correto. Porem, existem problemas que precisam ser corrigidos antes de producao.

## Problemas Encontrados

### CRITICO

**1. RLS policies ainda RESTRICTIVE**
A migracao anterior recriou as policies sem `AS RESTRICTIVE` (que deveria defaultar para PERMISSIVE), mas o schema atual ainda mostra `Permissive: No`. Isso indica que a migracao pode nao ter sido aplicada, ou que as policies antigas nao foram devidamente removidas. Precisa de uma nova migracao explicitando `AS PERMISSIVE`.

**2. Trigger de recalculo nao esta conectado**
A funcao `recalcular_bases_e_produtos_ao_atualizar_insumo` existe no banco, mas a secao de triggers mostra "no triggers". Isso significa que ao atualizar o preco de um insumo, bases e produtos NAO recalculam automaticamente.

**3. Foreign keys ausentes**
Todas as tabelas mostram foreign keys vazias. Isso significa que a integridade referencial nao e garantida pelo banco - deletar um cartao nao remove suas faturas, deletar uma encomenda nao remove seus produtos, etc.

### IMPORTANTE

**4. Erro handling inconsistente**
- `Bases.tsx`: insert/update nao verificam erro
- `Encomendas.tsx`: insert/update nao verificam erro  
- `Insumos.tsx`: insert/update nao verificam erro
- `Cartoes.tsx`: insert/update nao verificam erro
- Apenas `Gastos.tsx` e `Faturamento.tsx` tratam erros corretamente

**5. Sem loading state no carregamento inicial**
Todas as paginas mostram "Nenhum item" enquanto os dados carregam, dando falsa impressao de que nao ha dados.

**6. Storage sem policies de acesso**
Os buckets `notas_fiscais` e `encomendas_fotos` sao publicos e sem RLS em `storage.objects`. Qualquer pessoa com a URL pode acessar as imagens.

### MELHORIAS

**7. React Query instalado mas nao utilizado**
O `@tanstack/react-query` esta instalado e o provider configurado, mas nenhuma pagina o utiliza. Todas fazem `useEffect + useState` manual.

**8. Logica de negocio acoplada aos componentes de pagina**
Toda logica de banco, calculos e manipulacao de estado esta dentro dos componentes de pagina. Nao existe camada de servicos ou hooks customizados.

## Plano de Correcoes (Priorizado)

### Etapa 1: Migracao SQL (Critico)

Uma unica migracao que:

1. Recria TODAS as policies explicitamente como `AS PERMISSIVE`
2. Cria o trigger que conecta a funcao de recalculo ao update de insumos
3. Adiciona foreign keys com `ON DELETE CASCADE` nas tabelas dependentes
4. Adiciona storage policies para os buckets

```text
Foreign keys a adicionar:
  base_insumos.base_id -> bases.id (CASCADE)
  base_insumos.insumo_id -> insumos.id (CASCADE)
  produto_componentes.produto_id -> produtos.id (CASCADE)
  encomenda_produtos.encomenda_id -> encomendas.id (CASCADE)
  faturas.cartao_id -> cartoes.id (CASCADE)
  itens_fatura.fatura_id -> faturas.id (CASCADE)
  gastos.cartao_id -> cartoes.id (SET NULL)
  perfis.empresa_id -> empresas.id (CASCADE)
  papeis_usuarios.user_id -> auth.users.id (CASCADE) [ja pode existir]
```

### Etapa 2: Error handling + loading states (Frontend)

Atualizar 5 paginas com padrao consistente:

- Adicionar estado `loading` em todas as paginas
- Verificar `error` em todas as operacoes de insert/update/delete
- Mostrar skeleton ou spinner durante carregamento inicial
- Tratar erros com toast descritivo

Paginas afetadas: `Bases.tsx`, `Encomendas.tsx`, `Insumos.tsx`, `Cartoes.tsx`, `CustosFixos.tsx`

Padrao a seguir (ja implementado em Gastos.tsx):
```tsx
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  setLoading(true);
  const { data, error } = await supabase.from("tabela")...
  if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
  setDados(data || []);
  setLoading(false);
};

// No JSX:
{loading ? <p>Carregando...</p> : dados.length === 0 ? <p>Nenhum item</p> : /* lista */}
```

E em submits:
```tsx
const { error } = await supabase.from("tabela").insert(payload);
if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
```

## Arquivos Afetados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Policies PERMISSIVE + trigger + FKs + storage policies |
| `src/pages/Bases.tsx` | Error handling + loading state |
| `src/pages/Encomendas.tsx` | Error handling + loading state |
| `src/pages/Insumos.tsx` | Error handling + loading state |
| `src/pages/Cartoes.tsx` | Error handling + loading state |
| `src/pages/CustosFixos.tsx` | Error handling + loading state |

## Fora do Escopo (Recomendacoes Futuras)

- Migrar para React Query (refactoring grande, melhor fazer incrementalmente)
- Extrair servicos de dados para `src/services/`
- Adicionar validacao com Zod nos formularios
- Implementar paginacao nas listas (atualmente sem limit em algumas queries)

