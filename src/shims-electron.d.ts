declare global {
  interface Window {
    electronAPI: {
      dbQuery: (sql: string, params?: any[]) => Promise<any[]>
      dbExecute: (sql: string, params?: any[]) => Promise<any>
      generateDashboard: (options: { prompt: string; count: number }) => Promise<any>
      clearAllData: () => Promise<{ success: boolean; totalDeleted: number; details: { [key: string]: number } }>
      initSampleData: (options?: { includeSampleData?: boolean }) => Promise<{ success: boolean; formCount: number; recordCount: number; message: string }>
      
      // 文件操作
      selectFile: (options?: { filters?: { name: string; extensions: string[] }[]; multiSelections?: boolean }) => Promise<string | string[] | null>
      selectFolder: () => Promise<string | null>
      
      // Excel 导入
      importExcelFile: (filePath: string, options?: { importFormConfig?: boolean; importData?: boolean }) => Promise<{
        success: boolean
        formConfigs?: number
        records?: number
        errors?: string[]
        error?: string
      }>
      importExcelFolder: (folderPath: string, options?: { importFormConfig?: boolean; importData?: boolean }) => Promise<{
        success: boolean
        totalFiles?: number
        successFiles?: number
        failedFiles?: string[]
        totalFormConfigs?: number
        totalRecords?: number
        errors?: string[]
        error?: string
      }>
    }
  }
}

export {}
