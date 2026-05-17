import { test, expect } from './fixtures/fixtures'

/**
 * Regression coverage for V303-8 / V303-9.
 *
 * When a redeploy happens while a user has the SPA loaded, the old hashed
 * chunks vanish and the next lazy route navigation 404s. `src/router/index.ts`
 * mitigates this by reloading once (cooldown-guarded) so the page picks up the
 * new chunks. These tests simulate the purged-chunk scenario by failing the
 * lazy `MissionEditor` import exactly once and asserting the app recovers onto
 * the target route instead of dying on a blank/broken screen.
 *
 * SERVICE WORKER CAVEAT: the *built* app registers a vite-plugin-pwa service
 * worker that precaches chunks; if the SW were active it could serve the chunk
 * from cache and bypass `page.route()`, making interception non-deterministic.
 * Per playwright.config.ts the local run targets the dev server (`npm run dev`,
 * :5173), which does NOT emit/register a service worker (vite-plugin-pwa only
 * generates the SW on build, and devOptions are not enabled here). On CI the
 * preview server (:4173) serves the build, so to keep interception
 * deterministic across both we also defensively block the SW registration
 * scripts and stub `navigator.serviceWorker.register` before each test. This
 * guarantees `page.route()` — not a precache — decides whether the chunk loads.
 *
 * The dynamic-import URL differs by mode: the dev server serves the Vue SFC as
 * an ESM source module (`/src/views/MissionEditor.vue`), while a build emits a
 * hashed `assets/MissionEditor-*.js`. The interception glob below covers both.
 *
 * REAL-RELOAD COUNTING: hash-history SPA navigations also fire Playwright's
 * `framenavigated`, so that event over-counts. Instead an init script bumps a
 * sessionStorage counter on every genuine document load; the counter is zeroed
 * immediately before the failure is triggered so the post-failure value is
 * exactly the number of recovery reloads (must be 1 — the cooldown backstop
 * prevents an infinite loop).
 */

const MISSION_EDITOR_CHUNK = /\/(assets\/MissionEditor-[^/]+\.js|src\/views\/MissionEditor\.vue)/

const realDocumentLoads = (page: import('@playwright/test').Page) =>
  page.evaluate(() => Number(sessionStorage.getItem('__e2e_doc_loads') ?? '0'))

const resetLoadCounter = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    sessionStorage.setItem('__e2e_doc_loads', '0')
  })
}

test.describe('Chunk-load error recovery (V303-8 / V303-9)', () => {
  test.beforeEach(async ({ page, missionListPage }) => {
    // Count every genuine document load (survives SPA hash navigations).
    await page.addInitScript(() => {
      const n = Number(sessionStorage.getItem('__e2e_doc_loads') ?? '0') + 1
      sessionStorage.setItem('__e2e_doc_loads', String(n))
    })

    // Defensively neutralize the PWA service worker so chunk interception is
    // deterministic regardless of dev vs. preview server (see file header).
    await page.route(/\/(sw\.js|registerSW\.js)(\?|$)/, (route) => route.abort())
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          value: {
            register: () => Promise.reject(new Error('SW disabled for test')),
            getRegistrations: () => Promise.resolve([]),
            addEventListener: () => undefined,
            ready: new Promise<void>(() => undefined),
          },
        })
      }
    })

    await missionListPage.goto()
    await missionListPage.clearStorageAndReload()
  })

  test('recovers onto the target route after a purged lazy chunk (exactly one reload, no loop)', async ({
    page,
  }) => {
    let chunkRequestCount = 0
    let failedOnce = false

    // Fail the MissionEditor lazy chunk exactly once (simulating a chunk that
    // was purged by a redeploy), then let the reload re-fetch it successfully.
    await page.route(MISSION_EDITOR_CHUNK, async (route) => {
      chunkRequestCount += 1
      if (!failedOnce) {
        failedOnce = true
        await route.fulfill({ status: 404, body: 'Not Found' })
        return
      }
      await route.continue()
    })

    // Zero the counter so only post-failure document loads are measured.
    await resetLoadCounter(page)

    // Navigate to the lazy /mission/:id route. The first dynamic import 404s,
    // router.onError fires handleChunkLoadError, and the app reloads once.
    await page.getByRole('button', { name: /New Mission/ }).first().click()
    await page.getByRole('button', { name: 'Create Mission' }).click()

    // After the cooldown-guarded reload, the editor chunk loads on the retry
    // and the app lands on the mission editor (recovered, not blank/broken).
    await page.waitForURL(/#\/mission\/.+/, { timeout: 15_000 })
    await expect(page.getByText('Basic Info', { exact: true })).toBeVisible({ timeout: 15_000 })

    // The chunk was requested at least twice (initial 404 + successful retry),
    // proving the failure really happened and was recovered from.
    expect(failedOnce).toBe(true)
    expect(chunkRequestCount).toBeGreaterThanOrEqual(2)

    // Cooldown backstop: exactly ONE recovery document load occurred — the
    // failure did not send the app into an infinite reload loop.
    expect(await realDocumentLoads(page)).toBe(1)

    // Give any (incorrectly-)looping reload a chance to manifest, then confirm
    // we are still stably on the editor and still at exactly one reload.
    await page.waitForTimeout(2_000)
    await expect(page.getByText('Basic Info', { exact: true })).toBeVisible()
    expect(await realDocumentLoads(page)).toBe(1)
  })

  /**
   * CSS / `vite:preloadError` path (V303-8): Vite's preload helper only emits
   * `vite:preloadError` for the modulepreload/CSS-preload helper used in a
   * production build. The dev server serves CSS via the SFC ESM pipeline and
   * does not run the preload helper, so that exact event is NOT reliably
   * reproducible against the default local dev-server harness. Rather than
   * asserting nothing, this case exercises the same recovery contract through a
   * network-style (aborted) chunk failure — the other failure shape Vite's
   * preload helper would surface — which IS deterministic here. The dedicated
   * unit test (src/__tests__/router/chunkLoadError.spec.ts -> handlePreloadError)
   * covers `event.preventDefault()` + the reload/cooldown branching for the
   * literal `vite:preloadError` event directly.
   */
  test('network-aborted chunk (preloadError-shaped failure) also recovers with one reload', async ({
    page,
  }) => {
    let failedOnce = false
    await page.route(MISSION_EDITOR_CHUNK, async (route) => {
      if (!failedOnce) {
        failedOnce = true
        await route.abort('failed')
        return
      }
      await route.continue()
    })

    await resetLoadCounter(page)

    await page.getByRole('button', { name: /New Mission/ }).first().click()
    await page.getByRole('button', { name: 'Create Mission' }).click()

    await page.waitForURL(/#\/mission\/.+/, { timeout: 15_000 })
    await expect(page.getByText('Basic Info', { exact: true })).toBeVisible({ timeout: 15_000 })

    expect(failedOnce).toBe(true)
    expect(await realDocumentLoads(page)).toBe(1)

    await page.waitForTimeout(2_000)
    await expect(page.getByText('Basic Info', { exact: true })).toBeVisible()
    expect(await realDocumentLoads(page)).toBe(1)
  })
})
