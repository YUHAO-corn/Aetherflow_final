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
  onClose: (skipFutureShow?: boolean) => void;
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
  
  // 修改搜索词长度检查逻辑
  useEffect(() => {
    // 调试日志，帮助排查问题
    console.log('[AetherFlow-DEBUG] 长度检查触发:', {
      term: searchInfo.searchTerm,
      results: results.length,
      loading,
      hasMatch: hasExactMatch
    });
    
    // 彻底禁用自动关闭逻辑
    // 只要满足以下任一条件就永不关闭:
    // 1. 结果数量大于0
    // 2. 正在搜索中(loading)
    // 3. hasExactMatch为true(有任何匹配)
    // 4. 空输入
    if (results.length > 0 || loading || hasExactMatch || !searchInfo.searchTerm.trim()) {
      // 有结果或正在加载或有匹配或空输入，都不关闭
      return;
    }
    
    const term = searchInfo.searchTerm.trim();
    
    // 中文输入法状态检测 - 进一步增强
    // 1. 纯拼音状态
    const isPinyinInput = /^[a-z\s]+$/i.test(term) && term.length < 30;
    // 2. 部分中文+拼音混合状态
    const isChineseWithPinyin = /[\u4e00-\u9fa5]/.test(term) && /[a-z]$/i.test(term);
    // 3. 纯英文输入状态
    const isEnglishInput = /^[a-zA-Z0-9\s.,!?;:'"()\-]+$/.test(term) && term.length < 50;
    // 4. 纯中文输入但在合理长度内
    const isReasonableChinese = /^[\u4e00-\u9fa5]+$/.test(term) && term.length < 20;
    
    // 如果符合上述任一条件，就不关闭
    if (isPinyinInput || isChineseWithPinyin || isEnglishInput || isReasonableChinese) {
      console.log('[AetherFlow-DEBUG] 输入状态合理，不关闭浮层:', {
        isPinyinInput,
        isChineseWithPinyin,
        isEnglishInput,
        isReasonableChinese,
        term
      });
      return;
    }
    
    // 极端情况：非常长的无意义输入且确定无匹配
    // 设置更大的阈值：中文30字符，英文60字符
    const isExtremeLongTerm = term.length > ((/[\u4e00-\u9fa5]/.test(term) ? 30 : 60));
    
    // 多次确认无匹配
    const definitelyNoMatches = results.length === 0 && 
                               !loading && 
                               hasExactMatch === false;
    
    // 极端情况关闭逻辑
    if (isExtremeLongTerm && definitelyNoMatches) {
      console.log('[AetherFlow-DEBUG] 输入超长且确定无匹配，准备关闭:', {
        termLength: term.length,
        term: term.substring(0, 20) + '...',
        noMatches: definitelyNoMatches
      });
      
      // 延迟关闭，并做二次确认
      setTimeout(() => {
        // 再次检查，防止在延迟期间状态变化
        if (results.length === 0 && !loading && hasExactMatch === false) {
          console.log('[AetherFlow-DEBUG] 确认关闭条件仍满足，执行关闭');
          onClose(true);
        } else {
          console.log('[AetherFlow-DEBUG] 关闭条件不再满足，取消关闭');
        }
      }, 1000); // 延长延迟到1秒，给足充分时间
    }
  }, [searchInfo.searchTerm, results.length, loading, hasExactMatch, onClose]);
  
  // 执行搜索的函数
  const performSearch = async (term: string) => {
    console.log('[AetherFlow-DEBUG] 开始执行搜索:', term);
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
        
        // 匹配判断逻辑全面改进
        let hasMatch = false;
        
        if (term.trim()) {
          const termLower = term.toLowerCase().trim();
          
          // 针对中文&拼音输入问题，进一步优化
          hasMatch = prompts.some(p => {
            // 直接包含
            if (p.title.toLowerCase().includes(termLower) || p.content.toLowerCase().includes(termLower)) {
              return true;
            }
            
            // 处理"润色以下学术段"这类场景：按字符匹配
            const termChars = Array.from(termLower);
            // 放宽条件：只要包含大部分字符即视为匹配(70%)
            const matchThreshold = Math.max(1, Math.floor(termChars.length * 0.7));
            let titleCharMatches = 0;
            let contentCharMatches = 0;
            
            const titleLower = p.title.toLowerCase();
            const contentLower = p.content.toLowerCase();
            
            termChars.forEach(char => {
              if (titleLower.includes(char)) titleCharMatches++;
              if (contentLower.includes(char)) contentCharMatches++;
            });
            
            // 超过阈值即视为匹配
            if (titleCharMatches >= matchThreshold || contentCharMatches >= matchThreshold) {
              return true;
            }
            
            // 处理拼音输入：将拼音视为拆分的单个字符
            if (/^[a-z\s]+$/i.test(termLower)) {
              // 拼音首字母匹配（针对"runse"→"润色"等情况）
              const pinyinInitials = termLower.split(/\s+/).map(word => word.charAt(0)).join('');
              if (titleLower.includes(pinyinInitials) || contentLower.includes(pinyinInitials)) {
                return true;
              }
            }
            
            // 特殊处理中文+拼音混合状态
            if (/[\u4e00-\u9fa5]/.test(termLower) && /[a-z]$/i.test(termLower)) {
              // 提取中文部分
              const chinesePart = termLower.match(/[\u4e00-\u9fa5]+/g)?.join('') || '';
              if (chinesePart && (titleLower.includes(chinesePart) || contentLower.includes(chinesePart))) {
                return true;
              }
            }
            
            // 如果是包含数字的场景（如Aetherflow123）
            if (/\d/.test(termLower)) {
              const nonNumericPart = termLower.replace(/\d+/g, '');
              if (nonNumericPart && (titleLower.includes(nonNumericPart) || contentLower.includes(nonNumericPart))) {
                return true;
              }
            }
            
            // 标签匹配
            if (p.tags && p.tags.some(tag => tag.toLowerCase().includes(termLower))) {
              return true;
            }
            
            return false;
          });
          
          // 无匹配时的退化规则：极度宽松的匹配
          if (!hasMatch) {
            // 1. 尝试使用前半部分进行匹配(适用于长句输入)
            const halfTerm = termLower.substring(0, Math.ceil(termLower.length / 2));
            if (halfTerm.length >= 2) { // 确保至少2个字符
              hasMatch = prompts.some(p => 
                p.title.toLowerCase().includes(halfTerm) || 
                p.content.toLowerCase().includes(halfTerm)
              );
            }
            
            // 2. 如果仍无匹配，仅使用前2个字符
            if (!hasMatch && termLower.length >= 2) {
              const firstChars = termLower.substring(0, 2);
              hasMatch = prompts.some(p => 
                p.title.toLowerCase().includes(firstChars) || 
                p.content.toLowerCase().includes(firstChars)
              );
            }
            
            // 3. 最终退化：如果是中文且长度>3，视为有潜在匹配
            if (!hasMatch && /[\u4e00-\u9fa5]/.test(termLower) && termLower.length >= 3) {
              console.log('[AetherFlow-DEBUG] 应用中文长输入特例规则，强制视为匹配');
              hasMatch = true; // 强制视为匹配，防止长中文输入关闭浮层
            }
          }
        } else {
          // 空搜索词始终视为匹配
          hasMatch = true;
        }
        
        console.log('[AetherFlow-DEBUG] 搜索完成:', {
          term,
          resultsCount: prompts.length,
          hasMatch: hasMatch,
          exampleResults: prompts.slice(0, 2).map(p => p.title)
        });
        
        // 更新状态
        setResults(prompts);
        setHasExactMatch(hasMatch);
        
        // 新增：通知父组件搜索结果状态，用于飞书触发逻辑
        if (prompts.length === 0 && term.trim() && !hasMatch) {
          // 无匹配结果，发送事件通知父组件增加noMatchCount
          window.dispatchEvent(new CustomEvent('aetherflow-search-no-match', {
            detail: { term }
          }));
        }
      } else {
        console.log('[AetherFlow-DEBUG] 搜索无结果');
        // 即使无结果，对于中文输入也尽量保持浮层
        const isChinese = /[\u4e00-\u9fa5]/.test(term);
        const forcedMatch = isChinese && term.length > 3;
        
        setResults([]);
        setHasExactMatch(forcedMatch); // 中文长度>3时强制保持浮层
      }
    } catch (error) {
      console.error('[AetherFlow] 搜索提示词失败:', error);
      setResults([]);
      
      // 即使出错，对于中文输入也尽量保持浮层
      const isChinese = /[\u4e00-\u9fa5]/.test(term);
      const forcedMatch = isChinese && term.length > 3;
      setHasExactMatch(forcedMatch);
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
      // 添加左右键处理，移动光标时退出联想
      if (e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose(true);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Tab' && results.length > 0 && activeIndex >= 0) {
          e.preventDefault();
          handleSelectPrompt(results[activeIndex]);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // 左右键移动光标时关闭浮层
          onClose();
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
        onClose(true);
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
      
      {/* 确保footer始终显示 */}
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
  
  // 修改位置计算逻辑
  let positionTop;
  let showAbove = false;
  
  // 如果底部空间不足则显示在输入框上方
  if (cursorTop + 300 > viewportHeight - 20) { // 300是最大高度
    showAbove = true;
    // 关键修改：将浮层下边缘固定在光标上方
    positionTop = inputRect.top - 10; // 固定下边缘在光标上方10px处
  } else {
    // 正常情况，上边缘固定在光标下方
    positionTop = cursorTop;
  }
  
  const position = {
    top: positionTop + window.scrollY,
    left: cursorLeft + window.scrollX
  };
  
  console.log('[AetherFlow] 渲染快捷输入组件, 位置:', position);
  
  // 渲染快捷输入组件
  ReactDOM.render(
    <PromptShortcut
      inputElement={inputElement}
      adapter={adapter}
      onClose={(skipFutureShow) => {
        console.log('[AetherFlow] 关闭快捷输入组件');
        // 卸载组件但不删除容器，以便重用
        ReactDOM.unmountComponentAtNode(shortcutContainerElement);
        
        // 如果是由于无匹配结果关闭的，告知父组件不要再显示
        if (skipFutureShow) {
          // 向父组件传递一个标记，表示这次"/"触发周期结束，不再显示
          window.dispatchEvent(new CustomEvent('aetherflow-shortcut-dismissed', {
            detail: { 
              slashPosition: searchInfo.slashPosition,
              // 添加标记，表示是用户手动关闭的
              manualClosed: true
            }
          }));
        }
      }}
      position={position}
      searchInfo={searchInfo}
    />,
    shortcutContainerElement
  );
  
  // 使用额外的CSS类控制浮层位置
  if (showAbove) {
    // 添加max-height样式，确保位置策略正确应用
    const firstChild = shortcutContainerElement.firstChild as HTMLElement;
    if (firstChild) {
      firstChild.classList.add('af-shortcut-show-above');
    }
    
    // 添加内联样式
    const container = shortcutContainerElement.querySelector('.af-shortcut-container');
    if (container && container instanceof HTMLElement) {
      container.style.bottom = `calc(100vh - ${positionTop}px)`;
      container.style.top = 'auto';
      container.style.maxHeight = '300px'; // 限制最大高度
    }
  }
  
  // 返回清理函数
  return () => {
    console.log('[AetherFlow] 清理快捷输入组件');
    
    // 卸载组件
    if (shortcutContainerElement) {
      ReactDOM.unmountComponentAtNode(shortcutContainerElement);
    }
  };
} 