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
// the SPA loaded before the deploy will hit a "Failed to fetch dynamically
// imported module" error on the next route navigation. Reload to the target
// route to pick up the new chunks. Cooldown prevents infinite reload loops if
// the failure is genuinely a network/CDN problem rather than a stale deploy.
export const CHUNK_RELOAD_KEY = 'v303-chunk-reload-at'
export const CHUNK_RELOAD_COOLDOWN_MS = 10_000

export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error &&
  /Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    error.message,
  )

export const handleChunkLoadError = (error: unknown, to: RouteLocationNormalized): boolean => {
  if (!isChunkLoadError(error)) return false

  const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
  if (Date.now() - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return false

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  const target = `${window.location.pathname}${window.location.search}#${to.fullPath}`
  window.location.replace(target)
  return true
}

router.onError(handleChunkLoadError)

export default router
