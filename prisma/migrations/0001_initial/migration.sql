-- Baseline of the existing Decicharts schema. Check constraints are retained
-- in SQL because Prisma schema does not represent PostgreSQL CHECK constraints.

CREATE SCHEMA IF NOT EXISTS decicharts;

CREATE TABLE decicharts.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE decicharts.profiles (
  uid text PRIMARY KEY,
  name text,
  email text,
  photo_url text,
  timezone text NOT NULL DEFAULT 'America/Recife',
  unit text NOT NULL DEFAULT 'dB',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE decicharts.analyses (
  user_uid text NOT NULL REFERENCES decicharts.profiles(uid) ON DELETE CASCADE,
  id uuid NOT NULL,
  name text NOT NULL,
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading', 'ready')),
  metadata jsonb NOT NULL,
  chart jsonb NOT NULL,
  record_count integer NOT NULL CHECK (record_count BETWEEN 1 AND 250000),
  chunk_count integer NOT NULL CHECK (chunk_count BETWEEN 1 AND 50),
  first_ts bigint,
  last_ts bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_uid, id)
);

CREATE INDEX analyses_owner_updated ON decicharts.analyses (user_uid, updated_at DESC, id);

CREATE TABLE decicharts.analysis_chunks (
  user_uid text NOT NULL,
  analysis_id uuid NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index BETWEEN 0 AND 49),
  record_count integer NOT NULL CHECK (record_count BETWEEN 1 AND 5000),
  first_ts bigint NOT NULL,
  last_ts bigint NOT NULL,
  duplicate_count integer NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'array'),
  PRIMARY KEY (user_uid, analysis_id, chunk_index),
  FOREIGN KEY (user_uid, analysis_id) REFERENCES decicharts.analyses(user_uid, id) ON DELETE CASCADE
);

INSERT INTO decicharts.schema_migrations(version) VALUES ('001_profiles_analyses') ON CONFLICT DO NOTHING;
