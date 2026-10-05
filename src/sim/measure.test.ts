import { afterEach, describe, expect, it, vi } from 'vitest'
import { mbpsFromBytes, measureLine, measureNote, roundMbps } from './measure.ts'

function streamOf(chunks: Uint8Array[]) {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(chunks[index])
      index += 1
    },
  })
}

function ok(chunks: Uint8Array[]) {
  return new Response(streamOf(chunks), { status: 200 })
}

describe('measure math', () => {
  it('rounds a sample the way the readout does', () => {
    expect(mbpsFromBytes(0, 1)).toBe(0)
    expect(mbpsFromBytes(125_000, 0)).toBe(0)
    expect(roundMbps(0.512)).toBe(0.51)
    expect(roundMbps(4.44)).toBe(4.4)
    expect(roundMbps(42.6)).toBe(43)
    expect(measureNote(21, 18.4)).toContain('第一包')
    expect(measureNote(21, 18.4)).toContain('21Mbps')
  })
})

describe('measureLine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('warms up, takes the middle header time, then times one download', async () => {
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      clock += 200
      return clock
    })
    const fetchMock = vi.fn(async () => {
      const response = ok([new Uint8Array(125_000)])
      if (response.body) vi.spyOn(response.body, 'cancel').mockRejectedValue(new Error('closed'))
      return response
    })
    vi.stubGlobal('fetch', fetchMock)
    const samples: number[] = []
    const result = await measureLine(new AbortController().signal, (mbps) => samples.push(mbps))
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(samples.length).toBeGreaterThan(0)
    expect(result.mbps).toBeGreaterThan(0)
    expect(result.latencyMs).toBeGreaterThan(0)
  })

  it('times a second download when the first sample is faster than 80Mbps', async () => {
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      clock += 200
      return clock
    })
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        if (calls === 5) return ok([new Uint8Array(20_000_000)])
        return ok([new Uint8Array(125_000)])
      }),
    )
    const result = await measureLine(new AbortController().signal, () => undefined)
    expect(calls).toBe(6)
    expect(result.mbps).toBeLessThan(80)
  })

  it('stops reading once the time limit is up', async () => {
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      clock += 8000
      return clock
    })
    const fetchMock = vi.fn(async () => {
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.enqueue(new Uint8Array(1000))
          },
        }),
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await measureLine(new AbortController().signal, () => undefined)
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(result.mbps).toBe(0)
  })

  it('rejects a failed or empty download and an aborted run', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })))
    await expect(measureLine(new AbortController().signal, () => undefined)).rejects.toThrow('download failed')

    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    await expect(measureLine(new AbortController().signal, () => undefined)).rejects.toThrow('download failed')

    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        if (calls >= 5) return ok([])
        return ok([new Uint8Array(1000)])
      }),
    )
    await expect(measureLine(new AbortController().signal, () => undefined)).rejects.toThrow('empty download')

    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn(async () => ok([new Uint8Array(1000)])))
    await expect(measureLine(controller.signal, () => undefined)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
