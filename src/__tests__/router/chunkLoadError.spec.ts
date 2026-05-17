import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_KEY,
  handleChunkLoadError,
  handlePreloadError,
  isChunkLoadError,
} from '@/router'

const fakeRoute = (fullPath = '/mission/abc'): RouteLocationNormalized =>
  ({ fullPath }) as RouteLocationNormalized

// Suites that exercise the reload path replace window.location via
// Object.defineProperty. Restore it (and any spies) symmetrically after every
// test so suites stay isolated regardless of which one ran.
const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')

afterEach(() => {
  vi.restoreAllMocks()
  if (originalLocationDescriptor) {
    Object.defineProperty(window, 'location', originalLocationDescriptor)
  }
})

describe('isChunkLoadError', () => {
  it('matches Vite/Chromium dynamic import failure', () => {
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: foo.js')),
    ).toBe(true)
  })

  it('matches Safari dynamic import failure', () => {
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('matches Firefox dynamic import failure', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'error loading dynamically imported module: https://x/assets/Foo-abc.js',
        ),
      ),
    ).toBe(true)
  })

  it('matches Vite CSS preload failure', () => {
    expect(
      isChunkLoadError(new Error('Unable to preload CSS for /assets/Foo-abc.css')),
    ).toBe(true)
  })

  it('matches Vite module preload failure', () => {
    expect(
      isChunkLoadError(new Error('Unable to preload module https://x/assets/Foo-abc.js')),
    ).toBe(true)
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

describe('handlePreloadError (vite:preloadError listener)', () => {
  let replaceSpy: ReturnType<typeof vi.fn>
  const currentHref = '/v303-mdc-generator/#/mission/abc'

  const preloadErrorEvent = () => new Event('vite:preloadError', { cancelable: true })

  beforeEach(() => {
    sessionStorage.clear()
    replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/v303-mdc-generator/',
        search: '',
        href: currentHref,
        replace: replaceSpy,
      },
    })
  })

  it('reloads to the current URL on vite:preloadError and prevents Vite rethrow', () => {
    const event = preloadErrorEvent()
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    const handled = handlePreloadError(event)

    expect(handled).toBe(true)
    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith(currentHref)
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull()
  })

  it('does not reload twice within the cooldown window', () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))

    const event = preloadErrorEvent()
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    const handled = handlePreloadError(event)

    expect(handled).toBe(false)
    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('reloads again after the cooldown elapses', () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now() - CHUNK_RELOAD_COOLDOWN_MS - 1))

    const event = preloadErrorEvent()
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    const handled = handlePreloadError(event)

    expect(handled).toBe(true)
    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith(currentHref)
  })
})
