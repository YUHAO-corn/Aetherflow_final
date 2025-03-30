/**
 * @deprecated 此服务已废弃，请使用 src/services/optimizationService.ts 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import { OptimizationVersion, OptimizeOptions } from './types';
import { optimizePrompt, saveOptimizationHistory } from './actions';

// 导出类型
export type { OptimizationVersion, OptimizeOptions };

// 导出接口函数
export { optimizePrompt, saveOptimizationHistory }; 