import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_KEY,
  handleChunkLoadError,
  handlePreloadError,
  recordPendingRoute,
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

describe('handleChunkLoadError', () => {
  let replaceSpy: ReturnType<typeof vi.fn>
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    replaceSpy = vi.fn()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/v303-mdc-generator/',
        search: '',
        replace: replaceSpy,
        reload: reloadSpy,
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
    // Hash-only replace() does not reload; an explicit reload() forces the
    // document to re-fetch the fresh hashed chunks.
    expect(reloadSpy).toHaveBeenCalled()
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
    expect(reloadSpy).toHaveBeenCalled()
  })

  it('handleChunkLoadError ignores non-Error values', () => {
    expect(handleChunkLoadError('not an error', fakeRoute())).toBe(false)
    expect(handleChunkLoadError(null, fakeRoute())).toBe(false)
    expect(replaceSpy).not.toHaveBeenCalled()
  })
})

describe('handlePreloadError (vite:preloadError listener)', () => {
  let replaceSpy: ReturnType<typeof vi.fn>
  let reloadSpy: ReturnType<typeof vi.fn>
  // The current document URL while a navigation is still PENDING is the route
  // the user is navigating *away* from — NOT the target. This is precisely the
  // production bug: vite:preloadError fires before hash history commits, so
  // reloading window.location.href reloads the wrong (previous) route.
  const staleHref = '/v303-mdc-generator/#/'
  const pendingFullPath = '/mission/abc'
  const pendingTarget = '/v303-mdc-generator/#/mission/abc'

  const preloadErrorEvent = () => new Event('vite:preloadError', { cancelable: true })

  beforeEach(() => {
    sessionStorage.clear()
    replaceSpy = vi.fn()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/v303-mdc-generator/',
        search: '',
        href: staleHref,
        replace: replaceSpy,
        reload: reloadSpy,
      },
    })
    // Simulate router.beforeEach having recorded the in-flight navigation.
    recordPendingRoute(fakeRoute(pendingFullPath))
  })

  it('reloads to the PENDING route target (not stale window.location.href) and prevents Vite rethrow', () => {
    const event = preloadErrorEvent()
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    const handled = handlePreloadError(event)

    expect(handled).toBe(true)
    expect(preventDefaultSpy).toHaveBeenCalled()
    // MUST reload to the pending-route target, NOT the stale href. This
    // assertion fails if the pending-route logic is removed.
    expect(replaceSpy).toHaveBeenCalledWith(pendingTarget)
    expect(replaceSpy).not.toHaveBeenCalledWith(staleHref)
    expect(reloadSpy).toHaveBeenCalled()
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull()
  })

  it('falls back to window.location.href when there is no pending route', () => {
    // Preload failure outside any route navigation (e.g. an eager preload).
    recordPendingRoute(null)

    const event = preloadErrorEvent()
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    const handled = handlePreloadError(event)

    expect(handled).toBe(true)
    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith(staleHref)
    expect(reloadSpy).toHaveBeenCalled()
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
    expect(replaceSpy).toHaveBeenCalledWith(pendingTarget)
    expect(reloadSpy).toHaveBeenCalled()
  })
})
