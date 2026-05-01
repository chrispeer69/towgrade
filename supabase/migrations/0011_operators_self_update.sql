-- TowGrade — operator self-update access on profile fields
--
-- Goal: an authenticated operator can edit their own first_name, last_name,
-- company_name, state, fleet_size — and nothing else. Identity columns
-- (email, auth_user_id) and verification columns (verification_status,
-- verified_at, verified_by) must remain unchanged.
--
-- Implementation: column-level GRANT UPDATE rather than a WITH CHECK
-- subquery pin. Postgres RLS WITH CHECK only sees NEW row state, so a
-- pattern like "email = (SELECT email FROM operators WHERE id = id)" is
-- structurally broken: it re-reads under RLS, doesn't see OLD values, and
-- can't enforce "this column may not change." Column-level UPDATE
-- privilege is the correct primitive — Postgres rejects any UPDATE whose
-- SET list touches a column the role lacks privilege on, before RLS even
-- runs. Defense in depth: even a buggy app that sends extra SET columns
-- gets a hard 42501 from the database.
--
-- Combined with a simple RLS policy (USING + WITH CHECK both on
-- auth_user_id = auth.uid()), this yields:
--   - The role can SET only profile columns       (column GRANT)
--   - The role can target only its own row        (RLS USING)
--   - The role cannot reassign auth_user_id away  (RLS WITH CHECK)
--
-- Service-role keeps full UPDATE access via 0005 grants and bypasses RLS,
-- so the admin verification queue (0008) and register flow are unaffected.

-- ---------------------------------------------------------------------------
-- 1. Column-level UPDATE grant. Authenticated operators may include only
--    these columns in a SET clause. updated_at is set by the
--    operators_set_updated_at BEFORE UPDATE trigger from 0001 — triggers
--    can write any NEW column regardless of caller column privilege, so
--    updated_at does not need to appear here.
-- ---------------------------------------------------------------------------
grant update (first_name, last_name, company_name, state, fleet_size)
  on operators to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS policy: target only own row; cannot reassign auth_user_id.
-- ---------------------------------------------------------------------------
drop policy if exists operators_self_update on operators;

create policy operators_self_update on operators
  for update
  to authenticated
  using  (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
