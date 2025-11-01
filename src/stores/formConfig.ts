import { defineStore } from 'pinia'

export const useFormConfigStore = defineStore('formConfig', {
  state: () => ({
    configs: [] as any[]
  }),
  
  actions: {
    async getConfigs() {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM form_configs ORDER BY created_at DESC'
      )
      return result || []
    },
    
    async createConfig(data: { name: string; fields: string }) {
      await window.electronAPI.dbExecute(
        'INSERT INTO form_configs (name, fields) VALUES (?, ?)',
        [data.name, data.fields]
      )
    },
    
    async updateConfig(id: number, data: { name: string; fields: string }) {
      await window.electronAPI.dbExecute(
        'UPDATE form_configs SET name = ?, fields = ? WHERE id = ?',
        [data.name, data.fields, id]
      )
    },
    
    async deleteConfig(id: number) {
      // 先删除所有关联的数据记录，避免外键约束错误
      await window.electronAPI.dbExecute(
        'DELETE FROM cargo_records WHERE config_id = ?',
        [id]
      )
      // 然后删除表单配置
      await window.electronAPI.dbExecute(
        'DELETE FROM form_configs WHERE id = ?',
        [id]
      )
    }
  }
})

