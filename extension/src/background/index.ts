import { addMessageListener, createSuccessResponse, createErrorResponse } from '../services/messaging';
import { Message } from '../services/messaging/types';
import { STORAGE_KEYS, storageService } from '../services/storage';
import { setupPromptMessaging } from '../services/prompt/messaging';
import { Prompt, PromptFilter, CreatePromptInput } from '../services/prompt/types';
import { createPrompt } from '../services/prompt';
import { initializeSampleData } from './sampleData';
import { migratePromptsData } from '../services/storage';
import { initializeFirebase } from '../services/auth/firebase';
import { cloudStorageService } from '../services/storage/cloudStorage';
import { getFirebaseAuth, mapFirebaseUser } from '../services/auth/firebase';
import { membershipService } from '../services/membership';
import { authService } from '../services/auth';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth/web-extension';
import { safeLocalStorage, isServiceWorkerEnvironment } from '../utils/safeEnvironment';
import { generateTitleForPrompt } from '../services/prompt/actions';

console.log('[AetherFlow] 后台脚本加载成功');

// 监听扩展图标点击事件，打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[AetherFlow] 扩展图标被点击');
  await openSidePanelForTab(tab);
});

// 监听来自 content script 请求打开侧边栏的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle OPEN_SIDEBAR message
  if (message.type === 'OPEN_SIDEBAR') {
    console.log('[AetherFlow] 收到来自 content script 的 OPEN_SIDEBAR 请求');
    if (sender.tab) {
        openSidePanelForTab(sender.tab).then(() => {
            sendResponse({ success: true, message: 'Sidebar opened or focused.' });
        }).catch((error: Error) => {
            console.error('[AetherFlow] 处理 OPEN_SIDEBAR 消息时出错:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Indicates asynchronous response
    } else {
        console.error('[AetherFlow] OPEN_SIDEBAR 请求缺少发送者标签页信息');
        sendResponse({ success: false, error: 'Sender tab information missing.' });
    }
  }
  
  // Handle SAVE_PROMPT_CAPTURE message
  if (message.type === 'SAVE_PROMPT_CAPTURE') {
      console.log('[AetherFlow] 收到 SAVE_PROMPT_CAPTURE 请求:', message.payload);
      const payload = message.payload as { title: string; content: string };
      if (payload && payload.title && payload.content) {
           // Use existing createPrompt or equivalent function directly
           const promptData: CreatePromptInput = {
             title: payload.title,
             content: payload.content,
             isFavorite: true, // Default captured prompts to favorite?
             source: 'user'
           };
          createPrompt(promptData)
              .then(savedPrompt => { // Type inferred or use explicit Prompt type if available
                  console.log('[AetherFlow] 提示词保存成功:', savedPrompt);
                  // 发送提示词更新消息给 SidePanel (如果 SidePanel 打开)
                  chrome.runtime.sendMessage({ type: 'PROMPT_UPDATED' }); 
                  sendResponse({ success: true, data: savedPrompt });
              })
              .catch((error: Error) => { // Added type Error
                  console.error('[AetherFlow] 保存提示词时出错:', error);
                  sendResponse({ success: false, error: error.message });
              });
      } else {
           console.error('[AetherFlow] 无效的剪藏保存请求 payload:', payload);
           sendResponse({ success: false, error: 'Invalid payload for SAVE_PROMPT_CAPTURE' });
      }
      return true; // Indicates asynchronous response
  }

  // Handle GENERATE_TITLE message
  if (message.type === 'GENERATE_TITLE') {
      console.log('[AetherFlow] 收到 GENERATE_TITLE 请求，内容长度:', message.payload?.content?.length);
      if (sender.tab && sender.tab.id && message.payload && message.payload.content) {
          const tabId = sender.tab.id;
          const content = message.payload.content;
          
          generateTitleForPrompt(content)
              .then(generatedTitle => {
                  console.log('[AetherFlow] 标题生成成功:', generatedTitle);
                  // Send the generated title back to the content script
                  chrome.tabs.sendMessage(tabId, {
                      type: 'TITLE_GENERATED',
                      payload: { title: generatedTitle }
                  }).catch(error => {
                      console.error(`[AetherFlow] 发送 TITLE_GENERATED 消息到 Tab ${tabId} 失败:`, error);
                  });
                  sendResponse({ success: true }); // Acknowledge the request was processed
              })
              .catch(error => {
                  console.error('[AetherFlow] 调用 generateTitleForPrompt 时出错:', error);
                  // Inform the content script about the failure?
                  // For now, just send error response to original sender if possible
                  sendResponse({ success: false, error: 'Title generation failed' });
              });
          
          return true; // Indicates asynchronous response
      } else {
          console.error('[AetherFlow] 无效的 GENERATE_TITLE 请求:', message, sender);
          sendResponse({ success: false, error: 'Invalid payload or sender tab info' });
      }
  }

  // Handle other messages... (Keep other existing listeners, e.g., from setupMessaging)
  // Return false or nothing for synchronous messages or unhandled messages
  return false;
});

/**
 * Helper function to open the side panel for a given tab.
 * @param tab The tab to open the side panel for.
 */
async function openSidePanelForTab(tab: chrome.tabs.Tab) {
    if (!tab || !tab.windowId) {
        console.error('[AetherFlow] 无法打开侧边栏：缺少标签页或窗口ID');
        throw new Error('Missing tab or window ID.');
    }
    try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        console.log(`[AetherFlow] 侧边栏已在窗口 ${tab.windowId} 中打开或聚焦`);
    } catch (error) {
        console.error(`[AetherFlow] 在窗口 ${tab.windowId} 中打开侧边栏时出错:`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

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
addMessageListener(async (message: Message, sender, sendResponse) => {
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
  
  // --- 新增：处理 Google 登录请求 ---
  else if (message.type === 'LOGIN_WITH_GOOGLE') {
    console.log('[Background] 收到 LOGIN_WITH_GOOGLE 请求');
    try {
      // 使用 chrome.identity API 进行 Google 登录
      console.log('[Background] 使用 chrome.identity API 开始 Google 认证流程...');
      
      // 替换成你的 Firebase 项目配置中的 OAuth 客户端 ID
      const clientId = '423266303314-7f3n7s17c70o1vptv3ahnl78g7b5dchd.apps.googleusercontent.com';
      
      // 指定所需的权限范围 (scope)
      const scopes = [
        'profile',
        'email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ];
      
      // 构建认证 URL 和参数
      const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('response_type', 'token');
      const redirectUri = chrome.identity.getRedirectURL();
      console.log('[Background] Generated Redirect URI:', redirectUri);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', scopes.join(' '));
      
      // 发起 OAuth 认证请求
      chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
      }, async (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error('[Background] 认证出错:', chrome.runtime.lastError);
          sendResponse({
            success: false,
            error: {
              code: 'auth/identity-error',
              message: chrome.runtime.lastError.message || '认证流程出错'
            }
          });
          return;
        }
        
        if (!responseUrl) {
          console.error('[Background] 认证过程被取消或返回了空URL');
          sendResponse({
            success: false,
            error: {
              code: 'auth/cancelled',
              message: '认证过程被取消或未能完成'
            }
          });
          return;
        }
        
        try {
          console.log('[Background] 成功获取认证响应');
          
          // 从重定向 URL 中提取访问令牌
          const url = new URL(responseUrl);
          const params = new URLSearchParams(url.hash.substring(1)); // 去掉 "#" 符号
          const accessToken = params.get('access_token');
          
          if (!accessToken) {
            throw new Error('未能从响应 URL 中获取访问令牌');
          }
          
          console.log('[Background] 成功获取访问令牌');
          
          // 使用访问令牌创建 Firebase 凭据
          const credential = GoogleAuthProvider.credential(null, accessToken);
          
          // 使用凭据在 Firebase 中登录
          console.log('[Background] 使用获取的令牌登录 Firebase...');
          const auth = getFirebaseAuth();
          const userCredential = await signInWithCredential(auth, credential);
          
          console.log('[Background] Firebase 登录成功');
          
          // 映射用户对象并返回
          const appUser = mapFirebaseUser(userCredential.user);
          sendResponse({ success: true, user: appUser });
          console.log('[Background] 已将用户信息发送到 Sidepanel');
          
        } catch (error: any) {
          console.error('[Background] 处理认证响应时出错:', error);
          sendResponse({
            success: false,
            error: {
              code: error.code || 'auth/unknown',
              message: error.message || '处理认证响应时出现未知错误'
            }
          });
        }
      });
      
    } catch (error: any) {
      console.error('[Background] 启动认证流程时出错:', error);
      sendResponse({
        success: false,
        error: {
          code: error.code || 'auth/unknown',
          message: error.message || '启动认证流程时出现未知错误'
        }
      });
    }
    
    return true; // 表明将异步响应
  }
  // --- End Google 登录请求处理 ---

  // 其他消息处理
  else {
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
    
    // 检查是否应使用云存储 - 使用 safeLocalStorage
    const useCloudStorageSetting = safeLocalStorage.getItem('USE_CLOUD_STORAGE');
    const useCloudStorage = useCloudStorageSetting === 'true';
    console.log('[Background] 云存储设置状态:', useCloudStorage ? '已启用' : '未启用');
    
    if (!isServiceWorkerEnvironment && useCloudStorage) {
      // 只有在非SW环境且启用云存储时才执行相关逻辑
      console.log('[Background] 启用云存储服务 (非SW环境)');
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
    } else if (isServiceWorkerEnvironment) {
      console.log('[Background] 在Service Worker中，跳过云存储初始化检查。');
    } else {
       console.log('[Background] 使用本地存储服务 (或云存储未启用)');
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

// --- 上下文菜单相关 --- 

/**
 * 设置上下文菜单
 */
function setupContextMenu() {
  chrome.contextMenus.remove('captureSelection', () => {
    // Ignore errors, might not exist on first run
    chrome.contextMenus.create({
      id: 'captureSelection',
      title: 'AetherFlow: Capture selection', 
      contexts: ['selection']
    });
    if (chrome.runtime.lastError) {
      console.warn("Context menu setup error (might be due to reload):", chrome.runtime.lastError.message);
    }
  });
}

/**
 * 处理上下文菜单点击事件
 * 现在发送消息给内容脚本以打开预览窗口，而不是直接保存。
 */
function onContextMenuClicked(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  // Check if the necessary info is present
  if (info.menuItemId === 'captureSelection' && info.selectionText && tab?.id) {
    const tabId = tab.id;
    const content = info.selectionText;
    console.log(`[AetherFlow] Context Menu: Requesting preview modal for selection from Tab ${tabId}`, content.substring(0, 50) + '...');

    // Send message to content script to show the preview modal
    chrome.tabs.sendMessage(
        tabId,
        {
            type: 'SHOW_CAPTURE_MODAL_FROM_CONTEXT',
            payload: { content: content }
        },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(`[AetherFlow] Error sending SHOW_CAPTURE_MODAL message to Tab ${tabId}:`, chrome.runtime.lastError.message);
                // Fallback or error notification if needed?
                // Maybe try direct save as a fallback?
                // For now, just log the error.
                safelySendNotification(tabId, 'Could not open AetherFlow capture window.', 'error');
            } else {
                console.log(`[AetherFlow] SHOW_CAPTURE_MODAL message sent successfully to Tab ${tabId}, response:`, response);
            }
        }
    );

    // Remove the direct save logic
    /*
    const promptData: CreatePromptInput = {
        content: content,
        isFavorite: true, // Default favorite from context menu
        source: 'user' // Source from context menu is user
    };
    createPrompt(promptData)
        .then(newPrompt => { ... })
        .catch(error => { ... });
    */
  } else {
      console.warn("[AetherFlow] Context menu click ignored: Missing selectionText or tab ID.");
  }
}

// Register the context menu listener (ensure this is the only listener registered)
chrome.contextMenus.onClicked.addListener(onContextMenuClicked);

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
