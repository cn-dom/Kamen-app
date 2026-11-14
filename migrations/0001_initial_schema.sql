-- Kamen-app: shared multi-company storage foundation.
-- Every business record is scoped by company_id. The browser must never access D1 directly.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS company_memberships (
  company_id TEXT NOT NULL,
  identity_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'worker')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (company_id, identity_subject),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memberships_identity
  ON company_memberships(identity_subject, active);

CREATE TABLE IF NOT EXISTS app_records (
  company_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (company_id, record_type, record_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_records_updated
  ON app_records(company_id, record_type, updated_at);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  material_id TEXT,
  order_id TEXT,
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  actor_subject TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (company_id, id),
  UNIQUE (company_id, operation_id, id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_material
  ON inventory_movements(company_id, material_id, created_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  company_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  result_payload TEXT CHECK (result_payload IS NULL OR json_valid(result_payload)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (company_id, idempotency_key),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  actor_subject TEXT NOT NULL,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  before_payload TEXT CHECK (before_payload IS NULL OR json_valid(before_payload)),
  after_payload TEXT CHECK (after_payload IS NULL OR json_valid(after_payload)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (company_id, id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record
  ON audit_log(company_id, record_type, record_id, created_at);

CREATE TABLE IF NOT EXISTS document_assets (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  related_record_type TEXT,
  related_record_id TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (company_id, id),
  UNIQUE (company_id, object_key),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
