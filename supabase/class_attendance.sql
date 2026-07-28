-- Stargate Edu 수업 출결 · 당일 보고서
-- Supabase SQL Editor에서 실행하거나 apply 스크립트로 적용하십시오.

create table if not exists public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null,
  starts_at timestamptz not null,
  student_name text not null default '',
  phone text not null default '',
  subject text not null default '',
  attendance text not null default 'pending'
    check (attendance in ('pending', 'present', 'late', 'absent', 'excused')),
  homework text not null default '',
  progress text not null default '',
  memo text not null default '',
  report_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_attendance_slot_unique unique (slot_key)
);

create index if not exists class_attendance_report_date_idx
  on public.class_attendance (report_date desc);

create index if not exists class_attendance_status_idx
  on public.class_attendance (attendance, report_date);

create table if not exists public.class_daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  summary text not null default '',
  highlights text not null default '',
  issues text not null default '',
  next_plan text not null default '',
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_daily_reports_date_unique unique (report_date)
);

create or replace function public.set_class_report_updated_at()
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

drop trigger if exists trg_class_attendance_updated_at on public.class_attendance;
create trigger trg_class_attendance_updated_at
  before update on public.class_attendance
  for each row execute function public.set_class_report_updated_at();

drop trigger if exists trg_class_daily_reports_updated_at on public.class_daily_reports;
create trigger trg_class_daily_reports_updated_at
  before update on public.class_daily_reports
  for each row execute function public.set_class_report_updated_at();

alter table public.class_attendance enable row level security;
alter table public.class_daily_reports enable row level security;

drop policy if exists "anon can read class attendance" on public.class_attendance;
create policy "anon can read class attendance"
  on public.class_attendance for select to anon, authenticated using (true);

drop policy if exists "anon can insert class attendance" on public.class_attendance;
create policy "anon can insert class attendance"
  on public.class_attendance for insert to anon, authenticated with check (true);

drop policy if exists "anon can update class attendance" on public.class_attendance;
create policy "anon can update class attendance"
  on public.class_attendance for update to anon, authenticated using (true) with check (true);

drop policy if exists "anon can read daily reports" on public.class_daily_reports;
create policy "anon can read daily reports"
  on public.class_daily_reports for select to anon, authenticated using (true);

drop policy if exists "anon can insert daily reports" on public.class_daily_reports;
create policy "anon can insert daily reports"
  on public.class_daily_reports for insert to anon, authenticated with check (true);

drop policy if exists "anon can update daily reports" on public.class_daily_reports;
create policy "anon can update daily reports"
  on public.class_daily_reports for update to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
