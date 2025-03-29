import { StorageArea } from './types';
import { STORAGE_KEYS, STORAGE_LIMITS } from './constants';

// 存储操作的最大重试次数
const MAX_RETRY_COUNT = 3;
// 重试延迟(毫秒)
const RETRY_DELAY = 500;

export class Storage {
  private area: StorageArea;

  constructor(area: StorageArea = 'sync') {
    this.area = area;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const storageArea = this.area === 'sync' ? chrome.storage.sync : chrome.storage.local;
      const result = await storageArea.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('Error getting from storage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    let retries = 0;
    let lastError = null;

    // 加入重试逻辑，提高存储可靠性
    while (retries < MAX_RETRY_COUNT) {
      try {
        console.log(`[Storage] 尝试存储数据 (${retries > 0 ? '重试#' + retries : '首次'}):`, key);
        const storageArea = this.area === 'sync' ? chrome.storage.sync : chrome.storage.local;
        await storageArea.set({ [key]: value });
        
        // 验证存储是否成功
        const verification = await this.get(key);
        if (!verification) {
          console.warn(`[Storage] 存储后验证失败，数据可能未正确保存:`, key);
          throw new Error('存储验证失败');
        }
        
        console.log(`[Storage] 数据存储成功:`, key);
        return; // 成功则退出
      } catch (error) {
        lastError = error;
        console.error(`[Storage] 存储错误 (尝试 ${retries + 1}/${MAX_RETRY_COUNT}):`, error);
        retries++;
        
        if (retries < MAX_RETRY_COUNT) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    // 所有重试都失败，抛出最后一个错误
    console.error(`[Storage] 存储彻底失败，已尝试 ${MAX_RETRY_COUNT} 次:`, key);
    throw lastError || new Error('存储操作失败');
  }

  async remove(key: string): Promise<void> {
    try {
      const storageArea = this.area === 'sync' ? chrome.storage.sync : chrome.storage.local;
      await storageArea.remove(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const storageArea = this.area === 'sync' ? chrome.storage.sync : chrome.storage.local;
      await storageArea.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}

export const syncStorage = new Storage('sync');
export const localStorage = new Storage('local');
export const storageService = syncStorage;

export { STORAGE_KEYS, STORAGE_LIMITS };
export * from './types';
export * from './constants';
