# Trae Monorepo Git Tag

这是一个为Trae IDE开发的插件，用于规范monorepo项目中git tag命令的使用。

## 功能

此插件提供以下功能：

- 自动扫描monorepo结构中apps目录下的所有应用
- 用户选择特定应用后，自动获取该应用的最新tag版本号并自动递增
- 使用规范的git tag命令格式：`git tag -a ${@appName/version} <commit-id> -m "${commit-msg}"`
- 用户可以选择是否将tag推送到远程仓库
- 支持通过配置项自动推送tag

## 使用方法

1. 安装插件后，按下 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）打开命令面板
2. 输入 "Monorepo Git Tag" 并选择该命令
3. 按照提示选择应用、确认版本号并填写commit信息
4. 选择是否将tag推送到远程仓库
5. 插件将创建标准格式的git tag，并根据您的选择决定是否推送到远程仓库

## 配置项

插件提供以下配置项：

- `monorepo-git-tag.autoPush`: 设置为 `true` 时，创建tag后将自动推送到远程仓库，无需用户确认；设置为 `false` 时（默认值），将询问用户是否推送

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
