import { speedLabel } from './ladder.ts'

const ENDPOINT = 'https://speed.cloudflare.com/__down'

export function mbpsFromBytes(bytes: number, seconds: number): number {
  if (seconds <= 0 || bytes <= 0) return 0
  return (bytes * 8) / seconds / 1_000_000
}

export function roundMbps(mbps: number): number {
  if (mbps < 1) return Math.round(mbps * 100) / 100
  if (mbps < 10) return Math.round(mbps * 10) / 10
  return Math.round(mbps)
}

export function measureNote(mbps: number, latencyMs: number): string {
  return `下載約 ${speedLabel(mbps)}，第一包約 ${Math.round(latencyMs)}ms。畫面只照這個 Mbps 走。`
}

function endpoint(bytes: number): string {
  return `${ENDPOINT}?bytes=${bytes}&t=${Date.now()}-${Math.random()}`
}

async function readBody(
  response: Response,
  signal: AbortSignal,
  limitMs: number,
  onBytes?: (bytes: number, seconds: number) => void,
): Promise<{ bytes: number; seconds: number }> {
  if (!response.ok || !response.body) throw new Error('download failed')
  const reader = response.body.getReader()
  const started = performance.now()
  let bytes = 0
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      const seconds = (performance.now() - started) / 1000
      onBytes?.(bytes, seconds)
      if (performance.now() - started >= limitMs) {
        await reader.cancel()
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
  return { bytes, seconds: (performance.now() - started) / 1000 }
}

async function once(bytes: number, signal: AbortSignal, limitMs: number): Promise<number> {
  const response = await fetch(endpoint(bytes), { cache: 'no-store', signal })
  await readBody(response, signal, limitMs)
  return 0
}

async function timeToHeaders(signal: AbortSignal): Promise<number> {
  const start = performance.now()
  const response = await fetch(endpoint(1000), { cache: 'no-store', signal })
  const elapsed = performance.now() - start
  await response.body?.cancel().catch(() => undefined)
  return elapsed
}

async function medianLatency(signal: AbortSignal): Promise<number> {
  const samples: number[] = []
  for (let i = 0; i < 3; i++) samples.push(await timeToHeaders(signal))
  samples.sort((a, b) => a - b)
  return samples[1]
}

async function timedDownload(
  bytes: number,
  limitMs: number,
  signal: AbortSignal,
  onProgress: (mbps: number) => void,
): Promise<number> {
  const response = await fetch(endpoint(bytes), { cache: 'no-store', signal })
  const sample = await readBody(response, signal, limitMs, (got, seconds) => {
    onProgress(mbpsFromBytes(got, seconds))
  })
  if (sample.bytes < 1) throw new Error('empty download')
  return mbpsFromBytes(sample.bytes, sample.seconds)
}

export async function measureLine(
  signal: AbortSignal,
  onProgress: (mbps: number) => void,
): Promise<{ mbps: number; latencyMs: number }> {
  await once(100_000, signal, 5000)
  const latencyMs = await medianLatency(signal)
  let mbps = await timedDownload(12_000_000, 7000, signal, onProgress)
  if (mbps > 80) mbps = await timedDownload(12_000_000, 7000, signal, onProgress)
  return { mbps: roundMbps(mbps), latencyMs }
}
