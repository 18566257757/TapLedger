import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: projectRoot,
  encoding: 'utf8',
})
const files = output.split('\0').filter(Boolean)
const findings = []
const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2'])
const forbiddenFiles = /(^|\/)(?:\.dev\.vars|wrangler\.instance\.jsonc)$/iu
const databaseFiles = /\.(?:sqlite|sqlite3|db)(?:-(?:shm|wal))?$/iu
const historicalAllowlist = /^(?:docs\/guides\/|docs\/TECH_MIGRATION_|docs\/UI_FREEZE\.md|docs\/UI_MIGRATION_|scripts\/safe-remove-old-stack\.mjs$)/u

for (const file of files) {
  const normalized = file.replaceAll('\\', '/')
  if (forbiddenFiles.test(normalized)) findings.push(`${normalized}: private deployment file must not be published`)
  if (databaseFiles.test(normalized)) findings.push(`${normalized}: database file must not be published`)
  if (binaryExtensions.has(extname(normalized).toLowerCase())) continue
  let text
  try {
    text = readFileSync(resolve(projectRoot, file), 'utf8')
  } catch {
    continue
  }
  const checks = [
    [/https:\/\/(?!your-|example|<)[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/iu, 'actual workers.dev URL'],
    [/"account_id"\s*:\s*"[0-9a-f]{32}"/iu, 'Cloudflare account ID'],
    [/"database_id"\s*:\s*"[0-9a-f-]{30,}"/iu, 'D1 database ID'],
    [/(?:SESSION_SECRET|BOOTSTRAP_SECRET|CLOUDFLARE_API_TOKEN)\s*=\s*\S+/u, 'secret value'],
    [/Authorization\s*:\s*Bearer\s+(?!<|\$|YOUR_|REPLACE_)[A-Za-z0-9._~-]{20,}/u, 'authorization token'],
  ]
  if (!historicalAllowlist.test(normalized) && normalized !== 'scripts/publication-check.mjs') {
    checks.push(
      [/runs-on\s*:\s*self-hosted/iu, 'self-hosted GitHub runner'],
      [/127\.0\.0\.1:8787|localhost:8787/iu, 'old local server address'],
      [/tailscale\s+(?:serve|funnel)|configure-tailscale/iu, 'old Tailscale deployment command'],
    )
  }
  for (const [pattern, label] of checks) {
    if (pattern.test(text)) findings.push(`${normalized}: ${label}`)
  }
}

if (findings.length) {
  console.error(`Publication check failed with ${findings.length} finding(s):`)
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Publication check passed for ${files.length} publishable file(s); no private instance config, secrets, databases, instance IDs, old deployment commands, or self-hosted runners found.`)
