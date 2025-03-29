import { StorageService } from './types';
import { Prompt } from '../prompt/types';
import { v4 as uuidv4 } from 'uuid';

// 存储键名常量
const STORAGE_KEYS = {
  PROMPT_PREFIX: 'prompt_',
  SETTINGS: 'settings',
  VERSION: 'version'
};

/**
 * 基于Chrome Storage API的存储服务实现
 */
export class ChromeStorageService implements StorageService {
  // 提示词相关操作
  
  /**
   * 获取单个提示词
   * @param id 提示词ID 
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    try {
      const key = `${STORAGE_KEYS.PROMPT_PREFIX}${id}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`[ChromeStorage] 获取提示词失败:`, error);
      return null;
    }
  }
  
  /**
   * 获取所有提示词
   */
  async getAllPrompts(): Promise<Prompt[]> {
    try {
      const result = await chrome.storage.local.get(null);
      
      // 过滤所有提示词数据
      return Object.entries(result)
        .filter(([key]) => key.startsWith(STORAGE_KEYS.PROMPT_PREFIX))
        .map(([_, value]) => value as Prompt)
        .filter(prompt => prompt.isActive !== false); // 排除已删除的提示词
    } catch (error) {
      console.error(`[ChromeStorage] 获取所有提示词失败:`, error);
      return [];
    }
  }
  
  /**
   * 保存提示词
   * @param prompt 提示词对象
   */
  async savePrompt(prompt: Prompt): Promise<void> {
    if (!prompt.id) {
      throw new Error('提示词ID是必需的');
    }
    
    try {
      // 确保所有必要字段存在
      const now = Date.now();
      const completePrompt: Prompt = {
        ...prompt,
        createdAt: prompt.createdAt || now,
        updatedAt: now,
        useCount: prompt.useCount || 0,
        isFavorite: Boolean(prompt.isFavorite || prompt.favorite),
        favorite: Boolean(prompt.isFavorite || prompt.favorite),
        lastUsed: prompt.lastUsed || 0,
        isActive: prompt.isActive !== false
      };
      
      const key = `${STORAGE_KEYS.PROMPT_PREFIX}${prompt.id}`;
      await chrome.storage.local.set({ [key]: completePrompt });
    } catch (error) {
      console.error(`[ChromeStorage] 保存提示词失败:`, error);
      throw error;
    }
  }
  
  /**
   * 更新提示词
   * @param id 提示词ID
   * @param updates 要更新的字段
   */
  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<void> {
    try {
      const prompt = await this.getPrompt(id);
      if (!prompt) {
        throw new Error(`提示词ID ${id} 不存在`);
      }
      
      // 合并更新
      const updatedPrompt = {
        ...prompt,
        ...updates,
        updatedAt: Date.now()
      };
      
      // 同步更新isFavorite和favorite字段
      if ('isFavorite' in updates && updates.isFavorite !== undefined) {
        updatedPrompt.favorite = updates.isFavorite;
      } else if ('favorite' in updates && updates.favorite !== undefined) {
        updatedPrompt.isFavorite = updates.favorite;
      }
      
      await this.savePrompt(updatedPrompt);
    } catch (error) {
      console.error(`[ChromeStorage] 更新提示词失败:`, error);
      throw error;
    }
  }
  
  /**
   * 删除提示词(软删除)
   * @param id 提示词ID
   */
  async deletePrompt(id: string): Promise<void> {
    try {
      const prompt = await this.getPrompt(id);
      if (!prompt) {
        return; // 提示词不存在，视为删除成功
      }
      
      // 软删除: 将isActive标记为false
      await this.updatePrompt(id, { 
        isActive: false,
        active: false
      });
    } catch (error) {
      console.error(`[ChromeStorage] 删除提示词失败:`, error);
      throw error;
    }
  }
  
  /**
   * 增加提示词使用次数
   * @param id 提示词ID
   */
  async incrementUseCount(id: string): Promise<void> {
    try {
      const prompt = await this.getPrompt(id);
      if (!prompt) {
        return; // 提示词不存在，忽略操作
      }
      
      await this.updatePrompt(id, {
        useCount: (prompt.useCount || 0) + 1,
        lastUsed: Date.now()
      });
    } catch (error) {
      console.error(`[ChromeStorage] 增加提示词使用次数失败:`, error);
      // 不抛出异常，避免影响用户体验
    }
  }
  
  // 通用存储操作
  
  /**
   * 获取存储值
   * @param key 键名
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`[ChromeStorage] 获取数据失败:`, error);
      return null;
    }
  }
  
  /**
   * 设置存储值
   * @param key 键名
   * @param value 值
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`[ChromeStorage] 设置数据失败:`, error);
      throw error;
    }
  }
  
  /**
   * 删除存储值
   * @param key 键名
   */
  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`[ChromeStorage] 删除数据失败:`, error);
      throw error;
    }
  }
  
  /**
   * 清空存储
   */
  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error(`[ChromeStorage] 清空存储失败:`, error);
      throw error;
    }
  }
}

// 创建默认实例
export const chromeStorageService = new ChromeStorageService(); 