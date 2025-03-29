import { addMessageListener, createSuccessResponse, createErrorResponse } from '../services/messaging';
import { Message } from '../services/messaging/types';
import { storageService } from '../services/storage';
import { setupPromptMessaging } from '../services/prompt/messaging';
import { Prompt, PromptFilter } from '../services/prompt/types';
import { initializeSampleData } from './sampleData';

console.log('[AetherFlow] 后台脚本加载成功');

// 初始化提示词消息处理
setupPromptMessaging();

// 添加初始化数据的函数
async function setupInitialData() {
  try {
    // 检查是否已有数据
    const existingPrompts = await storageService.getAllPrompts();
    
    // 如果没有数据，初始化示例数据
    if (existingPrompts.length === 0) {
      console.log('[AetherFlow] 后台: 初始化示例提示词数据');
      await initializeSampleData();
    } else {
      console.log('[AetherFlow] 后台: 已存在提示词数据, 共', existingPrompts.length, '条');
    }
  } catch (error) {
    console.error('[AetherFlow] 后台: 初始化数据失败', error);
  }
}

// 处理扩展消息
addMessageListener((message: Message, sender, sendResponse) => {
  console.log('[AetherFlow] 后台: 收到消息', message.type, message.payload);
  
  // 大部分消息已由setupPromptMessaging处理，这里只处理特殊消息
  try {
    if (message.type === 'LEGACY_SEARCH_PROMPTS') {
      // 兼容旧版消息格式
      const payload = message.payload as { keyword: string; limit?: number };
      
      // 转换为新的过滤器格式
      const filter: PromptFilter = {
        searchTerm: payload.keyword || '',
        limit: payload.limit || 10,
        sortBy: 'favorite'
      };
      
      // 使用统一存储服务搜索
      storageService.getAllPrompts()
        .then(allPrompts => {
          // 在内存中过滤
          let results = [...allPrompts];
          
          // 关键词过滤
          if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            results = results.filter(prompt => 
              prompt.title.toLowerCase().includes(term) || 
              prompt.content.toLowerCase().includes(term) ||
              prompt.tags?.some(tag => tag.toLowerCase().includes(term))
            );
          }
          
          // 排序：收藏优先，然后是使用次数
          results.sort((a, b) => {
            // 首先按收藏状态排序
            const aFavorite = a.isFavorite || a.favorite || false;
            const bFavorite = b.isFavorite || b.favorite || false;
            if (aFavorite !== bFavorite) {
              return aFavorite ? -1 : 1;
            }
            // 然后按使用频率排序
            return (b.useCount || 0) - (a.useCount || 0);
          });
          
          // 应用限制
          if (filter.limit) {
            results = results.slice(0, filter.limit);
          }
          
          console.log('[AetherFlow] 后台: 搜索结果', results.length, '条记录');
          
          // 返回结果
          sendResponse(results);
        })
        .catch(error => {
          console.error('[AetherFlow] 后台: 搜索提示词错误', error);
          sendResponse([]);
        });
      
      return true; // 异步响应
    } else {
      // 其他消息由统一消息服务处理
      return false;
    }
  } catch (error) {
    console.error('[AetherFlow] 后台: 处理消息错误', error);
    sendResponse(createErrorResponse(error as Error));
    return true;
  }
});

// 设置侧边栏行为，点击扩展图标时打开侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: Error) => {
  console.error('设置侧边栏行为失败:', error);
});

// 处理扩展安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 新安装时，初始化示例数据
    setupInitialData().then(() => {
      // 打开欢迎页面
      chrome.tabs.create({ url: 'welcome.html' });
    });
  } else if (details.reason === 'update') {
    // 更新时执行数据迁移
    console.log('扩展已更新到新版本，正在检查数据...');
    setupInitialData();
  }
});
