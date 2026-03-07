

# Auditoria Arquitetural e Correção de Isolamento de Dados

## Problema Principal Identificado

**Todas as RLS policies do projeto estão criadas como RESTRICTIVE (não-permissivas).** Em PostgreSQL, quando existem apenas policies restrictive e nenhuma permissive, o comportamento padrão é negar todo acesso. Isso pode causar comportamento inconsistente dependendo da versão/configuração, resultando em vazamento de dados entre empresas.

A correção é **recriar todas as policies como PERMISSIVE** (o padrão do PostgreSQL), garantindo isolamento correto.

## Problemas Encontrados

### 1. RLS Policies RESTRICTIVE (CRÍTICO)
Todas as 30+ policies em todas as tabelas estão como `AS RESTRICTIVE`. Devem ser `PERMISSIVE` para funcionar corretamente como filtros de acesso.

**Tabelas afetadas:** `base_insumos`, `bases`, `cartoes`, `custos_fixos`, `empresas`, `encomenda_produtos`, `encomendas`, `faturas`, `fechamentos_diarios`, `gastos`, `insumos`, `itens_fatura`, `metas_faturamento`, `papeis_usuarios`, `perfis`, `produto_componentes`, `produtos`

### 2. Queries sem filtro empresa_id no Dashboard (CRÍTICO)
No `Dashboard.tsx`, duas queries de `faturas` não filtram por empresa:
- Linha 101-106: faturas pagas — sem filtro empresa
- Linha 113-116: faturas em aberto — sem filtro empresa

Essas queries dependem apenas do RLS (via join cartoes→empresa_id), mas se o RLS estiver inconsistente, retornam dados de todas as empresas.

### 3. Falta de índices de performance
Nenhuma coluna `empresa_id` ou `cartao_id` possui índice explícito, impactando performance à medida que o sistema escala.

### 4. Storage sem isolamento adicional
O upload já organiza por `empresaId/timestamp.ext`, o que é adequado. Os buckets são públicos — o que significa que qualquer pessoa com a URL pode acessar as imagens. Isso é aceitável para notas fiscais/fotos de encomendas, mas deve ser documentado.

## Plano de Correções

### Etapa 1: Migração — Recriar todas as RLS policies como PERMISSIVE

Uma única migração SQL que:
1. DROP todas as policies restrictive existentes
2. Recria todas como PERMISSIVE com a mesma lógica (`empresa_id = get_empresa_id_do_usuario()` ou equivalente via join)

Isso cobre todas as 17 tabelas e ~40 policies.

### Etapa 2: Migração — Adicionar índices de performance

```sql
CREATE INDEX idx_gastos_empresa_id ON gastos(empresa_id);
CREATE INDEX idx_encomendas_empresa_id ON encomendas(empresa_id);
CREATE INDEX idx_cartoes_empresa_id ON cartoes(empresa_id);
CREATE INDEX idx_insumos_empresa_id ON insumos(empresa_id);
CREATE INDEX idx_bases_empresa_id ON bases(empresa_id);
CREATE INDEX idx_produtos_empresa_id ON produtos(empresa_id);
CREATE INDEX idx_fechamentos_empresa_id ON fechamentos_diarios(empresa_id);
CREATE INDEX idx_custos_fixos_empresa_id ON custos_fixos(empresa_id);
CREATE INDEX idx_metas_empresa_id ON metas_faturamento(empresa_id);
CREATE INDEX idx_faturas_cartao_id ON faturas(cartao_id);
CREATE INDEX idx_itens_fatura_fatura_id ON itens_fatura(fatura_id);
CREATE INDEX idx_base_insumos_base_id ON base_insumos(base_id);
CREATE INDEX idx_produto_componentes_produto_id ON produto_componentes(produto_id);
CREATE INDEX idx_encomenda_produtos_encomenda_id ON encomenda_produtos(encomenda_id);
CREATE INDEX idx_perfis_user_id ON perfis(user_id);
```

### Etapa 3: Corrigir queries sem filtro no Dashboard

Em `src/pages/Dashboard.tsx`:
- Query de faturas pagas (linha 101): adicionar join via cartoes com filtro empresa_id
- Query de faturas em aberto (linha 113): adicionar join via cartoes com filtro empresa_id

Abordagem: buscar os IDs dos cartões da empresa primeiro, depois filtrar faturas por `cartao_id.in(cartaoIds)`.

## Nota sobre a Arquitetura

O projeto usa `empresa_id` (não `user_id`) para isolamento multi-tenant. Este é o padrão correto para SaaS onde múltiplos usuários de uma mesma empresa compartilham dados. **Não** se deve adicionar `user_id` em todas as tabelas — isso quebraria o modelo multi-tenant.

## Arquivos Afetados

| Arquivo | Alteração |
|---|---|
| Migração SQL | Recriar ~40 policies como PERMISSIVE + adicionar índices |
| `src/pages/Dashboard.tsx` | Filtrar queries de faturas por empresa |

