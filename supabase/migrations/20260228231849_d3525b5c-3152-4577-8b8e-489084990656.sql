
-- Enum para papéis
CREATE TYPE public.papel_usuario AS ENUM ('admin', 'operador');

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.atualizar_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2. Perfis
CREATE TABLE public.perfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 3. Papéis de usuários
CREATE TABLE public.papeis_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  papel papel_usuario NOT NULL DEFAULT 'admin',
  UNIQUE(user_id, papel)
);
ALTER TABLE public.papeis_usuarios ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar papel
CREATE OR REPLACE FUNCTION public.tem_papel(_user_id uuid, _papel papel_usuario)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.papeis_usuarios
    WHERE user_id = _user_id AND papel = _papel
  )
$$;

-- 4. Fechamentos Diários
CREATE TABLE public.fechamentos_diarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  cartao NUMERIC(12,2) NOT NULL DEFAULT 0,
  pix NUMERIC(12,2) NOT NULL DEFAULT 0,
  dinheiro NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, data)
);
ALTER TABLE public.fechamentos_diarios ENABLE ROW LEVEL SECURITY;

-- 5. Cartões
CREATE TABLE public.cartoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

-- 6. Faturas
CREATE TABLE public.faturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paga BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- 7. Gastos
CREATE TABLE public.gastos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  fornecedor TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  cartao_id UUID REFERENCES public.cartoes(id),
  parcelas INTEGER DEFAULT 1,
  foto_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- 8. Itens da Fatura
CREATE TABLE public.itens_fatura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  gasto_id UUID REFERENCES public.gastos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  parcela_atual INTEGER NOT NULL DEFAULT 1,
  total_parcelas INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.itens_fatura ENABLE ROW LEVEL SECURITY;

-- 9. Custos Fixos
CREATE TABLE public.custos_fixos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custos_fixos ENABLE ROW LEVEL SECURITY;

-- 10. Metas de Faturamento
CREATE TABLE public.metas_faturamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor_meta NUMERIC(12,2) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, mes_referencia)
);
ALTER TABLE public.metas_faturamento ENABLE ROW LEVEL SECURITY;

-- 11. Insumos
CREATE TABLE public.insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Insumo', 'Embalagem')),
  valor_pago NUMERIC(12,2) NOT NULL,
  quantidade_comprada NUMERIC(12,4) NOT NULL,
  unidade TEXT NOT NULL CHECK (unidade IN ('Kg', 'g', 'Unidade', 'ml', 'L')),
  custo_por_grama NUMERIC(12,6),
  custo_por_unidade NUMERIC(12,6),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

-- 12. Bases
CREATE TABLE public.bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  rendimento_quantidade NUMERIC(12,4),
  rendimento_unidade TEXT CHECK (rendimento_unidade IN ('Unidade', 'g', 'Kg', 'ml', 'L')),
  custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_por_rendimento NUMERIC(12,6),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;

-- 13. Base Insumos
CREATE TABLE public.base_insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  quantidade_usada NUMERIC(12,4) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.base_insumos ENABLE ROW LEVEL SECURITY;

-- 14. Produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_venda TEXT NOT NULL CHECK (tipo_venda IN ('Unidade', 'Quilo')),
  custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  perc_custo_fixo NUMERIC(5,2) DEFAULT 0,
  perc_lucro NUMERIC(5,2) DEFAULT 0,
  perc_taxa_cartao NUMERIC(5,2) DEFAULT 0,
  perc_taxa_delivery NUMERIC(5,2) DEFAULT 0,
  preco_ideal NUMERIC(12,2) DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 15. Produto Componentes
CREATE TABLE public.produto_componentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo_componente TEXT NOT NULL CHECK (tipo_componente IN ('Base', 'Insumo', 'Embalagem')),
  componente_id UUID NOT NULL,
  quantidade NUMERIC(12,4) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produto_componentes ENABLE ROW LEVEL SECURITY;

-- 16. Encomendas
CREATE TABLE public.encomendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  data_retirada DATE NOT NULL,
  hora_retirada TIME,
  observacao TEXT,
  foto_url TEXT,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_entrada NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_restante NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Produção', 'Pronta', 'Entregue', 'Cancelada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

-- 17. Encomenda Produtos
CREATE TABLE public.encomenda_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encomenda_id UUID NOT NULL REFERENCES public.encomendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  nome_produto TEXT NOT NULL,
  quantidade NUMERIC(12,4) NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.encomenda_produtos ENABLE ROW LEVEL SECURITY;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('notas_fiscais', 'notas_fiscais', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('encomendas_fotos', 'encomendas_fotos', true);

-- Helper function
CREATE OR REPLACE FUNCTION public.get_empresa_id_do_usuario()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE user_id = auth.uid()
$$;

-- ============= RLS POLICIES =============

-- Empresas
CREATE POLICY "Usuarios veem sua empresa" ON public.empresas FOR SELECT USING (id = public.get_empresa_id_do_usuario());
CREATE POLICY "Usuarios atualizam sua empresa" ON public.empresas FOR UPDATE USING (id = public.get_empresa_id_do_usuario());

-- Perfis
CREATE POLICY "Usuarios veem perfis da empresa" ON public.perfis FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Usuarios criam perfil" ON public.perfis FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuarios atualizam perfil" ON public.perfis FOR UPDATE USING (user_id = auth.uid());

-- Papéis
CREATE POLICY "Usuarios veem seus papeis" ON public.papeis_usuarios FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sistema cria papeis" ON public.papeis_usuarios FOR INSERT WITH CHECK (user_id = auth.uid());

-- Fechamentos diários
CREATE POLICY "Empresa vê fechamentos" ON public.fechamentos_diarios FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria fechamentos" ON public.fechamentos_diarios FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza fechamentos" ON public.fechamentos_diarios FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta fechamentos" ON public.fechamentos_diarios FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Cartões
CREATE POLICY "Empresa vê cartoes" ON public.cartoes FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria cartoes" ON public.cartoes FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza cartoes" ON public.cartoes FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta cartoes" ON public.cartoes FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Faturas
CREATE POLICY "Empresa vê faturas" ON public.faturas FOR SELECT USING (cartao_id IN (SELECT id FROM public.cartoes WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa cria faturas" ON public.faturas FOR INSERT WITH CHECK (cartao_id IN (SELECT id FROM public.cartoes WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa atualiza faturas" ON public.faturas FOR UPDATE USING (cartao_id IN (SELECT id FROM public.cartoes WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa deleta faturas" ON public.faturas FOR DELETE USING (cartao_id IN (SELECT id FROM public.cartoes WHERE empresa_id = public.get_empresa_id_do_usuario()));

-- Gastos
CREATE POLICY "Empresa vê gastos" ON public.gastos FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria gastos" ON public.gastos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza gastos" ON public.gastos FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta gastos" ON public.gastos FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Itens fatura
CREATE POLICY "Empresa vê itens fatura" ON public.itens_fatura FOR SELECT USING (fatura_id IN (SELECT f.id FROM public.faturas f JOIN public.cartoes c ON f.cartao_id = c.id WHERE c.empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa cria itens fatura" ON public.itens_fatura FOR INSERT WITH CHECK (fatura_id IN (SELECT f.id FROM public.faturas f JOIN public.cartoes c ON f.cartao_id = c.id WHERE c.empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa atualiza itens fatura" ON public.itens_fatura FOR UPDATE USING (fatura_id IN (SELECT f.id FROM public.faturas f JOIN public.cartoes c ON f.cartao_id = c.id WHERE c.empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa deleta itens fatura" ON public.itens_fatura FOR DELETE USING (fatura_id IN (SELECT f.id FROM public.faturas f JOIN public.cartoes c ON f.cartao_id = c.id WHERE c.empresa_id = public.get_empresa_id_do_usuario()));

-- Custos Fixos
CREATE POLICY "Empresa vê custos fixos" ON public.custos_fixos FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria custos fixos" ON public.custos_fixos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza custos fixos" ON public.custos_fixos FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta custos fixos" ON public.custos_fixos FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Metas faturamento
CREATE POLICY "Empresa vê metas" ON public.metas_faturamento FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria metas" ON public.metas_faturamento FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza metas" ON public.metas_faturamento FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta metas" ON public.metas_faturamento FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Insumos
CREATE POLICY "Empresa vê insumos" ON public.insumos FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria insumos" ON public.insumos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza insumos" ON public.insumos FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta insumos" ON public.insumos FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Bases
CREATE POLICY "Empresa vê bases" ON public.bases FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria bases" ON public.bases FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza bases" ON public.bases FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta bases" ON public.bases FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Base Insumos
CREATE POLICY "Empresa vê base insumos" ON public.base_insumos FOR SELECT USING (base_id IN (SELECT id FROM public.bases WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa cria base insumos" ON public.base_insumos FOR INSERT WITH CHECK (base_id IN (SELECT id FROM public.bases WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa atualiza base insumos" ON public.base_insumos FOR UPDATE USING (base_id IN (SELECT id FROM public.bases WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa deleta base insumos" ON public.base_insumos FOR DELETE USING (base_id IN (SELECT id FROM public.bases WHERE empresa_id = public.get_empresa_id_do_usuario()));

-- Produtos
CREATE POLICY "Empresa vê produtos" ON public.produtos FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria produtos" ON public.produtos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza produtos" ON public.produtos FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta produtos" ON public.produtos FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Produto Componentes
CREATE POLICY "Empresa vê produto componentes" ON public.produto_componentes FOR SELECT USING (produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa cria produto componentes" ON public.produto_componentes FOR INSERT WITH CHECK (produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa atualiza produto componentes" ON public.produto_componentes FOR UPDATE USING (produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa deleta produto componentes" ON public.produto_componentes FOR DELETE USING (produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id_do_usuario()));

-- Encomendas
CREATE POLICY "Empresa vê encomendas" ON public.encomendas FOR SELECT USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa cria encomendas" ON public.encomendas FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa atualiza encomendas" ON public.encomendas FOR UPDATE USING (empresa_id = public.get_empresa_id_do_usuario());
CREATE POLICY "Empresa deleta encomendas" ON public.encomendas FOR DELETE USING (empresa_id = public.get_empresa_id_do_usuario());

-- Encomenda Produtos
CREATE POLICY "Empresa vê encomenda produtos" ON public.encomenda_produtos FOR SELECT USING (encomenda_id IN (SELECT id FROM public.encomendas WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa cria encomenda produtos" ON public.encomenda_produtos FOR INSERT WITH CHECK (encomenda_id IN (SELECT id FROM public.encomendas WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa atualiza encomenda produtos" ON public.encomenda_produtos FOR UPDATE USING (encomenda_id IN (SELECT id FROM public.encomendas WHERE empresa_id = public.get_empresa_id_do_usuario()));
CREATE POLICY "Empresa deleta encomenda produtos" ON public.encomenda_produtos FOR DELETE USING (encomenda_id IN (SELECT id FROM public.encomendas WHERE empresa_id = public.get_empresa_id_do_usuario()));

-- Storage policies
CREATE POLICY "Usuarios autenticados podem upload notas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notas_fiscais' AND auth.uid() IS NOT NULL);
CREATE POLICY "Notas fiscais publicas" ON storage.objects FOR SELECT USING (bucket_id = 'notas_fiscais');
CREATE POLICY "Usuarios autenticados podem upload fotos encomendas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'encomendas_fotos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Fotos encomendas publicas" ON storage.objects FOR SELECT USING (bucket_id = 'encomendas_fotos');

-- Trigger timestamp
CREATE TRIGGER atualizar_fechamentos_atualizado_em
  BEFORE UPDATE ON public.fechamentos_diarios
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

-- Trigger signup automático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nova_empresa_id UUID;
BEGIN
  INSERT INTO public.empresas (nome) 
  VALUES (COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Confeitaria'))
  RETURNING id INTO nova_empresa_id;
  
  INSERT INTO public.perfis (user_id, empresa_id, nome, email)
  VALUES (NEW.id, nova_empresa_id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  
  INSERT INTO public.papeis_usuarios (user_id, papel)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
