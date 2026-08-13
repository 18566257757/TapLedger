import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wrangler = join(projectRoot, 'frontend', 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const configHome = join(projectRoot, '.wrangler', 'config')
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

if (!existsSync(wrangler)) throw new Error('Project-local Wrangler is missing')
mkdirSync(configHome, { recursive: true })

const child = spawn(process.execPath, [
  wrangler,
  'login',
  '--browser=false',
  '--callback-host',
  '127.0.0.1',
  '--callback-port',
  '8976',
], {
  cwd: projectRoot,
  env: { ...process.env, XDG_CONFIG_HOME: configHome, WRANGLER_SEND_METRICS: 'false' },
  stdio: ['inherit', 'pipe', 'pipe'],
})

let opened = false
let buffered = ''
function processOutput(chunk) {
  buffered += chunk.toString()
  const match = buffered.match(/https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[^\s]+/u)
  if (!opened && match) {
    opened = true
    const browser = spawn(chrome, [match[0]], { detached: true, stdio: 'ignore' })
    browser.unref()
    console.log('Cloudflare authorization page opened in Chrome.')
  }
}

child.stdout.on('data', processOutput)
child.stderr.on('data', processOutput)
child.on('error', (error) => {
  console.error(`Cloudflare login could not start: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code) => {
  if (code === 0) console.log('Cloudflare OAuth authorization completed.')
  else console.error(`Cloudflare OAuth authorization failed with exit code ${code ?? 1}.`)
  process.exitCode = code ?? 1
})
