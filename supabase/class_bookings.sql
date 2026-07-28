-- Stargate Edu 수업 예약 캘린더
-- Supabase SQL Editor에서 실행하거나 apply 스크립트로 적용하십시오.

create table if not exists public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  student_name text not null,
  phone text not null,
  email text not null default '',
  subject text not null,
  note text not null default '',
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_bookings_slot_unique unique (slot_key)
);

create index if not exists class_bookings_starts_at_idx
  on public.class_bookings (starts_at);

create index if not exists class_bookings_status_starts_idx
  on public.class_bookings (status, starts_at);

create or replace function public.set_class_bookings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_class_bookings_updated_at on public.class_bookings;
create trigger trg_class_bookings_updated_at
  before update on public.class_bookings
  for each row execute function public.set_class_bookings_updated_at();

alter table public.class_bookings enable row level security;

drop policy if exists "public can read confirmed class bookings"
  on public.class_bookings;
create policy "public can read confirmed class bookings"
  on public.class_bookings
  for select to anon, authenticated
  using (status = 'confirmed');

drop policy if exists "anon can insert class bookings"
  on public.class_bookings;
create policy "anon can insert class bookings"
  on public.class_bookings
  for insert to anon, authenticated
  with check (status = 'confirmed');

drop policy if exists "anon can cancel class bookings"
  on public.class_bookings;
create policy "anon can cancel class bookings"
  on public.class_bookings
  for update to anon, authenticated
  using (status = 'confirmed')
  with check (status in ('confirmed', 'cancelled'));

notify pgrst, 'reload schema';
