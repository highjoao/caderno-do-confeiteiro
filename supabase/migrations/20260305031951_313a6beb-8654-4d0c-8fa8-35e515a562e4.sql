
-- 1) Add rendimento_quantidade to produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS rendimento_quantidade numeric DEFAULT 1;

-- 2) Create function to recalculate bases when insumo changes
CREATE OR REPLACE FUNCTION public.recalcular_bases_e_produtos_ao_atualizar_insumo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _base RECORD;
  _produto RECORD;
  _novo_custo numeric;
  _novo_custo_rendimento numeric;
  _novo_custo_produto numeric;
  _novo_preco numeric;
  _total_perc numeric;
  _rendimento numeric;
BEGIN
  -- Recalculate all bases that use this insumo
  FOR _base IN
    SELECT DISTINCT b.id, b.rendimento_quantidade, b.rendimento_unidade
    FROM bases b
    JOIN base_insumos bi ON bi.base_id = b.id
    WHERE bi.insumo_id = NEW.id
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN i.unidade IN ('g','Kg') THEN COALESCE(i.custo_por_grama, 0) * bi.quantidade_usada
        WHEN i.unidade IN ('ml','L') THEN COALESCE(i.custo_por_grama, 0) * bi.quantidade_usada
        ELSE COALESCE(i.custo_por_unidade, 0) * bi.quantidade_usada
      END
    ), 0) INTO _novo_custo
    FROM base_insumos bi
    JOIN insumos i ON i.id = bi.insumo_id
    WHERE bi.base_id = _base.id;

    _novo_custo_rendimento := CASE
      WHEN COALESCE(_base.rendimento_quantidade, 1) > 0 THEN _novo_custo / _base.rendimento_quantidade
      ELSE _novo_custo
    END;

    UPDATE bases SET custo_total = _novo_custo, custo_por_rendimento = _novo_custo_rendimento
    WHERE id = _base.id;
  END LOOP;

  -- Recalculate all products that use this insumo directly
  FOR _produto IN
    SELECT DISTINCT p.id, p.perc_custo_fixo, p.perc_lucro, p.perc_taxa_cartao, p.perc_taxa_delivery, p.rendimento_quantidade
    FROM produtos p
    JOIN produto_componentes pc ON pc.produto_id = p.id
    WHERE (pc.tipo_componente = 'Insumo' AND pc.componente_id = NEW.id)
       OR (pc.tipo_componente = 'Embalagem' AND pc.componente_id = NEW.id)
       OR (pc.tipo_componente = 'Base' AND pc.componente_id IN (
            SELECT DISTINCT b.id FROM bases b JOIN base_insumos bi ON bi.base_id = b.id WHERE bi.insumo_id = NEW.id
          ))
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN pc.tipo_componente = 'Base' THEN
          COALESCE((SELECT custo_por_rendimento FROM bases WHERE id = pc.componente_id), 0) * pc.quantidade
        ELSE
          CASE
            WHEN pc.unidade_medida = 'Kg' AND i.unidade IN ('g','Kg') THEN COALESCE(i.custo_por_grama, 0) * pc.quantidade * 1000
            WHEN pc.unidade_medida = 'g' AND i.unidade IN ('g','Kg') THEN COALESCE(i.custo_por_grama, 0) * pc.quantidade
            WHEN pc.unidade_medida = 'L' AND i.unidade IN ('ml','L') THEN COALESCE(i.custo_por_grama, 0) * pc.quantidade * 1000
            WHEN pc.unidade_medida = 'ml' AND i.unidade IN ('ml','L') THEN COALESCE(i.custo_por_grama, 0) * pc.quantidade
            ELSE COALESCE(i.custo_por_unidade, 0) * pc.quantidade
          END
      END
    ), 0) INTO _novo_custo_produto
    FROM produto_componentes pc
    LEFT JOIN insumos i ON i.id = pc.componente_id AND pc.tipo_componente IN ('Insumo','Embalagem')
    WHERE pc.produto_id = _produto.id;

    _total_perc := COALESCE(_produto.perc_custo_fixo, 0) + COALESCE(_produto.perc_lucro, 0) + COALESCE(_produto.perc_taxa_cartao, 0) + COALESCE(_produto.perc_taxa_delivery, 0);
    _rendimento := COALESCE(_produto.rendimento_quantidade, 1);
    IF _rendimento <= 0 THEN _rendimento := 1; END IF;

    _novo_preco := _novo_custo_produto * (1 + _total_perc / 100) / _rendimento;

    UPDATE produtos SET custo_total = _novo_custo_produto, preco_ideal = _novo_preco
    WHERE id = _produto.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3) Create trigger
DROP TRIGGER IF EXISTS trg_recalcular_ao_atualizar_insumo ON public.insumos;
CREATE TRIGGER trg_recalcular_ao_atualizar_insumo
  AFTER UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.recalcular_bases_e_produtos_ao_atualizar_insumo();
