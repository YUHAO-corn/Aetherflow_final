import axios, { AxiosError } from 'axios';

// 优化模式类型
export type OptimizationMode = 'standard' | 'creative' | 'concise';

// DeepSeek API配置
const API_KEY = 'sk-e7eb50c23c684a1fbfceedf6623e4a3d';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL_ID = 'deepseek-chat';

// 最大重试次数
const MAX_RETRIES = 2;
// 重试延迟（毫秒）
const RETRY_DELAY = 1000;

/**
 * 获取不同优化模式的系统提示词
 */
function getSystemPrompt(mode: OptimizationMode): string {
  const basePrompt = `你是一位专业的提示词优化专家。你的唯一任务是改进用户提供的提示词的表达方式和结构。

【重要】：这是一个提示词优化工具，不是问答工具。你绝对不能回答提示词中的问题内容，而只能改进提示词本身的表达。

用户提供的内容是"需要优化的提示词"，你需要输出一个优化后的提示词版本，而不是回答这个提示词的内容。

示例1:
输入: "如何高效学习"
✅ 正确输出: "请详细说明适合不同学习风格的高效学习方法，包括时间管理技巧、记忆增强策略和专注力训练方法。在回答中，分别针对视觉型、听觉型和实践型学习者提供具体建议，并附上每种方法的预期效果和科学依据。"
❌ 错误输出: "高效学习的方法包括：1. 番茄工作法 2. 主动回顾 3. 费曼技巧..."

示例2:
输入: "我的心情不好怎么办？"
✅ 正确输出: "请提供一些有效应对消极情绪的策略和方法。我希望了解：1) 快速缓解不良情绪的即时技巧；2) 长期维持情绪健康的日常习惯；3) 专业心理学视角的情绪管理建议。请在回答中涵盖身体、思维和社交各方面的平衡方法。"
❌ 错误输出: "改善心情的方法：1. 深呼吸放松 2. 与朋友交谈 3. 听音乐..."

输出格式要求:
1. 直接输出优化后的提示词，不要包含任何解释、评论或前言
2. 使用清晰的段落结构和适当的换行，确保良好的阅读体验
3. 可以使用Markdown格式（如*斜体*、**加粗**、# 标题等）来增强内容结构和可读性
4. 为列表内容使用适当的Markdown列表格式（- 或1. 等）
5. 如果原文有明显的格式结构，保留或优化这种结构
6. 对重要内容可以使用加粗或其他强调方式突出显示
7. 避免输出任何关于提示词内容的实际回答
8. 提示词优化应当使其更加具体、明确、结构化`;
  
  switch (mode) {
    case 'standard':
      return `${basePrompt}
      
请遵循以下优化原则：
1. 添加清晰的结构（背景、任务、格式要求等）
2. 提高明确性，消除模糊表述
3. 添加必要的上下文信息
4. 改进格式和组织
5. 根据领域添加适当的专业术语
6. 明确指出期望的输出格式、长度和风格

确保保持提示词的原始意图，但使其更加有效。`;
    
    case 'creative':
      return `${basePrompt}
      
请遵循以下优化原则，强调创意和拓展性思维：
1. 扩展提示词的思维边界和可能性
2. 添加丰富的创意元素和多样化表达
3. 鼓励创新和非常规思考
4. 使用生动的描述和比喻
5. 增加开放式问题和探索性指令
6. 允许多种可能的解释方向

让提示词更有创造性，但仍然保持原始目标。`;
    
    case 'concise':
      return `${basePrompt}
      
请遵循以下简洁优化原则：
1. 删除所有冗余和不必要的词语
2. 使用精确简洁的语言
3. 保留关键指令和核心需求
4. 确保每个词都有明确目的
5. 使用清晰的结构但最小化额外描述
6. 优先使用简单直接的表达方式

使提示词更加精简高效，但不损失必要信息和功能性。`;
  }
}

/**
 * 对模型返回的内容进行标准化处理
 * 确保在存储前格式就已经统一，使所有地方显示一致
 * @param content 模型返回的原始内容
 */
function postProcessResponse(content: string): string {
  // 1. 移除"优化后的提示词："等引导语
  let processed = content.replace(/^(优化后的提示词[:：]|以下是优化后的提示词[:：]|优化结果[:：]|以下是[^:：]*优化[^:：]*[:：])/i, '').trim();
  
  // 2. 处理过多的空行（超过2个连续空行的情况）
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // 3. 移除末尾的空行
  processed = processed.replace(/\n+$/g, '');
  
  // 4. 确保开头没有空行
  processed = processed.replace(/^\n+/, '');
  
  return processed;
}

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试机制的API请求
 */
async function makeAPIRequestWithRetry(
  url: string,
  data: any,
  headers: any,
  retries = MAX_RETRIES
): Promise<any> {
  try {
    const response = await axios.post(url, data, { headers });
    return response;
  } catch (error: unknown) {
    if (retries <= 0) throw error;
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // 如果是网络错误或服务器错误（5xx），则重试
      if (!axiosError.response || (axiosError.response.status >= 500 && axiosError.response.status < 600)) {
        console.log(`请求失败，${retries}次后重试...`);
        await delay(RETRY_DELAY);
        return makeAPIRequestWithRetry(url, data, headers, retries - 1);
      }
      
      // 对于API错误限制（429），增加等待时间并重试
      if (axiosError.response && axiosError.response.status === 429) {
        console.log(`API限流，延长等待时间后重试...`);
        await delay(RETRY_DELAY * 3);
        return makeAPIRequestWithRetry(url, data, headers, retries - 1);
      }
    }
    
    throw error;
  }
}

/**
 * 优化提示词服务
 */
export async function optimizePrompt(
  content: string, 
  mode: OptimizationMode = 'standard'
): Promise<string> {
  try {
    if (!content || content.trim() === '') {
      throw new Error('提示词内容不能为空');
    }
    
    // 检查内容长度，防止超出模型限制
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "...(内容已截断)";
    }
    
    console.log('[OptimizationService] 开始请求AI优化提示词，内容长度:', content.length);
    
    const systemPrompt = getSystemPrompt(mode);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const data = {
      model: MODEL_ID,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `需要优化的提示词: "${content}"\n\n请记住：你的任务是优化上述提示词的结构和表达，而不是回答提示词中的问题。`
        }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
    };
    
    const response = await makeAPIRequestWithRetry(API_URL, data, headers);
    
    // 提取优化后的内容
    let optimizedContent = response.data.choices[0].message.content;
    console.log('[OptimizationService] 获取到AI优化内容，长度:', optimizedContent.length);
    
    // 对响应内容进行标准化处理
    optimizedContent = postProcessResponse(optimizedContent);
    
    return optimizedContent;
  } catch (error: unknown) {
    console.error('提示词优化请求失败:', error);
    
    // 针对不同类型的错误提供更详细的错误信息
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (!axiosError.response) {
        throw new Error('网络连接失败，请检查您的网络连接');
      }
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        let errorMessage = '优化失败';
        
        switch (status) {
          case 400:
            errorMessage = '请求参数错误';
            break;
          case 401:
            errorMessage = 'API密钥无效或已过期';
            break;
          case 403:
            errorMessage = '请求被拒绝，无权访问';
            break;
          case 404:
            errorMessage = 'API端点不存在';
            break;
          case 429:
            errorMessage = 'API请求超出限制，请稍后重试';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'DeepSeek服务器错误，请稍后重试';
            break;
          default:
            errorMessage = `API错误: ${status}`;
        }
        
        console.error('API错误详情:', axiosError.response.data);
        throw new Error(`${errorMessage}`);
      }
    }
    
    // 一般错误处理
    throw new Error('优化提示词失败，请稍后重试');
  }
}

/**
 * 继续优化提示词
 */
export async function continueOptimize(
  content: string,
  mode: OptimizationMode = 'standard'
): Promise<string> {
  try {
    if (!content || content.trim() === '') {
      throw new Error('提示词内容不能为空');
    }
    
    // 检查内容长度，防止超出模型限制
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "...(内容已截断)";
    }
    
    console.log('[OptimizationService] 开始请求AI继续优化提示词，内容长度:', content.length);
    
    const systemPrompt = getSystemPrompt(mode);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const data = {
      model: MODEL_ID,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `需要进一步优化的提示词: "${content}"\n\n请记住：你的任务是优化上述提示词，使其更${mode === 'standard' ? '有效和结构化' : mode === 'creative' ? '有创意和启发性' : '简洁和精确'}，而不是回答提示词中的问题。`
        }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
    };
    
    const response = await makeAPIRequestWithRetry(API_URL, data, headers);
    
    // 提取优化后的内容
    let optimizedContent = response.data.choices[0].message.content;
    console.log('[OptimizationService] 获取到AI继续优化内容，长度:', optimizedContent.length);
    
    // 对响应内容进行标准化处理
    optimizedContent = postProcessResponse(optimizedContent);
    
    return optimizedContent;
  } catch (error: unknown) {
    console.error('提示词继续优化请求失败:', error);
    
    // 针对不同类型的错误提供更详细的错误信息
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (!axiosError.response) {
        throw new Error('网络连接失败，请检查您的网络连接');
      }
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        let errorMessage = '优化失败';
        
        switch (status) {
          case 400:
            errorMessage = '请求参数错误';
            break;
          case 401:
            errorMessage = 'API密钥无效或已过期';
            break;
          case 403:
            errorMessage = '请求被拒绝，无权访问';
            break;
          case 404:
            errorMessage = 'API端点不存在';
            break;
          case 429:
            errorMessage = 'API请求超出限制，请稍后重试';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'DeepSeek服务器错误，请稍后重试';
            break;
          default:
            errorMessage = `API错误: ${status}`;
        }
        
        console.error('API错误详情:', axiosError.response.data);
        throw new Error(`${errorMessage}`);
      }
    }
    
    // 一般错误处理
    throw new Error('继续优化提示词失败，请稍后重试');
  }
} 