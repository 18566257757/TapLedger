import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wranglerEntrypoint = join(projectRoot, 'frontend', 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const protectedDirectory = join(projectRoot, 'migration-local-data')
const stagingDirectory = join(protectedDirectory, 'staging')
const backupDirectory = join(protectedDirectory, 'legacy-backups')

function isInsideProject(candidate) {
  const rel = relative(projectRoot, candidate)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

function checkedProjectFile(input, label, mustExist = true) {
  const candidate = resolve(projectRoot, input)
  if (!isInsideProject(candidate)) throw new Error(`${label} must be a file inside PROJECT_ROOT`)
  if (mustExist) {
    const actual = realpathSync(candidate)
    if (!isInsideProject(actual)) throw new Error(`${label} resolves outside PROJECT_ROOT`)
    const stat = lstatSync(actual)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular non-link file`)
    return actual
  }
  return candidate
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const sourceArgument = argument('--source')
if (!sourceArgument) {
  console.error('Usage: npm run db:migrate:legacy -- --source <project-relative.sqlite3> [--remote --config wrangler.instance.jsonc]')
  process.exit(2)
}
const sourcePath = checkedProjectFile(sourceArgument, 'Legacy database')
const configPath = checkedProjectFile(argument('--config', 'wrangler.jsonc'), 'Wrangler config')
const remote = process.argv.includes('--remote')
if (remote && basename(configPath) !== 'wrangler.instance.jsonc') throw new Error('Remote migration requires the ignored wrangler.instance.jsonc config')
if (!existsSync(wranglerEntrypoint)) throw new Error('Project-local Wrangler is not installed')

mkdirSync(stagingDirectory, { recursive: true })
mkdirSync(backupDirectory, { recursive: true })

const fingerprint = createHash('sha256').update(readFileSync(sourcePath)).digest('hex')
const backupPath = join(backupDirectory, `${basename(sourcePath)}.${fingerprint.slice(0, 12)}.readonly.sqlite3`)
if (!existsSync(backupPath)) {
  copyFileSync(sourcePath, backupPath)
  chmodSync(backupPath, 0o444)
}

const database = new DatabaseSync(sourcePath, { readOnly: true })
const requiredTables = ['app_settings', 'categories', 'payment_methods', 'merchant_rules', 'ledger_transactions', 'import_events']
const availableTables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => String(row.name)))
for (const table of requiredTables) if (!availableTables.has(table)) throw new Error(`Legacy database is missing required table ${table}`)

const rows = Object.fromEntries(requiredTables.map((table) => [table, database.prepare(`SELECT * FROM ${table}`).all()]))
database.close()
if (rows.app_settings.length !== 1) throw new Error('Legacy database must contain exactly one app_settings record')

function sql(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number' || typeof value === 'bigint') {
    if (!Number.isFinite(Number(value))) throw new Error('Legacy database contains a non-finite numeric value')
    return String(value)
  }
  return `'${String(value).replaceAll("'", "''")}'`
}

function insert(table, columns, values, updateColumns = []) {
  const base = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(sql).join(', ')})`
  if (!updateColumns.length) return `${base} ON CONFLICT DO NOTHING;`
  return `${base} ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column} = excluded.${column}`).join(', ')};`
}

const statements = ['PRAGMA foreign_keys = ON;']
const setting = rows.app_settings[0]
statements.push(`UPDATE app_settings SET base_currency = ${sql(setting.base_currency)}, timezone = ${sql(setting.timezone)}, language = ${sql(setting.language)}, week_starts_on = ${sql(setting.week_starts_on)}, default_period = ${sql(setting.default_analytics_period)}, location_capture_enabled = ${sql(setting.location_capture_enabled)}, setup_completed = ${sql(setting.setup_completed)}, created_at = ${sql(setting.created_at)}, updated_at = ${sql(setting.updated_at)} WHERE id = 1;`)

const categoryColumns = ['id', 'name', 'icon', 'sort_order', 'is_system', 'is_archived', 'created_at', 'updated_at']
const seededCategoryIds = new Map([
  ['Dining', 'cat-dining'], ['Coffee', 'cat-coffee'], ['Grocery', 'cat-grocery'],
  ['Transport', 'cat-transport'], ['Shopping', 'cat-shopping'], ['Entertainment', 'cat-entertainment'],
  ['Housing', 'cat-housing'], ['Utilities', 'cat-utilities'], ['Subscription', 'cat-subscription'],
  ['Travel', 'cat-travel'], ['Health', 'cat-health'], ['Education', 'cat-education'],
  ['Work', 'cat-work'], ['Other', 'cat-other'], ['Uncategorized', 'cat-uncategorized'],
])
const categoryIdMap = new Map(rows.categories.map((row) => [row.id, seededCategoryIds.get(String(row.name)) ?? row.id]))
for (const row of rows.categories) {
  const migrated = { ...row, id: categoryIdMap.get(row.id) }
  statements.push(insert('categories', categoryColumns, categoryColumns.map((column) => migrated[column]), categoryColumns.slice(1)))
}
const paymentColumns = ['id', 'display_name', 'issuer', 'last_four', 'method_type', 'shortcut_match_text', 'icon', 'is_archived', 'created_at', 'updated_at']
for (const row of rows.payment_methods) statements.push(insert('payment_methods', paymentColumns, paymentColumns.map((column) => row[column]), paymentColumns.slice(1)))
const ruleColumns = ['id', 'pattern', 'normalized_pattern', 'match_type', 'priority', 'category_id', 'payment_method_id', 'default_purpose', 'is_enabled', 'created_at', 'updated_at']
for (const row of rows.merchant_rules) {
  const migrated = { ...row, category_id: categoryIdMap.get(row.category_id) ?? row.category_id }
  statements.push(insert('merchant_rules', ruleColumns, ruleColumns.map((column) => migrated[column]), ruleColumns.slice(1)))
}
const transactionColumns = ['id', 'client_event_id', 'type', 'amount_minor', 'currency_code', 'transaction_date', 'captured_at', 'merchant_raw', 'merchant_normalized', 'card_raw_name', 'category_id', 'payment_method_id', 'purpose', 'note', 'location_name', 'latitude', 'longitude', 'location_source', 'source', 'review_status', 'is_excluded_from_analytics', 'deduplication_key', 'base_amount_minor', 'exchange_rate', 'exchange_rate_source', 'created_at', 'updated_at']
for (const row of rows.ledger_transactions) {
  const migrated = { ...row, category_id: categoryIdMap.get(row.category_id) ?? row.category_id }
  statements.push(insert('ledger_transactions', transactionColumns, transactionColumns.map((column) => migrated[column])))
}
const eventColumns = ['id', 'client_event_id', 'result', 'transaction_id', 'merchant_summary', 'amount_summary', 'source', 'request_identity', 'created_at']
for (const row of rows.import_events) {
  const values = [row.id, row.client_event_id, row.result, row.transaction_id, row.merchant_summary, row.amount_summary, row.source, row.request_identity, row.created_at ?? row.received_at]
  statements.push(insert('import_events', eventColumns, values))
}

const importFile = join(stagingDirectory, `legacy-import-${randomUUID()}.sql`)
writeFileSync(importFile, `${statements.join('\n')}\n`, { encoding: 'utf8', flag: 'wx' })
const transactionIds = rows.ledger_transactions.map((row) => sql(row.id))

function removeStagingFile(target) {
  const actual = resolve(target)
  if (dirname(actual) !== stagingDirectory || !isInsideProject(actual)) throw new Error('Refusing to remove a file outside the migration staging directory')
  const stat = lstatSync(actual)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Refusing to remove a non-regular migration staging file')
  rmSync(actual)
}

function runWrangler(args) {
  const result = spawnSync(process.execPath, [wranglerEntrypoint, ...args], {
    cwd: projectRoot,
    env: { ...process.env, XDG_CONFIG_HOME: join(projectRoot, '.wrangler', 'config'), WRANGLER_SEND_METRICS: 'false' },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    const diagnostic = `${result.stderr ?? ''}\n${result.stdout ?? ''}`
      .split(/\r?\n/u)
      .find((line) => /D1_ERROR|SQLITE_|constraint failed|Error:/iu.test(line))
      ?.replace(/'(?:''|[^'])*'/gu, "'[redacted]'")
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/giu, '[id]')
    throw new Error(diagnostic ? `Project-local Wrangler failed: ${diagnostic.trim()}` : 'Project-local Wrangler command failed; inspect project-local .wrangler diagnostics')
  }
  return result.stdout
}

function parseWranglerJson(output) {
  const cleaned = output.replace(/\u001B\[[0-?]*[ -/]*[@-~]/gu, '').trim()
  const candidates = [0]
  for (let index = cleaned.indexOf('\n['); index !== -1; index = cleaned.indexOf('\n[', index + 2)) candidates.push(index + 1)
  for (const index of candidates.reverse()) {
    try {
      return JSON.parse(cleaned.slice(index).trim())
    } catch {
      // Wrangler can prefix remote JSON with upload/progress lines; try the previous array boundary.
    }
  }
  throw new Error('Wrangler did not return parseable JSON')
}

const locationFlag = remote ? '--remote' : '--local'
const configRelative = relative(projectRoot, configPath)
let completed = false
try {
  runWrangler(['d1', 'migrations', 'apply', 'DB', locationFlag, '--config', configRelative])
  const priorOutput = runWrangler(['d1', 'execute', 'DB', locationFlag, '--config', configRelative, '--command', `SELECT COUNT(*) AS total FROM legacy_migration_runs WHERE source_fingerprint = ${sql(fingerprint)}`, '--json'])
  const prior = parseWranglerJson(priorOutput)?.[0]?.results?.[0]?.total ?? 0
  if (!prior) {
    runWrangler(['d1', 'execute', 'DB', locationFlag, '--config', configRelative, '--file', relative(projectRoot, importFile), '--yes'])
    const verifyOutput = runWrangler(['d1', 'execute', 'DB', locationFlag, '--config', configRelative, '--command', `SELECT COUNT(*) AS matched_transactions, COALESCE(SUM(amount_minor), 0) AS matched_amount_minor FROM ledger_transactions WHERE id IN (${transactionIds.length ? transactionIds.join(', ') : sql('__none__')})`, '--json'])
    const foreignKeyOutput = runWrangler(['d1', 'execute', 'DB', locationFlag, '--config', configRelative, '--command', 'SELECT COUNT(*) AS foreign_key_violations FROM pragma_foreign_key_check', '--json'])
    const verification = parseWranglerJson(verifyOutput)
    const foreignKeyVerification = parseWranglerJson(foreignKeyOutput)
    const matched = Number(verification?.[0]?.results?.[0]?.matched_transactions ?? -1)
    const amount = Number(verification?.[0]?.results?.[0]?.matched_amount_minor ?? Number.NaN)
    const foreignKeyViolations = Number(foreignKeyVerification?.[0]?.results?.[0]?.foreign_key_violations ?? -1)
    const sourceAmount = rows.ledger_transactions.reduce((total, row) => total + Number(row.amount_minor), 0)
    if (matched !== rows.ledger_transactions.length || amount !== sourceAmount || foreignKeyViolations !== 0) throw new Error('Legacy migration verification failed; completion was not recorded')
    const counts = [rows.ledger_transactions.length, rows.categories.length, rows.payment_methods.length, rows.merchant_rules.length, rows.import_events.length]
    runWrangler(['d1', 'execute', 'DB', locationFlag, '--config', configRelative, '--command', `INSERT INTO legacy_migration_runs (id, source_fingerprint, source_name, transaction_count, category_count, payment_method_count, merchant_rule_count, import_event_count, completed_at) VALUES (${sql(randomUUID())}, ${sql(fingerprint)}, ${sql(basename(sourcePath))}, ${counts.join(', ')}, ${sql(new Date().toISOString())})`, '--yes'])
  }
  completed = true
  console.log(`Legacy migration verified: ${rows.ledger_transactions.length} transactions, ${rows.categories.length} categories, ${rows.payment_methods.length} payment methods, ${rows.merchant_rules.length} rules, ${rows.import_events.length} import events.`)
  console.log(`Read-only source backup: ${relative(projectRoot, backupPath)}`)
  console.log(prior ? 'This source fingerprint was already migrated; no duplicate rows were created.' : `Target: ${remote ? 'remote D1' : 'local D1'}.`)
} finally {
  if (existsSync(importFile)) removeStagingFile(importFile)
  if (!completed) console.error('Migration did not reach the verified completion marker.')
}
