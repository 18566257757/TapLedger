CREATE TABLE legacy_migration_runs (
  id TEXT PRIMARY KEY,
  source_fingerprint TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  transaction_count INTEGER NOT NULL CHECK (transaction_count >= 0),
  category_count INTEGER NOT NULL CHECK (category_count >= 0),
  payment_method_count INTEGER NOT NULL CHECK (payment_method_count >= 0),
  merchant_rule_count INTEGER NOT NULL CHECK (merchant_rule_count >= 0),
  import_event_count INTEGER NOT NULL CHECK (import_event_count >= 0),
  completed_at TEXT NOT NULL
);

CREATE INDEX idx_legacy_migration_runs_completed
  ON legacy_migration_runs (completed_at DESC);
