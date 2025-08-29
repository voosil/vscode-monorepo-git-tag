import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * 检查当前工作目录是否为git仓库
 * @param workspaceRoot 工作区根目录
 * @returns 是否为git仓库
 */
async function isGitRepository(workspaceRoot: string): Promise<boolean> {
  try {
    // 检查.git目录是否存在
    const gitDir = path.join(workspaceRoot, '.git');
    if (fs.existsSync(gitDir)) {
      return true;
    }

    // 尝试执行git命令
    await execAsync('git rev-parse --is-inside-work-tree', {
      cwd: workspaceRoot,
    });
    return true;
  } catch (error) {
    return false;
  }
}

function isValidVersion(version: string, appName: string) {
  return new RegExp(`^@${appName}/\\d+\\.\\d+\\.\\d+$`).test(version);
}

/**
 * 获取指定应用的最新tag版本
 * @param appName 应用名称
 * @param workspaceRoot 工作区根目录
 * @returns 最新版本号
 */
export async function getLatestTagVersion(
  appName: string,
  workspaceRoot: string,
): Promise<string> {
  try {
    // 检查是否为git仓库
    const isGitRepo = await isGitRepository(workspaceRoot);
    if (!isGitRepo) {
      vscode.window.showErrorMessage('当前目录不是git仓库，无法获取tag版本');
      return '0.0.0';
    }

    // 获取所有与该应用相关的tag
    const { stdout: localTags } = await execAsync(
      `git tag --list "@${appName}/*"`,
      {
        cwd: workspaceRoot,
      },
    );

    // 显示进度提示，告知用户正在拉取远程标签
    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: `正在拉取远程标签`,
      cancellable: false,
    };

    // 使用vscode的进度API显示提示
    const { stdout: remoteTags } = await vscode.window.withProgress(
      progressOptions,
      async (progress) => {
        progress.report({
          message: `正在从远程仓库获取 @${appName} 的标签信息...`,
        });

        // 执行获取远程标签的命令
        return await execAsync(
          `git ls-remote --tags origin --list "@${appName}/*" | awk '{print $2}' | sed 's|refs/tags/||'`,
          {
            cwd: workspaceRoot,
          },
        );
      },
    );

    // 合并本地和远程tag
    const allTags = Array.from(
      new Set(
        [
          ...localTags.trim().split('\n'),
          ...remoteTags.trim().split('\n'),
        ].filter((tag) => isValidVersion(tag, appName)),
      ),
    );

    // 输出调试信息
    console.log(`获取到的tag列表: \n${allTags.join('\n')}`);

    if (!allTags.length) {
      return '0.0.0'; // 如果没有找到任何tag，返回初始版本0.0.0
    }

    // 解析版本号并找出最新的版本
    const versions = allTags
      .filter((tag) => tag.trim())
      .map((tag) => {
        console.log(`处理tag: ${tag}`);
        // 使用更宽松的正则表达式匹配版本号
        const match = tag.match(new RegExp(`@${appName}/(.*)`));
        if (match) {
          console.log(`匹配到版本号: ${match[1]}`);
          return match[1];
        }
        return null;
      })
      .filter((version): version is string => version !== null);

    console.log(`解析出的版本号列表: ${versions.join(', ')}`);

    if (versions.length === 0) {
      return '0.0.0';
    }

    // 按版本号排序，获取最新版本（降序排列，最高版本在前）
    versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      // 先比较主版本号
      if (aParts[0] !== bParts[0]) {
        return bParts[0] - aParts[0]; // 降序排列
      }

      // 再比较次版本号
      if (aParts[1] !== bParts[1]) {
        return bParts[1] - aParts[1]; // 降序排列
      }

      // 最后比较修订版本号
      return bParts[2] - aParts[2]; // 降序排列
    });

    console.log(`排序后的版本号列表: ${versions.join(', ')}`);
    console.log(`选择的最新版本: ${versions[0]}`);

    return versions[0];
  } catch (error) {
    console.error('获取最新tag版本失败:', error);
    return '0.0.0';
  }
}

/**
 * 递增版本号
 * @param version 当前版本号
 * @param type 递增类型：'major', 'minor', 'patch'
 * @returns 递增后的版本号
 */
export function incrementVersion(
  version: string,
  type: 'major' | 'minor' | 'patch' = 'patch',
): string {
  const parts = version.split('.').map(Number);

  if (parts.length !== 3) {
    throw new Error(`无效的版本号格式: ${version}`);
  }

  switch (type) {
    case 'major':
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1] += 1;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2] += 1;
      break;
  }

  return parts.join('.');
}

/**
 * 创建git tag
 * @param appName 应用名称
 * @param version 版本号
 * @param commitId commit ID
 * @param message 提交信息
 * @param workspaceRoot 工作区根目录
 * @returns 是否成功
 */
export async function createTag(
  appName: string,
  version: string,
  commitId: string,
  message: string,
  workspaceRoot: string,
): Promise<boolean> {
  try {
    // 检查是否为git仓库
    const isGitRepo = await isGitRepository(workspaceRoot);
    if (!isGitRepo) {
      vscode.window.showErrorMessage('当前目录不是git仓库，无法创建tag');
      return false;
    }

    const tagName = `@${appName}/${version}`;

    // 创建tag
    await execAsync(`git tag -a ${tagName} ${commitId} -m "${message}"`, {
      cwd: workspaceRoot,
    });

    return true;
  } catch (error) {
    console.error('创建tag失败:', error);
    return false;
  }
}

/**
 * 推送git tag到远程
 * @param appName 应用名称
 * @param version 版本号
 * @param workspaceRoot 工作区根目录
 * @returns 推送结果信息
 */
export async function pushTag(
  appName: string,
  version: string,
  workspaceRoot: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const tagName = `@${appName}/${version}`;

    // 推送tag到远程
    const { stdout } = await execAsync(`git push origin ${tagName}`, {
      cwd: workspaceRoot,
    });

    return {
      success: true,
      message: stdout || '推送成功',
    };
  } catch (error) {
    console.error('推送tag失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 创建并推送git tag (保留此函数以兼容现有代码)
 * @param appName 应用名称
 * @param version 版本号
 * @param commitId commit ID
 * @param message 提交信息
 * @param workspaceRoot 工作区根目录
 * @returns 是否成功
 * @deprecated 推荐使用单独的createTag和pushTag函数，以便在创建前确认用户意图
 */
export async function createAndPushTag(
  appName: string,
  version: string,
  commitId: string,
  message: string,
  workspaceRoot: string,
): Promise<boolean> {
  try {
    // 创建tag
    const createSuccess = await createTag(
      appName,
      version,
      commitId,
      message,
      workspaceRoot,
    );
    if (!createSuccess) {
      return false;
    }

    // 推送tag到远程
    const pushResult = await pushTag(appName, version, workspaceRoot);

    return pushResult.success;
  } catch (error) {
    console.error('创建或推送tag失败:', error);
    return false;
  }
}

/**
 * 获取最近的commit ID
 * @param workspaceRoot 工作区根目录
 * @returns 最近的commit ID
 */
export async function getLatestCommitId(
  workspaceRoot: string,
): Promise<string> {
  try {
    // 检查是否为git仓库
    const isGitRepo = await isGitRepository(workspaceRoot);
    if (!isGitRepo) {
      vscode.window.showErrorMessage('当前目录不是git仓库，无法获取commit ID');
      throw new Error('当前目录不是git仓库');
    }

    const { stdout } = await execAsync('git rev-parse HEAD', {
      cwd: workspaceRoot,
    });
    return stdout.trim();
  } catch (error) {
    console.error('获取最近的commit ID失败:', error);
    throw error;
  }
}

/**
 * Commit信息接口
 */
export interface CommitInfo {
  id: string;
  shortId: string;
  scope: string;
  message: string;
  fullMessage: string;
}

/**
 * 获取最近的多个commit信息
 * @param workspaceRoot 工作区根目录
 * @param count 获取的commit数量
 * @returns commit信息列表
 */
export async function getRecentCommits(
  workspaceRoot: string,
  count: number = 15,
): Promise<CommitInfo[]> {
  try {
    // 检查是否为git仓库
    const isGitRepo = await isGitRepository(workspaceRoot);
    if (!isGitRepo) {
      vscode.window.showErrorMessage('当前目录不是git仓库，无法获取commit信息');
      throw new Error('当前目录不是git仓库');
    }

    // 获取最近的commit信息，包括commit id、提交信息等
    const { stdout } = await execAsync(
      `git log -${count} --pretty=format:"%H||%h||%s"`,
      { cwd: workspaceRoot },
    );

    if (!stdout.trim()) {
      return [];
    }

    // 解析commit信息
    return stdout.split('\n').map((line) => {
      const [id, shortId, fullMessage] = line.split('||');

      // 尝试提取scope，格式可能是 "feat(scope): message" 或 "fix(scope): message"
      let scope = '';
      let message = fullMessage;

      const scopeMatch = fullMessage.match(/^[a-z]+\(([^)]+)\):\s*(.+)$/);
      if (scopeMatch) {
        scope = scopeMatch[1];
        message = scopeMatch[2];
      }

      return {
        id,
        shortId,
        scope,
        message,
        fullMessage,
      };
    });
  } catch (error) {
    console.error('获取最近的commit信息失败:', error);
    return [];
  }
}
