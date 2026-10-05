import { describe, expect, it } from 'vitest'
import { isWhyPath, sitePath } from './site.ts'

describe('site path', () => {
  it('keeps local links at the site root', () => {
    expect(sitePath('/', '/')).toBe('/')
    expect(sitePath('/why', '/')).toBe('/why')
    expect(isWhyPath('/why', '/')).toBe(true)
    expect(isWhyPath('/', '/')).toBe(false)
  })

  it('prefixes GitHub Pages so /why stays inside the project site', () => {
    expect(sitePath('/', '/speedfeel/')).toBe('/speedfeel/')
    expect(sitePath('/why', '/speedfeel/')).toBe('/speedfeel/why')
    expect(isWhyPath('/speedfeel/why', '/speedfeel/')).toBe(true)
    expect(isWhyPath('/speedfeel/why/', '/speedfeel/')).toBe(true)
    expect(isWhyPath('/speedfeel', '/speedfeel/')).toBe(false)
  })
})