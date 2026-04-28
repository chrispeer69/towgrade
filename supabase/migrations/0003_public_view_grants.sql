-- TowGrade — make the public_providers / public_reviews views actually
-- queryable by anon. The views in 0002_rls.sql were created with
-- security_invoker = true (correct: row visibility runs as the caller),
-- but anon was never granted table-level SELECT on the underlying
-- providers / reviews tables, so PostgREST returned 42501.
--
-- Fix: grant SELECT on the underlying tables and add the reviews
-- aggregate-read policy. RLS still gates which rows are visible.

-- ---------------------------------------------------------------------------
-- providers: anon needs table-level SELECT; the providers_public_read
-- policy from 0002_rls.sql narrows visible rows to live, unmerged.
-- ---------------------------------------------------------------------------
grant select on providers to anon, authenticated;

-- ---------------------------------------------------------------------------
-- reviews: same pattern. Add the aggregate-read policy that mirrors the
-- public_reviews view's WHERE — RLS is the source of truth, the view is
-- a convenience surface that also strips the narratives column.
-- ---------------------------------------------------------------------------
grant select on reviews to anon, authenticated;

create policy "reviews_public_aggregate_read" on reviews
  for select to anon, authenticated
  using (counts_in_aggregate = true);
