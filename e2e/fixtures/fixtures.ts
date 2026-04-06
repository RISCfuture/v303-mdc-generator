import { test as base } from '@playwright/test'
import { MissionEditorPage } from '../pages/MissionEditorPage'
import { MissionListPage } from '../pages/MissionListPage'

type Fixtures = {
  missionListPage: MissionListPage
  missionEditorPage: MissionEditorPage
}

export const test = base.extend<Fixtures>({
  missionListPage: async ({ page }, use) => {
    await use(new MissionListPage(page))
  },
  missionEditorPage: async ({ page }, use) => {
    await use(new MissionEditorPage(page))
  },
})

export { expect } from '@playwright/test'
