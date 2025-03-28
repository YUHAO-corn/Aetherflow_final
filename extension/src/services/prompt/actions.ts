import { Prompt, PromptFilter } from './types';
import { syncStorage } from '../storage';

const STORAGE_KEY = 'prompts';

// 获取所有提示词
export async function getPrompts(filter?: PromptFilter): Promise<Prompt[]> {
  const prompts = await syncStorage.get<Prompt[]>(STORAGE_KEY) || [];
  
  if (!filter) return prompts;
  
  let filtered = prompts;
  
  // 搜索过滤
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(prompt => 
      prompt.title.toLowerCase().includes(term) || 
      prompt.content.toLowerCase().includes(term)
    );
  }
  
  // 排序
  if (filter.sortBy) {
    switch (filter.sortBy) {
      case 'usage':
        filtered.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
        break;
      case 'favorite':
        filtered.sort((a, b) => (a.favorite === b.favorite) ? 0 : a.favorite ? -1 : 1);
        break;
      case 'time':
        filtered.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        break;
    }
  }
  
  // 限制数量
  if (filter.limit && filter.limit > 0) {
    filtered = filtered.slice(0, filter.limit);
  }
  
  return filtered;
}

// 搜索提示词
export async function searchPrompts(keyword: string): Promise<Prompt[]> {
  return getPrompts({ searchTerm: keyword });
}

// 增加提示词使用次数
export async function incrementPromptUse(id: string): Promise<void> {
  const prompts = await syncStorage.get<Prompt[]>(STORAGE_KEY) || [];
  const updatedPrompts = prompts.map(prompt => {
    if (prompt.id === id) {
      return {
        ...prompt,
        useCount: (prompt.useCount || 0) + 1,
        lastUsed: Date.now()
      };
    }
    return prompt;
  });
  
  await syncStorage.set(STORAGE_KEY, updatedPrompts);
} 