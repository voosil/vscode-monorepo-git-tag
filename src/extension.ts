import * as vscode from 'vscode';
import { scanMonorepoApps, getWorkspaceRoot } from './utils/fileUtils';
import {
  getLatestTagVersion,
  createTag,
  pushTag,
  getLatestCommitId,
} from './utils/gitUtils';
import {
  selectApp,
  selectVersionIncrementType,
  confirmVersion,
  inputCommitMessage,
  selectCommitId,
  confirmPushTag,
} from './utils/uiUtils';

/**
 * 插件被激活时调用此方法
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('插件 "monorepo-git-tag" 已激活');

  // 注册命令
  const disposable = vscode.commands.registerCommand(
    'monorepo-git-tag.createTag',
    async () => {
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
        const latestVersion = await getLatestTagVersion(
          selectedApp.name,
          workspaceRoot,
        );

        // 让用户选择版本递增类型
        const incrementType = await selectVersionIncrementType();
        if (!incrementType) {
          return; // 用户取消了操作
        }

        // 自动递增版本号并让用户确认或修改
        const newVersion = await confirmVersion(latestVersion, incrementType);
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

        // 获取配置项
        const config = vscode.workspace.getConfiguration('monorepo-git-tag');
        const autoPush = config.get<boolean>('autoPush', false);

        // 根据配置决定是否询问用户
        let shouldPush: boolean | undefined = autoPush;

        // 如果不是自动推送，则询问用户
        if (!autoPush) {
          shouldPush = await confirmPushTag();

          if (shouldPush === undefined) {
            return; // 用户取消了操作
          }
        }

        // 在用户确认后创建tag
        const createSuccess = await createTag(
          selectedApp.name,
          newVersion,
          commitId,
          commitMessage,
          workspaceRoot,
        );

        if (!createSuccess) {
          vscode.window.showErrorMessage('创建tag失败');
          return;
        }

        // 显示创建成功信息
        vscode.window.showInformationMessage(
          `成功创建tag: @${selectedApp.name}/${newVersion}`,
        );

        // 如果用户选择了推送，则推送tag
        if (shouldPush) {
          // 用户选择推送tag
          const pushResult = await pushTag(
            selectedApp.name,
            newVersion,
            workspaceRoot,
          );

          if (pushResult.success) {
            vscode.window
              .showInformationMessage(
                `成功推送tag到远程服务器: @${selectedApp.name}/${newVersion}`,
                '详细信息',
              )
              .then((selection) => {
                if (selection === '详细信息') {
                  // 显示详细信息
                  const detailMessage =
                    pushResult.message || '推送成功，无详细信息';
                  vscode.window.showInformationMessage(detailMessage, {
                    modal: true,
                  });
                }
              });
          } else {
            vscode.window
              .showErrorMessage(
                `推送tag失败: ${pushResult.message}`,
                '详细信息',
              )
              .then((selection) => {
                if (selection === '详细信息') {
                  // 显示详细信息
                  const detailMessage = pushResult.message || '未知错误';
                  vscode.window.showErrorMessage(detailMessage, {
                    modal: true,
                  });
                }
              });
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `操作失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // 将命令添加到订阅列表中，以便在插件停用时能够正确清理资源
  context.subscriptions.push(disposable);
}

/**
 * 插件被停用时调用此方法
 */
export function deactivate(): void {}
