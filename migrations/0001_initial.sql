PRAGMA foreign_keys = ON;

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_currency TEXT NOT NULL DEFAULT 'HKD' CHECK (length(base_currency) = 3),
  timezone TEXT NOT NULL DEFAULT 'Asia/Hong_Kong',
  language TEXT NOT NULL DEFAULT 'auto',
  week_starts_on INTEGER NOT NULL DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6),
  default_period TEXT NOT NULL DEFAULT 'month',
  location_capture_enabled INTEGER NOT NULL DEFAULT 0 CHECK (location_capture_enabled IN (0, 1)),
  setup_completed INTEGER NOT NULL DEFAULT 0 CHECK (setup_completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  icon TEXT NOT NULL DEFAULT 'circle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_categories_active_sort
  ON categories (is_archived, sort_order, name);

CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  issuer TEXT,
  last_four TEXT CHECK (last_four IS NULL OR length(last_four) = 4),
  method_type TEXT NOT NULL DEFAULT 'credit_card'
    CHECK (method_type IN ('credit_card', 'debit_card', 'transit_card', 'cash', 'digital_wallet', 'bank_transfer', 'other')),
  shortcut_match_text TEXT,
  icon TEXT NOT NULL DEFAULT 'credit-card',
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_payment_methods_active
  ON payment_methods (is_archived, display_name);

CREATE TABLE merchant_rules (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  normalized_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'exact'
    CHECK (match_type IN ('exact', 'contains', 'regex')),
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 10000),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  default_purpose TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_merchant_rules_precedence
  ON merchant_rules (is_enabled, match_type, priority, created_at);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX idx_user_sessions_user_expiry
  ON user_sessions (user_id, expires_at, revoked_at);

CREATE TABLE shortcut_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX idx_shortcut_tokens_active
  ON shortcut_tokens (revoked_at, created_at);

CREATE TABLE ledger_transactions (
  id TEXT PRIMARY KEY,
  client_event_id TEXT NOT NULL UNIQUE CHECK (length(client_event_id) BETWEEN 1 AND 64),
  type TEXT NOT NULL DEFAULT 'expense'
    CHECK (type IN ('expense', 'income', 'refund', 'transfer', 'adjustment')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
  transaction_date TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  merchant_raw TEXT NOT NULL,
  merchant_normalized TEXT NOT NULL,
  card_raw_name TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  purpose TEXT,
  note TEXT,
  location_name TEXT,
  latitude TEXT,
  longitude TEXT,
  location_source TEXT,
  source TEXT NOT NULL
    CHECK (source IN ('wallet_shortcut', 'manual_pwa', 'csv_import', 'recurring', 'simulator')),
  review_status TEXT NOT NULL
    CHECK (review_status IN ('confirmed', 'needs_review', 'missing_information', 'duplicate_candidate')),
  is_excluded_from_analytics INTEGER NOT NULL DEFAULT 0 CHECK (is_excluded_from_analytics IN (0, 1)),
  deduplication_key TEXT NOT NULL,
  base_amount_minor INTEGER,
  exchange_rate TEXT,
  exchange_rate_source TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_transactions_date
  ON ledger_transactions (transaction_date DESC);
CREATE INDEX idx_transactions_merchant
  ON ledger_transactions (merchant_normalized);
CREATE INDEX idx_transactions_review
  ON ledger_transactions (review_status, transaction_date DESC);
CREATE INDEX idx_transactions_dedup_date
  ON ledger_transactions (deduplication_key, transaction_date DESC);
CREATE INDEX idx_transactions_filters
  ON ledger_transactions (type, currency_code, category_id, payment_method_id, source);

CREATE TABLE import_events (
  id TEXT PRIMARY KEY,
  client_event_id TEXT NOT NULL,
  result TEXT NOT NULL,
  transaction_id TEXT REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  merchant_summary TEXT NOT NULL,
  amount_summary TEXT NOT NULL,
  source TEXT NOT NULL,
  request_identity TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_import_events_created
  ON import_events (created_at DESC);
CREATE INDEX idx_import_events_client_event
  ON import_events (client_event_id, created_at DESC);

CREATE TABLE backup_snapshots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_backup_snapshots_created
  ON backup_snapshots (created_at DESC);

INSERT INTO app_settings (id) VALUES (1);

INSERT INTO categories (id, name, icon, sort_order, is_system) VALUES
  ('cat-dining', 'Dining', 'utensils', 0, 1),
  ('cat-coffee', 'Coffee', 'coffee', 1, 1),
  ('cat-grocery', 'Grocery', 'shopping-basket', 2, 1),
  ('cat-transport', 'Transport', 'train-front', 3, 1),
  ('cat-shopping', 'Shopping', 'shopping-bag', 4, 1),
  ('cat-entertainment', 'Entertainment', 'ticket', 5, 1),
  ('cat-housing', 'Housing', 'house', 6, 1),
  ('cat-utilities', 'Utilities', 'lightbulb', 7, 1),
  ('cat-subscription', 'Subscription', 'repeat', 8, 1),
  ('cat-travel', 'Travel', 'plane', 9, 1),
  ('cat-health', 'Health', 'heart-pulse', 10, 1),
  ('cat-education', 'Education', 'graduation-cap', 11, 1),
  ('cat-work', 'Work', 'briefcase-business', 12, 1),
  ('cat-other', 'Other', 'shapes', 13, 1),
  ('cat-uncategorized', 'Uncategorized', 'circle-help', 999, 1);
