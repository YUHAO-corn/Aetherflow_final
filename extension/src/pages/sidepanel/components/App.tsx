import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OptimizeSection } from './OptimizeSection';
import { LibraryTab } from './LibraryTab';
import { Navigation } from './Navigation';
import type { Prompt } from '../../../services/prompt/types';
import { usePromptsData } from '../../../hooks/usePromptsData';
import { optimizePrompt, continueOptimize, OptimizationMode as ApiOptimizationMode } from '../../../services/optimizationService';

// 优化模式类型
export type OptimizationMode = ApiOptimizationMode;

// 优化版本类型
interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
  editedContent?: string;
  isEdited?: boolean;
  createdAt?: number;
  parentId?: number;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'optimize'>('library');
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<OptimizationVersion[]>([]);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('standard');
  const [apiError, setApiError] = useState<string | null>(null);

  // 获取提示词库数据
  const { addPrompt, incrementUseCount } = usePromptsData();

  // 开始优化提示词
  const handleStartOptimize = async () => {
    if (!optimizeInput.trim()) return;

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
      const optimizedContent = await optimizePrompt(optimizeInput, optimizationMode);
      
      setOptimizationVersions([
        {
          id: 1,
          content: optimizedContent,
          isLoading: false,
          isNew: true,
          createdAt: Date.now()
        }
      ]);
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
    } finally {
      setIsOptimizing(false);
    }
  };

  // 继续优化提示词
  const handleContinueOptimize = async (version: OptimizationVersion) => {
    setIsOptimizing(true);
    setApiError(null);
    
    // 找到要继续优化的版本
    const sourceContent = version.editedContent || version.content;
    const sourceIndex = optimizationVersions.findIndex(v => v.id === version.id);
    
    // 生成新版本ID
    const newVersionId = Math.max(...optimizationVersions.map(v => v.id)) + 1;
    
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
      const optimizedContent = await continueOptimize(sourceContent, optimizationMode);
      
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
    } finally {
      setIsOptimizing(false);
    }
  };

  // 复制提示词
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // 这里可以添加复制成功的提示
  };
  
  // 保存到收藏夹
  const handleSaveToLibrary = async (content: string) => {
    try {
      // 实际调用添加提示词到收藏夹的API
      await addPrompt({
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        content,
        isFavorite: true,
        favorite: true
      });
    } catch (error) {
      console.error("保存到收藏夹失败:", error);
    }
  };
  
  // 更新优化版本
  const handleUpdateVersion = (versionId: number, updates: Partial<OptimizationVersion>) => {
    setOptimizationVersions(prev => 
      prev.map(version => 
        version.id === versionId 
          ? { ...version, ...updates } 
          : version
      )
    );
  };

  return (
    <div className="flex flex-col h-screen bg-magic-900 text-magic-200">
      <header className="p-4 border-b border-magic-700/30">
        <h1 className="text-xl font-semibold text-white">Aetherflow 侧面板</h1>
      </header>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'library' && <LibraryTab />}
        {activeTab === 'optimize' && (
          <OptimizeSection
            optimizeInput={optimizeInput}
            setOptimizeInput={setOptimizeInput}
            isOptimizing={isOptimizing}
            optimizationVersions={optimizationVersions}
            onStartOptimize={handleStartOptimize}
            onContinueOptimize={handleContinueOptimize}
            onCopy={handleCopy}
            onSaveToLibrary={handleSaveToLibrary}
            optimizationMode={optimizationMode}
            setOptimizationMode={setOptimizationMode}
          />
        )}
      </div>
      
      {apiError && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-600/80 text-white rounded-md text-sm">
          {apiError}
        </div>
      )}
    </div>
  );
}

export default App; 