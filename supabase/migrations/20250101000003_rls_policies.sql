-- ============================================================================
-- 20250101000003_rls_policies.sql
-- Row Level Security bekapcsolása + házirendek minden táblán.
--
-- ALAPELV: a jogosultságot az ADATBÁZIS érvényesíti, nem a frontend.
-- Minden policy a `authenticated` szerepkörre szól; az `anon` (nem
-- bejelentkezett) kérés egyetlen táblához sem fér hozzá.
--
-- A `deleted_at is null` feltétel az aktív rekordok olvasásánál szerepel
-- (soft-delete: a logikailag törölt rekordok nem jelennek meg).
-- ============================================================================

-- ─── RLS bekapcsolása minden táblán ─────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;
alter table public.customers             enable row level security;
alter table public.projects              enable row level security;
alter table public.workorders            enable row level security;
alter table public.workorder_assignments enable row level security;

-- ============================================================================
-- PROFILES
-- ============================================================================
-- Olvasás: mindenki a SAJÁT profilját; admin az ÖSSZESET.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Beszúrás: kizárólag admin (az első admin profilját a service_role /
-- Dashboard hozza létre, ami megkerüli az RLS-t – lásd SUPABASE_SETUP.md).
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- Módosítás: admin bármelyik profilt; felhasználó a sajátját.
-- A szerepkör/aktív mező jogosulatlan módosítását a
-- prevent_profile_privilege_escalation() trigger blokkolja (lásd lentebb).
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Privilégium-emelés megakadályozása: nem-admin nem módosíthatja a saját
-- (vagy bárki) role / active mezőjét. Ez a szabály még az UPDATE policyt is
-- felülírja, mert az RLS with-check nem tud OLD/NEW összehasonlítást.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;  -- admin bármit módosíthat
  end if;
  if new.role is distinct from old.role then
    raise exception 'Csak admin módosíthatja a szerepkört (role).';
  end if;
  if new.active is distinct from old.active then
    raise exception 'Csak admin módosíthatja az aktív állapotot (active).';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- ============================================================================
-- CUSTOMERS
-- Olvasás/írás: admin, projektmenedzser, iroda. Telepítő NEM kap közvetlen
-- teljes ügyféllista-hozzáférést.
-- ============================================================================
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'projektmenedzser', 'iroda')
    and deleted_at is null
  );

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'projektmenedzser', 'iroda'));

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated
  using (public.current_user_role() in ('admin', 'projektmenedzser', 'iroda'))
  with check (public.current_user_role() in ('admin', 'projektmenedzser', 'iroda'));

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated
  using (public.is_admin());

-- ============================================================================
-- PROJECTS
-- Olvasás: admin/pm/iroda az aktív projekteket; telepítő CSAK azt a projektet,
-- amelyhez hozzárendelt (nem törölt) munkalapja tartozik.
-- Írás: admin vagy projektmenedzser.
-- ============================================================================
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (
    (
      public.current_user_role() in ('admin', 'projektmenedzser', 'iroda')
      and deleted_at is null
    )
    or (
      public.current_user_role() = 'telepito'
      and deleted_at is null
      and exists (
        select 1
        from public.workorders w
        where w.project_id = projects.id
          and w.deleted_at is null
          and public.is_assigned_to_workorder(w.id)
      )
    )
  );

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'projektmenedzser'));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (public.current_user_role() in ('admin', 'projektmenedzser'))
  with check (public.current_user_role() in ('admin', 'projektmenedzser'));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_admin());

-- ============================================================================
-- WORKORDERS (munkalapok)
--   admin      – minden munkalapot olvas és módosít
--   projektmenedzser – minden AKTÍV munkalapot olvas és módosít
--   iroda      – olvashat; a lezárási időbélyeget NEM módosíthatja (trigger)
--   telepito   – CSAK a hozzárendelt munkalapját olvassa; lezárt munkalapot
--                nem módosíthat; törölni nem tud
-- ============================================================================
drop policy if exists workorders_select on public.workorders;
create policy workorders_select on public.workorders
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.current_user_role() in ('projektmenedzser', 'iroda')
      and deleted_at is null
    )
    or (
      public.current_user_role() = 'telepito'
      and deleted_at is null
      and public.is_assigned_to_workorder(id)
    )
  );

drop policy if exists workorders_insert on public.workorders;
create policy workorders_insert on public.workorders
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'projektmenedzser', 'iroda'));

drop policy if exists workorders_update on public.workorders;
create policy workorders_update on public.workorders
  for update to authenticated
  using (
    public.is_admin()
    or (
      public.current_user_role() in ('projektmenedzser', 'iroda')
      and deleted_at is null
    )
    or (
      public.current_user_role() = 'telepito'
      and deleted_at is null
      and closed_at is null
      and public.is_assigned_to_workorder(id)
    )
  )
  with check (
    public.is_admin()
    or (
      public.current_user_role() in ('projektmenedzser', 'iroda')
      and deleted_at is null
    )
    or (
      public.current_user_role() = 'telepito'
      and deleted_at is null
      and public.is_assigned_to_workorder(id)
    )
  );

-- Törlés (hard delete): kizárólag admin. A telepítő így közvetlen API-hívással
-- sem törölhet. A projektmenedzser a deleted_at beállításával (soft-delete)
-- archivál.
drop policy if exists workorders_delete on public.workorders;
create policy workorders_delete on public.workorders
  for delete to authenticated
  using (public.is_admin());

-- Írási finomszabályok trigger szinten:
--   - iroda NEM módosíthatja a closed_at (műszaki lezárás) mezőt;
--   - telepito NEM állíthat be deleted_at-et (soft-delete tilos neki).
create or replace function public.enforce_workorder_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
begin
  if v_role = 'iroda' then
    if new.closed_at is distinct from old.closed_at then
      raise exception 'Iroda szerepkör nem módosíthatja a munkalap lezárási időbélyegét (closed_at).';
    end if;
  end if;

  if v_role = 'telepito' then
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'Telepítő nem törölhet munkalapot.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_workorder_write_rules on public.workorders;
create trigger enforce_workorder_write_rules
  before update on public.workorders
  for each row execute function public.enforce_workorder_write_rules();

-- ============================================================================
-- TEAMS
-- Kezelés: admin, projektmenedzser. Telepítő csak a saját csapatait olvassa.
-- ============================================================================
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'projektmenedzser')
    or public.is_team_member(id)
  );

drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams
  for all to authenticated
  using (public.current_user_role() in ('admin', 'projektmenedzser'))
  with check (public.current_user_role() in ('admin', 'projektmenedzser'));

-- ============================================================================
-- TEAM_MEMBERS
-- Kezelés: admin, projektmenedzser. Telepítő csak a SAJÁT tagságát olvassa.
-- ============================================================================
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'projektmenedzser')
    or user_id = auth.uid()
  );

drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members
  for all to authenticated
  using (public.current_user_role() in ('admin', 'projektmenedzser'))
  with check (public.current_user_role() in ('admin', 'projektmenedzser'));

-- ============================================================================
-- WORKORDER_ASSIGNMENTS
-- Kezelés: admin, projektmenedzser. Telepítő csak a SAJÁT hozzárendeléseit
-- (közvetlen user_id, vagy saját csapatán keresztül) olvassa.
-- ============================================================================
drop policy if exists wo_assignments_select on public.workorder_assignments;
create policy wo_assignments_select on public.workorder_assignments
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'projektmenedzser')
    or user_id = auth.uid()
    or team_id in (
      select tm.team_id from public.team_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists wo_assignments_write on public.workorder_assignments;
create policy wo_assignments_write on public.workorder_assignments
  for all to authenticated
  using (public.current_user_role() in ('admin', 'projektmenedzser'))
  with check (public.current_user_role() in ('admin', 'projektmenedzser'));
