import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { usePromptsData } from '../../../hooks/usePromptsData';
import { Prompt } from '../../../services/prompt/types';

interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt?: Prompt; // 使用可选参数，而不是 null
}

export function PromptFormModal({ isOpen, onClose, prompt }: PromptFormModalProps) {
  const { addPrompt, updatePrompt } = usePromptsData();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFavorite, setIsFavorite] = useState(true); // 默认为收藏状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 编辑模式下，初始化表单数据
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setIsFavorite(true); // 始终设置为收藏状态
    } else {
      // 新建模式下重置表单
      setTitle('');
      setContent('');
      setIsFavorite(true); // 始终设置为收藏状态
    }
  }, [prompt, isOpen]);
  
  // 自动聚焦到标题输入框
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const titleInput = document.getElementById('prompt-title');
        if (titleInput) titleInput.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, title, content]);
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      if (prompt) {
        // 编辑现有提示词
        await updatePrompt(prompt.id, {
          title,
          content,
          isFavorite: true, // 始终设置为收藏状态
          updatedAt: Date.now()
        });
      } else {
        // 添加新提示词
        await addPrompt({
          title,
          content,
          isFavorite: true, // 始终设置为收藏状态
          tags: [],
          source: 'user'
        });
      }
      
      // 提交成功后关闭模态框
      onClose();
      
      // 清除错误消息
      setError(null);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setError('Failed to save prompt');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={prompt ? 'Edit Prompt' : 'Add Prompt'}
      className="max-w-lg"
    >
      <div className="p-4 space-y-4">
        {/* 错误消息 */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-md p-3 text-red-200">
            {error}
          </div>
        )}
        
        {/* 标题输入 */}
        <div>
          <label htmlFor="prompt-title" className="block text-sm font-medium text-magic-300 mb-1">
            Title
          </label>
          <Input
            id="prompt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter prompt title..."
            className="w-full"
          />
        </div>
        
        {/* 内容输入 */}
        <div>
          <label htmlFor="prompt-content" className="block text-sm font-medium text-magic-300 mb-1">
            Content
          </label>
          <textarea
            id="prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter prompt content..."
            rows={6}
            className="w-full p-3 bg-magic-800/50 border border-magic-600/30 rounded-md text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-600 focus:border-transparent transition-all resize-none scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-800"
          />
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
} 