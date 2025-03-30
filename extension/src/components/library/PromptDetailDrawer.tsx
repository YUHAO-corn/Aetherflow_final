/**
 * @deprecated 此组件已废弃，请使用 src/pages/sidepanel/components/PromptDetailDrawer.tsx 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import React from 'react';
import { X, Copy, Pencil, Star, Trash2, Clock } from 'lucide-react';
import { Prompt } from '../../services/prompt/types';
import { useAppContext } from '../../hooks/AppContext';
import { formatDate } from '../../utils/formatDate';

interface PromptDetailDrawerProps {
  prompt: Prompt | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prompt: Prompt) => void;
}

export function PromptDetailDrawer({ prompt, isOpen, onClose, onEdit }: PromptDetailDrawerProps) {
  const { incrementPromptUse, toggleFavorite, deletePrompt } = useAppContext();
  
  if (!isOpen || !prompt) return null;
  
  // 格式化日期
  const created = formatDate(prompt.createdAt);
  const updated = formatDate(prompt.updatedAt);
  const lastUsed = prompt.lastUsed ? formatDate(prompt.lastUsed) : '从未使用';
  
  // 处理复制提示词
  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    incrementPromptUse(prompt.id);
  };
  
  // 处理收藏切换
  const handleToggleFavorite = () => {
    toggleFavorite(prompt.id);
  };
  
  // 处理删除提示词
  const handleDelete = async () => {
    if (window.confirm('确定要删除这个提示词吗？')) {
      await deletePrompt(prompt.id);
      onClose();
    }
  };
  
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-br from-magic-800 to-magic-900 border-l border-magic-700/30 shadow-xl z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
        <h3 className="text-lg font-semibold text-magic-200 truncate">提示词详情</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-magic-400" />
        </button>
      </div>
      
      {/* 抽屉内容 */}
      <div className="p-4">
        {/* 标题 */}
        <h2 className="text-xl font-bold text-magic-200 mb-4">{prompt.title}</h2>
        
        {/* 内容 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-magic-400 mb-2">内容</h4>
          <div className="bg-magic-800/50 border border-magic-700/30 rounded-md p-3 text-magic-200 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800">
            {prompt.content}
          </div>
        </div>
        
        {/* 元数据 */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center text-sm text-magic-400">
            <Clock className="w-4 h-4 mr-2" /> 
            <span>创建于: {created}</span>
          </div>
          {created !== updated && (
            <div className="flex items-center text-sm text-magic-400">
              <Clock className="w-4 h-4 mr-2" /> 
              <span>更新于: {updated}</span>
            </div>
          )}
          <div className="flex items-center text-sm text-magic-400">
            <Star className="w-4 h-4 mr-2" /> 
            <span>使用次数: {prompt.useCount || 0}</span>
          </div>
          <div className="flex items-center text-sm text-magic-400">
            <Clock className="w-4 h-4 mr-2" /> 
            <span>最后使用: {lastUsed}</span>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors"
          >
            <Copy className="w-4 h-4 mr-2" /> 复制内容
          </button>
          
          <button
            onClick={() => onEdit(prompt)}
            className="flex items-center justify-center px-4 py-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
          >
            <Pencil className="w-4 h-4 mr-2" /> 编辑提示词
          </button>
          
          <button
            onClick={handleToggleFavorite}
            className="flex items-center justify-center px-4 py-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
          >
            <Star className={`w-4 h-4 mr-2 ${prompt.isFavorite ? 'fill-magic-400' : ''}`} /> 
            {prompt.isFavorite ? '移出收藏夹' : '加入收藏夹'}
          </button>
          
          <button
            onClick={handleDelete}
            className="flex items-center justify-center px-4 py-2 bg-red-800/60 hover:bg-red-700/60 rounded-md text-red-200 transition-colors mt-4"
          >
            <Trash2 className="w-4 h-4 mr-2" /> 删除提示词
          </button>
        </div>
      </div>
    </div>
  );
} 