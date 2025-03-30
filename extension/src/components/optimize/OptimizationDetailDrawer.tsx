/**
 * @deprecated 此组件已废弃，请使用 src/pages/sidepanel/components/OptimizationDetailDrawer.tsx 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, Copy, Edit, Heart, Save } from 'lucide-react';
import { useAppContext } from '../../hooks/AppContext';
import { formatDate } from '../../utils/formatDate';
import { usePromptsData } from '../../hooks/usePromptsData';
import { OptimizationVersion } from '../../services/optimize/types';
import { MarkdownContent } from '../common/MarkdownContent';

interface OptimizationDetailDrawerProps {
  version: OptimizationVersion | undefined;
  isOpen: boolean;
  onClose: () => void;
  onContinueOptimize: (versionId: number) => void;
}

export function OptimizationDetailDrawer({ 
  version, 
  isOpen, 
  onClose,
  onContinueOptimize
}: OptimizationDetailDrawerProps) {
  const { state, updateOptimizationVersion } = useAppContext();
  const { addPrompt } = usePromptsData();
  
  // 本地状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  
  // 当版本变化时更新本地状态
  useEffect(() => {
    if (version) {
      setEditContent(version.editedContent || version.content);
    }
  }, [version]);
  
  if (!isOpen || !version) return null;
  
  // 创建日期
  const created = version.createdAt ? formatDate(version.createdAt) : '未知时间';
  
  // 处理复制内容
  const handleCopy = () => {
    const contentToCopy = version.editedContent || version.content;
    navigator.clipboard.writeText(contentToCopy);
  };
  
  // 处理保存到收藏夹
  const handleSaveToLibrary = async () => {
    const contentToSave = version.editedContent || version.content;
    
    // 提示词的内容是必需的，标题会在service层自动生成
    await addPrompt({
      title: `优化版本 ${version.id}`,
      content: contentToSave,
      isFavorite: true,
      source: 'optimize'
    });
  };
  
  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
  };
  
  // 保存编辑
  const handleSaveEdit = () => {
    if (version) {
      updateOptimizationVersion(version.id, {
        editedContent: editContent,
        isEdited: true
      });
      setIsEditing(false);
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    if (version) {
      setEditContent(version.editedContent || version.content);
    }
    setIsEditing(false);
  };
  
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-br from-magic-800 to-magic-900 border-l border-magic-700/30 shadow-xl z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
        <h3 className="text-lg font-semibold text-magic-200 truncate">优化版本详情</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-magic-400" />
        </button>
      </div>
      
      {/* 抽屉内容 */}
      <div className="p-4">
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
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-magic-700 hover:bg-magic-600 rounded text-sm text-magic-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm text-white"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="bg-magic-800/50 border border-magic-700/30 rounded-md p-3 text-magic-200 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800 cursor-text"
            >
              <MarkdownContent content={version.editedContent || version.content} />
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
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" /> 编辑内容
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors"
          >
            <Copy className="w-4 h-4 mr-2" /> 复制内容
          </button>
          
          <button
            onClick={handleSaveToLibrary}
            className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors"
          >
            <Heart className="w-4 h-4 mr-2" /> 添加到收藏
          </button>
          
          <button
            onClick={() => onContinueOptimize(version.id)}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-white transition-colors mt-2"
          >
            <Save className="w-4 h-4 mr-2" /> 继续优化此版本
          </button>
        </div>
      </div>
    </div>
  );
} 