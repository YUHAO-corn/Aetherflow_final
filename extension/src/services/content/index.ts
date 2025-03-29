import { findActiveInput, platformModules } from '../../content/platformDetector';
import { getAdapter } from '../../content/platformAdapter';

/**
 * 内容脚本服务接口
 * 提供与页面交互的功能
 */
export const contentService = {
  /**
   * 设置提示词快捷键触发器
   */
  setupShortcutTrigger: () => {
    console.log('[AetherFlow] contentService: 初始化快捷键触发器');
    // 此功能在PromptShortcutInjector.tsx中实现
    // 这里只是提供接口以保持一致性
  },

  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   * @returns 是否成功复制
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('[AetherFlow] contentService: 剪贴板复制失败', error);
      return false;
    }
  },

  /**
   * 向当前活跃的输入框中插入文本
   * @param text 要插入的文本
   * @returns 是否成功插入
   */
  insertTextToActiveElement: (text: string): boolean => {
    const activeInput = findActiveInput();
    if (!activeInput) {
      console.error('[AetherFlow] contentService: 未找到活跃的输入框');
      return false;
    }

    try {
      const platform = platformModules.detectPlatform();
      if (!platform) {
        console.error('[AetherFlow] contentService: 无法识别当前平台');
        return false;
      }

      const adapter = getAdapter(platform);
      adapter.insertText(activeInput, text);
      adapter.triggerInputEvent(activeInput);
      return true;
    } catch (error) {
      console.error('[AetherFlow] contentService: 文本插入失败', error);
      return false;
    }
  }
};

export * from './types'; 