import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wranglerEntrypoint = join(projectRoot, 'frontend', 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const projectConfigHome = join(projectRoot, '.wrangler', 'config')

if (!existsSync(wranglerEntrypoint)) {
  console.error('Project-local Wrangler is not installed. Run npm ci first.')
  process.exit(1)
}

mkdirSync(projectConfigHome, { recursive: true })
const result = spawnSync(process.execPath, [wranglerEntrypoint, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: {
    ...process.env,
    XDG_CONFIG_HOME: projectConfigHome,
    WRANGLER_SEND_METRICS: 'false',
  },
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
