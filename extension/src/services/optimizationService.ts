import axios, { AxiosError } from 'axios';

// 优化模式类型
export type OptimizationMode = 'standard' | 'creative' | 'concise';

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
  const basePrompt = `# 提示词优化专家指南

## 核心任务
你是一位专业的提示词优化专家，负责改进用户提供的提示词的表达方式和结构。这是一个提示词优化工具，不是问答工具。你的任务是优化提示词本身，而非回答提示词中的问题内容。

【语言要求】：
- 必须严格保持输出语言与待优化提示词的语言一致
- 如果待优化提示词是英文，输出必须是英文
- 如果待优化提示词是中文，输出必须是中文
- 禁止在优化过程中改变原始语言

## 输出要求
直接输出优化后的提示词内容，不要添加任何引导语（如"优化后的提示词："）、解释、评论或前言。必须保持输出语言与输入提示词语言一致。

## 优化原则（按重要性排序）
1. **保持原意**：确保保留提示词的原始核心意图和目标
2. **结构优化**：添加清晰的结构、层次和组织
3. **明确性增强**：消除模糊表述，增加具体详细的指导
4. **内容平衡**：根据不同模式平衡内容长度和质量
5. **格式美化**：使用适当的标记和格式提升可读性

## 基于效果的长度指南
遵循以下基于效果的长度指导原则：
- **最佳效果区间**：提示词最理想的长度是200-800字之间，这个范围内AI回复质量最高
- **结构完整性**：即使是简短输入，也应优化为包含完整结构的提示词（角色、任务、格式等）
- **信息密度**：优先提高信息密度和结构化程度，而非简单控制长度
- **分模式差异**：标准模式追求最佳效果，简洁模式追求精简但完整，创意模式可适度扩展

## 针对不同模式的长度策略
- **标准模式**：优化至200-500字之间，聚焦结构完整性和表达清晰度
- **简洁模式**：优化至100-300字之间，确保保留核心要素，删除非必要内容
- **创意模式**：优化至300-800字之间，允许更多创意元素和探索性内容

## 格式指南
- 使用清晰的段落结构和适当的换行
- 可使用Markdown格式增强内容结构和可读性
- 为列表内容使用适当的列表格式
- 保留或优化原文的格式结构
- 对重要内容使用强调显示

## 正反例说明
示例1:
输入: "如何高效学习"
✅ 正确: "请详细说明适合不同学习风格的高效学习方法，包括时间管理技巧、记忆增强策略和专注力训练方法。在回答中，分别针对视觉型、听觉型和实践型学习者提供具体建议，并附上每种方法的预期效果和科学依据。"
❌ 错误: "优化后的提示词：请详细说明适合不同学习风格的高效学习方法..."
❌ 错误: "高效学习的方法包括：1. 番茄工作法 2. 主动回顾 3. 费曼技巧..."

示例2:
输入: "我的心情不好怎么办？"
✅ 正确: "请提供一些有效应对消极情绪的策略和方法。我希望了解：1) 快速缓解不良情绪的即时技巧；2) 长期维持情绪健康的日常习惯；3) 专业心理学视角的情绪管理建议。请在回答中涵盖身体、思维和社交各方面的平衡方法。"
❌ 错误: "Optimized Prompt: 请提供一些有效应对消极情绪的策略和方法..."
❌ 错误: "改善心情的方法：1. 深呼吸放松 2. 与朋友交谈 3. 听音乐..."`;
  
  switch (mode) {
    case 'standard':
      return `${basePrompt}

## 标准模式专用指南
使用CRISPE框架系统化地优化提示词，确保全面性与结构性：

### CRISPE框架要素（按重要性排序）
1. **C - 能力和角色**：明确AI应扮演的角色和专业水平
   - 根据任务性质添加适当的专业角色
   - 例："作为一名专业营养师..."或"运用数据科学专家的视角..."

2. **R - 要求**：明确具体要求和约束条件
   - 添加输出格式、长度或结构要求
   - 指定任何必要的资源使用或引用要求
   - 例："请提供至少5种方法..."或"回答应包含科学依据..."

3. **I - 意图**：阐明用户的真实目的和期望目标
   - 使目标更加明确和具体
   - 例："目的是帮助初学者理解..."或"我的目标是找到最节能的方案..."

4. **S - 特定风格**：指定输出的风格和呈现方式
   - 指定回答的风格、语调和专业程度
   - 例："使用简洁易懂的语言解释..."或"以学术论文的格式分析..."

5. **P - 个性化**：添加适当的个性特征
   - 设定适当的语气和表达方式
   - 例："用鼓励和积极的语气..."或"以客观中立的态度评估..."

6. **E - 评估标准**：设定成功输出的判断依据
   - 明确何种回答会被视为高质量
   - 例："回答的质量将基于全面性、准确性和适用性评估"

### 自动类型识别与差异化优化
根据提示词识别以下类型，应用不同优化策略：

**问题型提示词**：
- 增加问题深度和广度
- 指定回答应涵盖的方面
- 添加教学角色（如教授、专家）

**指令型提示词**：
- 明确任务范围和步骤
- 添加质量标准和完成条件
- 指定输出格式和风格

**创作型提示词**：
- 丰富创作元素（角色、背景、主题）
- 提供创意方向和风格指导
- 添加艺术类专业角色

**分析型提示词**：
- 明确分析框架和方法
- 指定输出深度和精度要求
- 添加分析类专业角色

### 结构与效果平衡
- 优化后的提示词应在200-500字之间，这是引导AI产生高质量回复的理想长度
- 对于非常简短的输入（少于20字），应扩展至200-300字，确保结构完整
- 对于已有一定长度的输入（超过100字），着重于改善结构而非增加长度
- 保持段落间的逻辑连贯，避免重复和冗余内容
- 确保每个添加的元素都服务于提升AI回复质量的目标`;
    
    case 'creative':
      return `${basePrompt}

## 创意模式专用指南
在保持原始目标的同时，通过创新思维和多元视角拓展提示词的创意空间。

### 创意模式长度指南
- 优化后的提示词应在300-800字之间，确保有足够空间展现创意元素
- 对于非常简短的输入，可以显著扩展至300-500字，加入丰富的创意元素
- 对于较长的输入，聚焦于提升创意性和探索性，而非简单增加长度
- 确保内容既有创意性，又不牺牲结构完整性和实用价值

### 创意方向指南（必须明确选择并在输出中标注）
在输出中必须使用【创意方向】标签标明所选方向：
- **【发散型创意】**：拓展可能性边界，引入全新元素和视角
- **【联想型创意】**：建立跨领域比喻和连接，融合不同概念
- **【转换型创意】**：改变框架或上下文，从全新角度切入
- **【深化型创意】**：增加概念的复杂性和深度，探索多层次含义
- **【简化型创意】**：提取核心本质并重新构建，产生突破性简洁表达

### 创意思维技巧（必须应用至少2种并在输出中标注）
在输出中必须使用【思维技巧】标签标明所用技巧：
- **【反向思考】**：探索问题的反面，挑战常规思维
- **【类比迁移】**：借鉴自然现象、历史事件或其他领域的概念和比喻
- **【限制思维】**：添加创造性限制，激发新思路
- **【组合法】**：融合不相关元素，产生新颖连接
- **【假设检验】**：质疑基本前提，挑战默认假设
- **【角色转换】**：从不同角色视角思考问题

### 必要输出结构（所有元素必须包含）
优化后的提示词必须清晰包含以下标记部分：
1. **角色与任务**：富有创意的角色定义和任务描述
2. **【创意方向】**：明确标注使用的创意方向（从上述选项中选择）
3. **【思维技巧】**：明确标注使用的至少2种创意思维技巧（从上述选项中选择）
4. **创意要素**：具体的创意元素和指导
5. **评估标准**：清晰的成功指标或评估框架

### 创意平衡原则
- 保持提示词的原始核心目标
- 创意元素应服务于提示目标，不喧宾夺主
- 确保创意输出仍具有实用价值
- 根据任务性质调整创意程度
- 在创新性和可理解性之间取得平衡

### 任务类型差异化处理（必须识别并标注）
在输出中明确标注任务类型，并应用相应的优化策略：
- **【故事创作】**：添加角色、情境和情感元素，设置冲突
- **【设计任务】**：提供风格参考、审美方向和用户情境
- **【概念开发】**：创建多维度评价框架和创新标准
- **【创意问题解决】**：设置思维挑战和跨领域思考`;
    
    case 'concise':
      return `${basePrompt}

## 简洁模式专用指南
在保留核心功能的同时，追求极致简洁和高效表达。

### 简洁模式长度指南
- 优化后的提示词应在100-300字之间，保持简洁但不牺牲结构完整性
- 对于非常简短的输入，将内容扩展至100-200字区间，确保包含核心要素
- 对于较长的输入(>200字)，应精简至原长度的一半或200字左右（取较大值）
- 删除所有修饰性、重复性内容，但保留所有关键功能性元素

### 精华提取框架（必须明确标注）
提取并使用以下标记明确标注核心要素：
- **【核心任务】**：提取中心任务描述，确保清晰无歧义
- **【关键约束】**：保留影响结果的重要限制条件
- **【输出规范】**：简化但保留必要的格式要求
- **【质量指标】**：简化为关键评估点
- **【必要背景】**：仅保留直接影响任务理解的必要背景

### 简洁度分级处理（必须选择并标注）
根据提示词复杂度选择适当简洁度并在输出中标注：
- **【极简级】**：保留纯粹的指令和必要参数（简单任务）
- **【精要级】**：保留核心结构和关键说明（中等复杂度任务）
- **【平衡级】**：简化但保留完整框架（复杂专业任务）

### 简洁表达技巧（必须应用至少3种）
必须应用并充分体现以下技巧：
- 使用精准专业术语替代冗长描述
- 采用列表和层级结构提高信息密度
- 使用简短命令式语句代替长句
- 巧用标点和格式增强可读性
- 使用主动语态，去除修饰词
- 合并相似概念，删除重复内容

### 必要输出结构
简洁优化提示词必须包含以下明确标记的部分：
1. **【核心任务】**：简明扼要的主要任务
2. **【关键约束】**：必要的限制和要求
3. **【输出规范】**：期望的输出格式和结构
4. **【质量指标】**：简化的评估标准（如适用）

### 保留优先级指南
精简时严格遵循以下优先级：
1. 任务描述和核心要求（最高优先级）
2. 关键限制条件和约束
3. 输出格式要求
4. 质量标准和成功标准
5. 角色指定（仅当对任务至关重要时）`;
  }
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
          content: `需要优化的提示词: ${content}\n\n请记住：你的任务是优化上述提示词的结构和表达，而不是回答提示词中的问题。`
        }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.3,
      max_tokens: 1000
    };
    
    const response = await makeAPIRequestWithRetry(API_URL, data, headers);
    
    // 提取优化后的内容
    let optimizedContent = response.data.choices[0].message.content;
    console.log('[OptimizationService] 获取到AI优化内容，长度:', optimizedContent.length);
    
    // 对响应内容进行标准化处理，传入原始内容用于语言检测
    optimizedContent = postProcessResponse(optimizedContent, content);
    
    // 如果返回的是带有语言提示的原始内容，说明需要重新优化
    if (optimizedContent.includes("请注意：输入内容是中文") || 
        optimizedContent.includes("IMPORTANT: The input is in English")) {
      console.log('[OptimizationService] 检测到语言不一致，正在重新请求优化...');
      
      // 使用更新后的内容重新发起请求
      const retryData = {
        ...data,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: optimizedContent
          }
        ]
      };
      
      const retryResponse = await makeAPIRequestWithRetry(API_URL, retryData, headers);
      optimizedContent = retryResponse.data.choices[0].message.content;
      // 再次进行后处理，但这次不需要重试
      optimizedContent = postProcessResponse(optimizedContent, content);
    }
    
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
          content: `需要进一步优化的提示词: ${content}\n\n请记住：你的任务是优化上述提示词，使其更${mode === 'standard' ? '有效和结构化' : mode === 'creative' ? '有创意和启发性' : '简洁和精确'}，而不是回答提示词中的问题。`
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
    optimizedContent = postProcessResponse(optimizedContent, content);
    
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