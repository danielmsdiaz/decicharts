BEGIN;
SET LOCAL search_path TO decicharts;

CREATE TABLE measurement_imports (
  user_uid text NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE ON UPDATE NO ACTION,
  id uuid NOT NULL, name text NOT NULL, file_name text NOT NULL, sheet_name text NOT NULL,
  point_count integer NOT NULL CHECK (point_count BETWEEN 1 AND 250000),
  record_count integer NOT NULL CHECK (record_count BETWEEN 1 AND 250000),
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading', 'ready')),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0), active_save_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT now(), updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT measurement_imports_pkey PRIMARY KEY(user_uid, id),
  CHECK (point_count <= record_count),
  CHECK ((state = 'ready' AND active_save_id IS NOT NULL AND version > 0) OR (state = 'uploading' AND active_save_id IS NULL AND version = 0))
);
ALTER TABLE analyses ADD COLUMN import_id uuid, ADD COLUMN ordinal integer;

-- Every old analysis is a singleton. Do not infer shared origin from filenames.
INSERT INTO measurement_imports(user_uid,id,name,file_name,sheet_name,point_count,record_count,state,version,active_save_id,created_at,updated_at)
SELECT user_uid,id,name,metadata->>'fileName',metadata->>'sheetName',1,record_count,state,
  CASE WHEN state='ready' THEN 1 ELSE 0 END, CASE WHEN state='ready' THEN id ELSE NULL END,created_at,updated_at FROM analyses;
UPDATE analyses SET import_id=id, ordinal=0;
ALTER TABLE analyses ALTER COLUMN import_id SET NOT NULL, ALTER COLUMN ordinal SET NOT NULL,
  ADD CONSTRAINT analyses_ordinal_check CHECK (ordinal >= 0 AND ordinal < 250000),
  ADD CONSTRAINT analyses_user_uid_import_id_fkey FOREIGN KEY(user_uid,import_id) REFERENCES measurement_imports(user_uid,id) ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE UNIQUE INDEX analyses_user_uid_import_id_ordinal_key ON analyses(user_uid,import_id,ordinal);
CREATE UNIQUE INDEX analyses_user_uid_import_id_id_key ON analyses(user_uid,import_id,id);

CREATE TABLE import_saves (
  user_uid text NOT NULL, import_id uuid NOT NULL, id uuid NOT NULL, name text NOT NULL,
  base_version integer NOT NULL CHECK (base_version >= 0),
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','committed')), version integer,
  created_at timestamptz(6) NOT NULL DEFAULT now(), updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT import_saves_pkey PRIMARY KEY(user_uid,import_id,id),
  CONSTRAINT import_saves_user_uid_import_id_fkey FOREIGN KEY(user_uid,import_id) REFERENCES measurement_imports(user_uid,id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK ((state='committed' AND version IS NOT NULL AND version=base_version+1) OR (state='uploading' AND version IS NULL))
);
CREATE TABLE import_save_points (
  user_uid text NOT NULL, import_id uuid NOT NULL, save_id uuid NOT NULL, point_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0 AND ordinal < 250000), chart jsonb NOT NULL,
  CONSTRAINT import_save_points_pkey PRIMARY KEY(user_uid,import_id,save_id,point_id),
  CONSTRAINT import_save_points_user_uid_import_id_save_id_fkey FOREIGN KEY(user_uid,import_id,save_id) REFERENCES import_saves(user_uid,import_id,id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT import_save_points_user_uid_import_id_point_id_fkey FOREIGN KEY(user_uid,import_id,point_id) REFERENCES analyses(user_uid,import_id,id) ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX import_save_points_user_uid_import_id_save_id_ordinal_key ON import_save_points(user_uid,import_id,save_id,ordinal);
CREATE INDEX measurement_imports_user_uid_updated_at_id_idx ON measurement_imports(user_uid,updated_at DESC,id);
CREATE INDEX import_saves_user_uid_updated_at_idx ON import_saves(user_uid,updated_at);

INSERT INTO import_saves(user_uid,import_id,id,name,base_version,state,version,created_at,updated_at)
SELECT user_uid,id,id,name,0,CASE WHEN state='ready' THEN 'committed' ELSE 'uploading' END,
  CASE WHEN state='ready' THEN 1 ELSE NULL END,created_at,updated_at FROM analyses;
INSERT INTO import_save_points(user_uid,import_id,save_id,point_id,ordinal,chart)
SELECT user_uid,id,id,id,0,chart FROM analyses;
ALTER TABLE measurement_imports ADD CONSTRAINT measurement_imports_user_uid_id_active_save_id_fkey
  FOREIGN KEY(user_uid,id,active_save_id) REFERENCES import_saves(user_uid,import_id,id) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;
