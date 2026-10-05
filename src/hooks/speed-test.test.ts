// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { measureLine } from '../sim/measure.ts'
import { useSpeedTest } from './useSpeedTest.ts'

vi.mock('../sim/measure.ts', () => ({
  measureLine: vi.fn(),
}))

describe('useSpeedTest', () => {
  beforeEach(() => {
    vi.mocked(measureLine).mockReset()
  })

  it('starts on its own, paints live samples, then keeps one result', async () => {
    let now = 1_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    let report = (_mbps: number) => {}
    let finish = (_result: { mbps: number; latencyMs: number }) => {}
    vi.mocked(measureLine).mockImplementation((_signal, onProgress) => {
      report = onProgress
      return new Promise((resolve) => {
        finish = resolve
      })
    })
    const onResult = vi.fn()
    const { result, unmount } = renderHook(() => useSpeedTest(onResult, true))
    expect(result.current.phase).toBe('running')

    act(() => report(12))
    expect(result.current.liveMbps).toBe(12)
    act(() => report(40))
    expect(result.current.liveMbps).toBe(12)
    now += 200
    act(() => report(18))
    expect(result.current.liveMbps).toBe(18)

    await act(async () => finish({ mbps: 21, latencyMs: 30 }))
    expect(result.current.phase).toBe('done')
    expect(result.current.liveMbps).toBe(21)
    expect(onResult).toHaveBeenCalledWith({ mbps: 21, latencyMs: 30 })
    unmount()
  })

  it('ignores an aborted run and surfaces a real failure', async () => {
    vi.mocked(measureLine).mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const aborted = renderHook(() => useSpeedTest(() => undefined, true))
    await act(async () => {
      await Promise.resolve()
    })
    expect(aborted.result.current.phase).toBe('running')

    vi.mocked(measureLine).mockRejectedValue(new Error('offline'))
    const failed = renderHook(() => useSpeedTest(() => undefined, true))
    await act(async () => {
      await Promise.resolve()
    })
    expect(failed.result.current.phase).toBe('error')
    act(() => failed.result.current.acknowledge())
    expect(failed.result.current.phase).toBe('idle')

    const running = renderHook(() => useSpeedTest(() => undefined, true))
    act(() => running.result.current.acknowledge())
    expect(running.result.current.phase).toBe('running')
  })

  it('drops a result that arrives after stop, and can be started again', async () => {
    let finish = (_result: { mbps: number; latencyMs: number }) => {}
    vi.mocked(measureLine).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const onResult = vi.fn()
    const { result, unmount } = renderHook(() => useSpeedTest(onResult, false))
    expect(measureLine).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')

    act(() => result.current.start())
    expect(result.current.phase).toBe('running')
    act(() => result.current.stop())
    expect(result.current.phase).toBe('idle')
    await act(async () => finish({ mbps: 9, latencyMs: 10 }))
    expect(onResult).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')

    act(() => result.current.start())
    expect(vi.mocked(measureLine).mock.calls.length).toBeGreaterThanOrEqual(2)
    unmount()

    let rejectRun = (_error: unknown) => {}
    vi.mocked(measureLine).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRun = reject
        }),
    )
    const late = renderHook(() => useSpeedTest(() => undefined, false))
    act(() => late.result.current.start())
    act(() => late.result.current.stop())
    await act(async () => rejectRun(new Error('late')))
    expect(late.result.current.phase).toBe('idle')
  })
})
