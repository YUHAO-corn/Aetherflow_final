// platformDetector.ts - 检测当前页面是否为支持的AI平台

/**
 * 支持的AI平台类型
 */
export enum AIPlatformType {
  CHATGPT = 'chatgpt',
  CLAUDE = 'claude',
  DEEPSEEK = 'deepseek',
  PHIND = 'phind',
  KIMI = 'kimi',
  UNKNOWN = 'unknown'
}

/**
 * 平台检测结果
 */
export interface PlatformDetectionResult {
  platform: AIPlatformType;
  inputSelector: string | null;
  isSupported: boolean;
}

/**
 * 平台检测规则
 */
interface PlatformRule {
  platform: AIPlatformType;
  urlPattern: RegExp;
  inputSelector: string;
  testFunc?: () => boolean;
}

/**
 * 支持的平台检测规则
 */
const PLATFORM_RULES: PlatformRule[] = [
  {
    platform: AIPlatformType.CHATGPT,
    urlPattern: /https:\/\/chat\.openai\.com/,
    // ChatGPT的输入框选择器
    inputSelector: 'textarea[data-id="root"]'
  },
  {
    platform: AIPlatformType.CLAUDE,
    urlPattern: /https:\/\/(claude\.ai|app\.anthropic\.com)/,
    // Claude的输入框选择器
    inputSelector: 'div[contenteditable="true"]',
  },
  {
    platform: AIPlatformType.DEEPSEEK,
    urlPattern: /https:\/\/(chat\.deepseek\.com)/,
    // DeepSeek的输入框选择器
    inputSelector: 'textarea.resize-none'
  },
  {
    platform: AIPlatformType.PHIND,
    urlPattern: /https:\/\/(www\.phind\.com)/,
    // Phind的输入框选择器
    inputSelector: 'textarea.phind-textarea'
  },
  {
    platform: AIPlatformType.KIMI,
    urlPattern: /https:\/\/(kimi\.moonshot\.cn)/,
    // Kimi的输入框选择器
    inputSelector: 'textarea[placeholder]'
  }
];

/**
 * 通用输入框选择器 - 当特定平台规则不匹配时使用
 */
const GENERIC_INPUT_SELECTORS = [
  'textarea',
  'div[contenteditable="true"]',
  'input[type="text"]'
];

/**
 * 检测当前页面是否为支持的AI平台
 * @returns 平台检测结果
 */
export function detectPlatform(): PlatformDetectionResult {
  const currentUrl = window.location.href;
  
  // 尝试匹配特定平台规则
  for (const rule of PLATFORM_RULES) {
    if (rule.urlPattern.test(currentUrl)) {
      // 如果URL匹配，检查输入框是否存在
      const inputElement = document.querySelector(rule.inputSelector);
      
      // 如果有额外的测试函数，执行它
      const testPassed = rule.testFunc ? rule.testFunc() : true;
      
      if (inputElement && testPassed) {
        return {
          platform: rule.platform,
          inputSelector: rule.inputSelector,
          isSupported: true
        };
      }
      
      // URL匹配但输入框不存在，可能是平台更新了DOM结构
      return {
        platform: rule.platform,
        inputSelector: null,
        isSupported: false
      };
    }
  }
  
  // 如果没有匹配特定平台，尝试通用输入框检测
  for (const selector of GENERIC_INPUT_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // 找到了潜在的输入框
      return {
        platform: AIPlatformType.UNKNOWN,
        inputSelector: selector,
        isSupported: true
      };
    }
  }
  
  // 未检测到任何支持的平台或输入框
  return {
    platform: AIPlatformType.UNKNOWN,
    inputSelector: null,
    isSupported: false
  };
}

/**
 * 获取输入框元素
 * @param selector 输入框选择器
 * @returns 输入框元素或null
 */
export function getInputElement(selector: string | null): HTMLElement | null {
  if (!selector) return null;
  
  const element = document.querySelector(selector);
  if (!element) return null;
  
  return element as HTMLElement;
} 