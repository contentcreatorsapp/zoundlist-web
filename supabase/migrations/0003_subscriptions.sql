-- ============================================================
-- ZOUNDLIST — Fase 4: campos de suscripción (Stripe) en profiles
-- Ejecutar en Supabase → SQL Editor (después de 0001/0002).
-- ============================================================

alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan                   text,
  add column if not exists subscription_status    text,
  add column if not exists current_period_end     timestamptz;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

-- Seguridad: el usuario NO debe poder auto-asignarse un plan.
-- Quitamos la política de update del cliente; los campos de billing los
-- escribe solo el servidor con la service-role key (checkout + webhook).
drop policy if exists "profiles_update_own" on public.profiles;
