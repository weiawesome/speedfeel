import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SceneKind } from './content.ts'
import { paintFrame } from './draw.ts'

const kinds: SceneKind[] = ['coast', 'market', 'cat', 'rain', 'talk', 'store', 'night']

function context() {
  const gradient = { addColorStop() {} }
  return new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient
      if (prop === 'canvas') return {}
      return () => {}
    },
    set() {
      return true
    },
  })
}

function canvas(width: number, height: number, ctx: CanvasRenderingContext2D | null) {
  return {
    clientWidth: width,
    clientHeight: height,
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement
}

describe('paintFrame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws every scene, then skips resizing when the bitmap already matches', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 })
    const surface = canvas(320, 180, context())
    for (const kind of kinds) paintFrame(surface, kind, 0.4, 0.82, false)
    const painted = { width: surface.width, height: surface.height }
    paintFrame(surface, 'night', 2.2, 0.82, true)
    expect(surface.width).toBe(painted.width)
    expect(surface.height).toBe(painted.height)
  })

  it('ignores a tiny box, a missing context, and a zero pixel ratio', () => {
    vi.stubGlobal('window', { devicePixelRatio: 0 })
    const tiny = canvas(1, 180, context())
    paintFrame(tiny, 'coast', 0, 1)
    expect(tiny.width).toBe(0)

    const blank = canvas(320, 180, null)
    paintFrame(blank, 'coast', 0, 1)
    expect(blank.width).toBeGreaterThan(0)

    const blinkAt = Math.asin(0.99) / 2.2
    paintFrame(canvas(20, 20, context()), 'cat', blinkAt, 0.2)
  })
})
