import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';
// TODO: contentService需要重构，临时注释处理
// import { contentService } from '../services/content';

console.log('[AetherFlow] 内容脚本加载成功 - 版本1.0');

// 临时内联contentService实现
const contentService = {
  // 设置提示词快捷键触发
  setupShortcutTrigger: () => {
    console.log('[AetherFlow] 初始化快捷键处理器');
  },
  
  // 复制到剪贴板
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('[AetherFlow] 复制到剪贴板失败:', error);
      return false;
    }
  },
  
  // 插入文本到活跃元素
  insertTextToActiveElement: (text: string): boolean => {
    try {
      // 简化版实现
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLInputElement) {
        activeElement.value = text;
        return true;
      } else if (activeElement.isContentEditable) {
        activeElement.textContent = text;
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AetherFlow] 插入文本失败:', error);
      return false;
    }
  }
};

// 设置提示词快捷键触发
console.log('[AetherFlow] 初始化快捷键处理器');
contentService.setupShortcutTrigger();

// 处理来自扩展其他部分的消息
addMessageListener(async (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  console.log('[AetherFlow] 收到消息:', message.type);
  
  try {
    if (message.type === 'COPY_TO_CLIPBOARD') {
      const textToCopy =
        typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload);
      
      console.log('[AetherFlow] 正在复制内容到剪贴板, 长度:', textToCopy.length);
      const success = await contentService.copyToClipboard(textToCopy);
      console.log('[AetherFlow] 复制到剪贴板', success ? '成功' : '失败');
      sendResponse({ success });
    } else if (message.type === 'INJECT_PROMPT') {
      // 向当前输入框中注入提示词内容
      console.log('[AetherFlow] 正在注入提示词内容');
      const text = typeof message.payload === 'string' ? message.payload : '';
      const success = contentService.insertTextToActiveElement(text);
      
      console.log('[AetherFlow] 提示词注入', success ? '成功' : '失败');
      if (success) {
        sendResponse({ success });
      } else {
        sendResponse({ success: false, error: '未找到活跃的输入框元素' });
      }
    }
  } catch (error) {
    console.error('[AetherFlow] 内容脚本错误:', error);
    sendResponse({ success: false, error: String(error) });
  }
});
