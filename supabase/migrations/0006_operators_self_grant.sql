-- 0006_operators_self_grant.sql
-- Grants table-level SELECT on operators to the authenticated role.
-- The operators_self_read RLS policy (0004) already constrains row visibility
-- to auth_user_id = auth.uid(); this GRANT unlocks the gate so the policy can run.
-- Without this GRANT, PostgREST returns 42501 permission denied before RLS evaluates.
-- Mirrors the pattern used in 0003 for providers/reviews.

grant select on operators to authenticated;
