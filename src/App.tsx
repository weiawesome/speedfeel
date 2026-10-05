import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Band } from './components/Band.tsx'
import { Mark } from './components/Mark.tsx'
import { SiteFooter } from './components/SiteFooter.tsx'
import { FeedStage, type FeedTheme } from './components/FeedStage.tsx'
import { VideoStage, type VideoSkin } from './components/VideoStage.tsx'
import { cycleFeedTheme } from './sim/content.ts'
import { ReelStage, type ReelSkin } from './components/ReelStage.tsx'
import { useSpeedTest } from './hooks/useSpeedTest.ts'
import { measureNote } from './sim/measure.ts'
import {
  REEL_LADDER,
  SPEEDS,
  VIDEO_LADDER,
  resolveRung,
  speedLabel,
  zoneFor,
} from './sim/ladder.ts'
import { switchSpring, viewSpring } from './ui/spring.ts'

type SceneId = 'video' | 'reel' | 'feed'

const SCENES: { id: SceneId; label: string }[] = [
  { id: 'video', label: '影片' },
  { id: 'reel', label: '短影音' },
  { id: 'feed', label: '動態' },
]

const GROUND = {
  '3g': '#f6e7df',
  '4g': '#e3e8f1',
  '5g': '#dfe6f8',
} as const

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2'

function qualityChoices(scene: SceneId): { id: string; label: string }[] {
  const ladder = scene === 'reel' ? REEL_LADDER : VIDEO_LADDER
  return [{ id: 'auto', label: '自動' }, ...ladder.map((rung) => ({ id: rung.id, label: rung.label }))]
}

export default function App() {
  const [mbps, setMbps] = useState<number | null>(null)
  const [qualityId, setQualityId] = useState('auto')
  const [scene, setScene] = useState<SceneId>('video')
  const [feedTheme, setFeedTheme] = useState<FeedTheme>('threads')
  const [videoSkin, setVideoSkin] = useState<VideoSkin>('yt')
  const [reelSkin, setReelSkin] = useState<ReelSkin>('tiktok')
  const [layoutTurn, setLayoutTurn] = useState(0)
  const reduceMotion = useReducedMotion()
  const [run, setRun] = useState(0)
  const [feedRun, setFeedRun] = useState(0)
  const [showMeasure, setShowMeasure] = useState(false)
  const [measured, setMeasured] = useState<{ mbps: number; latencyMs: number } | null>(null)
  const [status, setStatus] = useState('選一個位置，畫面會照那條管子走。')
  const sceneRef = useRef(scene)
  useLayoutEffect(() => {
    sceneRef.current = scene
  }, [scene])
  const onVideoStatus = useCallback((text: string) => {
    if (sceneRef.current === 'video') setStatus(text)
  }, [])
  const onReelStatus = useCallback((text: string) => {
    if (sceneRef.current === 'reel') setStatus(text)
  }, [])
  const onFeedStatus = useCallback((text: string) => {
    if (sceneRef.current === 'feed') setStatus(text)
  }, [])

  const test = useSpeedTest((result) => {
    setMbps(result.mbps)
    setMeasured(result)
    setShowMeasure(true)
    setFeedRun((value) => value + 1)
  }, true)

  const shownMbps = test.phase === 'running' ? (test.liveMbps > 0 ? test.liveMbps : null) : mbps
  const zone = shownMbps == null ? null : zoneFor(shownMbps)
  const info =
    test.phase === 'error'
      ? '這次沒量到下載速度。'
      : test.phase === 'running'
        ? '正在量下載速度。'
        : showMeasure && measured
          ? measureNote(measured.mbps, measured.latencyMs)
          : status

  const previewSpeed = (next: number) => {
    if (test.phase === 'running') test.stop()
    else test.acknowledge()
    setShowMeasure(false)
    setMbps(next)
  }

  const commitSpeed = (next: number) => {
    previewSpeed(next)
    setFeedRun((value) => value + 1)
  }

  const videoRung = resolveRung(VIDEO_LADDER, qualityId, shownMbps ?? 0)
  const reelRung = resolveRung(REEL_LADDER, qualityId, shownMbps ?? 0)
  const choices = qualityChoices(scene)
  const activeQuality = choices.some((choice) => choice.id === qualityId) ? qualityId : 'auto'
  const styleSwitch = (
    <motion.button
      type="button"
      aria-label={scene === 'feed' ? '下一種版面' : '下一種播放器'}
      className={`grid size-9 shrink-0 place-items-center rounded-full bg-paper/70 ${focusRing}`}
      whileTap={reduceMotion ? undefined : { scale: 0.72 }}
      transition={{ type: 'spring', stiffness: 420, damping: 12, mass: 0.6 }}
      onClick={() => {
        setLayoutTurn((turn) => turn + 1)
        if (scene === 'video') setVideoSkin((current) => (current === 'yt' ? 'bili' : 'yt'))
        else if (scene === 'reel') setReelSkin((current) => (current === 'tiktok' ? 'shorts' : 'tiktok'))
        else setFeedTheme((current) => cycleFeedTheme(current))
      }}
    >
      <motion.span
        className="grid place-items-center"
        animate={{ rotate: layoutTurn * 180 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 12, mass: 0.7 }}
      >
        <CycleIcon />
      </motion.span>
    </motion.button>
  )

  return (
    <motion.div
      className="page flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] text-ink md:pb-8"
      initial={false}
      animate={{ backgroundColor: zone ? GROUND[zone.id] : GROUND['4g'] }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 26, mass: 0.9 }}
      style={{ backgroundColor: zone ? GROUND[zone.id] : GROUND['4g'] }}
      data-zone={zone?.id ?? 'pending'}
    >
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-5 pt-[max(12px,env(safe-area-inset-top))]">
        <h1 className="flex items-center gap-2 text-[15px] font-semibold">
          <Mark />
          speedfeel
        </h1>
        <div className="hidden items-center gap-5 md:flex" role="tablist" aria-label="體驗">
          {SCENES.map((item) => (
            <SceneButton key={item.id} item={item} scene={scene} onSelect={setScene} mark="scene-desktop" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${focusRing} ${
              test.phase === 'running' ? 'bg-ink text-paper' : 'bg-paper/70 text-ink'
            }`}
            aria-busy={test.phase === 'running'}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={switchSpring}
            onClick={test.start}
          >
            {test.phase === 'running' ? '測量中' : '測速'}
          </motion.button>
          <motion.button
            type="button"
            className={`h-9 rounded-full bg-paper/70 px-3.5 text-[13px] font-semibold text-ink ${focusRing}`}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={switchSpring}
            onClick={() => {
              setRun((value) => value + 1)
              setFeedRun((value) => value + 1)
            }}
          >
            重來
          </motion.button>
        </div>
      </header>

      <main>
        <div className="mx-auto w-full max-w-[1100px] px-5 pt-1">
          <Band
            mbps={shownMbps ?? 0.4}
            pending={shownMbps == null}
            onChange={previewSpeed}
            onCommit={commitSpeed}
          />
          <div className="mt-4 grid grid-cols-6 gap-2">
            {SPEEDS.map((item) => {
              const selected =
                shownMbps != null && test.phase !== 'running' && Math.abs(item.mbps - shownMbps) < 0.05
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  className={`relative flex h-8 w-full items-center justify-center rounded-full bg-paper/70 text-[12px] font-semibold tabular-nums ${focusRing} ${
                    selected ? 'text-paper' : 'text-ink'
                  }`}
                  onClick={() => commitSpeed(item.mbps)}
                >
                  {selected ? <SwitchPill layoutId="speed-pill" /> : null}
                  <span className="relative">{item.short}</span>
                </button>
              )
            })}
          </div>
          <StageDock
            info={info}
            choices={scene === 'reel' ? choices : []}
            activeId={activeQuality}
            onQuality={setQualityId}
            cycle={styleSwitch}
          />
        </div>

        <div
          id={`panel-${scene}`}
          role="tabpanel"
          aria-labelledby={`tab-${scene}-desk tab-${scene}-phone`}
          className={`relative mx-auto mt-6 h-[72dvh] w-full max-w-[1100px] shrink-0 ${
            scene === 'video' ? 'px-5' : 'px-0'
          }`}
        >
        <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={scene}
          className={
            scene === 'video'
              ? 'h-full'
              : scene === 'reel'
                ? 'mx-auto h-full min-h-0 w-full max-w-[440px]'
                : 'mx-auto h-full min-h-0 w-full max-w-[480px]'
          }
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 42, scaleX: 0.88, scaleY: 1.1 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scaleX: 1.04, scaleY: 0.94 }}
          transition={reduceMotion ? { duration: 0.01 } : viewSpring}
          style={{ transformOrigin: '50% 0%' }}
        >
          {scene === 'video' ? (
            <VideoStage
              key={run}
              mbps={shownMbps ?? 0}
              speedLabel={speedLabel(shownMbps ?? 0)}
              rung={videoRung}
              skin={videoSkin}
              qualityId={qualityId}
              onQuality={setQualityId}
              onStatus={onVideoStatus}
            />
          ) : null}
          {scene === 'reel' ? (
            <ReelStage
              key={run}
              mbps={shownMbps ?? 0}
              speedLabel={speedLabel(shownMbps ?? 0)}
              rung={reelRung}
              skin={reelSkin}
              onStatus={onReelStatus}
            />
          ) : null}
          {scene === 'feed' ? (
            <FeedStage
              key={`${run}-${feedRun}`}
              mbps={shownMbps ?? 0}
              speedLabel={speedLabel(shownMbps ?? 0)}
              theme={feedTheme}
              onStatus={onFeedStatus}
            />
          ) : null}
        </motion.div>
        </AnimatePresence>
        </div>
      </main>

      <SiteFooter />

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/15 md:hidden"
        aria-label="體驗"
        style={{
          backgroundColor: zone ? GROUND[zone.id] : GROUND['4g'],
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex" role="tablist" aria-label="體驗">
          {SCENES.map((item) => (
            <SceneButton key={item.id} item={item} scene={scene} onSelect={setScene} mark="scene-mobile" wide />
          ))}
        </div>
      </nav>
    </motion.div>
  )
}

function StageDock({
  info,
  choices,
  activeId,
  onQuality,
  cycle,
}: {
  info: string
  choices: { id: string; label: string }[]
  activeId: string
  onQuality: (id: string) => void
  cycle: ReactNode
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug text-pretty" aria-live="polite">
        {info}
      </p>
      {choices.length > 0 ? (
        <QualitySwitch choices={choices} activeId={activeId} onQuality={onQuality} />
      ) : null}
      <div className="shrink-0">{cycle}</div>
    </div>
  )
}

function QualitySwitch({
  choices,
  activeId,
  onQuality,
}: {
  choices: { id: string; label: string }[]
  activeId: string
  onQuality: (id: string) => void
}) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const current = choices.find((choice) => choice.id === activeId) ?? choices[0]
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={`grid h-9 w-16 place-items-center rounded-full bg-paper/70 text-[12px] font-semibold ${focusRing}`}
        aria-label="畫質"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {current.label}
      </button>
      {open ? (
        <button type="button" aria-label="關閉畫質" className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
      ) : null}
      <AnimatePresence>
        {open ? (
            <motion.div
              role="radiogroup"
              aria-label="畫質"
              className="absolute top-full right-0 z-30 mt-2 flex rounded-full bg-paper p-0.5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
              transition={reduce ? { duration: 0 } : switchSpring}
              style={{ transformOrigin: '100% 0%' }}
            >
              {choices.map((choice) => {
                const selected = choice.id === activeId
                return (
                  <button
                    key={choice.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`relative h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold whitespace-nowrap ${focusRing} ${
                      selected ? 'text-paper' : 'text-ink'
                    }`}
                    onClick={() => {
                      onQuality(choice.id)
                      setOpen(false)
                    }}
                  >
                    {selected ? <SwitchPill layoutId="quality-pill" /> : null}
                    <span className="relative">{choice.label}</span>
                  </button>
                )
              })}
            </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function SwitchPill({ layoutId }: { layoutId: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute inset-0 rounded-full bg-ink"
      transition={reduce ? { duration: 0 } : switchSpring}
    />
  )
}

function CycleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M20 12a8 8 0 0 1-13.7 5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 12a8 8 0 0 1 13.7-5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 5.5h2.5V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 18.5H5.5V16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SceneButton({
  item,
  scene,
  onSelect,
  mark,
  wide,
}: {
  item: { id: SceneId; label: string }
  scene: SceneId
  onSelect: (id: SceneId) => void
  mark: string
  wide?: boolean
}) {
  const reduce = useReducedMotion()
  const selected = item.id === scene
  return (
    <button
      id={`tab-${item.id}-${wide ? 'phone' : 'desk'}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`panel-${item.id}`}
      className={`${wide ? 'flex-1 py-3' : 'pb-1'} text-[15px] font-semibold ${focusRing} ${
        selected ? 'text-ink' : 'text-muted'
      }`}
      onClick={() => onSelect(item.id)}
    >
      <span className="relative">
        {item.label}
        {selected ? (
          <motion.span
            layoutId={mark}
            className="absolute inset-x-0 -bottom-1 h-0.5 bg-ink"
            transition={reduce ? { duration: 0 } : switchSpring}
          />
        ) : null}
      </span>
    </button>
  )
}
