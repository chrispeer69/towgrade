-- TowGrade — Phase 3 aggregate rollup
-- Extends public_providers with live computed aggregates from reviews where
-- counts_in_aggregate = true. No materialized view, no aggregate table, no
-- cron — Postgres computes at query time. Threshold for showing scores is
-- hardcoded at 5 verified public reviews per provider.
--
-- Security note: view keeps security_invoker = true. RLS on `reviews`
-- (reviews_public_aggregate_read: counts_in_aggregate = true) still gates
-- which rows are visible to anon. The explicit WHERE clause in the CTE is
-- intent-revealing and redundant-but-correct.

create or replace view public_providers
with (security_invoker = true) as
with agg as (
  select
    provider_id,
    count(*)::integer                                       as review_count,
    round(avg(overall_score)::numeric, 1)                   as overall_avg,
    round(
      avg(case when would_recommend then 1.0 else 0.0 end) * 100
    )::integer                                              as recommend_pct
  from reviews
  where counts_in_aggregate = true
  group by provider_id
)
select
  p.id,
  p.name,
  p.slug,
  p.abbr,
  p.brand_color,
  p.provider_type,
  p.website,
  p.aliases,
  p.created_at,
  coalesce(agg.review_count, 0)             as aggregate_review_count,
  case when coalesce(agg.review_count, 0) >= 5
       then agg.overall_avg
       else null
  end                                       as aggregate_overall_score,
  case when coalesce(agg.review_count, 0) >= 5
       then agg.recommend_pct
       else null
  end                                       as aggregate_recommend_pct
from providers p
left join agg on agg.provider_id = p.id
where p.deleted_at is null
  and p.merged_into_id is null;

-- Re-grant SELECT — `create or replace view` preserves grants in modern
-- Postgres, but re-asserting them is idempotent and matches the pattern of
-- 0003 / 0005. RLS on the underlying `reviews` and `providers` tables (set
-- in 0002 / 0003) is what actually gates visibility.
grant select on public_providers to anon, authenticated;
