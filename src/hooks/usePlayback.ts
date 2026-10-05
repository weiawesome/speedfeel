import { useEffect, useRef, useState } from 'react'
import { initialBuffer, retarget, seekTo, stepBuffer, type BufferState } from '../sim/buffer.ts'
import type { Rung } from '../sim/ladder.ts'

type PlaybackOptions = {
  fillMbps: number
  lineMbps: number
  rung: Rung
  enabled: boolean
  capAtStartup: boolean
  hold?: boolean
}

export function usePlayback({
  fillMbps,
  lineMbps,
  rung,
  enabled,
  capAtStartup,
  hold = false,
}: PlaybackOptions) {
  const stateRef = useRef<BufferState>(initialBuffer())
  const [snap, setSnap] = useState<BufferState>(initialBuffer())
  const fillRef = useRef(fillMbps)
  const bitrateRef = useRef(rung.mbps)
  const capRef = useRef(capAtStartup)
  const holdRef = useRef(hold)
  const tuneRef = useRef({ bitrate: rung.mbps, bandwidth: lineMbps })

  useEffect(() => {
    fillRef.current = fillMbps
    bitrateRef.current = rung.mbps
    capRef.current = capAtStartup
    holdRef.current = hold
  }, [fillMbps, rung.mbps, capAtStartup, hold])

  useEffect(() => {
    const previous = tuneRef.current
    if (previous.bitrate === rung.mbps && previous.bandwidth === lineMbps) return
    const next = retarget(stateRef.current, previous.bitrate, rung.mbps, lineMbps)
    tuneRef.current = { bitrate: rung.mbps, bandwidth: lineMbps }
    if (next === stateRef.current) return
    stateRef.current = next
    setSnap(next)
  }, [lineMbps, rung.mbps])

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const prev = stateRef.current
      const next = stepBuffer(prev, dt, fillRef.current, bitrateRef.current, {
        capAtStartup: capRef.current,
        hold: holdRef.current,
      })
      stateRef.current = next
      const crossed = next.playing !== prev.playing
      acc += dt
      if (crossed || acc >= 0.08) {
        acc = 0
        setSnap({ ...next })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [enabled])

  const seek = (mediaTime: number) => {
    const next = seekTo(mediaTime)
    stateRef.current = next
    setSnap(next)
  }

  return { snap, stateRef, seek }
}
