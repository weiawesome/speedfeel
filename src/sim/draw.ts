import type { SceneKind } from './content.ts'

function disc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function person(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  time: number,
) {
  const step = Math.sin(time * 6) * scale * 0.35
  ctx.fillStyle = color
  disc(ctx, x, y - scale * 2.15, scale * 0.48, color)
  ctx.fillRect(x - scale * 0.42, y - scale * 1.65, scale * 0.84, scale * 1.35)
  ctx.fillRect(x - scale * 0.38, y - scale * 0.35, scale * 0.22, scale * 0.7 + step)
  ctx.fillRect(x + scale * 0.12, y - scale * 0.35, scale * 0.22, scale * 0.7 - step)
}

function drawCoast(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#7eb6dc')
  sky.addColorStop(0.5, '#f3d2a4')
  sky.addColorStop(1, '#16708a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  disc(ctx, w * (0.72 + Math.sin(time * 0.12) * 0.02), h * 0.26, Math.min(w, h) * 0.07, '#fff6d8')

  ctx.strokeStyle = '#1b2430'
  ctx.lineWidth = Math.max(1, w * 0.003)
  for (let i = 0; i < 3; i++) {
    const bx = (w * (0.15 + i * 0.18) + time * 22) % (w + 30) - 15
    const by = h * (0.16 + i * 0.045)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(bx + w * 0.012, by - h * 0.018, bx + w * 0.024, by)
    ctx.stroke()
  }

  ctx.fillStyle = '#14627a'
  ctx.fillRect(0, h * 0.62, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = Math.max(1, w * 0.004)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    const y = h * (0.7 + i * 0.06)
    for (let x = 0; x <= w; x += 6) {
      const yy = y + Math.sin(x * 0.05 + time * 1.6 + i) * h * 0.012
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  ctx.fillStyle = '#243038'
  ctx.fillRect(w * 0.08, h * 0.78, w * 0.5, h * 0.018)
  ctx.fillRect(w * 0.16, h * 0.78, w * 0.012, h * 0.22)
  ctx.fillRect(w * 0.46, h * 0.78, w * 0.012, h * 0.22)
  person(ctx, ((time * 36) % (w + 40)) - 20, h * 0.78, Math.min(w, h) * 0.035, '#1b2430', time)
}

function drawMarket(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  ctx.fillStyle = '#2a120e'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#6a2a22'
  ctx.fillRect(0, h * 0.72, w, h * 0.28)

  for (let i = 0; i < 3; i++) {
    const x = w * (0.18 + i * 0.28)
    ctx.fillStyle = i === 1 ? '#f0d28a' : '#c4472c'
    ctx.beginPath()
    ctx.moveTo(x - w * 0.16, h * 0.48)
    ctx.lineTo(x, h * 0.28)
    ctx.lineTo(x + w * 0.16, h * 0.48)
    ctx.closePath()
    ctx.fill()
    const glow = 0.45 + Math.sin(time * 3 + i) * 0.25
    disc(ctx, x, h * 0.4, w * 0.025, `rgba(255, 214, 140, ${glow})`)
  }

  ctx.strokeStyle = '#f0d28a'
  ctx.lineWidth = Math.max(1, w * 0.004)
  ctx.beginPath()
  ctx.moveTo(w * 0.05, h * 0.16)
  ctx.lineTo(w * 0.95, h * 0.2)
  ctx.stroke()
  for (let i = 0; i < 7; i++) {
    const x = w * (0.12 + i * 0.12)
    const y = h * (0.16 + i * 0.006)
    disc(ctx, x, y + Math.sin(time * 2 + i) * 2, w * 0.012, i % 2 ? '#fff6d8' : '#e25b3a')
  }

  person(ctx, w * (0.3 + Math.sin(time * 0.8) * 0.08), h * 0.72, Math.min(w, h) * 0.04, '#f4e1c1', time)
}

function drawCat(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  ctx.fillStyle = '#e7d3bf'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#c9845a'
  ctx.fillRect(0, h * 0.72, w, h)

  const cx = w * 0.52
  const cy = h * 0.58
  const s = Math.min(w, h)
  ctx.fillStyle = '#d9822b'
  ctx.beginPath()
  ctx.ellipse(cx, cy, s * 0.22, s * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  disc(ctx, cx + s * 0.12, cy - s * 0.16, s * 0.11, '#d9822b')
  ctx.beginPath()
  ctx.moveTo(cx + s * 0.04, cy - s * 0.24)
  ctx.lineTo(cx + s * 0.08, cy - s * 0.36)
  ctx.lineTo(cx + s * 0.14, cy - s * 0.22)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + s * 0.16, cy - s * 0.22)
  ctx.lineTo(cx + s * 0.24, cy - s * 0.32)
  ctx.lineTo(cx + s * 0.22, cy - s * 0.16)
  ctx.fill()

  const blink = Math.sin(time * 2.2) > 0.94
  ctx.fillStyle = '#1b2430'
  if (blink) {
    ctx.fillRect(cx + s * 0.08, cy - s * 0.16, s * 0.05, Math.max(1, s * 0.008))
    ctx.fillRect(cx + s * 0.16, cy - s * 0.16, s * 0.05, Math.max(1, s * 0.008))
  } else {
    disc(ctx, cx + s * 0.1, cy - s * 0.16, s * 0.018, '#1b2430')
    disc(ctx, cx + s * 0.18, cy - s * 0.16, s * 0.018, '#1b2430')
  }

  ctx.strokeStyle = '#f7efe6'
  ctx.lineWidth = Math.max(1, w * 0.004)
  ctx.beginPath()
  ctx.moveTo(cx + s * 0.2, cy - s * 0.12)
  ctx.lineTo(cx + s * 0.34, cy - s * 0.14)
  ctx.moveTo(cx + s * 0.2, cy - s * 0.09)
  ctx.lineTo(cx + s * 0.34, cy - s * 0.08)
  ctx.stroke()

  const tail = Math.sin(time * 2) * 0.4
  ctx.strokeStyle = '#d9822b'
  ctx.lineWidth = s * 0.03
  ctx.beginPath()
  ctx.moveTo(cx - s * 0.18, cy)
  ctx.quadraticCurveTo(cx - s * 0.32, cy - s * (0.2 + tail), cx - s * 0.12, cy - s * 0.28)
  ctx.stroke()
}

function drawRain(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  ctx.fillStyle = '#1c2836'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#31465c'
  ctx.fillRect(0, h * 0.78, w, h)

  ctx.fillStyle = '#d5dde6'
  ctx.beginPath()
  ctx.moveTo(w * 0.22, h * 0.7)
  ctx.lineTo(w * 0.78, h * 0.7)
  ctx.lineTo(w * 0.7, h * 0.5)
  ctx.lineTo(w * 0.48, h * 0.42)
  ctx.lineTo(w * 0.3, h * 0.52)
  ctx.closePath()
  ctx.fill()
  disc(ctx, w * 0.62, h * 0.56, w * 0.045, '#8fd0c8')
  disc(ctx, w * 0.34, h * 0.58, w * 0.03, '#f0d28a')

  ctx.strokeStyle = 'rgba(244,246,248,0.75)'
  ctx.lineWidth = Math.max(1, w * 0.003)
  for (let i = 0; i < 28; i++) {
    const x = (i * 47 + time * 80) % (w + 20) - 10
    const y = ((i * 83 + time * 220) % (h + 30)) - 20
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - w * 0.012, y + h * 0.04)
    ctx.stroke()
  }
  for (let i = 0; i < 4; i++) {
    disc(
      ctx,
      w * (0.18 + i * 0.2),
      h * (0.24 + (i % 2) * 0.3),
      w * (0.028 + (i % 3) * 0.012),
      'rgba(255,255,255,0.16)',
    )
  }
}

function drawTalk(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  ctx.fillStyle = '#1a2333'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#2c3c52'
  ctx.fillRect(0, h * 0.62, w, h)
  ctx.fillStyle = '#8fb8d8'
  ctx.fillRect(w * 0.06, h * 0.08, w * 0.28, h * 0.22)

  const bob = Math.sin(time * 1.6) * h * 0.008
  const cx = w * 0.56
  const s = Math.min(w, h)
  ctx.fillStyle = '#3d6b8a'
  ctx.beginPath()
  ctx.ellipse(cx, h * 0.92 + bob, s * 0.42, s * 0.36, 0, Math.PI, 0)
  ctx.fill()
  disc(ctx, cx, h * 0.46 + bob, s * 0.2, '#d7b39a')
  ctx.fillStyle = '#1b2430'
  ctx.beginPath()
  ctx.ellipse(cx, h * 0.34 + bob, s * 0.2, s * 0.14, 0, Math.PI, 0)
  ctx.fill()
  disc(ctx, cx - s * 0.07, h * 0.45 + bob, s * 0.018, '#1b2430')
  disc(ctx, cx + s * 0.07, h * 0.45 + bob, s * 0.018, '#1b2430')
  const mouth = (0.35 + (Math.sin(time * 8) * 0.5 + 0.5) * 0.65) * s * 0.045
  ctx.beginPath()
  ctx.ellipse(cx, h * 0.53 + bob, s * 0.045, Math.max(1, mouth), 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawNight(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  ctx.fillStyle = '#0e1624'
  ctx.fillRect(0, 0, w, h)
  const cols = ['#1b2740', '#243656', '#182033']
  for (let i = 0; i < 6; i++) {
    const bw = w * (0.16 + (i % 3) * 0.02)
    const bh = h * (0.28 + (i % 4) * 0.06)
    const x = i < 3 ? w * (0.02 + i * 0.15) : w * (0.52 + (i - 3) * 0.15)
    const top = h * 0.38 - bh * 0.25
    ctx.fillStyle = cols[i % 3]
    ctx.fillRect(x, top, bw, h * 0.72 - top)
    for (let wy = 0; wy < 4; wy++) {
      for (let wx = 0; wx < 2; wx++) {
        const on = Math.sin(time * 1.4 + i * 2 + wy * 3 + wx) > -0.15
        ctx.fillStyle = on ? '#f0d28a' : '#0e1624'
        ctx.fillRect(x + bw * (0.18 + wx * 0.36), top + bh * (0.16 + wy * 0.18), bw * 0.16, bh * 0.07)
      }
    }
  }
  ctx.fillStyle = '#121820'
  ctx.fillRect(0, h * 0.72, w, h * 0.28)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = Math.max(1, w * 0.004)
  ctx.setLineDash([w * 0.04, w * 0.05])
  ctx.beginPath()
  ctx.moveTo(w * 0.5, h * 0.74)
  ctx.lineTo(w * 0.5, h)
  ctx.stroke()
  ctx.setLineDash([])
  for (let i = 0; i < 3; i++) {
    const p = (time * 0.32 + i * 0.33) % 1
    const y = h * (0.74 + p * 0.26)
    disc(ctx, w * (0.36 - p * 0.08), y, w * (0.012 + p * 0.02), '#fff6d8')
    disc(ctx, w * (0.64 + p * 0.08), y, w * (0.012 + p * 0.02), '#fff6d8')
  }
  ctx.fillStyle = `rgba(255, 45, 85, ${0.45 + Math.sin(time * 3) * 0.25})`
  ctx.fillRect(w * 0.08, h * 0.14, w * 0.28, h * 0.028)
}

function drawStore(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  ctx.fillStyle = '#d7ebe3'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#f7fbf8'
  ctx.fillRect(w * 0.15, h * 0.18, w * 0.7, h * 0.5)
  const glow = 0.35 + Math.sin(time * 4) * 0.2
  ctx.fillStyle = `rgba(255, 196, 92, ${glow})`
  ctx.fillRect(w * 0.58, h * 0.28, w * 0.2, h * 0.22)
  ctx.strokeStyle = '#1b2430'
  ctx.lineWidth = Math.max(2, w * 0.008)
  ctx.strokeRect(w * 0.56, h * 0.26, w * 0.24, h * 0.28)
  ctx.fillStyle = '#1b2430'
  ctx.fillRect(w * 0.2, h * 0.7, w * 0.6, h * 0.04)
  person(ctx, w * 0.38, h * 0.7, Math.min(w, h) * 0.035, '#1b2430', time * 0.2)
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  kind: SceneKind,
  time: number,
  w: number,
  h: number,
) {
  switch (kind) {
    case 'coast':
      drawCoast(ctx, time, w, h)
      break
    case 'market':
      drawMarket(ctx, time, w, h)
      break
    case 'cat':
      drawCat(ctx, time, w, h)
      break
    case 'rain':
      drawRain(ctx, time, w, h)
      break
    case 'talk':
      drawTalk(ctx, time, w, h)
      break
    case 'store':
      drawStore(ctx, time, w, h)
      break
    case 'night':
      drawNight(ctx, time, w, h)
      break
  }
}

function applyFilm(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)

  let seed = Math.floor(time * 24) * 9973 + 17
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 56; i++) {
    seed = (seed * 16807) % 2147483647
    const x = seed % w
    seed = (seed * 16807) % 2147483647
    const y = seed % h
    ctx.fillRect(x, y, 2, 2)
  }
}

export function paintFrame(
  canvas: HTMLCanvasElement,
  kind: SceneKind,
  time: number,
  sharpness: number,
  film = false,
) {
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (cssW < 2 || cssH < 2) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(16, Math.round(cssW * dpr * sharpness))
  const h = Math.max(16, Math.round(cssH * dpr * sharpness))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (!film) {
    drawScene(ctx, kind, time, w, h)
    return
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(Math.sin(time * 0.85) * 0.012)
  ctx.scale(1.2, 1.2)
  ctx.translate(-w / 2 + Math.sin(time * 1.4) * w * 0.012, -h / 2 + Math.cos(time * 1.1) * h * 0.008)
  drawScene(ctx, kind, time, w, h)
  ctx.restore()
  applyFilm(ctx, time, w, h)
}
