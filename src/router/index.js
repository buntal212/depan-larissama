import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'

import routes from './routes.js'
import { authSession } from '@/stores/auth-session.js'
import { restoreSession } from '@/services/auth.js'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  })

  router.beforeEach(async (to) => {
    const authenticated = await restoreSession()
    if (to.meta.requiresAuth && !authenticated) return { path: '/login', query: { redirect: to.fullPath } }
    if (to.meta.guestOnly && authenticated) return '/'
    if (to.path === '/' && authSession.user?.role === 'superadmin') return '/platform/warungs'
    if (to.meta.roles && !to.meta.roles.includes(authSession.user?.role)) return '/'
    return true
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('larisama:session-expired', () => router.replace('/login'))
  }

  return router
})
