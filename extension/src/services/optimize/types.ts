/**
 * @deprecated 此服务已废弃，请使用 src/services/optimizationService.ts 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

export interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
  createdAt?: number;
  parentId?: number;
  editedContent?: string;
  isEdited?: boolean;
  position?: number;
}

export interface OptimizeOptions {
  mode?: 'standard' | 'creative' | 'concise';
  temperature?: number;
  maxTokens?: number;
} 