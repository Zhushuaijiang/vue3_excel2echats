import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库操作
  dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db-query', sql, params),
  dbExecute: (sql: string, params?: any[]) => ipcRenderer.invoke('db-execute', sql, params),
  clearAllData: () => ipcRenderer.invoke('db-clear-all'),
  initSampleData: (options?: { includeSampleData?: boolean }) => ipcRenderer.invoke('db-init-sample-data', options),
  
  // AI功能
  generateDashboard: (options: any) => ipcRenderer.invoke('ai-generate-dashboard', options),
  
  // 文件操作
  selectFile: (options?: { filters?: { name: string; extensions: string[] }[]; multiSelections?: boolean }) => 
    ipcRenderer.invoke('dialog-select-file', options),
  selectFolder: () => ipcRenderer.invoke('dialog-select-folder'),
  
  // Excel 导入
  importExcelFile: (filePath: string, options?: { importFormConfig?: boolean; importData?: boolean }) => 
    ipcRenderer.invoke('excel-import-file', filePath, options),
  importExcelFolder: (folderPath: string, options?: { importFormConfig?: boolean; importData?: boolean }) => 
    ipcRenderer.invoke('excel-import-folder', folderPath, options),
})
