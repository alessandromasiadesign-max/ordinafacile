-- Aggiunge ai tavoli la possibilità di scegliere il menu (event_id)
-- e la modalità "paga alla cassa" (ordina senza pagare online, paga a fine servizio)

-- Menu associato al tavolo (NULL = menu standard del ristorante)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_tables' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.restaurant_tables ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rinomina eventuale colonna legacy all_you_can_eat in pay_at_counter
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_tables' AND column_name = 'all_you_can_eat'
  ) THEN
    ALTER TABLE public.restaurant_tables RENAME COLUMN all_you_can_eat TO pay_at_counter;
  END IF;
END $$;

-- Modalità paga alla cassa sul tavolo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_tables' AND column_name = 'pay_at_counter'
  ) THEN
    ALTER TABLE public.restaurant_tables ADD COLUMN pay_at_counter BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Rinomina eventuale colonna legacy all_you_can_eat in pay_at_counter sugli ordini
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'all_you_can_eat'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN all_you_can_eat TO pay_at_counter;
  END IF;
END $$;

-- Persiste la modalità paga alla cassa sull'ordine per agevolarne la gestione in cassa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pay_at_counter'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN pay_at_counter BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;