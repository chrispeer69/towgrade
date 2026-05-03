-- TowGrade — Phase 6.6 admin management
-- Adds the DB-level safety floor + schema accommodations for the new
-- /admin/admins UI:
--
--   1. Extend admin_actions.action CHECK to allow admin.add / admin.remove.
--      (admin.disable was already on the list but unused; left in place.)
--
--   2. Relax admin_actions.admin_id FK to ON DELETE SET NULL and drop
--      its NOT NULL. Required because removing an admin via the new UI is
--      a hard delete; with the original FK (NOT NULL + RESTRICT default)
--      any actor with audit history could never be removed, and the
--      spec's confirm-and-delete flow would surface a foreign_key_violation
--      that the user has no way to resolve. Audit rows survive the
--      deletion with admin_id = NULL (renders as "(removed)" in the audit
--      log UI). The append-only trigger from 0002 still blocks UPDATE /
--      DELETE of audit rows themselves, so history stays immutable; we
--      are only letting Postgres null out the actor pointer instead of
--      refusing the parent delete.
--
--   3. BEFORE DELETE trigger on admins: refuse to remove the last admin
--      who can still sign in (disabled_at IS NULL). getAdmin() rejects
--      disabled admins, so without this trigger an operator could end up
--      locked out of the admin surface by removing the only active admin
--      while a disabled placeholder sits in the table. Belt-and-suspenders
--      alongside the Server Action's own pre-check.
--
-- No new RLS or GRANTs: the Manage Admins + Audit Log surfaces both go
-- through the service-role client (mirrors the Phase 4 pattern), which
-- bypasses RLS. The existing admins_self_read policy from 0009 is still
-- all that's needed for getAdmin() to work for authenticated callers.

-- ---------------------------------------------------------------------------
-- 1. Extend the action CHECK to cover admin.add / admin.remove.
-- ---------------------------------------------------------------------------
alter table admin_actions
  drop constraint admin_actions_action_valid;

alter table admin_actions
  add constraint admin_actions_action_valid
  check (action in (
    'operator.verify', 'operator.reject',
    'provider.create', 'provider.update', 'provider.merge', 'provider.delete',
    'admin.add', 'admin.remove', 'admin.disable'
  ));


-- ---------------------------------------------------------------------------
-- 2. admin_actions.admin_id → nullable + ON DELETE SET NULL.
-- ---------------------------------------------------------------------------
alter table admin_actions
  alter column admin_id drop not null;

alter table admin_actions
  drop constraint admin_actions_admin_id_fkey;

alter table admin_actions
  add constraint admin_actions_admin_id_fkey
  foreign key (admin_id) references admins(id) on delete set null;


-- ---------------------------------------------------------------------------
-- 3. BEFORE DELETE trigger: block last-active-admin removal.
--    Counts non-disabled admins remaining AFTER the proposed delete by
--    excluding the row's id; if zero remain, raise. check_violation so
--    the Server Action can surface a clean message.
-- ---------------------------------------------------------------------------
create or replace function fn_block_last_admin_delete() returns trigger as $$
begin
  if (
    select count(*) from admins
    where id <> old.id
      and disabled_at is null
  ) < 1 then
    raise exception
      'Cannot remove the last active admin (id %, email %)', old.id, old.email
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_admins_block_last_delete on admins;

create trigger trg_admins_block_last_delete
  before delete on admins
  for each row execute function fn_block_last_admin_delete();
