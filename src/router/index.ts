import { createRouter, createWebHashHistory, type RouteLocationNormalized } from 'vue-router'
import MissionList from '@/views/MissionList.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: MissionList,
    },
    {
      path: '/mission/:id',
      name: 'mission',
      component: () => import('@/views/MissionEditor.vue'),
    },
    {
      path: '/squadron-data',
      name: 'squadron-data',
      component: () => import('@/views/SquadronDataEdit.vue'),
    },
  ],
})

// When a new build is deployed, hashed asset filenames change. A user who had
// the SPA loaded before the deploy will hit a chunk load error on the next
// route navigation or CSS/module preload. Reload to pick up the new chunks.
// Cooldown prevents infinite reload loops if the failure is genuinely a
// network/CDN problem rather than a stale deploy.
export const CHUNK_RELOAD_KEY = 'v303-chunk-reload-at'
export const CHUNK_RELOAD_COOLDOWN_MS = 10_000

export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error &&
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Unable to preload module/i.test(
    error.message,
  )

/**
 * Build the full reload URL for a hash-history route. The SPA route lives in
 * the URL fragment (createWebHashHistory), so both the router-error path and
 * the vite:preloadError path MUST construct the reload target identically —
 * factored here so they cannot diverge and one path cannot regress to a wrong
 * (e.g. stale) target while the other stays correct.
 */
export const routeReloadTarget = (fullPath: string): string =>
  `${window.location.pathname}${window.location.search}#${fullPath}`

/**
 * The fullPath of the navigation currently in flight, captured by a
 * router.beforeEach guard. This exists because Vite's preload helper dispatches
 * `vite:preloadError` BEFORE createWebHashHistory commits the URL to the target
 * route: at that instant `window.location.href` still points at the route the
 * user is navigating *away from*. Reloading that stale URL bounces the user to
 * the wrong page and never recovers the route they actually requested (the
 * V303-8/9 production bug). The pending target is the correct thing to reload
 * to. We intentionally do NOT clear it after navigation: a stale-but-plausible
 * last target is still strictly better than the known-broken stale href.
 */
let pendingFullPath: string | null = null

/** Registered via router.beforeEach; exported so unit tests can drive it. */
export const recordPendingRoute = (to: RouteLocationNormalized | null): void => {
  pendingFullPath = to?.fullPath ?? null
}

/**
 * Reload to `target` once per cooldown window. Returns true if a reload was
 * initiated.
 *
 * `location.replace()` to a URL that differs from the current one only in its
 * fragment does NOT reload the document per the HTML spec — so on its own it
 * would update the hash without ever re-fetching the purged chunk. We therefore
 * explicitly call `location.reload()` afterwards to force a full document load
 * that pulls the fresh hashed assets. `replace()` first ensures we land on the
 * intended route (and keeps it out of history) before the reload.
 */
const reloadOnce = (target: string): boolean => {
  const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
  if (Date.now() - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return false

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  window.location.replace(target)
  window.location.reload()
  return true
}

export const handleChunkLoadError = (error: unknown, to: RouteLocationNormalized): boolean => {
  if (!isChunkLoadError(error)) return false

  return reloadOnce(routeReloadTarget(to.fullPath))
}

/**
 * Handler for the `vite:preloadError` window event, which fires when Vite's
 * preload helper fails to load a CSS or module preload (V303-8). In a build,
 * this fires for a failed lazy-route chunk BEFORE router.onError and before
 * hash history commits the target URL.
 *
 * `vite:preloadError` is a cancelable event. Calling `preventDefault()`
 * suppresses Vite's default behavior of rethrowing the error. Without it, a
 * route-triggered preload failure would ALSO surface through router.onError ->
 * handleChunkLoadError, causing order-dependent double-handling of the same
 * error. Preventing the default makes this handler the sole owner of the
 * preload-error path.
 *
 * We reload to the PENDING navigation target (captured by router.beforeEach),
 * built the same way as handleChunkLoadError. `window.location.href` is NOT
 * usable here: at preloadError time the navigation is still pending, so the
 * hash still encodes the previous route — reloading it would strand the user
 * on the wrong page (the exact V303-8/9 failure). If there is no pending route
 * (a preload failure outside any route navigation), fall back to the current
 * href. The shared cooldown still guards against loops.
 */
export const handlePreloadError = (event: Event): boolean => {
  event.preventDefault()
  const target = pendingFullPath ? routeReloadTarget(pendingFullPath) : window.location.href
  return reloadOnce(target)
}

router.beforeEach((to) => {
  recordPendingRoute(to)
})

router.onError(handleChunkLoadError)

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', handlePreloadError)
}

export default router
