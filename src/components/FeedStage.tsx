import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBytePipe } from '../hooks/useBytePipe.ts'
import { describeFeed } from '../sim/copy.ts'
import { POSTS, TEXT_BYTES, feedQueue, type FeedSurface, type SceneKind } from '../sim/content.ts'
import { paintFrame } from '../sim/draw.ts'
import { viewSpring } from '../ui/spring.ts'

export type FeedTheme = FeedSurface

const FACE: Record<string, string> = {
  poll: '#1b2430',
  video: '#2457d6',
  cat: '#d9822b',
  market: '#c4472c',
}

type Props = {
  mbps: number
  speedLabel: string
  theme: FeedTheme
  onStatus: (text: string) => void
}

export function FeedStage({ mbps, speedLabel, theme, onStatus }: Props) {
  const reduce = useReducedMotion()
  const queue = useMemo(() => feedQueue(theme), [theme])
  const progress = useBytePipe(mbps, queue)
  const status = describeFeed(mbps, speedLabel)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const posts = POSTS.filter((post) => post.surfaces.includes(theme))

  useEffect(() => {
    onStatus(status)
  }, [onStatus, status])

  const shell =
    theme === 'fb' ? 'bg-[#f0f2f5] text-[#050505]' : 'bg-white text-black'

  return (
    <div className="relative h-full min-h-0">
    <AnimatePresence initial={false} mode="popLayout">
    <motion.div
      key={theme}
      className={`feed-scroll h-full overflow-y-auto overscroll-y-contain ${shell}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 42, scaleX: 0.88, scaleY: 1.1 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -18, scaleX: 1.04, scaleY: 0.94 }}
      transition={reduce ? { duration: 0.01 } : viewSpring}
      style={{ transformOrigin: '50% 0%' }}
    >
      <div className={theme === 'fb' ? 'space-y-2 px-2 py-2' : 'pb-2'}>
        {posts.map((post) => {
          const textReady = (progress[`${post.id}:text`] ?? 0) >= TEXT_BYTES - 1
          const bytes = post.attachment && post.attachment.type !== 'poll' ? post.attachment.bytes : 0
          const got = progress[`${post.id}:media`] ?? 0
          const mediaReady = bytes === 0 || got >= bytes - 1
          const likeCount = post.likes + (liked[post.id] ? 1 : 0)
          const toggleLike = () => setLiked((current) => ({ ...current, [post.id]: !current[post.id] }))
          return (
            <Post
              key={post.id}
              theme={theme}
              post={post}
              textReady={textReady}
              mediaReady={mediaReady}
              got={got}
              liked={!!liked[post.id]}
              likeCount={likeCount}
              onLike={toggleLike}
            />
          )
        })}
      </div>
    </motion.div>
    </AnimatePresence>
    </div>
  )
}

function Post({
  theme,
  post,
  textReady,
  mediaReady,
  got,
  liked,
  likeCount,
  onLike,
}: {
  theme: FeedTheme
  post: (typeof POSTS)[number]
  textReady: boolean
  mediaReady: boolean
  got: number
  liked: boolean
  likeCount: number
  onLike: () => void
}) {
  if (theme === 'ig') return (
    <IgPost post={post} textReady={textReady} mediaReady={mediaReady} got={got} liked={liked} likeCount={likeCount} onLike={onLike} />
  )
  if (theme === 'fb') return (
    <FbPost post={post} textReady={textReady} mediaReady={mediaReady} got={got} liked={liked} likeCount={likeCount} onLike={onLike} />
  )
  return (
    <ThreadsPost post={post} textReady={textReady} mediaReady={mediaReady} got={got} liked={liked} likeCount={likeCount} onLike={onLike} />
  )
}

function ThreadsPost({
  post,
  textReady,
  mediaReady,
  got,
  liked,
  likeCount,
  onLike,
}: Omit<Parameters<typeof Post>[0], 'theme'>) {
  return (
    <article className="border-b border-black/10 px-4 py-3">
      <div className="flex gap-3">
        <Avatar id={post.id} name={post.author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[15px] font-semibold">{post.author}</p>
            <p className="truncate text-[15px] text-[#707070]">{post.time}</p>
          </div>
          <p className="mt-1 min-h-[3rem] text-[15px] leading-snug">{textReady ? post.text : ''}</p>
          <Attachment post={post} theme="threads" textReady={textReady} ready={mediaReady} got={got} frame="rounded" />
          <div className="mt-2 flex items-center gap-4 text-[13px] text-[#666]">
            <IconButton label={liked ? '取消喜歡' : '喜歡'} pressed={liked} onClick={onLike}>
              <Heart filled={liked} className={liked ? 'fill-[#ff3040]' : 'fill-none stroke-[#666]'} />
              <span>{likeCount}</span>
            </IconButton>
            <IconButton label="回覆">
              <Bubble />
              <span>{post.comments}</span>
            </IconButton>
            <IconButton label="轉發">
              <Repost />
              <span>{post.reposts}</span>
            </IconButton>
            <IconButton label="分享">
              <Plane />
              <span>{post.shares}</span>
            </IconButton>
          </div>
        </div>
      </div>
    </article>
  )
}

function IgPost({
  post,
  textReady,
  mediaReady,
  got,
  liked,
  likeCount,
  onLike,
}: Omit<Parameters<typeof Post>[0], 'theme'>) {
  return (
    <article className="border-b border-black/10 pb-3">
      <div className="flex items-center gap-2 px-3 py-2">
        <Avatar id={post.id} name={post.author} />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">{post.handle}</p>
          <MusicLine post={post} />
        </div>
      </div>
      <Attachment post={post} theme="ig" textReady={textReady} ready={mediaReady} got={got} frame="bleed" onDouble={onLike} />
      <div className="mt-2 flex items-center gap-4 px-3">
        <IconButton label={liked ? '取消喜歡' : '喜歡'} pressed={liked} onClick={onLike}>
          <Heart filled={liked} className={`size-7 ${liked ? 'fill-[#ff3040]' : 'fill-none stroke-black'}`} />
        </IconButton>
        <IconButton label="留言">
          <Bubble className="size-7 stroke-black" />
        </IconButton>
        <IconButton label="分享">
          <Plane className="size-7 stroke-black" />
        </IconButton>
        <span className="flex-1" />
        <IconButton label="收藏">
          <Mark />
        </IconButton>
      </div>
      <p className="mt-1 px-3 text-[14px] font-semibold">{likeCount.toLocaleString('zh-Hant')} 個讚</p>
      <p className="mt-1 min-h-[2.6rem] px-3 text-[14px] leading-snug">
        {textReady ? (
          <>
            <span className="font-semibold">{post.handle} </span>
            {post.text}
          </>
        ) : null}
      </p>
      <p className="mt-1 px-3 text-[11px] tracking-wide text-[#737373]">{post.time}</p>
    </article>
  )
}

function FbPost({
  post,
  textReady,
  mediaReady,
  got,
  liked,
  likeCount,
  onLike,
}: Omit<Parameters<typeof Post>[0], 'theme'>) {
  return (
    <article className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Avatar id={post.id} name={post.author} />
        <div>
          <p className="text-[15px] font-semibold">{post.author}</p>
          <p className="text-[13px] text-[#65676b]">{post.time} · 公開</p>
          <MusicLine post={post} />
        </div>
      </div>
      <p className="min-h-[3rem] px-3 py-2 text-[15px] leading-snug">{textReady ? post.text : ''}</p>
      <Attachment post={post} theme="fb" textReady={textReady} ready={mediaReady} got={got} frame="plain" onDouble={onLike} />
      <div className="flex items-center justify-between px-3 py-2 text-[13px] text-[#65676b]">
        <span>{likeCount.toLocaleString('zh-Hant')}</span>
        <span>
          {post.comments} 則留言 · {post.shares} 次分享
        </span>
      </div>
      <div className="grid grid-cols-3 border-t border-black/10">
        <TextButton label={liked ? '取消讚' : '讚'} pressed={liked} onClick={onLike} active={liked}>
          讚
        </TextButton>
        <TextButton label="留言">留言</TextButton>
        <TextButton label="分享">分享</TextButton>
      </div>
    </article>
  )
}

function songTitle(post: (typeof POSTS)[number]): string | null {
  const media = post.attachment
  if (media?.type === 'photo' && media.audio) return media.audio.title
  return null
}

function MusicLine({ post }: { post: (typeof POSTS)[number] }) {
  const title = songTitle(post)
  if (!title) return null
  return (
    <p className="flex items-center gap-1 text-[12px] text-[#737373]">
      <span aria-hidden="true">♪</span>
      {title}
    </p>
  )
}

function Attachment({
  post,
  theme,
  textReady,
  ready,
  got,
  frame,
  onDouble,
}: {
  post: (typeof POSTS)[number]
  theme: FeedTheme
  textReady: boolean
  ready: boolean
  got: number
  frame: 'rounded' | 'bleed' | 'plain'
  onDouble?: () => void
}) {
  const media = post.attachment
  if (!media) return null
  if (media.type === 'poll') {
    if (!textReady) return <div className="mt-2 h-16" />
    if (theme === 'fb') return <FbPoll options={media.options} />
    return <ThreadsPoll options={media.options} ends={media.ends} />
  }
  const box =
    frame === 'bleed'
      ? 'relative aspect-[4/5] bg-[#efefef]'
      : frame === 'rounded'
        ? 'relative mt-2 aspect-[4/5] overflow-hidden rounded-2xl bg-[#f3f3f3]'
        : 'relative aspect-[4/5] bg-[#e4e6eb]'
  return (
    <div className={box} onDoubleClick={onDouble}>
      {ready ? <Still kind={media.kind} label={post.text} /> : <Loading got={got} total={media.bytes} />}
      {ready && media.type === 'video' && theme === 'fb' ? <PlayMark length={media.length} /> : null}
      {ready && media.type === 'video' && theme !== 'fb' ? <MuteMark /> : null}
    </div>
  )
}

function ThreadsPoll({
  options,
  ends,
}: {
  options: readonly { label: string; votes: number }[]
  ends?: string
}) {
  const total = options.reduce((sum, item) => sum + item.votes, 0)
  return (
    <div className="mt-2">
      <div className="space-y-2">
        {options.map((item) => {
          const pct = total === 0 ? 0 : Math.round((item.votes / total) * 100)
          return (
            <div key={item.label} className="relative overflow-hidden rounded-xl border border-black/15 px-3 py-2 text-[14px]">
              <div className="absolute inset-y-0 left-0 bg-black/10" style={{ width: `${pct}%` }} />
              <div className="relative flex justify-between gap-3">
                <span>{item.label}</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
      {ends ? <p className="mt-2 text-[12px] text-[#707070]">{ends}</p> : null}
    </div>
  )
}

function FbPoll({ options }: { options: readonly { label: string; votes: number }[] }) {
  return (
    <fieldset className="mx-3 mb-2 space-y-2">
      {options.map((item) => (
        <label key={item.label} className="flex items-center gap-2 text-[15px]">
          <input type="radio" name="fb-poll" className="size-4 accent-[#0866ff]" />
          {item.label}
        </label>
      ))}
    </fieldset>
  )
}

function Loading({ got, total }: { got: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (got / total) * 100))
  return (
    <>
      <p className="absolute inset-0 grid place-items-center text-[13px] text-[#65676b] tabular-nums">
        {Math.round(got / 1000)} / {Math.round(total / 1000)} KB
      </p>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
        <div className="h-full bg-black/70" style={{ width: `${pct}%` }} />
      </div>
    </>
  )
}

function MuteMark() {
  return (
    <div className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-black/55 text-white" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-4 fill-white">
        <path d="M4 9h3l4-3v12l-4-3H4V9z" />
        <path d="M16 9.5 20 14.5M20 9.5 16 14.5" stroke="white" strokeWidth="1.8" fill="none" />
      </svg>
    </div>
  )
}

function PlayMark({ length }: { length: string }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="grid size-14 place-items-center rounded-full bg-black/45">
          <span className="ml-1 block size-0 border-y-[8px] border-l-[14px] border-y-transparent border-l-white" />
        </div>
      </div>
      <p className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[12px] text-white">{length}</p>
    </>
  )
}

function Avatar({ id, name }: { id: string; name: string }) {
  return (
    <div
      className="grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-semibold text-white"
      style={{ background: FACE[id] ?? '#333' }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </div>
  )
}

function IconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className="inline-flex min-h-10 items-center gap-1 active:scale-95"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function TextButton({
  label,
  pressed,
  active,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  active?: boolean
  onClick?: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`h-11 text-[15px] font-semibold active:bg-black/5 ${active ? 'text-[#075cd6]' : 'text-[#65676b]'}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Heart({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 stroke-[1.8] ${className ?? ''}`} aria-hidden="true">
      {filled ? (
        <path d="M12 20s-7-4.4-9.2-8.2C1 8.8 2.2 5.6 5.4 5.1 7.3 4.8 9 5.7 12 8.2c3-2.5 4.7-3.4 6.6-3.1 3.2.5 4.4 3.7 2.6 6.7C19 15.6 12 20 12 20z" />
      ) : (
        <path
          fill="none"
          d="M12 19s-6.2-3.8-8-7.2C2.6 9.2 3.6 6.6 6.2 6.2 8 5.9 9.4 6.8 12 9c2.6-2.2 4-3.1 5.8-2.8 2.6.4 3.6 3 2.2 5.6C18.2 15.2 12 19 12 19z"
        />
      )}
    </svg>
  )
}

function Bubble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 fill-none stroke-[#666] stroke-[1.8] ${className ?? ''}`} aria-hidden="true">
      <path d="M6 6.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H10l-3.5 2.6V16.5H6A1.5 1.5 0 0 1 4.5 15V8A1.5 1.5 0 0 1 6 6.5z" />
    </svg>
  )
}

function Repost() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-[#666] stroke-[1.8]" aria-hidden="true">
      <path d="M7 7h9l-2.2-2.2M17 17H8l2.2 2.2" />
      <path d="M16 4.8V10M8 19.2V14" />
    </svg>
  )
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-black stroke-[1.8]" aria-hidden="true">
      <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

function Plane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 fill-none stroke-[#666] stroke-[1.8] ${className ?? ''}`} aria-hidden="true">
      <path d="M4 11.5 20 5l-6.2 14-2.3-5.2L4 11.5z" />
    </svg>
  )
}

function Still({ kind, label }: { kind: SceneKind; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const paint = () => paintFrame(canvas, kind, 1.2, 1)
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [kind])
  return <canvas ref={ref} role="img" aria-label={label} className="absolute inset-0 h-full w-full" />
}
