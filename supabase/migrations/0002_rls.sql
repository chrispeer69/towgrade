-- TowGrade — business-rule enforcement + Row-Level Security
-- Runs after 0001_init.sql. Enforces the four locked invariants from SCHEMA.md:
--   1. Quarter-close edit lock on reviews
--   2. counts_in_aggregate = is_public AND operator.verification_status = 'verified'
--   3. Append-only audit logs (admin_actions, report_downloads)
--   4. Public scoreboard sees only live providers and aggregate-eligible reviews,
--      with narratives never exposed.

-- ---------------------------------------------------------------------------
-- Helper: derive the close-of-quarter timestamp from a "YYYY-Qn" string
-- ---------------------------------------------------------------------------
create or replace function quarter_end(p text) returns timestamptz as $$
  select (
    make_date(
      substring(p from '^[0-9]{4}')::int,
      (substring(p from 'Q([1-4])$')::int) * 3,  -- last month of quarter (3,6,9,12)
      1
    )
    + interval '1 month'    -- first day of the month after quarter end
    - interval '1 second'   -- ...minus a tick → 23:59:59 of the last day
  )::timestamptz
$$ language sql immutable;

create or replace function is_review_editable(p text) returns boolean as $$
  select now() <= quarter_end(p);
$$ language sql stable;


-- ---------------------------------------------------------------------------
-- Trigger: on reviews INSERT/UPDATE, recompute counts_in_aggregate from
-- (is_public AND operators.verification_status = 'verified'). The column
-- is the system's verdict — never trust an app to set it directly.
-- ---------------------------------------------------------------------------
create or replace function set_counts_in_aggregate() returns trigger as $$
declare
  is_verified boolean;
begin
  select verification_status = 'verified' into is_verified
  from operators where id = new.operator_id;

  new.counts_in_aggregate := coalesce(new.is_public, false)
                         and coalesce(is_verified, false);
  return new;
end;
$$ language plpgsql;

create trigger reviews_set_counts_in_aggregate
  before insert or update on reviews
  for each row execute function set_counts_in_aggregate();


-- ---------------------------------------------------------------------------
-- Trigger: prevent editing a review after its quarter has closed.
-- Application layer should also gate the UI — this is the floor.
-- ---------------------------------------------------------------------------
create or replace function enforce_quarter_close_lock() returns trigger as $$
begin
  if not is_review_editable(old.period) then
    raise exception
      'Review % is locked: period % closed at %',
      old.id, old.period, quarter_end(old.period)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger reviews_quarter_close_lock
  before update on reviews
  for each row execute function enforce_quarter_close_lock();


-- ---------------------------------------------------------------------------
-- Append-only enforcement on audit tables.
-- REVOKE handles anon/authenticated; trigger handles service_role and any
-- other future role. The combination is intentional belt-and-suspenders.
-- ---------------------------------------------------------------------------
create or replace function block_mutations() returns trigger as $$
begin
  raise exception
    'Table % is append-only; UPDATE and DELETE are not permitted', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$ language plpgsql;

create trigger admin_actions_no_mutation
  before update or delete on admin_actions
  for each row execute function block_mutations();

create trigger report_downloads_no_mutation
  before update or delete on report_downloads
  for each row execute function block_mutations();

revoke update, delete on admin_actions    from anon, authenticated;
revoke update, delete on report_downloads from anon, authenticated;


-- ---------------------------------------------------------------------------
-- Row-Level Security
-- Enable on every public table. Default = deny-all for anon/authenticated;
-- backend code uses service_role (bypasses RLS) for admin operations.
-- ---------------------------------------------------------------------------
alter table admins           enable row level security;
alter table operators        enable row level security;
alter table providers        enable row level security;
alter table reviews          enable row level security;
alter table oem_subscribers  enable row level security;
alter table report_downloads enable row level security;
alter table admin_actions    enable row level security;

-- Public scoreboard: anyone can read live, unmerged providers
create policy "providers_public_read" on providers
  for select to anon, authenticated
  using (deleted_at is null and merged_into_id is null);

-- (Operator/admin/subscriber-scoped policies are deferred until Supabase Auth
-- is wired in a later migration — at that point we'll add an auth_user_id FK
-- and tie SELECT/UPDATE policies to auth.uid().)


-- ---------------------------------------------------------------------------
-- Public views — the ONLY surface anon clients should hit for review data.
-- The narratives column is deliberately NOT projected: it never leaks.
-- ---------------------------------------------------------------------------
create or replace view public_reviews
with (security_invoker = true) as
  select
    id,
    provider_id,
    period,
    category_scores,
    overall_score,
    would_recommend,
    created_at
  from reviews
  where counts_in_aggregate = true;

grant select on public_reviews to anon, authenticated;

create or replace view public_providers
with (security_invoker = true) as
  select id, name, slug, abbr, brand_color, provider_type, website, aliases, created_at
  from providers
  where deleted_at is null and merged_into_id is null;

grant select on public_providers to anon, authenticated;
