import { sendMessage } from '../messaging';
import type { Prompt } from './types';

// 消息类型常量
export const PROMPT_MESSAGE_TYPES = {
  UPDATED: 'prompt_updated',
  SEARCH: 'prompt_search',
  INCREMENT_USE: 'prompt_increment_use'
};

/**
 * 通过消息处理搜索提示词
 * @param keyword 关键词
 * @param limit 限制数量
 * @returns 匹配的提示词数组
 */
export async function searchPromptsByMessaging(keyword: string, limit: number = 8): Promise<Prompt[]> {
  console.log('[AetherFlow] 消息服务: 开始搜索提示词, 关键词:', keyword, '限制:', limit);
  
  try {
    console.log('[AetherFlow] 消息服务: 发送SEARCH_PROMPTS消息');
    const response = await sendMessage({
      type: PROMPT_MESSAGE_TYPES.SEARCH,
      payload: {
        keyword,
        limit
      }
    });
    
    console.log('[AetherFlow] 消息服务: 收到搜索响应', response ? '成功' : '失败');
    
    if (Array.isArray(response)) {
      console.log('[AetherFlow] 消息服务: 搜索结果数量:', response.length);
      return response as Prompt[];
    } else {
      console.error('[AetherFlow] 消息服务: 搜索响应格式错误:', response);
      return [];
    }
  } catch (error) {
    console.error('[AetherFlow] 消息服务: 搜索提示词失败:', error);
    return [];
  }
}

/**
 * 通过消息处理增加提示词使用次数
 * @param promptId 提示词ID
 * @returns 是否成功
 */
export async function incrementPromptUseByMessaging(promptId: string): Promise<boolean> {
  console.log('[AetherFlow] 消息服务: 开始增加提示词使用次数, ID:', promptId);
  
  try {
    console.log('[AetherFlow] 消息服务: 发送INCREMENT_PROMPT_USE消息');
    await sendMessage({
      type: PROMPT_MESSAGE_TYPES.INCREMENT_USE,
      payload: promptId
    });
    
    console.log('[AetherFlow] 消息服务: 增加使用次数成功');
    return true;
  } catch (error) {
    console.error('[AetherFlow] 消息服务: 增加提示词使用次数失败:', error);
    return false;
  }
}

// 发送提示词更新通知
export async function notifyPromptUpdated(): Promise<void> {
  chrome.runtime.sendMessage({
    type: PROMPT_MESSAGE_TYPES.UPDATED
  });
}

// 导出消息服务
export const promptMessagingService = {
  searchPromptsByMessaging,
  incrementPromptUseByMessaging,
  notifyPromptUpdated
}; 