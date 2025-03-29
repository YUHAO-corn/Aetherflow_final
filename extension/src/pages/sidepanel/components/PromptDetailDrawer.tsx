import React, { useState, useEffect } from 'react';
import { X, Copy, Heart, HeartOff, Clock, Star } from 'lucide-react';
import { Prompt } from '../../../services/prompt/types';
import { usePromptsData } from '../../../hooks/usePromptsData';
import { formatDate } from '../../../utils/formatDate';

interface PromptDetailDrawerProps {
  prompt: Prompt | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prompt: Prompt) => void;
}

export function PromptDetailDrawer({ prompt, isOpen, onClose, onEdit }: PromptDetailDrawerProps) {
  const { incrementUseCount, toggleFavorite, deletePrompt, updatePrompt } = usePromptsData();
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isContentEditing, setIsContentEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  
  // 每次打开时更新编辑状态
  useEffect(() => {
    if (prompt) {
      setEditTitle(prompt.title);
      setEditContent(prompt.content);
    }
  }, [prompt]);
  
  if (!isOpen || !prompt) return null;
  
  // 格式化日期
  const created = formatDate(prompt.createdAt);
  const updated = formatDate(prompt.updatedAt);
  const lastUsed = prompt.lastUsed ? formatDate(prompt.lastUsed) : '从未使用';
  
  // 处理复制提示词
  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    incrementUseCount(prompt.id);
  };
  
  // 处理删除提示词
  const handleDelete = async () => {
    if (window.confirm('确定要取消收藏这个提示词吗？')) {
      await deletePrompt(prompt.id);
      onClose();
    }
  };

  // 处理开始编辑标题
  const handleStartEditTitle = () => {
    setEditTitle(prompt.title);
    setIsTitleEditing(true);
  };

  // 处理开始编辑内容
  const handleStartEditContent = () => {
    setEditContent(prompt.content);
    setIsContentEditing(true);
  };

  // 处理保存编辑
  const handleSaveEdit = () => {
    console.log("保存编辑被触发", { 
      isTitleEditing, 
      isContentEditing, 
      editTitle, 
      editContent 
    });
    
    if (isTitleEditing || isContentEditing) {
      const updatedPrompt = { 
        ...prompt,
        title: isTitleEditing ? editTitle : prompt.title,
        content: isContentEditing ? editContent : prompt.content,
        updatedAt: Date.now()
      };
      
      console.log("更新的提示词数据:", updatedPrompt);
      
      // 直接更新提示词，不显示模态窗口
      try {
        // 这里使用updatePrompt而不是onEdit来避免显示模态窗口
        if (updatePrompt) {
          // 提取更新内容
          const { id, ...updateInput } = updatedPrompt;
          console.log("调用 updatePrompt 函数，更新ID:", id);
          updatePrompt(id, updateInput);
        } else {
          // 如果没有updatePrompt函数，仍然可以使用onEdit，但这可能会打开模态窗口
          console.warn('updatePrompt not available, using onEdit instead');
          onEdit(updatedPrompt);
        }
      } catch (error) {
        console.error('Failed to update prompt:', error);
      }
      
      setIsTitleEditing(false);
      setIsContentEditing(false);
    }
  };

  // 强制保存编辑的处理器
  const handleForceSave = () => {
    if (isContentEditing || isTitleEditing) {
      handleSaveEdit();
    }
  };
  
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-br from-magic-800 to-magic-900 border-l border-magic-700/30 shadow-xl z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
        <h3 className="text-lg font-semibold text-magic-200 truncate">提示词详情</h3>
        <button
          onClick={() => {
            handleForceSave();
            onClose();
          }}
          className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-magic-400" />
        </button>
      </div>
      
      {/* 抽屉内容 */}
      <div className="p-4">
        {/* 标题 */}
        {isTitleEditing ? (
          <div className="mb-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              className="w-full bg-magic-800 border border-magic-600 rounded-md p-2 text-xl font-bold text-magic-200 mb-2"
              autoFocus
            />
            <div className="text-xs text-magic-400">按回车保存或点击外部保存</div>
          </div>
        ) : (
          <h2 
            className="text-xl font-bold text-magic-200 mb-4 cursor-text"
            onDoubleClick={handleStartEditTitle}
            title="双击编辑标题"
          >
            {prompt.title}
          </h2>
        )}
        
        {/* 内容 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-magic-400 mb-2">内容</h4>
          {isContentEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleSaveEdit}
                className="w-full bg-magic-800 border border-magic-600 rounded-md p-3 text-magic-200 max-h-[300px] min-h-[150px] scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800"
                autoFocus
              />
              <div className="text-xs text-magic-400 mt-1">点击外部保存</div>
            </div>
          ) : (
            <div 
              className="bg-magic-800/50 border border-magic-700/30 rounded-md p-3 text-magic-200 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800 cursor-text"
              onDoubleClick={handleStartEditContent}
              title="双击编辑内容"
            >
              {prompt.content}
            </div>
          )}
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
          {(isTitleEditing || isContentEditing) && (
            <button
              onClick={handleSaveEdit}
              className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md text-white transition-colors"
            >
              保存修改
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="flex items-center justify-center px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors"
          >
            <Copy className="w-4 h-4 mr-2" /> 复制内容
          </button>
          
          <button
            onClick={handleDelete}
            className="flex items-center justify-center px-4 py-2 bg-red-800/60 hover:bg-red-700/60 rounded-md text-red-200 transition-colors mt-4"
          >
            <HeartOff className="w-4 h-4 mr-2" /> 取消收藏
          </button>
        </div>
      </div>
    </div>
  );
} 