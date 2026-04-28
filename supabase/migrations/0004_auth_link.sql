-- TowGrade — wire operators to Supabase Auth.
-- The deferred plan in 0002_rls.sql said: "Operator/admin/subscriber-scoped
-- policies are deferred until Supabase Auth is wired in a later migration —
-- at that point we'll add an auth_user_id FK and tie SELECT/UPDATE policies
-- to auth.uid()." This is that migration (operator side).

-- ---------------------------------------------------------------------------
-- 1. Add the FK to auth.users. ON DELETE CASCADE so removing the auth user
--    also removes their operator row (a deactivation from auth flows through
--    cleanly). UNIQUE so an auth user maps to at most one operator.
-- ---------------------------------------------------------------------------
alter table operators
  add column auth_user_id uuid unique references auth.users(id) on delete cascade;

create index operators_auth_user_id_idx on operators (auth_user_id);

-- ---------------------------------------------------------------------------
-- 2. Supabase Auth holds the password now. operators.password_hash is no
--    longer the source of truth — drop the NOT NULL so new rows can omit it.
--    (Keeping the column for now in case we ever bulk-import legacy operator
--    accounts; it can be dropped entirely in a later migration.)
-- ---------------------------------------------------------------------------
alter table operators
  alter column password_hash drop not null;

-- ---------------------------------------------------------------------------
-- 3. Self-read policy: each operator can SELECT their own row through the
--    REST API once authenticated. (Insert still goes through the server-side
--    service-role client during signup — no insert policy needed for
--    authenticated users; an operator should never create their own row
--    bypass-style after signup.)
-- ---------------------------------------------------------------------------
create policy "operators_self_read" on operators
  for select to authenticated
  using (auth_user_id = auth.uid());
