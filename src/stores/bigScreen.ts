import { defineStore } from 'pinia'

export const useBigScreenStore = defineStore('bigScreen', {
  state: () => ({
    dashboardConfig: null as any
  }),
  
  actions: {
    async getDashboardConfig() {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM dashboard_configs ORDER BY updated_at DESC LIMIT 1'
      )
      if (result && result.length > 0) {
        return JSON.parse(result[0].widgets)
      }
      return []
    },
    
    async saveDashboardConfig(widgets: any[]) {
      await window.electronAPI.dbExecute(
        'INSERT OR REPLACE INTO dashboard_configs (name, layout, widgets) VALUES (?, ?, ?)',
        ['default', '{}', JSON.stringify(widgets)]
      )
    }
  }
})

