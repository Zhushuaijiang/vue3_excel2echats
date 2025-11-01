# DeepSeek API 配置指南

## 📝 配置 DeepSeek API

### 步骤 1：获取 API 密钥

1. 访问 [DeepSeek 官网](https://www.deepseek.com/)
2. 注册账号并登录
3. 进入控制台创建 API Key
4. 复制您的 API Key

### 步骤 2：配置 API Key

打开文件：`electron/config.json`

```json
{
  "ai": {
    "provider": "deepseek",
    "apiKey": "sk-your-deepseek-api-key-here",
    "baseUrl": "https://api.deepseek.com",
    "model": "deepseek-chat",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

将 `apiKey` 替换为您的实际 API Key。

### 步骤 3：重启应用

配置完成后需要重启应用才能生效：

```bash
# 停止当前运行的进程（Ctrl+C）
# 然后重新启动
npm run dev
```

## 🔧 配置参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| provider | AI服务提供商 | deepseek |
| apiKey | API密钥（必填） | - |
| baseUrl | API基础URL | https://api.deepseek.com |
| model | 使用的模型 | deepseek-chat |
| temperature | 生成温度 (0-2) | 0.7 |
| maxTokens | 最大token数 | 2000 |

## ✅ 验证配置

1. 打开应用
2. 进入"大屏展示"页面
3. 点击"AI生成"按钮
4. 选择一个AI模板
5. 输入需求描述
6. 点击"生成"

如果配置正确，AI将自动生成大屏布局配置。

## ⚠️ 常见问题

### API 密钥未配置

**错误信息**：`API密钥未配置，请在 electron/config.json 中设置 apiKey`

**解决方案**：
1. 检查 `electron/config.json` 文件是否存在
2. 确认 `apiKey` 字段已正确设置
3. 重启应用

### API 调用失败

**错误信息**：`API调用失败: 401 - Unauthorized`

**解决方案**：
1. 检查 API Key 是否正确
2. 确认 API Key 还有余额
3. 检查网络连接

### API Key 权限不足

**错误信息**：`API调用失败: 403 - Forbidden`

**解决方案**：
1. 登录 DeepSeek 控制台
2. 检查 API Key 权限
3. 确认已启用对应服务

## 🔒 安全建议

### ⚠️ 重要提示

**不要**将包含真实 API Key 的 `config.json` 文件提交到 Git 仓库！

### 保护您的 API Key

1. 将 `electron/config.json` 添加到 `.gitignore`
2. 使用环境变量存储 API Key
3. 定期更换 API Key
4. 限制 API Key 的使用范围

### 添加到 .gitignore

```bash
# electron/config.json 文件
electron/config.json
```

## 📚 更多信息

- [DeepSeek 官方文档](https://api-docs.deepseek.com/)
- [DeepSeek API 定价](https://www.deepseek.com/pricing)
- [本项目的 README](./README.md)

## 🆘 需要帮助？

如果遇到问题：

1. 检查配置文件格式是否正确（JSON格式）
2. 确认 API Key 有效性
3. 查看控制台日志获取详细错误信息
4. 联系技术支持

---

**配置完成后，您就可以使用 AI 功能自动生成大屏布局了！** 🎉

