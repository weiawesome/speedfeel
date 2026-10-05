import { useEffect } from 'react'
import { Mark } from './components/Mark.tsx'
import { SiteFooter } from './components/SiteFooter.tsx'
import { sitePath } from './site.ts'

const BILL = [
  ['月租', 'x99'],
  ['網速', 'xx Mbps'],
  ['用完', '再降一截'],
] as const

export default function Why() {
  useEffect(() => {
    document.title = '為什麼做這個 — speedfeel'
    return () => {
      document.title = 'speedfeel'
    }
  }, [])

  return (
    <div className="page min-h-dvh bg-ground text-ink">
      <header className="mx-auto flex w-full max-w-[640px] items-center px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <a href={sitePath('/')} className="flex items-center gap-2 text-[15px] font-semibold">
          <Mark />
          speedfeel
        </a>
      </header>
      <main>
        <article className="mx-auto w-full max-w-[640px] px-5 pt-14 pb-4" aria-labelledby="why-title">
          <h1 id="why-title" className="text-[28px] leading-tight font-semibold">
            為什麼做這個
          </h1>
          <p className="mt-6 text-[17px] leading-8">
            台灣的通訊方案會寫 x99、一個網速，用到某個量再降速。數字我看得懂。這個速度能做什麼，我看不懂。我是工程師，還是看不懂。
          </p>
          <dl className="mt-8 overflow-hidden rounded-3xl bg-paper/80">
            {BILL.map(([name, value]) => (
              <div key={name} className="flex items-baseline justify-between gap-6 border-t border-ink/10 px-5 py-3.5 first:border-t-0">
                <dt className="text-[13px] text-muted">{name}</dt>
                <dd className="text-[15px] font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-[15px] leading-8">
            這張單上面是價錢和 Mbps。這個速度會不會讓人乾等、畫面卡不卡、傳檔和上網順不順，單上都沒寫。看不懂的時候，就只能問門市的人。
          </p>
          <p className="mt-8 text-[15px] leading-8">
            門市的人不是這方面的專業，自己往往也不清楚，有時還會亂講，比如把打不開 AI 服務歸到網速上。那種情況多半是服務自己的伺服器出了問題。就算當面跟他們講過，兩邊還是對不齊。
          </p>
          <h2 className="mt-16 text-[22px] leading-tight font-semibold">為什麼只有中文</h2>
          <p className="mt-5 text-[15px] leading-8">
            這是台灣方案的寫法。其他國家不走這條路，就沒做多語系。字要翻，還要再校一遍，多此一舉。
          </p>
        </article>
      </main>
      <SiteFooter story />
    </div>
  )
}
