import React, { useState } from 'react';
import { OptimizeSection } from './OptimizeSection';
import { PromptShortcut } from './PromptShortcut';
import type { Prompt } from '../hooks/usePrompts';

interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'optimize' | 'shortcuts'>('shortcuts');
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<OptimizationVersion[]>([]);

  const handlePromptSelect = (prompt: Prompt) => {
    // 实现提示词选择逻辑
    console.log('Selected prompt:', prompt);
  };

  const handleStartOptimize = async () => {
    if (!optimizeInput.trim()) return;

    setIsOptimizing(true);

    const placeholderVersion: OptimizationVersion = {
      id: optimizationVersions.length + 1,
      content: '',
      isLoading: true,
      isNew: true,
    };
    setOptimizationVersions([placeholderVersion]);

    // 模拟优化过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newVersion: OptimizationVersion = {
      id: placeholderVersion.id,
      content: optimizeInput,
      isLoading: false,
      isNew: true,
    };

    setOptimizationVersions([newVersion]);

    setTimeout(() => {
      setOptimizationVersions(prev => prev.map(v => ({ ...v, isNew: false })));
    }, 1200);

    setIsOptimizing(false);
  };

  const handleContinueOptimize = async (version: OptimizationVersion) => {
    setIsOptimizing(true);

    const placeholderVersion: OptimizationVersion = {
      id: optimizationVersions.length + 1,
      content: '',
      isLoading: true,
      isNew: true,
    };

    const versionIndex = optimizationVersions.findIndex(v => v.id === version.id);
    const newVersions = [
      ...optimizationVersions.slice(0, versionIndex + 1),
      placeholderVersion,
      ...optimizationVersions.slice(versionIndex + 1),
    ];
    setOptimizationVersions(newVersions);

    // 模拟优化过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newVersion: OptimizationVersion = {
      id: placeholderVersion.id,
      content: version.content + ' [优化版本]',
      isLoading: false,
      isNew: true,
    };

    const updatedVersions = [
      ...optimizationVersions.slice(0, versionIndex + 1),
      newVersion,
      ...optimizationVersions.slice(versionIndex + 1),
    ];

    setOptimizationVersions(updatedVersions);

    setTimeout(() => {
      setOptimizationVersions(prev => prev.map(v => ({ ...v, isNew: false })));
    }, 1200);

    setIsOptimizing(false);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-magic-900 via-magic-800 to-magic-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold text-white">AetherFlow Sidepanel</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-magic-700/30">
        <button
          onClick={() => setActiveTab('shortcuts')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 ${
            activeTab === 'shortcuts'
              ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
              : 'text-magic-400 hover:text-magic-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>快捷输入</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('optimize')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 ${
            activeTab === 'optimize'
              ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
              : 'text-magic-400 hover:text-magic-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>提示词优化</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'shortcuts' ? (
          <PromptShortcut onSelect={handlePromptSelect} />
        ) : (
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
};

export default App;
