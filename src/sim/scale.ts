const SCALE_MIN = 0.4
const SCALE_MAX = 200

export function mbpsToPosition(mbps: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, mbps))
  return Math.log(clamped / SCALE_MIN) / Math.log(SCALE_MAX / SCALE_MIN)
}

export function positionToMbps(position: number): number {
  const t = Math.min(1, Math.max(0, position))
  const raw = SCALE_MIN * Math.exp(t * Math.log(SCALE_MAX / SCALE_MIN))
  if (raw < 10) return Math.round(raw * 10) / 10
  return Math.round(raw)
}

export function flowSeconds(mbps: number): number {
  return 1.7 - mbpsToPosition(mbps) * 1.45
}
