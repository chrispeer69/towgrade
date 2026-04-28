-- TowGrade — backfill service_role privileges on public.
-- Symptom: signup server action fails with 42501 "permission denied for table
-- operators" even though the admin client sends the service_role JWT.
-- Diagnosis: has_table_privilege('service_role', ...) returned false for
-- every public table — the project never received the standard Supabase
-- service_role grants because we ran migrations through the Supavisor pooler
-- in a context that didn't trigger Supabase's grant-propagation hooks.
--
-- Fix: explicit GRANTs on existing objects, plus ALTER DEFAULT PRIVILEGES so
-- future tables (created by the same migration role) auto-grant. The
-- append-only triggers on admin_actions / report_downloads still enforce
-- their invariants — these grants don't bypass triggers.

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
