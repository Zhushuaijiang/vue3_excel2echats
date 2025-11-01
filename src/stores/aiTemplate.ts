import { defineStore } from 'pinia'

export const useAITemplateStore = defineStore('aiTemplate', {
  state: () => ({
    templates: [] as any[]
  }),
  
  actions: {
    async getTemplates() {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM ai_templates ORDER BY created_at DESC'
      )
      return result || []
    },
    
    async createTemplate(data: { name: string; prompt: string }) {
      await window.electronAPI.dbExecute(
        'INSERT INTO ai_templates (name, prompt) VALUES (?, ?)',
        [data.name, data.prompt]
      )
    },
    
    async updateTemplate(id: number, data: { name: string; prompt: string }) {
      await window.electronAPI.dbExecute(
        'UPDATE ai_templates SET name = ?, prompt = ? WHERE id = ?',
        [data.name, data.prompt, id]
      )
    },
    
    async deleteTemplate(id: number) {
      await window.electronAPI.dbExecute(
        'DELETE FROM ai_templates WHERE id = ?',
        [id]
      )
    }
  }
})

