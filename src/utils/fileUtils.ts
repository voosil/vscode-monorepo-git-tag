import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 应用信息接口
 */
export interface AppInfo {
    name: string;
    path: string;
}

/**
 * 扫描monorepo结构中apps目录下的所有应用
 * @param workspaceRoot 工作区根目录
 * @returns 应用信息数组
 */
export async function scanMonorepoApps(workspaceRoot: string): Promise<AppInfo[]> {
    const appsDir = path.join(workspaceRoot, 'apps');

    // 检查apps目录是否存在
    if (!fs.existsSync(appsDir)) {
        throw new Error('找不到apps目录，请确保当前项目是monorepo结构');
    }

    const appDirs = fs
        .readdirSync(appsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const appInfos: AppInfo[] = [];

    for (const appDir of appDirs) {
        const appPath = path.join(appsDir, appDir);
        const packageJsonPath = path.join(appPath, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
            appInfos.push({
                name: appDir,
                path: appPath,
            });
        }
    }

    return appInfos;
}

/**
 * 获取工作区根目录
 * @returns 工作区根目录路径
 */
export function getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    return workspaceFolders[0].uri.fsPath;
}
