import { useState, useEffect, useRef, useCallback } from 'react';
import { PlatformAdapter } from '../content/platformAdapter';
import { SearchInfo, promptShortcutService } from '../services/promptShortcut';
import { Prompt } from '../services/prompt/types';
import { sendMessage } from '../services/messaging';

export interface HighlightedPart {
  text: string;
  isHighlight: boolean;
}

/**
 * 提示词快捷输入UI Hook
 * 负责管理UI状态和逻辑，连接服务层和UI组件
 */
export function usePromptShortcutUI(
  inputElement: HTMLElement,
  adapter: PlatformAdapter,
  searchInfo: SearchInfo,
  onClose: (skipFutureShow?: boolean) => void
) {
  // UI状态管理
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasExactMatch, setHasExactMatch] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchInfo.searchTerm);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 执行搜索，保持与原函数相同的行为
  const performSearch = useCallback(async (term: string) => {
    console.log('[AetherFlow-DEBUG] Hook: 开始执行搜索:', term);
    setLoading(true);
    try {
      // 搜索请求参数
      const searchParams = {
        searchTerm: term.trim(),
        limit: 10,
        // 根据搜索词是否为空决定排序方式
        sortBy: term.trim() ? 'relevance' : 'usage'
      };
      
      // 向background发送消息，请求提示词搜索
      const response = await sendMessage({
        type: 'SEARCH_PROMPTS',
        payload: searchParams
      });
      
      if (Array.isArray(response)) {
        const prompts = response as Prompt[];
        
        // 匹配判断逻辑全面改进 - 保持与原函数完全相同的行为
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
            
            // 英文输入特殊处理：检查首字母缩写
            if (/^[a-z\s]+$/i.test(termLower)) {
              // 提取单词首字母
              const acronym = termLower.split(/\s+/).map(word => word.charAt(0)).join('');
              if (titleLower.includes(acronym) || contentLower.includes(acronym)) {
                return true;
              }
            }
            
            // 中文拼音混合输入：提取中文部分再匹配
            if (/[\u4e00-\u9fa5]/.test(termLower) && /[a-z]$/i.test(termLower)) {
              const chineseChars = termLower.match(/[\u4e00-\u9fa5]+/g)?.join('') || '';
              if (chineseChars && (titleLower.includes(chineseChars) || contentLower.includes(chineseChars))) {
                return true;
              }
            }
            
            // 数字处理：去掉数字后再匹配
            if (/\d/.test(termLower)) {
              const nonDigitsTerm = termLower.replace(/\d+/g, '');
              if (nonDigitsTerm && (titleLower.includes(nonDigitsTerm) || contentLower.includes(nonDigitsTerm))) {
                return true;
              }
            }
            
            // 标签匹配
            return !!(p.tags && p.tags.some(tag => tag.toLowerCase().includes(termLower)));
          });
          
          // 无匹配时的退化规则
          if (!hasMatch) {
            // 截取前半部分词进行匹配
            const halfTerm = term.substring(0, Math.ceil(term.length / 2));
            if (halfTerm.length >= 2) {
              hasMatch = prompts.some(p => 
                p.title.toLowerCase().includes(halfTerm.toLowerCase()) || 
                p.content.toLowerCase().includes(halfTerm.toLowerCase())
              );
            }
            
            // 还是无匹配，尝试只匹配前2个字符
            if (!hasMatch && term.length >= 2) {
              const firstChars = term.substring(0, 2);
              hasMatch = prompts.some(p => 
                p.title.toLowerCase().includes(firstChars.toLowerCase()) || 
                p.content.toLowerCase().includes(firstChars.toLowerCase())
              );
            }
            
            // 中文长输入特例：强制视为匹配，避免频繁关闭
            if (!hasMatch && /[\u4e00-\u9fa5]/.test(term) && term.length >= 3) {
              console.log("[AetherFlow-DEBUG] 应用中文长输入特例规则，强制视为匹配");
              hasMatch = true;
            }
          }
        } else {
          // 空搜索词始终视为匹配
          hasMatch = true;
        }
        
        console.log('[AetherFlow-DEBUG] Hook: 搜索完成:', {
          term,
          resultsCount: prompts.length,
          hasMatch,
          exampleResults: prompts.slice(0, 2).map(p => p.title)
        });
        
        // 更新状态
        setResults(prompts);
        setHasExactMatch(hasMatch);
        
        // 如果无匹配结果，通知服务层
        if (prompts.length === 0 && term.trim() && !hasMatch) {
          promptShortcutService.dispatchNoMatchEvent(term);
        }
      } else {
        console.log('[AetherFlow-DEBUG] Hook: 搜索无结果');
        
        // 中文输入特例：为防止过早关闭，视为匹配
        const forceMatchForChinese = /[\u4e00-\u9fa5]/.test(term) && term.length > 3;
        
        setResults([]);
        setHasExactMatch(forceMatchForChinese);
      }
    } catch (error) {
      console.error('[AetherFlow] Hook: 搜索提示词失败:', error);
      setResults([]);
      
      // 中文输入特例：为防止过早关闭，视为匹配
      const forceMatchForChinese = /[\u4e00-\u9fa5]/.test(term) && term.length > 3;
      setHasExactMatch(forceMatchForChinese);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 选择提示词
  const handleSelectPrompt = useCallback(async (prompt: Prompt) => {
    try {
      console.log('[AetherFlow] Hook: 选择提示词:', prompt.title);
      
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
      
      console.log('[AetherFlow] Hook: 替换文本:', {
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
      console.error('[AetherFlow] Hook: 插入提示词失败:', error);
    }
  }, [adapter, inputElement, searchInfo.slashPosition, currentSearchTerm, onClose]);
  
  // 高亮关键词 - 返回分段高亮信息
  const highlightKeyword = useCallback((text: string, keyword: string): HighlightedPart[] => {
    if (!keyword.trim()) return [{ text, isHighlight: false }];
    
    try {
      const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
      return parts.map(part => ({
        text: part,
        isHighlight: part.toLowerCase() === keyword.toLowerCase()
      }));
    } catch (e) {
      return [{ text, isHighlight: false }];
    }
  }, []);
  
  // 初始化时执行一次搜索，确保始终显示结果
  useEffect(() => {
    // 初始加载时立即搜索一次
    performSearch(searchInfo.searchTerm);
  }, [searchInfo.searchTerm, performSearch]);
  
  // 修改搜索词长度检查逻辑 - 自动关闭浮层检测
  useEffect(() => {
    // 调试日志，帮助排查问题
    console.log('[AetherFlow-DEBUG] Hook: 长度检查触发:', {
      term: searchInfo.searchTerm,
      results: results.length,
      loading,
      hasMatch: hasExactMatch
    });
    
    // 是否应该关闭的条件：
    // 1. 没有结果
    // 2. 不在加载中
    // 3. 没有任何匹配
    // 4. 搜索词不为空
    if (results.length === 0 && !loading && !hasExactMatch && searchInfo.searchTerm.trim()) {
      const term = searchInfo.searchTerm.trim();
      
      // 极端情况：非常长的无意义输入且确定无匹配
      // 设置更大的阈值：中文30字符，英文60字符
      const isExtremeLongTerm = term.length > (/[\u4e00-\u9fa5]/.test(term) ? 30 : 60);
      
      // 多次确认无匹配
      const definitelyNoMatches = results.length === 0 && !loading && hasExactMatch === false;
      
      // 极端情况关闭逻辑
      if (isExtremeLongTerm && definitelyNoMatches) {
        console.log('[AetherFlow-DEBUG] Hook: 输入超长且确定无匹配，准备关闭:', {
          termLength: term.length,
          term: term.substring(0, 20) + '...',
          noMatches: definitelyNoMatches
        });
        
        // 延迟关闭，并做二次确认
        setTimeout(() => {
          // 再次检查，防止在延迟期间状态变化
          if (results.length === 0 && !loading && hasExactMatch === false) {
            console.log('[AetherFlow-DEBUG] Hook: 确认关闭条件仍满足，执行关闭');
            onClose(true);
          } else {
            console.log('[AetherFlow-DEBUG] Hook: 关闭条件不再满足，取消关闭');
          }
        }, 1000); // 延长延迟到1秒，给足充分时间
      }
    }
  }, [searchInfo.searchTerm, results.length, loading, hasExactMatch, onClose]);
  
  // 当搜索词变化时执行搜索
  useEffect(() => {
    if (searchInfo.searchTerm !== currentSearchTerm) {
      setCurrentSearchTerm(searchInfo.searchTerm);
      performSearch(searchInfo.searchTerm);
      // 重置活跃索引
      setActiveIndex(0);
    }
  }, [searchInfo.searchTerm, currentSearchTerm, performSearch]);
  
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
  }, [adapter, inputElement, onClose, searchInfo.slashPosition, currentSearchTerm, performSearch]);
  
  // 键盘导航处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
        onClose(true);
      }
    }
  }, [results, activeIndex, onClose, handleSelectPrompt]);
  
  // 点击外部关闭处理
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose(true);
    }
  }, [onClose]);
  
  // 设置键盘导航监听
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // 设置点击外部关闭监听
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);
  
  // 获取当前搜索词
  const displayTerm = currentSearchTerm || '';
  
  // 确定需要显示的标题文本
  const headerTitle = displayTerm 
    ? `提示词搜索: ${displayTerm}` 
    : '推荐提示词';
  
  return {
    // 状态
    results,
    loading,
    activeIndex,
    hasExactMatch,
    currentSearchTerm,
    displayTerm,
    headerTitle,
    
    // 引用
    containerRef,
    
    // 方法
    setActiveIndex,
    performSearch,
    handleSelectPrompt,
    highlightKeyword
  };
} 