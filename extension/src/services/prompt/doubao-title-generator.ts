import axios from 'axios';
import { TITLE_LIMITS } from '../../utils/constants';
import { calculateByteLength, smartTruncate } from '../../utils/stringUtils';

/**
 * 豆包API标题生成服务
 * 使用豆包AI模型生成更智能的标题
 */

// API配置
const API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = 'doubao-lite-32k-240828';
// 注意：实际应用中应通过环境变量或安全存储获取API密钥
const API_KEY = '32550ef8-b626-4478-bf53-5fb5e34e114f';

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
                  "【极其重要的字数限制】：\n" +
                  `1. 标题必须严格控制在${TITLE_LIMITS.AI_INSTRUCTION}字节以内（最多${Math.floor(TITLE_LIMITS.AI_INSTRUCTION/2)}个中文字符或${TITLE_LIMITS.AI_INSTRUCTION}个英文字符）\n` +
                  "2. 这是硬性要求，绝对不能超过此限制\n" +
                  "3. 宁可损失一些信息，也要确保不超过字数限制\n\n" +
                  "其他要求：\n" +
                  "1. 标题必须精确概括内容的核心主题，不包含序号、修饰词等无关内容\n" +
                  "2. 标题必须与用户提供内容的语言保持一致（中文内容用中文标题，英文内容用英文标题）\n" +
                  "3. 标题必须具有概括性，直击内容核心，不要使用无意义词语\n" +
                  "4. 非常重要：你必须只返回标题本身，不要添加任何引导语、解释、前缀、后缀\n" +
                  "5. 不要说\"标题：\"，不要用引号包裹标题，不要添加任何额外内容\n" +
                  "6. 不要使用\"相关\"、\"关于\"等泛泛词语，你的标题应当具体且有信息量\n" +
                  "7. 不要使用任何标点符号，包括逗号、句号、感叹号、问号等\n\n" +
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
    
    // 清理特殊字符、引号、标点符号和常见前缀
    title = title.replace(/^["""「」【】《》]+|["""「」【】《》]+$/g, '');
    title = title.replace(/^(标题[：:]\s*|Title[：:]\s*|主题[：:]\s*|Theme[：:]\s*)/i, '');
    title = title.replace(/^(关于|相关|有关|regarding|about|on)\s*/i, '');
    title = title.replace(/[,.;:!?，。；：！？、]/g, ''); // 移除所有标点符号
    
    // 确保标题不超过字节限制 - 使用统一的smartTruncate，并且不添加省略号
    if (calculateByteLength(title) > TITLE_LIMITS.PROCESSING) {
      title = smartTruncate(title, TITLE_LIMITS.PROCESSING, false);
    }
    
    console.log('[DoubaoTitleGenerator] 最终标题:', title, '字节数:', calculateByteLength(title));
    return title || (containsChinese ? '未命名提示词' : 'Untitled Prompt');
    
  } catch (error) {
    console.error('[DoubaoTitleGenerator] 标题生成错误:', error);
    
    // 错误处理，返回一个基本的标题，根据内容语言选择默认标题
    const fallbackTitle = content.length > 30 ? 
      content.substring(0, 30).trim() : 
      content.trim();
      
    return smartTruncate(fallbackTitle, TITLE_LIMITS.PROCESSING, false);
  }
}

/**
 * 导出标题生成函数
 */
export async function generateTitle(content: string): Promise<string> {
  return generateTitleWithDoubao(content);
} 