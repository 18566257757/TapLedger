import { lstat, readdir, rm } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const execute = process.argv.includes('--execute')

const candidates = [
  'backend',
  'scripts/backup.ps1',
  'scripts/common.ps1',
  'scripts/configure-power.ps1',
  'scripts/configure-tailscale.ps1',
  'scripts/health-check.ps1',
  'scripts/install-backup-task.ps1',
  'scripts/install-startup-task.ps1',
  'scripts/restart.ps1',
  'scripts/restore.ps1',
  'scripts/setup.ps1',
  'scripts/start.ps1',
  'scripts/status.ps1',
  'scripts/stop.ps1',
  'scripts/uninstall-backup-task.ps1',
  'scripts/uninstall-startup-task.ps1',
  'scripts/update.ps1',
  'docs/TAILSCALE_SETUP.md',
]

const protectedRoots = [
  '.git',
  'frontend/src',
  'frontend/public',
  'frontend/tests',
  'tests',
  'runtime',
  'migration-local-data',
  '.wrangler',
]

function isInside(root, target) {
  const pathFromRoot = relative(root, target)
  return pathFromRoot !== '' && pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !pathFromRoot.startsWith(sep)
}

function isProtected(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/')
  return protectedRoots.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`))
}

async function rejectLinks(target) {
  const info = await lstat(target)
  if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link or junction: ${target}`)
  if (!info.isDirectory()) return
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const child = resolve(target, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Refusing directory containing a symbolic link or junction: ${child}`)
    if (entry.isDirectory()) await rejectLinks(child)
  }
}

const targets = []
for (const candidate of candidates) {
  const target = resolve(PROJECT_ROOT, candidate)
  const pathFromRoot = relative(PROJECT_ROOT, target)
  if (!isInside(PROJECT_ROOT, target)) throw new Error(`Refusing project root or outside path: ${target}`)
  if (pathFromRoot === '.git' || pathFromRoot.startsWith(`.git${sep}`)) throw new Error(`Refusing Git metadata: ${target}`)
  if (isProtected(pathFromRoot)) throw new Error(`Refusing protected UI or data path: ${target}`)
  try {
    await rejectLinks(target)
    targets.push(target)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

console.log(`${execute ? 'DELETE' : 'DRY RUN'}: ${targets.length} exact old-stack target(s)`)
for (const target of targets) console.log(target)

if (execute) {
  for (const target of targets) {
    await rm(target, { recursive: true, force: false })
    console.log(`removed ${target}`)
  }
}
