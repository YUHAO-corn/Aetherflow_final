import { useState, useEffect, useCallback } from 'react';
import { isExtensionContext } from '../utils/environment';
import { Prompt, PromptFilter } from '../services/prompt/types';
import { storageService } from '../services/storage';
import { sendMessage } from '../services/messaging';
import { v4 as uuidv4 } from 'uuid';

/**
 * 提供统一的提示词数据访问Hook，适用于任何环境
 * 根据当前运行环境自动选择适当的数据获取方式
 */
export function usePromptsData() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 确定当前环境
  const isInExtension = isExtensionContext();
  
  // 加载所有提示词
  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: Prompt[];
      
      if (isInExtension) {
        // 在扩展环境中，直接使用存储服务
        data = await storageService.getAllPrompts();
      } else {
        // 在内容脚本环境中，使用消息通信
        data = await sendMessage<void, Prompt[]>({ type: 'GET_PROMPTS' });
      }
      
      setPrompts(data);
    } catch (err) {
      console.error('加载提示词失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [isInExtension]);
  
  // 初始加载和监听存储变化
  useEffect(() => {
    // 第一次加载
    loadPrompts();
    
    // 监听存储变化事件
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      const promptKeys = Object.keys(changes).filter(key => key.startsWith('prompt_'));
      if (promptKeys.length > 0) {
        console.log('[usePromptsData] 检测到提示词数据变更，刷新数据');
        loadPrompts();
      }
    };
    
    // 监听消息事件
    const handleMessage = (message: any) => {
      if (message.type === 'PROMPT_UPDATED') {
        console.log('[usePromptsData] 收到提示词更新消息，刷新数据');
        loadPrompts();
      }
    };
    
    // 注册事件监听
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    
    // 清理函数
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
      // 创建完整的提示词对象
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
        // 在扩展环境中，直接使用存储服务
        await storageService.savePrompt(newPrompt);
      } else {
        // 在内容脚本环境中，使用消息通信
        await sendMessage({ 
          type: 'SAVE_PROMPT', 
          payload: newPrompt 
        });
      }
      
      // 手动更新本地状态，避免等待下一次数据加载
      setPrompts(prev => [...prev, newPrompt]);
      
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
        // 在扩展环境中，直接使用存储服务
        await storageService.updatePrompt(id, updates);
      } else {
        // 在内容脚本环境中，使用消息通信
        await sendMessage({ 
          type: 'UPDATE_PROMPT', 
          payload: { id, updates } 
        });
      }
      
      // 手动更新本地状态，避免等待下一次数据加载
      setPrompts(prev => prev.map(p => 
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
    try {
      if (isInExtension) {
        // 在扩展环境中，直接使用存储服务
        await storageService.deletePrompt(id);
      } else {
        // 在内容脚本环境中，使用消息通信
        await sendMessage({ 
          type: 'DELETE_PROMPT', 
          payload: id 
        });
      }
      
      // 手动更新本地状态，避免等待下一次数据加载
      setPrompts(prev => prev.filter(p => p.id !== id));
      
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
      // 查找当前提示词
      const prompt = prompts.find(p => p.id === id);
      if (!prompt) return false;
      
      // 确定当前收藏状态
      const isFavorited = prompt.isFavorite || prompt.favorite;
      
      if (isFavorited) {
        // 如果已收藏，则删除提示词
        return await deletePrompt(id);
      } else {
        // 如果未收藏，则标记为收藏
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
  }, [prompts, updatePrompt, deletePrompt]);
  
  // 增加使用次数
  const incrementUseCount = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (isInExtension) {
        // 在扩展环境中，直接使用存储服务
        await storageService.incrementUseCount(id);
      } else {
        // 在内容脚本环境中，使用消息通信
        await sendMessage({ 
          type: 'INCREMENT_PROMPT_USE', 
          payload: id 
        });
      }
      
      // 手动更新本地状态，避免等待下一次数据加载
      setPrompts(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          useCount: (p.useCount || 0) + 1,
          lastUsed: Date.now() 
        } : p
      ));
      
      return true;
    } catch (err) {
      console.error('增加使用次数失败:', err);
      // 不抛出错误，避免影响用户体验
      return false;
    }
  }, [isInExtension]);
  
  // 搜索提示词
  const searchPrompts = useCallback(async (filter: PromptFilter): Promise<Prompt[]> => {
    try {
      if (isInExtension) {
        // 在扩展环境中，使用本地提示词进行筛选
        let results = [...prompts];
        
        // 关键词搜索
        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          results = results.filter(prompt => 
            prompt.title.toLowerCase().includes(term) || 
            prompt.content.toLowerCase().includes(term) ||
            prompt.tags?.some(tag => tag.toLowerCase().includes(term))
          );
        }
        
        // 收藏过滤
        if (filter.onlyFavorites || filter.favorite) {
          results = results.filter(prompt => 
            prompt.isFavorite || prompt.favorite
          );
        }
        
        // 分类过滤
        if (filter.category) {
          results = results.filter(prompt => 
            prompt.category === filter.category
          );
        }
        
        // 标签过滤
        if (filter.tags && filter.tags.length > 0) {
          results = results.filter(prompt => 
            prompt.tags?.some(tag => filter.tags!.includes(tag))
          );
        }
        
        // 排序
        if (filter.sortBy) {
          switch (filter.sortBy) {
            case 'usage':
              results.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
              break;
            case 'favorite':
              results.sort((a, b) => {
                const aFav = a.isFavorite || a.favorite || false;
                const bFav = b.isFavorite || b.favorite || false;
                return aFav === bFav ? 0 : aFav ? -1 : 1;
              });
              break;
            case 'time':
              results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
              break;
            case 'alphabetical':
              results.sort((a, b) => a.title.localeCompare(b.title));
              break;
          }
        }
        
        // 分页
        if (filter.offset && filter.offset > 0) {
          results = results.slice(filter.offset);
        }
        
        if (filter.limit && filter.limit > 0) {
          results = results.slice(0, filter.limit);
        }
        
        return results;
      } else {
        // 在内容脚本环境中，使用消息通信
        return await sendMessage<PromptFilter, Prompt[]>({ 
          type: 'SEARCH_PROMPTS', 
          payload: filter 
        });
      }
    } catch (err) {
      console.error('搜索提示词失败:', err);
      // 返回空数组，避免抛出错误
      return [];
    }
  }, [isInExtension, prompts]);
  
  return {
    prompts,
    loading,
    error,
    refresh: loadPrompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    incrementUseCount,
    searchPrompts,
  };
} 