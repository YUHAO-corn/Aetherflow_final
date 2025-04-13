/**
 * 优化服务
 * 提供提示词优化相关的业务功能
 */

import { optimizePrompt, continueOptimize, OptimizationMode } from '../optimizationService';
export type { OptimizationMode } from '../optimizationService';
import { OptimizationVersion, OptimizationError } from './types';
export type { OptimizationVersion, OptimizationError } from './types';
import { generateTitleForPrompt } from '../prompt/actions';
import { paymentService } from "../payment";
import { QuotaExceededError, QuotaType } from "../payment/types";

// 导出版本管理服务的所有功能
export * from './versionManager';

/**
 * 在执行优化前检查配额
 * 如果超出配额，将抛出错误
 */
export async function checkQuotaBeforeOptimize(): Promise<void> {
  try {
    // 检查优化配额
    const quotaInfo = await paymentService.checkOptimizeQuota();
    
    // 如果配额已达上限，抛出错误
    if (quotaInfo.isLimitReached) {
      throw new QuotaExceededError(
        `每日优化次数已达上限 (${quotaInfo.currentCount}/${quotaInfo.limit})，请明天再试或升级会员`,
        QuotaType.OPTIMIZE,
        quotaInfo.currentCount,
        quotaInfo.limit
      );
    }
  } catch (error) {
    console.error('[Optimization] 检查优化配额失败:', error);
    throw error; // 重新抛出错误以便上层处理
  }
}

/**
 * 在优化完成后记录使用
 */
export async function recordOptimizeUsage(): Promise<void> {
  try {
    await paymentService.recordOptimizeUsage();
  } catch (error) {
    console.error('[Optimization] 记录优化使用失败:', error);
    // 记录失败不应阻止优化功能的完成
  }
}

/**
 * 获取当前优化配额状态
 */
export async function getOptimizeQuotaStatus(): Promise<{
  used: number;
  limit: number;
  resetsIn: number;
  isPremium: boolean;
}> {
  const quotaInfo = await paymentService.checkOptimizeQuota();
  
  return {
    used: quotaInfo.currentCount,
    limit: quotaInfo.limit,
    resetsIn: quotaInfo.resetsAt ? quotaInfo.resetsAt - Date.now() : 0,
    isPremium: quotaInfo.isPremium
  };
}

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
    // 简单截取作为标题，不添加省略号
    return content.length > 30 ? content.substring(0, 30) : content;
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