-- ============================================================================
-- 20250101000002_auth_helpers.sql
-- Jogosultsági segédfüggvények (SECURITY DEFINER)
--
-- FONTOS – rekurzió elkerülése:
--   A profiles táblát olvasó függvények SECURITY DEFINER-ek, ezért MEGKERÜLIK
--   az RLS-t. Így egy profiles-policy nyugodtan hívhatja pl. az is_admin()-t
--   anélkül, hogy az újra kiváltaná ugyanazt a policyt (végtelen RLS-rekurzió).
--
--   Minden SECURITY DEFINER függvénynél EXPLICIT, biztonságos a search_path
--   (`set search_path = public`), hogy ne lehessen keresésiút-eltérítéssel
--   más sémába csúsztatott objektumot meghívni.
-- ============================================================================

-- ─── Aktuális felhasználó szerepköre ────────────────────────────────────────
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true;
$$;

comment on function public.current_user_role() is
  'A bejelentkezett felhasználó szerepköre a profiles táblából (csak aktív profil esetén). SECURITY DEFINER – megkerüli az RLS-t, hogy ne okozzon policy-rekurziót.';

-- ─── Admin ellenőrzés ───────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

comment on function public.is_admin() is
  'Igaz, ha a bejelentkezett felhasználó aktív admin. SECURITY DEFINER.';

-- ─── Csapattagság ellenőrzése ───────────────────────────────────────────────
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

comment on function public.is_team_member(uuid) is
  'Igaz, ha a bejelentkezett felhasználó tagja a megadott csapatnak. SECURITY DEFINER.';

-- ─── Munkalap-hozzárendelés ellenőrzése ─────────────────────────────────────
-- Igaz, ha a felhasználó KÖZVETLENÜL (user_id) vagy CSAPATON keresztül
-- (team_id) hozzá van rendelve a megadott munkalaphoz.
create or replace function public.is_assigned_to_workorder(p_workorder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workorder_assignments wa
    where wa.workorder_id = p_workorder_id
      and (
        wa.user_id = auth.uid()
        or wa.team_id in (
          select tm.team_id
          from public.team_members tm
          where tm.user_id = auth.uid()
        )
      )
  );
$$;

comment on function public.is_assigned_to_workorder(uuid) is
  'Igaz, ha a bejelentkezett felhasználó közvetlenül vagy csapatán keresztül hozzá van rendelve a munkalaphoz. SECURITY DEFINER.';

-- ─── Végrehajtási jog: csak hitelesített felhasználók ───────────────────────
revoke all on function public.current_user_role()             from public, anon;
revoke all on function public.is_admin()                      from public, anon;
revoke all on function public.is_team_member(uuid)            from public, anon;
revoke all on function public.is_assigned_to_workorder(uuid)  from public, anon;

grant execute on function public.current_user_role()            to authenticated;
grant execute on function public.is_admin()                     to authenticated;
grant execute on function public.is_team_member(uuid)           to authenticated;
grant execute on function public.is_assigned_to_workorder(uuid) to authenticated;
