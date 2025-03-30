import { addMessageListener, createSuccessResponse, createErrorResponse } from '../services/messaging';
import { Message } from '../services/messaging/types';
import { STORAGE_KEYS, storageService } from '../services/storage';
import { setupPromptMessaging } from '../services/prompt/messaging';
import { Prompt, PromptFilter } from '../services/prompt/types';
import { createPrompt } from '../services/prompt';
import { initializeSampleData } from './sampleData';
import { initPromptMessaging } from '../services/prompt/messaging';
import { migratePromptsData } from '../services/storage';

console.log('[AetherFlow] 后台脚本加载成功');

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
    const isReady = await isContentScriptReady(tabId);
    
    if (!isReady) {
      console.warn(`[AetherFlow-DEBUG] 目标标签页内容脚本未就绪，尝试强制注入: ID=${tabId}`);
      
      try {
        // 尝试通过executeScript强制注入通知函数
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: (message: string, type: string) => {
            console.log('[AetherFlow-INJECT] 执行注入的通知函数');
            
            // 简化版通知函数
            function showInjectedNotification(msg: string, typ: string) {
              console.log('[AetherFlow-INJECT] 显示注入的通知:', msg, typ);
              
              // 移除已有的通知
              const existingNotification = document.getElementById('aetherflow-notification');
              if (existingNotification) {
                document.body.removeChild(existingNotification);
              }
              
              // 创建通知容器
              const notification = document.createElement('div');
              notification.id = 'aetherflow-notification';
              notification.textContent = msg;
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
              
              // 设置样式
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
              
              // 2秒后淡出
              setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(20px)';
                
                // 动画结束后移除元素
                setTimeout(() => {
                  if (notification.parentNode) {
                    document.body.removeChild(notification);
                  }
                }, 300);
              }, 2000);
              
              return true;
            }
            
            return showInjectedNotification(message, type);
          },
          args: [message, type]
        });
        
        console.log(`[AetherFlow-DEBUG] 强制注入通知执行结果:`, result);
        return result[0]?.result === true;
      } catch (injectError) {
        console.error(`[AetherFlow-DEBUG] 强制注入通知失败: ID=${tabId}`, injectError);
        return false;
      }
    }
    
    // 脚本就绪，发送通知
    console.log(`[AetherFlow-DEBUG] 内容脚本就绪，发送通知消息: ID=${tabId}`);
    return new Promise(resolve => {
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
          // 在内存中过滤
          let results = [...allPrompts];
          
          // 关键词过滤
          if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            results = results.filter(prompt => 
              prompt.title.toLowerCase().includes(term) || 
              prompt.content.toLowerCase().includes(term) ||
              prompt.tags?.some(tag => tag.toLowerCase().includes(term))
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
  console.error('设置侧边栏行为失败:', error);
});

// 处理扩展安装或更新事件
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('扩展已安装/更新:', details.reason);
  
  // 执行数据迁移
  try {
    console.log('开始执行数据迁移...');
    const result = await migratePromptsData();
    if (result.migrated) {
      console.log(`数据迁移成功，共迁移${result.count}条提示词`);
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
});

// 设置右键菜单
function setupContextMenu() {
  console.log('[AetherFlow] 设置右键菜单...');

  // 先清除所有已有菜单，避免重复
  chrome.contextMenus.removeAll(() => {
    // 创建菜单项
    chrome.contextMenus.create({
      id: 'aetherflow-capture-prompt',
      title: 'Aetherflow-收藏提示词',
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
      
      // 确保有选中的文本
      if (!info.selectionText) {
        console.warn('[AetherFlow] 没有选中文本');
        return;
      }
      
      // 确保有有效的标签页
      if (!tab || !tab.id) {
        console.warn('[AetherFlow] 无有效标签页，无法处理请求');
        return;
      }
      
      console.log('[AetherFlow] 选中文本:', info.selectionText.substring(0, 50) + (info.selectionText.length > 50 ? '...' : ''));
      
      // 捕获选中文本为提示词
      captureSelectionAsPrompt(info.selectionText)
        .then(async result => {
          console.log('[AetherFlow] 提示词保存结果:', result);
          
          // 使用安全发送通知方法
          if (tab.id) {
            const message = result ? '提示词已成功添加到收藏夹' : '保存提示词失败';
            const type = result ? 'success' : 'error';
            await safelySendNotification(tab.id, message, type);
          }
        })
        .catch(async error => {
          console.error('[AetherFlow] 保存提示词出错:', error);
          
          // 发送错误通知
          if (tab.id) {
            const errorMessage = '保存提示词失败: ' + (error.message || '未知错误');
            await safelySendNotification(tab.id, errorMessage, 'error');
          }
        });
    }
  });
}

// 将选中文本保存为提示词
async function captureSelectionAsPrompt(content: string): Promise<boolean> {
  try {
    console.log('[AetherFlow] 处理选中内容，准备保存为提示词，长度:', content.length);
    
    // 检查内容是否为空
    if (!content || content.trim().length === 0) {
      console.warn('[AetherFlow] 内容为空，不保存');
      return false;
    }
    
    console.log('[AetherFlow] 准备创建新提示词...');
    
    // 使用服务层创建提示词，自动处理标题生成
    const newPrompt = await createPrompt({
      content,
      isFavorite: true,
      favorite: true, // 兼容旧版
      source: 'user'
    });
    
    console.log('[AetherFlow] 提示词保存成功:', newPrompt.id, '标题:', newPrompt.title);
    return true;
  } catch (error) {
    console.error('[AetherFlow] 保存提示词失败:', error);
    return false;
  }
}
