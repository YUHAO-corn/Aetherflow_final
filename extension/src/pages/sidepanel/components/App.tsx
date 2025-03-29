import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OptimizeSection } from './OptimizeSection';
import { LibraryTab } from './LibraryTab';
import { Navigation } from './Navigation';
import type { Prompt } from '../../../services/prompt/types';

export function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'optimize'>('library');
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<
    Array<{ id: number; content: string; isLoading?: boolean; isNew?: boolean }>
  >([]);

  // 开始优化提示词
  const handleStartOptimize = async () => {
    if (!optimizeInput.trim()) return;

    setIsOptimizing(true);
    setOptimizationVersions(prev => [
      ...prev,
      { id: prev.length + 1, content: '', isLoading: true }
    ]);

    // 模拟优化过程
    setTimeout(() => {
      setOptimizationVersions(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: `优化后的提示词：${optimizeInput} (版本 ${lastIndex + 1})`,
          isLoading: false,
          isNew: true
        };
        return updated;
      });
      setIsOptimizing(false);
    }, 2000);
  };

  // 继续优化提示词
  const handleContinueOptimize = (version: { id: number; content: string }) => {
    setIsOptimizing(true);
    setOptimizationVersions(prev => [
      ...prev,
      { id: prev.length + 1, content: '', isLoading: true }
    ]);

    // 模拟优化过程
    setTimeout(() => {
      setOptimizationVersions(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: `进一步优化：${version.content} (版本 ${lastIndex + 1})`,
          isLoading: false,
          isNew: true
        };
        return updated;
      });
      setIsOptimizing(false);
    }, 2000);
  };

  // 复制提示词
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // 这里可以添加复制成功的提示
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
          />
        )}
      </div>
    </div>
  );
}

export default App; 