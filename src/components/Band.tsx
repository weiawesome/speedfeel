import { motion, useMotionValueEvent, useReducedMotion, useSpring } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { GENERATIONS, speedParts, zoneFor } from '../sim/ladder.ts'
import { flowSeconds, mbpsToPosition, positionToMbps } from '../sim/scale.ts'
import { switchPhysics, switchSpring } from '../ui/spring.ts'

const ZONE_CLASS = {
  '3g': 'bg-slow text-ink',
  '4g': 'bg-mid text-ink',
  '5g': 'bg-fast text-white',
} as const

const ZONE_BAR = {
  '3g': '#f0b09a',
  '4g': '#9ec0dc',
  '5g': '#2457d6',
} as const

const THUMB = 88
const THUMB_PAD = 4

type Props = {
  mbps: number
  pending?: boolean
  onChange: (mbps: number) => void
  onCommit: (mbps: number) => void
}

export function Band({ mbps, pending = false, onChange, onCommit }: Props) {
  const reduce = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const chosenRef = useRef(mbps)
  const dragRef = useRef(false)
  const placedRef = useRef(false)
  const travelRef = useRef(0)
  const thumbX = useSpring(0, switchPhysics)
  const [readout, setReadout] = useState(() => speedParts(mbps))
  const position = mbpsToPosition(mbps)

  useMotionValueEvent(thumbX, 'change', (x) => {
    const travel = travelRef.current
    if (travel <= 0) return
    const next = speedParts(positionToMbps((x - THUMB_PAD) / travel))
    setReadout((current) => (current.value === next.value && current.unit === next.unit ? current : next))
  })

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const place = () => {
      const travel = Math.max(0, track.clientWidth - THUMB - THUMB_PAD * 2)
      travelRef.current = travel
      const next = THUMB_PAD + position * travel
      if (!placedRef.current || dragRef.current || reduce) thumbX.jump(next)
      else thumbX.set(next)
      placedRef.current = true
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(track)
    return () => observer.disconnect()
  }, [position, reduce, thumbX])
  const cuts = [0, mbpsToPosition(6), mbpsToPosition(60), 1]
  const zone = zoneFor(mbps).id

  const move = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const next = positionToMbps((clientX - rect.left) / rect.width)
    chosenRef.current = next
    onChange(next)
  }

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-3">
        {GENERATIONS.map((item) => {
          const selected = !pending && item.id === zone
          return (
            <button
              key={item.id}
              type="button"
              className={`relative pb-2 text-center text-[15px] ${selected ? 'font-semibold text-ink' : 'text-muted'}`}
              onClick={() => onCommit(item.mbps)}
            >
              {item.label}
              {selected ? (
                <motion.span
                  layoutId="zone-mark"
                  className="absolute inset-x-0 bottom-0 h-0.5"
                  style={{ backgroundColor: ZONE_BAR[item.id] }}
                  transition={reduce ? { duration: 0 } : switchSpring}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="模擬網速"
      aria-valuemin={0.4}
      aria-valuemax={200}
      aria-valuenow={pending ? undefined : mbps}
      aria-valuetext={pending ? '測量中' : `${readout.value} ${readout.unit}`}
      className="relative h-[68px] touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) return
        dragRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        move(event.clientX)
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return
        move(event.clientX)
      }}
      onPointerUp={() => {
        if (!dragRef.current) return
        dragRef.current = false
        onCommit(chosenRef.current)
      }}
      onKeyDown={(event) => {
        const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 0.04 : 0
        const back = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -0.04 : 0
        if (step || back) {
          event.preventDefault()
          onCommit(positionToMbps(position + step + back))
          return
        }
        if (event.key === 'Home') onCommit(0.4)
        if (event.key === 'End') onCommit(200)
      }}
    >
      <div className="absolute inset-0 flex overflow-hidden rounded-full">
        {GENERATIONS.map((zone, index) => (
          <div
            key={zone.id}
            className={ZONE_CLASS[zone.id]}
            style={{ width: `${(cuts[index + 1] - cuts[index]) * 100}%` }}
          />
        ))}
      </div>
      <div
        className="band-flow pointer-events-none absolute inset-0 rounded-full"
        style={{ animationDuration: `${flowSeconds(mbps)}s` }}
      />
      <motion.div
        className="absolute top-1 bottom-1 left-0 z-20 flex w-[88px] flex-col items-center justify-center rounded-full bg-paper text-ink"
        style={{ x: thumbX }}
      >
        <span className={`leading-none font-semibold tabular-nums ${pending ? 'text-[18px]' : 'text-[26px]'}`}>
          {pending ? '測量' : readout.value}
        </span>
        <span className="text-[11px] font-semibold">{pending ? '' : readout.unit}</span>
      </motion.div>
    </div>
    </div>
  )
}
