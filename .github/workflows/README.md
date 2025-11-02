# GitHub Actions 自动构建和发布说明

## 工作流文件

`.github/workflows/release.yml` 配置了自动构建和发布流程。

## 触发方式

### 方式一：推送标签（推荐）
推送一个以 `v` 开头的标签即可触发构建和发布：

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 方式二：手动触发
在 GitHub 仓库的 Actions 页面，选择 "构建和发布" workflow，点击 "Run workflow" 按钮手动触发。

## 构建平台

工作流会在以下平台并行构建：
- Windows (x64)
- macOS (x64)
- Linux (x64) - 生成 AppImage、deb、rpm 格式

## 发布流程

1. **构建阶段**：在所有平台上编译和打包应用
2. **发布阶段**：收集所有构建产物，创建 GitHub Release 并上传文件

## 注意事项

1. **代码签名**：目前配置为跳过代码签名（`sign: false`）。如果需要代码签名：
   - Windows: 需要配置证书到 GitHub Secrets
   - macOS: 需要配置 Apple Developer 证书
   - Linux: 通常不需要签名

2. **版本号**：确保 `package.json` 中的版本号与标签匹配

3. **原生模块**：项目使用 `better-sqlite3`，会在构建时自动重建

4. **构建产物**：
   - Windows: `.exe` 安装包
   - macOS: `.dmg` 安装包
   - Linux: `.AppImage`、`.deb`、`.rpm` 安装包

## 权限要求

GitHub Actions 需要以下权限：
- `actions: write` - 上传构建产物
- `contents: write` - 创建 Release（如果推送标签触发）

这些权限在首次运行时可能需要授权。

