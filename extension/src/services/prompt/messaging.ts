import { addMessageListener, createSuccessResponse, createErrorResponse, sendMessage } from '../messaging';
import { Message, MessageResponse } from '../messaging/types';
import { storageService } from '../storage';
import { Prompt, PromptFilter } from './types';

// 消息类型常量
export const PROMPT_MESSAGE_TYPES = {
  UPDATED: 'prompt_updated',
  SEARCH: 'prompt_search',
  INCREMENT_USE: 'prompt_increment_use'
};

/**
 * 初始化提示词消息处理器
 * 处理所有与提示词相关的跨环境消息
 */
export function initPromptMessaging(): void {
  console.log('[PromptMessaging] 初始化提示词消息处理器');
  
  addMessageListener(async (message: Message, sender, sendResponse) => {
    try {
      // 根据消息类型分发处理
      switch (message.type) {
        case 'GET_PROMPTS':
          // 获取所有提示词
          const prompts = await storageService.getAllPrompts();
          sendResponse(createSuccessResponse(prompts, message.requestId));
          break;
          
        case 'GET_PROMPT':
          // 获取单个提示词
          const promptId = message.payload as string;
          const prompt = await storageService.getPrompt(promptId);
          sendResponse(createSuccessResponse(prompt, message.requestId));
          break;
          
        case 'SAVE_PROMPT':
          // 保存提示词
          const promptToSave = message.payload as Prompt;
          await storageService.savePrompt(promptToSave);
          sendResponse(createSuccessResponse(true, message.requestId));
          break;
          
        case 'UPDATE_PROMPT':
          // 更新提示词
          const { id, updates } = message.payload as { id: string; updates: Partial<Prompt> };
          await storageService.updatePrompt(id, updates);
          sendResponse(createSuccessResponse(true, message.requestId));
          break;
          
        case 'DELETE_PROMPT':
          // 删除提示词
          const idToDelete = message.payload as string;
          await storageService.deletePrompt(idToDelete);
          sendResponse(createSuccessResponse(true, message.requestId));
          break;
          
        case 'INCREMENT_PROMPT_USE':
          // 增加提示词使用次数
          const idToIncrement = message.payload as string;
          await storageService.incrementUseCount(idToIncrement);
          sendResponse(createSuccessResponse(true, message.requestId));
          break;
          
        case 'SEARCH_PROMPTS':
          // 搜索提示词
          const filter = message.payload as PromptFilter;
          const allPrompts = await storageService.getAllPrompts();
          
          // 在内存中执行筛选
          let filteredPrompts = [...allPrompts];
          
          // 关键词搜索
          if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            filteredPrompts = filteredPrompts.filter(prompt => 
              prompt.title.toLowerCase().includes(term) || 
              prompt.content.toLowerCase().includes(term) ||
              prompt.tags?.some(tag => tag.toLowerCase().includes(term))
            );
          }
          
          // 收藏过滤
          if (filter.onlyFavorites || filter.favorite) {
            filteredPrompts = filteredPrompts.filter(prompt => 
              prompt.isFavorite || prompt.favorite
            );
          }
          
          // 分类过滤
          if (filter.category) {
            filteredPrompts = filteredPrompts.filter(prompt => 
              prompt.category === filter.category
            );
          }
          
          // 标签过滤
          if (filter.tags && filter.tags.length > 0) {
            filteredPrompts = filteredPrompts.filter(prompt => 
              prompt.tags?.some(tag => filter.tags!.includes(tag))
            );
          }
          
          // 排序
          if (filter.sortBy) {
            switch (filter.sortBy) {
              case 'usage':
                filteredPrompts.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
                break;
              case 'favorite':
                filteredPrompts.sort((a, b) => {
                  const aFav = a.isFavorite || a.favorite || false;
                  const bFav = b.isFavorite || b.favorite || false;
                  return aFav === bFav ? 0 : aFav ? -1 : 1;
                });
                break;
              case 'time':
                filteredPrompts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                break;
              case 'alphabetical':
                filteredPrompts.sort((a, b) => a.title.localeCompare(b.title));
                break;
            }
          }
          
          // 分页
          if (filter.offset && filter.offset > 0) {
            filteredPrompts = filteredPrompts.slice(filter.offset);
          }
          
          if (filter.limit && filter.limit > 0) {
            filteredPrompts = filteredPrompts.slice(0, filter.limit);
          }
          
          sendResponse(createSuccessResponse(filteredPrompts, message.requestId));
          break;
          
        default:
          // 不处理其他类型的消息
          return false;
      }
      
      // 异步响应需要返回true
      return true;
    } catch (error) {
      console.error('[PromptMessaging] 处理消息错误:', error);
      sendResponse(createErrorResponse(error as Error, message.requestId));
      // 异步响应需要返回true
      return true;
    }
  });
}

/**
 * 初始化提示词消息处理
 * 在后台环境调用
 */
export function setupPromptMessaging(): void {
  initPromptMessaging();
}

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
    const filter: PromptFilter = {
      searchTerm: keyword,
      limit: limit,
      sortBy: 'favorite'
    };
    
    const response = await sendMessage<PromptFilter, Prompt[]>({
      type: 'SEARCH_PROMPTS',
      payload: filter
    });
    
    console.log('[AetherFlow] 消息服务: 收到搜索响应', response ? '成功' : '失败');
    return response;
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
    await sendMessage<string, boolean>({
      type: 'INCREMENT_PROMPT_USE',
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
    type: 'PROMPT_UPDATED'
  });
}

// 导出消息服务
export const promptMessagingService = {
  searchPromptsByMessaging,
  incrementPromptUseByMessaging,
  notifyPromptUpdated
}; 