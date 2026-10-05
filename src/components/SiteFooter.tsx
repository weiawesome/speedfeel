import { APP_VERSION, sitePath } from '../site.ts'

export function SiteFooter({ story }: { story?: boolean }) {
  return (
    <footer className="mt-10 border-t border-ink/10 px-5 py-8 text-[12px] leading-relaxed text-muted">
      <p className="font-semibold text-ink">speedfeel</p>
      <p className="mt-1 max-w-xl">用這個網站自己的畫面，模擬不同網速下的長片、短影音和動態。</p>
      <p className="mt-2 max-w-xl">測到的是開這個網站時的下載速度。別的網站不一定一樣，對方的伺服器也會影響。</p>
      <p className="mt-2">
        {story ? (
          <a className="font-semibold text-ink underline underline-offset-2" href={sitePath('/')}>
            回模擬
          </a>
        ) : (
          <a className="font-semibold text-ink underline underline-offset-2" href={sitePath('/why')}>
            為什麼做這個
          </a>
        )}
      </p>
      <p className="mt-2">© 2026 Tcweeei. 以 MIT 授權。 v{APP_VERSION}</p>
    </footer>
  )
}
