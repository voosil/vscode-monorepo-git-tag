import * as vscode from 'vscode';
import { AppInfo } from './fileUtils';
import { incrementVersion } from './gitUtils';

/**
 * 让用户选择一个应用
 * @param apps 应用列表
 * @returns 选择的应用或undefined（如果用户取消）
 */
export async function selectApp(apps: AppInfo[]): Promise<AppInfo | undefined> {
  if (apps.length === 0) {
    vscode.window.showErrorMessage('没有找到任何应用');
    return undefined;
  }

  const appItems = apps.map((app) => ({
    label: app.name,
    app,
  }));

  const selected = await vscode.window.showQuickPick(appItems, {
    placeHolder: '选择要创建tag的应用',
    ignoreFocusOut: true,
  });

  return selected?.app;
}

/**
 * 让用户选择版本递增类型
 * @returns 选择的递增类型或undefined（如果用户取消）
 */
export async function selectVersionIncrementType(): Promise<
  'major' | 'minor' | 'patch' | undefined
> {
  const options = [
    { label: 'major', description: '主版本更新 (x.0.0)' },
    { label: 'minor', description: '次版本更新 (0.x.0)' },
    { label: 'patch', description: '补丁版本更新 (0.0.x)' },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: '选择版本更新类型',
    ignoreFocusOut: true,
  });

  return selected?.label as 'major' | 'minor' | 'patch' | undefined;
}

/**
 * 让用户确认或修改版本号
 * @param currentVersion 当前版本号
 * @param incrementType 递增类型
 * @returns 确认的版本号或undefined（如果用户取消）
 */
export async function confirmVersion(
  currentVersion: string,
  incrementType: 'major' | 'minor' | 'patch',
): Promise<string | undefined> {
  const suggestedVersion = incrementVersion(currentVersion, incrementType);

  const version = await vscode.window.showInputBox({
    prompt: '确认或修改版本号',
    value: suggestedVersion,
    validateInput: (input) => {
      if (!input.match(/^\d+\.\d+\.\d+$/)) {
        return '请输入有效的版本号 (例如: 1.0.0)';
      }
      return null;
    },
    ignoreFocusOut: true,
  });

  return version;
}

/**
 * 让用户输入commit信息
 * @returns commit信息或undefined（如果用户取消）
 */
export async function inputCommitMessage(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: '输入tag的commit信息',
    placeHolder: '例如: 发布v1.0.0版本',
    validateInput: (input) => {
      if (!input.trim()) {
        return '请输入commit信息';
      }
      return null;
    },
    ignoreFocusOut: true,
  });
}

// 配置项：显示的最近commit数量
export const RECENT_COMMITS_COUNT = 15;

/**
 * 让用户选择commit ID
 * @param _defaultCommitId 默认的commit ID（最新commit）- 为了兼容性保留但不使用
 * @param workspaceRoot 工作区根目录
 * @returns 选择的commit ID或undefined（如果用户取消）
 */
export async function selectCommitId(
  _defaultCommitId: string,
  workspaceRoot: string,
): Promise<string | undefined> {
  // 导入 gitUtils 模块
  const gitUtils = await import('./gitUtils.js');

  // 获取最近的commit列表
  const recentCommits = await gitUtils.getRecentCommits(
    workspaceRoot,
    RECENT_COMMITS_COUNT,
  );

  // 定义QuickPickItem接口，与vscode.QuickPickItem兼容
  interface CommitQuickPickItem extends vscode.QuickPickItem {
    // detail: string;
    commitId: string;
  }

  // 构建选项列表
  const options: CommitQuickPickItem[] = recentCommits.map((commit) => {
    // 构建显示文本，处理过长内容
    const scopeText = commit.scope ? `(${commit.scope})` : '';
    const messageText = commit.message;

    // 限制描述长度，过长则添加省略号
    const maxDescLength = 50;
    let description = `${scopeText ? scopeText + ': ' : ''}${messageText}`;
    if (description.length > maxDescLength) {
      description = description.substring(0, maxDescLength - 3) + '...';
    }

    return {
      label: commit.shortId,
      description,
      // detail: commit.id,
      commitId: commit.id,
    };
  });

  // 添加自定义commit ID选项
  options.push({
    label: '自定义commit ID',
    description: '手动输入commit ID',
    detail: '',
    commitId: '',
  });

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: '选择要标记的commit',
    ignoreFocusOut: true,
  });

  if (!selected) {
    return undefined;
  }

  if (selected.label === '自定义commit ID') {
    return vscode.window.showInputBox({
      prompt: '输入commit ID',
      validateInput: (input) => {
        if (!input.trim()) {
          return '请输入有效的commit ID';
        }
        return null;
      },
      ignoreFocusOut: true,
    });
  }

  return selected.commitId;
}

/**
 * 让用户选择是否推送tag到远程服务器
 * @returns 用户选择结果：true表示推送，false表示不推送，undefined表示取消操作
 */
export async function confirmPushTag(): Promise<boolean | undefined> {
  const options = [
    { label: '是', description: '推送tag到远程服务器' },
    { label: '否', description: '仅在本地创建tag，不推送到远程' },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: '是否将tag推送到远程服务器？',
    ignoreFocusOut: true,
  });

  if (!selected) {
    return undefined; // 用户取消了操作
  }

  return selected.label === '是';
}
