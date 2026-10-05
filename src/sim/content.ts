export type SceneKind = 'coast' | 'market' | 'cat' | 'rain' | 'talk' | 'store' | 'night'

export const CLIP_SEC = 15

export const MOVIE = {
  title: '風先到，人還在港口',
  author: '靠港',
  kind: 'coast' as const,
  lengthSec: 8 * 60 + 24,
}

export const REELS: readonly {
  id: string
  kind: SceneKind
  author: string
  caption: string
  sound: string
  likes: number
  comments: number
  saves: number
}[] = [
  {
    id: 'market',
    kind: 'market',
    author: '阿澤',
    caption: '老闆說再兩分鐘。那是二十分鐘前的事。',
    sound: '鐵板在喊我',
    likes: 2403,
    comments: 86,
    saves: 120,
  },
  {
    id: 'cat',
    kind: 'cat',
    author: '林可',
    caption: '會議開到一半，主管從鍵盤上走過去。',
    sound: '踩鍵盤進行曲',
    likes: 18620,
    comments: 340,
    saves: 2104,
  },
  {
    id: 'rain',
    kind: 'rain',
    author: '週末限定',
    caption: '氣象說晴。雨在橋上改口。',
    sound: '雨刷跟不上',
    likes: 980,
    comments: 41,
    saves: 77,
  },
  {
    id: 'night',
    kind: 'night',
    author: '小安',
    caption: '這盞綠燈跟我沒有共識。',
    sound: '半夜沒有人讓',
    likes: 5621,
    comments: 102,
    saves: 430,
  },
  {
    id: 'talk',
    kind: 'talk',
    author: '阿凱',
    caption: '再一個路口就到。這句我聽過三次。',
    sound: '對講機有回音',
    likes: 734,
    comments: 58,
    saves: 19,
  },
  {
    id: 'store',
    kind: 'store',
    author: '米苔目',
    caption: '便當在轉，我也在轉。誰先放棄誰請客。',
    sound: '微波的嗡嗡聲',
    likes: 1511,
    comments: 64,
    saves: 88,
  },
]

export type FeedSurface = 'threads' | 'ig' | 'fb'

const SURFACES: readonly FeedSurface[] = ['threads', 'ig', 'fb']

export function cycleFeedTheme(theme: FeedSurface): FeedSurface {
  const index = SURFACES.indexOf(theme)
  return SURFACES[(index + 1) % SURFACES.length]
}

export type FeedMedia =
  | { type: 'photo'; kind: SceneKind; bytes: number; audio?: { title: string } }
  | { type: 'video'; kind: SceneKind; bytes: number; length: string }
  | { type: 'poll'; ends?: string; options: readonly { label: string; votes: number }[] }

export const POSTS: readonly {
  id: string
  author: string
  handle: string
  time: string
  text: string
  likes: number
  comments: number
  reposts: number
  shares: number
  surfaces: readonly FeedSurface[]
  attachment: FeedMedia | null
}[] = [
  {
    id: 'poll',
    author: '週報',
    handle: 'still.ontheway',
    time: '剛剛',
    text: '有人說快到了。菜先等。',
    likes: 86,
    comments: 41,
    reposts: 12,
    shares: 4,
    surfaces: ['threads', 'fb'],
    attachment: {
      type: 'poll',
      ends: '18 小時後結束',
      options: [
        { label: '真的快到了', votes: 12 },
        { label: '還在上區', votes: 47 },
        { label: '訊息先到', votes: 29 },
      ],
    },
  },
  {
    id: 'video',
    author: '週末限定',
    handle: 'raining.now',
    time: '4小時',
    text: '預報晴天。橋上在下雨。',
    likes: 980,
    comments: 57,
    reposts: 23,
    shares: 40,
    surfaces: ['threads', 'ig', 'fb'],
    attachment: { type: 'video', kind: 'rain', bytes: 720_000, length: '0:12' },
  },
  {
    id: 'cat',
    author: '林可',
    handle: 'boss.cat',
    time: '2小時',
    text: '會議記錄是貓打的。',
    likes: 18620,
    comments: 340,
    reposts: 88,
    shares: 210,
    surfaces: ['ig', 'fb'],
    attachment: { type: 'photo', kind: 'cat', bytes: 260_000, audio: { title: '踩鍵盤進行曲' } },
  },
  {
    id: 'market',
    author: '阿澤',
    handle: 'smoke.steak',
    time: '昨天',
    text: '煙比牛排大，人是配菜。',
    likes: 5621,
    comments: 190,
    reposts: 44,
    shares: 73,
    surfaces: ['threads', 'ig', 'fb'],
    attachment: { type: 'photo', kind: 'market', bytes: 860_000 },
  },
]

export function mediaBytes(attachment: FeedMedia | null): number {
  if (!attachment || attachment.type === 'poll') return 0
  return attachment.bytes
}

export const TEXT_BYTES = 1_500

export function feedQueue(surface: FeedSurface) {
  const posts = POSTS.filter((post) => post.surfaces.includes(surface))
  const text = posts.map((post) => ({ id: `${post.id}:text`, bytes: TEXT_BYTES }))
  const images = posts.flatMap((post) => {
    const bytes = mediaBytes(post.attachment)
    return bytes > 0 ? [{ id: `${post.id}:media`, bytes }] : []
  })
  return [...text, ...images]
}
