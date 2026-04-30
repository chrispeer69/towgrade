-- TowGrade — Phase 4 admin verification queue
-- 1. Link admins to auth.users (mirrors operators 0004).
-- 2. Seed Chris as the first admin (idempotent, by email lookup in auth.users).
-- 3. Bypass flag for quarter-close lock so system recomputes don't trip it.
-- 4. Propagate operators.verification_status changes to that operator's
--    reviews so the existing set_counts_in_aggregate trigger reruns.

-- ---------------------------------------------------------------------------
-- 1. admins ↔ auth.users wiring
-- ---------------------------------------------------------------------------
alter table admins
  add column if not exists auth_user_id uuid
    references auth.users(id) on delete cascade;

create unique index if not exists admins_auth_user_id_idx
  on admins (auth_user_id) where auth_user_id is not null;

alter table admins
  alter column password_hash drop not null;


-- ---------------------------------------------------------------------------
-- 2. Seed the first admin (Chris). Idempotent.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'chris@bluecollarai.online'
  limit 1;

  if v_user_id is null then
    raise notice
      'admins seed skipped: no auth.users row for chris@bluecollarai.online. '
      'Re-run after the auth user exists.';
    return;
  end if;

  if exists (select 1 from admins where auth_user_id = v_user_id) then
    raise notice 'admins seed skipped: chris already linked.';
    return;
  end if;

  insert into admins (email, full_name, role, auth_user_id)
  values ('chris@bluecollarai.online', 'Chris Peer', 'super_admin', v_user_id);
end$$;


-- ---------------------------------------------------------------------------
-- 3. Quarter-close lock bypass for system recomputes.
--    Why this exists: the operator-verification propagation in §4 must
--    refresh counts_in_aggregate on past-quarter reviews when an admin
--    changes verification_status. The existing reviews_quarter_close_lock
--    correctly blocks operator-driven edits to closed-quarter reviews,
--    but here the only field changing is the system-managed updated_at
--    so the BEFORE row trigger can recompute counts_in_aggregate.
--
--    SECURITY: this GUC must NEVER be set from application code. It is
--    set transaction-locally inside the propagation function below and
--    nowhere else. Any other call site that sets it is a bug.
-- ---------------------------------------------------------------------------
create or replace function enforce_quarter_close_lock() returns trigger as $$
begin
  if current_setting('towgrade.bypass_quarter_lock', true) = 'on' then
    return new;
  end if;

  if not is_review_editable(old.period) then
    raise exception
      'Review % is locked: period % closed at %',
      old.id, old.period, quarter_end(old.period)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- 4. Propagation trigger.
--    When an operator's verification_status changes, touch each of their
--    reviews. The existing reviews_set_counts_in_aggregate BEFORE trigger
--    re-reads operators.verification_status and recomputes the flag.
--    No recursion: this updates reviews, not operators.
-- ---------------------------------------------------------------------------
create or replace function fn_recompute_reviews_on_operator_verification()
  returns trigger as $$
begin
  -- See §3 above. Tx-local; never set this from app code.
  perform set_config('towgrade.bypass_quarter_lock', 'on', true);

  update reviews
     set updated_at = now()
   where operator_id = new.id;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_operators_verification_propagate on operators;

create trigger trg_operators_verification_propagate
  after update of verification_status on operators
  for each row
  when (old.verification_status is distinct from new.verification_status)
  execute function fn_recompute_reviews_on_operator_verification();
