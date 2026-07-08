-- UNESCO World Heritage Centre — database schema (plain SQL)
-- 13 domain tables + platform tables (auth, versioning, watchlist).
-- Running this script drops and recreates everything, so it is safe to re-run.
--
-- Every domain table has a `deleted_at` column for soft deletes: deleting a
-- record just stamps this column, so nothing is ever truly lost and it can be
-- restored later.

DROP TABLE IF EXISTS watch CASCADE;
DROP TABLE IF EXISTS award CASCADE;
DROP TABLE IF EXISTS world_heritage_committee CASCADE;
DROP TABLE IF EXISTS donation CASCADE;
DROP TABLE IF EXISTS danger_site_fund CASCADE;
DROP TABLE IF EXISTS other_fund CASCADE;
DROP TABLE IF EXISTS provisional_danger_site CASCADE;
DROP TABLE IF EXISTS status_report CASCADE;
DROP TABLE IF EXISTS site_manager CASCADE;
DROP TABLE IF EXISTS site_detail CASCADE;
DROP TABLE IF EXISTS fund CASCADE;
DROP TABLE IF EXISTS member_country CASCADE;
DROP TABLE IF EXISTS local_institute_agency CASCADE;
DROP TABLE IF EXISTS donor_detail CASCADE;
DROP TABLE IF EXISTS schema_change_log CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS refresh_token CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;

-- ---------------------------------------------------------------------------
-- Platform tables
-- ---------------------------------------------------------------------------

CREATE TABLE app_user (
  id             SERIAL PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  name           TEXT,
  role           TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_token (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Version-control backbone: every admin write records a full snapshot.
CREATE TABLE audit_log (
  id           SERIAL PRIMARY KEY,
  actor_id     INTEGER REFERENCES app_user(id) ON DELETE SET NULL,
  actor_email  TEXT,
  action       TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'REVERT')),
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  before_data  JSONB,
  after_data   JSONB,
  diff         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Records schema changes (including admin edits via the schema editor).
CREATE TABLE schema_change_log (
  id          SERIAL PRIMARY KEY,
  migration   TEXT NOT NULL,
  summary     TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Records that a user is "watching" for the in-app change feed.
CREATE TABLE watch (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, table_name, record_id)
);

-- ---------------------------------------------------------------------------
-- Domain tables
-- ---------------------------------------------------------------------------

CREATE TABLE donor_detail (
  donor_id    INTEGER PRIMARY KEY,
  donor_name  TEXT,
  donor_type  TEXT,
  contact     TEXT,
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE member_country (
  country_code    INTEGER PRIMARY KEY,
  country_name    TEXT NOT NULL,
  region          TEXT,
  representative  TEXT,
  veto_power      BOOLEAN,
  donor_id        INTEGER REFERENCES donor_detail(donor_id) ON DELETE SET NULL,
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE local_institute_agency (
  institute_id    INTEGER PRIMARY KEY,
  institute_name  TEXT,
  officer         TEXT,
  address         TEXT,
  contact         TEXT,
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE site_detail (
  s_id              INTEGER PRIMARY KEY,
  site_name         TEXT,
  address           TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  area              DOUBLE PRECISION,
  country_code      INTEGER REFERENCES member_country(country_code) ON DELETE SET NULL,
  category          TEXT,
  buffer_zone       DOUBLE PRECISION,
  historical_detail TEXT,
  ownership         TEXT,
  institute_id      INTEGER REFERENCES local_institute_agency(institute_id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ,
  -- Full-text search index over the descriptive columns (auto-maintained).
  search_vector     TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(site_name, '') || ' ' ||
      coalesce(address, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(ownership, '') || ' ' ||
      coalesce(historical_detail, ''))
  ) STORED
);
CREATE INDEX idx_site_country ON site_detail(country_code);
CREATE INDEX idx_site_category ON site_detail(category);
CREATE INDEX idx_site_search ON site_detail USING GIN (search_vector);

CREATE TABLE site_manager (
  m_id            INTEGER PRIMARY KEY,
  s_id            INTEGER REFERENCES site_detail(s_id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  gender          TEXT,
  age             INTEGER,
  salary          DOUBLE PRECISION,
  working_hours   DOUBLE PRECISION,
  contact         TEXT,
  joining_date    DATE,
  retirement_date DATE,
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE status_report (
  report_id             INTEGER PRIMARY KEY,
  m_id                  INTEGER REFERENCES site_manager(m_id) ON DELETE SET NULL,
  submission_date       DATE,
  report_details        TEXT,
  period_of_observation TEXT,
  deleted_at            TIMESTAMPTZ
);

CREATE TABLE provisional_danger_site (
  s_id             INTEGER PRIMARY KEY REFERENCES site_detail(s_id) ON DELETE CASCADE,
  institute_id     INTEGER REFERENCES local_institute_agency(institute_id) ON DELETE SET NULL,
  type_of_danger   TEXT,
  steps_to_prevent TEXT,
  cause_of_danger  TEXT,
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE fund (
  f_id              INTEGER PRIMARY KEY,
  total_amount      DOUBLE PRECISION,
  unused_amount     DOUBLE PRECISION,
  used_fund_details TEXT,
  allocation_date   DATE,
  fund_period       TEXT,
  fund_type         TEXT,
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_fund_type ON fund(fund_type);

CREATE TABLE other_fund (
  f_id        INTEGER PRIMARY KEY REFERENCES fund(f_id) ON DELETE CASCADE,
  m_id        INTEGER REFERENCES site_manager(m_id) ON DELETE SET NULL,
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE danger_site_fund (
  f_id        INTEGER PRIMARY KEY REFERENCES fund(f_id) ON DELETE CASCADE,
  s_id        INTEGER REFERENCES site_detail(s_id) ON DELETE SET NULL,
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE donation (
  transaction_id INTEGER PRIMARY KEY,
  donor_id       INTEGER REFERENCES donor_detail(donor_id) ON DELETE SET NULL,
  amount         DOUBLE PRECISION,
  date           DATE,
  time           TEXT,
  deleted_at     TIMESTAMPTZ
);
CREATE INDEX idx_donation_donor ON donation(donor_id);

CREATE TABLE world_heritage_committee (
  member_id    INTEGER PRIMARY KEY,
  member_name  TEXT NOT NULL,
  country_code INTEGER NOT NULL REFERENCES member_country(country_code) ON DELETE CASCADE,
  tenure       TEXT,
  salary       DOUBLE PRECISION,
  contact      TEXT,
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE award (
  category      TEXT NOT NULL,
  year          INTEGER NOT NULL,
  country_code  INTEGER NOT NULL REFERENCES member_country(country_code) ON DELETE CASCADE,
  award_detail  TEXT,
  deleted_at    TIMESTAMPTZ,
  PRIMARY KEY (year, country_code, category)
);
