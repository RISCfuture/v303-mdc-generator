/**
 * Global Vitest setup file
 * This file runs before all test files
 */

import { vi } from 'vitest'
import 'fake-indexeddb/auto'

/**
 * Pin the system clock for every unit test so any fixture data computed from
 * `new Date()` is stable across runs and timezones. The mission store's
 * `createMission` populates `date` from `new Date().toISOString().split('T')[0]`
 * — that is a *UTC* date, so without pinning the value flips after midnight
 * UTC even when the local date is unchanged, breaking any snapshot that
 * captures it (notably `pdfMakeBriefingCard.composition.spec.ts`).
 *
 * The chosen instant matches the historical snapshot baseline (`2026-05-19`)
 * so the existing snapshot stays green. We fake only `Date` — `setTimeout`,
 * `setInterval`, `process.nextTick` etc. remain real so async tests don't
 * deadlock. Individual tests that need a different time can still call
 * `vi.setSystemTime(...)` to override.
 *
 * Existing time-ordering assertions in the suite use `toBeGreaterThanOrEqual`
 * (not strict `>`), so they tolerate the pinned-clock case where two
 * back-to-back `Date.now()` calls return the same value.
 */
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-05-19T12:00:00Z'))

// Mock localStorage globally
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    clear: (): void => {
      store = {}
    },
    removeItem: (key: string): void => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    },
    get length(): number {
      return Object.keys(store).length
    },
    key: (index: number): string | null => {
      const keys = Object.keys(store)
      return keys[index] ?? null
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {
    /* no-op for tests */
  }
  unobserve() {
    /* no-op for tests */
  }
  disconnect() {
    /* no-op for tests */
  }
}

// Suppress Vue DevTools warnings in tests
if (typeof window !== 'undefined') {
  // @ts-expect-error - devtools config
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = {
    enabled: false,
    emit: () => {
      /* no-op */
    },
    on: () => {
      /* no-op */
    },
    once: () => {
      /* no-op */
    },
    off: () => {
      /* no-op */
    },
  }
}
