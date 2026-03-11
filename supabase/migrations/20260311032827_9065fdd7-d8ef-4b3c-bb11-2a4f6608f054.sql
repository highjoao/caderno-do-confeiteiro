
-- Add data_compra column to itens_fatura
ALTER TABLE public.itens_fatura ADD COLUMN IF NOT EXISTS data_compra date;

-- Add categoria column to itens_fatura for manual purchases
ALTER TABLE public.itens_fatura ADD COLUMN IF NOT EXISTS categoria text;

-- Create trigger function to sync gasto deletion with itens_fatura
CREATE OR REPLACE FUNCTION public.sync_delete_gasto_itens_fatura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _fatura RECORD;
BEGIN
  -- For each fatura affected, remove items and recalculate
  FOR _fatura IN
    SELECT DISTINCT f.id, f.valor_total
    FROM itens_fatura it
    JOIN faturas f ON f.id = it.fatura_id
    WHERE it.gasto_id = OLD.id
  LOOP
    -- Delete the items
    DELETE FROM itens_fatura WHERE gasto_id = OLD.id AND fatura_id = _fatura.id;
    -- Recalculate fatura total
    UPDATE faturas SET valor_total = COALESCE((
      SELECT SUM(valor) FROM itens_fatura WHERE fatura_id = _fatura.id
    ), 0) WHERE id = _fatura.id;
  END LOOP;
  RETURN OLD;
END;
$$;

-- Create trigger on gastos table BEFORE DELETE
CREATE TRIGGER trg_sync_delete_gasto_itens_fatura
  BEFORE DELETE ON public.gastos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_delete_gasto_itens_fatura();
