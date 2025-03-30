import React, { useState, useEffect } from 'react';
import { X, Copy, Star, Clock, Edit, Save, Check, AlertCircle } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate';
import { usePromptsData } from '../../../hooks/usePromptsData';

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

interface OptimizationDetailDrawerProps {
  version: OptimizationVersion | undefined;
  isOpen: boolean;
  onClose: () => void;
  onContinueOptimize: (versionId: number) => void;
  onUpdateVersion?: (versionId: number, updates: Partial<OptimizationVersion>) => void;
}

export function OptimizationDetailDrawer({ 
  version, 
  isOpen, 
  onClose,
  onContinueOptimize,
  onUpdateVersion
}: OptimizationDetailDrawerProps) {
  // 本地状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  // 添加复制反馈状态
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 获取提示词API
  const { addPrompt } = usePromptsData();
  
  // 当版本变化时更新本地状态
  useEffect(() => {
    if (version) {
      setEditContent(version.editedContent || version.content);
    }
  }, [version]);
  
  // 复制成功后的反馈效果
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false);
      }, 2000); // 2秒后恢复按钮状态
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);
  
  if (!isOpen || !version) return null;
  
  // 获取显示内容
  const displayContent = version.editedContent || version.content;
  
  // 创建日期
  const created = version.createdAt ? formatDate(version.createdAt) : '未知时间';
  
  // 处理复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent)
      .then(() => {
        setCopySuccess(true);
      })
      .catch(err => {
        console.error('复制失败:', err);
        // 也可以在这里显示错误反馈
      });
  };
  
  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
  };
  
  // 保存编辑
  const handleSaveEdit = () => {
    if (version && onUpdateVersion) {
      onUpdateVersion(version.id, {
        editedContent: editContent,
        isEdited: true
      });
      setIsEditing(false);
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    if (version) {
      setEditContent(displayContent);
    }
    setIsEditing(false);
  };
  
  // 处理双击编辑
  const handleDoubleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };
  
  // 处理收藏
  const handleToggleFavorite = async () => {
    if (version) {
      if (!isFavorite) {
        // 添加到收藏夹
        try {
          await addPrompt({
            title: displayContent.substring(0, 30) + '...',
            content: displayContent,
            isFavorite: true,
            favorite: true
          });
          setIsFavorite(true);
        } catch (error) {
          console.error('添加到收藏夹失败:', error);
        }
      } else {
        // 从收藏夹移除
        setIsFavorite(false);
        // 注意：实际上我们没有真正从收藏夹中移除，因为这需要更复杂的状态管理
        // 在实际应用中，应调用API删除收藏
      }
    }
  };
  
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-br from-magic-800 to-magic-900 border-l border-magic-700/30 shadow-xl z-30 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between p-4 border-b border-magic-700/30 flex-shrink-0">
        <h3 className="text-lg font-semibold text-magic-200 truncate">优化版本详情</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-magic-400" />
        </button>
      </div>
      
      {/* 抽屉内容 - 使用flex-1和overflow-y-auto使内容区域可滚动 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 版本标题 */}
        <h2 className="text-xl font-bold text-magic-200 mb-4">
          版本 v{version.id} {version.isEdited ? '(已编辑)' : ''}
        </h2>
        
        {/* 内容 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-magic-400 mb-2">内容</h4>
          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-magic-800 border border-magic-600 rounded-md p-3 text-magic-200 max-h-[300px] min-h-[150px] scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800"
                autoFocus
              />
              <div className="text-xs text-magic-400 mt-1 mb-2">点击外部保存</div>
            </div>
          ) : (
            <div 
              className="bg-magic-800/50 border border-magic-700/30 rounded-md p-3 text-magic-200 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800 cursor-text whitespace-pre-wrap"
              onDoubleClick={handleDoubleClick}
            >
              {displayContent}
            </div>
          )}
        </div>
        
        {/* 元数据 */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center text-sm text-magic-400">
            <Clock className="w-4 h-4 mr-2" /> 
            <span>创建于: {created}</span>
          </div>
          {version.parentId && (
            <div className="flex items-center text-sm text-magic-400">
              <Clock className="w-4 h-4 mr-2" /> 
              <span>基于版本: v{version.parentId}</span>
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col space-y-3">
          {isEditing ? (
            <div className="flex space-x-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center justify-center flex-1 px-4 py-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
              >
                <AlertCircle className="w-4 h-4 mr-2" /> 取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center justify-center flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md text-white transition-colors"
              >
                <Check className="w-4 h-4 mr-2" /> 保存修改
              </button>
            </div>
          ) : (
            <>
              {onUpdateVersion && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" /> 编辑内容
                </button>
              )}
              
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center px-4 py-2 ${copySuccess ? 'bg-green-600' : 'bg-magic-600 hover:bg-magic-500'} rounded-md text-white transition-colors`}
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" /> 复制内容
                  </>
                )}
              </button>
              
              <button
                onClick={() => onContinueOptimize(version.id)}
                className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-white transition-colors mt-2"
              >
                <Save className="w-4 h-4 mr-2" /> 继续优化此版本
              </button>
              
              <button
                onClick={handleToggleFavorite}
                className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors mt-2"
              >
                <Star 
                  className={`w-4 h-4 mr-2 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : ''}`} 
                />
                {isFavorite ? "已收藏" : "添加到收藏夹"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 