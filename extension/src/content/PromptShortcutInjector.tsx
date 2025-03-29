// PromptShortcutInjector.tsx - 提示词快捷输入注入器
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AIPlatformType } from './platformDetector';
import { PlatformAdapter } from './platformAdapter';
import { addMessageListener, sendMessage } from '../services/messaging';
import type { Message } from '../services/messaging/types';
import type { Prompt } from '../services/prompt/types';

// 快捷输入组件的CSS样式
const styles = `
.af-shortcut-container {
  position: absolute;
  width: 320px;
  max-height: 300px;
  background-color: #1a1c2a;
  border: 1px solid #2f3146;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
  color: #e2e8f0;
}

.af-shortcut-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #2f3146;
}

.af-shortcut-search {
  width: 100%;
  background-color: #252736;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
}

.af-shortcut-list {
  max-height: 250px;
  overflow-y: auto;
  padding: 6px;
}

.af-shortcut-item {
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background-color 0.2s;
}

.af-shortcut-item:hover {
  background-color: #252736;
}

.af-shortcut-item.af-active {
  background-color: #323552;
}

.af-shortcut-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.af-shortcut-content {
  font-size: 12px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.af-shortcut-favorite {
  color: #f0d166;
  margin-left: 4px;
}

.af-shortcut-empty {
  padding: 12px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.af-shortcut-footer {
  padding: 8px 12px;
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px solid #2f3146;
  display: flex;
  justify-content: space-between;
}

.af-shortcut-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.af-shortcut-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #3f4565;
  border-bottom-color: #8357f6;
  border-radius: 50%;
  animation: af-spinner 1s linear infinite;
}

@keyframes af-spinner {
  to { transform: rotate(360deg); }
}
`;

// 提示词快捷输入组件属性
interface PromptShortcutProps {
  inputElement: HTMLElement;
  adapter: PlatformAdapter;
  onClose: () => void;
  position: {
    top: number;
    left: number;
  };
}

/**
 * 提示词快捷输入组件
 */
function PromptShortcut({ inputElement, adapter, onClose, position }: PromptShortcutProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 搜索提示词
  useEffect(() => {
    const search = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        // 向background发送消息，请求提示词搜索
        const response = await sendMessage({
          type: 'SEARCH_PROMPTS',
          payload: {
            keyword: searchTerm,
            limit: 8
          }
        });
        
        if (Array.isArray(response)) {
          setResults(response as Prompt[]);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('搜索提示词失败:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    search();
  }, [searchTerm]);
  
  // 自动聚焦搜索框
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);
  
  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results.length > 0 && activeIndex >= 0) {
        e.preventDefault();
        handleSelectPrompt(results[activeIndex]);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [results, activeIndex, onClose]);
  
  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // 处理提示词选择
  const handleSelectPrompt = async (prompt: Prompt) => {
    try {
      // 向输入框插入文本
      adapter.insertText(inputElement, prompt.content);
      adapter.triggerInputEvent(inputElement);
      
      // 增加使用次数
      await sendMessage({
        type: 'INCREMENT_PROMPT_USE',
        payload: prompt.id
      });
      
      onClose();
    } catch (error) {
      console.error('插入提示词失败:', error);
    }
  };
  
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
          onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={() => handleSelectPrompt(prompt)}
              onMouseEnter={() => setActiveIndex(index)}
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
        <span>Enter: 选择</span>
        <span>Esc: 取消</span>
      </div>
    </div>
  );
}

/**
 * 注入提示词快捷输入功能到页面
 * @param inputElement 输入框元素
 * @param adapter 平台适配器
 */
export function injectPromptShortcut(inputElement: HTMLElement, adapter: PlatformAdapter) {
  // 创建样式元素
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  
  // 创建快捷键触发器组件的容器
  const shortcutContainerElement = document.createElement('div');
  shortcutContainerElement.id = 'aetherflow-shortcut-container';
  document.body.appendChild(shortcutContainerElement);
  
  // 初始化快捷键状态
  let isShortcutActive = false;
  
  // 监听输入框的键盘事件
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/' && !isShortcutActive) {
      e.preventDefault();
      isShortcutActive = true;
      
      // 计算显示位置
      const inputRect = inputElement.getBoundingClientRect();
      const position = {
        top: inputRect.top,
        left: inputRect.left
      };
      
      // 渲染快捷输入组件
      ReactDOM.render(
        <PromptShortcut
          inputElement={inputElement}
          adapter={adapter}
          onClose={() => {
            isShortcutActive = false;
            ReactDOM.unmountComponentAtNode(shortcutContainerElement);
          }}
          position={position}
        />,
        shortcutContainerElement
      );
    }
  };
  
  // 添加事件监听器
  inputElement.addEventListener('keydown', handleKeyDown);
  
  // 返回清理函数
  return () => {
    // 移除事件监听器
    inputElement.removeEventListener('keydown', handleKeyDown);
    
    // 移除样式和容器元素
    if (styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    
    if (shortcutContainerElement.parentNode) {
      ReactDOM.unmountComponentAtNode(shortcutContainerElement);
      shortcutContainerElement.parentNode.removeChild(shortcutContainerElement);
    }
  };
} 