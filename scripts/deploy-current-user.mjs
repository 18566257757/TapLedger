import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INSTANCE_CONFIG = join(PROJECT_ROOT, 'wrangler.instance.jsonc')
const GENERATED_CONFIG = join(PROJECT_ROOT, 'frontend', 'dist', 'tapledger', 'wrangler.json')
const WRANGLER = join(PROJECT_ROOT, 'frontend', 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const CONFIG_HOME = join(PROJECT_ROOT, '.wrangler', 'config')
const NPM_CLI = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')

function assertInsideProject(target) {
  const pathFromRoot = relative(PROJECT_ROOT, target)
  if (!pathFromRoot || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || pathFromRoot.startsWith(sep)) {
    throw new Error(`Refusing path outside PROJECT_ROOT: ${target}`)
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...options.env },
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? 'pipe' : 'inherit',
  })
  if (result.error) throw result.error
  if (options.allowFailure || result.status === 0) return result
  throw new Error(`${options.label ?? command} failed with exit code ${result.status ?? 1}`)
}

function wrangler(args, options = {}) {
  if (!existsSync(WRANGLER)) throw new Error('Project-local Wrangler is missing. Run npm ci first.')
  mkdirSync(CONFIG_HOME, { recursive: true })
  return run(process.execPath, [WRANGLER, ...args], {
    ...options,
    env: { ...options.env, XDG_CONFIG_HOME: CONFIG_HOME, WRANGLER_SEND_METRICS: 'false' },
    label: `wrangler ${args[0] ?? ''}`,
  })
}

function isAuthenticated(result) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  return result.status === 0 && !/not authenticated|not logged in|CLOUDFLARE_API_TOKEN/iu.test(output)
}

function npm(args, options = {}) {
  return run(process.execPath, [NPM_CLI, ...args], { ...options, label: `npm ${args.join(' ')}` })
}

function writeInstanceConfig(databaseName = 'tapledger-db') {
  assertInsideProject(INSTANCE_CONFIG)
  const config = {
    $schema: './frontend/node_modules/wrangler/config-schema.json',
    name: 'tapledger',
    main: './frontend/src/worker/index.ts',
    compatibility_date: '2026-08-13',
    workers_dev: true,
    send_metrics: false,
    dependencies_instrumentation: { enabled: false },
    assets: {
      not_found_handling: 'single-page-application',
      run_worker_first: ['/api/*'],
    },
    d1_databases: [{ binding: 'DB', database_name: databaseName, migrations_dir: 'migrations' }],
  }
  writeFileSync(INSTANCE_CONFIG, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
}

function currentDatabaseName() {
  const text = readFileSync(INSTANCE_CONFIG, 'utf8')
  const match = text.match(/"database_name"\s*:\s*"([^"]+)"/u)
  if (!match) throw new Error('wrangler.instance.jsonc has no D1 database_name')
  return match[1]
}

function hasDatabaseId() {
  return /"database_id"\s*:\s*"[0-9a-f-]+"/iu.test(readFileSync(INSTANCE_CONFIG, 'utf8'))
}

function replaceDatabaseName(name) {
  const text = readFileSync(INSTANCE_CONFIG, 'utf8')
  const updated = text.replace(/("database_name"\s*:\s*")[^"]+("\s*)/u, `$1${name}$2`)
  if (updated === text) throw new Error('Could not update the instance D1 name')
  writeFileSync(INSTANCE_CONFIG, updated, 'utf8')
}

function createDatabase() {
  let name = currentDatabaseName()
  let result = wrangler(['d1', 'create', name, '--binding', 'DB', '--update-config', '--config', INSTANCE_CONFIG], { capture: true, allowFailure: true })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    if (!/already exists|already taken|duplicate|conflict/iu.test(output)) throw new Error('D1 creation failed; Wrangler output was withheld because it can contain instance identifiers.')
    name = `tapledger-db-${randomBytes(3).toString('hex')}`
    replaceDatabaseName(name)
    result = wrangler(['d1', 'create', name, '--binding', 'DB', '--update-config', '--config', INSTANCE_CONFIG], { capture: true, allowFailure: true })
    if (result.status !== 0) throw new Error('D1 creation with a conflict-safe name failed; Wrangler output was withheld because it can contain instance identifiers.')
  }
  if (!hasDatabaseId()) throw new Error('Wrangler did not write a D1 database_id to the ignored instance config')
  console.log(`Created private D1 database: ${name}`)
}

function deploymentUrl(output) {
  return output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/?/iu)?.[0] ?? null
}

async function verifyRemote(url) {
  let lastError
  for (let attempt = 1; attempt <= 7; attempt += 1) {
    try {
      const [home, health, deepLink] = await Promise.all([
        fetch(url, { redirect: 'follow' }),
        fetch(new URL('/api/v1/health', url), { redirect: 'follow' }),
        fetch(new URL('/transactions', url), { redirect: 'follow' }),
      ])
      const healthBody = await health.json().catch(() => null)
      const homeType = home.headers.get('content-type') ?? ''
      const deepType = deepLink.headers.get('content-type') ?? ''
      if (!home.ok || !homeType.includes('text/html')) throw new Error(`Remote home smoke test failed (${home.status})`)
      if (!health.ok || healthBody?.status !== 'ok') throw new Error(`Remote D1 health check failed (${health.status})`)
      if (!deepLink.ok || !deepType.includes('text/html')) throw new Error(`Remote SPA deep-link test failed (${deepLink.status})`)
      console.log('Remote smoke tests passed: home, D1 health, SPA deep link')
      return
    } catch (error) {
      lastError = error
      if (attempt < 7) await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000))
    }
  }
  throw lastError
}

console.log(`PROJECT_ROOT: ${PROJECT_ROOT}`)
run(process.execPath, ['--version'])
npm(['--version'])
run('git', ['--version'])
npm(['ci'])
for (const task of ['lint', 'typecheck', 'test:unit', 'test:integration', 'test:frontend', 'build', 'publication:check']) {
  npm(['run', task])
}

const identity = wrangler(['whoami'], { capture: true, allowFailure: true })
if (!isAuthenticated(identity)) {
  console.log('Cloudflare login is required; opening the Wrangler browser login flow.')
  wrangler(['login'])
}
const confirmedIdentity = wrangler(['whoami'], { capture: true, allowFailure: true })
if (!isAuthenticated(confirmedIdentity)) throw new Error('Cloudflare login was not completed')
console.log('Cloudflare authentication confirmed')

if (!existsSync(INSTANCE_CONFIG)) writeInstanceConfig()
if (!hasDatabaseId()) createDatabase()
console.log(`Using private D1 database: ${currentDatabaseName()}`)

wrangler(['d1', 'migrations', 'list', 'DB', '--remote', '--config', INSTANCE_CONFIG])
wrangler(['d1', 'migrations', 'apply', 'DB', '--remote', '--config', INSTANCE_CONFIG])
wrangler(['d1', 'migrations', 'list', 'DB', '--remote', '--config', INSTANCE_CONFIG])

npm(['run', 'build'], { env: { CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH: INSTANCE_CONFIG } })
if (!existsSync(GENERATED_CONFIG)) throw new Error('Cloudflare Vite build did not generate its deployment config')
const deployed = wrangler(['deploy', '--config', GENERATED_CONFIG], { capture: true, allowFailure: true })
if (deployed.status !== 0) throw new Error('Worker deployment failed; Wrangler output was withheld because it can contain instance identifiers.')
const output = `${deployed.stdout ?? ''}\n${deployed.stderr ?? ''}`
const url = deploymentUrl(output)
if (!url) throw new Error('Deployment succeeded but the workers.dev URL could not be parsed')
console.log(`Worker URL: ${url}`)
await verifyRemote(url)

if (process.platform === 'win32') {
  const child = spawn('explorer.exe', [url], { detached: true, stdio: 'ignore' })
  child.unref()
}
