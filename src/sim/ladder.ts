export type Rung = {
  id: string
  label: string
  mbps: number
  sharpness: number
}

export const SPEEDS = [
  { id: 'k512', label: '512Kbps', short: '512K', mbps: 0.512 },
  { id: 'm1', label: '1Mbps', short: '1M', mbps: 1 },
  { id: 'm5', label: '5Mbps', short: '5M', mbps: 5 },
  { id: 'm10', label: '10Mbps', short: '10M', mbps: 10 },
  { id: 'm21', label: '21Mbps', short: '21M', mbps: 21 },
  { id: 'm100', label: '100Mbps', short: '100M', mbps: 100 },
] as const

export type SpeedId = (typeof SPEEDS)[number]['id']

export const VIDEO_LADDER: readonly Rung[] = [
  { id: '240', label: '240p', mbps: 0.7, sharpness: 0.18 },
  { id: '360', label: '360p', mbps: 1, sharpness: 0.32 },
  { id: '480', label: '480p', mbps: 1.8, sharpness: 0.48 },
  { id: '720', label: '720p', mbps: 3, sharpness: 0.72 },
  { id: '1080', label: '1080p', mbps: 6, sharpness: 0.82 },
  { id: '1440', label: '1440p', mbps: 12, sharpness: 0.92 },
  { id: '2160', label: '2160p', mbps: 25, sharpness: 1 },
]

export const REEL_LADDER: readonly Rung[] = [
  { id: '360', label: '360p', mbps: 0.8, sharpness: 0.34 },
  { id: '720', label: '720p', mbps: 2.5, sharpness: 0.72 },
  { id: '1080', label: '1080p', mbps: 4.5, sharpness: 1 },
]

export const GENERATIONS = [
  {
    id: '3g',
    label: '3G',
    mbps: 2,
    note: '3G 這一帶常見是 1–5Mbps，沒有固定值。自動會自己降畫質。硬選 1080p，就會一直轉。',
  },
  {
    id: '4g',
    label: '4G',
    mbps: 20,
    note: '4G 這一帶常見是 10–50Mbps。1080p 通常播得動。方案寫限速 21Mbps，人就停在這裡，跟手機是不是 4G 無關。',
  },
  {
    id: '5g',
    label: '5G',
    mbps: 150,
    note: '5G 訊號好會超過 100Mbps，畫質不再是問題。方案一降速，5G 手機也會離開這一帶，回到限速的那個 Mbps。',
  },
] as const

export type GenerationId = (typeof GENERATIONS)[number]['id']

export function zoneFor(mbps: number) {
  if (mbps < 6) return GENERATIONS[0]
  if (mbps < 60) return GENERATIONS[1]
  return GENERATIONS[2]
}

export function pickRung(bandwidthMbps: number, ladder: readonly Rung[]): Rung {
  let chosen: Rung | null = null
  for (const rung of ladder) {
    if (rung.mbps <= bandwidthMbps) chosen = rung
  }
  return chosen ?? ladder[0]
}

export function resolveRung(
  ladder: readonly Rung[],
  qualityId: string,
  bandwidthMbps: number,
): Rung {
  if (qualityId === 'auto') return pickRung(bandwidthMbps, ladder)
  return ladder.find((rung) => rung.id === qualityId) ?? pickRung(bandwidthMbps, ladder)
}

export function speedParts(mbps: number): { value: string; unit: string } {
  if (mbps < 1) return { value: String(Math.round(mbps * 1000)), unit: 'Kbps' }
  if (mbps < 10) {
    const rounded = Math.round(mbps * 10) / 10
    return { value: String(rounded), unit: 'Mbps' }
  }
  return { value: String(Math.round(mbps)), unit: 'Mbps' }
}

export function speedLabel(mbps: number): string {
  const parts = speedParts(mbps)
  return `${parts.value}${parts.unit}`
}
