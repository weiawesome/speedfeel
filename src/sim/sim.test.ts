import { describe, expect, it } from 'vitest'
import { initialBuffer, MAX_BUFFER_SEC, STARTUP_SEC, retarget, seekTo, stepBuffer } from './buffer.ts'
import { describeFeed, describePlayback, formatClock, formatMb } from './copy.ts'
import { cycleFeedTheme, feedQueue, mediaBytes, MOVIE, POSTS } from './content.ts'
import { REEL_LADDER, VIDEO_LADDER, pickRung, resolveRung, speedLabel, speedParts, zoneFor } from './ladder.ts'
import { mbpsFromBytes, roundMbps } from './measure.ts'
import { flowSeconds, mbpsToPosition, positionToMbps } from './scale.ts'
import { bytesPerSecond } from './units.ts'

function run(seconds: number, bandwidth: number, bitrate: number, cap = false) {
  let state = initialBuffer()
  const dt = 0.05
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) {
    state = stepBuffer(state, dt, bandwidth, bitrate, { capAtStartup: cap })
  }
  return state
}

describe('pickRung', () => {
  it('maps carrier speeds onto a video quality', () => {
    expect(pickRung(0.512, VIDEO_LADDER).label).toBe('240p')
    expect(pickRung(1, VIDEO_LADDER).label).toBe('360p')
    expect(pickRung(5, VIDEO_LADDER).label).toBe('720p')
    expect(pickRung(10, VIDEO_LADDER).label).toBe('1080p')
    expect(pickRung(21, VIDEO_LADDER).label).toBe('1440p')
    expect(pickRung(100, VIDEO_LADDER).label).toBe('2160p')
  })

  it('keeps short video hungry enough that 512Kbps cannot hold it', () => {
    expect(pickRung(0.512, REEL_LADDER).mbps).toBeGreaterThan(0.512)
    expect(pickRung(1, REEL_LADDER).label).toBe('360p')
    expect(pickRung(5, REEL_LADDER).label).toBe('1080p')
  })
})

describe('stepBuffer', () => {
  it('waits for a startup buffer before playing', () => {
    expect(run(1, 1, 1).playing).toBe(false)
    expect(run(1.7, 1, 1).playing).toBe(true)
  })

  it('stalls when the pipe is thinner than the picture', () => {
    expect(run(3, 0.512, 0.7).playing).toBe(true)
    expect(run(9, 0.512, 0.7).playing).toBe(false)
    expect(run(11, 0.512, 0.7).playing).toBe(true)
  })

  it('starts almost immediately at 100Mbps', () => {
    expect(run(0.2, 100, 6).playing).toBe(true)
  })

  it('prefetches only up to the startup buffer and does not play', () => {
    const state = run(10, 0.2, 0.8, true)
    expect(state.playing).toBe(false)
    expect(state.bufferSec).toBeLessThanOrEqual(1.6)
    expect(state.mediaTime).toBe(0)
  })

  it('keeps filling while paused and does not move the picture', () => {
    const playing = run(2, 5, 1)
    const held = stepBuffer(playing, 0.4, 5, 1, { hold: true })
    expect(held.playing).toBe(true)
    expect(held.mediaTime).toBeCloseTo(playing.mediaTime)
    expect(held.bufferSec).toBeGreaterThanOrEqual(playing.bufferSec)

    let waiting = initialBuffer()
    waiting = stepBuffer(waiting, 1.7, 1, 1, { hold: true })
    expect(waiting.playing).toBe(true)
    expect(waiting.mediaTime).toBe(0)
  })

  it('drops the buffer when the playhead is moved', () => {
    const playing = run(2, 5, 1)
    const jumped = seekTo(90)
    expect(jumped.mediaTime).toBe(90)
    expect(jumped.bufferSec).toBe(0)
    expect(jumped.playing).toBe(false)
    expect(playing.mediaTime).toBeGreaterThan(0)
    expect(seekTo(-4).mediaTime).toBe(0)
  })

  it('does not invent bytes when the picture asks for none', () => {
    const next = stepBuffer(initialBuffer(), 1, 5, 0)
    expect(next.bufferSec).toBe(0)
    expect(next.playing).toBe(false)
  })

  it('stops stocking once the cushion is full', () => {
    const full = run(30, 100, 1)
    expect(full.bufferSec).toBeLessThanOrEqual(MAX_BUFFER_SEC)
    expect(full.mediaTime).toBeGreaterThan(0)
  })

  it('leaves a short pause under the cushion', () => {
    const held = stepBuffer({ bufferSec: 0, playing: false, mediaTime: 2 }, 0.05, 1, 1, { hold: true })
    expect(held.playing).toBe(false)
    expect(held.mediaTime).toBe(2)
    expect(held.bufferSec).toBeGreaterThan(0)
    expect(held.bufferSec).toBeLessThan(STARTUP_SEC)
  })

  it('caps a paused pipe at the same cushion', () => {
    const held = stepBuffer({ bufferSec: 3.8, playing: true, mediaTime: 4 }, 1, 100, 1, { hold: true })
    expect(held.bufferSec).toBe(MAX_BUFFER_SEC)
    expect(held.mediaTime).toBe(4)
  })
})

describe('retarget', () => {
  it('rebuffers when the chosen picture gets heavier', () => {
    const next = retarget({ bufferSec: 3, playing: true, mediaTime: 8 }, 1, 6, 100)
    expect(next.playing).toBe(false)
    expect(next.bufferSec).toBe(0)
    expect(next.mediaTime).toBe(8)
  })

  it('burns the cushion quickly when the pipe can no longer hold that picture', () => {
    const next = retarget({ bufferSec: 3, playing: true, mediaTime: 8 }, 6, 0.7, 0.512)
    expect(next.bufferSec).toBeLessThanOrEqual(0.45)
    expect(next.playing).toBe(true)
  })

  it('keeps the same picture when only the speed changes and it still fits', () => {
    const state = { bufferSec: 3, playing: true, mediaTime: 8 }
    expect(retarget(state, 6, 6, 20)).toBe(state)
  })

  it('stops a picture that has nothing buffered when the pipe gets too thin', () => {
    const next = retarget({ bufferSec: 0, playing: true, mediaTime: 2 }, 1, 1, 0.2)
    expect(next.bufferSec).toBe(0)
    expect(next.playing).toBe(false)
  })
})

describe('quality and generations', () => {
  it('lets a person force 1080p on a pipe that cannot hold it', () => {
    expect(resolveRung(VIDEO_LADDER, '1080', 1).label).toBe('1080p')
    expect(resolveRung(VIDEO_LADDER, 'auto', 1).label).toBe('360p')
    expect(resolveRung(REEL_LADDER, '240', 5).label).toBe('1080p')
  })

  it('places speeds into 3G, 4G, and 5G bands', () => {
    expect(zoneFor(5.9).id).toBe('3g')
    expect(zoneFor(6).id).toBe('4g')
    expect(zoneFor(21).id).toBe('4g')
    expect(zoneFor(59.9).id).toBe('4g')
    expect(zoneFor(60).id).toBe('5g')
    expect(zoneFor(150).id).toBe('5g')
  })

  it('prints Kbps below 1 and rounds the rest', () => {
    expect(speedParts(0.512)).toEqual({ value: '512', unit: 'Kbps' })
    expect(speedParts(4.24)).toEqual({ value: '4.2', unit: 'Mbps' })
    expect(speedLabel(21.6)).toBe('22Mbps')
  })
})

describe('scale', () => {
  it('maps the slow end and the fast end onto the band', () => {
    expect(mbpsToPosition(0.1)).toBeCloseTo(0)
    expect(mbpsToPosition(0.4)).toBeCloseTo(0)
    expect(mbpsToPosition(200)).toBeCloseTo(1)
    expect(mbpsToPosition(400)).toBeCloseTo(1)
    expect(positionToMbps(mbpsToPosition(20))).toBe(20)
    expect(positionToMbps(-1)).toBeCloseTo(0.4)
    expect(positionToMbps(2)).toBe(200)
    expect(flowSeconds(0.4)).toBeCloseTo(1.7)
    expect(flowSeconds(200)).toBeCloseTo(0.25)
  })

  it('turns bytes and seconds into Mbps', () => {
    expect(mbpsFromBytes(125_000, 1)).toBe(1)
    expect(roundMbps(42.4)).toBe(42)
  })
})

describe('feed copy', () => {
  it('uses decimal bytes so 1Mbps moves 125KB each second', () => {
    expect(bytesPerSecond(1)).toBe(125_000)
    expect(describeFeed(1, '1Mbps')).toContain('一張接一張')
    expect(describeFeed(40, '40Mbps')).toContain('一張接一張')
    expect(describeFeed(46, '46Mbps')).toContain('幾乎一起出現')
    expect(describeFeed(100, '100Mbps')).toContain('幾乎一起出現')
  })
})

describe('playback copy', () => {
  const base = {
    speedLabel: '1Mbps',
    bandwidthMbps: 1,
    rungLabel: '360p',
    bitrateMbps: 1,
    playing: false,
    bufferSec: 0,
    mediaTime: 0,
  }

  it('formats sizes and clocks', () => {
    expect(formatMb(1)).toBe('1Mb')
    expect(formatMb(4.5)).toBe('4.5Mb')
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(-3)).toBe('0:00')
  })

  it('says when a long video is waiting, playing, or about to stall', () => {
    expect(describePlayback(base)).toContain('先緩衝')
    expect(describePlayback({ ...base, mediaTime: 12, bufferSec: 0 })).toContain('緩衝用完了')
    expect(describePlayback({ ...base, playing: true, bandwidthMbps: 10 })).toContain('播得動')
    expect(describePlayback({ ...base, playing: true, bandwidthMbps: 0.2 })).toContain('緩衝很快會用完')
    expect(describePlayback({ ...base, bitrateMbps: 0, bufferSec: 1.6 })).toContain('馬上開始')
  })

  it('keeps the short-video sentence on one idea', () => {
    expect(describePlayback({ ...base, brief: true, playing: true, bandwidthMbps: 10, bitrateMbps: 4.5, rungLabel: '1080p' })).toBe(
      '1080p 每秒要 4.5Mb，播得動。',
    )
    expect(describePlayback({ ...base, brief: true, playing: true, bandwidthMbps: 1, bitrateMbps: 4.5, rungLabel: '1080p' })).toBe(
      '1080p 每秒要 4.5Mb，快不夠了。',
    )
    expect(describePlayback({ ...base, brief: true, bufferSec: 1.6 })).toContain('馬上開始')
    expect(describePlayback({ ...base, brief: true, mediaTime: 8, bufferSec: 1.6 })).toContain('馬上繼續')
    expect(describePlayback({ ...base, brief: true, bitrateMbps: 0 })).toContain('先緩衝')
    expect(describePlayback({ ...base, brief: true, mediaTime: 8, bandwidthMbps: 0.2 })).toContain('緩衝用完')
  })
})

describe('feed queue', () => {
  it('cycles the three layouts and skips media that has no bytes', () => {
    expect(cycleFeedTheme('threads')).toBe('ig')
    expect(cycleFeedTheme('ig')).toBe('fb')
    expect(cycleFeedTheme('fb')).toBe('threads')
    expect(MOVIE.lengthSec).toBe(504)
    expect(mediaBytes(null)).toBe(0)
    const poll = POSTS.find((post) => post.id === 'poll')
    expect(mediaBytes(poll?.attachment ?? null)).toBe(0)
    const threads = feedQueue('threads').map((item) => item.id)
    expect(threads).toContain('poll:text')
    expect(threads).not.toContain('poll:media')
    expect(threads).not.toContain('cat:text')
    expect(feedQueue('ig').some((item) => item.id === 'cat:media')).toBe(true)
  })
})
