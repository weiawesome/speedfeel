import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePlayback } from '../hooks/usePlayback.ts'
import { describePlayback, formatClock } from '../sim/copy.ts'
import { MOVIE } from '../sim/content.ts'
import { paintFrame } from '../sim/draw.ts'
import { VIDEO_LADDER, type Rung } from '../sim/ladder.ts'
import { switchSpring, viewSpring } from '../ui/spring.ts'

export type VideoSkin = 'yt' | 'bili'

const YT = '#ff0000'
const BILI = '#00aeec'

const FLYING = ['風比船先到', '這港口今天不靠人', '海平線還在後面']

type Props = {
  mbps: number
  speedLabel: string
  rung: Rung
  skin: VideoSkin
  qualityId: string
  onQuality: (id: string) => void
  onStatus: (text: string) => void
}

type Menu = 'closed' | 'settings' | 'quality'

export function VideoStage({ mbps, speedLabel, rung, skin, qualityId, onQuality, onStatus }: Props) {
  const reduce = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [paused, setPaused] = useState(false)
  const [menu, setMenu] = useState<Menu>('closed')
  const [danmaku, setDanmaku] = useState(true)
  const [seenSkin, setSeenSkin] = useState(skin)
  if (seenSkin !== skin) {
    setSeenSkin(skin)
    setMenu('closed')
  }
  const scrubRef = useRef<number | null>(null)
  const [scrub, setScrub] = useState<number | null>(null)
  const { snap, stateRef, seek } = usePlayback({
    fillMbps: mbps,
    lineMbps: mbps,
    rung,
    enabled: true,
    capAtStartup: false,
    hold: paused || scrub !== null,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let raf = 0
    const loop = () => {
      paintFrame(canvas, MOVIE.kind, scrubRef.current ?? stateRef.current.mediaTime, rung.sharpness)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [rung.sharpness, stateRef])

  const status = describePlayback({
    speedLabel,
    bandwidthMbps: mbps,
    rungLabel: rung.label,
    bitrateMbps: rung.mbps,
    playing: snap.playing,
    bufferSec: snap.bufferSec,
    mediaTime: snap.mediaTime,
  })

  useEffect(() => {
    onStatus(status)
  }, [onStatus, status])

  const played = scrub ?? Math.min(1, snap.mediaTime / MOVIE.lengthSec)
  const buffered = scrub === null ? Math.min(1, (snap.mediaTime + snap.bufferSec) / MOVIE.lengthSec) : scrub
  const clock = Math.min(played * MOVIE.lengthSec, MOVIE.lengthSec)

  const onScrub = (ratio: number, phase: 'move' | 'end') => {
    const next = Math.min(1, Math.max(0, ratio))
    if (phase === 'move') {
      scrubRef.current = next * MOVIE.lengthSec
      setScrub(next)
      return
    }
    scrubRef.current = null
    setScrub(null)
    seek(next * MOVIE.lengthSec)
  }
  const timeLabel = skin === 'bili' ? `${padClock(clock)} / ${padClock(MOVIE.lengthSec)}` : `${formatClock(clock)} / ${formatClock(MOVIE.lengthSec)}`
  const accent = skin === 'bili' ? BILI : YT
  const qualityLabel = qualityName(qualityId, skin)
  const showPause = snap.playing && !paused
  const stalling = !snap.playing && !paused

  const stageClick = () => {
    if (menu !== 'closed') {
      setMenu('closed')
      return
    }
    setPaused((value) => !value)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`relative min-h-48 w-full flex-1 overflow-hidden bg-black ${skin === 'bili' ? 'rounded-md' : 'rounded-xl'}`}
        data-playing={snap.playing ? 'yes' : 'no'}
        data-quality={rung.label}
        data-skin={skin}
        onClick={stageClick}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: rung.sharpness < 0.78 ? 'pixelated' : 'auto' }}
        />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={skin}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scaleX: 0.94, scaleY: 1.04 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scaleX: 1.02, scaleY: 0.96 }}
            transition={reduce ? { duration: 0.01 } : viewSpring}
            style={{ transformOrigin: '50% 100%' }}
          >
            {skin === 'bili' && danmaku ? <Danmaku /> : null}
            {stalling ? <Ring /> : null}
            {paused && snap.playing ? (
              <button
                type="button"
                aria-label="播放"
                className="absolute inset-0 grid place-items-center"
                onClick={(event) => {
                  event.stopPropagation()
                  setPaused(false)
                }}
              >
                <PlayMark skin={skin} large />
              </button>
            ) : null}
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pt-10 pb-2"
              onClick={(event) => event.stopPropagation()}
            >
              <Scrub played={played} buffered={buffered} accent={accent} dragging={scrub !== null} onScrub={onScrub} />
              <div className="mt-2 flex items-center gap-2 text-white">
                <IconButton label={showPause ? '暫停' : '播放'} bubble={skin === 'yt'} onClick={() => setPaused((value) => !value)}>
                  {showPause ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
                <span className="text-[13px] font-medium tabular-nums">{timeLabel}</span>
                <span className="flex-1" />
                {skin === 'bili' ? (
                  <IconButton label={danmaku ? '關閉彈幕' : '開啟彈幕'} pressed={danmaku} onClick={() => setDanmaku((value) => !value)}>
                    <DanmakuIcon on={danmaku} />
                  </IconButton>
                ) : null}
                {skin === 'bili' ? (
                  <button
                    type="button"
                    className="px-1 text-[13px] font-semibold"
                    style={{ color: menu === 'quality' ? accent : 'white' }}
                    aria-expanded={menu === 'quality'}
                    onClick={() => setMenu((value) => (value === 'quality' ? 'closed' : 'quality'))}
                  >
                    {qualityLabel}
                  </button>
                ) : (
                  <IconButton label="設定" bubble pressed={menu !== 'closed'} onClick={() => setMenu((value) => (value === 'closed' ? 'settings' : 'closed'))}>
                    <GearIcon />
                  </IconButton>
                )}
              </div>
            </div>
            <QualityMenu
              open={menu !== 'closed'}
              page={skin === 'yt' && menu === 'settings' ? 'settings' : 'quality'}
              skin={skin}
              qualityId={qualityId}
              rungLabel={rung.label}
              onOpenQuality={() => setMenu('quality')}
              onBack={() => setMenu('settings')}
              onPick={(id) => {
                onQuality(id)
                setMenu('closed')
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="shrink-0 px-1 pt-3">
        <p className="text-[16px] font-semibold">{MOVIE.title}</p>
        <p className="text-[13px] text-muted">{MOVIE.author}</p>
      </div>
    </div>
  )
}

function qualityName(id: string, skin: VideoSkin): string {
  if (id === 'auto') return '自動'
  const found = VIDEO_LADDER.find((item) => item.id === id)
  const label = found?.label ?? id
  return skin === 'bili' ? label.replace('p', 'P') : label
}

function rowsFor(skin: VideoSkin): { id: string; label: string }[] {
  const ladder = [...VIDEO_LADDER].reverse().map((item) => ({
    id: item.id,
    label: qualityName(item.id, skin),
  }))
  return [{ id: 'auto', label: '自動' }, ...ladder]
}

function Scrub({
  played,
  buffered,
  accent,
  dragging,
  onScrub,
}: {
  played: number
  buffered: number
  accent: string
  dragging: boolean
  onScrub: (ratio: number, phase: 'move' | 'end') => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const ratioAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return played
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }
  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="進度"
      aria-valuemin={0}
      aria-valuemax={MOVIE.lengthSec}
      aria-valuenow={Math.round(played * MOVIE.lengthSec)}
      className="relative flex h-6 touch-none cursor-pointer items-center select-none"
      onPointerDown={(event) => {
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        onScrub(ratioAt(event.clientX), 'move')
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        onScrub(ratioAt(event.clientX), 'move')
      }}
      onPointerUp={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        onScrub(ratioAt(event.clientX), 'end')
      }}
      onKeyDown={(event) => {
        const step = event.key === 'ArrowRight' ? 0.02 : event.key === 'ArrowLeft' ? -0.02 : 0
        if (!step) return
        event.preventDefault()
        onScrub(played + step, 'end')
      }}
    >
      <div className={`relative w-full rounded-full bg-white/30 ${dragging ? 'h-1' : 'h-0.5'}`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/45" style={{ width: `${buffered * 100}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${played * 100}%`, backgroundColor: accent }} />
        <div
          className={`absolute top-1/2 -translate-y-1/2 rounded-full ${dragging ? 'size-3' : 'size-2'}`}
          style={{ left: `clamp(0px, calc(${played * 100}% - ${dragging ? 6 : 4}px), calc(100% - ${dragging ? 12 : 8}px))`, backgroundColor: accent }}
        />
      </div>
    </div>
  )
}

function QualityMenu({
  open,
  page,
  skin,
  qualityId,
  rungLabel,
  onOpenQuality,
  onBack,
  onPick,
}: {
  open: boolean
  page: 'settings' | 'quality'
  skin: VideoSkin
  qualityId: string
  rungLabel: string
  onOpenQuality: () => void
  onBack: () => void
  onPick: (id: string) => void
}) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key={page}
          role="menu"
          aria-label={page === 'settings' ? '設定' : '畫質'}
          className="absolute right-3 bottom-16 z-20 max-h-[70%] w-52 overflow-y-auto rounded-xl bg-zinc-950/85 text-[14px] text-white shadow-lg backdrop-blur-md"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
          transition={reduce ? { duration: 0.01 } : switchSpring}
          style={{ transformOrigin: '100% 100%' }}
          onClick={(event) => event.stopPropagation()}
        >
          {page === 'settings' ? (
            <button type="button" role="menuitem" className="flex w-full items-center justify-between px-3 py-3 text-left" onClick={onOpenQuality}>
              <span>畫質</span>
              <span className="text-white/70">{qualityId === 'auto' ? `自動（${rungLabel}）` : qualityName(qualityId, skin)}</span>
            </button>
          ) : (
            <div>
              {skin === 'yt' ? (
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-white/80" onClick={onBack}>
                  <span aria-hidden="true">‹</span>
                  畫質
                </button>
              ) : null}
              {rowsFor(skin).map((row) => {
                const selected = row.id === qualityId
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                    style={{ color: selected && skin === 'bili' ? BILI : 'white' }}
                    onClick={() => onPick(row.id)}
                  >
                    {skin === 'yt' ? <span className="grid w-4 place-items-center">{selected ? <CheckIcon /> : null}</span> : null}
                    {row.label}
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function Danmaku() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[8%] h-[46%] overflow-hidden">
      {FLYING.map((line, index) => (
        <p
          key={line}
          className="danmaku-pass absolute left-0 text-[16px] font-semibold whitespace-nowrap text-white"
          style={{
            top: `${index * 32}%`,
            animationDelay: `${index * -4}s`,
            textShadow: '0 1px 2px rgba(0,0,0,0.85)',
          }}
        >
          {line}
        </p>
      ))}
    </div>
  )
}

function Ring() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="spin size-12 rounded-full border-[3px] border-white/25 border-t-white" />
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
  bubble,
  pressed,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  bubble?: boolean
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`grid size-9 place-items-center rounded-full ${bubble ? 'bg-white/20' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PlayMark({ skin, large }: { skin: VideoSkin; large?: boolean }) {
  if (skin === 'bili') {
    return (
      <span className="grid size-16 place-items-center rounded-full bg-black/45 text-white">
        <PlayIcon />
      </span>
    )
  }
  return (
    <span className={large ? 'text-white drop-shadow' : ''}>
      <svg viewBox="0 0 24 24" className="size-16 fill-white" aria-hidden="true">
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
    </span>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden="true">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden="true">
      <path d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a8 8 0 0 0-1.7-1L15 3h-4l-.5 2.9a8 8 0 0 0-1.7 1L6.5 6.4l-2 3.4L6.5 11a7.8 7.8 0 0 0 .1 2l-2 1.2 2 3.4 2.3-.6a8 8 0 0 0 1.7 1L11 21h4l.5-2.9a8 8 0 0 0 1.7-1l2.3.6 2-3.4zM13 15.2A3.2 3.2 0 1 1 13 8.8a3.2 3.2 0 0 1 0 6.4z" />
    </svg>
  )
}

function DanmakuIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 ${on ? 'fill-[#00aeec]' : 'fill-white'}`} aria-hidden="true">
      <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 4h8v1.6H6zm0 3.2h12V14H6z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-white" aria-hidden="true">
      <path d="M5 12.5 9.2 17 19 7" strokeWidth="2.4" />
    </svg>
  )
}

function padClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const remain = whole % 60
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
}
