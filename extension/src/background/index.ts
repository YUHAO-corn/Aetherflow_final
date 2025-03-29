import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';
import type { Prompt } from '../services/prompt/types';

console.log('[AetherFlow] 后台脚本加载成功');

// 模拟提示词数据用于开发
const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: '简介总结',
    content: '请对以下内容进行简要总结，突出最重要的信息，控制在200字以内。',
    isFavorite: true,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 50000,
    useCount: 15,
    lastUsed: Date.now() - 10000,
    tags: ['总结', '简介'],
    source: 'predefined',
    category: '写作辅助',
    isActive: true
  },
  {
    id: '2',
    title: '代码解释',
    content: '请解释以下代码的功能，并分析其中的关键逻辑和潜在问题。',
    isFavorite: false, 
    createdAt: Date.now() - 900000,
    updatedAt: Date.now() - 80000,
    useCount: 8,
    lastUsed: Date.now() - 40000,
    tags: ['编程', '代码'],
    source: 'user',
    category: '编程助手',
    isActive: true
  },
  {
    id: '3',
    title: '学术润色',
    content: '请帮我润色以下学术段落，使其更加专业、流畅，同时保持原意不变。',
    isFavorite: true,
    createdAt: Date.now() - 700000,
    updatedAt: Date.now() - 70000,
    useCount: 12,
    lastUsed: Date.now() - 20000,
    tags: ['学术', '润色'],
    source: 'user',
    category: '写作辅助',
    isActive: true
  },
  {
    id: '4',
    title: '高级搜索',
    content: '请帮我在网络上查找关于以下主题的最新研究和数据，并提供可靠的来源链接。',
    isFavorite: true,
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 30000,
    useCount: 5,
    lastUsed: Date.now() - 15000,
    tags: ['搜索', '研究', '数据'],
    source: 'user',
    category: '信息查询',
    isActive: true
  },
  {
    id: '5',
    title: '高效学习方法',
    content: '请提供一些针对以下主题的高效学习策略和记忆技巧，帮助我快速掌握核心概念。',
    isFavorite: false,
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 20000,
    useCount: 7,
    lastUsed: Date.now() - 5000,
    tags: ['学习', '教育', '记忆'],
    source: 'user',
    category: '教育辅助',
    isActive: true
  }
];

// 处理扩展消息
addMessageListener((message: Message, sender, sendResponse) => {
  console.log('[AetherFlow] 后台: 收到消息', message.type, message.payload);
  
  try {
    if (message.type === 'SEARCH_PROMPTS') {
      const payload = message.payload as { keyword: string; limit?: number };
      const keyword = payload.keyword || '';
      const limit = payload.limit || 10;
      
      console.log('[AetherFlow] 后台: 搜索提示词', keyword, limit);
      
      // 返回所有模拟数据（空关键词）或筛选结果
      let results: Prompt[];
      
      if (keyword === '') {
        console.log('[AetherFlow] 后台: 返回所有提示词');
        results = [...mockPrompts];
      } else {
        const searchTerm = keyword.toLowerCase();
        console.log('[AetherFlow] 后台: 按关键词筛选', searchTerm);
        
        results = mockPrompts.filter(prompt => {
          // 标题匹配
          const titleMatch = prompt.title.toLowerCase().includes(searchTerm);
          // 内容匹配
          const contentMatch = prompt.content.toLowerCase().includes(searchTerm);
          // 标签匹配
          const tagMatch = prompt.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) || false;
          
          return titleMatch || contentMatch || tagMatch;
        });
      }
      
      // 排序：收藏优先，然后是使用次数
      results.sort((a, b) => {
        // 首先按收藏状态排序
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1;
        }
        // 然后按使用频率排序
        return b.useCount - a.useCount;
      });
      
      // 应用limit
      results = results.slice(0, limit);
      
      console.log('[AetherFlow] 后台: 搜索结果', results.length, '条记录');
      
      // 模拟网络延迟后返回结果
      setTimeout(() => {
        console.log('[AetherFlow] 后台: 发送搜索结果');
        sendResponse(results);
      }, 300);
      
      return true; // 异步响应
    } 
    
    else if (message.type === 'INCREMENT_PROMPT_USE') {
      const promptId = message.payload as string;
      console.log('[AetherFlow] 后台: 增加提示词使用次数', promptId);
      
      // 在实际应用中，这里会更新存储
      // 查找并更新本地模拟数据（仅用于演示）
      const promptIndex = mockPrompts.findIndex(p => p.id === promptId);
      if (promptIndex !== -1) {
        mockPrompts[promptIndex].useCount += 1;
        mockPrompts[promptIndex].lastUsed = Date.now();
        console.log('[AetherFlow] 后台: 更新了提示词使用次数', promptId, mockPrompts[promptIndex].useCount);
      }
      
      // 模拟成功响应
      setTimeout(() => {
        sendResponse({ success: true });
      }, 100);
      
      return true; // 异步响应
    }
    
    // 其他消息处理...
    else {
      console.log('[AetherFlow] 后台: 未知消息类型', message.type);
      sendResponse({ error: '未知消息类型' });
    }
  } catch (error) {
    console.error('[AetherFlow] 后台: 处理消息错误', error);
    sendResponse({ error: String(error) });
  }
});

// 设置侧边栏行为，点击扩展图标时打开侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: Error) => {
  console.error('设置侧边栏行为失败:', error);
});

// 处理扩展安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 新安装时，打开欢迎页面
    chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    // 更新时的逻辑，如显示更新内容
    console.log('扩展已更新到新版本');
  }
});
