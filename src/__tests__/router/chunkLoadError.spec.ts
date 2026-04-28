import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_KEY,
  handleChunkLoadError,
  isChunkLoadError,
} from '@/router'

const fakeRoute = (fullPath = '/mission/abc'): RouteLocationNormalized =>
  ({ fullPath }) as RouteLocationNormalized

describe('isChunkLoadError', () => {
  it('matches Vite/Chromium dynamic import failure', () => {
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: foo.js')),
    ).toBe(true)
  })

  it('matches Firefox dynamic import failure', () => {
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('rejects unrelated errors', () => {
    expect(isChunkLoadError(new Error('something else'))).toBe(false)
    expect(isChunkLoadError('not an error')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })
})

describe('handleChunkLoadError', () => {
  let replaceSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/v303-mdc-generator/',
        search: '',
        replace: replaceSpy,
      },
    })
  })

  it('reloads to the target route on chunk load failure', () => {
    const handled = handleChunkLoadError(
      new TypeError('Failed to fetch dynamically imported module: x.js'),
      fakeRoute('/mission/42'),
    )

    expect(handled).toBe(true)
    expect(replaceSpy).toHaveBeenCalledWith('/v303-mdc-generator/#/mission/42')
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull()
  })

  it('ignores non-chunk errors', () => {
    const handled = handleChunkLoadError(new Error('boom'), fakeRoute())
    expect(handled).toBe(false)
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('does not reload twice within the cooldown window', () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))

    const handled = handleChunkLoadError(
      new TypeError('Failed to fetch dynamically imported module: x.js'),
      fakeRoute(),
    )

    expect(handled).toBe(false)
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('reloads again after the cooldown elapses', () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now() - CHUNK_RELOAD_COOLDOWN_MS - 1))

    const handled = handleChunkLoadError(
      new TypeError('Failed to fetch dynamically imported module: x.js'),
      fakeRoute(),
    )

    expect(handled).toBe(true)
    expect(replaceSpy).toHaveBeenCalled()
  })
})
