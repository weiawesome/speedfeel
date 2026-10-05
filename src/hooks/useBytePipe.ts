import { useEffect, useRef, useState } from 'react'
import { BYTES_PER_MBPS } from '../sim/units.ts'

type Asset = { id: string; bytes: number }

export function useBytePipe(mbps: number, queue: readonly Asset[]) {
  const [progress, setProgress] = useState<Record<string, number>>({})
  const progressRef = useRef<Record<string, number>>({})
  const mbpsRef = useRef(mbps)
  const queueRef = useRef(queue)

  useEffect(() => {
    mbpsRef.current = mbps
    queueRef.current = queue
  }, [mbps, queue])

  useEffect(() => {
    progressRef.current = {}
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      let budget = mbpsRef.current * BYTES_PER_MBPS * dt
      const got = progressRef.current
      for (const item of queueRef.current) {
        const have = got[item.id] ?? 0
        if (have >= item.bytes) continue
        const take = Math.min(item.bytes - have, budget)
        got[item.id] = have + take
        budget -= take
        if (budget <= 0) break
      }
      acc += dt
      if (acc >= 0.08) {
        acc = 0
        setProgress({ ...got })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return progress
}
