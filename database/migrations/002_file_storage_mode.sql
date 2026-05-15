ALTER TABLE files ADD COLUMN source_path TEXT;
ALTER TABLE files ADD COLUMN storage_mode TEXT NOT NULL DEFAULT 'linked';

PRAGMA user_version = 2;
