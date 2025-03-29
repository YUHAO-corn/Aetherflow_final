// PromptShortcutInjector.tsx - 提示词快捷输入注入器
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  border-bottom: 1px solid #2f3146;
}

.af-shortcut-header-icon {
  margin-right: 6px;
  color: #8357f6;
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
  scrollbar-width: thin;
  scrollbar-color: #3f4565 transparent;
}

.af-shortcut-list::-webkit-scrollbar {
  width: 6px;
}

.af-shortcut-list::-webkit-scrollbar-track {
  background: transparent;
}

.af-shortcut-list::-webkit-scrollbar-thumb {
  background-color: #3f4565;
  border-radius: 3px;
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

.af-shortcut-highlight {
  background-color: rgba(131, 87, 246, 0.3);
  padding: 0 2px;
  border-radius: 2px;
}

.af-shortcut-recommended-label {
  font-size: 11px;
  color: #8357f6;
  margin-left: 5px;
  padding: 1px 5px;
  background-color: rgba(131, 87, 246, 0.1);
  border-radius: 3px;
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
  searchInfo: {
    slashPosition: number;
    searchTerm: string;
  };
}

/**
 * 提示词快捷输入组件
 */
function PromptShortcut({ inputElement, adapter, onClose, position, searchInfo }: PromptShortcutProps) {
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasExactMatch, setHasExactMatch] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchInfo.searchTerm);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 初始化时执行一次搜索，确保始终显示结果
  useEffect(() => {
    // 初始加载时立即搜索一次
    performSearch(searchInfo.searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 搜索词长度超过限制且没有匹配结果时自动关闭
  useEffect(() => {
    const term = searchInfo.searchTerm.trim();
    if (term.length > 5 && results.length === 0 && !loading && !hasExactMatch) {
      console.log('[AetherFlow] 搜索词超过5个字符且无匹配结果，自动关闭');
      setTimeout(() => {
        onClose();
      }, 500); // 延迟500ms关闭，给用户一个反馈的机会
    }
  }, [searchInfo.searchTerm, results.length, loading, hasExactMatch, onClose]);
  
  // 执行搜索的函数
  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      // 搜索请求参数
      const searchParams = {
        searchTerm: term.trim(),
        limit: 10,
        // 根据搜索词是否为空决定排序方式
        sortBy: term.trim() ? 'relevance' : 'usage'
      };
      
      console.log('[AetherFlow] 执行搜索:', searchParams);
      
      // 向background发送消息，请求提示词搜索
      const response = await sendMessage({
        type: 'SEARCH_PROMPTS',
        payload: searchParams
      });
      
      if (Array.isArray(response)) {
        const prompts = response as Prompt[];
        setResults(prompts);
        
        // 判断是否有精确匹配
        if (term.trim()) {
          const exactMatches = prompts.filter(p => 
            p.title.toLowerCase().includes(term.toLowerCase()) || 
            p.content.toLowerCase().includes(term.toLowerCase())
          );
          setHasExactMatch(exactMatches.length > 0);
        } else {
          setHasExactMatch(true); // 空搜索词时始终有匹配（显示推荐）
        }
        
        console.log(`[AetherFlow] 搜索完成, 结果数量: ${prompts.length}, 精确匹配: ${hasExactMatch}`);
      } else {
        setResults([]);
        setHasExactMatch(false);
      }
    } catch (error) {
      console.error('[AetherFlow] 搜索提示词失败:', error);
      setResults([]);
      setHasExactMatch(false);
    } finally {
      setLoading(false);
    }
  };
  
  // 当搜索词变化时执行搜索
  useEffect(() => {
    if (searchInfo.searchTerm !== currentSearchTerm) {
      setCurrentSearchTerm(searchInfo.searchTerm);
      performSearch(searchInfo.searchTerm);
      // 重置活跃索引
      setActiveIndex(0);
    }
  }, [searchInfo.searchTerm, currentSearchTerm]);
  
  // 监听输入框变化，实时更新搜索
  useEffect(() => {
    const handleInput = () => {
      const text = adapter.getText(inputElement);
      // 确保斜杠位置存在
      if (searchInfo.slashPosition < text.length && text[searchInfo.slashPosition] === '/') {
        // 提取当前搜索词
        const currentTerm = text.substring(searchInfo.slashPosition + 1);
        // 如果搜索词变化了，更新状态
        if (currentTerm !== currentSearchTerm) {
          setCurrentSearchTerm(currentTerm);
          performSearch(currentTerm);
        }
      } else {
        // 如果斜杠位置不再存在，关闭面板
        onClose();
      }
    };
    
    inputElement.addEventListener('input', handleInput);
    
    return () => {
      inputElement.removeEventListener('input', handleInput);
    };
  }, [adapter, inputElement, onClose, searchInfo.slashPosition, currentSearchTerm]);
  
  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只处理可能的导航键
      if (e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') {
        
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Tab' && results.length > 0 && activeIndex >= 0) {
          e.preventDefault();
          handleSelectPrompt(results[activeIndex]);
        }
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
      console.log('[AetherFlow] 选择提示词:', prompt.title);
      
      // 获取当前输入框文本
      const currentText = adapter.getText(inputElement);
      
      // 计算要替换的范围
      const startPos = searchInfo.slashPosition;
      const endPos = searchInfo.slashPosition + currentSearchTerm.length + 1; // +1 是为了包含"/"
      
      // 组合新文本：前部分 + 提示词内容 + 后部分
      const newText = currentText.substring(0, startPos) + 
                    prompt.content + 
                    currentText.substring(endPos);
      
      // 应用新文本并设置光标
      const newCursorPos = startPos + prompt.content.length;
      console.log('[AetherFlow] 替换文本:', {
        startPos,
        endPos,
        newCursorPos,
        originalText: currentText,
        newText
      });
      
      adapter.replaceTextAndSetCursor(inputElement, newText, newCursorPos);
      adapter.triggerInputEvent(inputElement);
      
      // 增加使用次数
      await sendMessage({
        type: 'INCREMENT_PROMPT_USE',
        payload: prompt.id
      });
      
      // 关闭面板
      onClose();
    } catch (error) {
      console.error('[AetherFlow] 插入提示词失败:', error);
    }
  };
  
  // 高亮关键词
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    
    try {
      const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === keyword.toLowerCase() ? 
          <span key={i} className="af-shortcut-highlight">{part}</span> : part
      );
    } catch (e) {
      return text;
    }
  };
  
  // 获取当前搜索词
  const displayTerm = currentSearchTerm || '';
  
  // 确定需要显示的标题文本
  const headerTitle = displayTerm 
    ? `提示词搜索: ${displayTerm}` 
    : '推荐提示词';
  
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
        <span className="af-shortcut-header-icon">/</span>
        <span>{headerTitle}</span>
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
                {highlightKeyword(prompt.title, displayTerm)}
                {prompt.isFavorite && <span className="af-shortcut-favorite">★</span>}
                {!displayTerm && <span className="af-shortcut-recommended-label">推荐</span>}
              </div>
              <div className="af-shortcut-content">
                {highlightKeyword(prompt.content, displayTerm)}
              </div>
            </div>
          ))
        ) : displayTerm ? (
          <div className="af-shortcut-empty">未能找到相关结果</div>
        ) : (
          <div className="af-shortcut-empty">继续输入关键词进行搜索...</div>
        )}
      </div>
      
      <div className="af-shortcut-footer">
        <span>↑/↓: 导航</span>
        <span>Tab: 选择</span>
        <span>Esc: 取消</span>
      </div>
    </div>
  );
}

/**
 * 注入提示词快捷输入功能到页面
 * @param inputElement 输入框元素
 * @param adapter 平台适配器
 * @param searchInfo 搜索信息
 */
export function injectPromptShortcut(
  inputElement: HTMLElement, 
  adapter: PlatformAdapter,
  searchInfo: { slashPosition: number; searchTerm: string }
) {
  console.log('[AetherFlow] 注入提示词快捷输入组件', searchInfo);
  
  // 创建样式元素（如果不存在）
  let styleElement = document.getElementById('aetherflow-shortcut-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'aetherflow-shortcut-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    console.log('[AetherFlow] 注入样式元素');
  }
  
  // 获取或创建快捷键触发器组件的容器
  let shortcutContainerElement = document.getElementById('aetherflow-shortcut-container');
  if (!shortcutContainerElement) {
    shortcutContainerElement = document.createElement('div');
    shortcutContainerElement.id = 'aetherflow-shortcut-container';
    document.body.appendChild(shortcutContainerElement);
    console.log('[AetherFlow] 创建组件容器');
  }
  
  // 计算显示位置
  const inputRect = inputElement.getBoundingClientRect();
  
  // 计算光标位置
  let cursorLeft = inputRect.left;
  let cursorTop = inputRect.bottom;
  
  try {
    if (window.getSelection && inputElement.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          cursorLeft = rects[0].left;
          cursorTop = rects[0].bottom;
        }
      }
    } else if (inputElement instanceof HTMLTextAreaElement || inputElement instanceof HTMLInputElement) {
      // 对于textarea和input，我们只能近似光标位置
      cursorLeft = inputRect.left + 20; // 简单偏移
    }
  } catch (e) {
    console.error('[AetherFlow] 计算光标位置失败:', e);
  }
  
  // 确保浮层在可视范围内
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 调整水平位置，确保不超出右边界
  const floatWidth = 320; // 浮层宽度
  if (cursorLeft + floatWidth > viewportWidth - 20) {
    cursorLeft = Math.max(20, viewportWidth - floatWidth - 20);
  }
  
  // 调整垂直位置，如果底部空间不足则显示在输入框上方
  const floatHeight = 300; // 浮层高度
  if (cursorTop + floatHeight > viewportHeight - 20) {
    cursorTop = Math.max(20, inputRect.top - floatHeight);
  }
  
  const position = {
    top: cursorTop + window.scrollY,
    left: cursorLeft + window.scrollX
  };
  
  console.log('[AetherFlow] 渲染快捷输入组件, 位置:', position);
  
  // 渲染快捷输入组件
  ReactDOM.render(
    <PromptShortcut
      inputElement={inputElement}
      adapter={adapter}
      onClose={() => {
        console.log('[AetherFlow] 关闭快捷输入组件');
        // 卸载组件但不删除容器，以便重用
        ReactDOM.unmountComponentAtNode(shortcutContainerElement);
      }}
      position={position}
      searchInfo={searchInfo}
    />,
    shortcutContainerElement
  );
  
  // 返回清理函数
  return () => {
    console.log('[AetherFlow] 清理快捷输入组件');
    
    // 卸载组件
    if (shortcutContainerElement) {
      ReactDOM.unmountComponentAtNode(shortcutContainerElement);
    }
  };
} 