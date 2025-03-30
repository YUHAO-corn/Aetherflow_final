import React, { useState } from 'react';
import { Sparkles, Wand2, Copy, Star, AlertTriangle } from 'lucide-react';
import type { Prompt } from '../../../services/prompt/types';
import { OptimizationDetailDrawer } from './OptimizationDetailDrawer';
import { OptimizationModeSelector } from './OptimizationModeSelector';
import type { OptimizationMode, OptimizationVersion } from '../../../services/optimization';
import { 
  isErrorVersion, 
  getVersionDisplayContent, 
  formatContentPreview, 
  formatVersionTitle,
  toggleFavoriteVersion,
  getFavoriteStatus
} from '../../../services/optimization';

interface OptimizeSectionProps {
  input: string;
  onInputChange: (input: string) => void;
  isOptimizing: boolean;
  optimizationVersions: OptimizationVersion[];
  onStartOptimize: () => void;
  onContinueOptimize: (version: OptimizationVersion) => void;
  onUpdateVersion?: (versionId: number, updates: Partial<OptimizationVersion>) => void;
  onCopy: (content: string) => void;
  onSaveToLibrary?: (content: string) => void;
  optimizationMode: OptimizationMode;
  onOptimizationModeChange: (mode: OptimizationMode) => void;
  apiError?: string | null;
}

export function OptimizeSection({
  input,
  onInputChange,
  isOptimizing,
  optimizationVersions,
  onStartOptimize,
  onContinueOptimize,
  onUpdateVersion,
  onCopy,
  onSaveToLibrary,
  optimizationMode,
  onOptimizationModeChange,
  apiError
}: OptimizeSectionProps) {
  // 详情抽屉状态
  const [selectedVersion, setSelectedVersion] = useState<OptimizationVersion | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // 添加收藏状态跟踪
  const [favoriteVersions, setFavoriteVersions] = useState<number[]>([]);
  
  // 处理收藏 - 使用服务层函数
  const handleToggleFavorite = async (versionId: number, version: OptimizationVersion) => {
    // 调用服务层函数处理收藏逻辑
    const updatedFavorites = await toggleFavoriteVersion(
      version,
      favoriteVersions,
      onSaveToLibrary
    );
    
    // 更新本地收藏状态
    setFavoriteVersions(updatedFavorites);
  };

  // 打开版本详情
  const handleOpenDetail = (version: OptimizationVersion) => {
    setSelectedVersion(version);
    setIsDetailOpen(true);
  };

  // 关闭版本详情
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  return (
    <div className="p-4">
      <div className="mb-4 space-y-2">
        <textarea
          value={input}
          onChange={e => onInputChange(e.target.value)}
          placeholder="请输入需要优化的提示词..."
          className="w-full h-32 p-3 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent resize-none transition-all duration-300"
        />
        <div className="flex items-center">
          <button
            onClick={onStartOptimize}
            disabled={!input.trim() || isOptimizing}
            className="relative flex-1 mt-2 px-4 py-2 bg-magic-600 text-white rounded-lg text-sm font-medium hover:bg-magic-500 disabled:bg-magic-800/50 disabled:cursor-not-allowed transition-all duration-300 group overflow-hidden"
          >
            <span className="flex items-center justify-center space-x-2">
              <Sparkles
                className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : 'group-hover:animate-bounce'}`}
              />
              <span>{isOptimizing ? '优化中...' : '开始优化'}</span>
            </span>
            {isOptimizing && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-fast" />
            )}
          </button>
          <div className="ml-2 mt-2">
            <OptimizationModeSelector 
              selectedMode={optimizationMode}
              onSelectMode={onOptimizationModeChange}
            />
          </div>
        </div>
      </div>

      {apiError && (
        <div className="my-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center">
          <AlertTriangle size={16} className="text-red-400 mr-2" />
          <span className="text-red-300 text-sm">{apiError}</span>
        </div>
      )}

      <div className="space-y-4">
        {optimizationVersions.map(version => {
          const hasError = isErrorVersion(version.content);
          const displayContent = getVersionDisplayContent(version);
          // 使用服务层函数检查收藏状态
          const isFavorite = getFavoriteStatus(version.id, favoriteVersions);
          
          return (
            <div
              key={version.id}
              className={`relative p-4 bg-gradient-to-r ${
                hasError 
                  ? 'from-red-900/30 via-red-800/20 to-red-900/30 border-red-700/30' 
                  : 'from-magic-800/50 via-magic-700/30 to-magic-800/50 border-magic-700/30'
              } border rounded-lg group transform hover:-rotate-1 hover:scale-[1.02] transition-all duration-300 ${
                version.isNew ? 'animate-magic-reveal' : ''
              } ${version.isLoading ? 'animate-pulse' : ''}`}
              onClick={() => !version.isLoading && handleOpenDetail(version)}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${
                hasError 
                  ? 'from-red-500/10 to-red-600/10' 
                  : 'from-magic-500/20 to-magic-600/20'
              } opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none`} />
              
              {/* 标题和操作按钮部分 */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-xs font-medium text-magic-400">
                  {formatVersionTitle(version.id, version.isEdited)}
                </span>
                
                {/* 操作按钮，默认隐藏，hover时显示 */}
                {!version.isLoading && !hasError && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {onSaveToLibrary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(version.id, version);
                        }}
                        className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                        title={isFavorite ? "已收藏" : "添加到收藏"}
                      >
                        <Star 
                          size={14} 
                          className={isFavorite 
                            ? "text-yellow-400 fill-yellow-400" 
                            : "text-magic-400"} 
                        />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(displayContent);
                      }}
                      className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                      title="复制内容"
                    >
                      <Copy size={14} className="text-magic-400" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* 内容预览部分 */}
              <div className="text-xs text-magic-300 line-clamp-8 mb-4 whitespace-pre-line">
                {version.isLoading 
                  ? <div className="h-4 bg-magic-700/50 rounded w-3/4 animate-pulse mb-2"></div>
                  : formatContentPreview(displayContent)
                }
              </div>
              
              {/* 底部操作区 */}
              {!version.isLoading && !hasError && (
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContinueOptimize(version);
                    }}
                    disabled={isOptimizing}
                    className="relative w-full px-3 py-1.5 text-sm text-magic-200 bg-magic-700/30 rounded hover:bg-magic-600/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden flex-1"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <Wand2
                        className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : 'group-hover:animate-bounce'}`}
                      />
                      <span>{isOptimizing ? '优化中...' : '继续优化'}</span>
                    </span>
                    {isOptimizing && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-fast" />
                    )}
                  </button>
                  <div 
                    className="ml-2" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <OptimizationModeSelector 
                      selectedMode={optimizationMode}
                      onSelectMode={onOptimizationModeChange}
                      iconOnly={true}
                    />
                  </div>
                </div>
              )}
              
              {/* 错误状态下的重试按钮 */}
              {!version.isLoading && hasError && (
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartOptimize();
                    }}
                    className="w-full px-3 py-1.5 text-sm text-magic-200 bg-red-800/30 rounded hover:bg-red-700/40 transition-colors"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>重新尝试</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 详情抽屉 */}
      {selectedVersion && (
        <OptimizationDetailDrawer 
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          version={selectedVersion}
          onContinueOptimize={onContinueOptimize}
          onUpdateVersion={onUpdateVersion}
          onCopy={onCopy}
          onSaveToLibrary={onSaveToLibrary}
        />
      )}
    </div>
  );
} 