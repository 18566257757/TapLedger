import { createRequire } from 'node:module'
import { mkdir, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromFrontend = createRequire(join(projectRoot, 'frontend', 'package.json'))
const sharp = requireFromFrontend('sharp')
const baselineDirectory = join(projectRoot, 'tests', 'visual-baseline')
const afterDirectory = join(projectRoot, process.env.TAPLEDGER_VISUAL_AFTER ?? 'tests/visual-after-cloudflare')
const differenceDirectory = join(projectRoot, process.env.TAPLEDGER_VISUAL_DIFF ?? 'tests/visual-diff')

await mkdir(differenceDirectory, { recursive: true })
const baselineNames = (await readdir(baselineDirectory)).filter((name) => name.endsWith('.png')).sort()
const afterNames = (await readdir(afterDirectory)).filter((name) => name.endsWith('.png')).sort()
if (baselineNames.join('\n') !== afterNames.join('\n')) throw new Error('Visual baseline and after-cloudflare file sets differ')

const results = []
for (const name of baselineNames) {
  const before = await sharp(join(baselineDirectory, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const after = await sharp(join(afterDirectory, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const sameDimensions = before.info.width === after.info.width && before.info.height === after.info.height
  const width = Math.min(before.info.width, after.info.width)
  const height = Math.min(before.info.height, after.info.height)
  const diff = Buffer.alloc(width * height * 4)
  let changedPixels = 0
  let maxChannelDelta = 0
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const beforeOffset = (y * before.info.width + x) * 4
      const afterOffset = (y * after.info.width + x) * 4
      const diffOffset = (y * width + x) * 4
      let pixelChanged = false
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(before.data[beforeOffset + channel] - after.data[afterOffset + channel])
        maxChannelDelta = Math.max(maxChannelDelta, delta)
        if (delta > 0) pixelChanged = true
      }
      if (pixelChanged) {
        changedPixels += 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        diff[diffOffset] = 255
        diff[diffOffset + 1] = 35
        diff[diffOffset + 2] = 85
        diff[diffOffset + 3] = 255
      } else {
        const gray = Math.round((after.data[afterOffset] + after.data[afterOffset + 1] + after.data[afterOffset + 2]) / 3)
        diff[diffOffset] = gray
        diff[diffOffset + 1] = gray
        diff[diffOffset + 2] = gray
        diff[diffOffset + 3] = 36
      }
    }
  }
  await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(join(differenceDirectory, name))
  results.push({
    name,
    before: `${before.info.width}x${before.info.height}`,
    after: `${after.info.width}x${after.info.height}`,
    sameDimensions,
    changedPixels,
    changedPercent: Number((changedPixels / (width * height) * 100).toFixed(4)),
    maxChannelDelta,
    bounds: changedPixels ? `${minX},${minY}-${maxX},${maxY}` : null,
  })
}

console.log(JSON.stringify(results, null, 2))
if (results.some((item) => !item.sameDimensions)) process.exitCode = 1
