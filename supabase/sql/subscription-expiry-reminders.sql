create extension if not exists pgcrypto;

create table if not exists public.subscription_expiry_reminders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  days_before integer not null,
  expiry_date date not null,
  to_email text not null,
  status text not null default 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists subscription_expiry_reminders_unique
  on public.subscription_expiry_reminders(restaurant_id, days_before, expiry_date);

create index if not exists subscription_expiry_reminders_status_idx
  on public.subscription_expiry_reminders(status);

create index if not exists subscription_expiry_reminders_created_at_idx
  on public.subscription_expiry_reminders(created_at);
