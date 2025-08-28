import * as vscode from 'vscode';
import { scanMonorepoApps, getWorkspaceRoot } from './utils/fileUtils';
import { getLatestTagVersion, createAndPushTag, getLatestCommitId } from './utils/gitUtils';
import { selectApp, selectVersionIncrementType, confirmVersion, inputCommitMessage, selectCommitId } from './utils/uiUtils';

/**
 * 插件被激活时调用此方法
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('恭喜，您的插件 "trae-monorepo-git-tag" 已被激活！');

  // 注册命令
  const disposable = vscode.commands.registerCommand('trae-monorepo-git-tag.createTag', async () => {
    try {
      // 获取工作区根目录
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
      }

      // 扫描monorepo应用
      const apps = await scanMonorepoApps(workspaceRoot);
      
      // 让用户选择应用
      const selectedApp = await selectApp(apps);
      if (!selectedApp) {
        return; // 用户取消了操作
      }

      // 获取最新tag版本
      const latestVersion = await getLatestTagVersion(selectedApp.name, workspaceRoot);
      
      // 让用户选择版本递增类型
      const incrementType = await selectVersionIncrementType();
      if (!incrementType) {
        return; // 用户取消了操作
      }
      
      // 自动递增版本号并让用户确认或修改
      // 如果是初始版本 0.0.1，则不进行自动递增，直接让用户确认
      const newVersion = latestVersion === '0.0.1' 
        ? await vscode.window.showInputBox({
            prompt: '确认或修改版本号',
            value: latestVersion,
            validateInput: (input) => {
              if (!input.match(/^\d+\.\d+\.\d+$/)) {
                return '请输入有效的版本号 (例如: 1.0.0)';
              }
              return null;
            },
            ignoreFocusOut: true,
          })
        : await confirmVersion(latestVersion, incrementType);
      if (!newVersion) {
        return; // 用户取消了操作
      }
      
      // 获取最新commit ID
      const latestCommitId = await getLatestCommitId(workspaceRoot);
      
      // 让用户选择commit ID
      const commitId = await selectCommitId(latestCommitId, workspaceRoot);
      if (!commitId) {
        return; // 用户取消了操作
      }
      
      // 让用户输入commit信息
      const commitMessage = await inputCommitMessage();
      if (!commitMessage) {
        return; // 用户取消了操作
      }
      
      // 创建并推送tag
      const success = await createAndPushTag(
        selectedApp.name,
        newVersion,
        commitId,
        commitMessage,
        workspaceRoot
      );
      
      if (success) {
        vscode.window.showInformationMessage(
          `成功创建并推送tag: @${selectedApp.name}/${newVersion}`
        );
      } else {
        vscode.window.showErrorMessage('创建或推送tag失败');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`操作失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 将命令添加到订阅列表中，以便在插件停用时能够正确清理资源
  context.subscriptions.push(disposable);
}

/**
 * 插件被停用时调用此方法
 */
export function deactivate(): void {}