import { STARTUP_SEC } from './buffer.ts'
import { bytesPerSecond } from './units.ts'

export function formatMb(mbps: number): string {
  return `${mbps.toFixed(2).replace(/\.?0+$/, '')}Mb`
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const remain = whole % 60
  return `${minutes}:${String(remain).padStart(2, '0')}`
}

function waitPhrase(eta: number, verb: '開始' | '繼續'): string {
  if (eta < 0.15) return `馬上${verb}`
  return `大約 ${Math.max(1, Math.round(eta))} 秒後${verb}`
}

export function describePlayback(args: {
  speedLabel: string
  bandwidthMbps: number
  rungLabel: string
  bitrateMbps: number
  playing: boolean
  bufferSec: number
  mediaTime: number
  brief?: boolean
}): string {
  const rate = `${args.rungLabel} 每秒要 ${formatMb(args.bitrateMbps)}`
  const pipe = `管子是 ${args.speedLabel}`
  const sustainable = args.bandwidthMbps >= args.bitrateMbps
  if (args.brief) {
    const need = `${args.rungLabel} 每秒要 ${formatMb(args.bitrateMbps)}`
    if (args.playing) return sustainable ? `${need}，播得動。` : `${need}，快不夠了。`
    const ratio = args.bitrateMbps <= 0 ? 0 : args.bandwidthMbps / args.bitrateMbps
    const eta = (STARTUP_SEC - args.bufferSec) / Math.max(ratio, 0.05)
    const verb = args.mediaTime <= 0.05 ? '開始' : '繼續'
    const head = args.mediaTime <= 0.05 ? '先緩衝' : '緩衝用完'
    if (eta < 0.15) return `${args.rungLabel} 馬上${verb}。`
    return `${args.rungLabel} ${head}，大約 ${Math.max(1, Math.round(eta))} 秒後${verb}。`
  }
  if (!args.playing) {
    const ratio = args.bitrateMbps <= 0 ? 0 : args.bandwidthMbps / args.bitrateMbps
    const eta = (STARTUP_SEC - args.bufferSec) / Math.max(ratio, 0.05)
    if (args.mediaTime <= 0.05) return `${rate}，${pipe}。先緩衝，${waitPhrase(eta, '開始')}。`
    return `${rate}，${pipe}。緩衝用完了，${waitPhrase(eta, '繼續')}。`
  }
  if (!sustainable) return `${rate}，${pipe}。這段還播得了，緩衝很快會用完。`
  return `${rate}，${pipe}。播得動。`
}

export function describeFeed(bandwidthMbps: number, speedLabel: string): string {
  const perSecond = bytesPerSecond(bandwidthMbps)
  const small = 260_000 / perSecond
  const large = 860_000 / perSecond
  if (large < 0.15) return `${speedLabel}：幾乎一起出現。`
  return `${speedLabel}：字先到。小圖 ${small.toFixed(1)} 秒，大圖 ${large.toFixed(1)} 秒，一張接一張。`
}
