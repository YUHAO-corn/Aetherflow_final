import React, { useState, useEffect } from 'react';
import { X, Copy, Heart, HeartOff, Clock, Star, Check } from 'lucide-react';
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
  // 添加本地状态以跟踪最新的提示词内容
  const [localPrompt, setLocalPrompt] = useState<Prompt | undefined>(prompt);
  // 添加复制成功的状态标记
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 每次打开或提示词更新时，更新编辑状态和本地提示词
  useEffect(() => {
    if (prompt) {
      setEditTitle(prompt.title);
      setEditContent(prompt.content);
      setLocalPrompt(prompt);
    }
  }, [prompt, isOpen]);
  
  // 复制成功后的反馈效果
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false);
      }, 2000); // 2秒后恢复按钮状态
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);
  
  // 如果没有提示词或抽屉关闭，则不显示任何内容
  if (!isOpen || !localPrompt) return null;
  
  // 格式化日期 - 使用本地提示词数据
  const created = formatDate(localPrompt.createdAt);
  const updated = formatDate(localPrompt.updatedAt);
  const lastUsed = localPrompt.lastUsed ? formatDate(localPrompt.lastUsed) : '从未使用';
  
  // 处理复制提示词
  const handleCopy = () => {
    navigator.clipboard.writeText(localPrompt.content)
      .then(() => {
        incrementUseCount(localPrompt.id);
        setCopySuccess(true);
      })
      .catch(err => {
        console.error('复制失败:', err);
        // 也可以在这里显示错误反馈
      });
  };
  
  // 处理删除提示词
  const handleDelete = async () => {
    if (window.confirm('确定要取消收藏这个提示词吗？')) {
      await deletePrompt(localPrompt.id);
      onClose();
    }
  };

  // 处理开始编辑标题
  const handleStartEditTitle = () => {
    setEditTitle(localPrompt.title);
    setIsTitleEditing(true);
  };

  // 处理开始编辑内容
  const handleStartEditContent = () => {
    setEditContent(localPrompt.content);
    setIsContentEditing(true);
  };

  // 处理保存编辑
  const handleSaveEdit = async () => {
    console.log("保存编辑被触发", { 
      isTitleEditing, 
      isContentEditing, 
      editTitle, 
      editContent 
    });
    
    if (isTitleEditing || isContentEditing) {
      const now = Date.now();
      const updatedPrompt = { 
        ...localPrompt,
        title: isTitleEditing ? editTitle : localPrompt.title,
        content: isContentEditing ? editContent : localPrompt.content,
        updatedAt: now
      };
      
      console.log("更新的提示词数据:", updatedPrompt);
      
      // 直接更新提示词，不显示模态窗口
      try {
        // 这里使用updatePrompt而不是onEdit来避免显示模态窗口
        if (updatePrompt) {
          // 提取更新内容
          const { id, ...updateInput } = updatedPrompt;
          console.log("调用 updatePrompt 函数，更新ID:", id);
          
          // 先更新本地状态，使UI立即响应
          setLocalPrompt(updatedPrompt);
          
          // 然后更新到服务端/存储中
          const success = await updatePrompt(id, updateInput);
          
          if (!success) {
            console.error("更新提示词失败");
            // 如果更新失败，可以考虑回滚本地状态
            // setLocalPrompt(prompt);
          }
        } else {
          // 如果没有updatePrompt函数，仍然可以使用onEdit，但这可能会打开模态窗口
          console.warn('updatePrompt not available, using onEdit instead');
          setLocalPrompt(updatedPrompt); // 仍然更新本地状态
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
    <div className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-br from-magic-800 to-magic-900 border-l border-magic-700/30 shadow-xl z-30 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between p-4 border-b border-magic-700/30 flex-shrink-0">
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
      
      {/* 抽屉内容 - 使用flex-1和overflow-y-auto使内容区域可滚动 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 标题 */}
        {isTitleEditing ? (
          <div className="mb-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              className="w-full bg-magic-800 border border-magic-600 rounded-md p-2 text-lg font-bold text-magic-200 mb-2"
              autoFocus
            />
            <div className="text-xs text-magic-400">按回车保存或点击外部保存</div>
          </div>
        ) : (
          <h2 
            className="text-lg font-bold text-magic-200 mb-4 cursor-text"
            onDoubleClick={handleStartEditTitle}
            title="双击编辑标题"
          >
            {localPrompt.title}
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
              className="bg-magic-800/50 border border-magic-700/30 rounded-md p-3 text-magic-200 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800 cursor-text whitespace-pre-line"
              onDoubleClick={handleStartEditContent}
              title="双击编辑内容"
            >
              {localPrompt.content}
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
            <span>使用次数: {localPrompt.useCount || 0}</span>
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
            onClick={handleDelete}
            className="flex items-center justify-center px-4 py-2 bg-red-800/60 hover:bg-red-700/60 rounded-md text-red-200 transition-colors mt-4"
          >
            <Star className="w-4 h-4 mr-2" /> 移出收藏夹
          </button>
        </div>
      </div>
    </div>
  );
} 