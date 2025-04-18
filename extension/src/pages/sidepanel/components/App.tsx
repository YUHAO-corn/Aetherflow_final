import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Settings, Sparkles, Wand2 } from 'lucide-react';
import { OptimizeSection } from './OptimizeSection';
import { LibraryTab } from './LibraryTab';
import { Navigation } from './Navigation';
import { SettingsDrawer } from './SettingsDrawer';
import LoginButton from './LoginButton';
import AuthDrawer from './AuthModal';
import { SyncStatusIndicator } from '../../../components/common';
import { UpgradeButton, DevMembershipTools, ProBadge, PlanCardConnector } from '../../../components/membership';
import type { Prompt } from '../../../services/prompt/types';
import { usePromptsData } from '../../../hooks/usePromptsData';
import { useOptimize } from '../../../hooks/useOptimize';
import { useMembership } from '../../../hooks/useMembership';
import type { OptimizationMode, OptimizationVersion } from '../../../services/optimization';

// 默认导出App组件以便sidepanel/index.tsx可以正确导入
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'optimize'>('library');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const logoTimeoutRef = useRef<number | null>(null);

  // 获取提示词库数据
  const { addPrompt, refresh } = usePromptsData();
  
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

  // 获取会员状态
  const { isProMember } = useMembership();

  // Auth drawer handlers
  const handleOpenAuth = () => {
    setIsAuthOpen(true);
  };

  const handleCloseAuth = () => {
    setIsAuthOpen(false);
  };

  // 处理ProBadge点击事件
  const handleProBadgeClick = () => {
    // 在开发环境中显示消息，提醒使用测试工具切换状态
    console.log('点击了PRO标识，请使用右下角的会员状态测试工具切换会员状态');
  };

  // 监听提示词更新消息
  useEffect(() => {
    console.log('[SidePanel] 设置提示词更新消息监听器');
    
    const handlePromptUpdated = (message: any) => {
      if (message.type === 'PROMPT_UPDATED') {
        console.log('[SidePanel] 收到提示词更新消息:', message);
        
        // 延迟刷新，确保存储已完成更新
        setTimeout(() => {
          console.log('[SidePanel] 开始刷新提示词数据');
          refresh();
        }, 300);
      }
    };
    
    // 添加消息监听器
    chrome.runtime.onMessage.addListener(handlePromptUpdated);
    
    // 添加额外的刷新逻辑，确保初始加载时能正确获取数据
    setTimeout(() => {
      console.log('[SidePanel] 初始化时额外刷新提示词数据');
      refresh();
    }, 500);
    
    // 清理函数
    return () => {
      console.log('[SidePanel] 移除提示词更新消息监听器');
      chrome.runtime.onMessage.removeListener(handlePromptUpdated);
    };
  }, [refresh]);

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
      console.error("Failed to save to library:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-magic-900 text-magic-200">
      <header className="p-2 border-b border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className="cursor-pointer" 
              onMouseEnter={handleLogoHover}
            >
              <Sparkles 
                className={`w-5 h-5 mr-2 ${isLogoHovered ? 'logo-hover text-indigo-400' : 'text-purple-400'}`} 
              />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-md animate-[pulse_4s_ease-in-out_infinite]">AetherFlow</h1>
          </div>
          
          <div className="flex items-center">
            {/* PRO标识，显示在用户头像左侧 */}
            <div className="mr-2">
              <PlanCardConnector triggerType="hover" source="badge">
                <ProBadge 
                  isActive={isProMember}
                  onClick={handleProBadgeClick}
                  size="sm"
                />
              </PlanCardConnector>
            </div>
            <LoginButton onAuthClick={handleOpenAuth} />
          </div>
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

      <footer className="p-2 border-t border-magic-700/30 flex justify-between items-center">
        <div className="flex items-center">
          <SyncStatusIndicator className="ml-2" />
          {/* 升级按钮，位于云存储图标右侧 */}
          <div className="ml-2">
            <PlanCardConnector triggerType="hover" source="upgrade_button">
              <UpgradeButton isProMember={isProMember} />
            </PlanCardConnector>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center text-magic-400 hover:text-magic-200"
        >
          <Settings size={18} className="mr-1" />
          <span>Settings</span>
        </button>
      </footer>

      {/* App-level drawers */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      <AuthDrawer
        isOpen={isAuthOpen}
        onClose={handleCloseAuth}
      />

      {/* 开发环境专用的会员状态测试工具 */}
      <DevMembershipTools />
    </div>
  );
};

export default App; 