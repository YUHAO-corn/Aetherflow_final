import axios, { AxiosError } from 'axios';
import { storageService } from './storage'; // Import storage service if needed elsewhere, or use chrome.storage directly
import { getSystemPrompt, OptimizationMode } from './systemPrompts';

// 优化版本类型
export interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
  createdAt?: number;
  parentId?: number;
  editedContent?: string;
  isEdited?: boolean;
  position?: number;
}

// 优化选项类型
export interface OptimizeOptions {
  mode?: OptimizationMode;
  temperature?: number;
  maxTokens?: number;
}

// --- Doubao API Configuration --- 
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DOUBAO_MODEL_ID = 'doubao-lite-32k-240828'; // Use the same Lite model for now
const STORAGE_API_KEY_NAME = 'doubaoApiKey'; // Key name in chrome.storage
// --- End Configuration --- 

// 最大重试次数 (Keep for fetch retry logic)
const MAX_RETRIES = 2;
// 重试延迟（毫秒） (Keep for fetch retry logic)
const RETRY_DELAY = 1000;

/**
 * 检测内容语言并确保语言一致性
 * @param originalContent 原始提示词内容
 * @param optimizedContent 优化后的内容
 * @returns 修正后的内容
 */
function ensureLanguageConsistency(originalContent: string, optimizedContent: string): string {
  // 简单的语言检测规则
  const isOriginalChinese = /[\u4e00-\u9fa5]/.test(originalContent);
  const isOptimizedChinese = /[\u4e00-\u9fa5]/.test(optimizedContent);
  
  // 如果语言不一致，重新请求优化
  if (isOriginalChinese !== isOptimizedChinese) {
    console.warn('[OptimizationService] 检测到语言不一致，尝试修正');
    
    // 构建更强调语言要求的提示
    const languagePrompt = isOriginalChinese 
      ? "请注意：输入内容是中文，必须用中文回复。请重新优化以下提示词："
      : "IMPORTANT: The input is in English. Please optimize the following prompt in English ONLY:";
    
    // 返回带有明确语言要求的原始内容
    return `${languagePrompt}\n\n${originalContent}`;
  }
  
  return optimizedContent;
}

/**
 * 对模型返回的内容进行标准化处理
 * 确保在存储前格式就已经统一，使所有地方显示一致
 * @param content 模型返回的原始内容
 * @param originalContent 原始提示词内容
 */
function postProcessResponse(content: string, originalContent: string): string {
  // 1. 移除中英文引导语，只匹配内容开头
  let processed = content.replace(/^(优化后的提示词[:：]|以下是优化后的提示词[:：]|优化结果[:：]|以下是[^:：]*优化[^:：]*[:：]|Optimized Prompt[:：]?|Here is the optimized prompt[:：]?|The optimized version[:：]?|Optimized Result[:：]?|Optimization Result[:：]?|Here's the optimized prompt[:：]?)/i, '').trim();
  
  // 2. 检查语言一致性
  processed = ensureLanguageConsistency(originalContent, processed);
  
  // 3. 转换Markdown为人类可读的纯文本
  processed = convertMarkdownToPlainText(processed);
  
  // 4. 处理过多的空行（超过2个连续空行的情况）
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // 5. 移除末尾的空行
  processed = processed.replace(/\n+$/g, '');
  
  // 6. 确保开头没有空行
  processed = processed.replace(/^\n+/, '');
  
  return processed;
}

/**
 * 将Markdown格式转换为人类可读的纯文本
 * 处理标题层级、列表、强调语法等
 * @param markdownText Markdown格式的文本
 * @returns 转换后的人类可读纯文本
 */
function convertMarkdownToPlainText(markdownText: string): string {
  // 预处理：处理代码块，防止内部内容被误处理
  markdownText = markdownText.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```(?:.*\n)?([\s\S]*?)```/g, '$1');
  });
  
  // 预处理：识别标题结构并为其添加适当编号
  const lines = markdownText.split('\n');
  const result: string[] = [];
  
  // 标题计数器
  const counters = [0, 0, 0, 0, 0, 0]; // h1-h6的计数器
  let lastLevel = 0; // 上一个标题级别
  let inList = false; // 是否在列表中
  
  // 标题模式正则表达式
  const headingRegex = /^(#{1,6})\s+(.*)$/;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const headingMatch = line.match(headingRegex);
    const isListItem = line.match(/^(\s*)[-*+]|\d+\.\s+/);
    
    // 处理标题
    if (headingMatch) {
      // 如果从列表切换到标题，添加额外空行分隔
      if (inList) {
        result.push('');
        inList = false;
      }
      
      const level = headingMatch[1].length; // 标题级别
      const title = headingMatch[2].trim(); // 标题内容
      
      // 当遇到新的标题时，重置所有更低级别的计数器
      if (level <= lastLevel) {
        for (let j = level; j <= 5; j++) {
          counters[j] = 0;
        }
      }
      
      // 增加当前级别的计数
      counters[level - 1]++;
      lastLevel = level;
      
      // 根据标题级别生成编号
      let prefix = '';
      if (level === 1) {
        // 一级标题不添加编号
        prefix = '';
      } else {
        // 生成多级编号 (如 1., 1.1, 1.1.1)
        prefix = '';
        for (let j = 1; j < level; j++) {
          if (counters[j - 1] > 0) {
            prefix += counters[j - 1] + '.';
          }
        }
        prefix = prefix.replace(/\.$/, '') + ' '; // 移除末尾的点并添加空格
      }
      
      // 替换标题行
      line = prefix + title;
      
      // 在一级标题和前添加空行，保持结构清晰
      if (level === 1 && i > 0) {
        result.push(''); // 在一级标题前添加空行
      }
    } 
    // 处理列表项
    else if (isListItem) {
      inList = true;
      
      // 处理无序列表项
      if (line.match(/^(\s*)[-*+]\s+/)) {
        line = line.replace(/^(\s*)[-*+]\s+/, (match, indentation) => {
          // 保持缩进，替换为圆点
          return indentation + '• ';
        });
      } 
      // 处理有序列表项
      else if (line.match(/^(\s*)\d+\.\s+/)) {
        line = line.replace(/^(\s*)(\d+)\.\s+/, (match, indentation, number) => {
          // 保持缩进和编号
          return indentation + number + '. ';
        });
      }
    } 
    // 空行处理
    else if (line.trim() === '') {
      // 如果不是在列表内的空行，并且前一行不是空行，则保留
      if (!inList || (i > 0 && lines[i-1].trim() !== '')) {
        result.push(line);
      }
      continue; // 跳过后续处理
    } 
    // 结束列表状态
    else {
      inList = false;
    }
    
    // 处理各种Markdown格式
    // 移除粗体和斜体标记
    line = line
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
      .replace(/__(.*?)__/g, '$1')     // 移除下划线粗体
      .replace(/\*(.*?)\*/g, '$1')     // 移除斜体
      .replace(/_(.*?)_/g, '$1')       // 移除下划线斜体
      .replace(/`(.*?)`/g, '$1');      // 移除内联代码
    
    result.push(line);
    
    // 在一级标题后添加空行
    if (headingMatch && headingMatch[1].length === 1) {
      result.push(''); // 在一级标题后添加空行
    }
  }
  
  // 最终文本处理
  let resultText = result.join('\n');
  
  // 统一空行处理：确保标题间只有一个空行，内容部分紧凑
  resultText = resultText
    .replace(/\n{3,}/g, '\n\n')      // 将三个以上空行减少为两个
    .replace(/\n+$/g, '')           // 移除末尾空行
    .replace(/^\n+/, '');           // 移除开头空行
  
  return resultText;
}

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to get API Key from storage
 */
async function getDoubaoApiKey(): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(STORAGE_API_KEY_NAME, (result) => {
            if (chrome.runtime.lastError) {
                console.error('[OptimizationService] 读取 doubaoApiKey 出错:', chrome.runtime.lastError);
                reject(new Error('Failed to read API Key'));
            } else if (result && result[STORAGE_API_KEY_NAME]) {
                resolve(result[STORAGE_API_KEY_NAME]);
            } else {
                reject(new Error('API Key not configured'));
      }
        });
    });
}

/**
 * 优化提示词服务 (Refactored for Doubao API)
 */
export async function optimizePrompt(
  content: string, 
  mode: OptimizationMode = 'standard'
): Promise<string> {
  let retries = MAX_RETRIES;
  while(retries >= 0) {
  try {
    if (!content || content.trim() === '') {
      throw new Error('提示词内容不能为空');
    }
    
        // 检查内容长度
        if (content.length > 10000) { // Consider Doubao context length if different
      content = content.substring(0, 10000) + "...(内容已截断)";
    }
    
        console.log(`[OptimizationService] 开始请求豆包优化提示词(${mode}), 长度:`, content.length);
        
        // Get API Key
        const apiKey = await getDoubaoApiKey();
    
    const systemPrompt = getSystemPrompt(mode);
    
    const headers = {
      'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
    };
    
        const body = JSON.stringify({
          model: DOUBAO_MODEL_ID,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `需要优化的提示词: ${content}\n\n请记住：你的任务是优化上述提示词的结构和表达，而不是回答提示词中的问题。`
        }
      ],
          temperature: mode === 'creative' ? 0.8 : 0.3, // Keep temperature logic for now
          max_tokens: 1000 // Keep max_tokens logic for now
        });
    
        // Make API call using fetch
        const response = await fetch(DOUBAO_API_URL, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
             // Specific handling for retryable errors (e.g., 5xx, 429)
             if ((response.status >= 500 || response.status === 429) && retries > 0) {
                console.warn(`[OptimizationService] API 请求失败 (${response.status}), ${retries} 次后重试...`);
                await delay(response.status === 429 ? RETRY_DELAY * 3 : RETRY_DELAY);
                retries--;
                continue; // Retry the loop
            }
            // Non-retryable errors
            const errorData = await response.json().catch(() => ({})); 
            console.error(`[OptimizationService] 豆包 API 请求失败: ${response.status} ${response.statusText}`, errorData);
            let errorMessage = `API错误: ${response.status}`; // Use status from response
             switch (response.status) {
              case 400: errorMessage = '请求参数错误'; break;
              case 401: errorMessage = 'API密钥无效或已过期'; break;
              case 403: errorMessage = '请求被拒绝，无权访问'; break;
              case 404: errorMessage = 'API端点不存在'; break;
              case 429: errorMessage = 'API请求超出限制，请稍后重试'; break;
              case 500: case 502: case 503: errorMessage = '豆包服务器错误，请稍后重试'; break;
              default: errorMessage = `API错误: ${response.status}`; 
            }
            throw new Error(`${errorMessage}`);
        }

        const responseData = await response.json();
        
        if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
            let optimizedContent = responseData.choices[0].message.content;
            console.log('[OptimizationService] 获取到豆包优化内容，长度:', optimizedContent.length);
            
            // Post-process (language check might trigger a re-run, handled conceptually)
            // Note: The language check logic might need adjustment if it relies on specific error messages
      optimizedContent = postProcessResponse(optimizedContent, content);
            
            // If language check requires re-run, it modifies optimizedContent; 
            // a more robust solution might involve re-calling optimizePrompt 
            // but let's keep it simple for now and rely on postProcessResponse side effect.
            // A better retry would check the content directly here.

            return optimizedContent; // Success
        } else {
            console.error('[OptimizationService] 豆包 API 响应格式无效:', responseData);
            throw new Error('Invalid API response format');
      }
      
      } catch (error: unknown) {
         if (retries <= 0) {
             console.error('提示词优化请求失败 (已达最大重试次数):', error);
             // Re-throw specific errors if needed, or a generic one
             if (error instanceof Error && (error.message === 'API Key not configured' || error.message === 'Failed to read API Key')) {
                 throw error; // Propagate storage/config errors
             }
             throw new Error('优化提示词失败，请稍后重试');
         } else {
             // For errors other than retryable API errors, maybe don't retry?
             // Or implement specific retry logic based on error type.
             // For now, let's assume most other errors are not worth retrying.
             console.error('提示词优化请求发生错误，非 API 错误或已重试:', error);
              throw new Error('优化提示词失败，请稍后重试'); // Throw immediately for non-API/non-retryable errors
         }
      }
    }
  // Should not be reached if MAX_RETRIES >= 0, but needed for type safety
  throw new Error('优化提示词失败，已达最大重试次数'); 
}

/**
 * 继续优化提示词 (Refactored for Doubao API)
 */
export async function continueOptimize(
  content: string,
  mode: OptimizationMode = 'standard'
): Promise<string> {
   let retries = MAX_RETRIES;
  while(retries >= 0) {
  try {
    if (!content || content.trim() === '') {
      throw new Error('提示词内容不能为空');
    }
    
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "...(内容已截断)";
    }
    
        console.log(`[OptimizationService] 开始请求豆包继续优化提示词(${mode}), 长度:`, content.length);
    
        const apiKey = await getDoubaoApiKey();
    const systemPrompt = getSystemPrompt(mode);
    
    const headers = {
      'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
    };
    
        const body = JSON.stringify({
          model: DOUBAO_MODEL_ID,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `需要进一步优化的提示词: ${content}\n\n请记住：你的任务是优化上述提示词，使其更${mode === 'standard' ? '有效和结构化' : mode === 'creative' ? '有创意和启发性' : '简洁和精确'}，而不是回答提示词中的问题。`
        }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
        });
    
        const response = await fetch(DOUBAO_API_URL, {
            method: 'POST',
            headers: headers,
            body: body
        });
    
         if (!response.ok) {
             if ((response.status >= 500 || response.status === 429) && retries > 0) {
                console.warn(`[OptimizationService] 继续优化 API 请求失败 (${response.status}), ${retries} 次后重试...`);
                await delay(response.status === 429 ? RETRY_DELAY * 3 : RETRY_DELAY);
                retries--;
                continue; 
            }
            const errorData = await response.json().catch(() => ({})); 
            console.error(`[OptimizationService] 豆包 API 继续优化请求失败: ${response.status} ${response.statusText}`, errorData);
            let errorMessage = `API错误: ${response.status}`; // Use status from response
             switch (response.status) {
              case 400: errorMessage = '请求参数错误'; break;
              case 401: errorMessage = 'API密钥无效或已过期'; break;
              case 403: errorMessage = '请求被拒绝，无权访问'; break;
              case 404: errorMessage = 'API端点不存在'; break;
              case 429: errorMessage = 'API请求超出限制，请稍后重试'; break;
              case 500: case 502: case 503: errorMessage = '豆包服务器错误，请稍后重试'; break;
              default: errorMessage = `API错误: ${response.status}`; 
            }
            throw new Error(`${errorMessage}`);
        }

        const responseData = await response.json();
        
        if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
            let optimizedContent = responseData.choices[0].message.content;
            console.log('[OptimizationService] 获取到豆包继续优化内容，长度:', optimizedContent.length);
            optimizedContent = postProcessResponse(optimizedContent, content);
            return optimizedContent;
        } else {
             console.error('[OptimizationService] 豆包 API 继续优化响应格式无效:', responseData);
            throw new Error('Invalid API response format');
        }

      } catch (error: unknown) {
         if (retries <= 0) {
             console.error('提示词继续优化请求失败 (已达最大重试次数):', error);
             if (error instanceof Error && (error.message === 'API Key not configured' || error.message === 'Failed to read API Key')) {
                 throw error; 
      }
             throw new Error('继续优化提示词失败，请稍后重试');
         } else {
             console.error('提示词继续优化请求发生错误，非 API 错误或已重试:', error);
    throw new Error('继续优化提示词失败，请稍后重试');
  }
      }
  }
  throw new Error('继续优化提示词失败，已达最大重试次数'); 
}

// 仅在非生产环境使用，用于测试Markdown转换功能
export function testMarkdownConversion(markdownText: string): string {
  return convertMarkdownToPlainText(markdownText);
}

// 测试函数：用于测试移除引导语和Markdown转换
export function testProcessingFunctions(content: string): {
  afterRemovingPrefixes: string;
  finalResult: string;
} {
  // 测试移除引导语
  const afterRemovingPrefixes = content.replace(/^(优化后的提示词[:：]|以下是优化后的提示词[:：]|优化结果[:：]|以下是[^:：]*优化[^:：]*[:：]|Optimized Prompt[:：]?|Here is the optimized prompt[:：]?|The optimized version[:：]?|Optimized Result[:：]?|Optimization Result[:：]?|Here's the optimized prompt[:：]?)/i, '').trim();
  
  // 测试完整处理流程
  const finalResult = postProcessResponse(content, content);
  
  return {
    afterRemovingPrefixes,
    finalResult
  };
} 