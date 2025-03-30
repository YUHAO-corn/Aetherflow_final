/**
 * 提示词标题生成服务
 * 提供各种策略从提示词内容中提取或生成合适的标题
 */

/**
 * 常见停用词列表，用于过滤掉不具有实际意义的词汇
 */
const STOP_WORDS = [
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

/**
 * 智能标题生成器
 * 从文本内容中分析并提取或生成合适的标题
 */
export class TitleGenerator {
  // 标题最大字节限制（30字节）
  private static readonly MAX_BYTES = 30;
  // 预留给省略号的字节数
  private static readonly ELLIPSIS_BYTES = 3;
  // 实际可用于标题内容的最大字节数
  private static readonly EFFECTIVE_BYTES = this.MAX_BYTES - this.ELLIPSIS_BYTES;
  
  /**
   * 分析内容类型并生成标题
   * @param content 提示词内容
   * @returns 生成的标题
   */
  public static async generate(content: string): Promise<string> {
    console.log('[TitleGenerator] 开始分析内容, 长度:', content?.length || 0);
    
    // 处理空内容
    if (!content || content.trim().length === 0) {
      return '未命名提示词';
    }
    
    // 清理和准备文本
    const text = content.trim();
    
    try {
      // 检测内容类型
      const contentType = this.detectContentType(text);
      console.log('[TitleGenerator] 检测内容类型:', contentType);
      
      // 提取关键词（增强版，包含权重）
      const keywordsWithWeight = this.extractKeywordsWithWeight(text);
      const keywords = keywordsWithWeight.map(k => k.word);
      console.log('[TitleGenerator] 提取关键词 TOP 5:', keywords.slice(0, 5));
      
      // 根据内容类型生成标题
      let title: string;
      
      switch(contentType) {
        case 'markdown':
          title = this.generateMarkdownTitle(text);
          break;
        case 'code':
          title = this.generateCodeTitle(text, keywords);
          break;
        case 'question':
          title = this.generateQuestionTitle(text, keywords);
          break;
        case 'list':
          title = this.generateListTitle(text, keywords);
          break;
        case 'instruction':
          title = this.generateInstructionTitle(text, keywords);
          break;
        default:
          title = this.generateGeneralTitle(text, keywords);
      }
      
      // 标题长度和格式控制
      title = this.formatTitle(title, text);
      
      // 确保标题不超过字节限制
      if (this.calculateByteLength(title) > this.MAX_BYTES) {
        title = this.smartTruncate(title, this.MAX_BYTES);
      }
      
      console.log('[TitleGenerator] 生成最终标题:', title, '字节数:', this.calculateByteLength(title));
      return title || '未命名提示词';
      
    } catch (error) {
      console.error('[TitleGenerator] 标题生成错误:', error);
      // 错误处理时也确保返回值不超过字节限制
      const fallbackTitle = '未命名提示词';
      return this.calculateByteLength(fallbackTitle) <= this.MAX_BYTES 
        ? fallbackTitle 
        : this.smartTruncate(text, this.MAX_BYTES);
    }
  }
  
  /**
   * 检测内容类型
   */
  private static detectContentType(text: string): 'markdown' | 'code' | 'question' | 'list' | 'instruction' | 'general' {
    // 尝试检测Markdown
    if (/^#+\s+.+/.test(text) || /\n#+\s+.+/.test(text)) {
      return 'markdown';
    }
    
    // 检测代码
    if (/^(```|`|function|class|import|export|const|let|var)/.test(text) || 
       /(for\s*\(|if\s*\(|while\s*\(|switch\s*\()/.test(text)) {
      return 'code';
    }
    
    // 检测列表
    if (/^[*\-+\d]\s+/.test(text) || /\n[*\-+\d]\s+/.test(text.split('\n')[1] || '')) {
      return 'list';
    }
    
    // 检测问题
    if (/^(what|how|why|when|where|who|which|is|are|can|could|would|should|did|do)\s+/i.test(text) ||
       text.endsWith('?') || 
       /[?？]/.test(text.split('\n')[0])) {
      return 'question';
    }
    
    // 检测指令
    if (/^(write|create|make|generate|implement|design|develop|explain|describe|analyze|list|outline)/i.test(text)) {
      return 'instruction';
    }
    
    // 默认为一般文本
    return 'general';
  }
  
  /**
   * 提取文本中的关键词（增强版，包含权重计算）
   */
  private static extractKeywordsWithWeight(text: string): Array<{word: string, weight: number}> {
    // 分段获取位置加权
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const firstPara = paragraphs[0] || '';
    const lastPara = paragraphs[paragraphs.length-1] || '';
    
    // 处理文本
    const cleanText = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ');
    
    // 拆分为单词
    const words = cleanText
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.includes(word));
    
    // 计算词频
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // 加权计算
    return Object.entries(wordFreq).map(([word, freq]) => {
      let weight = freq;
      
      // 位置加权
      if (firstPara.toLowerCase().includes(word)) weight *= 1.5;
      if (lastPara.toLowerCase().includes(word)) weight *= 1.3;
      
      // 特殊词加权
      if (/\d+/.test(word)) weight *= 1.2; // 数字
      if (/^[A-Z]/.test(word)) weight *= 1.4; // 专有名词（英文首字母大写）
      
      return { word, weight };
    }).sort((a, b) => b.weight - a.weight);
  }
  
  /**
   * 提取文本中的关键词（原始版本，保留兼容性）
   */
  private static extractKeywords(text: string): string[] {
    // 处理文本
    const cleanText = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ');
    
    // 拆分为单词
    const words = cleanText
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.includes(word));
    
    // 计算词频
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // 按词频排序
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }
  
  /**
   * 生成Markdown标题
   */
  private static generateMarkdownTitle(text: string): string {
    const markdownTitleMatch = text.match(/^#+\s+(.+?)(?:\n|$)/);
    if (markdownTitleMatch && markdownTitleMatch[1]) {
      const title = markdownTitleMatch[1].trim();
      // 检查标题字节长度，确保不超过有效字节数
      if (this.calculateByteLength(title) <= this.EFFECTIVE_BYTES) {
        return title;
      }
      // 如果超出，直接在此处截断
      return this.smartTruncate(title, this.EFFECTIVE_BYTES);
    }
    
    // 尝试查找文档中的其他标题
    const otherTitleMatch = text.match(/\n#+\s+(.+?)(?:\n|$)/);
    if (otherTitleMatch && otherTitleMatch[1]) {
      const title = otherTitleMatch[1].trim();
      if (this.calculateByteLength(title) <= this.EFFECTIVE_BYTES) {
        return title;
      }
      return this.smartTruncate(title, this.EFFECTIVE_BYTES);
    }
    
    return '';
  }
  
  /**
   * 生成代码标题
   */
  private static generateCodeTitle(text: string, keywords: string[]): string {
    // 检测是否包含特定代码关键词
    const codeKeywords = ['function', 'class', 'component', 'model', 'interface', 'type', 'algorithm'];
    const foundCodeKeyword = keywords.find(word => codeKeywords.includes(word)) || '代码';
    
    // 提取可能的函数名或类名
    const functionMatch = text.match(/function\s+([a-zA-Z_]\w*)/);
    const classMatch = text.match(/class\s+([a-zA-Z_]\w*)/);
    const constMatch = text.match(/const\s+([a-zA-Z_]\w*)\s*=/);
    
    if (functionMatch && functionMatch[1]) {
      const title = `函数: ${functionMatch[1]}`;
      if (this.calculateByteLength(title) <= this.EFFECTIVE_BYTES) {
        return title;
      }
    } else if (classMatch && classMatch[1]) {
      const title = `类: ${classMatch[1]}`;
      if (this.calculateByteLength(title) <= this.EFFECTIVE_BYTES) {
        return title;
      }
    } else if (constMatch && constMatch[1]) {
      const title = `${foundCodeKeyword}: ${constMatch[1]}`;
      if (this.calculateByteLength(title) <= this.EFFECTIVE_BYTES) {
        return title;
      }
    }
    
    // 使用关键词组合，但确保字节长度控制
    let title = `${foundCodeKeyword}`;
    const separator = /[\u4e00-\u9fa5]/.test(foundCodeKeyword) ? '' : ' ';
    
    // 动态添加关键词并检查字节长度
    for (let i = 0; i < Math.min(keywords.length, 3); i++) {
      const tempTitle = title + (i === 0 ? ': ' : separator) + keywords[i];
      if (this.calculateByteLength(tempTitle) > this.EFFECTIVE_BYTES) {
        break;
      }
      title = tempTitle;
    }
    
    return title;
  }
  
  /**
   * 生成问题标题
   */
  private static generateQuestionTitle(text: string, keywords: string[]): string {
    // 提取问句
    const questionMatch = text.match(/^.+?[?？]/);
    if (questionMatch) {
      const question = questionMatch[0].trim();
      if (this.calculateByteLength(question) <= this.EFFECTIVE_BYTES) {
        return question;
      }
      return this.smartTruncate(question, this.EFFECTIVE_BYTES);
    }
    
    // 构建关于...的问题，确保不超过字节限制
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    let title: string;
    
    if (isChinese) {
      title = '关于';
      // 动态添加关键词
      for (let i = 0; i < Math.min(keywords.length, 5); i++) {
        const tempTitle = title + keywords[i];
        if (this.calculateByteLength(tempTitle + '的问题') > this.EFFECTIVE_BYTES) {
          break;
        }
        title = tempTitle;
      }
      return title + '的问题';
    } else {
      title = 'Q:';
      // 动态添加关键词
      for (let i = 0; i < Math.min(keywords.length, 5); i++) {
        const tempTitle = title + (i === 0 ? ' ' : ' ') + keywords[i];
        if (this.calculateByteLength(tempTitle) > this.EFFECTIVE_BYTES) {
          break;
        }
        title = tempTitle;
      }
      return title;
    }
  }
  
  /**
   * 生成列表标题
   */
  private static generateListTitle(text: string, keywords: string[]): string {
    // 尝试从第一行提取列表标题
    const firstLine = text.split('\n')[0].trim();
    if (!firstLine.match(/^[*\-+\d]\s+/) && this.calculateByteLength(firstLine) <= this.EFFECTIVE_BYTES) {
      return firstLine;
    }
    
    // 查找列表项的共同主题，确保不超过字节限制
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    let title = '';
    
    if (isChinese) {
      // 动态添加关键词
      for (let i = 0; i < Math.min(keywords.length, 5); i++) {
        const tempTitle = title + keywords[i];
        if (this.calculateByteLength(tempTitle + '列表') > this.EFFECTIVE_BYTES) {
          break;
        }
        title = tempTitle;
      }
      return title + '列表';
    } else {
      // 动态添加关键词
      for (let i = 0; i < Math.min(keywords.length, 5); i++) {
        const tempTitle = title + (i === 0 ? '' : ' ') + keywords[i];
        if (this.calculateByteLength(tempTitle + ' list') > this.EFFECTIVE_BYTES) {
          break;
        }
        title = tempTitle;
      }
      return title + ' list';
    }
  }
  
  /**
   * 生成指令标题
   */
  private static generateInstructionTitle(text: string, keywords: string[]): string {
    // 提取第一行作为指令
    const firstLine = text.split('\n')[0].trim();
    if (this.calculateByteLength(firstLine) <= this.EFFECTIVE_BYTES) {
      return firstLine;
    }
    
    // 提取动词，并确保字节长度控制
    const verb = firstLine.match(/^(\w+)/)?.[0] || '创建';
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    let title = verb;
    
    if (isChinese) {
      // 动态添加关键词
      for (let i = 0; i < Math.min(keywords.length, 4); i++) {
        const tempTitle = title + keywords[i];
        if (this.calculateByteLength(tempTitle) > this.EFFECTIVE_BYTES) {
          break;
        }
        title = tempTitle;
      }
    } else {
      // 动态添加关键词
      for (let i = 0; i < Math.min(keywords.length, 4); i++) {
        const tempTitle = title + (i === 0 ? ' ' : ' ') + keywords[i];
        if (this.calculateByteLength(tempTitle) > this.EFFECTIVE_BYTES) {
          break;
        }
        title = tempTitle;
      }
    }
    
    return title;
  }
  
  /**
   * 生成一般文本标题
   */
  private static generateGeneralTitle(text: string, keywords: string[]): string {
    // 使用关键词组合作为首选，但确保不超过字节限制
    if (keywords.length > 0) {
      let title = '';
      
      // 中文使用紧凑组合
      if (/[\u4e00-\u9fa5]/.test(text)) {
        // 动态添加关键词
        for (let i = 0; i < Math.min(keywords.length, 5); i++) {
          const tempTitle = title + keywords[i];
          if (this.calculateByteLength(tempTitle + '相关') > this.EFFECTIVE_BYTES) {
            break;
          }
          title = tempTitle;
        }
        return title + '相关';
      } else {
        // 英文使用空格分隔
        // 动态添加关键词
        for (let i = 0; i < Math.min(keywords.length, 5); i++) {
          const tempTitle = title + (i === 0 ? '' : ' ') + keywords[i];
          if (this.calculateByteLength(tempTitle) > this.EFFECTIVE_BYTES) {
            break;
          }
          title = tempTitle;
        }
        return title;
      }
    }
    
    // 如果没有提取到关键词，才尝试提取首句作为备选方案
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
    
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0];
      // 提取更短的首句，避免标题过长
      const sentenceMatch = firstPara.match(/^.{5,60}?[.!?。！？]/);
      
      if (sentenceMatch) {
        const sentence = sentenceMatch[0].trim();
        if (this.calculateByteLength(sentence) <= this.EFFECTIVE_BYTES) {
          return sentence;
        }
        return this.smartTruncate(sentence, this.EFFECTIVE_BYTES);
      }
    }
    
    // 如果都无法提取，使用更强大的智能截断
    return this.smartTruncate(text, this.EFFECTIVE_BYTES);
  }
  
  /**
   * 格式化和规范化标题
   */
  private static formatTitle(title: string, originalText: string): string {
    if (!title) {
      return '未命名提示词';
    }
    
    // 清理特殊字符
    title = title
      .replace(/^[^\w\u4e00-\u9fa5]+|[^\w\u4e00-\u9fa5.!?。！？]+$/g, '')
      .replace(/\s{2,}/g, ' ');
    
    // 处理空标题或过短标题
    if (title.length < 2) {
      // 使用原文智能截断作为备选
      const shortTitle = this.smartTruncate(originalText, this.EFFECTIVE_BYTES);
      return shortTitle || '未命名提示词';
    }
    
    return title;
  }
  
  /**
   * 计算字符串字节长度（中文2字节，其他1字节）
   */
  private static calculateByteLength(str: string): number {
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
   * 增强的智能截断，确保不超过指定字节数的同时保持可读性
   */
  private static smartTruncate(title: string, maxBytes: number = this.MAX_BYTES): string {
    if (!title) return '未命名';
    
    const titleBytes = this.calculateByteLength(title);
    if (titleBytes <= maxBytes) {
      return title;
    }
    
    // 计算实际可用字节数（减去省略号的字节数）
    const effectiveMaxBytes = maxBytes - this.ELLIPSIS_BYTES;
    
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
}

/**
 * 智能生成标题的主函数
 * @param content 提示词内容
 * @returns 生成的标题
 */
export async function generateTitle(content: string): Promise<string> {
  return TitleGenerator.generate(content);
} 