

# 🧁 Gestão Confeitaria – Painel do Dono

Sistema completo de gestão estratégica para confeitaria com visual rosa pastel.

## Design
- Tema rosa pastel (#FDE1D3, #FFDEE2, #FFF1F0), cards arredondados, sombras leves
- Sidebar lateral com ícones suaves, tipografia clean e profissional

---

## Fase 1: Autenticação e Estrutura Base

### Banco de Dados (tabelas em português)
- `empresas` (id, nome, criado_em)
- `perfis` (id, empresa_id, nome, email, papel: admin/operador, criado_em)
- RLS com isolamento por empresa_id em todas as tabelas

### Autenticação
- Login, cadastro (cria empresa automaticamente), recuperar senha
- Visual rosa pastel na tela de login

### Layout Principal
- Sidebar: Dashboard, Faturamento, Gastos, Cartões, Custos Fixos, Insumos, Bases, Produtos, Encomendas
- Header com nome da empresa e perfil

---

## Fase 2: Dashboard

- Cards: Faturamento, Gastos, Custos Fixos, Lucro, Meta, Ticket Médio, % meta atingida, % comprometimento custos fixos
- Gráfico evolução faturamento (linha), gráfico por forma de pagamento (pizza)
- Próximas encomendas, total encomendas do mês
- Filtro: Hoje, 7 dias, 30 dias, Mês atual, Personalizado

---

## Fase 3: Faturamento

- Tabela `fechamentos_diarios` (id, empresa_id, data, cartao, pix, dinheiro, delivery, total, observacao, criado_em)
- Data única por empresa. Se já existir, editar
- Soma automática, extrato com filtros, gráficos por período

---

## Fase 4: Gastos

- Tabela `gastos` (id, empresa_id, data, fornecedor, descricao, categoria, valor, forma_pagamento, cartao_id, foto_url, criado_em)
- Upload de foto (Supabase Storage)
- Se cartão → selecionar cartão → lançar na fatura correta
- Extrato com filtros

---

## Fase 5: Cartões

- `cartoes` (id, empresa_id, nome, dia_fechamento, dia_vencimento, criado_em)
- `faturas` (id, cartao_id, mes_referencia, valor_total, paga, criado_em)
- `itens_fatura` (id, fatura_id, gasto_id, descricao, valor, parcela_atual, total_parcelas, criado_em)
- Lógica automática antes/depois do fechamento
- Parcelamento dividido nas próximas faturas
- Visualizar faturas por mês, marcar como paga, gráfico evolução

---

## Fase 6: Custos Fixos

- `custos_fixos` (id, empresa_id, nome, valor, dia_vencimento, observacao, criado_em)
- `metas_faturamento` (id, empresa_id, mes_referencia, valor_meta, criado_em)
- Cálculo: % custos fixos sobre meta, quanto o faturamento atual cobre

---

## Fase 7: Insumos

- `insumos` (id, empresa_id, nome, tipo, valor_pago, quantidade_comprada, unidade, custo_por_grama, custo_por_unidade, criado_em)
- Tipo: Insumo ou Embalagem
- Cálculos automáticos, listagem alfabética, filtro por tipo

---

## Fase 8: Bases

- `bases` (id, empresa_id, nome, rendimento_quantidade, rendimento_unidade, custo_total, custo_por_rendimento, criado_em)
- `base_insumos` (id, base_id, insumo_id, quantidade_usada, criado_em)
- Busca automática de insumos, cálculo de custo total e por rendimento

---

## Fase 9: Produtos (Ficha Técnica)

- `produtos` (id, empresa_id, nome, tipo_venda, custo_total, perc_custo_fixo, perc_lucro, perc_taxa_cartao, perc_taxa_delivery, preco_ideal, criado_em)
- `produto_componentes` (id, produto_id, tipo_componente, componente_id, quantidade, criado_em)
- Adicionar bases, insumos, embalagens
- Gera preço ideal com breakdown detalhado

---

## Fase 10: Agenda de Encomendas

- `encomendas` (id, empresa_id, cliente_nome, cliente_telefone, data_retirada, hora_retirada, observacao, foto_url, valor_total, valor_entrada, valor_restante, status, criado_em)
- `encomenda_produtos` (id, encomenda_id, produto_id, quantidade, criado_em)
- Visualização lista e calendário, total do mês, integração Dashboard

---

## Regras Globais
- Valores em R$ (formato brasileiro)
- Dropdowns em ordem alfabética
- Filtros por período em todas as telas
- RLS por empresa_id
- Todas as tabelas e colunas em português

