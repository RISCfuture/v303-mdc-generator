import { test as base } from '@playwright/test'
import { MissionEditorPage } from '../pages/MissionEditorPage'
import { MissionListPage } from '../pages/MissionListPage'

/**
 * How much persisted state to clear before a test runs.
 * - `'local'`: clear localStorage only (the common case).
 * - `'all'`: clear localStorage and the IndexedDB image store.
 * - `false`: skip the automatic reset entirely (the test owns its own
 *   navigation/reset, e.g. when init scripts must be installed before the
 *   first navigation).
 */
type ResetStorageMode = 'local' | 'all' | false

type Options = {
  /** Storage reset performed automatically before each test. Defaults to `'local'`. */
  resetStorage: ResetStorageMode
  /** Disable CSS animations after the reset (useful for flaky WebKit clicks). Defaults to `false`. */
  disableAnimations: boolean
}

type Fixtures = {
  missionListPage: MissionListPage
  missionEditorPage: MissionEditorPage
  /**
   * Auto fixture that lands on the mission list with a clean storage slate,
   * so specs don't repeat `goto()` + `clearStorageAndReload()` in every
   * `beforeEach`. Tune via `test.use({ resetStorage, disableAnimations })`.
   */
  freshStorage: undefined
}

export const test = base.extend<Options & Fixtures>({
  resetStorage: ['local', { option: true }],
  disableAnimations: [false, { option: true }],

  missionListPage: async ({ page }, use) => {
    await use(new MissionListPage(page))
  },
  missionEditorPage: async ({ page }, use) => {
    await use(new MissionEditorPage(page))
  },

  freshStorage: [
    async ({ missionListPage, resetStorage, disableAnimations }, use) => {
      if (resetStorage !== false) {
        await missionListPage.goto()
        if (resetStorage === 'all') {
          await missionListPage.clearAllStorageAndReload()
        } else {
          await missionListPage.clearStorageAndReload()
        }
        if (disableAnimations) {
          await missionListPage.disableAnimations()
        }
      }
      await use(undefined)
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
