const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function installElectron() {
  console.log('⚙️ 配置 Electron 安装...')
  
  try {
    // 设置镜像源
    console.log('📦 设置镜像源...')
    await execAsync('npm config set electron_mirror https://npmmirror.com/mirrors/electron/')
    await execAsync('npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/')
    console.log('✅ 镜像源配置完成')
    
    // 安装 Electron 依赖
    console.log('📥 安装 Electron...')
    await execAsync('npm install electron --save-dev')
    console.log('✅ Electron 安装完成')
    
    // 安装 electron-builder
    console.log('🔨 安装 electron-builder...')
    await execAsync('npm install electron-builder --save-dev')
    console.log('✅ electron-builder 安装完成')
    
    // 安装应用依赖
    console.log('📦 安装应用依赖...')
    await execAsync('npm install')
    console.log('✅ 所有依赖安装完成')
    
  } catch (error) {
    console.error('❌ 安装失败:', error.message)
    console.log('💡 提示：请检查网络连接或手动配置镜像源')
  }
}

installElectron().catch(console.error)
