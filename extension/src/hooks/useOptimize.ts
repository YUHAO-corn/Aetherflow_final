import { useState, useCallback } from 'react';
import { OptimizationVersion, OptimizeOptions, optimizePrompt } from '../services/optimize';

export function useOptimize() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<OptimizationVersion[]>([]);

  // 开始优化
  const startOptimize = useCallback(async (content: string, options?: OptimizeOptions) => {
    if (!content.trim()) return;

    setIsOptimizing(true);

    // 添加一个加载状态的版本
    const placeholderVersion: OptimizationVersion = {
      id: Date.now(),
      content: '',
      isLoading: true,
      isNew: true
    };
    setOptimizationVersions([placeholderVersion]);

    try {
      // 调用优化服务
      const result = await optimizePrompt(content, options);
      
      const newVersion: OptimizationVersion = {
        ...result,
        isNew: true
      };

      setOptimizationVersions([newVersion]);

      // 一段时间后移除新建状态
      setTimeout(() => {
        setOptimizationVersions(prev => 
          prev.map(v => ({ ...v, isNew: false }))
        );
      }, 1200);

      return newVersion;
    } catch (error) {
      console.error('Optimization failed:', error);
      // 在实际应用中，这里应该显示一个错误通知
      setOptimizationVersions([]);
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  // 继续优化特定版本
  const continueOptimize = useCallback(async (version: OptimizationVersion, options?: OptimizeOptions) => {
    setIsOptimizing(true);

    // 添加一个加载状态的版本
    const placeholderVersion: OptimizationVersion = {
      id: Date.now(),
      content: '',
      isLoading: true,
      isNew: true
    };

    const versionIndex = optimizationVersions.findIndex(v => v.id === version.id);
    const newVersions = [
      ...optimizationVersions.slice(0, versionIndex + 1),
      placeholderVersion
    ];
    setOptimizationVersions(newVersions);

    try {
      // 调用优化服务
      const result = await optimizePrompt(version.content, options);
      
      const newVersion: OptimizationVersion = {
        ...result,
        isNew: true
      };

      const updatedVersions = [
        ...optimizationVersions.slice(0, versionIndex + 1),
        newVersion
      ];
      
      setOptimizationVersions(updatedVersions);

      // 一段时间后移除新建状态
      setTimeout(() => {
        setOptimizationVersions(prev => 
          prev.map(v => ({ ...v, isNew: false }))
        );
      }, 1200);

      return newVersion;
    } catch (error) {
      console.error('Continued optimization failed:', error);
      // 移除加载状态的版本
      setOptimizationVersions(optimizationVersions);
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizationVersions]);

  // 清除所有版本
  const clearVersions = useCallback(() => {
    setOptimizationVersions([]);
  }, []);

  return {
    isOptimizing,
    optimizationVersions,
    startOptimize,
    continueOptimize,
    clearVersions
  };
} 