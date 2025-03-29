import { useState, useCallback, useEffect } from 'react';
import { 
  Prompt, 
  PromptFilter,
  searchPrompts,
  incrementPromptUse,
  getPrompts,
  getPromptById,
  deletePrompt,
  toggleFavorite
} from '../services/prompt';
import { STORAGE_KEYS } from '../services/storage';

export type CreatePromptInput = Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'lastUsed'>;
export type UpdatePromptInput = Partial<Omit<Prompt, 'id' | 'createdAt'>>; 

/**
 * 提示词Hook，用于组件中管理提示词数据
 * 提供提示词的CRUD操作，以及搜索、排序等功能
 */
export function usePrompts() {
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 加载所有提示词
  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 使用存储服务获取提示词
      const allPrompts = await getPrompts();
      setPrompts(allPrompts);
    } catch (err) {
      console.error('Failed to load prompts:', err);
      setError(err instanceof Error ? err.message : '加载提示词失败');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 监听存储变更并初始加载
  useEffect(() => {
    // 初始加载
    loadPrompts();

    // 添加存储变更监听
    const listener = (changes: any) => {
      if (changes[STORAGE_KEYS.PROMPTS]) {
        console.log('[usePrompts] 检测到提示词数据变更，正在刷新...');
        loadPrompts();
      }
    };
    
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    
    return () => {};
  }, [loadPrompts]);
  
  // 搜索提示词
  const searchPromptsHook = useCallback(async (keyword: string, filter?: Partial<PromptFilter>): Promise<Prompt[]> => {
    setLoading(true);
    try {
      const results = await searchPrompts({
        searchTerm: keyword,
        ...(filter || {})
      });
      return results;
    } catch (err) {
      console.error('Failed to search prompts:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 增加提示词使用次数
  const incrementPromptUseHook = useCallback(async (id: string): Promise<void> => {
    try {
      await incrementPromptUse(id);
    } catch (err) {
      console.error('Failed to increment prompt use count:', err);
    }
  }, []);
  
  // 生成唯一ID (UUID v4格式)
  const generateId = useCallback((): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }, []);
  
  // 添加提示词
  const addPrompt = useCallback(async (input: CreatePromptInput): Promise<Prompt | null> => {
    setLoading(true);
    try {
      // 创建新提示词对象
      const newPrompt: Prompt = {
        id: generateId(),
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
        lastUsed: 0,
        isFavorite: input.favorite || false,
        favorite: input.favorite || false
      };
      
      // 手动保存到storage
      const existingPrompts = await getPrompts() || [];
      const updatedPrompts = [...existingPrompts, newPrompt];
      
      await chrome.storage.sync.set({ [STORAGE_KEYS.PROMPTS]: updatedPrompts });
      
      return newPrompt;
    } catch (err) {
      console.error('Failed to add prompt:', err);
      setError('添加提示词失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [generateId]);
  
  // 更新提示词
  const updatePrompt = useCallback(async (id: string, input: UpdatePromptInput): Promise<Prompt | null> => {
    setLoading(true);
    try {
      // 先获取现有提示词
      const existingPrompt = await getPromptById(id);
      if (!existingPrompt) {
        throw new Error(`未找到ID为${id}的提示词`);
      }
      
      // 更新提示词
      const updatedPrompt: Prompt = {
        ...existingPrompt,
        ...input,
        updatedAt: Date.now()
      };
      
      // 手动保存到storage
      const prompts = await getPrompts() || [];
      const index = prompts.findIndex(p => p.id === id);
      
      if (index >= 0) {
        prompts[index] = updatedPrompt;
        await chrome.storage.sync.set({ [STORAGE_KEYS.PROMPTS]: prompts });
      }
      
      return updatedPrompt;
    } catch (err) {
      console.error('Failed to update prompt:', err);
      setError('更新提示词失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 删除提示词
  const deletePromptHook = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await deletePrompt(id);
      return success;
    } catch (err) {
      console.error('Failed to delete prompt:', err);
      setError('删除提示词失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 切换收藏状态
  const toggleFavoriteHook = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await toggleFavorite(id);
      return success;
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      setError('切换收藏状态失败');
      return false;
    }
  }, []);

  return {
    loading,
    prompts,
    error,
    searchPrompts: searchPromptsHook,
    incrementPromptUse: incrementPromptUseHook,
    addPrompt,
    updatePrompt,
    deletePrompt: deletePromptHook,
    toggleFavorite: toggleFavoriteHook,
    refreshPrompts: loadPrompts
  };
}

// 重新导出Prompt类型，方便组件使用
export type { Prompt } from '../services/prompt'; 