import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerIpcHandlers, initDatabase } from './ipc-handlers'

const isDev = process.env.NODE_ENV === 'development'

// 注册IPC处理器（内部会初始化数据库）
registerIpcHandlers()

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 确保在应用就绪时初始化数据库
  try {
    initDatabase()
    console.log('应用启动时数据库初始化成功')
  } catch (error) {
    console.error('应用启动时数据库初始化失败:', error)
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

