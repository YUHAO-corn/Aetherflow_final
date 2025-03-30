/**
 * 优化服务
 * 提供提示词优化相关的业务功能
 */

import { optimizePrompt, continueOptimize, OptimizationMode } from '../optimizationService';
export type { OptimizationMode } from '../optimizationService';
import { OptimizationVersion, OptimizationError } from './types';
export type { OptimizationVersion, OptimizationError } from './types';
import { generateTitleForPrompt } from '../prompt/actions';

// 导出版本管理服务的所有功能
export * from './versionManager';

/**
 * 处理优化版本列表
 * @param versions 当前版本列表
 * @param version 要继续优化的版本
 * @returns 插入了加载中版本的新列表
 */
export function createNextVersionInList(versions: OptimizationVersion[], version: OptimizationVersion): {
  updatedVersions: OptimizationVersion[],
  newVersionId: number,
  sourceIndex: number
} {
  // 找到要继续优化的版本的索引
  const sourceIndex = versions.findIndex(v => v.id === version.id);
  
  // 生成新版本ID
  const newVersionId = Math.max(...versions.map(v => v.id), 0) + 1;
  
  // 在源版本后面插入新版本
  const updatedVersions = [
    ...versions.slice(0, sourceIndex + 1),
    { 
      id: newVersionId, 
      content: '', 
      isLoading: true,
      createdAt: Date.now(),
      parentId: version.id
    },
    ...versions.slice(sourceIndex + 1)
  ];
  
  return {
    updatedVersions,
    newVersionId,
    sourceIndex
  };
}

/**
 * 生成提示词标题
 * @param content 提示词内容
 * @returns 生成的标题
 */
export async function generateOptimizationTitle(content: string): Promise<string> {
  try {
    return await generateTitleForPrompt(content);
  } catch (error) {
    console.error('生成标题失败:', error);
    // 简单截取作为标题
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  }
}

/**
 * 创建错误版本对象
 * @param id 版本ID
 * @param errorMessage 错误消息
 * @param parentId 父版本ID
 * @returns 错误版本对象
 */
export function createErrorVersion(id: number, errorMessage: string, parentId?: number): OptimizationVersion {
  return {
    id,
    content: `优化失败: ${errorMessage}`,
    isLoading: false,
    isNew: true,
    createdAt: Date.now(),
    parentId
  };
}

// 导出服务层的API调用函数，保持对外接口一致性
export { optimizePrompt, continueOptimize }; 