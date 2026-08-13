import { beforeEach } from 'vitest'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
  // D1 storage is isolated per test file, so reset mutable tables explicitly
  // to keep each test independent within this file.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM backup_snapshots'),
    env.DB.prepare('DELETE FROM import_events'),
    env.DB.prepare('DELETE FROM merchant_rules'),
    env.DB.prepare('DELETE FROM ledger_transactions'),
    env.DB.prepare('DELETE FROM shortcut_tokens'),
    env.DB.prepare('DELETE FROM user_sessions'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare('DELETE FROM payment_methods'),
    env.DB.prepare('DELETE FROM categories WHERE is_system = 0'),
    env.DB.prepare("UPDATE app_settings SET setup_completed = 0, base_currency = 'HKD', timezone = 'Asia/Hong_Kong', updated_at = CURRENT_TIMESTAMP WHERE id = 1"),
  ])
})
