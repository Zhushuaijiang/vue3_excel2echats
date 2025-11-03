import { ipcMain, app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

// 加载AI配置
function loadAIConfig() {
  const configPath = path.join(__dirname, 'config.json')
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(configData)
    }
  } catch (error) {
    console.error('Failed to load AI config:', error)
  }
  return {
    ai: {
      provider: 'deepseek',
      apiKey: 'sk-31e937b5ab43432bb81cfb20fded3159',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2000
    }
  }
}

// DeepSeek API调用
async function callDeepSeekAPI(prompt: string, options: any) {
  const config = loadAIConfig()
  const apiKey = config.ai.apiKey

  if (!apiKey) {
    throw new Error('API密钥未配置，请在 electron/config.json 中设置 apiKey')
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.ai.model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的航空货运数据分析助手。根据用户需求生成ECharts图表配置的JSON数据。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.ai.temperature || 0.7,
        max_tokens: config.ai.maxTokens || 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`API调用失败: ${response.status} - ${errorData}`)
    }

    const data = await response.json() as any
    const content = data.choices[0]?.message?.content || ''

    // 尝试从响应中提取JSON
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/)
    let jsonStr = jsonMatch ? jsonMatch[1] : content
    
    // 尝试直接解析
    let parsedData
    try {
      parsedData = JSON.parse(jsonStr.trim())
    } catch (e) {
      // 如果解析失败，使用默认结构
      console.warn('AI返回的不是有效的JSON，使用默认结构')
      parsedData = generateDefaultWidgets(options.count)
    }

    return parsedData
  } catch (error) {
    console.error('DeepSeek API error:', error)
    throw error
  }
}

// 生成默认组件（作为fallback）
function generateDefaultWidgets(count: number = 3) {
  const widgetTypes = ['line', 'bar', 'pie']
  const widgets = []
  
  for (let i = 0; i < Math.min(count, 6); i++) {
    const type = widgetTypes[i % widgetTypes.length]
    widgets.push({
      id: `widget_${i + 1}`,
      type: type,
      title: `图表 ${i + 1}`,
      x: (i % 2) * 50,
      y: Math.floor(i / 2) * 50,
      w: 45,
      h: 45
    })
  }
  
  return { widgets }
}

// AI生成大屏组件
async function generateDashboardWidgets(prompt: string, count: number) {
  const systemPrompt = `请生成一个航空货运大屏的配置，包含 ${count} 个图表组件。

要求：
1. 返回JSON格式的数据
2. 包含 widgets 数组，每个元素是一个图表配置
3. 每个widget包含：id, type, title, x, y, w, h
4. type 只能是 'line'、'bar' 或 'pie'
5. x, y, w, h 是百分比数值（0-100）
6. w 和 h 建议在 30-50 之间
7. 确保组件不重叠

用户需求：${prompt}

返回格式示例：
\`\`\`json
{
  "widgets": [
    {
      "id": "widget_1",
      "type": "line",
      "title": "货运量趋势",
      "x": 5,
      "y": 5,
      "w": 45,
      "h": 40
    }
  ]
}
\`\`\``

  try {
    const result = await callDeepSeekAPI(systemPrompt, { count })
    return result
  } catch (error) {
    console.error('AI生成失败，使用默认配置:', error)
    return generateDefaultWidgets(count)
  }
}

// 初始化数据库
export function initDatabase() {
  try {
    if (db) {
      console.log('数据库已经初始化')
      return
    }
    
    const userDataPath = app.getPath('userData')
    console.log('初始化数据库，用户数据路径:', userDataPath)
    
    // 确保目录存在
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    
    const dbPath = path.join(userDataPath, 'cargo_data.db')
    console.log('数据库路径:', dbPath)
    
    db = new Database(dbPath)
    console.log('数据库连接成功')
    
    // 创建表
    db.exec(`
      CREATE TABLE IF NOT EXISTS form_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fields TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS cargo_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (config_id) REFERENCES form_configs(id)
      );
      
      CREATE TABLE IF NOT EXISTS dashboard_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        layout TEXT NOT NULL,
        widgets TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS ai_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        config_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
    `)
    
    // 尝试为已存在的表添加config_id字段（如果不存在）
    try {
      const tableInfo = db.prepare("PRAGMA table_info(ai_templates)").all() as any[]
      const hasConfigId = tableInfo.some((col: any) => col.name === 'config_id')
      if (!hasConfigId) {
        db.exec('ALTER TABLE ai_templates ADD COLUMN config_id INTEGER')
        console.log('已为ai_templates表添加config_id字段')
      }
    } catch (e) {
      // 忽略错误（字段可能已存在）
    }
    console.log('数据库表创建成功')
    
    // 初始化示例AI模板
    const existingTemplates = db.prepare('SELECT COUNT(*) as count FROM ai_templates').get() as { count: number }
    if (existingTemplates.count === 0) {
      const insertTemplate = db.prepare('INSERT INTO ai_templates (name, prompt) VALUES (?, ?)')
      const templates = [
        ['货运量分析', '请生成一个展示航空货运量的统计大屏，包含：1. 总体货运量趋势图（折线图）2. 各航线货运量对比（柱状图）3. 货运量占比分析（饼图）。根据用户输入：{user_input}'],
        ['航线效率分析', '请生成一个航线效率分析大屏，展示：1. 各航线准点率对比（柱状图）2. 效率趋势（折线图）3. 问题航线预警（列表）。用户需求：{user_input}'],
        ['成本收益分析', '生成成本收益分析大屏，包含：1. 月度成本趋势 2. 收益对比 3. 利润率分析。详细需求：{user_input}']
      ]
      templates.forEach(([name, prompt]) => insertTemplate.run(name, prompt))
      console.log('AI模板初始化成功')
    }
    
    console.log('数据库初始化完成')
  } catch (error) {
    console.error('Database initialization error:', error)
    db = null
    throw error
  }
}

// 注册IPC处理器
export function registerIpcHandlers() {
  // 在注册处理器时先初始化数据库
  try {
    initDatabase()
  } catch (error) {
    console.error('初始化数据库失败:', error)
  }

  ipcMain.handle('db-query', async (_event, sql: string, params?: any[]) => {
    try {
      if (!db) {
        initDatabase()
      }
      if (!db) {
        throw new Error('数据库初始化失败，无法执行查询')
      }
      const stmt = db.prepare(sql)
      return stmt.all(params || [])
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  })

  ipcMain.handle('db-execute', async (_event, sql: string, params?: any[]) => {
    try {
      if (!db) {
        initDatabase()
      }
      if (!db) {
        throw new Error('数据库初始化失败，无法执行操作')
      }
      const stmt = db.prepare(sql)
      return stmt.run(params || [])
    } catch (error) {
      console.error('Database execute error:', error)
      throw error
    }
  })

  ipcMain.handle('db-clear-all', async () => {
    try {
      if (!db) {
        initDatabase()
      }
      if (!db) {
        throw new Error('数据库初始化失败，无法执行操作')
      }
      
      // 禁用外键约束检查
      db.pragma('foreign_keys = OFF')
      
      // 按顺序清空表（考虑外键关系）
      const tables = [
        'cargo_records',        // 先删除数据记录（有外键约束）
        'form_configs',         // 然后删除表单配置
        'dashboard_configs',     // 大屏配置
        'ai_templates'          // AI模板
      ]
      
      const result: { [key: string]: number } = {}
      let totalDeleted = 0
      
      for (const table of tables) {
        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
        const countResult = countStmt.get() as { count: number }
        const count = countResult ? countResult.count : 0
        
        if (count > 0) {
          db.prepare(`DELETE FROM ${table}`).run()
          result[table] = count
          totalDeleted += count
        } else {
          result[table] = 0
        }
      }
      
      // 重置自增ID
      for (const table of tables) {
        try {
          db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table)
        } catch (e) {
          // 如果表没有使用 AUTOINCREMENT，可能会失败，忽略
        }
      }
      
      // 重新启用外键约束
      db.pragma('foreign_keys = ON')
      
      return {
        success: true,
        totalDeleted,
        details: result
      }
    } catch (error) {
      console.error('Clear database error:', error)
      throw error
    }
  })

  ipcMain.handle('db-init-sample-data', async (_event, options?: { includeSampleData?: boolean }) => {
    try {
      if (!db) {
        initDatabase()
      }
      if (!db) {
        throw new Error('数据库初始化失败，无法执行操作')
      }
      
      const includeSampleData = options?.includeSampleData ?? true
      
      // 表单模板数据
      const formTemplates = [
        {
          name: '国际货运单',
          fields: [
            { name: '运单号', type: 'text' },
            { name: '出发机场', type: 'text' },
            { name: '目的地机场', type: 'text' },
            { name: '货物重量(kg)', type: 'number' },
            { name: '货物体积(m³)', type: 'number' },
            { name: '起飞时间', type: 'date' },
            { name: '货物类型', type: 'select' },
            { name: '承运航空公司', type: 'text' }
          ]
        },
        {
          name: '国内货运单',
          fields: [
            { name: '运单号', type: 'text' },
            { name: '出发城市', type: 'text' },
            { name: '目的城市', type: 'text' },
            { name: '货物重量(kg)', type: 'number' },
            { name: '运费(元)', type: 'number' },
            { name: '发货日期', type: 'date' },
            { name: '运输状态', type: 'select' },
            { name: '客户名称', type: 'text' },
            { name: '联系电话', type: 'text' }
          ]
        },
        {
          name: '仓储信息单',
          fields: [
            { name: '仓库编号', type: 'text' },
            { name: '货物名称', type: 'text' },
            { name: '入库数量', type: 'number' },
            { name: '入库日期', type: 'date' },
            { name: '预计出库日期', type: 'date' },
            { name: '货物状态', type: 'select' },
            { name: '仓库管理员', type: 'text' }
          ]
        },
        {
          name: '航班调度单',
          fields: [
            { name: '航班号', type: 'text' },
            { name: '执飞日期', type: 'date' },
            { name: '货运舱位(吨)', type: 'number' },
            { name: '实际载货(吨)', type: 'number' },
            { name: '载货率(%)', type: 'number' },
            { name: '航班状态', type: 'select' },
            { name: '机长姓名', type: 'text' }
          ]
        },
        {
          name: '客户提货单',
          fields: [
            { name: '提货单号', type: 'text' },
            { name: '客户名称', type: 'text' },
            { name: '提货日期', type: 'date' },
            { name: '提货件数', type: 'number' },
            { name: '提货重量(kg)', type: 'number' },
            { name: '提货状态', type: 'select' },
            { name: '验收人', type: 'text' },
            { name: '客户签名', type: 'text' }
          ]
        },
        {
          name: '转运单据',
          fields: [
            { name: '转运单号', type: 'text' },
            { name: '原运单号', type: 'text' },
            { name: '中转机场', type: 'text' },
            { name: '转入日期', type: 'date' },
            { name: '转出日期', type: 'date' },
            { name: '转运货物量(kg)', type: 'number' },
            { name: '转运状态', type: 'select' }
          ]
        },
        {
          name: '危险品运输单',
          fields: [
            { name: '危险品单号', type: 'text' },
            { name: '危险品分类', type: 'text' },
            { name: '货物名称', type: 'text' },
            { name: '重量(kg)', type: 'number' },
            { name: '运输日期', type: 'date' },
            { name: '危险等级', type: 'select' },
            { name: '特殊防护措施', type: 'text' },
            { name: '专业运输员', type: 'text' }
          ]
        },
        {
          name: '快递配送单',
          fields: [
            { name: '配送单号', type: 'text' },
            { name: '收件人姓名', type: 'text' },
            { name: '收件地址', type: 'text' },
            { name: '联系电话', type: 'text' },
            { name: '配送重量(kg)', type: 'number' },
            { name: '配送日期', type: 'date' },
            { name: '配送状态', type: 'select' },
            { name: '配送员', type: 'text' }
          ]
        }
      ]
      
      const insertForm = db.prepare('INSERT OR IGNORE INTO form_configs (name, fields) VALUES (?, ?)')
      const checkForm = db.prepare('SELECT COUNT(*) as count FROM form_configs WHERE name = ?')
      let formCount = 0
      
      for (const template of formTemplates) {
        // 检查是否已存在
        const existing = checkForm.get(template.name) as { count: number }
        if (existing.count === 0) {
          insertForm.run(template.name, JSON.stringify(template.fields))
          formCount++
        }
      }
      
      let recordCount = 0
      if (includeSampleData) {
        // 生成模拟数据
        const configs = db.prepare('SELECT * FROM form_configs').all() as any[]
        const cities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '武汉', '南京', '重庆']
        const airlines = ['中国国际航空', '中国南方航空', '中国东方航空', '海南航空', '厦门航空']
        const statuses = ['已发货', '运输中', '已到达', '已签收', '待处理']
        
        const insertRecord = db.prepare('INSERT INTO cargo_records (config_id, data) VALUES (?, ?)')
        
        for (const config of configs) {
          const fields = JSON.parse(config.fields)
          const recordCountForConfig = Math.floor(Math.random() * 30) + 20
          
          for (let i = 0; i < recordCountForConfig; i++) {
            const data: any = {}
            
            fields.forEach((field: any) => {
              if (field.type === 'text') {
                if (field.name.includes('号')) {
                  data[field.name] = `${field.name.slice(0, 2)}${String(Date.now()).slice(-8)}${i}`
                } else if (field.name.includes('城市') || field.name.includes('机场')) {
                  data[field.name] = cities[Math.floor(Math.random() * cities.length)]
                } else if (field.name.includes('公司') || field.name.includes('航空')) {
                  data[field.name] = airlines[Math.floor(Math.random() * airlines.length)]
                } else if (field.name.includes('状态')) {
                  data[field.name] = statuses[Math.floor(Math.random() * statuses.length)]
                } else {
                  data[field.name] = `示例${field.name}${i + 1}`
                }
              } else if (field.type === 'number') {
                if (field.name.includes('重量')) {
                  data[field.name] = Math.floor(Math.random() * 5000) + 100
                } else if (field.name.includes('运费') || field.name.includes('费用')) {
                  data[field.name] = Math.floor(Math.random() * 50000) + 1000
                } else if (field.name.includes('率') || field.name.includes('%')) {
                  data[field.name] = Math.floor(Math.random() * 40) + 60
                } else {
                  data[field.name] = Math.floor(Math.random() * 1000) + 1
                }
              } else if (field.type === 'date') {
                const daysAgo = Math.floor(Math.random() * 90)
                const date = new Date()
                date.setDate(date.getDate() - daysAgo)
                data[field.name] = date.toISOString().split('T')[0]
              } else if (field.type === 'select') {
                data[field.name] = statuses[Math.floor(Math.random() * statuses.length)]
              }
            })
            
            insertRecord.run(config.id, JSON.stringify(data))
            recordCount++
          }
        }
      }
      
      return {
        success: true,
        formCount,
        recordCount: includeSampleData ? recordCount : 0,
        message: includeSampleData 
          ? `成功初始化 ${formCount} 个表单配置和 ${recordCount} 条模拟数据`
          : `成功初始化 ${formCount} 个表单配置`
      }
    } catch (error) {
      console.error('Init sample data error:', error)
      throw error
    }
  })

  // 文件对话框
  ipcMain.handle('dialog-select-file', async (_event, options?: { 
    filters?: { name: string; extensions: string[] }[]; 
    multiSelections?: boolean 
  }) => {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog({
      properties: options?.multiSelections ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: options?.filters || [
        { name: 'Excel文件', extensions: ['xlsx', 'xls'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : (options?.multiSelections ? result.filePaths : result.filePaths[0])
  })

  ipcMain.handle('dialog-select-folder', async (_event) => {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Excel 导入功能
  ipcMain.handle('excel-import-file', async (_event, filePath: string, options?: { 
    importFormConfig?: boolean; 
    importData?: boolean 
  }) => {
    if (!db) {
      initDatabase()
      if (!db) {
        return { success: false, error: '数据库未初始化' }
      }
    }
    
    try {
      const XLSX = require('xlsx')
      const fs = require('fs')
      const path = require('path')
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error('文件不存在')
      }
      
      // 检查文件扩展名
      const ext = path.extname(filePath).toLowerCase()
      if (!['.xlsx', '.xls'].includes(ext)) {
        throw new Error('不支持的文件格式，请选择 .xlsx 或 .xls 文件')
      }
      
      // 获取文件名（用于自动创建表单配置）
      const fileName = path.basename(filePath)
      
      // 读取 Excel 文件
      const workbook = XLSX.readFile(filePath)
      const sheetNames = workbook.SheetNames
      
      if (sheetNames.length === 0) {
        throw new Error('Excel 文件没有工作表')
      }
      
      const results = {
        formConfigs: [] as any[],
        records: [] as any[],
        errors: [] as string[],
        autoCreatedConfigs: 0 // 自动创建的表单配置数量
      }
      
      // 先导入表单配置（如果存在）
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        
        if (data.length === 0) continue
        
        // 第一行作为表头
        const headers = data[0] as string[]
        if (!headers || headers.length === 0) continue
        
        // 判断是表单配置还是数据
        // 表单配置：第一行包含"字段名"、"类型"等关键字，或者工作表名包含"配置"、"字段"等
        const isFormConfig = sheetName.includes('配置') || 
                            sheetName.includes('字段') || 
                            headers.some((h: string) => h && (h.includes('字段名') || h.includes('类型')))
        
        if (isFormConfig && (options?.importFormConfig !== false)) {
          // 导入表单配置
          try {
            const formConfig = parseFormConfigFromExcel(data, sheetName)
            if (formConfig) {
              results.formConfigs.push(formConfig)
            }
          } catch (e: any) {
            results.errors.push(`表单配置 ${sheetName} 解析失败: ${e.message}`)
          }
        }
      }
      
      // 保存表单配置（先保存，这样数据导入时可以找到）
      if (results.formConfigs.length > 0 && db) {
        for (const config of results.formConfigs) {
          try {
            const existing = db.prepare('SELECT id FROM form_configs WHERE name = ?').get(config.name) as { id: number } | undefined
            if (existing) {
              // 更新现有配置
              db.prepare('UPDATE form_configs SET fields = ? WHERE id = ?').run(config.fields, existing.id)
            } else {
              // 创建新配置
              db.prepare('INSERT INTO form_configs (name, fields) VALUES (?, ?)').run(config.name, config.fields)
            }
          } catch (e: any) {
            results.errors.push(`保存表单配置 ${config.name} 失败: ${e.message}`)
          }
        }
      }
      
      // 再导入数据（现在可以找到对应的表单配置，或自动创建）
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        
        if (data.length === 0) continue
        
        // 第一行作为表头
        const headers = data[0] as string[]
        if (!headers || headers.length === 0) continue
        
        // 判断是表单配置还是数据
        const isFormConfig = sheetName.includes('配置') || 
                            sheetName.includes('字段') || 
                            headers.some((h: string) => h && (h.includes('字段名') || h.includes('类型')))
        
        if (!isFormConfig && (options?.importData !== false)) {
          // 导入数据
          try {
            const records = parseDataFromExcel(data, headers, sheetName, fileName)
            // 检查是否自动创建了配置
            const configName = sheetName !== 'Sheet1' ? sheetName : (fileName ? fileName.replace(/\.(xlsx|xls)$/i, '') : '导入的表单')
            const existingBefore = db?.prepare('SELECT id FROM form_configs WHERE name = ?').get(configName) as { id: number } | undefined
            if (!existingBefore && records.length > 0) {
              // 说明自动创建了配置
              results.autoCreatedConfigs++
            }
            results.records.push(...records)
          } catch (e: any) {
            results.errors.push(`数据 ${sheetName} 解析失败: ${e.message}`)
          }
        }
      }
      
      // 保存数据（注意：parseDataFromExcel 内部可能已经自动创建了表单配置）
      if (results.records.length > 0 && db) {
        const insertRecord = db.prepare('INSERT INTO cargo_records (config_id, data) VALUES (?, ?)')
        const insertMany = db.transaction((records: any[]) => {
          for (const record of records) {
            insertRecord.run(record.config_id, record.data)
          }
        })
        insertMany(results.records)
      }
      
      return {
        success: true,
        formConfigs: results.formConfigs.length + results.autoCreatedConfigs, // 包括自动创建的配置
        records: results.records.length,
        errors: results.errors,
        autoCreatedConfigs: results.autoCreatedConfigs // 新增：自动创建的配置数量
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '导入失败'
      }
    }
  })

  ipcMain.handle('excel-import-folder', async (_event, folderPath: string, options?: { 
    importFormConfig?: boolean; 
    importData?: boolean 
  }) => {
    if (!db) {
      initDatabase()
      if (!db) {
        return { success: false, error: '数据库未初始化' }
      }
    }
    
    try {
      const fs = require('fs')
      const path = require('path')
      
      if (!fs.existsSync(folderPath)) {
        throw new Error('文件夹不存在')
      }
      
      const files = fs.readdirSync(folderPath)
      const excelFiles = files.filter((file: string) => {
        const ext = path.extname(file).toLowerCase()
        return ['.xlsx', '.xls'].includes(ext)
      })
      
      if (excelFiles.length === 0) {
        return {
          success: false,
          error: '文件夹中没有 Excel 文件'
        }
      }
      
      const results = {
        totalFiles: excelFiles.length,
        successFiles: 0,
        failedFiles: [] as string[],
        totalFormConfigs: 0,
        totalRecords: 0,
        errors: [] as string[]
      }
      
      // 遍历所有 Excel 文件，直接调用导入函数
      for (const file of excelFiles) {
        const filePath = path.join(folderPath, file)
        try {
          // 直接调用导入文件的逻辑
          const XLSX = require('xlsx')
          
          if (!fs.existsSync(filePath)) continue
          
          const workbook = XLSX.readFile(filePath)
          const sheetNames = workbook.SheetNames
          
          if (sheetNames.length === 0) continue
          
          const fileResults = {
            formConfigs: [] as any[],
            records: [] as any[],
            errors: [] as string[],
            autoCreatedConfigs: 0
          }
          
          // 先导入表单配置（如果存在）
          for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName]
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
            
            if (data.length === 0) continue
            
            const headers = data[0] as string[]
            if (!headers || headers.length === 0) continue
            
            const isFormConfig = sheetName.includes('配置') || 
                                sheetName.includes('字段') || 
                                headers.some((h: string) => h && (h.includes('字段名') || h.includes('类型')))
            
            if (isFormConfig && (options?.importFormConfig !== false)) {
              try {
                const formConfig = parseFormConfigFromExcel(data, sheetName)
                if (formConfig) {
                  fileResults.formConfigs.push(formConfig)
                }
              } catch (e: any) {
                fileResults.errors.push(`表单配置 ${sheetName} 解析失败: ${e.message}`)
              }
            }
          }
          
          // 保存表单配置（先保存，这样数据导入时可以找到）
          if (fileResults.formConfigs.length > 0 && db) {
            for (const config of fileResults.formConfigs) {
              try {
                const existing = db.prepare('SELECT id FROM form_configs WHERE name = ?').get(config.name) as { id: number } | undefined
                if (existing) {
                  db.prepare('UPDATE form_configs SET fields = ? WHERE id = ?').run(config.fields, existing.id)
                } else {
                  db.prepare('INSERT INTO form_configs (name, fields) VALUES (?, ?)').run(config.name, config.fields)
                }
              } catch (e: any) {
                fileResults.errors.push(`保存表单配置 ${config.name} 失败: ${e.message}`)
              }
            }
          }
          
          // 再导入数据（现在可以找到对应的表单配置，或自动创建）
          for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName]
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
            
            if (data.length === 0) continue
            
            const headers = data[0] as string[]
            if (!headers || headers.length === 0) continue
            
            const isFormConfig = sheetName.includes('配置') || 
                                sheetName.includes('字段') || 
                                headers.some((h: string) => h && (h.includes('字段名') || h.includes('类型')))
            
            if (!isFormConfig && (options?.importData !== false)) {
              try {
                const records = parseDataFromExcel(data, headers, sheetName, file)
                // 检查是否自动创建了配置
                const configName = sheetName !== 'Sheet1' ? sheetName : (file ? file.replace(/\.(xlsx|xls)$/i, '') : '导入的表单')
                const existingBefore = db?.prepare('SELECT id FROM form_configs WHERE name = ?').get(configName) as { id: number } | undefined
                if (!existingBefore && records.length > 0) {
                  // 说明自动创建了配置
                  fileResults.autoCreatedConfigs++
                }
                fileResults.records.push(...records)
              } catch (e: any) {
                fileResults.errors.push(`数据 ${sheetName} 解析失败: ${e.message}`)
              }
            }
          }
          
          // 保存数据
          if (fileResults.records.length > 0 && db) {
            const insertRecord = db.prepare('INSERT INTO cargo_records (config_id, data) VALUES (?, ?)')
            const insertMany = db.transaction((records: any[]) => {
              for (const record of records) {
                insertRecord.run(record.config_id, record.data)
              }
            })
            insertMany(fileResults.records)
          }
          
          results.successFiles++
          results.totalFormConfigs += fileResults.formConfigs.length + fileResults.autoCreatedConfigs
          results.totalRecords += fileResults.records.length
          if (fileResults.errors.length > 0) {
            results.errors.push(...fileResults.errors.map(err => `${file}: ${err}`))
          }
        } catch (e: any) {
          results.failedFiles.push(file)
          results.errors.push(`${file}: ${e.message}`)
        }
      }
      
      return {
        success: true,
        ...results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '批量导入失败'
      }
    }
  })

  // Excel 解析辅助函数
  function parseFormConfigFromExcel(data: any[][], sheetName: string): any | null {
    if (data.length < 2) return null
    
    // 查找字段名和类型列
    const headers = data[0] as string[]
    const nameIndex = headers.findIndex((h: string) => h && (h.includes('字段名') || h.includes('字段名称')))
    const typeIndex = headers.findIndex((h: string) => h && (h.includes('类型') || h.includes('字段类型')))
    
    if (nameIndex === -1) return null
    
    const fields: any[] = []
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const fieldName = row[nameIndex]
      if (!fieldName) continue
      
      let fieldType = 'text'
      if (typeIndex !== -1 && row[typeIndex]) {
        const typeStr = String(row[typeIndex]).toLowerCase()
        if (typeStr.includes('数字') || typeStr.includes('number')) {
          fieldType = 'number'
        } else if (typeStr.includes('日期') || typeStr.includes('date')) {
          fieldType = 'date'
        } else if (typeStr.includes('选择') || typeStr.includes('select')) {
          fieldType = 'select'
        }
      }
      
      fields.push({ name: String(fieldName).trim(), type: fieldType })
    }
    
    if (fields.length === 0) return null
    
    return {
      name: sheetName,
      fields: JSON.stringify(fields)
    }
  }

  function parseDataFromExcel(data: any[][], headers: string[], sheetName: string, fileName?: string): any[] {
    if (!db) {
      throw new Error('数据库未初始化')
    }
    
    const records: any[] = []
    
    // 尝试找到对应的表单配置，按优先级查找：
    // 1. 工作表名称
    // 2. 文件名（去掉扩展名）
    let config = db.prepare('SELECT id FROM form_configs WHERE name = ?').get(sheetName) as { id: number } | undefined
    
    if (!config && fileName) {
      const fileNameWithoutExt = fileName.replace(/\.(xlsx|xls)$/i, '')
      config = db.prepare('SELECT id FROM form_configs WHERE name = ?').get(fileNameWithoutExt) as { id: number } | undefined
    }
    
    // 如果还是找不到，自动创建表单配置
    if (!config) {
      // 从表头自动创建字段配置
      const fields: any[] = []
      for (const header of headers) {
        if (!header) continue
        const fieldName = String(header).trim()
        if (!fieldName) continue
        
        // 根据字段名推测类型
        let fieldType = 'text'
        const lowerName = fieldName.toLowerCase()
        if (lowerName.includes('日期') || lowerName.includes('时间') || lowerName.includes('date') || lowerName.includes('time')) {
          fieldType = 'date'
        } else if (lowerName.includes('数量') || lowerName.includes('金额') || lowerName.includes('重量') || 
                   lowerName.includes('价格') || lowerName.includes('数量') || lowerName.includes('number') || 
                   lowerName.includes('count') || lowerName.includes('amount') || lowerName.includes('price')) {
          fieldType = 'number'
        }
        
        fields.push({ name: fieldName, type: fieldType })
      }
      
      if (fields.length > 0) {
        // 使用工作表名称或文件名作为配置名
        const configName = sheetName !== 'Sheet1' ? sheetName : (fileName ? fileName.replace(/\.(xlsx|xls)$/i, '') : '导入的表单')
        
        try {
          // 检查是否已存在同名配置
          const existing = db.prepare('SELECT id FROM form_configs WHERE name = ?').get(configName) as { id: number } | undefined
          if (existing) {
            config = existing
          } else {
            // 创建新配置
            const result = db.prepare('INSERT INTO form_configs (name, fields) VALUES (?, ?)').run(
              configName,
              JSON.stringify(fields)
            )
            config = { id: Number(result.lastInsertRowid) }
          }
        } catch (e: any) {
          throw new Error(`自动创建表单配置失败: ${e.message}`)
        }
      } else {
        throw new Error(`找不到名为 "${sheetName}" 的表单配置，且无法自动创建（没有有效字段）`)
      }
    }
    
    // 从第二行开始是数据
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const recordData: any = {}
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        if (!header) continue
        const value = row[j]
        
        if (value !== undefined && value !== null && value !== '') {
          recordData[String(header).trim()] = value
        }
      }
      
      if (Object.keys(recordData).length > 0) {
        records.push({
          config_id: config.id,
          data: JSON.stringify(recordData)
        })
      }
    }
    
    return records
  }

  ipcMain.handle('ai-generate-dashboard', async (_event, options: any) => {
    try {
      const { prompt, count, configId } = options
      console.log('开始AI生成大屏，提示词:', prompt)

      // 根据 configId 生成字段与数据概览，注入到提示词，降低幻觉
      let enrichedPrompt = prompt
      if (configId && db) {
        try {
          const cfg = db.prepare('SELECT name, fields FROM form_configs WHERE id = ?').get(configId) as any
          let fields: any[] = []
          try { fields = cfg?.fields ? JSON.parse(cfg.fields) : [] } catch { fields = [] }
          const rows = db.prepare('SELECT data FROM cargo_records WHERE config_id = ? ORDER BY created_at DESC LIMIT 200').all(configId) as any[]
          const parsed = rows.map(r => { try { return JSON.parse(r.data) } catch { return null } }).filter(Boolean)
          const lines: string[] = []
          lines.push(`表单名称: ${cfg?.name || ''}`)
          lines.push(`可用字段(${fields.length}): ${fields.map((f: any) => `${f.name}(${f.type})`).join(', ')}`)
          // 构造简要的数据分布
          const pickSamples = (name: string, type: string) => {
            const vals: any[] = []
            parsed.forEach((rec: any) => {
              if (rec.hasOwnProperty(name)) vals.push(rec[name])
            })
            if (type === 'number') {
              const nums = vals.map(v => Number(v)).filter(v => !Number.isNaN(v))
              const count = nums.length
              const min = count ? Math.min(...nums) : null
              const max = count ? Math.max(...nums) : null
              const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(2)) : null
              return `数值: 样本=${count}, 范围=[${min}~${max}], 均值=${avg}`
            } else {
              const uniq = Array.from(new Set(vals.filter(v => v !== undefined && v !== null))).slice(0, 6)
              return `示例: ${uniq.join('，')}`
            }
          }
          const sampleLines: string[] = []
          fields.slice(0, 8).forEach((f: any) => {
            sampleLines.push(`- ${f.name}(${f.type}): ${pickSamples(f.name, f.type)}`)
          })
          const guardrails = [
            '严格使用上面列出的字段名称进行描述，不得杜撰不存在的字段或维度。',
            "若无法确定字段含义，请保守描述并优先选择通用图表类型('line'|'bar'|'pie')。",
            '仅输出布局相关属性（id,type,title,x,y,w,h），不在此处输出 ECharts option。'
          ]
          enrichedPrompt = `${prompt}\n\n[表单上下文]\n${lines.join('\n')}\n字段数据样例:\n${sampleLines.join('\n')}\n\n[约束]\n${guardrails.join('\n')}`
        } catch (e) {
          // 如果上下文构建失败，继续使用原始提示词
        }
      }
      
      const result = await generateDashboardWidgets(enrichedPrompt, count || 3)
      
      // 为每个widget生成option配置
      if (result.widgets) {
        // 优先：AI 生成 SQL → 执行结果绘图；失败则回退到本地聚合
        const records = await (async () => {
          if (!db) initDatabase()
          if (!db) return []
          let sql = 'SELECT data, created_at FROM cargo_records'
          const params: any[] = []
          if (configId) {
            sql = 'SELECT data, created_at FROM cargo_records WHERE config_id = ?'
            params.push(configId)
          }
          sql += ' ORDER BY created_at DESC LIMIT 500'
          const rows = db.prepare(sql).all(params) as any[]
          return rows.map(r => ({ created_at: r.created_at, data: safeJsonParse(r.data) }))
        })()

        // 准备模式与样本键
        const schemaSummary = getDbSchemaSummary()
        const sampleKeys = getSampleJsonKeys(records)
        // 获取所有可能的字段名（包括当前configId的所有字段，如果有的话）
        let allPossibleKeys = [...sampleKeys]
        if (configId && db) {
          try {
            const cfg = db.prepare('SELECT fields FROM form_configs WHERE id = ?').get(configId) as any
            if (cfg?.fields) {
              const fields = JSON.parse(cfg.fields)
              const fieldNames = fields.map((f: any) => f.name)
              allPossibleKeys = Array.from(new Set([...allPossibleKeys, ...fieldNames]))
            }
          } catch (e) {
            // 忽略错误
          }
        }

        for (const widget of result.widgets) {
          // 在外部作用域声明SQL变量，以便catch块可以访问
          let originalSql = ''
          let enforcedSql = ''
          
          try {
            const sqlPlan = await aiGenerateSQLForWidget(widget.type, enrichedPrompt, schemaSummary, sampleKeys, configId)
            originalSql = (sqlPlan.sql || '').trim()
            // 如果AI未返回SQL，则基于样本字段构造一个安全的默认SQL
            if (!originalSql) {
              originalSql = buildDefaultSQL(widget.type, sampleKeys)
            }
            // 修复SQL：确保所有字段访问都使用json_extract，而不是直接列名（使用所有可能的字段名）
            originalSql = fixJsonExtractInSQL(originalSql, allPossibleKeys)
            enforcedSql = enforceConfigIdInSql(originalSql, configId)
            widget.sql = enforcedSql // 保存最终执行的SQL
            
            // 验证SQL可执行性
            let sqlValidation: any = { valid: false, error: null, rowCount: 0 }
            let finalSql = enforcedSql // 最终执行的SQL
            
            try {
              const testRows = executeChartSQL(finalSql)
              sqlValidation = { valid: true, error: null, rowCount: testRows?.length || 0 }
              widget.option = buildOptionFromSqlRows(widget.type, testRows)
            } catch (sqlError: any) {
              const errorMsg = sqlError.message || 'SQL执行失败'
              
              // 如果是列名错误，尝试修复并重试
              if (errorMsg.includes('no such column') || errorMsg.includes('no such table column')) {
                try {
                  // 从错误信息中提取字段名
                  const columnMatch = errorMsg.match(/no such column:\s*([^\s,]+)/i)
                  const errorColumn = columnMatch ? columnMatch[1] : null
                  
                  // 如果找到了错误字段名，添加到修复列表
                  let keysForFix = [...allPossibleKeys]
                  if (errorColumn && !keysForFix.includes(errorColumn)) {
                    keysForFix.push(errorColumn)
                  }
                  
                  // 再次修复SQL（可能字段名转义有问题）
                  const retrySql = fixJsonExtractInSQL(finalSql, keysForFix)
                  if (retrySql !== finalSql) {
                    const retryRows = executeChartSQL(retrySql)
                    sqlValidation = { valid: true, error: null, rowCount: retryRows?.length || 0 }
                    widget.option = buildOptionFromSqlRows(widget.type, retryRows)
                    finalSql = retrySql // 更新为修复后的SQL
                    widget.sql = finalSql
                  } else {
                    sqlValidation = { valid: false, error: errorMsg, rowCount: 0 }
                    throw sqlError
                  }
                } catch (retryError: any) {
                  sqlValidation = { valid: false, error: `修复后仍失败: ${retryError.message}`, rowCount: 0 }
                  throw sqlError
                }
              } else {
                sqlValidation = { valid: false, error: errorMsg, rowCount: 0 }
                throw sqlError
              }
            }
            
            // 保存调试信息
            const isDefaultSql = !sqlPlan.sql || !sqlPlan.sql.trim()
            widget.debug = {
              prompt: sqlPlan.prompt || enrichedPrompt || '（提示词生成失败）',
              originalSql: originalSql || '（无SQL）',
              enforcedSql: finalSql || '（无SQL）',
              sqlValidation: sqlValidation,
              configId: configId || null,
              isDefaultSql: isDefaultSql // 标记是否为默认生成的SQL
            }
          } catch (e) {
            // 即使失败，也保存已生成的SQL用于调试
            const errorMsg = (e as Error).message || '生成失败'
            widget.sql = null // 回退时标记无SQL
            widget.debug = {
              prompt: enrichedPrompt || '（SQL生成失败，使用默认数据聚合）',
              originalSql: originalSql || '（SQL生成失败）',
              enforcedSql: enforcedSql || widget.sql || '（SQL执行失败）',
              sqlValidation: { valid: false, error: errorMsg, rowCount: 0 },
              configId: configId || null,
              isDefaultSql: !originalSql || originalSql.includes('json_extract')
            }
            const fallback = buildOptionFromRecords(widget.type, records)
            widget.option = fallback
          }
        }
      }
      
      return {
        success: true,
        widgets: result.widgets
      }
    } catch (error: any) {
      console.error('AI生成失败:', error)
      return {
        success: false,
        message: error.message || 'AI生成失败',
        widgets: null
      }
    }
  })
}

// 生成widget的option配置
function generateWidgetOption(type: string) {
  const baseOption: any = {
    title: { text: '数据展示', left: 'center', textStyle: { color: '#fff' } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    textStyle: { color: '#fff' }
  }

  if (type === 'line') {
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月'],
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: '#fff' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: '#fff' } }
      },
      series: [{
        type: 'line',
        data: [120, 200, 150, 280, 220, 250],
        smooth: true,
        lineStyle: { color: '#409eff' },
        areaStyle: { color: 'rgba(64, 158, 255, 0.2)' }
      }]
    }
  } else if (type === 'bar') {
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: ['北京', '上海', '广州', '深圳', '成都'],
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: '#fff' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: '#fff' } }
      },
      series: [{
        type: 'bar',
        data: [100, 200, 150, 280, 220],
        itemStyle: { color: '#67c23a' }
      }]
    }
  } else {
    return {
      ...baseOption,
      series: [{
        type: 'pie',
        radius: '60%',
        data: [
          { value: 1048, name: '亚洲' },
          { value: 735, name: '欧洲' },
          { value: 580, name: '美洲' }
        ]
      }]
    }
  }
}

function safeJsonParse(str: string) {
  try { return JSON.parse(str) } catch { return {} }
}

function buildOptionFromRecords(type: string, records: { created_at: string; data: any }[]) {
  const baseOption: any = {
    title: { text: '数据展示', left: 'center', textStyle: { color: '#fff' } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    textStyle: { color: '#fff' }
  }

  if (!records || records.length === 0) {
    return generateWidgetOption(type)
  }

  if (type === 'line') {
    const daysMap: Record<string, number> = {}
    const now = new Date()
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    for (const r of records) {
      const dt = new Date(r.created_at)
      if (dt < since) continue
      const day = (r.created_at || '').toString().split('T')[0]
      const val = pickNumber(r.data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量']) || 0
      daysMap[day] = (daysMap[day] || 0) + (Number(val) || 0)
    }
    const days = Object.keys(daysMap).sort().slice(-15)
    return {
      ...baseOption,
      xAxis: { type: 'category', data: days.map(d => d.substring(5)), axisLabel: { color: '#fff' }, axisLine: { lineStyle: { color: '#fff' } } },
      yAxis: { type: 'value', axisLabel: { color: '#fff' }, axisLine: { lineStyle: { color: '#fff' } } },
      series: [{ type: 'line', data: days.map(d => Math.round(daysMap[d] || 0)), smooth: true, lineStyle: { color: '#409eff' }, areaStyle: { color: 'rgba(64, 158, 255, 0.2)' } }]
    }
  }

  if (type === 'bar') {
    const catMap: Record<string, number> = {}
    for (const r of records) {
      const cat = pickValue(r.data, ['出发城市', '出发机场', '目的城市', '目的地机场', '航线', '货物名称', '货物类型', '仓库编号']) || '未知'
      const val = pickNumber(r.data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量']) || 1
      catMap[cat] = (catMap[cat] || 0) + Number(val)
    }
    const top = Object.entries(catMap).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 6)
    return {
      ...baseOption,
      xAxis: { type: 'category', data: top.map(i => i[0]), axisLabel: { color: '#fff', rotate: -45, interval: 0 }, axisLine: { lineStyle: { color: '#fff' } } },
      yAxis: { type: 'value', axisLabel: { color: '#fff' }, axisLine: { lineStyle: { color: '#fff' } } },
      series: [{ type: 'bar', data: top.map(i => Math.round(Number(i[1]))), itemStyle: { color: '#67c23a' } }]
    }
  }

  // pie
  const dist: Record<string, number> = {}
  for (const r of records) {
    const cat = pickValue(r.data, ['货物类型', '货物名称', '货物状态', '仓库编号', '仓库管理员', '航线']) || '其他'
    const val = pickNumber(r.data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量']) || 1
    dist[cat] = (dist[cat] || 0) + Number(val)
  }
  const pieData = Object.entries(dist).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(i => ({ name: i[0], value: Math.round(Number(i[1])) }))
  return {
    ...baseOption,
    series: [{ type: 'pie', radius: '60%', data: pieData, label: { color: '#fff' } }]
  }
}

function pickNumber(data: any, keys: string[]) {
  for (const k of keys) {
    if (data && data[k] !== undefined && data[k] !== null && data[k] !== '') {
      const n = Number(data[k])
      if (!Number.isNaN(n)) return n
    }
  }
  return null
}

function pickValue(data: any, keys: string[]) {
  for (const k of keys) {
    if (data && data[k] !== undefined && data[k] !== null && data[k] !== '') {
      return data[k]
    }
  }
  return null
}

// ==== 新增：SQL 驱动的图表生成 ====
function getDbSchemaSummary() {
  // 由于结构固定，这里直接提供简要模式说明
  return `Tables:
  form_configs(id INTEGER PRIMARY KEY, name TEXT, fields TEXT(JSON), created_at DATETIME)
  cargo_records(id INTEGER PRIMARY KEY, config_id INTEGER, data TEXT(JSON), created_at DATETIME)
Notes:
  - cargo_records.data 为 JSON 文本，字段名为中文，如 "货物重量(kg)", "出发城市", "发货日期" 等。
  - 在 SQLite 中用 json_extract(data, '$."字段名"') 读取。
  - 常用数值字段：货物重量(kg)、运费(元)、提货重量(kg)、转运货物量(kg)、入库数量。
  - 常用日期字段：发货日期、起飞时间、转入日期、转出日期、配送日期、created_at。
  - 常用分类字段：出发城市、目的城市、出发机场、目的地机场、货物类型、运输状态、仓库编号。
`}

function getSampleJsonKeys(records: { created_at: string; data: any }[], limit: number = 200) {
  const freq: Record<string, number> = {}
  const sample = records.slice(0, limit)
  for (const r of sample) {
    const d = r.data || {}
    for (const k of Object.keys(d)) {
      freq[k] = (freq[k] || 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k]) => k)
}

async function aiGenerateSQLForWidget(type: string, userPrompt: string, schema: string, keys: string[], configId?: number) {
  const guide = `你是数据分析工程师。根据给定的数据库模式与样本字段，为指定图表类型生成一个SQLite查询（仅SELECT）。
要求：
1) 只返回JSON：{"sql":"..."}
2) sql 必须是单条 SELECT 语句，不得包含写操作/PRAGMA/多语句
3) 如需读取 JSON 字段，使用 json_extract(data, '$."字段名"') 并起别名，如 AS category 或 AS value
4) 如果提供了 configId=${configId ?? '无'}，请在 WHERE 中过滤 cargo_records.config_id=${configId ?? '全部'}
5) 返回列：折线/柱状 → 第一列为横轴字段(时间或分类)，第二列为数值；饼图 → 第一列为分类，第二列为数值
`;
  const prompt = `${guide}
【数据库模式】\n${schema}\n
【样本字段】${keys.join(', ')}\n
【图表类型】${type}\n【用户需求】${userPrompt || '无'}\n`

  const resp = await callDeepSeekAPI(prompt, { count: 1 })
  // 期望 resp 形如 { sql: "SELECT ..." }
  let sql = ''
  if (!resp || typeof resp !== 'object' || !resp.sql) {
    const sqlText = (typeof resp === 'string') ? resp : ''
    const extracted = (sqlText.match(/SELECT[\s\S]*$/i) || [])[0] || ''
    sql = extracted.trim()
  } else {
    sql = String(resp.sql).trim()
  }
  // 确保 prompt 始终有效
  const finalPrompt = prompt || '（提示词生成失败，但AI已返回SQL）'
  return { sql, prompt: finalPrompt }
}

function fixJsonExtractInSQL(sql: string, jsonKeys: string[]): string {
  if (!sql || !jsonKeys || jsonKeys.length === 0) return sql
  
  // 合法的数据库列名（实际存在的列）
  const validDbColumns = ['id', 'config_id', 'data', 'created_at', 'x', 'y', 'category', 'value', 'name']
  
  let fixed = sql
  
  // 对每个JSON字段名，检查是否被直接使用（作为列名而不是json_extract）
  for (const key of jsonKeys) {
    // 如果SQL中已经包含该字段的json_extract，跳过
    const jsonExtractPatterns = [
      `json_extract(data, '$."${key}"')`,
      `json_extract(data, '$."${key.replace(/"/g, '\\"')}"')`,
      `json_extract(data, '$."${key.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}"')`,
      `json_extract(data, '$."${key.replace(/\(/g, '\\u0028').replace(/\)/g, '\\u0029')}"')`
    ]
    if (jsonExtractPatterns.some(pattern => fixed.includes(pattern))) {
      continue
    }
    
    // 检查字段名是否在SQL中被直接使用（作为列名）
    // 转义特殊字符用于正则
    const escapedKey = key.replace(/[.*+?^${}|[\]\\()（）]/g, '\\$&')
    // 如果字段名包含括号或中文，使用更灵活的匹配
    const hasSpecialChars = /[()（）]/.test(key)
    const pattern = hasSpecialChars 
      ? new RegExp(escapedKey, 'gi')
      : new RegExp(`\\b${escapedKey}\\b`, 'gi')
    
    fixed = fixed.replace(pattern, (match, offset, string) => {
      // 检查是否在json_extract调用中
      const contextBefore = string.substring(Math.max(0, offset - 150), offset)
      const contextAfter = string.substring(offset, Math.min(string.length, offset + 50))
      if (contextBefore.includes('json_extract') || contextAfter.includes('json_extract')) {
        return match // 已在json_extract中，不替换
      }
      
      // 检查是否在引号内
      const before = string.substring(0, offset)
      const singleQuotes = (before.match(/'/g) || []).length
      const doubleQuotes = (before.match(/"/g) || []).length
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        return match // 在引号内，不替换
      }
      
      // 检查是否是合法的数据库列名
      if (validDbColumns.includes(match.toLowerCase())) {
        return match // 是合法的列名，不替换
      }
      
      // 检查是否在AS别名之后
      const beforeContext = string.substring(Math.max(0, offset - 30), offset).toUpperCase()
      if (beforeContext.includes(' AS ') || beforeContext.endsWith(' AS')) {
        return match // 可能是别名，不替换
      }
      
      // 检查是否在FROM/JOIN后面（可能是表名）
      const beforeContext2 = string.substring(Math.max(0, offset - 50), offset).toUpperCase()
      if (beforeContext2.includes('FROM') || beforeContext2.includes('JOIN')) {
        return match // 可能是表名，不替换
      }
      
      // 替换为json_extract（确保字段名中的引号被转义）
      const safeKey = key.replace(/"/g, '\\"')
      return `json_extract(data, '$."${safeKey}")`
    })
  }
  
  return fixed
}

function buildDefaultSQL(type: string, keys: string[]) {
  // 选取候选字段
  const pick = (names: string[]) => names.find(n => keys.includes(n))
  const num = pick(['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '入库数量']) || keys[0] || '货物重量(kg)'
  const date = pick(['起飞时间', '发货日期', '转入日期', '转出日期', '配送日期', 'created_at']) || 'created_at'
  const cat = pick(['出发机场', '目的地机场', '出发城市', '目的城市', '货物类型', '承运航空公司']) || keys[0] || '出发机场'
  
  // 不在这里添加WHERE，让enforceConfigIdInSql统一处理
  if (type === 'line') {
    return `SELECT COALESCE(json_extract(data, '$."${date}"'), substr(created_at,1,10)) AS x, 
COALESCE(CAST(json_extract(data, '$."${num}"') AS REAL), 0) AS y 
FROM cargo_records ORDER BY created_at ASC`;
  } else if (type === 'bar') {
    return `SELECT COALESCE(json_extract(data, '$."${cat}"'), '其他') AS x, 
SUM(COALESCE(CAST(json_extract(data, '$."${num}"') AS REAL), 0)) AS y 
FROM cargo_records GROUP BY x ORDER BY y DESC LIMIT 10`;
  }
  return `SELECT COALESCE(json_extract(data, '$."${cat}"'), '其他') AS x, 
SUM(COALESCE(CAST(json_extract(data, '$."${num}"') AS REAL), 0)) AS y 
FROM cargo_records GROUP BY x ORDER BY y DESC LIMIT 6`;
}

function executeChartSQL(sql: string) {
  if (!db) throw new Error('数据库未初始化')
  const sanitized = sql.trim()
  if (!/^select\s+/i.test(sanitized)) throw new Error('仅允许SELECT')
  if (/[;]{2,}/.test(sanitized) || /\b(drop|delete|update|insert|pragma|alter|attach|reindex|vacuum)\b/i.test(sanitized)) {
    throw new Error('SQL不被允许')
  }
  
  // 检查是否已有LIMIT子句，避免重复添加
  let limited: string
  const hasLimit = /\blimit\s+\d+/i.test(sanitized)
  
  if (hasLimit) {
    // 移除所有现有的LIMIT子句，然后在末尾追加LIMIT 1000
    const withoutLimit = sanitized.replace(/\s*\blimit\s+\d+/gi, '').trim()
    limited = `${withoutLimit} LIMIT 1000`
  } else {
    // 如果没有LIMIT，追加LIMIT 1000
    limited = `${sanitized} LIMIT 1000`
  }
  
  const rows = db.prepare(limited).all() as any[]
  return rows
}

function enforceConfigIdInSql(sql: string, configId?: number) {
  if (!configId || !sql || !sql.trim()) return sql
  let s = sql.trim()
  const id = Number(configId)
  
  // 如果语句中没有针对 cargo_records 的 FROM，直接返回原SQL，避免拼接非法 WHERE
  if (!/from\s+cargo_records\b/i.test(s)) {
    console.warn('SQL中未找到cargo_records表，跳过config_id过滤:', s.substring(0, 100))
    return s
  }
  
  // 尝试识别 cargo_records 的别名
  const fromMatch = s.match(/from\s+cargo_records\s+(?:as\s+)?([a-zA-Z_][\w]*)/i)
  const joinMatch = s.match(/join\s+cargo_records\s+(?:as\s+)?([a-zA-Z_][\w]*)/i)
  const alias = (fromMatch && fromMatch[1]) || (joinMatch && joinMatch[1]) || 'cargo_records'
  const cond = `${alias}.config_id = ${id}`

  // 检查是否已有config_id条件
  const hasConfigId = new RegExp(`(?:${alias}\\.)?config_id\\s*=\\s*${id}`, 'i').test(s)
  if (hasConfigId) {
    // 已有正确的config_id条件，直接返回
    return s
  }

  const whereRegex = /\bwhere\b([\s\S]*?)(\border\s+by\b|\bgroup\s+by\b|\blimit\b|$)/i
  const hasWhere = whereRegex.test(s)

  if (hasWhere) {
    // 移除旧的config_id相关条件（IS NULL等），然后添加新的
    s = s.replace(new RegExp(`(?:${alias}\\.)?config_id\\s*(=|is\\s+null|is\\s+not\\s+null)[^\n]*`, 'ig'), '')
    // 清理多余的AND/OR
    s = s.replace(/\bwhere\s+(and|or)\s+/gi, 'WHERE ')
    s = s.replace(/\s+(and|or)\s+$/gi, '')
    // 添加新的config_id条件
    s = s.replace(whereRegex, (_m, p1, p2) => {
      const whereContent = p1.trim()
      if (whereContent) {
        return `WHERE ${whereContent} AND ${cond} ${p2 || ''}`
      } else {
        return `WHERE ${cond} ${p2 || ''}`
      }
    })
  } else {
    // 插入 WHERE 条件：在 FROM cargo_records 之后、ORDER/GROUP/LIMIT 之前
    // 查找 FROM cargo_records 的位置
    const fromMatch2 = s.match(/from\s+cargo_records(?:\s+(?:as\s+)?[a-zA-Z_][\w]*)?(\s+)/i)
    if (fromMatch2) {
      // 在 FROM cargo_records 之后插入 WHERE
      const fromIndex = fromMatch2.index! + fromMatch2[0].length
      const afterFrom = s.substring(fromIndex)
      // 检查后面是否有 ORDER BY/GROUP BY/LIMIT
      const splitMatch = afterFrom.match(/^\s*(\border\s+by\b|\bgroup\s+by\b|\bwhere\b|\blimit\b)/i)
      if (splitMatch) {
        // 如果有这些关键字，在它们之前插入 WHERE
        const splitIndex = splitMatch.index!
        const beforeSplit = afterFrom.substring(0, splitIndex)
        const afterSplit = afterFrom.substring(splitIndex)
        s = s.substring(0, fromIndex) + beforeSplit + ` WHERE ${cond} ` + afterSplit.trimStart()
      } else {
        // 没有这些关键字，直接在 FROM 之后插入 WHERE
        s = s.substring(0, fromIndex) + ` WHERE ${cond}` + afterFrom
      }
    } else {
      // 如果找不到 FROM cargo_records，在末尾添加 WHERE
      s = `${s} WHERE ${cond}`
    }
  }
  return s
}

function buildOptionFromSqlRows(type: string, rows: any[]) {
  const base: any = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    textStyle: { color: '#fff' }
  }
  if (!rows || rows.length === 0) return generateWidgetOption(type)
  const cols = Object.keys(rows[0])
  if (cols.length < 2) return generateWidgetOption(type)
  const xCol = cols[0]
  const yCol = cols[1]

  if (type === 'pie') {
    return {
      ...base,
      series: [{ type: 'pie', radius: '60%', data: rows.map(r => ({ name: String(r[xCol]), value: Number(r[yCol]) || 0 })), label: { color: '#fff' } }]
    }
  }

  return {
    ...base,
    xAxis: { type: 'category', data: rows.map(r => String(r[xCol])), axisLabel: { color: '#fff', rotate: type === 'bar' ? -45 : 0 }, axisLine: { lineStyle: { color: '#fff' } } },
    yAxis: { type: 'value', axisLabel: { color: '#fff' }, axisLine: { lineStyle: { color: '#fff' } } },
    series: [{ type: type === 'line' ? 'line' : 'bar', data: rows.map(r => Number(r[yCol]) || 0), smooth: type === 'line', itemStyle: { color: type === 'bar' ? '#67c23a' : undefined }, lineStyle: { color: '#409eff' }, areaStyle: type === 'line' ? { color: 'rgba(64, 158, 255, 0.2)' } : undefined }]
  }
}
