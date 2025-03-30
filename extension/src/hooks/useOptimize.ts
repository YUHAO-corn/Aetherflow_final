import { useState, useCallback } from 'react';
import { optimizePrompt, continueOptimize, OptimizationMode } from '../services/optimizationService';
import { generateTitleForPrompt } from '../services/prompt/actions';

export interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
  editedContent?: string;
  isEdited?: boolean;
  createdAt?: number;
  parentId?: number;
}

/**
 * 提供提示词优化相关功能的钩子
 */
export function useOptimize() {
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<OptimizationVersion[]>([]);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('standard');
  const [apiError, setApiError] = useState<string | null>(null);

  // 开始新的优化
  const startOptimize = useCallback(async (input: string, mode: OptimizationMode = optimizationMode) => {
    if (!input.trim()) return;

    // 清空之前的优化历史，开始新的优化任务
    setIsOptimizing(true);
    setApiError(null);
    setOptimizationVersions([
      { 
        id: 1, 
        content: '', 
        isLoading: true,
        createdAt: Date.now()
      }
    ]);

    try {
      // 调用API优化提示词
      const optimizedContent = await optimizePrompt(input, mode);
      
      setOptimizationVersions([
        {
          id: 1,
          content: optimizedContent,
          isLoading: false,
          isNew: true,
          createdAt: Date.now()
        }
      ]);
      
      return optimizedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '优化失败，请稍后重试';
      console.error('优化提示词失败:', error);
      setApiError(errorMessage);
      
      // 保留加载状态但显示错误
      setOptimizationVersions([
        {
          id: 1,
          content: `优化失败: ${errorMessage}`,
          isLoading: false,
          isNew: true,
          createdAt: Date.now()
        }
      ]);
      
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizationMode]);

  // 继续优化
  const continueOptimization = useCallback(async (version: OptimizationVersion, mode: OptimizationMode = optimizationMode) => {
    setIsOptimizing(true);
    setApiError(null);
    
    // 找到要继续优化的版本
    const sourceContent = version.editedContent || version.content;
    const sourceIndex = optimizationVersions.findIndex(v => v.id === version.id);
    
    // 生成新版本ID
    const newVersionId = Math.max(...optimizationVersions.map(v => v.id), 0) + 1;
    
    // 在源版本后面插入新版本
    const updatedVersions = [
      ...optimizationVersions.slice(0, sourceIndex + 1),
      { 
        id: newVersionId, 
        content: '', 
        isLoading: true,
        createdAt: Date.now(),
        parentId: version.id
      },
      ...optimizationVersions.slice(sourceIndex + 1)
    ];
    
    setOptimizationVersions(updatedVersions);

    try {
      // 调用API继续优化提示词
      const optimizedContent = await continueOptimize(sourceContent, mode);
      
      const finalVersions = [
        ...optimizationVersions.slice(0, sourceIndex + 1),
        {
          id: newVersionId,
          content: optimizedContent,
          isLoading: false,
          isNew: true,
          createdAt: Date.now(),
          parentId: version.id
        },
        ...optimizationVersions.slice(sourceIndex + 1)
      ];
      
      setOptimizationVersions(finalVersions);
      return optimizedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '优化失败，请稍后重试';
      console.error('继续优化提示词失败:', error);
      setApiError(errorMessage);
      
      // 更新为错误状态
      const errorVersions = [
        ...optimizationVersions.slice(0, sourceIndex + 1),
        {
          id: newVersionId,
          content: `优化失败: ${errorMessage}`,
          isLoading: false,
          isNew: true,
          createdAt: Date.now(),
          parentId: version.id
        },
        ...optimizationVersions.slice(sourceIndex + 1)
      ];
      
      setOptimizationVersions(errorVersions);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizationMode, optimizationVersions]);

  // 生成提示词标题
  const generateTitle = useCallback(async (content: string): Promise<string> => {
    try {
      return await generateTitleForPrompt(content);
    } catch (error) {
      console.error('生成标题失败:', error);
      // 简单截取作为标题
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
    }
  }, []);

  // 更新优化版本
  const updateVersion = useCallback((versionId: number, updates: Partial<OptimizationVersion>) => {
    setOptimizationVersions(prev => 
      prev.map(version => 
        version.id === versionId 
          ? { ...version, ...updates } 
          : version
      )
    );
  }, []);

  return {
    optimizeInput,
    setOptimizeInput,
    isOptimizing,
    optimizationVersions,
    optimizationMode,
    setOptimizationMode,
    apiError,
    startOptimize,
    continueOptimization,
    generateTitle,
    updateVersion
  };
}

export type { OptimizationMode }; 