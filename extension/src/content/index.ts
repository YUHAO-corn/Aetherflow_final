import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';
import { GenericAdapter } from './platformAdapter';
import { injectPromptShortcut } from './PromptShortcutInjector';
// TODO: contentService需要重构，临时注释处理
// import { contentService } from '../services/content';

console.log('[AetherFlow-DEBUG] 内容脚本开始加载', {
  url: window.location.href,
  domain: window.location.hostname,
  time: new Date().toISOString(),
  userAgent: navigator.userAgent
});

// 立即设置PING消息监听器，确保尽早响应请求
addMessageListener((message: Message, sender, sendResponse) => {
  console.log('[AetherFlow-DEBUG] 接收消息(全局监听器):', {
    type: message.type,
    data: message.data,
    sender: sender?.tab?.id || '未知',
    time: new Date().toISOString()
  });
  
  // 特别处理PING消息，优先级最高
  if (message.type === 'PING') {
    console.log('[AetherFlow-DEBUG] 收到PING消息, 发送PONG响应');
    sendResponse({ status: 'PONG', ready: true, time: new Date().toISOString() });
    return true;
  }
  
  // 未初始化完成时，仅处理通知消息
  if (message.type === 'SHOW_NOTIFICATION' && message.data) {
    console.log('[AetherFlow-DEBUG] 显示通知(初始化前):', message.data.message);
    showNotification(
      message.data.message || '操作完成', 
      (message.data.type as 'success' | 'error') || 'success'
    );
    sendResponse({ success: true, source: 'global_listener', time: new Date().toISOString() });
    return true;
  }
  
  // 其他消息在初始化后处理
  return false;
});

// 记录DOM变化，用于调试
const observer = new MutationObserver((mutations) => {
  console.log('[AetherFlow-DEBUG] 检测到DOM变化:', {
    count: mutations.length,
    time: new Date().toISOString()
  });
});

// 开始监听DOM变化
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false
});

// 监听文档加载状态
document.addEventListener('readystatechange', () => {
  console.log('[AetherFlow-DEBUG] 文档状态变化:', {
    readyState: document.readyState,
    time: new Date().toISOString()
  });
});

// 监听页面完全加载完成事件
window.addEventListener('load', () => {
  console.log('[AetherFlow-DEBUG] 页面加载完成事件触发:', {
    time: new Date().toISOString(),
    url: window.location.href
  });
  
  // 延迟发送就绪消息，确保DOM完全加载
  setTimeout(() => {
    sendReadyMessage();
  }, 500);
});

// 在内容脚本加载时立即发送就绪消息给后台脚本
function sendReadyMessage() {
  console.log('[AetherFlow-DEBUG] 发送内容脚本就绪消息:', {
    url: window.location.href,
    time: new Date().toISOString()
  });
  
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    data: {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      time: new Date().toISOString()
    }
  }, response => {
    console.log('[AetherFlow-DEBUG] 内容脚本就绪通知反馈:', {
      response,
      time: new Date().toISOString()
    });
    
    // 确保初始化
    if (!window.aetherflowInitialized) {
      initialize();
    }
  });
}

// 立即发送一次就绪消息
sendReadyMessage();

// 全局标记内容脚本初始化状态
declare global {
  interface Window {
    aetherflowInitialized?: boolean;
  }
}

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
  },
  
  // 选中文本状态
  selection: {
    text: '',
    hasSelection: false
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
  },
  
  // 设置选中文本捕获提示词功能
  setupSelectionCapture: () => {
    console.log('[AetherFlow] 初始化选中文本捕获功能');
    
    // 监听选择事件
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim() || '';
      
      // 更新全局状态
      globalState.selection.text = selectedText;
      globalState.selection.hasSelection = selectedText.length > 0;
    });
    
    // 创建自定义右键菜单
    document.addEventListener('contextmenu', (event) => {
      // 只有当有选中文本时才需要处理
      if (!globalState.selection.hasSelection) return;
      
      // 文本过长时不处理（设置一个合理的长度限制，例如10000字符）
      if (globalState.selection.text.length > 10000) return;
      
      // 存储选中的文本，在处理程序中使用
      const selectedText = globalState.selection.text;
      
      // 延迟执行，确保浏览器的默认上下文菜单已经显示
      setTimeout(() => {
        // 发送消息到背景脚本，通知添加上下文菜单
        chrome.runtime.sendMessage({
          type: 'ADD_CONTEXT_MENU_ITEM',
          data: {
            id: 'capture-prompt',
            title: 'Aetherflow-收藏提示词',
            contexts: ['selection'],
            selectedText
          }
        });
      }, 10);
    });
  },
  
  // 将选中文本保存为提示词
  captureSelectionAsPrompt: async (selectedText: string): Promise<void> => {
    try {
      console.log('[AetherFlow] 捕获选中文本作为提示词, 长度:', selectedText.length);
      
      // 发送消息到后台脚本处理保存提示词
      chrome.runtime.sendMessage({
        type: 'CAPTURE_SELECTION_AS_PROMPT',
        data: {
          content: selectedText
        }
      }, (response) => {
        console.log('[AetherFlow] 收到保存提示词响应:', response);
        
        if (response && response.success) {
          // 显示成功提示
          showNotification('提示词已成功添加到收藏夹', 'success');
        } else {
          const errorMsg = response?.error ? `保存失败: ${response.error}` : '保存提示词失败，请重试';
          console.error('[AetherFlow] 保存提示词失败:', response?.error || '未知错误');
          showNotification(errorMsg, 'error');
        }
      });
    } catch (error) {
      console.error('[AetherFlow] 捕获选中文本失败:', error);
      showNotification('保存提示词失败，请重试', 'error');
    }
  }
};

// 显示通知提示 - 优化版
function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  console.log('[AetherFlow-DEBUG] 显示通知:', {
    message,
    type,
    time: new Date().toISOString()
  });
  
  // 移除已有的通知
  const existingNotification = document.getElementById('aetherflow-notification');
  if (existingNotification) {
    document.body.removeChild(existingNotification);
    console.log('[AetherFlow-DEBUG] 移除已有通知');
  }
  
  // 创建通知容器
  const notification = document.createElement('div');
  notification.id = 'aetherflow-notification';
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.right = '20px';
  notification.style.bottom = '20px';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '2147483647'; // 最高层级
  notification.style.fontSize = '14px';
  notification.style.fontWeight = 'bold';
  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  notification.style.transition = 'all 0.3s ease-in-out';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  // 设置不同类型的样式
  if (type === 'success') {
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.border = '1px solid #43A047';
  } else {
    notification.style.backgroundColor = '#F44336';
    notification.style.color = 'white';
    notification.style.border = '1px solid #E53935';
  }
  
  // 添加图标
  const icon = type === 'success' ? '✓' : '✗';
  notification.textContent = `${icon} ${message}`;
  
  try {
    // 添加到页面
    document.body.appendChild(notification);
    console.log('[AetherFlow-DEBUG] 通知元素已添加到DOM');
    
    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
      console.log('[AetherFlow-DEBUG] 通知显示动画开始');
    }, 10);
    
    // 2秒后淡出
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      console.log('[AetherFlow-DEBUG] 通知开始淡出');
      
      // 动画结束后移除元素
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
          console.log('[AetherFlow-DEBUG] 通知元素已移除');
        }
      }, 300);
    }, 2000);
  } catch (error) {
    console.error('[AetherFlow-DEBUG] 显示通知出错:', error);
  }
}

// 初始化内容脚本
function initialize() {
  if (window.aetherflowInitialized) {
    console.log('[AetherFlow-DEBUG] 内容脚本已经初始化，跳过');
    return;
  }
  
  console.log('[AetherFlow-DEBUG] 开始初始化内容脚本:', {
    url: window.location.href,
    time: new Date().toISOString(),
    readyState: document.readyState
  });
  
  try {
    // 设置提示词快捷触发
    contentService.setupShortcutTrigger();
    
    // 设置选中文本捕获功能
    contentService.setupSelectionCapture();
    
    // 设置完整消息监听器
    addMessageListener((message: Message, sender, sendResponse) => {
      console.log('[AetherFlow-DEBUG] 收到消息(应用监听器):', {
        type: message.type,
        data: message.data,
        time: new Date().toISOString()
      });
      
      // PING消息已在全局监听器中处理
      if (message.type === 'PING') {
        return false; // 让全局监听器处理
      }
      
      if (message.type === 'CAPTURE_SELECTION') {
        // 处理选中文本捕获
        const selectedText = globalState.selection.text;
        if (selectedText) {
          console.log('[AetherFlow-DEBUG] 处理选中文本捕获:', {
            textLength: selectedText.length,
            textPreview: selectedText.substring(0, 50) + '...',
            time: new Date().toISOString()
          });
          contentService.captureSelectionAsPrompt(selectedText);
          sendResponse({ success: true, source: 'app_listener' });
        } else {
          console.warn('[AetherFlow-DEBUG] 没有选中文本可捕获');
          sendResponse({ success: false, error: '没有选中文本', source: 'app_listener' });
        }
      } else if (message.type === 'SHOW_NOTIFICATION') {
        // 显示通知消息
        if (message.data) {
          console.log('[AetherFlow-DEBUG] 显示通知(应用监听器):', {
            message: message.data.message,
            type: message.data.type,
            time: new Date().toISOString()
          });
          showNotification(
            message.data.message || '操作完成', 
            (message.data.type as 'success' | 'error') || 'success'
          );
          sendResponse({ success: true, source: 'app_listener' });
        } else {
          console.warn('[AetherFlow-DEBUG] 通知数据缺失');
          sendResponse({ success: false, error: '通知数据缺失', source: 'app_listener' });
        }
      }
      
      return true; // 继续传递消息
    });
    
    // 标记初始化完成
    window.aetherflowInitialized = true;
    
    // 日志输出表明内容脚本已就绪
    console.log('[AetherFlow-DEBUG] 内容脚本初始化完成，已就绪:', {
      time: new Date().toISOString(),
      url: window.location.href
    });
  } catch (error) {
    console.error('[AetherFlow-DEBUG] 内容脚本初始化失败:', error);
  }
}
