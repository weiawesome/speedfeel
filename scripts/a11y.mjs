import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const port = 4173
const origin = `http://127.0.0.1:${port}`
const routes = [
  { path: '/', ready: (page) => page.getByRole('tab', { name: '影片' }).waitFor() },
  { path: '/why', ready: (page) => page.getByRole('heading', { name: '為什麼做這個' }).waitFor() },
]
const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desk', width: 1280, height: 800 },
]
const blocking = new Set(['serious', 'critical'])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForPreview() {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin)
      if (response.ok) return
    } catch {
      // 預覽還沒聽埠。
    }
    await sleep(200)
  }
  throw new Error('預覽伺服器沒有起來')
}

function startPreview() {
  return spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    stdio: 'inherit',
    detached: true,
  })
}

function stopPreview(preview) {
  if (!preview.pid) return
  try {
    process.kill(-preview.pid, 'SIGTERM')
  } catch {
    preview.kill('SIGTERM')
  }
}

const preview = startPreview()
let failed = false
const report = []

try {
  await waitForPreview()
  const browser = await chromium.launch()
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      for (const route of routes) {
        await page.goto(`${origin}${route.path}`, { waitUntil: 'domcontentloaded' })
        await route.ready(page)
        const pages = route.path === '/' ? ['影片', '短影音', '動態', '版面 2', '版面 3'] : [route.path]
        for (const [index, name] of pages.entries()) {
          if (route.path === '/' && index > 0) {
            if (name.startsWith('版面')) {
              await page.getByRole('button', { name: '下一種版面', exact: true }).click()
            } else {
              await page.getByRole('tab', { name, exact: true }).click()
            }
          }
          await page.waitForTimeout(900)
          const results = await new AxeBuilder({ page }).analyze()
          const violations = results.violations.map((item) => ({
            id: item.id,
            impact: item.impact,
            help: item.help,
            nodes: item.nodes.slice(0, 8).map((node) => node.target.join(' ')),
          }))
          const label = route.path === '/' ? `${viewport.name} ${name}` : `${viewport.name} ${route.path}`
          report.push({ viewport: viewport.name, route: label, violations })
          const blocked = violations.filter((item) => blocking.has(item.impact))
          if (blocked.length > 0) failed = true
          if (blocked.length === 0) console.log(`${label}：沒有嚴重或重大問題`)
          else for (const item of blocked) console.log(`${label}：${item.impact} ${item.id} ${item.help}`)
        }
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
} finally {
  await mkdir('a11y-report', { recursive: true })
  await writeFile('a11y-report/report.json', JSON.stringify(report, null, 2))
  stopPreview(preview)
}

if (failed) process.exit(1)
