import { createRouter, createWebHashHistory } from 'vue-router'
import MissionList from '@/views/MissionList.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
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

export default router
