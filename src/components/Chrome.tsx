import { MAX_BUFFER_SEC } from '../sim/buffer.ts'

export function BufferBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / MAX_BUFFER_SEC) * 100))
  return (
    <div className="absolute inset-x-0 top-0 z-10 h-1 bg-black/45">
      <div className="h-full bg-white" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Spinner() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="grid size-16 place-items-center rounded-full bg-black/55">
        <div className="spin size-9 rounded-full border-2 border-white/30 border-t-white" />
      </div>
    </div>
  )
}

export function QualityBadge({ label }: { label: string }) {
  return (
    <div className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[13px] font-semibold text-white">
      {label}
    </div>
  )
}
