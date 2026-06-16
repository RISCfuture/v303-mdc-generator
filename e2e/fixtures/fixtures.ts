import { test as base } from '@playwright/test'
import { MissionEditorPage } from '../pages/MissionEditorPage'
import { MissionListPage } from '../pages/MissionListPage'

type Fixtures = {
  missionListPage: MissionListPage
  missionEditorPage: MissionEditorPage
  /** Auto fixture; resets persisted storage before each test. */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void is the idiomatic type for a setup-only Playwright auto fixture
  resetStorage: void
}

type Options = {
  /**
   * When true (the default), every test starts from a clean slate: the app is
   * loaded, persisted storage is cleared, and the page is reloaded. Specs that
   * need to control navigation themselves (e.g. installing init scripts before
   * the first load) opt out with `test.use({ autoReset: false })`.
   */
  autoReset: boolean
  /**
   * When true, IndexedDB (uploaded mission images) is cleared alongside
   * localStorage during the automatic reset. Defaults to false.
   */
  resetImages: boolean
}

export const test = base.extend<Fixtures & Options>({
  autoReset: [true, { option: true }],
  resetImages: [false, { option: true }],
  missionListPage: async ({ page }, use) => {
    await use(new MissionListPage(page))
  },
  missionEditorPage: async ({ page }, use) => {
    await use(new MissionEditorPage(page))
  },
  // Auto fixture: reset persisted storage before each test so specs no longer
  // repeat goto()/clearStorageAndReload() in every beforeEach.
  resetStorage: [
    async ({ autoReset, resetImages, missionListPage }, use) => {
      if (autoReset) {
        await missionListPage.goto()
        if (resetImages) {
          await missionListPage.clearAllStorageAndReload()
        } else {
          await missionListPage.clearStorageAndReload()
        }
      }
      await use(undefined)
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
