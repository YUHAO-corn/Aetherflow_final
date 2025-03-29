import { 
  Prompt, 
  PromptFilter, 
  CreatePromptInput, 
  UpdatePromptInput,
  PROMPT_STORAGE_LIMITS
} from './types';
import { PromptValidator } from './validator';
import { PromptError, PromptErrorCode } from './errors';
import { storageService, STORAGE_KEYS, STORAGE_LIMITS } from '../storage';
import { TitleGenerator, generateTitle } from './title-generator';

/**
 * 生成唯一ID
 * 生成UUIDv4格式的字符串
 */
function generateId(): string {
  // UUIDv4生成方法
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取所有提示词
 */
export async function getPrompts(filter?: PromptFilter): Promise<Prompt[]> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    return prompts;
  } catch (error) {
    console.error('获取提示词失败:', error);
    throw new PromptError('获取提示词失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 通过ID获取提示词
 */
export async function getPromptById(id: string): Promise<Prompt | null> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    return prompts.find(p => p.id === id) || null;
  } catch (error) {
    console.error(`获取提示词(ID:${id})失败:`, error);
    throw new PromptError('获取提示词失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 搜索提示词
 */
export async function searchPrompts(filter: PromptFilter): Promise<Prompt[]> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];

    let filteredPrompts = [...prompts];
    
    // 只处理激活状态的提示词
    filteredPrompts = filteredPrompts.filter(prompt => 
      prompt.isActive !== false && prompt.active !== false
    );
    
    // 搜索关键词过滤
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filteredPrompts = filteredPrompts.filter(prompt => 
        prompt.title.toLowerCase().includes(term) || 
        prompt.content.toLowerCase().includes(term)
      );
    }
    
    // 收藏过滤
    if (filter.onlyFavorites || filter.favorite) {
      filteredPrompts = filteredPrompts.filter(prompt => 
        prompt.isFavorite || prompt.favorite
      );
    }
    
    // 排序
    if (filter.sortBy) {
      const now = Date.now();
      const TIME_RANGE = 14 * 24 * 60 * 60 * 1000; // 14天时间范围
      const USAGE_WEIGHT = 0.7;                    // 使用次数权重
      const RECENCY_WEIGHT = 0.3;                  // 最近使用时间权重
      const INITIAL_SCORE = 0.1;                   // 冷启动常数

      switch (filter.sortBy) {
        case 'usage':
          // 按使用频率排序
          filteredPrompts.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
          break;
          
        case 'favorite':
          // 按收藏状态排序
          filteredPrompts.sort((a, b) => {
            const aFav = a.isFavorite || a.favorite || false;
            const bFav = b.isFavorite || b.favorite || false;
            return (aFav === bFav) ? 0 : aFav ? -1 : 1;
          });
          break;
          
        case 'time':
          // 按最近使用时间排序
          filteredPrompts.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
          break;
          
        case 'relevance':
          // 使用综合评分公式排序
          filteredPrompts.sort((a, b) => {
            // 找出所有提示词中最大使用次数
            const maxUsage = Math.max(...filteredPrompts.map(p => p.useCount || 0));
            
            // 计算a的归一化使用次数
            const normalizedUsageA = maxUsage > 0 ? (a.useCount || 0) / maxUsage : 0;
            
            // 计算a的归一化时间接近度 (越接近当前时间，值越高)
            const timeDistanceA = Math.max(0, Math.min(1, 1 - ((now - (a.lastUsed || 0)) / TIME_RANGE)));
            
            // 计算a的综合得分
            const scoreA = (USAGE_WEIGHT * normalizedUsageA) + 
                          (RECENCY_WEIGHT * timeDistanceA) + 
                          INITIAL_SCORE;
            
            // 计算b的归一化使用次数
            const normalizedUsageB = maxUsage > 0 ? (b.useCount || 0) / maxUsage : 0;
            
            // 计算b的归一化时间接近度
            const timeDistanceB = Math.max(0, Math.min(1, 1 - ((now - (b.lastUsed || 0)) / TIME_RANGE)));
            
            // 计算b的综合得分
            const scoreB = (USAGE_WEIGHT * normalizedUsageB) + 
                          (RECENCY_WEIGHT * timeDistanceB) + 
                          INITIAL_SCORE;
            
            // 收藏状态优先级最高，在评分基础上叠加收藏因素
            const aFav = a.isFavorite || a.favorite || false;
            const bFav = b.isFavorite || b.favorite || false;
            
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            
            // 相同收藏状态则按评分排序
            return scoreB - scoreA;
          });
          break;
          
        default:
          // 默认按使用频率排序
          filteredPrompts.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
      }
    } else {
      // 默认按使用频率排序
      filteredPrompts.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
    }
    
    // 限制数量
    if (filter.limit) {
      filteredPrompts = filteredPrompts.slice(0, filter.limit);
    }
    
    return filteredPrompts;
  } catch (error) {
    console.error('搜索提示词失败:', error);
    return [];
  }
}

/**
 * 创建提示词
 */
export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  // 验证输入
  const validation = PromptValidator.validateCreate(input);
  if (!validation.valid) {
    throw new PromptError(validation.message || '验证失败', 
      validation.code || PromptErrorCode.VALIDATION_ERROR, 
      validation.field);
  }
  
  try {
    const now = Date.now();
    
    // 创建新提示词
    const newPrompt: Prompt = {
      id: generateId(),
      title: input.title.trim(),
      content: input.content.trim(),
      isFavorite: input.isFavorite || false,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
      lastUsed: now,
      tags: input.tags || [],
      source: input.source || 'user',
      category: input.category,
      isActive: true
    };
    
    // 最终验证完整提示词
    const promptValidation = PromptValidator.validatePrompt(newPrompt);
    if (!promptValidation.valid) {
      throw new PromptError(promptValidation.message || '提示词验证失败', 
        promptValidation.code || PromptErrorCode.VALIDATION_ERROR, 
        promptValidation.field);
    }
    
    // 保存到存储
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    prompts.push(newPrompt);
    await storageService.set(STORAGE_KEYS.PROMPTS, prompts);
    return newPrompt;
  } catch (error) {
    if (error instanceof PromptError) {
      throw error;
    }
    console.error('Error creating prompt:', error);
    throw new PromptError('创建提示词失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 更新提示词
 */
export async function updatePrompt(id: string, input: UpdatePromptInput): Promise<Prompt | null> {
  // 验证输入
  const validation = PromptValidator.validateUpdate(input);
  if (!validation.valid) {
    throw new PromptError(validation.message || '验证失败', 
      validation.code || PromptErrorCode.VALIDATION_ERROR, 
      validation.field);
  }
  
  try {
    console.log(`开始更新提示词(ID: ${id})，输入数据:`, JSON.stringify(input));
    
    // 获取现有提示词
    const existingPrompt = await getPromptById(id);
    if (!existingPrompt) {
      console.error(`找不到ID为${id}的提示词`);
      throw PromptError.notFound(id);
    }
    
    // 构建更新后的提示词
    const updatedPrompt = {
      ...existingPrompt,
      ...input,
      updatedAt: input.updatedAt || Date.now()
    };
    
    console.log(`构建更新后的提示词:`, JSON.stringify(updatedPrompt));
    
    // 最终验证更新后的提示词
    const promptValidation = PromptValidator.validatePrompt(updatedPrompt);
    if (!promptValidation.valid) {
      console.error(`提示词验证失败:`, promptValidation.message);
      throw new PromptError(promptValidation.message || '提示词验证失败', 
        promptValidation.code || PromptErrorCode.VALIDATION_ERROR, 
        promptValidation.field);
    }
    
    // 保存到存储
    console.log(`准备保存更新后的提示词`);
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new PromptError('提示词不存在', PromptErrorCode.ITEM_NOT_FOUND);
    }
    
    prompts[index] = updatedPrompt;
    await storageService.set(STORAGE_KEYS.PROMPTS, prompts);
    console.log(`提示词保存成功，ID: ${id}`);
    
    return updatedPrompt;
  } catch (error) {
    if (error instanceof PromptError) {
      throw error;
    }
    console.error('Error updating prompt:', error);
    throw new PromptError('更新提示词失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 删除提示词
 */
export async function deletePrompt(id: string): Promise<boolean> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    const filteredPrompts = prompts.filter(p => p.id !== id);
    
    if (filteredPrompts.length === prompts.length) {
      return false;
    }
    
    await storageService.set(STORAGE_KEYS.PROMPTS, filteredPrompts);
    return true;
  } catch (error) {
    console.error(`删除提示词失败(ID:${id}):`, error);
    throw new PromptError('删除提示词失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 软删除提示词
 */
export async function purgePrompt(id: string): Promise<boolean> {
  // 在这个简化版本中，直接使用deletePrompt实现
  return deletePrompt(id);
}

/**
 * 更新提示词使用次数
 */
export async function incrementPromptUse(id: string): Promise<boolean> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) {
      return false;
    }
    
    prompts[index] = {
      ...prompts[index],
      useCount: (prompts[index].useCount || 0) + 1,
      lastUsed: Date.now()
    };
    
    await storageService.set(STORAGE_KEYS.PROMPTS, prompts);
    return true;
  } catch (error) {
    console.error(`更新提示词使用次数失败(ID:${id}):`, error);
    return false;
  }
}

/**
 * 切换提示词收藏状态
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) {
      return false;
    }
    
    // 处理新旧两种字段名
    const currentFavorite = prompts[index].isFavorite || prompts[index].favorite || false;
    
    if (currentFavorite) {
      // 如果已收藏，则删除提示词
      const newPrompts = prompts.filter(p => p.id !== id);
      await storageService.set(STORAGE_KEYS.PROMPTS, newPrompts);
    } else {
      // 如果未收藏，则标记为收藏
      prompts[index] = {
        ...prompts[index],
        isFavorite: true,
        favorite: true
      };
      await storageService.set(STORAGE_KEYS.PROMPTS, prompts);
    }
    
    return true;
  } catch (error) {
    console.error(`切换提示词收藏状态失败(ID:${id}):`, error);
    throw new PromptError('切换提示词收藏状态失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 添加优化历史
 */
export async function addOptimizationHistory(promptId: string, content: string): Promise<boolean> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    const index = prompts.findIndex(p => p.id === promptId);
    
    if (index === -1) {
      return false;
    }
    
    const prompt = prompts[index];
    const history = prompt.optimizationHistory || [];
    
    prompts[index] = {
      ...prompt,
      optimizationHistory: [
        ...history,
        {
          version: history.length + 1,
          content,
          timestamp: Date.now()
        }
      ]
    };
    
    await storageService.set(STORAGE_KEYS.PROMPTS, prompts);
    return true;
  } catch (error) {
    console.error(`添加优化历史失败(ID:${promptId}):`, error);
    return false;
  }
}

/**
 * 导入提示词数据
 */
export async function importPrompts(prompts: Prompt[]): Promise<number> {
  try {
    const existingPrompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    
    // 合并提示词，避免ID冲突
    const existingIds = existingPrompts.map(p => p.id);
    const newPrompts = prompts.filter(p => !existingIds.includes(p.id));
    
    if (newPrompts.length === 0) {
      return 0;
    }
    
    const updatedPrompts = [...existingPrompts, ...newPrompts];
    await storageService.set(STORAGE_KEYS.PROMPTS, updatedPrompts);
    
    return newPrompts.length;
  } catch (error) {
    console.error('导入提示词失败:', error);
    throw new PromptError('导入提示词失败', PromptErrorCode.IMPORT_ERROR);
  }
}

/**
 * 导出提示词数据
 */
export async function exportPrompts(ids?: string[]): Promise<Prompt[]> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    
    if (ids && ids.length > 0) {
      return prompts.filter(p => ids.includes(p.id));
    }
    
    return prompts;
  } catch (error) {
    console.error('导出提示词失败:', error);
    throw new PromptError('导出提示词失败', PromptErrorCode.EXPORT_ERROR);
  }
}

/**
 * 获取存储使用情况
 */
export async function getStorageUsage(): Promise<{ used: number, total: number, percentage: number, count: number }> {
  try {
    const prompts = await storageService.get<Prompt[]>(STORAGE_KEYS.PROMPTS) || [];
    
    // 计算存储使用情况
    const promptsString = JSON.stringify(prompts);
    const bytesUsed = new Blob([promptsString]).size;
    
    // 使用配置的存储限制
    const totalBytes = STORAGE_LIMITS.SYNC_STORAGE_MAX_BYTES;
    const percentage = Math.round((bytesUsed / totalBytes) * 100);
    
    return {
      used: bytesUsed,
      total: totalBytes,
      percentage: percentage,
      count: prompts.length
    };
  } catch (error) {
    console.error('获取存储使用情况失败:', error);
    
    // 返回默认值
    return {
      used: 0,
      total: STORAGE_LIMITS.SYNC_STORAGE_MAX_BYTES,
      percentage: 0,
      count: 0
    };
  }
}

/**
 * 清空所有提示词
 */
export async function deletePrompts(): Promise<boolean> {
  try {
    await storageService.set(STORAGE_KEYS.PROMPTS, []);
    return true;
  } catch (error) {
    console.error('清空提示词失败:', error);
    throw new PromptError('清空提示词失败', PromptErrorCode.STORAGE_ERROR);
  }
}

/**
 * 智能生成提示词标题
 * 通过TitleGenerator类分析内容并生成标题
 * 
 * @param content 提示词内容
 * @returns 生成的标题
 */
export async function generateTitleForPrompt(content: string): Promise<string> {
  try {
    // 使用TitleGenerator生成标题
    return await generateTitle(content);
  } catch (error) {
    console.error('[AetherFlow] 标题生成出错:', error);
    // 错误处理：简单截断前30个字符作为标题
    return content.substring(0, 30).trim() + '...' || '未命名提示词';
  }
}

// 常见停用词列表
const stopWords = [
  // 英文停用词
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what', 'which', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
  
  // 中文停用词
  '的', '了', '和', '与', '或', '是', '在', '有', '中', '上', '下', '前', '后', '里', '一个', '一种', '这个', '那个',
  '会', '不会', '可以', '不可以', '应该', '不应该', '能', '不能', '要', '不要', '将', '把', '被', '使', '使用',
  '如何', '什么', '哪些', '为什么', '怎么', '怎样', '几个', '多少', '如果', '因为', '所以', '但是', '而且', '以及'
]; 