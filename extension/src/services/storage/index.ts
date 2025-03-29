import { StorageArea, StorageService } from './types';
import { STORAGE_KEYS, STORAGE_LIMITS } from './constants';
import { chromeStorageService } from './chromeStorage';
import { mockStorageService } from './mockStorage';

// 存储操作的最大重试次数
const MAX_RETRY_COUNT = 3;
// 重试延迟(毫秒)
const RETRY_DELAY = 500;

/**
 * 基础存储类
 * @deprecated 使用统一的 storageService 替代
 */
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

// 为了向后兼容，保留旧的实例
export const syncStorage = new Storage('sync');
export const localStorage = new Storage('local');

// 判断是否在开发环境
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// 默认使用Chrome存储服务
let useMockData = false;

// 尝试从localStorage读取标志
try {
  // 从localStorage读取是否使用模拟数据的标志
  // 注意这里使用的是原生localStorage，而不是之前定义的Storage实例
  useMockData = isDevelopment && window.localStorage.getItem('USE_MOCK_DATA') === 'true';
} catch (error) {
  console.error('[Storage] 读取模拟数据标志失败', error);
}

/**
 * 获取适合当前环境的存储服务
 * 在开发环境中，如果设置了USE_MOCK_DATA=true，则使用模拟存储
 * 否则使用Chrome存储API
 */
export function getStorageService(): StorageService {
  if (isDevelopment && useMockData) {
    console.log('[Storage] 使用模拟存储服务');
    return mockStorageService;
  }
  
  console.log('[Storage] 使用Chrome存储服务');
  return chromeStorageService;
}

// 导出统一的存储服务实例
export const storageService: StorageService = getStorageService();

// 导出其他相关内容
export { STORAGE_KEYS, STORAGE_LIMITS };
export * from './types';
export * from './constants';

// 导出具体存储服务，用于特殊场景
export { chromeStorageService, mockStorageService };
