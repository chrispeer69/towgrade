-- TowGrade — admin self-read access
--
-- Bug class: same as 0006 fixed for operators. The /admin route gate
-- calls getAdmin(), which reads from `admins` via the anon SSR client.
-- RLS was enabled on `admins` in 0002 with no SELECT policy, and there
-- is no table-level GRANT to authenticated either. Both must exist for
-- an authenticated user to read their own admin row:
--
--   1. POLICY narrows which rows are visible (own row only).
--   2. GRANT is the underlying privilege the policy gates on. A policy
--      without the grant evaluates to "no access" — Postgres requires
--      the table-level privilege before RLS even runs. This is exactly
--      the gap 0006 plugged for operators.
--
-- Both pieces are added here for admins, mirroring 0004 + 0006.
-- Service-role keeps full access via existing 0005 grants.

-- ---------------------------------------------------------------------------
-- 1. Policy: an authenticated user can SELECT their own admin row.
--    Mirrors operators_self_read from 0004.
-- ---------------------------------------------------------------------------
drop policy if exists admins_self_read on admins;

create policy admins_self_read on admins
  for select
  to authenticated
  using (auth_user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 2. Grant: the policy above evaluates as "no access" without an
--    underlying SELECT privilege. Mirrors the operators grant from 0006.
-- ---------------------------------------------------------------------------
grant select on admins to authenticated;
