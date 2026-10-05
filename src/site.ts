declare const __APP_VERSION__: string

export const APP_VERSION: string = __APP_VERSION__

export function sitePath(path: string, base = import.meta.env.BASE_URL): string {
  const root = base.replace(/\/$/, '')
  if (path === '/') return root ? `${root}/` : '/'
  return `${root}${path}`
}

export function isWhyPath(pathname: string, base = import.meta.env.BASE_URL): boolean {
  const path = pathname.replace(/\/$/, '') || '/'
  return path === sitePath('/why', base)
}
