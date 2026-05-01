-- TowGrade — operator self-read access on reviews
--
-- Bug class: same as 0006 (operators) and 0009 (admins). Pre-this-migration,
-- the only SELECT policy on reviews is reviews_public_aggregate_read from
-- 0003, which exposes only rows where counts_in_aggregate=true. So an
-- operator who submitted a private review, or whose verification is still
-- pending, cannot read their OWN reviews via the anon SSR client — they
-- effectively disappear from My Reviews.
--
-- Fix: add reviews_self_read so an authenticated operator sees every review
-- they submitted, regardless of is_public / counts_in_aggregate / their own
-- verification_status. This complements (does not replace) the public
-- aggregate policy: Postgres OR's RLS policies, so a row visible under
-- either policy is returned.
--
-- The table-level GRANT SELECT TO authenticated already exists from 0003,
-- so no grant statement is needed here.
--
-- Service-role keeps full access via 0005 grants. The /dashboard/rate
-- existing-review lookup currently uses service-role; this migration does
-- not change that, but it could be migrated to anon SSR in a later cleanup.

-- ---------------------------------------------------------------------------
-- Policy: an authenticated user can SELECT any review whose operator_id
-- maps to their own operators row via auth_user_id. Subquery on operators
-- runs under the same auth context, so operators_self_read (0004) gates
-- the inner lookup the same way it gates direct reads.
-- ---------------------------------------------------------------------------
drop policy if exists reviews_self_read on reviews;

create policy reviews_self_read on reviews
  for select
  to authenticated
  using (
    operator_id in (
      select id from operators where auth_user_id = auth.uid()
    )
  );
