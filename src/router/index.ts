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
 * Reload to `target` once per cooldown window. Returns true if a reload was
 * initiated.
 *
 * `target` is built from the current pathname (the SPA route lives in the URL
 * fragment because of createWebHashHistory). `location.replace()` to a URL that
 * differs from the current one only in its fragment does NOT reload the
 * document per the HTML spec — so on its own it would update the hash without
 * ever re-fetching the purged chunk. We therefore explicitly call
 * `location.reload()` afterwards to force a full document load that pulls the
 * fresh hashed assets. `replace()` first ensures we land on the intended route
 * (and keeps it out of history) before the reload.
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

  const target = `${window.location.pathname}${window.location.search}#${to.fullPath}`
  return reloadOnce(target)
}

/**
 * Handler for the `vite:preloadError` window event, which fires when Vite's
 * preload helper fails to load a CSS or module preload (V303-8).
 *
 * `vite:preloadError` is a cancelable event. Calling `preventDefault()`
 * suppresses Vite's default behavior of rethrowing the error. Without it, a
 * route-triggered preload failure would ALSO surface through router.onError ->
 * handleChunkLoadError, causing order-dependent double-handling of the same
 * error. Preventing the default makes this handler the sole owner of the
 * preload-error path. Reload to the current URL (hash history already encodes
 * the active route there); the shared cooldown still guards against loops.
 */
export const handlePreloadError = (event: Event): boolean => {
  event.preventDefault()
  return reloadOnce(window.location.href)
}

router.onError(handleChunkLoadError)

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', handlePreloadError)
}

export default router
