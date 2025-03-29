import axios, { AxiosError } from 'axios';

// 优化模式类型
export type OptimizationMode = 'standard' | 'creative' | 'concise';

// DeepSeek API密钥 - 使用项目提供的密钥
const API_KEY = 'sk-e7eb50c23c684a1fbfceedf6623e4a3d';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 最大重试次数
const MAX_RETRIES = 2;
// 重试延迟（毫秒）
const RETRY_DELAY = 1000;

/**
 * 获取不同优化模式的系统提示词
 */
function getSystemPrompt(mode: OptimizationMode): string {
  const basePrompt = `你是一位专业的提示词优化专家。你的任务是分析用户提供的原始提示词，并创建一个更有效、更结构化的版本。

输出要求:
1. 直接返回优化后的内容，不要加任何解释、前言或"优化后的提示词："等引导语
2. 使用清晰的段落结构和适当的换行，确保良好的阅读体验
3. 不要使用星号(*)或其他特殊符号来标记重点，使用自然语言表达
4. 返回内容格式应该是直接可用的提示词，而不是markdown或其他需要渲染的格式
5. 如果原文有明显的格式结构，保留或优化这种结构，使用适当的空行和缩进`;
  
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
 * 对模型返回的内容进行后处理
 * @param content 模型返回的原始内容
 */
function postProcessResponse(content: string): string {
  // 1. 移除"优化后的提示词："等引导语
  let processed = content.replace(/^(优化后的提示词[:：]|以下是优化后的提示词[:：]|优化结果[:：]|以下是[^:：]*优化[^:：]*[:：])/i, '').trim();
  
  // 2. 检测并替换使用星号标记的内容
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '$1');  // 替换**文本**为纯文本
  processed = processed.replace(/\*([^*]+)\*/g, '$1');      // 替换*文本*为纯文本
  
  // 3. 替换markdown的标题标记
  processed = processed.replace(/#+\s+(.+)(\n|$)/g, '$1$2');
  
  // 4. 确保段落之间有适当的换行
  processed = processed.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
  
  // 5. 移除多余的空行（超过2个连续空行的情况）
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
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
    
    const systemPrompt = getSystemPrompt(mode);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const data = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
    };
    
    const response = await makeAPIRequestWithRetry(API_URL, data, headers);
    
    // 提取优化后的内容
    let optimizedContent = response.data.choices[0].message.content;
    
    // 对响应内容进行后处理
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
    
    const systemPrompt = getSystemPrompt(mode);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const data = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `以下是已经优化过的提示词，请进一步改进它，使其更${mode === 'standard' ? '有效和结构化' : mode === 'creative' ? '有创意和启发性' : '简洁和精确'}:\n\n${content}`
        }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
    };
    
    const response = await makeAPIRequestWithRetry(API_URL, data, headers);
    
    // 提取优化后的内容
    let optimizedContent = response.data.choices[0].message.content;
    
    // 对响应内容进行后处理
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