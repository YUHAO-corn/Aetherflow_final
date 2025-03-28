import { useState, useCallback } from 'react';
import { Prompt, searchPrompts, incrementPromptUse } from '../services/prompt';

export function usePrompts() {
  const [loading, setLoading] = useState(false);

  // 搜索提示词
  const searchPromptsHook = useCallback(async (keyword: string): Promise<Prompt[]> => {
    setLoading(true);
    try {
      const results = await searchPrompts(keyword);
      return results;
    } catch (error) {
      console.error('Failed to search prompts:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 增加提示词使用次数
  const incrementPromptUseHook = useCallback(async (id: string): Promise<void> => {
    try {
      await incrementPromptUse(id);
    } catch (error) {
      console.error('Failed to increment prompt use count:', error);
    }
  }, []);

  return {
    loading,
    searchPrompts: searchPromptsHook,
    incrementPromptUse: incrementPromptUseHook
  };
}

// 重新导出Prompt类型，方便组件使用
export type { Prompt } from '../services/prompt'; 