import { addMessageListener, createSuccessResponse, createErrorResponse } from '../services/messaging';
import { Message } from '../services/messaging/types';
import { STORAGE_KEYS, storageService, setStorageMode } from '../services/storage';
import { setupPromptMessaging } from '../services/prompt/messaging';
import { Prompt, PromptFilter } from '../services/prompt/types';
import { createPrompt } from '../services/prompt';
import { initializeSampleData } from './sampleData';
import { migratePromptsData } from '../services/storage';
import { initializeFirebase } from '../services/auth/firebase';
import { cloudStorageService } from '../services/storage/cloudStorage';
import { getFirebaseAuth } from '../services/auth/firebase';
import { membershipService } from '../services/membership';
import { authService } from '../services/auth';

console.log('[AetherFlow] 后台脚本加载成功');

// 设置Service Worker保活机制
setupServiceWorkerKeepAlive();

// 初始化提示词消息处理
setupPromptMessaging();

// 添加专门处理提示词更新消息的处理器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理提示词更新消息
  if (message && message.type === 'PROMPT_UPDATED') {
    console.log('[AetherFlow] 收到提示词更新消息，准备广播给所有标签页');
    
    // 获取所有标签页
    chrome.tabs.query({}, (tabs) => {
      // 向所有标签页广播更新消息
      tabs.forEach(tab => {
        if (tab.id) {
          try {
            chrome.tabs.sendMessage(tab.id, { 
              type: 'PROMPT_UPDATED',
              from: 'background'
            }).catch(error => {
              // 忽略消息发送错误，这通常是因为标签页没有内容脚本
              console.debug(`无法向标签页 ${tab.id} 发送更新通知:`, error);
            });
          } catch (error) {
            // 忽略错误
          }
        }
      });
    });
    
    // 发送成功响应
    sendResponse({ success: true });
    return true;
  }
  
  // 不处理其他消息
  return false;
});

/**
 * 设置Service Worker保活机制，防止长时间不活动后休眠
 * Chrome扩展的Service Worker会在不活动后休眠，这会导致功能失效
 */
function setupServiceWorkerKeepAlive() {
  console.log('[AetherFlow] 设置Service Worker保活机制');
  
  // 记录心跳次数
  let heartbeatCount = 0;
  
  // 设置定期唤醒闹钟
  chrome.alarms.create('aetherflow-keepalive', {
    periodInMinutes: 1 // 每1分钟唤醒一次
  });
  
  // 监听闹钟事件
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'aetherflow-keepalive') {
      heartbeatCount++;
      
      // 每10次心跳打印一次日志，避免日志过多
      if (heartbeatCount % 10 === 0) {
        console.log(`[AetherFlow] Service Worker心跳 #${heartbeatCount} (通过alarms API)`);
      }
      
      // 执行一些轻量级操作保持活跃
      chrome.storage.local.get('lastHeartbeat', (result) => {
        chrome.storage.local.set({ 
          'lastHeartbeat': Date.now(),
          'heartbeatCount': heartbeatCount
        });
      });
      
      // 检查所有标签页的内容脚本状态
      refreshContentScriptsStatus();
      
      // 处理暂存的捕获请求
      processPendingCaptures();
    }
  });
  
  // 额外使用消息机制作为备份
  const sendHeartbeat = () => {
    // 向自己发送消息保持活跃
    chrome.runtime.sendMessage({ type: 'HEARTBEAT', count: heartbeatCount })
      .catch(error => {
        // 忽略错误，这里只是为了保持活跃
      });
  };
  
  // 设置定时器，每60秒发送一次心跳
  setInterval(sendHeartbeat, 60000);
  
  // 监听HEARTBEAT消息，用于响应自己发送的心跳
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'HEARTBEAT') {
      // 立即响应，保持活跃
      sendResponse({ alive: true, count: message.count });
      return true;
    }
    return false;
  });
  
  // 刷新所有标签页的内容脚本状态
  function refreshContentScriptsStatus() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && tab.url.startsWith('http')) {
          checkContentScriptStatus(tab.id).catch(() => {
            // 忽略错误，这只是一个状态检查
          });
        }
      });
    });
  }
  
  // 立即注册一个一次性的闹钟，确保启动后很快就执行一次
  chrome.alarms.create('aetherflow-keepalive-initial', {
    delayInMinutes: 0.1 // 6秒后执行一次
  });
}

/**
 * 设置初始示例数据
 */
async function setupInitialData() {
  try {
    // 检查是否已有数据
    const existingPrompts = await storageService.getAllPrompts();
    
    // 如果没有数据，初始化示例数据
    if (existingPrompts.length === 0) {
      console.log('[AetherFlow] 后台: 初始化示例提示词数据');
      const result = await initializeSampleData();
      console.log('示例数据初始化结果:', result);
    } else {
      console.log('[AetherFlow] 后台: 已存在提示词数据, 共', existingPrompts.length, '条');
    }
  } catch (error) {
    console.error('[AetherFlow] 后台: 初始化数据失败', error);
  }
}

// 跟踪内容脚本状态
const contentScriptRegistry = new Map<number, boolean>();

// 记录页面加载和内容脚本注册情况
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`[AetherFlow-DEBUG] 页面更新: ID=${tabId}, 状态=${changeInfo.status}, URL=${tab.url?.substring(0, 50)}`);
  
  // 当页面完成加载时，检查内容脚本是否就绪
  if (changeInfo.status === 'complete') {
    console.log(`[AetherFlow-DEBUG] 页面加载完成: ID=${tabId}, 准备检查内容脚本`);
    
    // 延迟检查，给内容脚本足够时间初始化
    setTimeout(() => {
      checkContentScriptStatus(tabId);
    }, 1000);
  }
});

// 监听标签页关闭，移除注册表中的记录
chrome.tabs.onRemoved.addListener((tabId) => {
  if (contentScriptRegistry.has(tabId)) {
    console.log(`[AetherFlow-DEBUG] 标签页关闭，移除注册: ID=${tabId}`);
    contentScriptRegistry.delete(tabId);
  }
});

// 检查内容脚本状态并记录
async function checkContentScriptStatus(tabId: number): Promise<void> {
  console.log(`[AetherFlow-DEBUG] 主动检查内容脚本状态: ID=${tabId}`);
  
  try {
    const ready = await isContentScriptReady(tabId);
    console.log(`[AetherFlow-DEBUG] 内容脚本状态检查结果: ID=${tabId}, 就绪=${ready}`);
  } catch (error) {
    console.error(`[AetherFlow-DEBUG] 检查内容脚本状态出错: ID=${tabId}`, error);
  }
}

// 检查内容脚本是否就绪
function isContentScriptReady(tabId: number): Promise<boolean> {
  console.log(`[AetherFlow-DEBUG] 开始检查内容脚本就绪状态: ID=${tabId}, 已注册=${contentScriptRegistry.has(tabId)}`);
  
  // 首先检查注册表中是否已记录此标签页
  if (contentScriptRegistry.has(tabId)) {
    console.log(`[AetherFlow-DEBUG] 内容脚本已在注册表中: ID=${tabId}`);
    return Promise.resolve(true);
  }

  // 否则发送ping消息检查
  return new Promise(resolve => {
    try {
      console.log(`[AetherFlow-DEBUG] 发送PING消息检查内容脚本: ID=${tabId}`);
      
      // 发送ping消息检查内容脚本是否加载
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
        if (chrome.runtime.lastError) {
          console.log(`[AetherFlow-DEBUG] 内容脚本未就绪: ID=${tabId}, 错误=${chrome.runtime.lastError.message}`);
          resolve(false);
        } else {
          console.log(`[AetherFlow-DEBUG] 内容脚本已就绪: ID=${tabId}, 响应=`, response);
          // 记录此标签页的内容脚本已就绪
          contentScriptRegistry.set(tabId, true);
          resolve(true);
        }
      });
    } catch (error) {
      console.error(`[AetherFlow-DEBUG] 检查内容脚本就绪状态时出错: ID=${tabId}`, error);
      resolve(false);
    }
  });
}

// 强制显示通知，绕过内容脚本
async function forceShowNotification(tabId: number, message: string, type: 'success' | 'error'): Promise<boolean> {
  try {
    console.log(`[AetherFlow] 强制显示通知: ID=${tabId}, 消息=${message}`);
    
    // 使用executeScript直接在页面中注入通知
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (msg, typ) => {
        console.log('[AetherFlow-INJECT] 强制显示通知:', msg);
        
        // 移除已有的通知
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
        notification.style.zIndex = '2147483647';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = 'bold';
        notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        notification.style.transition = 'all 0.3s ease-in-out';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        // 设置颜色
        if (typ === 'success') {
          notification.style.backgroundColor = '#4CAF50';
          notification.style.color = 'white';
          notification.style.border = '1px solid #43A047';
        } else {
          notification.style.backgroundColor = '#F44336';
          notification.style.color = 'white';
          notification.style.border = '1px solid #E53935';
        }
        
        // 添加图标
        const icon = typ === 'success' ? '✓' : '✗';
        notification.textContent = `${icon} ${msg}`;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
          notification.style.opacity = '1';
          notification.style.transform = 'translateY(0)';
        }, 10);
        
        // 3秒后隐藏
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transform = 'translateY(20px)';
          
          // 动画完成后移除
          setTimeout(() => {
            if (notification.parentNode) {
              document.body.removeChild(notification);
            }
          }, 300);
        }, 3000);
        
        return true;
      },
      args: [message, type]
    });
    
    return result && result[0] && result[0].result === true;
  } catch (error) {
    console.error(`[AetherFlow] 强制显示通知失败:`, error);
    return false;
  }
}

// 安全地向内容脚本发送通知
async function safelySendNotification(tabId: number, message: string, type: 'success' | 'error'): Promise<boolean> {
  console.log(`[AetherFlow-DEBUG] 尝试发送通知: ID=${tabId}, 消息=${message}, 类型=${type}`);
  
  if (!tabId || tabId <= 0) {
    console.warn(`[AetherFlow-DEBUG] 无法发送通知，标签页ID无效: ${tabId}`);
    return false;
  }
  
  try {
    // 先检查内容脚本是否就绪
    console.log(`[AetherFlow-DEBUG] 发送通知前检查内容脚本: ID=${tabId}`);
    
    // 设置超时，防止检查卡住
    const checkPromise = isContentScriptReady(tabId);
    const timeoutPromise = new Promise<boolean>(resolve => {
      setTimeout(() => resolve(false), 1000);
    });
    
    // 使用Promise.race实现超时机制
    const isReady = await Promise.race([checkPromise, timeoutPromise]);
    
    if (!isReady) {
      console.warn(`[AetherFlow-DEBUG] 目标标签页内容脚本未就绪或检查超时，尝试强制注入: ID=${tabId}`);
      
      try {
        // 尝试通过executeScript强制注入通知函数
        return await forceShowNotification(tabId, message, type);
      } catch (injectError) {
        console.error(`[AetherFlow-DEBUG] 强制注入通知失败: ID=${tabId}`, injectError);
        return false;
      }
    }
    
    // 脚本就绪，发送通知
    console.log(`[AetherFlow-DEBUG] 内容脚本就绪，发送通知消息: ID=${tabId}`);
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        console.warn(`[AetherFlow-DEBUG] 发送通知消息超时: ID=${tabId}`);
        resolve(false);
      }, 2000); // 2秒超时
      
      chrome.tabs.sendMessage(
        tabId, 
        {
          type: 'SHOW_NOTIFICATION',
          data: {
            message: message,
            type: type
          }
        }, 
        response => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            console.warn(`[AetherFlow-DEBUG] 发送通知消息错误: ID=${tabId}, 错误=${chrome.runtime.lastError.message}`);
            resolve(false);
          } else {
            console.log(`[AetherFlow-DEBUG] 通知消息已发送, 响应:`, response);
            resolve(true);
          }
        }
      );
    });
  } catch (error) {
    console.error(`[AetherFlow-DEBUG] 发送通知时出错: ID=${tabId}`, error);
    return false;
  }
}

// 处理扩展消息
addMessageListener((message: Message, sender, sendResponse) => {
  console.log('[AetherFlow] 后台: 收到消息', message.type, message.payload || message.data);
  
  // 处理内容脚本就绪消息
  if (message.type === 'CONTENT_SCRIPT_READY') {
    // 记录标签页内容脚本就绪状态
    if (sender.tab && sender.tab.id) {
      contentScriptRegistry.set(sender.tab.id, true);
      console.log(`[AetherFlow] 内容脚本已就绪: 标签页ID ${sender.tab.id}, URL ${message.data?.url || '未知'}`);
      sendResponse({ success: true });
    }
    return true;
  }
  
  // 大部分消息已由setupPromptMessaging处理，这里只处理特殊消息
  try {
    if (message.type === 'LEGACY_SEARCH_PROMPTS') {
      // 兼容旧版消息格式
      const payload = message.payload as { keyword: string; limit?: number };
      
      // 转换为新的过滤器格式
      const filter: PromptFilter = {
        searchTerm: payload.keyword || '',
        limit: payload.limit || 10,
        sortBy: 'favorite'
      };
      
      // 使用统一存储服务搜索
      storageService.getAllPrompts()
        .then(allPrompts => {
          let results = [...allPrompts];
          
          // 关键词过滤
          if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            results = results.filter(prompt => 
              prompt.title.toLowerCase().includes(term) || 
              prompt.content.toLowerCase().includes(term) ||
              // 修正: 添加 tag 类型注解
              prompt.tags?.some((tag: string) => tag.toLowerCase().includes(term))
            );
          }
          
          // 排序：收藏优先，然后是使用次数
          results.sort((a, b) => {
            // 首先按收藏状态排序
            const aFavorite = a.isFavorite || a.favorite || false;
            const bFavorite = b.isFavorite || b.favorite || false;
            if (aFavorite !== bFavorite) {
              return aFavorite ? -1 : 1;
            }
            // 然后按使用频率排序
            return (b.useCount || 0) - (a.useCount || 0);
          });
          
          // 应用限制
          if (filter.limit) {
            results = results.slice(0, filter.limit);
          }
          
          console.log('[AetherFlow] 后台: 搜索结果', results.length, '条记录');
          
          // 返回结果
          sendResponse(results);
        })
        .catch(error => {
          console.error('[AetherFlow] 后台: 搜索提示词错误', error);
          sendResponse([]);
        });
      
      return true; // 异步响应
    } else if (message.type === 'ADD_CONTEXT_MENU_ITEM') {
      // 不需要额外处理，使用固定的菜单项
      sendResponse({ success: true });
      return true;
    } else if (message.type === 'CAPTURE_SELECTION_AS_PROMPT') {
      // 处理捕获选中文本
      const content = message.data?.content || '';
      
      if (!content) {
        sendResponse({ success: false, error: '选中内容为空' });
        return true;
      }
      
      captureSelectionAsPrompt(content)
        .then(success => {
          sendResponse({ success });
        })
        .catch(error => {
          console.error('[AetherFlow] 后台: 捕获提示词错误', error);
          sendResponse({ success: false, error: String(error) });
        });
      
      return true; // 异步响应
    } else {
      // 其他消息由统一消息服务处理
      return false;
    }
  } catch (error) {
    console.error('[AetherFlow] 后台: 处理消息错误', error);
    sendResponse(createErrorResponse(error as Error));
    return true;
  }
});

// 设置侧边栏行为，点击扩展图标时打开侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: Error) => {
  console.error('Failed to set sidebar behavior:', error);
});

// 初始化Firebase和云存储服务
async function initializeServices() {
  try {
    // 初始化Firebase
    initializeFirebase();
    console.log('[Background] Firebase初始化成功');
    
    // 检查是否应使用云存储
    const useCloudStorage = localStorage.getItem('USE_CLOUD_STORAGE') === 'true';
    console.log('[Background] 云存储设置状态:', useCloudStorage ? '已启用' : '未启用');
    
    if (useCloudStorage) {
      console.log('[Background] 启用云存储服务');
      // 确保云存储服务已初始化
      if (cloudStorageService.isAuthenticated()) {
        console.log('[Background] 用户已登录，准备同步数据');
        try {
          // 执行同步
          const stats = await cloudStorageService.syncAllPrompts();
          console.log('[Background] 同步完成:', stats);
        } catch (error) {
          console.error('[Background] 同步失败:', error);
        }
      } else {
        console.log('[Background] 用户未登录，云存储处于待命状态');
      }
    } else {
      console.log('[Background] 使用本地存储服务');
    }
    
    // 添加详细的认证状态日志
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    console.log('[Background] 当前认证状态:', user ? '已登录' : '未登录');
    if (user) {
      console.log('[Background] 登录用户:', user.email);
    }
  } catch (error) {
    console.error('[Background] 服务初始化失败:', error);
  }
}

// 在扩展启动时初始化服务
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] 扩展启动，初始化服务');
  initializeServices();
});

// 处理扩展安装或更新事件
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // 执行数据迁移
  try {
    console.log('Starting data migration...');
    const result = await migratePromptsData();
    if (result.migrated) {
      console.log(`Data migration successful, migrated ${result.count} prompts`);
    } else {
      console.log('无需进行数据迁移');
    }
  } catch (error) {
    console.error('数据迁移失败:', error);
  }
  
  // 根据安装原因执行不同操作
  if (details.reason === 'install') {
    // 新安装时，初始化示例数据
    await setupInitialData();
    // 打开欢迎页面
    chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    // 更新时执行数据迁移
    console.log('扩展已更新到新版本，正在检查数据...');
    // 初始化必要数据
    await setupInitialData();
  }
  
  // 初始化右键菜单
  setupContextMenu();
  
  // 初始化云存储服务
  initializeServices();
});

// 设置右键菜单
function setupContextMenu() {
  console.log('[AetherFlow] 设置右键菜单...');

  // 先清除所有已有菜单，避免重复
  chrome.contextMenus.removeAll(() => {
    // 创建菜单项
    chrome.contextMenus.create({
      id: 'aetherflow-capture-prompt',
      title: 'Aetherflow-Add to Library',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[AetherFlow] 创建右键菜单失败:', chrome.runtime.lastError);
      } else {
        console.log('[AetherFlow] 右键菜单创建成功');
      }
    });
  });

  // 监听菜单点击事件
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('[AetherFlow] 右键菜单被点击:', info.menuItemId);
    
    if (info.menuItemId === 'aetherflow-capture-prompt') {
      console.log('[AetherFlow] 处理收藏提示词请求');
      
      // 确保有选中的文本（仅做基本检查）
      if (!info.selectionText) {
        console.warn('[AetherFlow] 没有选中文本');
        return;
      }
      
      // 确保有有效的标签页
      if (!tab || !tab.id) {
        console.warn('[AetherFlow] 无有效标签页，无法处理请求');
        return;
      }
      
      console.log('[AetherFlow] Chrome API提供的选中文本预览:', 
        info.selectionText.substring(0, 50) + (info.selectionText.length > 50 ? '...' : ''));
      
      // 增加超时处理以防止无响应情况
      let hasResponded = false;
      const timeoutId = setTimeout(() => {
        if (!hasResponded) {
          console.warn('[AetherFlow] 获取选中文本请求超时，使用API提供的文本作为备选');
          handleCapturePrompt(info.selectionText || '', tab);
          hasResponded = true;
        }
      }, 1000); // 1秒超时
      
      // 尝试从内容脚本获取原始选中文本
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTED_TEXT' }, function(response) {
          // 清除超时定时器
          clearTimeout(timeoutId);
          
          // 如果已经通过超时处理过，不再处理
          if (hasResponded) return;
          hasResponded = true;
          
          if (chrome.runtime.lastError) {
            console.error('[AetherFlow] 获取选中文本失败:', chrome.runtime.lastError);
            
            // 检查内容脚本是否存活，如果不存活则尝试刷新
            if (tab.id && tab.id > 0) {
              checkContentScriptAndRecover(tab.id).then((recovered) => {
                if (recovered) {
                  // 如果恢复成功，使用Chrome API提供的文本（至少能保证功能）
                  console.log('[AetherFlow] 已恢复内容脚本，继续使用Chrome API提供的文本');
                  handleCapturePrompt(info.selectionText || '', tab);
                } else {
                  // 仍然使用API提供的文本，但显示错误通知
                  console.warn('[AetherFlow] 无法恢复内容脚本，使用备选方案');
                  handleCapturePrompt(info.selectionText || '', tab, true);
                }
              });
            } else {
              // 标签页ID无效，直接使用API提供的文本
              console.warn('[AetherFlow] 标签页ID无效，使用API提供的文本');
              handleCapturePrompt(info.selectionText || '', tab);
            }
            return;
          }
          
          // 使用内容脚本返回的原始文本
          if (response && response.text) {
            console.log('[AetherFlow] 从内容脚本获取到选中文本:', {
              长度: response.text.length,
              包含换行符: response.text.includes('\n'),
              行数: response.text.split('\n').length,
              前30字符: response.text.substring(0, 30).replace(/\n/g, '\\n')
            });
            handleCapturePrompt(response.text, tab);
          } else {
            console.warn('[AetherFlow] 内容脚本未返回选中文本，使用Chrome API提供的文本');
            handleCapturePrompt(info.selectionText || '', tab);
          }
        });
      } catch (error) {
        // 清除超时定时器
        clearTimeout(timeoutId);
        
        // 如果已经通过超时处理过，不再处理
        if (hasResponded) return;
        hasResponded = true;
        
        console.error('[AetherFlow] 获取选中文本时发生异常:', error);
        handleCapturePrompt(info.selectionText || '', tab);
      }
    }
  });
  
  // 检查内容脚本状态并尝试恢复
  async function checkContentScriptAndRecover(tabId: number): Promise<boolean> {
    console.log(`[AetherFlow] 检查内容脚本状态并尝试恢复, 标签页ID=${tabId}`);
    
    // 确保有效的标签页ID
    if (!tabId || tabId <= 0) {
      console.error(`[AetherFlow] 无效的标签页ID: ${tabId}`);
      return false;
    }
    
    // 重置内容脚本注册状态
    contentScriptRegistry.delete(tabId);
    
    // 尝试重新注入内容脚本（通过刷新扩展）
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // 在页面中添加一个标记，表示需要重新初始化
          window.dispatchEvent(new CustomEvent('aetherflow-reinitialize'));
          console.log('[AetherFlow-PAGE] 触发重新初始化事件');
          
          // 立即返回以避免阻塞
          return true;
        }
      });
      
      // 等待一段时间，让内容脚本有机会重新初始化
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 检查内容脚本是否已恢复
      const ready = await isContentScriptReady(tabId);
      console.log(`[AetherFlow] 内容脚本恢复结果: 标签页ID=${tabId}, 就绪=${ready}`);
      return ready;
    } catch (error) {
      console.error(`[AetherFlow] 尝试恢复内容脚本失败:`, error);
      return false;
    }
  }
  
  // 处理捕获选中文本为提示词
  async function handleCapturePrompt(content: string, tab: chrome.tabs.Tab, showConnectError = false): Promise<void> {
    try {
      console.log('[AetherFlow] 开始处理捕获提示词，文本长度:', content.length);
      
      // 捕获选中文本为提示词
      const result = await captureSelectionAsPrompt(content);
      console.log('[AetherFlow] 提示词保存结果:', result);
      
      // 显示通知
      if (tab.id) {
        // 如果有连接错误，同时显示
        let message = result ? 'Prompt has been added to library' : 'Failed to save prompt';
        const type = result ? 'success' : 'error';
        
        if (showConnectError) {
          message += ' (Warning: Extension connection issue detected)';
        }
        
        try {
          console.log('[AetherFlow] 发送通知:', message, '类型:', type);
          const notified = await safelySendNotification(tab.id, message, type);
          
          // 如果通知发送失败，尝试使用替代方法
          if (!notified) {
            console.warn('[AetherFlow] 常规通知失败，尝试使用强制注入');
            await forceShowNotification(tab.id, message, type);
          }
        } catch (notifyError) {
          console.error('[AetherFlow] 通知发送失败:', notifyError);
          // 尝试强制注入通知
          await forceShowNotification(tab.id, message, type);
        }
        
        // 手动广播提示词更新消息
        try {
          chrome.runtime.sendMessage({ 
            type: 'PROMPT_UPDATED',
            from: 'context_menu'
          });
          console.log('[AetherFlow] 已发送PROMPT_UPDATED消息通知UI更新');
        } catch (notifyError) {
          console.warn('[AetherFlow] 发送PROMPT_UPDATED消息失败:', notifyError);
        }
      }
    } catch (error: any) {
      console.error('[AetherFlow] 保存提示词出错:', error);
      
      // 发送错误通知
      if (tab.id) {
        const errorMessage = 'Failed to save prompt: ' + (error.message || 'Unknown error');
        try {
          await safelySendNotification(tab.id, errorMessage, 'error');
        } catch (notifyError) {
          console.error('[AetherFlow] 错误通知发送失败:', notifyError);
          await forceShowNotification(tab.id, errorMessage, 'error');
        }
      }
    }
  }
}

// 将选中文本保存为提示词
async function captureSelectionAsPrompt(content: string): Promise<boolean> {
  try {
    // 记录更详细的日志，包括换行符信息
    console.log('[AetherFlow] 处理选中内容，准备保存为提示词:', {
      长度: content.length,
      包含换行符: content.includes('\n'),
      行数: content.split('\n').length,
      前30字符: content.substring(0, 30).replace(/\n/g, '\\n') // 仅用于日志显示
    });
    
    // 检查内容是否为空(使用trim来判断是否为空，但保留原始内容以保持格式)
    if (!content || content.trim().length === 0) {
      console.warn('[AetherFlow] 内容为空或仅包含空白字符，不保存');
      return false;
    }
    
    console.log('[AetherFlow] 准备创建新提示词，保留原始格式...');
    
    // 提前创建提示词对象进行检查
    const promptData = {
      content, // 保持原始内容，不做处理以保留换行符
      isFavorite: true,
      favorite: true, // 兼容旧版
      source: 'user' as 'user' // 显式类型转换为'user'类型
    };
    
    // 为了避免日志中输出过多内容，只记录内容的摘要信息
    console.log('[AetherFlow] 创建提示词输入数据:', {
      contentLength: content.length,
      contentSample: content.substring(0, 50).replace(/\n/g, '\\n') + (content.length > 50 ? '...' : ''),
      isFavorite: true,
      source: 'user'
    });
    
    // 使用服务层创建提示词，自动处理标题生成
    const newPrompt = await createPrompt(promptData);
    
    console.log('[AetherFlow] 提示词创建成功:', {
      id: newPrompt.id,
      title: newPrompt.title,
      contentLength: newPrompt.content.length,
      contentHasNewlines: newPrompt.content.includes('\n'),
      lineCount: newPrompt.content.split('\n').length,
      isFavorite: newPrompt.isFavorite
    });
    
    // 再次手动广播提示词更新消息，确保UI更新
    try {
      chrome.runtime.sendMessage({ 
        type: 'PROMPT_UPDATED',
        from: 'capture_prompt',
        promptId: newPrompt.id
      });
      console.log('[AetherFlow] 已再次广播PROMPT_UPDATED消息通知UI更新');
    } catch (notifyError) {
      console.warn('[AetherFlow] 广播PROMPT_UPDATED消息失败:', notifyError);
    }
    
    return true;
  } catch (error) {
    console.error('[AetherFlow] 保存提示词失败:', error);
    
    // 记录详细错误信息
    if (error instanceof Error) {
      console.error('[AetherFlow] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return false;
  }
}

// 处理暂存的捕获请求
async function processPendingCaptures() {
  try {
    console.log('[AetherFlow] 检查暂存的捕获请求...');
    
    // 获取所有存储的键
    const data = await chrome.storage.local.get(null);
    
    // 找出所有暂存的捕获请求
    const pendingKeys = Object.keys(data).filter(key => 
      key.startsWith('temp_capture_') && 
      data[key] && 
      data[key].pendingCapture === true
    );
    
    if (pendingKeys.length === 0) {
      return; // 没有暂存的请求
    }
    
    console.log(`[AetherFlow] 发现${pendingKeys.length}个暂存的捕获请求，开始处理...`);
    
    // 处理每个暂存的请求
    for (const key of pendingKeys) {
      const captureData = data[key];
      
      // 提取内容
      const content = captureData.content;
      
      if (!content || typeof content !== 'string' || content.trim() === '') {
        console.warn(`[AetherFlow] 暂存捕获请求 ${key} 内容为空，跳过`);
        // 删除无效的暂存请求
        chrome.storage.local.remove(key);
        continue;
      }
      
      console.log(`[AetherFlow] 处理暂存的捕获请求 ${key}，内容长度: ${content.length}`);
      
      try {
        // 尝试保存提示词
        const result = await captureSelectionAsPrompt(content);
        
        if (result) {
          console.log(`[AetherFlow] 成功处理暂存的捕获请求 ${key}`);
          
          // 尝试向用户发送通知
          try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs && tabs[0] && tabs[0].id) {
                safelySendNotification(
                  tabs[0].id, 
                  'Pending prompt has been saved to library', 
                  'success'
                );
              }
            });
          } catch (notifyError) {
            console.warn('[AetherFlow] 发送通知失败:', notifyError);
          }
        } else {
          console.warn(`[AetherFlow] 处理暂存的捕获请求 ${key} 失败`);
        }
      } catch (error) {
        console.error(`[AetherFlow] 处理暂存的捕获请求 ${key} 出错:`, error);
        // 保留失败的请求，下次再试
        continue;
      }
      
      // 处理完成后删除暂存的请求
      chrome.storage.local.remove(key);
    }
  } catch (error) {
    console.error('[AetherFlow] 处理暂存的捕获请求时出错:', error);
  }
}

// 处理来自官网的支付成功消息
chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    console.log('[AetherFlow] 收到外部消息:', message, '来源:', sender.url);
    
    // 验证消息来源（只接受来自官网的消息）
    if (!sender.url || 
        !(sender.url.startsWith('https://aetherflow-app.com') || 
          sender.url.startsWith('https://aetherflow-app.github.io'))) {
      console.error('[AetherFlow] 拒绝来自非官网的消息:', sender.url);
      sendResponse({ success: false, error: '未授权的消息来源' });
      return;
    }
    
    // 处理支付成功消息
    if (message && message.type === 'PAYMENT_SUCCESS') {
      try {
        // 验证当前用户认证状态
        const currentUser = await authService.getCurrentUser();
        
        if (!currentUser) {
          console.error('[AetherFlow] 支付成功处理失败: 用户未登录');
          sendResponse({ 
            success: false, 
            error: 'USER_NOT_AUTHENTICATED',
            message: '用户未登录，无法更新会员状态' 
          });
          return;
        }
        
        console.log('[AetherFlow] 已认证用户:', currentUser.displayName || currentUser.email);
        
        // 处理支付信息
        const { checkoutId, planType, environment } = message;
        
        // 验证是否为沙盒环境
        const isSandbox = environment === 'sandbox' || environment === 'test';
        console.log('[AetherFlow] 支付环境:', isSandbox ? '沙盒' : '生产');
        
        // 处理支付成功
        const result = await handlePaymentSuccess({
          checkoutId,
          planType,
          isSandbox,
          userId: currentUser.uid
        });
        
        if (result) {
          sendResponse({ 
            success: true, 
            message: '会员状态已更新',
            user: { uid: currentUser.uid } 
          });
        } else {
          sendResponse({ 
            success: false, 
            error: 'PAYMENT_PROCESSING_FAILED',
            message: '处理支付信息失败' 
          });
        }
      } catch (error: any) {
        console.error('[AetherFlow] 处理支付成功消息时出错:', error);
        sendResponse({ 
          success: false, 
          error: 'UNKNOWN_ERROR',
          message: error.message || '未知错误' 
        });
      }
      
      return true; // 异步响应
    }
    
    // 不处理其他类型的消息
    sendResponse({ success: false, error: 'UNSUPPORTED_MESSAGE_TYPE' });
    return false;
  }
);

// 支付成功处理函数
async function handlePaymentSuccess(data: any): Promise<boolean> {
  try {
    console.log('[AetherFlow] 处理支付成功:', data);
    
    // 获取计划类型和检查ID
    const planType = data.planType || 'monthly';
    const checkoutId = data.checkoutId || '';
    const isSandbox = !!data.isSandbox;
    const userId = data.userId; // 如果来自外部消息处理，会有这个字段
    
    if (!checkoutId) {
      console.error('[AetherFlow] 支付数据不完整，缺少checkoutId');
      return false;
    }
    
    // 计算到期时间
    const now = Date.now();
    const monthInMs = 30 * 24 * 60 * 60 * 1000; // 30天
    const yearInMs = 365 * 24 * 60 * 60 * 1000; // 365天
    
    const expiresAt = planType === 'annual' 
      ? now + yearInMs
      : now + monthInMs;
    
    // 如果是沙盒环境,使用测试用户ID和较短的过期时间
    if (isSandbox) {
      console.log('[AetherFlow] 沙盒环境支付，使用测试配置');
      // 在开发/测试环境使用_devSetProMembership方法
      await membershipService._devSetProMembership();
      
      // 广播会员状态更新消息
      chrome.runtime.sendMessage({ type: 'MEMBERSHIP_STATUS_UPDATED' });
      return true;
    }
    
    // 生产环境,更新真实会员状态
    await membershipService.handleSuccessfulPayment({
      subscriptionId: checkoutId,
      customerId: userId || `cus_${Date.now()}`, // 使用用户ID或生成临时ID
      plan: planType === 'annual' ? 'annual' : 'monthly',
      expiresAt
    });
    
    // 广播会员状态更新消息
    chrome.runtime.sendMessage({ type: 'MEMBERSHIP_STATUS_UPDATED' });
    
    console.log('[AetherFlow] 支付成功处理完成，会员状态已更新');
    return true;
  } catch (error) {
    console.error('[AetherFlow] 处理支付失败:', error);
    throw error;
  }
}

// 检查localStorage中是否有支付成功标记
chrome.runtime.onStartup.addListener(() => {
  try {
    const paymentSuccess = localStorage.getItem('aetherflow_payment_success');
    if (paymentSuccess === 'true') {
      const checkoutId = localStorage.getItem('aetherflow_checkout_id') || '';
      const planType = localStorage.getItem('aetherflow_plan_type') || 'monthly';
      
      console.log('[AetherFlow] 检测到本地存储的支付成功标记，处理支付:', { checkoutId, planType });
      
      // 处理支付成功
      handlePaymentSuccess({ checkoutId, planType })
        .then(() => {
          // 清除本地标记
          localStorage.removeItem('aetherflow_payment_success');
          localStorage.removeItem('aetherflow_checkout_id');
          localStorage.removeItem('aetherflow_plan_type');
          
          console.log('[AetherFlow] 本地存储的支付成功已处理');
        })
        .catch(error => {
          console.error('[AetherFlow] 处理本地存储的支付失败:', error);
        });
    }
  } catch (error) {
    console.error('[AetherFlow] 检查本地支付标记失败:', error);
  }
});
