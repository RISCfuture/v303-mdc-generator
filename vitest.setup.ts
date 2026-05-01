/**
 * Global Vitest setup file
 * This file runs before all test files
 */

import 'fake-indexeddb/auto'

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
