import { useCallback, useEffect, useRef, useState } from 'react'
import { measureLine } from '../sim/measure.ts'

export type SpeedTestPhase = 'idle' | 'running' | 'done' | 'error'

export function useSpeedTest(
  onResult: (result: { mbps: number; latencyMs: number }) => void,
  autoStart = false,
) {
  const [phase, setPhase] = useState<SpeedTestPhase>(autoStart ? 'running' : 'idle')
  const [liveMbps, setLiveMbps] = useState(0)
  const onResultRef = useRef(onResult)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const run = useCallback((controller: AbortController) => {
    abortRef.current = controller
    let lastPaint = 0
    void measureLine(controller.signal, (mbps) => {
      const now = performance.now()
      if (now - lastPaint < 160) return
      lastPaint = now
      setLiveMbps(mbps)
    })
      .then((result) => {
        if (controller.signal.aborted) return
        setLiveMbps(result.mbps)
        setPhase('done')
        onResultRef.current(result)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPhase('error')
      })
  }, [])

  const start = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    setPhase('running')
    setLiveMbps(0)
    run(controller)
  }, [run])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!autoStart) return
    const controller = new AbortController()
    run(controller)
    return () => controller.abort()
  }, [autoStart, run])

  const stop = () => {
    abortRef.current?.abort()
    setPhase('idle')
  }

  const acknowledge = () => {
    setPhase((current) => (current === 'running' ? current : 'idle'))
  }

  return { phase, liveMbps, start, stop, acknowledge }
}
