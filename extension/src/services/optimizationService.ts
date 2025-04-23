import { OptimizationMode } from './systemPrompts';
// Import the centralized API client using path alias
import { callDoubaoApi, DOUBAO_MODEL_ID } from '@/services/utils/doubaoApiClient'; 

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
 * 确保本地定义的 getSystemPrompt 函数被导出，并在所有分支都有返回值
 */
export function getSystemPrompt(mode: OptimizationMode | string): string {
  console.log(`[OptimizationService] 获取系统提示，模式: ${mode}`);
  switch (mode) {
    case 'concise':
      return "请优化以下提示词，使其更简洁、清晰、高效。专注于核心意图，移除冗余信息。";
    case 'standard':
      return "请优化以下提示词，使其更清晰、具体、有效，同时保持原意。可以适当补充细节或调整结构。";
    case 'creative':
      return "请优化以下提示词，使其更具创意、启发性，并能激发有趣的联想。可以适当发散思维或引入新颖角度。";
    case 'universal':
      return `# 提示词优化专家指南 (通用优化 v3)\n\n## 核心任务\n你是一位专业的提示词优化专家。你的唯一任务是分析和改进用户提供的**提示词**（用户打算发给其他 AI 的指令），目标是提升该提示词的**清晰度、结构性、明确性、完整性和整体效果**，从而帮助用户从目标 AI 获得更高质量、更符合预期的回复。\n\n**请牢记：你的最终输出必须仅仅是优化后的提示词文本本身，不包含任何其他文字。**\n\n## 语言要求\n- **严格保持**输出语言与待优化提示词的语言一致（中文输入则中文输出，英文输入则英文输出）。\n- **禁止**在优化过程中改变原始语言。\n\n## 输出要求 (极其重要 - 再次强调)\n1.  **直接输出优化后的提示词文本。**\n2.  输出内容**仅仅**是优化过的、可以直接复制使用的提示词本身。\n3.  **绝对禁止**包含任何引导语（如 \"优化后的提示词:\", \"这是优化版本:\", \"Optimized prompt:\" 等）。\n4.  **绝对禁止**包含任何自定义标签（如 \`【核心任务】\`, \`【关键约束】\` 等）。\n5.  **绝对禁止**包含任何解释、评论、分析或元说明文字。\n6.  **允许**在优化后的提示词**内部**使用标准的 Markdown 格式（例如列表 \`-\`, \`*\`, \`1.\`, 粗体 \`** **\`）来增强提示词自身的结构和可读性，前提是这样做能提升提示词的质量和效果。\n\n## 优化原则与方法（内部指导）\n优化时请遵循以下原则（按重要性排序），这些是你的思考框架，**不要在输出中体现**：\n1.  **保持原意**: 必须完整保留用户提示词的原始核心意图和目标。这是最高优先级。\n2.  **内部思考步骤 (推荐)**:\n    *   第一步：理解原始提示词。它的核心目标是什么？预期受众 AI 是谁？上下文是什么？\n    *   第二步：评估其质量。优点是什么？缺点（模糊、缺少信息、结构混乱、过于复杂/简单等）是什么？\n    *   第三步：构思改进策略。应用哪些优化原则（明确性、结构、完整性、效率）？是否需要添加角色、示例、约束？如何平衡效果和长度？\n    *   第四步：生成最终的、干净的优化后提示词文本。\n3.  **提升明确性 (Clarity & Specificity)**:\n    *   消除模糊不清的表述，使用更精确、无歧义的语言。\n    *   如果原始提示词过于宽泛，适当增加具体的细节、背景信息或上下文。\n    *   明确指出对输出的要求（格式、长度、风格等）。\n4.  **优化结构 (Structure)**:\n    *   增加清晰的结构和层次组织，尤其对于复杂任务。使用 Markdown 列表、分点等。\n    *   确保逻辑流畅。\n5.  **确保完整性 (Completeness)**:\n    *   评估是否包含关键要素。如有必要，考虑补充：角色 (Role)、示例 (Examples)、约束 (Constraints) 或否定性要求。\n6.  **提高效率 (Efficiency)**:\n    *   删除真正冗余的词语。使用更简洁的表达，但**避免过度简化**导致信息丢失。\n    *   **平衡**: 目标是找到**效果最佳**的表达，不一定是最短的。\n7.  **（可选）处理不适定输入**: 如果输入文本过短、不清晰，或不像一个提示词，优先返回接近原文的、结构稍作整理的版本，或仅做最小程度的修正。避免过度猜测或创造。`;
    default:
      console.warn(`[OptimizationService] 未知的优化模式: ${mode}，使用标准模式。`);
      // Default to standard mode if mode is unrecognized
      return "请优化以下提示词，使其更清晰、具体、有效，同时保持原意。可以适当补充细节或调整结构。";
      }
}

/**
 * 优化提示词服务 (Refactored to use DoubaoApiClient)
 */
export async function optimizePrompt(
  content: string, 
  mode: OptimizationMode = 'standard'
): Promise<string> {
  try {
    if (!content || content.trim() === '') {
      throw new Error('提示词内容不能为空');
    }
    
    // Check content length (keep this logic here)
    if (content.length > 10000) { 
      content = content.substring(0, 10000) + "...(内容已截断)";
    }
    
    console.log(`[OptimizationService] 开始优化提示词 (${mode}), 长度:`, content.length);
        
    // Get the appropriate system prompt based on the mode
    const systemPrompt = getSystemPrompt(mode);
    
    // Prepare messages for the API call
    const messages = [
        {
        role: 'system' as const,
          content: systemPrompt
        },
        {
        role: 'user' as const,
        // Construct user message as before
          content: `需要优化的提示词: ${content}\n\n请记住：你的任务是优化上述提示词的结构和表达，而不是回答提示词中的问题。`
        }
    ];

    // Prepare options for the API call
    const options = {
      temperature: mode === 'creative' ? 0.8 : 0.3, 
      max_tokens: 1000 
    };

    // Call the centralized API client
    console.log('[OptimizationService] Calling doubaoApiClient.callDoubaoApi...');
    const optimizedContentRaw = await callDoubaoApi(messages, options);

    console.log('[OptimizationService] 获取到豆包优化内容，长度:', optimizedContentRaw.length);
            
    // Perform post-processing on the result
    const optimizedContentFinal = postProcessResponse(optimizedContentRaw, content);
            
    return optimizedContentFinal; // Return the post-processed content
      
      } catch (error: unknown) {
    // Log the error and re-throw a more specific error for this service
    console.error('[OptimizationService] 提示词优化请求失败:', error);
    // Include the original error message if available
    const originalMessage = error instanceof Error ? error.message : '未知错误';
    throw new Error(`优化提示词失败 (${originalMessage})`); 
  }
}

/**
 * 继续优化提示词 (Refactored to use DoubaoApiClient)
 */
export async function continueOptimize(
  content: string,
  mode: OptimizationMode = 'standard'
): Promise<string> {
  try {
    if (!content || content.trim() === '') {
      throw new Error('提示词内容不能为空');
    }
    
    // Check content length
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "...(内容已截断)";
    }
    
    console.log(`[OptimizationService] 开始继续优化提示词 (${mode}), 长度:`, content.length);
    
    const systemPrompt = getSystemPrompt(mode);
    
    const messages = [
        {
        role: 'system' as const,
          content: systemPrompt
        },
        {
        role: 'user' as const,
        // Adjust user message slightly for continuation
          content: `需要进一步优化的提示词: ${content}\n\n请记住：你的任务是优化上述提示词，使其更${mode === 'standard' ? '有效和结构化' : mode === 'creative' ? '有创意和启发性' : '简洁和精确'}，而不是回答提示词中的问题。`
        }
    ];

    const options = {
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
    };
    
    console.log('[OptimizationService] Calling doubaoApiClient.callDoubaoApi for continuation...');
    const optimizedContentRaw = await callDoubaoApi(messages, options);

    console.log('[OptimizationService] 获取到豆包继续优化内容，长度:', optimizedContentRaw.length);
    const optimizedContentFinal = postProcessResponse(optimizedContentRaw, content);
    return optimizedContentFinal;

      } catch (error: unknown) {
    console.error('[OptimizationService] 提示词继续优化请求失败:', error);
    const originalMessage = error instanceof Error ? error.message : '未知错误';
    throw new Error(`继续优化提示词失败 (${originalMessage})`);
  }
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