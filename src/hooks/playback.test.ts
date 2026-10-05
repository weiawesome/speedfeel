// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rung } from '../sim/ladder.ts'
import { useBytePipe } from './useBytePipe.ts'
import { usePlayback } from './usePlayback.ts'

const rung: Rung = { id: '360', label: '360p', mbps: 1, sharpness: 0.32 }

let frames: FrameRequestCallback[] = []
let clock = 0

function flush(count: number) {
  for (let i = 0; i < count; i++) {
    const frame = frames.shift()
    if (!frame) throw new Error('no frame queued')
    clock += 100
    act(() => frame(clock))
  }
}

describe('playback hooks', () => {
  beforeEach(() => {
    frames = []
    clock = 1_000
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fills, seeks, and rebuffers when the picture gets heavier', () => {
    const { result, rerender, unmount } = renderHook(
      (props: { lineMbps: number; rung: Rung; enabled: boolean; hold: boolean; capAtStartup: boolean }) =>
        usePlayback({
          fillMbps: 100,
          lineMbps: props.lineMbps,
          rung: props.rung,
          enabled: props.enabled,
          capAtStartup: props.capAtStartup,
          hold: props.hold,
        }),
      { initialProps: { lineMbps: 100, rung, enabled: true, hold: false, capAtStartup: false } },
    )

    flush(3)
    expect(result.current.snap.playing).toBe(true)
    expect(result.current.snap.mediaTime).toBeGreaterThan(0)

    act(() => result.current.seek(40))
    expect(result.current.snap.mediaTime).toBe(40)
    expect(result.current.snap.playing).toBe(false)

    rerender({ lineMbps: 80, rung, enabled: true, hold: false, capAtStartup: false })
    expect(result.current.snap.mediaTime).toBe(40)

    const heavier: Rung = { ...rung, id: '1080', mbps: 6 }
    rerender({ lineMbps: 80, rung: heavier, enabled: true, hold: false, capAtStartup: false })
    expect(result.current.snap.bufferSec).toBe(0)
    expect(result.current.snap.playing).toBe(false)
    expect(result.current.stateRef.current.mediaTime).toBe(40)

    unmount()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('does not play while prefetching or while the scene is off', () => {
    const prefetch = renderHook(() =>
      usePlayback({ fillMbps: 1, lineMbps: 1, rung, enabled: true, capAtStartup: true }),
    )
    flush(4)
    expect(prefetch.result.current.snap.playing).toBe(false)
    expect(prefetch.result.current.snap.mediaTime).toBe(0)
    prefetch.unmount()

    frames = []
    const paused = renderHook(() =>
      usePlayback({ fillMbps: 100, lineMbps: 100, rung, enabled: true, capAtStartup: false, hold: true }),
    )
    flush(2)
    expect(paused.result.current.snap.mediaTime).toBe(0)
    paused.unmount()

    frames = []
    renderHook(() => usePlayback({ fillMbps: 100, lineMbps: 100, rung, enabled: false, capAtStartup: false }))
    expect(frames).toHaveLength(0)
  })

  it('spends the pipe on one attachment at a time', () => {
    const { result, rerender, unmount } = renderHook(
      (props: { mbps: number; queue: readonly { id: string; bytes: number }[] }) => useBytePipe(props.mbps, props.queue),
      { initialProps: { mbps: 0.01, queue: [{ id: 'a', bytes: 50_000 }, { id: 'b', bytes: 50_000 }] } },
    )
    flush(1)
    expect(result.current).toEqual({})
    flush(1)
    expect(result.current.a).toBeGreaterThan(0)
    expect(result.current.b).toBeUndefined()

    rerender({ mbps: 100, queue: [{ id: 'a', bytes: 1_000 }, { id: 'b', bytes: 1_000 }] })
    flush(2)
    expect(result.current.a).toBe(1_000)
    expect(result.current.b).toBe(1_000)
    unmount()
  })
})
