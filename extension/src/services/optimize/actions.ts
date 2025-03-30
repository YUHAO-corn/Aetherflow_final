/**
 * @deprecated 此服务已废弃，请使用 src/services/optimizationService.ts 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import { OptimizationVersion, OptimizeOptions } from './types';
import { sendMessage } from '../messaging';

// 默认优化选项
const DEFAULT_OPTIONS: OptimizeOptions = {
  mode: 'standard',
  temperature: 0.7,
  maxTokens: 1024
};

/**
 * 优化提示词
 */
export async function optimizePrompt(
  content: string, 
  options: OptimizeOptions = DEFAULT_OPTIONS
): Promise<OptimizationVersion> {
  try {
    // 如果在生产环境，通过消息系统发送到后台处理
    const response = await sendMessage({
      type: 'OPTIMIZE_PROMPT',
      payload: { content, options }
    });

    if (response && typeof response === 'object' && 'optimized' in response) {
      return {
        id: Date.now(),
        content: response.optimized as string,
        createdAt: Date.now()
      };
    }

    throw new Error('优化请求返回了无效的响应格式');
  } catch (error) {
    console.error('Prompt optimization failed:', error);
    
    // 如果API调用失败，返回一个模拟的优化结果
    // 在真实应用中应该显示错误
    return {
      id: Date.now(),
      content: content + ' [优化版本 - 模拟]',
      createdAt: Date.now()
    };
  }
}

/**
 * 将优化历史保存到本地存储
 */
export async function saveOptimizationHistory(versions: OptimizationVersion[]): Promise<boolean> {
  try {
    // 这里需要实现存储逻辑
    // 可以使用localStorage或chrome.storage
    return true;
  } catch (error) {
    console.error('Failed to save optimization history:', error);
    return false;
  }
} 