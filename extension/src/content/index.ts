import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';
import { contentService } from '../services/content';

console.log('[AetherFlow] 内容脚本加载成功 - 版本1.0');

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
