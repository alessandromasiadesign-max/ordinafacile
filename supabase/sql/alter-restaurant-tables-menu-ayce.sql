-- Aggiunge ai tavoli la possibilità di scegliere il menu (event_id)
-- e la modalità all-you-can-eat (ordina senza pagare, paga alla cassa)

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

-- Modalità all-you-can-eat: il cliente ordina senza pagare online
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_tables' AND column_name = 'all_you_can_eat'
  ) THEN
    ALTER TABLE public.restaurant_tables ADD COLUMN all_you_can_eat BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Persiste la modalità all-you-can-eat sull'ordine per agevolarne la gestione in cassa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'all_you_can_eat'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN all_you_can_eat BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
