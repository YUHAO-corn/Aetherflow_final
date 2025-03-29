import { useState, useEffect, useRef } from 'react';
import { GenericAdapter } from '../../content/platformAdapter';
import type { Prompt } from '../../services/prompt/types';
import { searchPromptsByMessaging, incrementPromptUseByMessaging } from '../../services/prompt/messaging';

/**
 * 提示词快捷输入钩子函数
 * 将业务逻辑从组件中抽离，实现更好的关注点分离
 */
export function usePromptShortcut(
  inputElement: HTMLElement,
  adapter: GenericAdapter,
  onClose: () => void
) {
  console.log('[AetherFlow] 钩子: usePromptShortcut初始化');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 初始加载所有提示词
  useEffect(() => {
    const loadInitialPrompts = async () => {
      console.log('[AetherFlow] 钩子: 加载初始提示词');
      setLoading(true);
      try {
        // 使用空字符串搜索获取所有提示词 - 修正参数格式
        const prompts = await searchPromptsByMessaging('', 8);
        console.log('[AetherFlow] 钩子: 初始提示词加载完成，数量:', prompts.length);
        setResults(prompts);
      } catch (error) {
        console.error('[AetherFlow] 钩子: 加载初始提示词失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialPrompts();
  }, []);
  
  // 搜索提示词业务逻辑
  useEffect(() => {
    // 如果是初始为空的搜索词，则不执行搜索（保留初始加载的结果）
    if (searchTerm === '') return;
    
    const search = async () => {
      if (!searchTerm.trim()) {
        console.log('[AetherFlow] 钩子: 空搜索条件，加载所有提示词');
        try {
          setLoading(true);
          const prompts = await searchPromptsByMessaging('', 8);
          console.log('[AetherFlow] 钩子: 加载所有提示词完成，数量:', prompts.length);
          setResults(prompts);
        } catch (error) {
          console.error('[AetherFlow] 钩子: 加载所有提示词失败:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
        return;
      }
      
      console.log('[AetherFlow] 钩子: 开始搜索', searchTerm);
      setLoading(true);
      try {
        // 使用提示词服务进行搜索
        console.log('[AetherFlow] 钩子: 调用searchPromptsByMessaging');
        const prompts = await searchPromptsByMessaging(searchTerm, 8);
        console.log('[AetherFlow] 钩子: 搜索完成，结果数量:', prompts.length);
        setResults(prompts);
      } catch (error) {
        console.error('[AetherFlow] 钩子: 搜索提示词失败:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    search();
  }, [searchTerm]);
  
  // 自动聚焦搜索框
  useEffect(() => {
    console.log('[AetherFlow] 钩子: 设置自动聚焦');
    setTimeout(() => {
      if (searchInputRef.current) {
        console.log('[AetherFlow] 钩子: 执行搜索框聚焦');
        searchInputRef.current.focus();
      } else {
        console.warn('[AetherFlow] 钩子: 搜索框引用不存在，无法聚焦');
      }
    }, 100);
  }, []);
  
  // 键盘导航逻辑
  useEffect(() => {
    console.log('[AetherFlow] 钩子: 设置键盘导航事件监听');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('[AetherFlow] 钩子: 键盘事件', e.key);
      
      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('[AetherFlow] 钩子: Escape键，关闭面板');
        
        // 关闭面板
        onClose();
        
        // 确保输入框保持焦点，但不移动光标位置
        setTimeout(() => {
          console.log('[AetherFlow] 钩子: Escape后确保输入框保持焦点');
          // 在ESC时保持原有光标位置
          inputElement.focus();
        }, 0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        console.log('[AetherFlow] 钩子: 向下箭头，选择下一项');
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        console.log('[AetherFlow] 钩子: 向上箭头，选择上一项');
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results.length > 0 && activeIndex >= 0) {
        e.preventDefault();
        console.log('[AetherFlow] 钩子: Enter键，选择当前项');
        handleSelectPrompt(results[activeIndex]);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      console.log('[AetherFlow] 钩子: 清理键盘事件监听');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [results, activeIndex, onClose, inputElement]);
  
  // 点击外部关闭逻辑
  useEffect(() => {
    console.log('[AetherFlow] 钩子: 设置点击外部关闭监听');
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        console.log('[AetherFlow] 钩子: 检测到外部点击，关闭面板');
        onClose();
        
        // 确保关闭后输入框保持焦点
        setTimeout(() => {
          console.log('[AetherFlow] 钩子: 点击外部关闭后确保输入框保持焦点');
          inputElement.focus();
        }, 0);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      console.log('[AetherFlow] 钩子: 清理点击外部事件监听');
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, inputElement]);
  
  // 处理提示词选择的业务逻辑
  const handleSelectPrompt = async (prompt: Prompt) => {
    console.log('[AetherFlow] 钩子: 处理提示词选择，ID:', prompt.id);
    
    try {
      // 向输入框插入文本
      console.log('[AetherFlow] 钩子: 向输入框插入文本');
      adapter.insertText(inputElement, prompt.content);
      adapter.triggerInputEvent(inputElement);
      
      // 增加使用次数 - 使用提示词服务
      console.log('[AetherFlow] 钩子: 增加提示词使用次数');
      await incrementPromptUseByMessaging(prompt.id);
      
      console.log('[AetherFlow] 钩子: 选择完成，调用关闭回调');
      
      // 关闭菜单
      onClose();
      
      // 确保输入框保持焦点，光标位置已在adapter.insertText()中设置到插入文本的末尾
      setTimeout(() => {
        console.log('[AetherFlow] 钩子: 插入后确保输入框保持焦点，光标在插入内容后');
        inputElement.focus();
      }, 0);
    } catch (error) {
      console.error('[AetherFlow] 钩子: 插入提示词失败:', error);
    }
  };
  
  console.log('[AetherFlow] 钩子: usePromptShortcut返回结果');
  
  return {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    activeIndex,
    setActiveIndex,
    handleSelectPrompt,
    containerRef,
    searchInputRef
  };
} 