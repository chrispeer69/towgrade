-- 0012_operators_admin_notified.sql
-- Track when the per-registration admin notification email was first dispatched
-- for an operator. Used to dedupe: the auth callback can fire multiple times
-- (refresh, click confirm link twice, etc.) and we only want to notify admins
-- on the first successful confirmation.

alter table operators
  add column admin_notified_at timestamptz;

comment on column operators.admin_notified_at is
  'Set when the admin-notification email is first dispatched after email confirmation. NULL until then. Used as an atomic dedup claim — never written from app code without an IS NULL guard.';
