import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';
import { GenericAdapter } from './platformAdapter';
import { injectPromptShortcut } from './PromptShortcutInjector';
// TODO: contentService需要重构，临时注释处理
// import { contentService } from '../services/content';

console.log('[AetherFlow] 内容脚本加载成功 - 版本1.0');

// 节流函数，限制函数调用频率
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      lastArgs = null;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// 全局状态管理
const globalState = {
  // 提示词快捷输入状态
  promptShortcut: {
    active: false,
    cleanupFn: null as (() => void) | null,
    currentElement: null as HTMLElement | null,
    lastSlashPosition: -1,
    lastSearchTerm: '',
    // 添加延迟关闭计时器
    closeTimer: null as number | null,
    // 添加自动关闭状态追踪
    noMatchCount: 0
  }
};

// 内容服务
const contentService = {
  // 设置提示词快捷键触发
  setupShortcutTrigger: () => {
    console.log('[AetherFlow] 初始化提示词快捷输入监听');
    
    // 监听输入事件，检测是否有"/"，进行提示词快捷输入
    const handleInput = throttle((event: Event) => {
      const target = event.target as HTMLElement;
      
      // 检查事件目标是否是有效的输入元素
      if (
        target instanceof HTMLTextAreaElement || 
        target instanceof HTMLInputElement || 
        target.isContentEditable
      ) {
        const adapter = new GenericAdapter();
        const text = adapter.getText(target);
        
        // 找到最后一个斜杠"/"位置
        const lastSlashIndex = text.lastIndexOf('/');
        
        // 如果有斜杠，且最后输入的部分不超过20个字符（作为合理限制）
        if (lastSlashIndex >= 0 && text.length - lastSlashIndex <= 20) {
          // 提取搜索词（斜杠后的内容）
          const searchTerm = text.substring(lastSlashIndex + 1);
          
          console.log('[AetherFlow] 检测到"/"输入:', {
            slashPos: lastSlashIndex,
            searchTerm,
            active: globalState.promptShortcut.active
          });
          
          // 如果是新的"/"或搜索词变更，或者元素变更
          if (
            !globalState.promptShortcut.active || 
            globalState.promptShortcut.currentElement !== target || 
            globalState.promptShortcut.lastSlashPosition !== lastSlashIndex ||
            globalState.promptShortcut.lastSearchTerm !== searchTerm
          ) {
            // 如果已经有活跃的提示词面板，先清理
            if (globalState.promptShortcut.cleanupFn) {
              globalState.promptShortcut.cleanupFn();
              globalState.promptShortcut.cleanupFn = null;
            }
            
            // 清除可能存在的关闭计时器（确保不会自动关闭）
            if (globalState.promptShortcut.closeTimer) {
              clearTimeout(globalState.promptShortcut.closeTimer);
              globalState.promptShortcut.closeTimer = null;
            }
            
            // 更新状态
            globalState.promptShortcut.active = true;
            globalState.promptShortcut.currentElement = target;
            globalState.promptShortcut.lastSlashPosition = lastSlashIndex;
            globalState.promptShortcut.lastSearchTerm = searchTerm;
            globalState.promptShortcut.noMatchCount = 0;
            
            // 注入提示词组件
            const cleanup = injectPromptShortcut(target, adapter, {
              slashPosition: lastSlashIndex,
              searchTerm
            });
            
            // 保存清理函数
            globalState.promptShortcut.cleanupFn = () => {
              cleanup();
              globalState.promptShortcut.active = false;
              
              // 清除可能存在的计时器
              if (globalState.promptShortcut.closeTimer) {
                clearTimeout(globalState.promptShortcut.closeTimer);
                globalState.promptShortcut.closeTimer = null;
              }
            };
          }
        } 
        // 如果不再满足提示词触发条件，但面板处于活跃状态，则清理
        else if (globalState.promptShortcut.active && globalState.promptShortcut.currentElement === target) {
          console.log('[AetherFlow] 输入内容不再满足提示词触发条件，关闭面板');
          
          if (globalState.promptShortcut.cleanupFn) {
            globalState.promptShortcut.cleanupFn();
            globalState.promptShortcut.cleanupFn = null;
          }
          
          globalState.promptShortcut.active = false;
        }
      }
    }, 100); // 限制100ms内最多执行一次
    
    // 监听表单输入事件
    document.addEventListener('input', handleInput);
    
    /**
     * 修复问题：
     * 1. 初始化时确保浮层显示，添加立即搜索逻辑
     * 2. 移除自动关闭计时器，确保浮层不会意外消失
     * 3. 实时响应搜索词变化，包括删除字符后的重新搜索
     * 4. 移除Enter键触发选择，避免与输入框发送冲突，保留Tab键选择
     */
    
    // 监听焦点变化
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      
      // 如果新获得焦点的元素不是当前的活跃元素，则清理
      if (
        globalState.promptShortcut.active && 
        globalState.promptShortcut.currentElement && 
        globalState.promptShortcut.currentElement !== target
      ) {
        console.log('[AetherFlow] 焦点转移到新元素，关闭提示词面板');
        
        if (globalState.promptShortcut.cleanupFn) {
          globalState.promptShortcut.cleanupFn();
          globalState.promptShortcut.cleanupFn = null;
        }
        
        globalState.promptShortcut.active = false;
      }
    });
    
    console.log('[AetherFlow] 提示词快捷输入监听器设置完成');
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
      const activeElement = document.activeElement as HTMLElement;
      const adapter = new GenericAdapter();
      const success = adapter.insertText(activeElement, text);
      
      if (success) {
        adapter.triggerInputEvent(activeElement);
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
    } else if (message.type === 'CLOSE_PROMPT_SHORTCUT') {
      // 关闭提示词快捷输入面板
      if (globalState.promptShortcut.active && globalState.promptShortcut.cleanupFn) {
        globalState.promptShortcut.cleanupFn();
        globalState.promptShortcut.cleanupFn = null;
        globalState.promptShortcut.active = false;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '没有活跃的提示词快捷输入面板' });
      }
    }
  } catch (error) {
    console.error('[AetherFlow] 内容脚本错误:', error);
    sendResponse({ success: false, error: String(error) });
  }
});
