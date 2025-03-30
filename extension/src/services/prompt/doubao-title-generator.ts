import axios from 'axios';

/**
 * 豆包API标题生成服务
 * 使用豆包AI模型生成更智能的标题
 */

// API配置
const API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = 'doubao-lite-32k-240828';
// 注意：实际应用中应通过环境变量或安全存储获取API密钥
const API_KEY = '32550ef8-b626-4478-bf53-5fb5e34e114f';

// 标题字节限制
const MAX_BYTES = 34;
const ELLIPSIS_BYTES = 3;
const EFFECTIVE_BYTES = MAX_BYTES - ELLIPSIS_BYTES;

/**
 * 计算字符串字节长度（中文2字节，其他1字节）
 */
function calculateByteLength(str: string): number {
  if (!str) return 0;
  
  let byteLen = 0;
  for (let i = 0; i < str.length; i++) {
    // 中文字符范围
    if (/[\u4e00-\u9fa5]/.test(str[i])) {
      byteLen += 2;
    } else {
      byteLen += 1;
    }
  }
  return byteLen;
}

/**
 * 智能截断确保不超过指定字节数
 */
function smartTruncate(title: string, maxBytes: number = MAX_BYTES): string {
  if (!title) return '未命名';
  
  const titleBytes = calculateByteLength(title);
  if (titleBytes <= maxBytes) {
    return title;
  }
  
  // 计算实际可用字节数（减去省略号的字节数）
  const effectiveMaxBytes = maxBytes - ELLIPSIS_BYTES;
  
  let result = '';
  let currentBytes = 0;
  let lastBreakPoint = 0;
  
  // 按字符依次添加，直到接近字节限制
  for (let i = 0; i < title.length; i++) {
    const char = title[i];
    const charBytes = /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
    
    // 记录可能的断点位置（空格、标点等）
    if (/[\s,.;，。；、！？!?]/.test(char)) {
      lastBreakPoint = i;
    }
    
    // 如果添加当前字符会超出限制，中断循环
    if (currentBytes + charBytes > effectiveMaxBytes) {
      break;
    }
    
    result += char;
    currentBytes += charBytes;
  }
  
  // 尝试在单词边界截断（针对英文）
  if (/[a-zA-Z0-9]$/.test(result) && lastBreakPoint > 0) {
    // 截断点需要考虑是否离结尾太远（避免截断太多内容）
    if (result.length - lastBreakPoint <= Math.min(5, result.length / 3)) {
      result = result.substring(0, lastBreakPoint + 1);
    }
  }
  
  // 避免以空格结尾
  result = result.trim();
  
  // 针对中文内容，检测是否截断在标点符号后
  if (/[\u4e00-\u9fa5]/.test(title) && /[,，;；]$/.test(result)) {
    result = result.substring(0, result.length - 1);
  }
  
  return result + '...';
}

/**
 * 使用豆包API生成标题
 * @param content 提示词内容
 * @returns 生成的标题
 */
export async function generateTitleWithDoubao(content: string): Promise<string> {
  // 处理空内容
  if (!content || content.trim().length === 0) {
    return '未命名提示词';
  }
  
  // 截取内容，避免发送过多token
  const truncatedContent = content.length > 2000 ? 
    content.substring(0, 2000) + '...' : content;
  
  // 检测内容语言
  const containsChinese = /[\u4e00-\u9fa5]/.test(truncatedContent);
  
  try {
    console.log('[DoubaoTitleGenerator] 开始请求AI生成标题，内容长度:', truncatedContent.length);
    
    const response = await axios.post(API_ENDPOINT, {
      model: MODEL_ID,
      messages: [
        {
          role: "system",
          content: "你是一个专业的标题生成专家。你的任务是：为用户提供的内容生成一个准确、简洁的标题。\n\n" +
                  "严格要求：\n" +
                  "1. 标题必须在30字节以内（约12个中文字符或30个英文字符）\n" +
                  "2. 标题必须精确概括内容的核心主题，不包含序号、修饰词等无关内容\n" +
                  "3. 标题必须与用户提供内容的语言保持一致（中文内容用中文标题，英文内容用英文标题）\n" +
                  "4. 标题必须具有概括性，直击内容核心，不要使用无意义词语\n" +
                  "5. 非常重要：你必须只返回标题本身，不要添加任何引导语、解释、前缀、后缀或标点符号\n" +
                  "6. 不要说\"标题：\"，不要用引号包裹标题，不要添加任何额外内容\n" +
                  "7. 不要使用\"相关\"、\"关于\"等泛泛词语，你的标题应当具体且有信息量\n\n" +
                  "你的整个回复就是标题，不要包含任何其他内容。"
        },
        {
          role: "user",
          content: `请为以下内容生成一个标题：\n\n${truncatedContent}`
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    // 提取生成的标题
    const generatedTitle = response.data.choices[0].message.content.trim();
    console.log('[DoubaoTitleGenerator] 获取到AI生成标题:', generatedTitle);
    
    // 处理API返回的标题，确保不超过字节限制
    let title = generatedTitle;
    
    // 清理特殊字符、引号和常见前缀
    title = title.replace(/^["""「」【】《》]+|["""「」【】《》]+$/g, '');
    title = title.replace(/^(标题[：:]\s*|Title[：:]\s*|主题[：:]\s*|Theme[：:]\s*)/i, '');
    title = title.replace(/^(关于|相关|有关|regarding|about|on)\s*/i, '');
    
    // 确保标题不超过字节限制
    if (calculateByteLength(title) > MAX_BYTES) {
      title = smartTruncate(title, MAX_BYTES);
    }
    
    console.log('[DoubaoTitleGenerator] 最终标题:', title, '字节数:', calculateByteLength(title));
    return title || (containsChinese ? '未命名提示词' : 'Untitled Prompt');
    
  } catch (error) {
    console.error('[DoubaoTitleGenerator] 标题生成错误:', error);
    
    // 错误处理，返回一个基本的标题，根据内容语言选择默认标题
    const fallbackTitle = content.length > 30 ? 
      content.substring(0, 30).trim() + '...' : 
      content.trim();
      
    return smartTruncate(fallbackTitle, MAX_BYTES);
  }
}

/**
 * 导出标题生成函数
 */
export async function generateTitle(content: string): Promise<string> {
  return generateTitleWithDoubao(content);
} 