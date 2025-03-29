import { storageService } from '../services/storage';
import { Prompt } from '../services/prompt/types';
import { v4 as uuidv4 } from 'uuid';

// 初始示例提示词数据
const samplePrompts: Omit<Prompt, 'id'>[] = [
  {
    title: '简介总结',
    content: '请对以下内容进行简要总结，突出最重要的信息，控制在200字以内。',
    isFavorite: true,
    favorite: true,
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
    title: '代码解释',
    content: '请解释以下代码的功能，并分析其中的关键逻辑和潜在问题。',
    isFavorite: false, 
    favorite: false,
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
    title: '学术润色',
    content: '请帮我润色以下学术段落，使其更加专业、流畅，同时保持原意不变。',
    isFavorite: true,
    favorite: true,
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
    title: '高级搜索',
    content: '请帮我在网络上查找关于以下主题的最新研究和数据，并提供可靠的来源链接。',
    isFavorite: true,
    favorite: true,
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
    title: '高效学习方法',
    content: '请提供一些针对以下主题的高效学习策略和记忆技巧，帮助我快速掌握核心概念。',
    isFavorite: false,
    favorite: false,
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

/**
 * 初始化示例提示词数据
 * 用于新安装或无数据时
 */
export async function initializeSampleData(): Promise<void> {
  try {
    console.log('[SampleData] 开始初始化示例提示词数据...');
    
    // 批量保存示例提示词
    for (const samplePrompt of samplePrompts) {
      const prompt: Prompt = {
        ...samplePrompt,
        id: uuidv4() // 生成唯一ID
      };
      
      await storageService.savePrompt(prompt);
    }
    
    console.log('[SampleData] 示例提示词数据初始化完成');
  } catch (error) {
    console.error('[SampleData] 初始化示例数据失败:', error);
    throw error;
  }
} 