-- Tabella per la gestione dei tavoli del ristorante e QR code
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice per filtrare rapidamente i tavoli di un ristorante
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id ON public.restaurant_tables(restaurant_id);

-- Abilita Row Level Security
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Policy: i ristoratori possono vedere solo i tavoli del proprio ristorante
CREATE POLICY "restaurant_tables_select_own" ON public.restaurant_tables
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

-- Policy: i clienti anonimi possono leggere i tavoli attivi per ordinare dal QR code
CREATE POLICY "restaurant_tables_select_public" ON public.restaurant_tables
  FOR SELECT USING (is_active = true);

-- Policy: i ristoratori possono inserire tavoli solo per il proprio ristorante
CREATE POLICY "restaurant_tables_insert_own" ON public.restaurant_tables
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

-- Policy: i ristoratori possono aggiornare solo i tavoli del proprio ristorante
CREATE POLICY "restaurant_tables_update_own" ON public.restaurant_tables
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

-- Policy: i ristoratori possono eliminare solo i tavoli del proprio ristorante
CREATE POLICY "restaurant_tables_delete_own" ON public.restaurant_tables
  FOR DELETE USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_restaurant_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restaurant_tables_updated_at ON public.restaurant_tables;
CREATE TRIGGER trg_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_restaurant_tables_updated_at();

-- Aggiungi colonne per il tavolo nella tabella ordini se non esistono già
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'table_id') THEN
    ALTER TABLE public.orders ADD COLUMN table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'table_name') THEN
    ALTER TABLE public.orders ADD COLUMN table_name TEXT;
  END IF;
END $$;
