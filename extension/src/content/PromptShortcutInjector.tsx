// PromptShortcutInjector.tsx - 提示词快捷输入注入器
import React from 'react';
import ReactDOM from 'react-dom';
import { PlatformAdapter } from './platformAdapter';
import { promptShortcutService, SearchInfo } from '../services/promptShortcut';
import { usePromptShortcutUI, HighlightedPart } from '../hooks/usePromptShortcutUI';
import { usePromptPosition } from '../hooks/usePromptPosition';
import { promptShortcutStyles } from '../styles/promptShortcut';

// 提示词快捷输入组件属性
interface PromptShortcutProps {
  inputElement: HTMLElement;
  adapter: PlatformAdapter;
  onClose: (skipFutureShow?: boolean) => void;
  position: {
    top: number;
    left: number;
  };
  searchInfo: SearchInfo;
}

/**
 * 提示词快捷输入组件
 * 使用Hook管理状态和逻辑，组件专注于UI渲染
 */
function PromptShortcut({ inputElement, adapter, onClose, position, searchInfo }: PromptShortcutProps) {
  // 使用Hook管理状态和逻辑
  const {
    results,
    loading,
    activeIndex,
    displayTerm,
    headerTitle,
    containerRef,
    setActiveIndex,
    handleSelectPrompt,
    highlightKeyword
  } = usePromptShortcutUI(inputElement, adapter, searchInfo, onClose);
  
  // 渲染高亮文本
  const renderHighlightedText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    
    try {
      const highlightedParts = highlightKeyword(text, keyword);
      return highlightedParts.map((part, index) => 
        part.isHighlight ? 
          <span key={index} className="af-shortcut-highlight">{part.text}</span> : part.text
      );
    } catch (e) {
      return text;
    }
  };
  
  // UI渲染，专注于展示
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
                {renderHighlightedText(prompt.title, displayTerm)}
                {prompt.isFavorite && <span className="af-shortcut-favorite">★</span>}
                {!displayTerm && <span className="af-shortcut-recommended-label">推荐</span>}
              </div>
              <div className="af-shortcut-content">
                {renderHighlightedText(prompt.content, displayTerm)}
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
  searchInfo: SearchInfo
) {
  console.log('[AetherFlow] 注入提示词快捷输入组件', searchInfo);
  
  // 创建样式元素（如果不存在）
  let styleElement = document.getElementById('aetherflow-shortcut-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'aetherflow-shortcut-styles';
    styleElement.textContent = promptShortcutStyles;
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
  
  // 使用位置计算钩子计算位置（直接调用而非使用React钩子，实际计算保持一致）
  const inputRect = inputElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
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
          // 使用服务层发送事件
          promptShortcutService.dispatchDismissedEvent(searchInfo.slashPosition, true);
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