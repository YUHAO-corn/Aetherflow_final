// PromptShortcutInjector.tsx - Prompt Shortcut Injector
import React from 'react';
import ReactDOM from 'react-dom';
import { PlatformAdapter } from './platformAdapter';
import { promptShortcutService, SearchInfo } from '../services/promptShortcut';
import { usePromptShortcutUI, HighlightedPart } from '../hooks/usePromptShortcutUI';
import { usePromptPosition } from '../hooks/usePromptPosition';
import { promptShortcutStyles } from '../styles/promptShortcut';

// Prompt shortcut component properties
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
 * Prompt Shortcut Component
 * Uses Hook to manage state and logic, component focuses on UI rendering
 */
function PromptShortcut({ inputElement, adapter, onClose, position, searchInfo }: PromptShortcutProps) {
  // Use Hook to manage state and logic
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
  
  // Render highlighted text
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
  
  // UI rendering, focuses on display
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
                {!displayTerm && <span className="af-shortcut-recommended-label">Recommended</span>}
              </div>
              <div className="af-shortcut-content">
                {renderHighlightedText(prompt.content, displayTerm)}
              </div>
            </div>
          ))
        ) : displayTerm ? (
          <div className="af-shortcut-empty">
            <div>No results found</div>
            <div className="mt-2 text-xs opacity-80">If you just installed or updated the extension, try refreshing the page.</div>
          </div>
        ) : (
          <div className="af-shortcut-empty">Continue typing to search...</div>
        )}
      </div>
      
      {/* Always display footer */}
      <div className="af-shortcut-footer">
        <span>↑/↓: Navigate</span>
        <span>Tab: Select</span>
        <span>Esc: Cancel</span>
      </div>
    </div>
  );
}

/**
 * Inject prompt shortcut functionality into the page
 * @param inputElement Input element
 * @param adapter Platform adapter
 * @param searchInfo Search information
 */
export function injectPromptShortcut(
  inputElement: HTMLElement, 
  adapter: PlatformAdapter,
  searchInfo: SearchInfo
) {
  console.log('[AetherFlow] Injecting prompt shortcut component', searchInfo);
  
  // Create style element (if it doesn't exist)
  let styleElement = document.getElementById('aetherflow-shortcut-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'aetherflow-shortcut-styles';
    styleElement.textContent = promptShortcutStyles;
    document.head.appendChild(styleElement);
    console.log('[AetherFlow] Style element injected');
  }
  
  // Get or create container for shortcut trigger component
  let shortcutContainerElement = document.getElementById('aetherflow-shortcut-container');
  if (!shortcutContainerElement) {
    shortcutContainerElement = document.createElement('div');
    shortcutContainerElement.id = 'aetherflow-shortcut-container';
    document.body.appendChild(shortcutContainerElement);
    console.log('[AetherFlow] Component container created');
  }
  
  // Use position calculation hook to calculate position (direct call rather than using React hook, actual calculation remains consistent)
  const inputRect = inputElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate cursor position
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
      // For textarea and input, we can only approximate cursor position
      cursorLeft = inputRect.left + 20; // simple offset
    }
  } catch (e) {
    console.error('[AetherFlow] Failed to calculate cursor position:', e);
  }
  
  // Adjust horizontal position to ensure it doesn't exceed the right boundary
  const floatWidth = 320; // float layer width
  if (cursorLeft + floatWidth > viewportWidth - 20) {
    cursorLeft = Math.max(20, viewportWidth - floatWidth - 20);
  }
  
  // Modified position calculation logic
  let positionTop;
  let showAbove = false;
  
  // If bottom space is insufficient, show above the input box
  if (cursorTop + 300 > viewportHeight - 20) { // 300 is the maximum height
    showAbove = true;
    // Key modification: Fix the bottom edge of the float layer above the cursor
    positionTop = inputRect.top - 10; // Fix the bottom edge 10px above the cursor
  } else {
    // Normal case, fix the top edge below the cursor
    positionTop = cursorTop;
  }
  
  const position = {
    top: positionTop + window.scrollY,
    left: cursorLeft + window.scrollX
  };
  
  console.log('[AetherFlow] Rendering shortcut component, position:', position);
  
  // Render shortcut component
  ReactDOM.render(
    <PromptShortcut
      inputElement={inputElement}
      adapter={adapter}
      onClose={(skipFutureShow) => {
        ReactDOM.unmountComponentAtNode(shortcutContainerElement);
        console.log('[AetherFlow] Component unmounted');
        
        if (skipFutureShow) {
          // Use service layer to dispatch event
          promptShortcutService.dispatchDismissedEvent(searchInfo.slashPosition, true);
          console.log('[AetherFlow] Disabled for current session');
        }
      }}
      position={position}
      searchInfo={searchInfo}
    />,
    shortcutContainerElement
  );
  
  // Use additional CSS class to control float layer position
  if (showAbove) {
    // Add max-height style to ensure positioning strategy is correctly applied
    const firstChild = shortcutContainerElement.firstChild as HTMLElement;
    if (firstChild) {
      firstChild.classList.add('af-shortcut-show-above');
    }
    
    // Add inline style
    const container = shortcutContainerElement.querySelector('.af-shortcut-container');
    if (container && container instanceof HTMLElement) {
      container.style.bottom = `calc(100vh - ${positionTop}px)`;
      container.style.top = 'auto';
      container.style.maxHeight = '300px'; // limit maximum height
    }
  }
   
  // Return cleanup function
  return () => {
    ReactDOM.unmountComponentAtNode(shortcutContainerElement);
    console.log('[AetherFlow] Component unmounted');
  };
} 