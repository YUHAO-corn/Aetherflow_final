import { useState, useEffect, useCallback, useMemo } from 'react';
import { isExtensionContext } from '../utils/environment';
import { Prompt, PromptFilter } from '../services/prompt/types';
import { storageService } from '../services/storage';
import { sendMessage } from '../services/messaging';
import { v4 as uuidv4 } from 'uuid';

// 定义排序规则类型
export interface SortCriteria {
  key: 'createdAt' | 'useCount'; // 可排序的字段
  order: 'asc' | 'desc'; // 排序顺序
}

/**
 * 提供统一的提示词数据访问Hook，适用于任何环境
 * 根据当前运行环境自动选择适当的数据获取方式
 */
export function usePromptsData() {
  const [rawPrompts, setRawPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>({ key: 'createdAt', order: 'desc' });

  // 确定当前环境
  const isInExtension = isExtensionContext();
  
  // 内部排序函数
  const sortPromptsInternal = useCallback((promptsToSort: Prompt[], criteria: SortCriteria): Prompt[] => {
    const { key, order } = criteria;
    return [...promptsToSort].sort((a, b) => {
      const valA = a[key] || 0; // 处理可能为 undefined 的情况
      const valB = b[key] || 0;
      
      if (valA < valB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return order === 'asc' ? 1 : -1;
      }
      
      // 如果主键相同，直接按标题进行次要排序 (升序)
      const titleA = a.title || '';
      const titleB = b.title || '';
      return titleA.localeCompare(titleB);
    });
  }, []);
  
  // 加载所有提示词
  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: Prompt[];
      
      if (isInExtension) {
        data = await storageService.getAllPrompts();
      } else {
        data = await sendMessage<void, Prompt[]>({ type: 'GET_PROMPTS' });
      }
      
      setRawPrompts(data);
    } catch (err) {
      console.error('加载提示词失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setRawPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [isInExtension]);
  
  // 使用 useMemo 创建排序后的提示词列表
  const sortedPrompts = useMemo(() => {
      console.log(`[usePromptsData] Re-sorting prompts by ${sortCriteria.key} ${sortCriteria.order}`);
      return sortPromptsInternal(rawPrompts, sortCriteria);
  }, [rawPrompts, sortCriteria, sortPromptsInternal]);
  
  // 初始加载和监听存储变化
  useEffect(() => {
    loadPrompts();
    
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      const promptKeys = Object.keys(changes).filter(key => key.startsWith('prompt_'));
      if (promptKeys.length > 0) {
        console.log('[usePromptsData] 检测到提示词数据变更，刷新数据');
        loadPrompts();
      }
    };
    
    const handleMessage = (message: any) => {
      if (message.type === 'PROMPT_UPDATED') {
        console.log('[usePromptsData] 收到提示词更新消息，刷新数据');
        loadPrompts();
      }
    };
    
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    
    return () => {
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
      
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, [loadPrompts]);
  
  // 添加提示词
  const addPrompt = useCallback(async (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'lastUsed'>): Promise<Prompt | null> => {
    try {
      const now = Date.now();
      const newPrompt: Prompt = {
        id: uuidv4(),
        ...data,
        createdAt: now,
        updatedAt: now,
        useCount: 0,
        lastUsed: 0,
        isActive: true
      };
      
      if (isInExtension) {
        await storageService.savePrompt(newPrompt);
      } else {
        await sendMessage({ 
          type: 'SAVE_PROMPT', 
          payload: newPrompt 
        });
      }
      
      setRawPrompts(prev => [...prev, newPrompt]);
      
      return newPrompt;
    } catch (err) {
      console.error('添加提示词失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, [isInExtension]);
  
  // 更新提示词
  const updatePrompt = useCallback(async (id: string, updates: Partial<Prompt>): Promise<boolean> => {
    try {
      if (isInExtension) {
        await storageService.updatePrompt(id, updates);
      } else {
        await sendMessage({ 
          type: 'UPDATE_PROMPT', 
          payload: { id, updates } 
        });
      }
      
      setRawPrompts(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ));
      
      return true;
    } catch (err) {
      console.error('更新提示词失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [isInExtension]);
  
  // 删除提示词
  const deletePrompt = useCallback(async (id: string): Promise<boolean> => {
    console.log(`[DEBUG usePromptsData] deletePrompt called for ID: ${id}. isInExtension: ${isInExtension}`);
    try {
      if (isInExtension) {
        console.log(`[DEBUG usePromptsData] Attempting to use storageService:`, storageService);
        await storageService.deletePrompt(id);
        console.log(`[DEBUG usePromptsData] storageService.deletePrompt call completed for ID: ${id}`);
      } else {
        await sendMessage({ 
          type: 'DELETE_PROMPT', 
          payload: id 
        });
      }
      
      setRawPrompts(prev => prev.filter(p => p.id !== id));
      
      return true;
    } catch (err) {
      console.error('删除提示词失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [isInExtension]);
  
  // 切换收藏状态
  const toggleFavorite = useCallback(async (id: string): Promise<boolean> => {
    try {
      const prompt = rawPrompts.find(p => p.id === id);
      if (!prompt) return false;
      
      const isFavorited = prompt.isFavorite || prompt.favorite;
      
      if (isFavorited) {
        return await deletePrompt(id);
      } else {
        return await updatePrompt(id, { 
          isFavorite: true, 
          favorite: true 
        });
      }
    } catch (err) {
      console.error('切换收藏状态失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [rawPrompts, updatePrompt, deletePrompt]);
  
  // 增加使用次数
  const incrementUseCount = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (isInExtension) {
        await storageService.incrementUseCount(id);
      } else {
        await sendMessage({ 
          type: 'INCREMENT_PROMPT_USE', 
          payload: id 
        });
      }
      
      setRawPrompts(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          useCount: (p.useCount || 0) + 1,
          lastUsed: Date.now() 
        } : p
      ));
      
      return true;
    } catch (err) {
      console.error('增加使用次数失败:', err);
      return false;
    }
  }, [isInExtension]);
  
  // 搜索提示词
  const searchPrompts = useCallback(async (filter: PromptFilter): Promise<Prompt[]> => {
    try {
      if (isInExtension) {
        let results = [...sortedPrompts];
        
        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          results = results.filter(prompt => 
            prompt.title.toLowerCase().includes(term) || 
            prompt.content.toLowerCase().includes(term) ||
            prompt.tags?.some(tag => tag.toLowerCase().includes(term))
          );
        }
        
        if (filter.onlyFavorites || filter.favorite) {
          results = results.filter(prompt => 
            prompt.isFavorite || prompt.favorite
          );
        }
        
        if (filter.category) {
          results = results.filter(prompt => 
            prompt.category === filter.category
          );
        }
        
        if (filter.tags && filter.tags.length > 0) {
          results = results.filter(prompt => 
            prompt.tags?.some(tag => filter.tags!.includes(tag))
          );
        }
        
        if (filter.offset && filter.offset > 0) {
          results = results.slice(filter.offset);
        }
        
        if (filter.limit && filter.limit > 0) {
          results = results.slice(0, filter.limit);
        }
        
        return results;
      } else {
        return await sendMessage<PromptFilter, Prompt[]>({ 
          type: 'SEARCH_PROMPTS', 
          payload: filter 
        });
      }
    } catch (err) {
      console.error('搜索提示词失败:', err);
      return [];
    }
  }, [isInExtension, sortedPrompts]);
  
  return {
    prompts: sortedPrompts,
    loading,
    error,
    refresh: loadPrompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    incrementUseCount,
    searchPrompts,
    setSortCriteria,
    sortCriteria,
  };
} 