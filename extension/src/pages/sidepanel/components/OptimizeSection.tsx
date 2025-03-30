import React, { useState } from 'react';
import { Sparkles, Wand2, Copy, Star, AlertTriangle } from 'lucide-react';
import type { Prompt } from '../../../services/prompt/types';
import { OptimizationDetailDrawer } from './OptimizationDetailDrawer';
import { OptimizationModeSelector } from './OptimizationModeSelector';
import type { OptimizationMode } from './App';

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

interface OptimizeSectionProps {
  optimizeInput: string;
  setOptimizeInput: (input: string) => void;
  isOptimizing: boolean;
  optimizationVersions: OptimizationVersion[];
  onStartOptimize: () => void;
  onContinueOptimize: (version: OptimizationVersion) => void;
  onCopy: (content: string) => void;
  onSaveToLibrary?: (content: string) => void;
  optimizationMode: OptimizationMode;
  setOptimizationMode: (mode: OptimizationMode) => void;
}

export function OptimizeSection({
  optimizeInput,
  setOptimizeInput,
  isOptimizing,
  optimizationVersions,
  onStartOptimize,
  onContinueOptimize,
  onCopy,
  onSaveToLibrary,
  optimizationMode,
  setOptimizationMode
}: OptimizeSectionProps) {
  // 详情抽屉状态
  const [selectedVersion, setSelectedVersion] = useState<OptimizationVersion | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // 添加收藏状态跟踪
  const [favoriteVersions, setFavoriteVersions] = useState<number[]>([]);
  
  // 处理收藏
  const handleToggleFavorite = (versionId: number, content: string) => {
    if (favoriteVersions.includes(versionId)) {
      // 如果已收藏，则取消收藏
      setFavoriteVersions(prev => prev.filter(id => id !== versionId));
    } else {
      // 如果未收藏，则添加到收藏
      setFavoriteVersions(prev => [...prev, versionId]);
      // 调用保存到收藏夹的函数
      if (onSaveToLibrary) {
        onSaveToLibrary(content);
      }
    }
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

  // 检查版本是否包含错误信息
  const isErrorVersion = (content: string) => {
    return content.startsWith('优化失败:');
  };
  
  // 获取显示内容，优先使用编辑后的内容
  const getDisplayContent = (version: OptimizationVersion) => {
    return version.editedContent || version.content;
  };
  
  // 格式化内容预览，精简显示
  const formatContentPreview = (content: string, maxLength = 200) => {
    // 去除多余换行，使显示更紧凑
    let formatted = content.replace(/\n{2,}/g, '\n').replace(/\n/g, ' ');
    
    // 保留文本的前maxLength个字符，并在末尾添加省略号表示被截断
    if (formatted.length > maxLength) {
      return formatted.substring(0, maxLength) + '...';
    }
    return formatted;
  };
  
  // 限制卡片标题长度，最多24个字节
  const formatVersionTitle = (id: number, isEdited: boolean = false) => {
    let title = `优化版本 v${id}`;
    if (isEdited) {
      title += ' (已编辑)';
    }
    return title.length > 24 ? title.substring(0, 21) + '...' : title;
  };

  return (
    <div className="p-4">
      <div className="mb-4 space-y-2">
        <textarea
          value={optimizeInput}
          onChange={e => setOptimizeInput(e.target.value)}
          placeholder="请输入需要优化的提示词..."
          className="w-full h-32 p-3 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent resize-none transition-all duration-300"
        />
        <div className="flex items-center">
          <button
            onClick={onStartOptimize}
            disabled={!optimizeInput.trim() || isOptimizing}
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
              onSelectMode={setOptimizationMode}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {optimizationVersions.map(version => {
          const isError = isErrorVersion(version.content);
          const displayContent = getDisplayContent(version);
          
          return (
            <div
              key={version.id}
              className={`relative p-4 bg-gradient-to-r ${
                isError 
                  ? 'from-red-900/30 via-red-800/20 to-red-900/30 border-red-700/30' 
                  : 'from-magic-800/50 via-magic-700/30 to-magic-800/50 border-magic-700/30'
              } border rounded-lg group transform hover:-rotate-1 hover:scale-[1.02] transition-all duration-300 ${
                version.isNew ? 'animate-magic-reveal' : ''
              } ${version.isLoading ? 'animate-pulse' : ''}`}
              onClick={() => !version.isLoading && handleOpenDetail(version)}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${
                isError 
                  ? 'from-red-500/10 to-red-600/10' 
                  : 'from-magic-500/20 to-magic-600/20'
              } opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none`} />
              
              {/* 标题和操作按钮部分 */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-xs font-medium text-magic-400">
                  {formatVersionTitle(version.id, version.isEdited)}
                </span>
                
                {/* 操作按钮，默认隐藏，hover时显示 */}
                {!version.isLoading && !isError && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {onSaveToLibrary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(version.id, displayContent);
                        }}
                        className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                        title={favoriteVersions.includes(version.id) ? "已收藏" : "添加到收藏"}
                      >
                        <Star 
                          size={14} 
                          className={favoriteVersions.includes(version.id) 
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
              
              {/* 内容部分 */}
              {version.isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-magic-700/30 rounded animate-pulse" />
                  <div className="h-4 bg-magic-700/30 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-magic-700/30 rounded animate-pulse w-1/2" />
                </div>
              ) : (
                <div className="min-h-[40px] overflow-hidden">
                  {isError ? (
                    <div className="flex items-center text-red-400 mb-3">
                      <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                      <p className="text-xs whitespace-normal break-words line-clamp-4">
                        {version.content}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-magic-200 mb-3 relative z-10 whitespace-normal break-words line-clamp-6">
                      {formatContentPreview(displayContent)}
                    </p>
                  )}
                </div>
              )}
              
              {/* 底部操作按钮 */}
              {!version.isLoading && !isError && (
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
                      onSelectMode={setOptimizationMode}
                      iconOnly={true}
                    />
                  </div>
                </div>
              )}
              
              {/* 错误状态下的重试按钮 */}
              {!version.isLoading && isError && (
                <div className="flex items-center justify-end mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartOptimize();
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    重试优化
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 详情抽屉 */}
      <OptimizationDetailDrawer
        version={selectedVersion}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onContinueOptimize={(versionId: number) => {
          handleCloseDetail();
          const version = optimizationVersions.find(v => v.id === versionId);
          if (version) {
            onContinueOptimize(version);
          }
        }}
        onUpdateVersion={(versionId: number, updates: Partial<OptimizationVersion>) => {
          // 更新当前选中的版本
          const updatedVersion = optimizationVersions.find(v => v.id === versionId);
          if (updatedVersion) {
            // 更新内部状态
            setSelectedVersion({
              ...updatedVersion,
              ...updates
            });
            
            // 更新全局状态
            const updatedVersions = optimizationVersions.map(v => 
              v.id === versionId ? { ...v, ...updates } : v
            );
            
            // 这里应该有更新操作，暂时不做处理
          }
        }}
      />
    </div>
  );
} 