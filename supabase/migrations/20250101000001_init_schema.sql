-- ============================================================================
-- 20250101000001_init_schema.sql
-- CRM – Alap adatbázisséma (Supabase / PostgreSQL)
--
-- Ez a migráció csak a TÁBLÁKAT, constraint-eket, indexeket és az updated_at
-- automatikus időbélyeg triggert hozza létre.
--   - A jogosultsági segédfüggvények:  20250101000002_auth_helpers.sql
--   - A Row Level Security házirendek:  20250101000003_rls_policies.sql
--
-- Minden tábla RLS-t kap a 0003 migrációban. Éles használatban a migrációkat
-- SORRENDBEN kell lefuttatni (0001 → 0002 → 0003).
-- ============================================================================

-- gen_random_uuid() a pgcrypto kiterjesztésből (Supabase-en általában aktív)
create extension if not exists pgcrypto;

-- ─── Közös updated_at trigger-függvény ──────────────────────────────────────
-- Minden updated_at mezővel rendelkező táblára alkalmazzuk (BEFORE UPDATE).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- 1:1 kapcsolat az auth.users rekordokkal. A szerepkört DB constraint korlátozza.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('admin', 'projektmenedzser', 'iroda', 'telepito'))
);

comment on table public.profiles is
  'Alkalmazás-szintű felhasználói profil; id = auth.users.id. A role értékét DB constraint korlátozza.';

-- ─── teams ──────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── team_members ───────────────────────────────────────────────────────────
-- Összetett elsődleges kulcs (team_id, user_id); cascade törlés mindkét irányból.
create table if not exists public.team_members (
  team_id     uuid not null references public.teams (id)    on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ─── customers ──────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  postcode    text,
  city        text,
  address     text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  version     integer not null default 1,
  deleted_at  timestamptz
);

-- ─── projects ───────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  project_code        text unique not null,
  customer_id         uuid references public.customers (id) on delete set null,
  title               text,
  address             text,
  status              text,
  project_manager_id  uuid references public.profiles (id) on delete set null,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  version             integer not null default 1,
  deleted_at          timestamptz
);

-- ─── workorders (munkalapok) ────────────────────────────────────────────────
create table if not exists public.workorders (
  id               uuid primary key default gen_random_uuid(),
  document_number  text unique not null,
  project_id       uuid references public.projects (id) on delete cascade,
  title            text,
  status           text,
  scheduled_date   date,
  closed_at        timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  updated_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          integer not null default 1,
  deleted_at       timestamptz
);

-- ─── workorder_assignments ──────────────────────────────────────────────────
-- Egy munkalap konkrét FELHASZNÁLÓHOZ vagy CSAPATHOZ rendelhető.
-- A constraint megakadályozza, hogy egy rekordban SE felhasználó, SE csapat
-- ne legyen megadva (legalább az egyik kötelező).
create table if not exists public.workorder_assignments (
  id            uuid primary key default gen_random_uuid(),
  workorder_id  uuid not null references public.workorders (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade,
  team_id       uuid references public.teams (id)    on delete cascade,
  created_at    timestamptz not null default now(),
  constraint workorder_assignments_target_check
    check (user_id is not null or team_id is not null)
);

-- Ismétlődő hozzárendelések elkerülése (a NULL-ok Postgresben különállók,
-- ezért a felhasználós és csapatos hozzárendeléseket külön index védi).
create unique index if not exists workorder_assignments_wo_user_uidx
  on public.workorder_assignments (workorder_id, user_id)
  where user_id is not null;
create unique index if not exists workorder_assignments_wo_team_uidx
  on public.workorder_assignments (workorder_id, team_id)
  where team_id is not null;

-- ─── Indexek a policyk / lekérdezések gyorsításához ─────────────────────────
create index if not exists team_members_user_idx        on public.team_members (user_id);
create index if not exists customers_created_by_idx      on public.customers (created_by);
create index if not exists projects_customer_idx         on public.projects (customer_id);
create index if not exists projects_pm_idx               on public.projects (project_manager_id);
create index if not exists workorders_project_idx        on public.workorders (project_id);
create index if not exists wo_assignments_wo_idx         on public.workorder_assignments (workorder_id);
create index if not exists wo_assignments_user_idx       on public.workorder_assignments (user_id);
create index if not exists wo_assignments_team_idx       on public.workorder_assignments (team_id);

-- ─── updated_at trigger minden érintett táblára ─────────────────────────────
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.teams;
create trigger set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.workorders;
create trigger set_updated_at before update on public.workorders
  for each row execute function public.set_updated_at();
