import { useState, useCallback } from 'react';
import { 
  optimizePrompt, 
  continueOptimize, 
  OptimizationMode,
  OptimizationVersion,
  createNextVersionInList,
  createErrorVersion,
  generateOptimizationTitle,
  createInitialLoadingVersion,
  createSuccessVersion,
  createContinuedVersion,
  updateVersionInList
} from '../services/optimization';

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
    
    // 使用服务层函数创建初始加载版本
    setOptimizationVersions([
      createInitialLoadingVersion()
    ]);

    try {
      // 调用API优化提示词
      const optimizedContent = await optimizePrompt(input, mode);
      
      // 使用服务层函数创建成功版本
      setOptimizationVersions([
        createSuccessVersion(optimizedContent)
      ]);
      
      return optimizedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '优化失败，请稍后重试';
      console.error('优化提示词失败:', error);
      setApiError(errorMessage);
      
      // 使用服务层函数创建错误版本
      setOptimizationVersions([
        createErrorVersion(1, errorMessage)
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
    
    // 使用服务层函数处理版本列表
    const { updatedVersions, newVersionId, sourceIndex } = createNextVersionInList(
      optimizationVersions,
      version
    );
    
    setOptimizationVersions(updatedVersions);

    try {
      // 获取源内容
      const sourceContent = version.editedContent || version.content;
      
      // 调用API继续优化提示词
      const optimizedContent = await continueOptimize(sourceContent, mode);
      
      // 使用服务层函数创建继续优化版本并更新列表
      const continuedVersion = createContinuedVersion(optimizedContent, version.id, newVersionId);
      setOptimizationVersions(prev => [
        ...prev.slice(0, sourceIndex + 1),
        continuedVersion,
        ...prev.slice(sourceIndex + 2) // +2因为要替换loading版本
      ]);
      
      return optimizedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '优化失败，请稍后重试';
      console.error('继续优化提示词失败:', error);
      setApiError(errorMessage);
      
      // 使用服务层函数创建错误版本
      const errorVersions = [
        ...optimizationVersions.slice(0, sourceIndex + 1),
        createErrorVersion(newVersionId, errorMessage, version.id),
        ...optimizationVersions.slice(sourceIndex + 2)
      ];
      
      setOptimizationVersions(errorVersions);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizationMode, optimizationVersions]);

  // 生成提示词标题
  const generateTitle = useCallback(async (content: string): Promise<string> => {
    return generateOptimizationTitle(content);
  }, []);

  // 更新优化版本
  const updateVersion = useCallback((versionId: number, updates: Partial<OptimizationVersion>) => {
    setOptimizationVersions(prev => updateVersionInList(prev, versionId, updates));
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

// 导出服务层类型，以避免组件直接从services导入
export type { OptimizationMode, OptimizationVersion }; 