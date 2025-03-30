import React, { useState, useRef } from 'react';
import { Loader2, Settings, Sparkles, Wand2 } from 'lucide-react';
import { OptimizeSection } from './OptimizeSection';
import { LibraryTab } from './LibraryTab';
import { Navigation } from './Navigation';
import { SettingsDrawer } from '../../../components/navigation/SettingsDrawer';
import type { Prompt } from '../../../services/prompt/types';
import { usePromptsData } from '../../../hooks/usePromptsData';
import { useOptimize } from '../../../hooks/useOptimize';
import type { OptimizationMode, OptimizationVersion } from '../../../services/optimization';

export function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'optimize'>('library');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const logoTimeoutRef = useRef<number | null>(null);

  // 获取提示词库数据
  const { addPrompt } = usePromptsData();
  
  // 获取优化功能
  const { 
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
  } = useOptimize();

  const handleLogoHover = () => {
    if (!isLogoHovered) {
      setIsLogoHovered(true);
      // 清除之前的timeout（如果有）
      if (logoTimeoutRef.current) {
        clearTimeout(logoTimeoutRef.current);
      }
      // 设置新的timeout，动画结束后重置状态
      logoTimeoutRef.current = setTimeout(() => {
        setIsLogoHovered(false);
      }, 800); // 与动画时长一致
    }
  };

  // 开始优化提示词
  const handleStartOptimize = async () => {
    if (!optimizeInput.trim()) return;
    await startOptimize(optimizeInput, optimizationMode);
  };

  // 继续优化提示词
  const handleContinueOptimize = async (version: OptimizationVersion) => {
    await continueOptimization(version, optimizationMode);
  };

  // 复制提示词
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // 这里可以添加复制成功的提示
  };
  
  // 保存到收藏夹
  const handleSaveToLibrary = async (content: string) => {
    try {
      // 使用智能标题生成
      const title = await generateTitle(content);
      
      // 实际调用添加提示词到收藏夹的API
      await addPrompt({
        title,
        content,
        isFavorite: true,
        favorite: true
      });
    } catch (error) {
      console.error("保存到收藏夹失败:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-magic-900 text-magic-200">
      <header className="p-4 border-b border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
        <div className="flex items-center">
          <div 
            className="cursor-pointer" 
            onMouseEnter={handleLogoHover}
          >
            <Sparkles 
              className={`w-6 h-6 mr-2 ${isLogoHovered ? 'logo-hover text-indigo-400' : 'text-purple-400'}`} 
            />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-md animate-[pulse_4s_ease-in-out_infinite]">AetherFlow</h1>
        </div>
      </header>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto">
        {activeTab === 'library' ? (
          <LibraryTab /> 
        ) : (
          <OptimizeSection 
            input={optimizeInput}
            onInputChange={setOptimizeInput}
            isOptimizing={isOptimizing}
            onStartOptimize={handleStartOptimize}
            onContinueOptimize={handleContinueOptimize}
            optimizationVersions={optimizationVersions}
            onUpdateVersion={updateVersion}
            onCopy={handleCopy}
            onSaveToLibrary={handleSaveToLibrary}
            optimizationMode={optimizationMode}
            onOptimizationModeChange={setOptimizationMode}
            apiError={apiError}
          />
        )}
      </main>

      <footer className="p-2 border-t border-magic-700/30 flex justify-end">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center text-magic-400 hover:text-magic-200"
        >
          <Settings size={18} className="mr-1" />
          <span>设置</span>
        </button>
      </footer>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App; 