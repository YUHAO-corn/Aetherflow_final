import React, { useEffect } from 'react';
import { GenericAdapter } from './platformAdapter';
import { usePromptShortcut } from '../hooks/usePromptShortcut';
import type { Prompt } from '../services/prompt/types';

// 提示词快捷输入组件属性
export interface PromptShortcutProps {
  inputElement: HTMLElement;
  adapter: GenericAdapter;
  onClose: () => void;
  position: {
    top: number;
    left: number;
  };
}

/**
 * 提示词快捷输入组件
 * 纯UI组件，不包含业务逻辑
 */
export const PromptShortcutComponent: React.FC<PromptShortcutProps> = ({ 
  inputElement, 
  adapter, 
  onClose, 
  position 
}) => {
  console.log('[AetherFlow] 组件: PromptShortcutComponent渲染开始', { position });
  
  // 使用自定义钩子处理所有业务逻辑
  const {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    activeIndex,
    setActiveIndex,
    handleSelectPrompt,
    containerRef,
    searchInputRef
  } = usePromptShortcut(inputElement, adapter, onClose);

  // 记录关键状态变化
  useEffect(() => {
    console.log('[AetherFlow] 组件: 搜索词变化', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    console.log('[AetherFlow] 组件: 结果数量变化', results.length);
  }, [results.length]);

  useEffect(() => {
    console.log('[AetherFlow] 组件: 加载状态变化', loading);
  }, [loading]);
  
  // 纯UI渲染，不包含业务逻辑
  console.log('[AetherFlow] 组件: 开始渲染UI');
  return (
    <div 
      className="af-shortcut-container" 
      ref={containerRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <div className="af-shortcut-header">
        <input
          ref={searchInputRef}
          className="af-shortcut-search"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            console.log('[AetherFlow] 组件: 搜索输入变化', e.target.value);
            setSearchTerm(e.target.value);
          }}
          placeholder="搜索提示词..."
          autoFocus
        />
      </div>
      
      <div className="af-shortcut-list">
        {loading ? (
          <div className="af-shortcut-loading">
            <div className="af-shortcut-spinner"></div>
          </div>
        ) : results.length > 0 ? (
          results.map((prompt, index) => (
            <div
              key={prompt.id}
              className={`af-shortcut-item ${index === activeIndex ? 'af-active' : ''}`}
              onClick={() => {
                console.log('[AetherFlow] 组件: 点击提示词项', prompt.id);
                handleSelectPrompt(prompt);
              }}
              onMouseEnter={() => {
                console.log('[AetherFlow] 组件: 鼠标悬停提示词项', index);
                setActiveIndex(index);
              }}
            >
              <div className="af-shortcut-title">
                {prompt.title}
                {prompt.isFavorite && <span className="af-shortcut-favorite">★</span>}
              </div>
              <div className="af-shortcut-content">{prompt.content}</div>
            </div>
          ))
        ) : searchTerm ? (
          <div className="af-shortcut-empty">未找到匹配的提示词</div>
        ) : (
          <div className="af-shortcut-empty">输入关键词搜索提示词...</div>
        )}
      </div>
      
      <div className="af-shortcut-footer">
        <span>↑/↓: 导航</span>
        <span>Tab: 选择</span>
        <span>Esc: 取消</span>
      </div>
    </div>
  );
}; 