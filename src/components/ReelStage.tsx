import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { viewSpring } from '../ui/spring.ts'
import { usePlayback } from '../hooks/usePlayback.ts'
import { describePlayback } from '../sim/copy.ts'
import { CLIP_SEC, REELS, type SceneKind } from '../sim/content.ts'
import { paintFrame } from '../sim/draw.ts'
import type { Rung } from '../sim/ladder.ts'

export type ReelSkin = 'tiktok' | 'shorts'

type Props = {
  mbps: number
  speedLabel: string
  rung: Rung
  skin: ReelSkin
  onStatus: (text: string) => void
}

const FACES = ['#e25b3a', '#3d6b8a', '#d9822b', '#2f6f62', '#2457d6', '#6a3d7a']

export function ReelStage({ mbps, speedLabel, rung, skin, onStatus }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const surplus = Math.max(0, mbps - rung.mbps)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const slides = [...root.querySelectorAll<HTMLElement>('[data-reel]')]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        setActive(Number((visible.target as HTMLElement).dataset.index))
      },
      { root, threshold: [0.6, 0.9] },
    )
    for (const slide of slides) observer.observe(slide)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-full overflow-hidden bg-black md:rounded-[20px]">
      <div
        ref={rootRef}
        className="reel-scroll h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {REELS.map((reel, index) => (
          <ReelSlide
            key={reel.id}
            index={index}
            kind={reel.kind}
            author={reel.author}
            caption={reel.caption}
            sound={reel.sound}
            likes={reel.likes}
            comments={reel.comments}
            saves={reel.saves}
            face={FACES[index % FACES.length]}
            rung={rung}
            lineMbps={mbps}
            fillMbps={index === active ? mbps : surplus}
            enabled={index === active || index === active + 1}
            capAtStartup={index !== active}
            active={index === active}
            skin={skin}
            speedLabel={speedLabel}
            onStatus={onStatus}
          />
        ))}
      </div>
    </div>
  )
}

function ReelSlide({
  index,
  kind,
  author,
  caption,
  sound,
  likes,
  comments,
  saves,
  face,
  rung,
  lineMbps,
  fillMbps,
  enabled,
  capAtStartup,
  active,
  skin,
  speedLabel,
  onStatus,
}: {
  index: number
  kind: SceneKind
  author: string
  caption: string
  sound: string
  likes: number
  comments: number
  saves: number
  face: string
  rung: Rung
  lineMbps: number
  fillMbps: number
  enabled: boolean
  capAtStartup: boolean
  active: boolean
  skin: ReelSkin
  speedLabel: string
  onStatus: (text: string) => void
}) {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const likedRef = useRef(false)
  const gesture = useRef({ x: 0, y: 0, scroll: 0, at: 0, acted: 'none' as 'none' | 'toggle' | 'skip' })
  const [pausePhase, setPausePhase] = useState<'off' | 'holding' | 'icon'>('off')
  const [trackedActive, setTrackedActive] = useState(active)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [likeCount, setLikeCount] = useState(likes)
  const [saved, setSaved] = useState(false)
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const { snap, stateRef } = usePlayback({
    fillMbps,
    lineMbps,
    rung,
    enabled,
    capAtStartup,
    hold: active && pausePhase !== 'off',
  })

  if (trackedActive !== active) {
    setTrackedActive(active)
    if (!active) setPausePhase('off')
  }

  const paused = pausePhase !== 'off'

  useEffect(() => {
    if (pausePhase !== 'holding') return
    const id = window.setTimeout(() => setPausePhase('icon'), 220)
    return () => window.clearTimeout(id)
  }, [pausePhase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return
    let raf = 0
    const loop = () => {
      const time = stateRef.current.mediaTime % CLIP_SEC
      paintFrame(canvas, kind, time, 1, true)
      if (barRef.current) barRef.current.style.width = `${(time / CLIP_SEC) * 100}%`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [enabled, kind, stateRef])

  const status =
    active && paused && snap.playing
      ? `${rung.label} 先暫停，緩衝還在進。`
      : describePlayback({
          speedLabel,
          bandwidthMbps: lineMbps,
          rungLabel: rung.label,
          bitrateMbps: rung.mbps,
          playing: snap.playing,
          bufferSec: snap.bufferSec,
          mediaTime: snap.mediaTime,
          brief: true,
        })

  useEffect(() => {
    if (!active) return
    onStatus(status)
  }, [active, onStatus, status])

  const spinning = active && snap.playing && !paused

  const markLiked = () => {
    if (likedRef.current) return
    likedRef.current = true
    setLiked(true)
    setLikeCount((count) => count + 1)
  }

  const burst = (clientX: number, clientY: number) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const id = performance.now()
    setBursts((items) => [...items, { id, x: clientX - rect.left, y: clientY - rect.top }])
    window.setTimeout(() => {
      setBursts((items) => items.filter((item) => item.id !== id))
    }, 720)
  }

  return (
    <section
      ref={sectionRef}
      data-reel=""
      data-index={index}
      data-playing={active ? (snap.playing && !paused ? 'yes' : 'no') : undefined}
      data-quality={active ? rung.label : undefined}
      data-paused={active ? (paused ? 'yes' : 'no') : undefined}
      data-skin={active ? skin : undefined}
      tabIndex={active ? 0 : -1}
      aria-label={`${author}，${caption}`}
      className="relative h-full shrink-0 snap-start snap-always touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
      onKeyDown={(event) => {
        if (!active || event.key !== ' ') return
        if ((event.target as HTMLElement).closest('button')) return
        event.preventDefault()
        const current = stateRef.current
        if (!current.playing && current.mediaTime <= 0.05) return
        setPausePhase((phase) => (phase === 'off' ? 'holding' : 'off'))
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) return
        const scroller = event.currentTarget.closest('.reel-scroll')
        gesture.current.x = event.clientX
        gesture.current.y = event.clientY
        gesture.current.scroll = scroller instanceof HTMLElement ? scroller.scrollTop : 0
      }}
      onPointerUp={(event) => {
        if ((event.target as HTMLElement).closest('button')) return
        const scroller = event.currentTarget.closest('.reel-scroll')
        const scrollTop = scroller instanceof HTMLElement ? scroller.scrollTop : 0
        const moved =
          Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y) > 12 ||
          Math.abs(scrollTop - gesture.current.scroll) > 6
        if (moved) return

        const now = performance.now()
        const repeat = now - gesture.current.at < 280 && gesture.current.acted !== 'none'
        if (repeat) {
          if (gesture.current.acted === 'toggle') {
            setPausePhase((phase) => (phase === 'off' ? 'holding' : 'off'))
          }
          markLiked()
          burst(event.clientX, event.clientY)
          gesture.current.acted = 'none'
          gesture.current.at = 0
          return
        }

        const current = stateRef.current
        if (current.playing || current.mediaTime > 0.05) {
          setPausePhase((phase) => (phase === 'off' ? 'holding' : 'off'))
          gesture.current.acted = 'toggle'
        } else {
          gesture.current.acted = 'skip'
        }
        gesture.current.at = now
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{
          filter:
            rung.sharpness < 0.95
              ? `blur(${((1 - rung.sharpness) * 2.8).toFixed(2)}px) contrast(${(0.86 + rung.sharpness * 0.14).toFixed(2)})`
              : undefined,
        }}
      />
      {active && !snap.playing ? <WaitSpinner /> : null}
      {active && pausePhase === 'icon' && snap.playing ? <PlayMark /> : null}
      {bursts.map((item) => (
        <div key={item.id} className="reel-heart pointer-events-none absolute z-30" style={{ left: item.x, top: item.y }}>
          {skin === 'shorts' ? (
            <ThumbUp className="size-[88px] fill-white" />
          ) : (
            <Heart className="size-[88px] fill-[#ff2d55]" />
          )}
        </div>
      ))}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={skin}
          className="pointer-events-none absolute inset-0"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scaleX: 0.94, scaleY: 1.04 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scaleX: 1.02, scaleY: 0.96 }}
          transition={reduce ? { duration: 0.01 } : viewSpring}
          style={{ transformOrigin: '50% 100%' }}
        >
          {skin === 'shorts' ? (
            <ShortsChrome
              author={author}
              caption={caption}
              face={face}
              liked={liked}
              disliked={disliked}
              subscribed={subscribed}
              likeCount={likeCount}
              comments={comments}
              shareCount={Math.max(12, Math.round(likes / 80))}
              active={active}
              barRef={barRef}
              onLike={() => {
                const next = !likedRef.current
                likedRef.current = next
                setLiked(next)
                setLikeCount((count) => count + (next ? 1 : -1))
                if (next) setDisliked(false)
              }}
              onDislike={() => {
                const next = !disliked
                setDisliked(next)
                if (next && likedRef.current) {
                  likedRef.current = false
                  setLiked(false)
                  setLikeCount((count) => count - 1)
                }
              }}
              onSubscribe={() => setSubscribed((value) => !value)}
            />
          ) : (
            <TikTokChrome
              author={author}
              caption={caption}
              sound={sound}
              face={face}
              liked={liked}
              saved={saved}
              likeCount={likeCount}
              comments={comments}
              saves={saves + (saved ? 1 : 0)}
              shareCount={Math.max(12, Math.round(likes / 80))}
              active={active}
              spinning={spinning}
              barRef={barRef}
              onLike={() => {
                const next = !likedRef.current
                likedRef.current = next
                setLiked(next)
                setLikeCount((count) => count + (next ? 1 : -1))
              }}
              onSave={() => setSaved((value) => !value)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function TikTokChrome({
  author,
  caption,
  sound,
  face,
  liked,
  saved,
  likeCount,
  comments,
  saves,
  shareCount,
  active,
  spinning,
  barRef,
  onLike,
  onSave,
}: {
  author: string
  caption: string
  sound: string
  face: string
  liked: boolean
  saved: boolean
  likeCount: number
  comments: number
  saves: number
  shareCount: number
  active: boolean
  spinning: boolean
  barRef: { current: HTMLDivElement | null }
  onLike: () => void
  onSave: () => void
}) {
  const tabIndex = active ? 0 : -1
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-3 pt-28 pr-16 pb-4">
        <p className="text-[16px] font-semibold text-white">{author}</p>
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-white">{caption}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-white/90">
          <span aria-hidden="true">♪</span>
          <span className="truncate">{sound}</span>
        </p>
      </div>
      <div className="pointer-events-auto absolute right-1.5 bottom-3 z-20 flex flex-col items-center gap-2.5 pb-1 text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.55))]">
        <div className="relative mb-1">
          <div
            className="grid size-11 place-items-center rounded-full border-2 border-white text-[16px] font-semibold"
            style={{ background: face }}
            aria-hidden="true"
          >
            {author.slice(0, 1)}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 grid size-[18px] -translate-x-1/2 place-items-center rounded-full bg-[#ff2d55] text-[14px] leading-none font-bold text-white">
            +
          </div>
        </div>
        <RailButton label={liked ? '取消喜歡' : '喜歡'} pressed={liked} count={likeCount} tabIndex={tabIndex} onClick={onLike}>
          <Heart className={`size-8 ${liked ? 'fill-[#ff2d55]' : 'fill-white'}`} />
        </RailButton>
        <RailButton label="留言" count={comments} tabIndex={tabIndex}>
          <CommentIcon />
        </RailButton>
        <RailButton label={saved ? '取消收藏' : '收藏'} pressed={saved} count={saves} tabIndex={tabIndex} onClick={onSave}>
          <BookmarkIcon filled={saved} />
        </RailButton>
        <RailButton label="分享" count={shareCount} tabIndex={tabIndex}>
          <ShareIcon />
        </RailButton>
        <div
          className="reel-disc relative mt-1 size-10 rounded-full border-2 border-white bg-[conic-gradient(#1b2430,#d5dde6,#1b2430,#f7f6f3,#1b2430)]"
          style={{ animationPlayState: spinning ? 'running' : 'paused' }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 m-auto size-2.5 rounded-full bg-white" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/30">
        <div ref={barRef} className="h-full w-0 bg-white" />
      </div>
    </>
  )
}

function ShortsChrome({
  author,
  caption,
  face,
  liked,
  disliked,
  subscribed,
  likeCount,
  comments,
  shareCount,
  active,
  barRef,
  onLike,
  onDislike,
  onSubscribe,
}: {
  author: string
  caption: string
  face: string
  liked: boolean
  disliked: boolean
  subscribed: boolean
  likeCount: number
  comments: number
  shareCount: number
  active: boolean
  barRef: { current: HTMLDivElement | null }
  onLike: () => void
  onDislike: () => void
  onSubscribe: () => void
}) {
  const tabIndex = active ? 0 : -1
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-3 pt-24 pr-16 pb-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <div
            className="grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: face }}
            aria-hidden="true"
          >
            {author.slice(0, 1)}
          </div>
          <p className="truncate text-[14px] font-semibold text-white">{author}</p>
          <button
            type="button"
            tabIndex={tabIndex}
            aria-pressed={subscribed}
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${
              subscribed ? 'bg-white/25 text-white' : 'bg-[#ff0000] text-white'
            }`}
            onClick={onSubscribe}
          >
            {subscribed ? '已訂閱' : '訂閱'}
          </button>
        </div>
        <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-white">{caption}</p>
      </div>
      <div className="pointer-events-auto absolute right-1 bottom-6 z-20 flex flex-col items-center gap-3 text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.55))]">
        <RailButton label={liked ? '取消讚' : '讚'} pressed={liked} count={likeCount} tabIndex={tabIndex} onClick={onLike}>
          <ThumbUp className="size-8" filled={liked} />
        </RailButton>
        <RailButton label={disliked ? '取消倒讚' : '倒讚'} pressed={disliked} tabIndex={tabIndex} onClick={onDislike}>
          <ThumbDown className="size-8 fill-white" filled={disliked} />
        </RailButton>
        <RailButton label="留言" count={comments} tabIndex={tabIndex}>
          <CommentIcon outline />
        </RailButton>
        <RailButton label="分享" count={shareCount} tabIndex={tabIndex}>
          <ShareOutIcon />
        </RailButton>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/35">
        <div ref={barRef} className="h-full w-0 bg-white" />
      </div>
    </>
  )
}

function RailButton({
  label,
  count,
  pressed,
  tabIndex = 0,
  onClick,
  children,
}: {
  label: string
  count?: number
  pressed?: boolean
  tabIndex?: number
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      tabIndex={tabIndex}
      className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 active:scale-90"
      onClick={onClick}
    >
      {children}
      {count === undefined ? <span className="h-3" /> : <span className="text-[12px] leading-none font-semibold tabular-nums">{compactCount(count)}</span>}
    </button>
  )
}

function WaitSpinner() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="spin size-12 rounded-full border-[3px] border-black/55 border-t-white border-l-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.45))]" />
    </div>
  )
}

function PlayMark() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="grid size-16 place-items-center rounded-full bg-black/35">
        <svg viewBox="0 0 24 24" className="ml-1 size-8 fill-white" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  )
}

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 20s-7-4.4-9.2-8.2C1 8.8 2.2 5.6 5.4 5.1 7.3 4.8 9 5.7 12 8.2c3-2.5 4.7-3.4 6.6-3.1 3.2.5 4.4 3.7 2.6 6.7C19 15.6 12 20 12 20z" />
    </svg>
  )
}

function CommentIcon({ outline }: { outline?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-8 ${outline ? 'fill-none stroke-white' : 'fill-white'}`} aria-hidden="true">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4.2 3.2c-.6.4-1.3 0-1.3-.7V7a2 2 0 0 1 2-2z" strokeWidth="1.6" />
    </svg>
  )
}

function ThumbUp({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${filled ? 'fill-white' : 'fill-none stroke-white'}`} aria-hidden="true">
      <path d="M8 11v9H4v-9h4zm2.2-.2 3.4-5.2c.5-.7 1.6-.3 1.6.6V9H20a1.5 1.5 0 0 1 1.5 1.7l-1 6.2A1.5 1.5 0 0 1 19 18.4H10V10.8c0-.4.1-.7.2-1z" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function ThumbDown({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${filled ? 'fill-white' : 'fill-none stroke-white'}`} aria-hidden="true">
      <path d="M16 13V4h4v9h-4zm-2.2.2-3.4 5.2c-.5.7-1.6.3-1.6-.6V15H4a1.5 1.5 0 0 1-1.5-1.7l1-6.2A1.5 1.5 0 0 1 5 5.6h9v7.6c0 .4-.1.7-.2 1z" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function ShareOutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-8 fill-none stroke-white" aria-hidden="true">
      <path d="M12 4v10M8 7.5 12 3.5l4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-8 ${filled ? 'fill-[#ffd15c]' : 'fill-white'}`} aria-hidden="true">
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3.2L6 21V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-8 fill-white" aria-hidden="true">
      <path d="M14 4.5 21 12l-7 7.5v-4.2C8.5 14.6 5.6 16.4 3 20c.4-4.6 2.6-8.2 11-9.3V4.5z" />
    </svg>
  )
}

function compactCount(value: number): string {
  if (value >= 10000) {
    const scaled = value / 10000
    const text = scaled >= 10 ? String(Math.round(scaled)) : scaled.toFixed(1).replace(/\.0$/, '')
    return `${text}萬`
  }
  return String(value)
}
