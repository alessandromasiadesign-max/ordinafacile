-- Ordina Facile: Order capacity limiter (max orders per time window)
-- Run this in Supabase SQL editor.

-- 1) Helper function: read restaurant settings and decide if a new order can be accepted
create or replace function public.can_accept_order(p_restaurant_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_settings jsonb;
  v_enabled boolean;
  v_max_orders int;
  v_window_minutes int;
  v_count int;
begin
  select r.settings into v_settings
  from public.restaurants r
  where r.id = p_restaurant_id;

  v_enabled := coalesce((v_settings->'order_capacity'->>'enabled')::boolean, false);
  if not v_enabled then
    return true;
  end if;

  v_max_orders := greatest(coalesce((v_settings->'order_capacity'->>'max_orders')::int, 0), 0);
  v_window_minutes := greatest(coalesce((v_settings->'order_capacity'->>'window_minutes')::int, 30), 1);

  -- If enabled but max_orders is 0, treat as "no orders allowed"
  select count(*) into v_count
  from public.orders o
  where o.restaurant_id = p_restaurant_id
    and o.created_at >= (now() - make_interval(mins => v_window_minutes));

  return v_count < v_max_orders;
end;
$$;

-- 2) Trigger that blocks inserts when the limit is exceeded
create or replace function public.enforce_order_capacity()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.can_accept_order(new.restaurant_id) then
    raise exception 'ORDER_CAPACITY_EXCEEDED'
      using errcode = 'P0001',
            hint = 'Riprova tra qualche minuto';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_order_capacity on public.orders;
create trigger trg_enforce_order_capacity
before insert on public.orders
for each row
execute function public.enforce_order_capacity();

-- 3) Permissions
-- Allow authenticated and anon to execute the helper functions if needed (trigger runs regardless).
-- This is safe because function only returns a boolean.
grant execute on function public.can_accept_order(uuid) to anon, authenticated;
