-- Stargate Edu D-Day 이벤트 캘린더
-- Supabase SQL Editor에서 실행하십시오.

create table if not exists public.dday_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_date date not null,
  category text not null default 'personal'
    check (category in ('exam', 'school', 'personal', 'work', 'holiday', 'other')),
  color text not null default '#4f8fff',
  memo text not null default '',
  pinned boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dday_events_target_date_idx
  on public.dday_events (status, target_date);

create index if not exists dday_events_pinned_idx
  on public.dday_events (pinned desc, target_date);

create or replace function public.set_dday_events_updated_at()
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

drop trigger if exists trg_dday_events_updated_at on public.dday_events;
create trigger trg_dday_events_updated_at
  before update on public.dday_events
  for each row execute function public.set_dday_events_updated_at();

alter table public.dday_events enable row level security;

drop policy if exists "public can read active dday events" on public.dday_events;
create policy "public can read active dday events"
  on public.dday_events
  for select to anon, authenticated
  using (status in ('active', 'archived'));

drop policy if exists "anon can insert dday events" on public.dday_events;
create policy "anon can insert dday events"
  on public.dday_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists "anon can update dday events" on public.dday_events;
create policy "anon can update dday events"
  on public.dday_events
  for update to anon, authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
