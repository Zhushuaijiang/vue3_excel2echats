const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const path = require('path')

async function rebuildNative() {
  console.log('🔄 重建原生模块...')
  
  // 获取 Electron 的路径
  const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
  const electronExePath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
  
  try {
    // 使用 electron-rebuild 重建 better-sqlite3
    console.log('使用 electron-rebuild 重建模块...')
    const { stdout, stderr } = await execAsync(`npx electron-rebuild -f -w better-sqlite3`)
    if (stderr && !stderr.includes('WARN')) {
      console.error('重建警告:', stderr)
    }
    console.log('✅ 原生模块重建完成')
  } catch (error) {
    console.log('⚠️ electron-rebuild 不可用，尝试使用 npx electron-rebuild...')
    try {
      const { stdout, stderr } = await execAsync(`npx -y electron-rebuild -f -w better-sqlite3`)
      console.log('✅ 原生模块重建完成')
    } catch (npxError) {
      console.log('⚠️ electron-rebuild 不可用，尝试手动编译...')
      try {
        // 设置 Electron 路径并重建
        const electronBin = require('electron')
        process.env.npm_config_build_from_source = 'true'
        const { stdout, stderr } = await execAsync('npm rebuild better-sqlite3')
        if (stderr && !stderr.includes('WARN')) {
          console.error('重建警告:', stderr)
        }
        console.log('✅ 原生模块重建完成')
      } catch (manualError) {
        console.log('⚠️ 手动重建失败，尝试重新安装...')
        try {
          await execAsync('npm install better-sqlite3 --force')
          console.log('✅ 重新安装完成')
        } catch (installError) {
          console.error('❌ 重新安装失败:', installError.message)
          console.log('💡 提示：请安装 electron-rebuild: npm install electron-rebuild -D')
          console.log('💡 然后运行: npx electron-rebuild')
        }
      }
    }
  }
}

rebuildNative().catch(console.error)
