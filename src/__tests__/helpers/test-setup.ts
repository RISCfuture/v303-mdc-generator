/**
 * Test setup utilities
 *
 * Common setup functions to reduce boilerplate in beforeEach hooks
 */

import { setActivePinia, createPinia } from 'pinia'
import { vi, beforeEach } from 'vitest'

/**
 * Creates and activates a new Pinia instance for testing
 * Use this in beforeEach when testing components or composables that use Pinia stores
 *
 * @example
 * beforeEach(() => {
 *   setupPinia()
 * })
 */
export function setupPinia(): void {
  setActivePinia(createPinia())
}

/**
 * Creates a mock localStorage implementation
 * Returns an object that can be assigned to global.localStorage
 *
 * @example
 * global.localStorage = setupLocalStorage()
 *
 * @example
 * beforeEach(() => {
 *   global.localStorage = setupLocalStorage()
 * })
 */
export function setupLocalStorage() {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] ?? null
    },
  }
}

/**
 * Mocks window.matchMedia for testing dark/light mode detection
 *
 * @param isDarkMode - Whether to simulate dark mode (true) or light mode (false)
 *
 * @example
 * beforeEach(() => {
 *   setupMatchMedia(false) // Simulate light mode
 * })
 */
export function setupMatchMedia(isDarkMode = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? isDarkMode : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // deprecated but some libraries still use it
      removeListener: vi.fn(), // deprecated
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  })
}

/**
 * Performs common test setup operations
 * Combines vi.clearAllMocks() and other common beforeEach operations
 *
 * @param options - Configuration options
 * @param options.clearMocks - Whether to clear all mocks (default: true)
 * @param options.setupPiniaStore - Whether to set up Pinia (default: false)
 * @param options.setupLocalStorageMock - Whether to mock localStorage (default: false)
 *
 * @example
 * beforeEach(() => {
 *   setupCommonMocks({ setupPiniaStore: true })
 * })
 */
export function setupCommonMocks(
  options: {
    clearMocks?: boolean
    setupPiniaStore?: boolean
    setupLocalStorageMock?: boolean
  } = {},
): void {
  const { clearMocks = true, setupPiniaStore = false, setupLocalStorageMock = false } = options

  if (clearMocks) {
    vi.clearAllMocks()
  }

  if (setupPiniaStore) {
    setupPinia()
  }

  if (setupLocalStorageMock) {
    const mock = setupLocalStorage() as Storage
    global.localStorage = mock
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mock,
        writable: true,
        configurable: true,
      })
    }
  }
}

/**
 * Creates a beforeEach hook that sets up Pinia and clears mocks
 * Use this as a shorthand for common test setup
 *
 * @example
 * describe('MyStore', () => {
 *   setupTestEnvironment({ pinia: true })
 *
 *   it('should work', () => {
 *     // Pinia is already set up
 *   })
 * })
 */
export function setupTestEnvironment(
  options: {
    pinia?: boolean
    localStorage?: boolean
    matchMedia?: boolean | { isDarkMode: boolean }
    clearMocks?: boolean
  } = {},
): void {
  const {
    pinia = false,
    localStorage: localStorageSetup = false,
    matchMedia: matchMediaSetup = false,
    clearMocks = true,
  } = options

  beforeEach(() => {
    if (clearMocks) {
      vi.clearAllMocks()
    }

    if (pinia) {
      setupPinia()
    }

    if (localStorageSetup) {
      const mock = setupLocalStorage() as Storage
      global.localStorage = mock
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'localStorage', {
          value: mock,
          writable: true,
          configurable: true,
        })
      }
    }

    if (matchMediaSetup) {
      const isDarkMode = typeof matchMediaSetup === 'object' ? matchMediaSetup.isDarkMode : false
      setupMatchMedia(isDarkMode)
    }
  })
}

/**
 * Waits for component's async setup hooks to complete
 * Useful for components with async onMounted/onBeforeMount hooks
 *
 * @example
 * const wrapper = mount(MyComponent)
 * await waitForAsyncSetup()
 * expect(wrapper.vm.data).toBeDefined()
 */
export async function waitForAsyncSetup(): Promise<void> {
  // Wait for all pending promises and multiple event loop cycles
  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setImmediate(resolve))
}
