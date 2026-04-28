-- TowGrade — initial schema (translates SCHEMA.md v0.3 into Postgres)
-- Order: extensions → admins → operators → providers → reviews →
--        oem_subscribers → report_downloads → admin_actions → seed providers
--
-- Run AFTER creating the Supabase project, BEFORE 0002_rls.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger: bump updated_at on UPDATE
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- 1. admins
-- ---------------------------------------------------------------------------
create table admins (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null,
  password_hash   text        not null,
  full_name       text        not null,
  role            text        not null default 'verifier',
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz,
  disabled_at     timestamptz,
  constraint admins_email_lowercase  check (email = lower(email)),
  constraint admins_role_valid       check (role in ('super_admin', 'verifier'))
);

create unique index admins_email_idx on admins (email);
create index        admins_role_idx  on admins (role);


-- ---------------------------------------------------------------------------
-- 2. operators
-- ---------------------------------------------------------------------------
create table operators (
  id                  uuid        primary key default gen_random_uuid(),
  first_name          text        not null,
  last_name           text        not null,
  company_name        text        not null,
  state               text        not null,
  fleet_size          text        not null,
  email               text        not null,
  password_hash       text        not null,
  dot_number          text,
  verification_status text        not null default 'pending',
  verified_at         timestamptz,
  verified_by         uuid        references admins(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_login_at       timestamptz,

  constraint operators_email_lowercase
    check (email = lower(email)),

  constraint operators_state_2letter
    check (state ~ '^[A-Z]{2}$'),

  constraint operators_fleet_size_valid
    check (fleet_size in ('1-5', '6-20', '21-50', '51-100', '100+')),

  constraint operators_verification_status_valid
    check (verification_status in ('pending', 'verified', 'rejected')),

  constraint operators_verified_consistency
    check ((verification_status = 'verified') = (verified_at is not null))
);

create unique index operators_email_idx              on operators (email);
create index        operators_verification_status_idx on operators (verification_status);
create index        operators_state_idx               on operators (state);

create trigger operators_set_updated_at
  before update on operators
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 3. providers
-- ---------------------------------------------------------------------------
create table providers (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  slug            text        not null,
  abbr            text        not null,
  brand_color     text        not null,
  provider_type   text        not null,
  website         text,
  aliases         text[]      not null default '{}',
  merged_into_id  uuid        references providers(id),
  merged_at       timestamptz,
  deleted_at      timestamptz,
  deleted_by      uuid        references admins(id),
  created_at      timestamptz not null default now(),
  created_by      uuid        references admins(id),
  updated_at      timestamptz not null default now(),

  constraint providers_provider_type_valid
    check (provider_type in ('motor_club', 'rsa_network', 'insurer_direct')),

  constraint providers_brand_color_hex
    check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),

  constraint providers_abbr_format
    check (abbr ~ '^[A-Z]{2,4}$'),

  constraint providers_merge_consistency
    check ((merged_into_id is null) = (merged_at is null)),

  constraint providers_no_self_merge
    check (merged_into_id is null or merged_into_id <> id)
);

create unique index providers_slug_idx           on providers (slug);
create index        providers_deleted_at_idx     on providers (deleted_at);
create index        providers_merged_into_id_idx on providers (merged_into_id);
create index        providers_aliases_gin_idx    on providers using gin (aliases);

create trigger providers_set_updated_at
  before update on providers
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. reviews
-- ---------------------------------------------------------------------------
create table reviews (
  id                  uuid        primary key default gen_random_uuid(),
  operator_id         uuid        not null references operators(id),
  provider_id         uuid        not null references providers(id),
  period              text        not null,
  category_scores     jsonb       not null,
  narratives          jsonb       not null default '{}'::jsonb,
  overall_score       numeric(3,1) not null,
  would_recommend     boolean,
  is_public           boolean     not null default false,
  counts_in_aggregate boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint reviews_period_format
    check (period ~ '^[0-9]{4}-Q[1-4]$'),

  constraint reviews_overall_score_range
    check (overall_score between 1.0 and 10.0),

  constraint reviews_one_per_operator_provider_period
    unique (operator_id, provider_id, period)
);

create index reviews_provider_aggregate_idx on reviews (provider_id, counts_in_aggregate);
create index reviews_operator_recent_idx    on reviews (operator_id, created_at desc);
create index reviews_period_provider_idx    on reviews (period, provider_id);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. oem_subscribers
-- ---------------------------------------------------------------------------
create table oem_subscribers (
  id                  uuid        primary key default gen_random_uuid(),
  organization        text        not null,
  contact_first_name  text        not null,
  contact_last_name   text        not null,
  contact_email       text        not null,
  role                text        not null,
  tier                text        not null,
  contract_start      date        not null,
  contract_end        date        not null,
  stripe_customer_id  text,
  is_active           boolean     not null default true,
  created_at          timestamptz not null default now(),

  constraint oem_subscribers_email_lowercase
    check (contact_email = lower(contact_email)),

  constraint oem_subscribers_role_valid
    check (role in ('oem', 'insurer', 'motor_club')),

  constraint oem_subscribers_tier_valid
    check (tier in ('single_provider', 'full_network', 'enterprise')),

  constraint oem_subscribers_contract_dates
    check (contract_end > contract_start)
);

create unique index oem_subscribers_contact_email_idx on oem_subscribers (contact_email);
create index        oem_subscribers_active_end_idx    on oem_subscribers (is_active, contract_end);


-- ---------------------------------------------------------------------------
-- 6. report_downloads
-- ---------------------------------------------------------------------------
create table report_downloads (
  id            uuid        primary key default gen_random_uuid(),
  subscriber_id uuid        not null references oem_subscribers(id),
  report_type   text        not null,
  report_period text        not null,
  provider_id   uuid        references providers(id),
  file_format   text        not null,
  ip_address    inet,
  user_agent    text,
  downloaded_at timestamptz not null default now(),

  constraint report_downloads_report_type_valid
    check (report_type in ('quarterly_network', 'provider_deep_dive', 'comparison')),

  constraint report_downloads_period_format
    check (report_period ~ '^[0-9]{4}-Q[1-4]$'),

  constraint report_downloads_file_format_valid
    check (file_format in ('pdf', 'csv', 'json'))
);

create index report_downloads_subscriber_recent_idx on report_downloads (subscriber_id, downloaded_at desc);
create index report_downloads_period_type_idx       on report_downloads (report_period, report_type);


-- ---------------------------------------------------------------------------
-- 7. admin_actions
-- ---------------------------------------------------------------------------
create table admin_actions (
  id          uuid        primary key default gen_random_uuid(),
  admin_id    uuid        not null references admins(id),
  action      text        not null,
  target_type text        not null,
  target_id   uuid        not null,
  metadata    jsonb       not null default '{}'::jsonb,
  ip_address  inet,
  created_at  timestamptz not null default now(),

  constraint admin_actions_action_valid
    check (action in (
      'operator.verify', 'operator.reject',
      'provider.create', 'provider.update', 'provider.merge', 'provider.delete',
      'admin.disable'
    )),

  constraint admin_actions_target_type_valid
    check (target_type in ('operator', 'provider', 'admin'))
);

create index admin_actions_admin_recent_idx  on admin_actions (admin_id, created_at desc);
create index admin_actions_target_idx        on admin_actions (target_type, target_id);
create index admin_actions_action_recent_idx on admin_actions (action, created_at desc);


-- ---------------------------------------------------------------------------
-- Seed providers (CLAUDE.md §10 + SCHEMA.md)
-- Brand colors: 6 pulled from prototypes/towgrade.html, 5 picked from the
-- same restrained editorial palette (deep, muted, ~30-50% lightness).
-- Confirm with founder before relying on these for marketing assets.
-- ---------------------------------------------------------------------------
insert into providers (name, slug, abbr, brand_color, provider_type) values
  ('Agero',                    'agero',                'AG', '#2B5BA8', 'motor_club'),
  ('AAA',                      'aaa',                  'AA', '#1A5496', 'motor_club'),
  ('Urgently',                 'urgently',             'UR', '#8B2020', 'rsa_network'),
  ('HONK',                     'honk',                 'HK', '#5B2080', 'rsa_network'),
  ('Allstate Roadside',        'allstate-roadside',    'AL', '#8B6914', 'insurer_direct'),
  ('Cross Country Motor Club', 'cross-country',        'CC', '#1F5C3B', 'motor_club'),
  ('Nation Safe Drivers',      'nation-safe-drivers',  'NS', '#1A6640', 'motor_club'),
  ('USAA Roadside',            'usaa-roadside',        'US', '#1B3A6B', 'insurer_direct'),
  ('Auto Club Group',          'auto-club-group',      'AC', '#7A3F1F', 'motor_club'),
  ('Roadside Masters',         'roadside-masters',     'RM', '#4A4A6F', 'rsa_network'),
  ('Geico Emergency Roadside', 'geico-er',             'GE', '#0E6B8C', 'insurer_direct');
