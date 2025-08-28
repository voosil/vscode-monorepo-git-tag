# Trae Monorepo Git Tag

这是一个为Trae IDE开发的插件，用于规范monorepo项目中git tag命令的使用。

## 功能

此插件提供以下功能：

- 自动扫描monorepo结构中apps目录下的所有应用
- 用户选择特定应用后，自动获取该应用的最新tag版本号并自动递增
- 使用规范的git tag命令格式：`git tag -a ${@appName/version} <commit-id> -m "${commit-msg}"`
- 自动将tag推送到远程仓库

## 使用方法

1. 安装插件后，按下 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）打开命令面板
2. 输入 "Create Standardized Git Tag" 并选择该命令
3. 按照提示选择应用、确认版本号并填写commit信息
4. 插件将自动创建标准格式的git tag并推送到远程仓库

## 开发

### 构建

```bash
npm run compile
```

### 打包

```bash
npm run package
```

### 发布到Open VSX

```bash
npm run vscode:prepublish
vsce publish --no-dependencies
```

## 许可证

MIT
