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

// 监听重新初始化事件
window.addEventListener('aetherflow-reinitialize', () => {
  console.log('[AetherFlow-DEBUG] 收到重新初始化事件', {
    time: new Date().toISOString(),
    url: window.location.href
  });
  
  // 重置初始化状态
  window.aetherflowInitialized = false;
  
  // 重新初始化
  initialize();
  
  // 重新发送就绪消息
  sendReadyMessage();
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
    aetherflowRefreshHintShown?: boolean;
    aetherflowStorageHintShown?: boolean; // 存储提示显示标记
    aetherflowBackgroundCheck?: any; // 后台脚本检查计时器
    aetherflowLastBackgroundAlive?: number; // 上次后台脚本活跃时间
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

// 全局消息ID计数器
let messageIdCounter = 0;

// 生成唯一消息ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${messageIdCounter++}`;
}

/**
 * 可靠消息发送函数 - 带重试、超时和备用机制
 * @param type 消息类型
 * @param data 消息数据
 * @param options 配置选项
 * @returns 返回一个Promise，包含响应结果
 */
async function sendReliableMessage<T>(
  type: string, 
  data: any, 
  options: {
    timeoutMs?: number;       // 超时时间（毫秒）
    maxRetries?: number;      // 最大重试次数
    retryDelayMs?: number;    // 重试延迟基础时间（毫秒）
    useStorageFallback?: boolean; // 是否在失败后使用存储作为备选
    storageKey?: string;      // 存储键前缀
  } = {}
): Promise<T | null> {
  // 默认选项
  const {
    timeoutMs = 5000,
    maxRetries = 2,
    retryDelayMs = 1000,
    useStorageFallback = false,
    storageKey = 'reliable_msg'
  } = options;

  // 生成唯一消息ID
  const messageId = generateMessageId();
  
  console.log(`[AetherFlow] 发送可靠消息: ${type}, ID=${messageId}`);
  
  // 检查后台脚本连接
  const isBackgroundActive = await ensureBackgroundActive();
  if (!isBackgroundActive) {
    console.warn(`[AetherFlow] 后台脚本未响应，消息可能无法送达: ${type}`);
  }
  
  // 带重试的消息发送函数
  const sendWithRetry = async (retryCount: number): Promise<T | null> => {
    console.log(`[AetherFlow] 尝试发送消息 ${type} [${retryCount}/${maxRetries}]`);
    
    try {
      // 如果不是第一次尝试，先唤醒后台脚本
      if (retryCount > 0) {
        wakeupBackgroundScript();
        // 给后台脚本一点时间启动
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 使用Promise包装消息发送
      return await new Promise<T | null>((resolve, reject) => {
        // 设置超时
        const timeoutId = setTimeout(() => {
          console.warn(`[AetherFlow] 消息 ${messageId} 发送超时`);
          reject(new Error('Message timeout'));
        }, timeoutMs);
        
        // 发送消息
        chrome.runtime.sendMessage({
          type,
          data: {
            ...data,
            messageId,
            timestamp: Date.now()
          }
        }, (response) => {
          // 清除超时
          clearTimeout(timeoutId);
          
          // 检查运行时错误
          const error = chrome.runtime.lastError;
          if (error) {
            console.error(`[AetherFlow] 消息 ${messageId} 发送失败:`, error.message);
            reject(error);
            return;
          }
          
          // 更新后台脚本活跃状态
          window.aetherflowLastBackgroundAlive = Date.now();
          
          console.log(`[AetherFlow] 消息 ${messageId} 发送成功，收到响应:`, response);
          resolve(response as T);
        });
      });
    } catch (error) {
      console.error(`[AetherFlow] 消息 ${messageId} 处理错误:`, error);
      
      // 如果还有重试次数，进行重试
      if (retryCount < maxRetries) {
        const delay = retryDelayMs * (retryCount + 1);
        console.log(`[AetherFlow] 将在 ${delay}ms 后重试消息 ${messageId}`);
        
        // 延迟后重试
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendWithRetry(retryCount + 1);
      }
      
      // 已达到最大重试次数，检查是否使用存储备选方案
      if (useStorageFallback) {
        console.warn(`[AetherFlow] 消息 ${messageId} 重试已达上限，使用存储备选方案`);
        return await useStorageFallbackStrategy();
      }
      
      // 无备选方案，返回null
      return null;
    }
  };
  
  // 存储备选策略
  const useStorageFallbackStrategy = async (): Promise<T | null> => {
    try {
      // 生成唯一存储键
      const uniqueStorageKey = `${storageKey}_${Date.now()}`;
      
      // 保存到存储
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({
          [uniqueStorageKey]: {
            type,
            data,
            timestamp: Date.now(),
            pending: true,
            messageId
          }
        }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      console.log(`[AetherFlow] 消息 ${messageId} 已保存到本地存储: ${uniqueStorageKey}`);
      
      // 返回一个模拟响应，表示消息已暂存
      return {
        success: true,
        usedFallback: true,
        storageKey: uniqueStorageKey
      } as unknown as T;
    } catch (storageError) {
      console.error(`[AetherFlow] 消息 ${messageId} 存储备选方案失败:`, storageError);
      return null;
    }
  };
  
  // 开始发送过程
  return await sendWithRetry(0);
}

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
          // 检测是否是新加载的扩展但页面未刷新的情况（输入"/"但没有任何反应）
          // 注释掉这块代码，因为我们已经在搜索结果中添加了提示
          /*
          if (lastSlashIndex === text.length - 1 && !state.active) {
            // 计数器来限制提示次数
            if (!window.aetherflowRefreshHintShown) {
              window.aetherflowRefreshHintShown = true;
              showNotification('提示：如果快捷输入未激活，请刷新页面后重试', 'info');
              console.log('[AetherFlow-DEBUG] 可能需要刷新页面才能启用快捷输入功能');
            }
          }
          */
          
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
        try {
          chrome.runtime.sendMessage({
            type: 'ADD_CONTEXT_MENU_ITEM',
            data: {
              id: 'capture-prompt',
              title: 'Aetherflow-Add to Library',
              contexts: ['selection'],
              selectedText  // 直接传递原始文本，不做修改
            }
          }, response => {
            const error = chrome.runtime.lastError;
            if (error) {
              console.error('[AetherFlow] 添加上下文菜单失败:', error.message);
            }
          });
        } catch (error) {
          console.error('[AetherFlow] 发送添加上下文菜单消息异常:', error);
        }
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
      
      // 使用增强的可靠消息发送函数
      const response = await sendReliableMessage<{success: boolean; error?: string; promptId?: string;}>(
        'CAPTURE_SELECTION_AS_PROMPT',
        { content: selectedText },
        {
          timeoutMs: 8000,        // 更长的超时时间
          maxRetries: 3,          // 最多重试3次
          retryDelayMs: 1000,     // 重试间隔1秒递增
          useStorageFallback: true, // 启用存储备选
          storageKey: 'temp_capture' // 存储键前缀
        }
      );
      
      if (!response) {
        // 所有尝试都失败
        console.error('[AetherFlow] 所有保存尝试都失败');
        showNotification('Failed to save prompt: Service is not responding, try refreshing the page', 'error');
        return;
      }
      
      // 检查是否使用了备选方案
      if ('usedFallback' in response && response.usedFallback) {
        console.log('[AetherFlow] 已使用备用方法临时保存，等待后台脚本处理');
        showNotification('Prompt saved. Will be processed when extension service is available.', 'info');
        return;
      }
      
      // 处理正常响应
      if (response.success) {
        // 显示成功提示
        showNotification('Prompt has been added to library', 'success');
      } else {
        const errorMsg = response.error ? `Save failed: ${response.error}` : 'Failed to save prompt, please try again';
        console.error('[AetherFlow] 保存提示词失败:', response.error || '未知错误');
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('[AetherFlow] 捕获选中文本失败:', error);
      showNotification('Failed to save prompt, please try again', 'error');
    }
  }
};

// 显示通知
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  console.log('[AetherFlow-DEBUG] 显示通知:', message, type);
  
  // 检查是否已存在通知容器
  let notificationContainer = document.getElementById('aetherflow-notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'aetherflow-notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.bottom = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '9999';
    document.body.appendChild(notificationContainer);
  }
  
  // 创建新通知元素
  const notification = document.createElement('div');
  notification.style.padding = '10px 15px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
  notification.style.fontSize = '14px';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.transition = 'opacity 0.3s, transform 0.3s';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.maxWidth = '320px';
  notification.style.wordWrap = 'break-word';
  
  // 根据类型设置样式
  if (type === 'success') {
    notification.style.backgroundColor = '#52c41a';
    notification.style.color = '#fff';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#ff4d4f';
    notification.style.color = '#fff';
  } else if (type === 'info') {
    notification.style.backgroundColor = '#1890ff';
    notification.style.color = '#fff';
  }
  
  notification.textContent = message;
  
  // 添加到容器
  notificationContainer.appendChild(notification);
  
  // 触发动画
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 设置自动消失
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 移除元素
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// 显示可操作的错误通知
function showActionableNotification(
  message: string, 
  actionText: string, 
  actionCallback: () => void,
  type: 'error' | 'warning' = 'error'
): void {
  console.log('[AetherFlow-DEBUG] 显示可操作通知:', message, actionText);
  
  // 检查是否已存在通知容器
  let notificationContainer = document.getElementById('aetherflow-notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'aetherflow-notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.bottom = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '9999';
    document.body.appendChild(notificationContainer);
  }
  
  // 创建新通知元素
  const notification = document.createElement('div');
  notification.style.padding = '12px 15px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
  notification.style.fontSize = '14px';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.transition = 'opacity 0.3s, transform 0.3s';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.maxWidth = '320px';
  notification.style.wordWrap = 'break-word';
  notification.style.display = 'flex';
  notification.style.flexDirection = 'column';
  notification.style.gap = '10px';
  
  // 根据类型设置样式
  if (type === 'error') {
    notification.style.backgroundColor = '#ff4d4f';
    notification.style.color = '#fff';
  } else if (type === 'warning') {
    notification.style.backgroundColor = '#faad14';
    notification.style.color = '#fff';
  }
  
  // 创建消息文本
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageElement.style.marginBottom = '5px';
  
  // 创建操作按钮
  const actionButton = document.createElement('button');
  actionButton.textContent = actionText;
  actionButton.style.padding = '5px 10px';
  actionButton.style.borderRadius = '4px';
  actionButton.style.border = 'none';
  actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  actionButton.style.color = 'white';
  actionButton.style.cursor = 'pointer';
  actionButton.style.alignSelf = 'flex-start';
  actionButton.style.fontSize = '12px';
  actionButton.style.fontWeight = 'bold';
  
  // 悬停效果
  actionButton.addEventListener('mouseover', () => {
    actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  });
  
  actionButton.addEventListener('mouseout', () => {
    actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  });
  
  // 点击事件
  actionButton.addEventListener('click', () => {
    // 执行回调
    actionCallback();
    
    // 关闭通知
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });
  
  // 添加元素到通知
  notification.appendChild(messageElement);
  notification.appendChild(actionButton);
  
  // 添加到容器
  notificationContainer.appendChild(notification);
  
  // 触发动画
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 设置自动消失（点击按钮外的情况）
  setTimeout(() => {
    // 如果通知已经不在DOM中，不处理
    if (!notification.parentNode) return;
    
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 移除元素
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 15000); // 15秒后自动关闭
}

// 初始化内容脚本
function initialize() {
  if (window.aetherflowInitialized) {
    console.log('[AetherFlow-DEBUG] 内容脚本已经初始化，跳过');
    return;
  }
  
  // 增强DOM就绪状态检查，确保DOM已完全加载
  if (document.readyState !== 'complete') {
    console.log('[AetherFlow-DEBUG] 页面尚未完全加载，等待DOMContentLoaded事件...');
    
    // 等待DOM完全加载后再初始化
    const domReadyHandler = () => {
      console.log('[AetherFlow-DEBUG] DOM已完全加载，开始初始化内容脚本');
      document.removeEventListener('DOMContentLoaded', domReadyHandler);
      window.removeEventListener('load', domReadyHandler);
      
      // 短暂延迟确保DOM稳定
      setTimeout(() => initialize(), 100);
    };
    
    document.addEventListener('DOMContentLoaded', domReadyHandler);
    window.addEventListener('load', domReadyHandler); // 双重保险
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
    
    // 设置后台脚本心跳检测
    setupBackgroundChecks();
    
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
          
          // 立即响应，避免阻塞消息通道
          sendResponse({ success: true, source: 'app_listener' });
          
          // 然后异步处理捕获
          contentService.captureSelectionAsPrompt(selectedText);
          return true;
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
    
    // 设置页面可见性变化检测，用于处理标签页切换后的功能恢复
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 日志输出表明内容脚本已就绪
    console.log('[AetherFlow-DEBUG] 内容脚本初始化完成，已就绪:', {
      time: new Date().toISOString(),
      url: window.location.href
    });
    
    // 发送就绪消息到后台脚本
    sendReadyMessage();
    
    // 设置自动健康检查和恢复系统
    setupAutoRecoverySystem();
    
    // 设置功能降级系统
    setupFallbackFunctionality();
    
  } catch (error) {
    console.error('[AetherFlow-DEBUG] 内容脚本初始化失败:', error);
    
    // 清除初始化状态，以便后续可以重试
    window.aetherflowInitialized = false;
    
    // 1分钟后自动重试初始化
    setTimeout(() => {
      console.log('[AetherFlow-DEBUG] 尝试重新初始化内容脚本');
      initialize();
    }, 60000);
  }
}

// 处理页面可见性变化
function handleVisibilityChange() {
  // 当页面变为可见时，检查内容脚本的功能完整性
  if (document.visibilityState === 'visible') {
    console.log('[AetherFlow-DEBUG] 页面变为可见，检查内容脚本状态');
    
    // 检查内容脚本是否已初始化
    if (!window.aetherflowInitialized) {
      console.warn('[AetherFlow-DEBUG] 检测到内容脚本未初始化，重新初始化');
      initialize();
      return;
    }
    
    // 检查后台脚本连接
    ensureBackgroundActive().then(isActive => {
      if (!isActive) {
        console.warn('[AetherFlow-DEBUG] 后台脚本连接检查失败，可能需要用户干预');
      }
    });
  }
}

// 添加后台脚本检测机制
function setupBackgroundChecks() {
  // 停止任何现有的检查
  if (window.aetherflowBackgroundCheck) {
    clearInterval(window.aetherflowBackgroundCheck);
  }
  
  // 记录初始时间
  window.aetherflowLastBackgroundAlive = Date.now();
  
  // 设置定期检查
  window.aetherflowBackgroundCheck = setInterval(() => {
    checkBackgroundStatus();
  }, 30000); // 每30秒检查一次
  
  // 立即执行一次检查
  checkBackgroundStatus();
  
  console.log('[AetherFlow-DEBUG] 后台脚本状态检查已设置');
}

// 检查后台脚本状态
function checkBackgroundStatus() {
  console.log('[AetherFlow-DEBUG] 检查后台脚本状态...');
  
  const timeSinceLastAlive = Date.now() - (window.aetherflowLastBackgroundAlive || 0);
  
  // 如果上次活跃时间超过2分钟，尝试唤醒
  if (timeSinceLastAlive > 120000) {
    console.warn('[AetherFlow-DEBUG] 后台脚本可能已休眠，尝试唤醒...');
    wakeupBackgroundScript();
  }
  
  // 发送ping检查活跃状态
  chrome.runtime.sendMessage({ type: 'PING', source: 'background_check' }, response => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.warn('[AetherFlow-DEBUG] 后台脚本状态检查失败:', error.message);
      wakeupBackgroundScript();
    } else {
      console.log('[AetherFlow-DEBUG] 后台脚本状态检查成功，更新活跃时间');
      window.aetherflowLastBackgroundAlive = Date.now();
    }
  });
}

// 尝试唤醒后台脚本
function wakeupBackgroundScript() {
  console.log('[AetherFlow-DEBUG] 尝试唤醒后台脚本...');
  
  // 方法1: 打开或焦点激活扩展的侧边栏
  try {
    chrome.runtime.sendMessage({ type: 'WAKEUP' });
  } catch (e) {
    console.warn('[AetherFlow-DEBUG] 唤醒消息发送失败:', e);
  }
  
  // 方法2: 访问扩展的存储
  try {
    chrome.storage.local.get('wakeup', data => {
      chrome.storage.local.set({ 'wakeup': Date.now() });
      console.log('[AetherFlow-DEBUG] 通过存储访问尝试唤醒后台脚本');
    });
  } catch (e) {
    console.warn('[AetherFlow-DEBUG] 通过存储唤醒失败:', e);
  }
}

// 确保后台脚本处于活跃状态
async function ensureBackgroundActive(): Promise<boolean> {
  console.log('[AetherFlow] 检查后台脚本活跃状态...');
  
  return new Promise(resolve => {
    // 先尝试直接ping
    chrome.runtime.sendMessage({ type: 'PING', immediate: true }, response => {
      const error = chrome.runtime.lastError;
      
      if (!error && response) {
        console.log('[AetherFlow] 后台脚本正常响应');
        window.aetherflowLastBackgroundAlive = Date.now();
        resolve(true);
        return;
      }
      
      console.warn('[AetherFlow] 后台脚本未响应，尝试唤醒...');
      
      // 如果失败，尝试唤醒
      wakeupBackgroundScript();
      
      // 给一点时间让后台脚本唤醒
      setTimeout(() => {
        // 再次尝试ping
        chrome.runtime.sendMessage({ type: 'PING', retry: true }, secondResponse => {
          const secondError = chrome.runtime.lastError;
          
          if (!secondError && secondResponse) {
            console.log('[AetherFlow] 后台脚本已成功唤醒');
            window.aetherflowLastBackgroundAlive = Date.now();
            resolve(true);
          } else {
            console.warn('[AetherFlow] 后台脚本唤醒失败，将继续尝试');
            resolve(false);
          }
        });
      }, 500);
    });
  });
}

// 增强的内容脚本健康检查系统
interface HealthCheckResult {
  contentScriptLoaded: boolean;
  backgroundResponsive: boolean;
  storageFunctional: boolean;
  domAccessible: boolean;
  timestamp: number;
}

// 执行全面健康检查
async function performHealthCheck(): Promise<HealthCheckResult> {
  console.log('[AetherFlow-DEBUG] 执行内容脚本健康检查...');
  
  // 默认健康状态
  const healthStatus: HealthCheckResult = {
    contentScriptLoaded: !!window.aetherflowInitialized,
    backgroundResponsive: false,
    storageFunctional: false,
    domAccessible: false,
    timestamp: Date.now()
  };
  
  // 检查DOM访问
  try {
    // 尝试执行一个简单的DOM操作来检查是否能访问DOM
    const testDiv = document.createElement('div');
    testDiv.id = 'aetherflow-health-check';
    testDiv.style.display = 'none';
    document.body.appendChild(testDiv);
    document.body.removeChild(testDiv);
    healthStatus.domAccessible = true;
  } catch (error) {
    console.warn('[AetherFlow-DEBUG] 健康检查: DOM访问失败', error);
  }
  
  // 检查后台脚本响应
  try {
    const isActive = await ensureBackgroundActive();
    healthStatus.backgroundResponsive = isActive;
  } catch (error) {
    console.warn('[AetherFlow-DEBUG] 健康检查: 后台脚本连接失败', error);
  }
  
  // 检查存储功能
  try {
    // 尝试使用存储API存储和读取一个健康检查值
    const healthCheckKey = 'aetherflow_health_check';
    const healthCheckValue = Date.now();
    
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ [healthCheckKey]: healthCheckValue }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          chrome.storage.local.get(healthCheckKey, (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (result[healthCheckKey] === healthCheckValue) {
              healthStatus.storageFunctional = true;
              resolve();
            } else {
              reject(new Error('Storage read value mismatch'));
            }
          });
        }
      });
    });
  } catch (error) {
    console.warn('[AetherFlow-DEBUG] 健康检查: 存储功能失败', error);
  }
  
  console.log('[AetherFlow-DEBUG] 健康检查完成:', healthStatus);
  
  // 记录健康检查结果到存储中，以便稍后分析
  try {
    const key = 'aetherflow_health_history';
    chrome.storage.local.get(key, (data) => {
      const history = data[key] || [];
      history.push(healthStatus);
      
      // 只保留最近10条记录
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }
      
      chrome.storage.local.set({ [key]: history });
    });
  } catch (e) {
    // 忽略记录失败错误
  }
  
  return healthStatus;
}

// 根据健康检查结果尝试自动恢复
async function attemptAutoRecovery(health: HealthCheckResult): Promise<boolean> {
  console.log('[AetherFlow-DEBUG] 尝试根据健康检查结果进行自动恢复...');
  
  let recoverySuccessful = true;
  
  // 如果内容脚本未初始化，尝试重新初始化
  if (!health.contentScriptLoaded) {
    console.warn('[AetherFlow-DEBUG] 内容脚本未初始化，尝试重新初始化');
    try {
      // 重置初始化状态
      window.aetherflowInitialized = false;
      
      // 重新初始化
      initialize();
      
      // 验证初始化成功
      recoverySuccessful = recoverySuccessful && !!window.aetherflowInitialized;
    } catch (error) {
      console.error('[AetherFlow-DEBUG] 内容脚本重新初始化失败:', error);
      recoverySuccessful = false;
    }
  }
  
  // 如果后台脚本无响应，尝试唤醒
  if (!health.backgroundResponsive) {
    console.warn('[AetherFlow-DEBUG] 后台脚本无响应，尝试唤醒');
    try {
      // 尝试唤醒后台脚本
      wakeupBackgroundScript();
      
      // 等待一段时间让后台脚本唤醒
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 再次检查
      const isActive = await ensureBackgroundActive();
      recoverySuccessful = recoverySuccessful && isActive;
      
      // 如果唤醒失败，提供用户指导
      if (!isActive) {
        // 避免重复显示提示
        if (!window.aetherflowRefreshHintShown) {
          window.aetherflowRefreshHintShown = true;
          
          // 显示可操作的通知
          showActionableNotification(
            'AetherFlow连接问题：扩展服务可能未响应',
            '刷新页面',
            () => {
              // 刷新页面
              window.location.reload();
            },
            'warning'
          );
        }
      }
    } catch (error) {
      console.error('[AetherFlow-DEBUG] 后台脚本唤醒失败:', error);
      recoverySuccessful = false;
    }
  }
  
  // 如果存储功能失败
  if (!health.storageFunctional) {
    console.warn('[AetherFlow-DEBUG] 存储功能不可用，可能影响数据保存');
    
    // 避免重复显示提示
    if (!window.aetherflowStorageHintShown) {
      window.aetherflowStorageHintShown = true;
      
      // 显示存储问题通知
      showActionableNotification(
        'AetherFlow存储问题：无法访问扩展存储，可能影响提示词保存',
        '查看帮助',
        () => {
          // 打开扩展选项页或文档
          try {
            chrome.runtime.openOptionsPage();
          } catch (e) {
            // 如果无法打开选项页，尝试打开扩展管理页
            window.open('chrome://extensions/?id=' + chrome.runtime.id);
          }
        },
        'warning'
      );
    }
  }
  
  if (recoverySuccessful) {
    console.log('[AetherFlow-DEBUG] 自动恢复成功');
    
    // 重置提示标记
    window.aetherflowRefreshHintShown = false;
    window.aetherflowStorageHintShown = false;
  } else {
    console.warn('[AetherFlow-DEBUG] 自动恢复部分失败，可能需要用户干预');
  }
  
  return recoverySuccessful;
}

// 设置自动健康检查和恢复系统
function setupAutoRecoverySystem() {
  console.log('[AetherFlow-DEBUG] 设置自动健康检查和恢复系统');
  
  // 每5分钟进行一次健康检查
  const healthCheckIntervalMinutes = 5;
  
  // 在后台运行的健康检查
  const runBackgroundHealthCheck = async () => {
    try {
      // 执行健康检查
      const healthStatus = await performHealthCheck();
      
      // 检查是否需要恢复
      const needsRecovery = !healthStatus.contentScriptLoaded || 
                           !healthStatus.backgroundResponsive;
      
      if (needsRecovery) {
        console.warn('[AetherFlow-DEBUG] 健康检查发现问题，尝试自动恢复');
        await attemptAutoRecovery(healthStatus);
      }
    } catch (error) {
      console.error('[AetherFlow-DEBUG] 健康检查或恢复过程出错:', error);
    }
  };
  
  // 立即执行一次健康检查
  runBackgroundHealthCheck();
  
  // 设置定期健康检查
  setInterval(runBackgroundHealthCheck, healthCheckIntervalMinutes * 60 * 1000);
  
  // 在页面可见性变化时执行健康检查
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[AetherFlow-DEBUG] 页面变为可见，执行健康检查');
      runBackgroundHealthCheck();
    }
  });
  
  // 注册处理程序来响应网络状态变化
  window.addEventListener('online', () => {
    console.log('[AetherFlow-DEBUG] 网络恢复在线，执行健康检查');
    runBackgroundHealthCheck();
  });
}

// 在内容脚本初始化后设置自动恢复系统
if (document.readyState === 'complete') {
  // 如果页面已加载，立即设置
  setupAutoRecoverySystem();
} else {
  // 否则等待页面加载完成
  window.addEventListener('load', setupAutoRecoverySystem);
}

// 功能降级系统 - 确保在出现问题时能提供基础功能
function setupFallbackFunctionality() {
  console.log('[AetherFlow-DEBUG] 设置功能降级系统');
  
  // 后台脚本不可用时的捕获提示词备选方案
  const capturePromptFallback = async (content: string): Promise<boolean> => {
    console.log('[AetherFlow-DEBUG] 使用备选方案保存提示词');
    
    try {
      // 生成唯一ID
      const tempId = `temp_capture_${Date.now()}`;
      
      // 保存到本地存储
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({
          [tempId]: {
            content,
            timestamp: Date.now(),
            pendingCapture: true
          }
        }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      // 显示成功通知
      showNotification('Prompt saved temporarily. Will be processed when extension service is available.', 'info');
      
      // 尝试通知后台处理
      try {
        chrome.runtime.sendMessage({ 
          type: 'PROCESS_PENDING_CAPTURES'
        });
      } catch (e) {
        // 忽略通知错误
      }
      
      return true;
    } catch (error) {
      console.error('[AetherFlow-DEBUG] 备选方案保存失败:', error);
      return false;
    }
  };
  
  // 拦截contentService.captureSelectionAsPrompt方法，添加降级功能
  const originalCaptureMethod = contentService.captureSelectionAsPrompt;
  
  // 替换为带降级功能的版本
  contentService.captureSelectionAsPrompt = async (selectedText: string): Promise<void> => {
    try {
      // 先检查后台脚本状态
      const isBackgroundActive = await ensureBackgroundActive();
      
      if (isBackgroundActive) {
        // 正常功能可用，使用原始方法
        await originalCaptureMethod(selectedText);
      } else {
        // 后台脚本不可用，使用备选方案
        console.warn('[AetherFlow-DEBUG] 后台脚本不可用，使用备选保存方案');
        
        const success = await capturePromptFallback(selectedText);
        
        if (!success) {
          // 备选方案也失败，提供用户指导
          showActionableNotification(
            'AetherFlow服务不可用，无法保存提示词',
            '重启扩展',
            () => {
              // 尝试通过刷新页面重启
              window.location.reload();
            },
            'error'
          );
        }
      }
    } catch (error) {
      console.error('[AetherFlow-DEBUG] 捕获提示词出错 (含降级处理):', error);
      
      // 尝试使用备选方案
      try {
        await capturePromptFallback(selectedText);
      } catch (fallbackError) {
        // 备选方案也失败，显示错误
        showNotification('Failed to save prompt: All methods failed', 'error');
      }
    }
  };
  
  console.log('[AetherFlow-DEBUG] 功能降级系统已设置');
}
