export type BufferState = {
  bufferSec: number
  playing: boolean
  mediaTime: number
}

export const STARTUP_SEC = 1.6
export const MAX_BUFFER_SEC = 4

export function initialBuffer(): BufferState {
  return { bufferSec: 0, playing: false, mediaTime: 0 }
}

export function stepBuffer(
  state: BufferState,
  dt: number,
  bandwidthMbps: number,
  bitrateMbps: number,
  options?: { capAtStartup?: boolean; hold?: boolean },
): BufferState {
  const ratio = bitrateMbps <= 0 ? 0 : bandwidthMbps / bitrateMbps
  let bufferSec = state.bufferSec + ratio * dt
  let playing = state.playing
  let mediaTime = state.mediaTime

  if (options?.capAtStartup) {
    if (bufferSec > STARTUP_SEC) bufferSec = STARTUP_SEC
    return { bufferSec, playing: false, mediaTime }
  }

  if (options?.hold) {
    if (bufferSec > MAX_BUFFER_SEC) bufferSec = MAX_BUFFER_SEC
    return {
      bufferSec,
      playing: state.playing || bufferSec >= STARTUP_SEC,
      mediaTime: state.mediaTime,
    }
  }

  if (playing) {
    bufferSec -= dt
    if (bufferSec <= 0.0001) {
      bufferSec = 0
      playing = false
    } else {
      mediaTime += dt
    }
  }

  if (!playing && bufferSec >= STARTUP_SEC) playing = true
  if (bufferSec > MAX_BUFFER_SEC) bufferSec = MAX_BUFFER_SEC

  return { bufferSec, playing, mediaTime }
}

export function seekTo(mediaTime: number): BufferState {
  return { bufferSec: 0, playing: false, mediaTime: Math.max(0, mediaTime) }
}

export function retarget(
  state: BufferState,
  previousBitrate: number,
  nextBitrate: number,
  nextBandwidth: number,
): BufferState {
  if (nextBitrate > previousBitrate + 0.05) {
    return { ...state, bufferSec: 0, playing: false }
  }
  if (nextBandwidth < nextBitrate) {
    return {
      ...state,
      bufferSec: Math.min(state.bufferSec, 0.45),
      playing: state.playing && state.bufferSec > 0,
    }
  }
  return state
}
