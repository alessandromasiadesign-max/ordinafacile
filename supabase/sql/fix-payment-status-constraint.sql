-- Fix: aggiorna il constraint payment_status per includere tutti i valori supportati
-- Esegui questo script una volta nel SQL Editor di Supabase

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
