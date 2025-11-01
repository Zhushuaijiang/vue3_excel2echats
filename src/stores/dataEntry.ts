import { defineStore } from 'pinia'

export const useDataEntryStore = defineStore('dataEntry', {
  state: () => ({
    records: [] as any[]
  }),
  
  actions: {
    async getAllRecords() {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM cargo_records ORDER BY created_at DESC LIMIT 100'
      )
      return result || []
    },
    
    async getRecords(configId: string | number) {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM cargo_records WHERE config_id = ? ORDER BY created_at DESC',
        [configId]
      )
      return result || []
    },
    
    async createRecord(data: { config_id: string | number; data: string }) {
      await window.electronAPI.dbExecute(
        'INSERT INTO cargo_records (config_id, data) VALUES (?, ?)',
        [data.config_id, data.data]
      )
    },
    
    async updateRecord(id: number, data: { data: string }) {
      await window.electronAPI.dbExecute(
        'UPDATE cargo_records SET data = ? WHERE id = ?',
        [data.data, id]
      )
    },
    
    async deleteRecord(id: number) {
      await window.electronAPI.dbExecute(
        'DELETE FROM cargo_records WHERE id = ?',
        [id]
      )
    }
  }
})

