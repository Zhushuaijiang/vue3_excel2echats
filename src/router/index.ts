import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue')
        },
        {
          path: 'config',
          name: 'FormConfig',
          component: () => import('../views/FormConfig.vue')
        },
        {
          path: 'data-entry',
          name: 'DataEntry',
          component: () => import('../views/DataEntry.vue')
        },
        {
          path: 'bigscreen',
          name: 'BigScreen',
          component: () => import('../views/BigScreen.vue')
        },
        {
          path: 'ai-templates',
          name: 'AITemplates',
          component: () => import('../views/AITemplates.vue')
        }
      ]
    }
  ]
})

export default router

