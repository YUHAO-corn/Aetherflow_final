import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';
import { GenericAdapter } from './platformAdapter';
import { injectPromptShortcut } from './PromptShortcutInjector';
import { promptShortcutService, PromptShortcutEventType } from '../services/promptShortcut';
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
    
    // 监听提示词浮层被关闭的自定义事件
    window.addEventListener(PromptShortcutEventType.DISMISSED, ((event: CustomEvent) => {
      console.log('[AetherFlow] 接收到浮层关闭事件，标记已自动关闭', event.detail);
      
      // 使用服务层处理事件
      promptShortcutService.handleShortcutDismissed(event.detail?.manualClosed || false);
    }) as EventListener);
    
    // 监听搜索无匹配的事件，用于飞书触发逻辑
    window.addEventListener(PromptShortcutEventType.NO_MATCH, ((event: CustomEvent) => {
      console.log('[AetherFlow] 搜索无匹配结果，增加计数', event.detail);
      
      // 使用服务层增加无匹配计数
      promptShortcutService.incrementNoMatchCount();
    }) as EventListener);
    
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
        
        // 获取当前状态
        const state = promptShortcutService.getState();
        
        // 详细输出当前状态，帮助调试
        console.log('[AetherFlow-DEBUG] 输入检测:', {
          textLength: text.length,
          lastSlashIndex,
          hasSlash: lastSlashIndex >= 0,
          activeStatus: state.active,
          hasAutoDismissed: state.hasAutoDismissed,
          manualClosed: state.manualClosed,
          lastTriggerSlashPosition: state.lastTriggerSlashPosition
        });
        
        // 判断是否是新的斜杠输入
        const isNewSlash = promptShortcutService.isNewSlashInput(lastSlashIndex);
        
        // 如果是新的斜杠输入且处于手动关闭状态，重置手动关闭状态
        if (state.manualClosed && isNewSlash) {
          console.log('[AetherFlow-DEBUG] 检测到新的斜杠输入，重置手动关闭状态');
          promptShortcutService.updateState({ manualClosed: false });
        }
        
        // 更新上次触发的斜杠位置
        if (isNewSlash) {
          promptShortcutService.updateState({ lastTriggerSlashPosition: lastSlashIndex });
        }
        
        // 提取搜索词
        const searchTerm = lastSlashIndex >= 0 ? text.substring(lastSlashIndex + 1) : '';
        
        // 飞书逻辑：检查是否应该显示浮层
        if (
          lastSlashIndex >= 0 && 
          text.length - lastSlashIndex <= 200 && 
          !state.manualClosed
        ) {
          // 飞书逻辑：如果搜索词超过10个字符且无匹配结果，自动关闭
          if (searchTerm.length > 10 && state.noMatchCount > 2) {
            if (state.active) {
              console.log('[AetherFlow-DEBUG] 搜索词超过10个字符且无匹配，自动关闭');
              promptShortcutService.closePromptShortcut();
              promptShortcutService.updateState({ hasAutoDismissed: true });
              return;
            }
          }
          
          // 改进输入法中间状态检测
          const inputMethod = promptShortcutService.detectInputMethod(searchTerm);
          
          console.log('[AetherFlow-DEBUG] 检测到"/"输入:', {
            slashPos: lastSlashIndex,
            searchTerm,
            inputMethod,
            active: state.active
          });
          
          // 使用服务层判断是否应该激活浮层
          const shouldActivate = promptShortcutService.shouldActivateShortcut(
            target, 
            lastSlashIndex, 
            searchTerm
          );
          
          if (shouldActivate) {
            // 使用服务层显示提示词快捷输入浮层
            const cleanup = promptShortcutService.showPromptShortcut(
              target,
              adapter,
              lastSlashIndex,
              searchTerm
            );
            
            // 保存清理函数
            promptShortcutService.updateState({ cleanupFn: cleanup });
          }
        } 
        // 修改关闭逻辑：只有在斜杠完全被删除时才关闭浮层
        else if (state.active && 
                 state.currentElement === target && 
                 lastSlashIndex < 0) { // 仅当斜杠完全不存在时才关闭
          
          console.log('[AetherFlow-DEBUG] "/"已被删除，关闭面板');
          
          // 使用服务层关闭浮层
          promptShortcutService.closePromptShortcut();
        }
      }
    }, 200); // 维持200ms的节流限制
    
    // 监听表单输入事件
    document.addEventListener('input', handleInput);
    
    // 监听焦点变化
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      const state = promptShortcutService.getState();
      
      // 如果新获得焦点的元素不是当前的活跃元素，则清理
      if (
        state.active && 
        state.currentElement && 
        state.currentElement !== target
      ) {
        console.log('[AetherFlow] 焦点转移到新元素，关闭提示词面板');
        
        // 使用服务层关闭浮层
        promptShortcutService.closePromptShortcut();
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
      if (!selection) return;
      
      // 重要：使用原始文本，不进行trim()以确保保留所有空白字符（包括换行符）
      const selectedText = selection.toString() || '';
      
      // 仅用于判断是否有选择的变量
      const hasSelection = selectedText.trim().length > 0;
      
      // 更新全局状态
      globalState.selection.text = selectedText; // 保存原始文本，不进行trim
      globalState.selection.hasSelection = hasSelection;
      
      console.log('[AetherFlow-DEBUG] 文本选择更新:', {
        hasSelection,
        textLength: selectedText.length,
        previewText: selectedText.substring(0, 30).replace(/\n/g, '\\n') // 显示换行符，仅用于日志
      });
    });
    
    // 创建自定义右键菜单
    document.addEventListener('contextmenu', (event) => {
      // 只有当有选中文本时才需要处理
      if (!globalState.selection.hasSelection) return;
      
      // 文本过长时不处理（设置一个合理的长度限制，例如10000字符）
      if (globalState.selection.text.length > 10000) return;
      
      // 存储选中的文本，在处理程序中使用（保持原始格式）
      const selectedText = globalState.selection.text;
      
      console.log('[AetherFlow-DEBUG] 右键菜单事件:', {
        hasSelection: true,
        textLength: selectedText.length,
        containsNewlines: selectedText.includes('\n'),
        lineCount: selectedText.split('\n').length
      });
      
      // 延迟执行，确保浏览器的默认上下文菜单已经显示
      setTimeout(() => {
        // 发送消息到背景脚本，通知添加上下文菜单
        chrome.runtime.sendMessage({
          type: 'ADD_CONTEXT_MENU_ITEM',
          data: {
            id: 'capture-prompt',
            title: 'Aetherflow-Add to Library',
            contexts: ['selection'],
            selectedText  // 直接传递原始文本，不做修改
          }
        });
      }, 10);
    });
  },
  
  // 将选中文本保存为提示词
  captureSelectionAsPrompt: async (selectedText: string): Promise<void> => {
    try {
      console.log('[AetherFlow] 捕获选中文本作为提示词:', {
        长度: selectedText.length,
        包含换行符: selectedText.includes('\n'),
        行数: selectedText.split('\n').length,
        前30字符: selectedText.substring(0, 30).replace(/\n/g, '\\n')
      });
      
      // 直接发送原始文本，不做任何修改
      // 发送消息到后台脚本处理保存提示词
      chrome.runtime.sendMessage({
        type: 'CAPTURE_SELECTION_AS_PROMPT',
        data: {
          content: selectedText  // 保持原始格式，包括换行符
        }
      }, (response) => {
        console.log('[AetherFlow] 收到保存提示词响应:', response);
        
        if (response && response.success) {
          // 显示成功提示
          showNotification('Prompt has been added to library', 'success');
        } else {
          const errorMsg = response?.error ? `Save failed: ${response.error}` : 'Failed to save prompt, please try again';
          console.error('[AetherFlow] 保存提示词失败:', response?.error || '未知错误');
          showNotification(errorMsg, 'error');
        }
      });
    } catch (error) {
      console.error('[AetherFlow] 捕获选中文本失败:', error);
      showNotification('Failed to save prompt, please try again', 'error');
    }
  }
};

// 显示通知
function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  console.log('[AetherFlow-DEBUG] 显示通知:', {
    message,
    type,
    time: new Date().toISOString()
  });
  
  try {
    // 移除旧的通知(如果存在)
    const existingNotification = document.getElementById('aetherflow-notification');
    if (existingNotification) {
      document.body.removeChild(existingNotification);
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.id = 'aetherflow-notification';
    
    // 设置样式
    notification.style.position = 'fixed';
    notification.style.right = '20px';
    notification.style.bottom = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '2147483647'; // 最高层级
    notification.style.fontSize = '14px';
    notification.style.fontWeight = 'bold';
    notification.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.transition = 'all 0.3s ease-in-out';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 根据类型设置颜色
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
    
    // 添加到页面
    document.body.appendChild(notification);
    console.log('[AetherFlow-DEBUG] 已创建通知DOM元素');
    
    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
      console.log('[AetherFlow-DEBUG] 通知动画开始显示');
    }, 10);
    
    // 3秒后自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      console.log('[AetherFlow-DEBUG] 通知开始自动隐藏');
      
      // 动画完成后移除元素
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
          console.log('[AetherFlow-DEBUG] 通知DOM元素已移除');
        }
      }, 300);
    }, 3000);
  } catch (error) {
    console.error('[AetherFlow-DEBUG] 显示通知失败:', error);
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
    // 重置提示词快捷输入状态
    promptShortcutService.resetState();
    
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
      
      if (message.type === 'GET_SELECTED_TEXT') {
        // 返回当前选中的文本（包括换行符）
        const selectedText = globalState.selection.text;
        console.log('[AetherFlow-DEBUG] 响应获取选中文本请求:', {
          长度: selectedText.length,
          包含换行符: selectedText.includes('\n'),
          行数: selectedText.split('\n').length,
          前30字符: selectedText.substring(0, 30).replace(/\n/g, '\\n')
        });
        sendResponse({ text: selectedText });
        return true;
      } else if (message.type === 'CAPTURE_SELECTION') {
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
