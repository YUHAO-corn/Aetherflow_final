/**
 * 会话管理模块
 * 负责处理用户会话生命周期事件，特别是会话结束时的清理工作
 */

import { membershipService } from '../membership';
import { cloudStorageService } from '../storage/cloudStorage';
import { STORAGE_KEYS } from '../storage/constants';

// 提示词前缀，用于识别存储中的提示词项
const PROMPT_PREFIX = 'prompt_';

// 需要在会话结束时清理的所有存储键
// 这个列表应该包含所有用户特定的数据键
const USER_SPECIFIC_STORAGE_KEYS = [
  // 认证相关
  'auth_user', // 从 saveAuthStateToStorage 函数中获知
  
  // 会员信息相关
  STORAGE_KEYS.MEMBERSHIP, // 会员状态
  'last_sync_time',       // 上次同步时间
  
  // 用户特定的设置和偏好
  // 注意: 应用通用设置(如主题、语言等)不应删除
];

/**
 * 处理用户会话结束(登出、会话过期等)
 * 清理所有用户特定的数据和状态
 */
export const handleSessionEnd = async (): Promise<void> => {
  console.log('[SessionManager] 用户会话结束，开始清理状态...');
  
  try {
    // 1. 清理 chrome.storage.local 中的用户特定数据
    await clearUserSpecificStorage();
    
    // 2. 依次重置各个服务的状态
    
    // 重置会员服务
    if (membershipService && typeof membershipService.reset === 'function') {
      await membershipService.reset();
    } else {
      console.warn('[SessionManager] membershipService 不存在或没有 reset 方法');
    }
    
    // 重置云存储服务
    if (cloudStorageService && typeof cloudStorageService.reset === 'function') {
      await cloudStorageService.reset();
    } else {
      console.warn('[SessionManager] cloudStorageService 不存在或没有 reset 方法');
    }
    
    console.log('[SessionManager] 状态清理完成');
  } catch (error) {
    console.error('[SessionManager] 清理状态时发生错误:', error);
  }
};

/**
 * 清理 chrome.storage.local 中的用户特定数据
 */
const clearUserSpecificStorage = async (): Promise<void> => {
  try {
    console.log('[SessionManager] 清理本地存储中的用户数据...');
    
    // 移除明确列出的键
    if (USER_SPECIFIC_STORAGE_KEYS.length > 0) {
      await chrome.storage.local.remove(USER_SPECIFIC_STORAGE_KEYS);
    }
    
    // 同时清理所有提示词数据
    // 注意: 如果有些提示词需要保留(如默认提示词)，则需要更复杂的逻辑
    const allStorage = await chrome.storage.local.get(null);
    const promptKeys = Object.keys(allStorage).filter(
      key => key.startsWith(PROMPT_PREFIX)
    );
    
    if (promptKeys.length > 0) {
      await chrome.storage.local.remove(promptKeys);
    }
    
    console.log('[SessionManager] 本地存储清理完成');
  } catch (error) {
    console.error('[SessionManager] 清理本地存储失败:', error);
  }
}; 