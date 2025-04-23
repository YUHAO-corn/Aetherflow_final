import { initializeContextMenus, updateContextMenus } from './contextMenus';
import { handleMigration } from './migration';
import { initializeOptions } from './options';
// Import the optimization service function
import { optimizePrompt } from '../services/optimizationService';

// Define message types (consider moving to a shared types file)
// ... (keep existing type definitions)

// --- OnInstalled Listener ---
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[background] onInstalled event triggered:', details.reason);
  
  // Initialize context menus
  await initializeContextMenus();

  // Initialize options with default values if not set
  await initializeOptions();

  // Handle data migration if needed
  await handleMigration();
  
  // Store Doubao API Key on first install or update (FOR TESTING ONLY - INSECURE)
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      // **************************************************************************
      // ** WARNING: FOR LOCAL TESTING ONLY - DO NOT COMMIT/PUBLISH WITH REAL KEY **
      // ** Replace 'YOUR_DOUBAO_API_KEY_HERE' with your actual Doubao API Key    **
      // ** ONLY in your local development environment for testing purposes.        **
      // ** This key will be visible if the extension source is inspected.        **
      // ** A backend proxy is REQUIRED for a secure production deployment.       **
      // **************************************************************************
      const apiKeyToStore = 'YOUR_DOUBAO_API_KEY_HERE'; // <<< REPLACE LOCALLY FOR TESTING!
      
      await chrome.storage.local.set({ doubaoApiKey: apiKeyToStore });
      console.log('[background] Doubao API Key placeholder stored/updated for testing.');
    } catch (error) {
      console.error('[background] Failed to store Doubao API Key for testing:', error);
    }
  }
});

// --- Message Listener ---
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  console.log('[background] Received message:', message.type, 'from', sender.tab?.id);
  
  const { type, data } = message;

  // Handle OPTIMIZE_SELECTION using the optimization service
  if (type === 'OPTIMIZE_SELECTION') {
    (async () => {
      try {
        // Call the centralized optimization service
        const optimizedContent = await optimizePrompt(data.content, 'concise'); // Use concise mode for toolbar
        console.log('[background] Sending optimization result for selection.');
        sendResponse({ success: true, data: optimizedContent });
      } catch (error: any) {
        console.error('[background] Error optimizing selection:', error);
        // Send a more user-friendly error message back
        let errorMessage = '优化失败，请稍后重试';
        // Updated error messages for testing setup
        if (error.message === 'API Key not configured' || error.message === 'Failed to read API Key') {
          errorMessage = 'API 密钥未找到或安装失败'; // More relevant for auto-install approach
        } else if (error.message) {
             // Keep the logic for handling specific API errors from the service
             const knownErrors = [
                 '请求参数错误',
                 'API密钥无效或已过期', 
                 '请求被拒绝，无权访问',
                 'API端点不存在',
                 'API请求超出限制，请稍后重试',
                 '豆包服务器错误，请稍后重试'
             ];
             if (knownErrors.includes(error.message)) {
                 errorMessage = error.message;
             } else {
                 errorMessage = `优化失败：${error.message}`;
             }
        }
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true; // Indicate asynchronous response
  }

  // --- Other message handlers --- 

  // Example: Handle getting options
  if (type === 'GET_OPTIONS') {
      (async () => {
          try {
              const options = await chrome.storage.sync.get(null); // Get all options
              sendResponse({ success: true, data: options });
          } catch (error) {
              console.error('[background] Error getting options:', error);
              sendResponse({ success: false, error: '无法获取设置' });
          }
      })();
      return true; // Indicate asynchronous response
  }

  // Example: Handle setting options
  if (type === 'SET_OPTIONS') {
      (async () => {
          try {
              await chrome.storage.sync.set(data);
              // After setting options, update context menus if necessary
              await updateContextMenus(); 
              sendResponse({ success: true });
          } catch (error) {
              console.error('[background] Error setting options:', error);
              sendResponse({ success: false, error: '无法保存设置' });
          }
      })();
      return true; // Indicate asynchronous response
  }
  
  // Example: Handle getting API Key status (for options page maybe)
  if (type === 'GET_API_KEY_STATUS') {
      (async () => {
          try {
              const result = await chrome.storage.local.get('doubaoApiKey');
              const isConfigured = !!(result && result.doubaoApiKey && result.doubaoApiKey !== 'YOUR_DOUBAO_API_KEY_HERE');
              sendResponse({ success: true, data: { isConfigured } });
          } catch (error) {
              console.error('[background] Error checking API key status:', error);
              sendResponse({ success: false, error: '无法检查 API 密钥状态' });
          }
      })();
      return true; // Indicate asynchronous response
  }

  // Fallback for unhandled messages
  console.log('[background] Unhandled message type:', type);
  // Optionally send a response for unhandled types
  // sendResponse({ success: false, error: 'Unknown message type' }); 
  return false; // No async response intended for unhandled types by default
});

// --- Context Menu Click Listener ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[background] Context menu clicked:', info.menuItemId);
  if (tab && tab.id) {
    // Forward context menu clicks to the content script of the active tab
    chrome.tabs.sendMessage(tab.id, {
      type: 'CONTEXT_MENU_CLICKED',
      data: {
        menuItemId: info.menuItemId,
        selectionText: info.selectionText,
        pageUrl: info.pageUrl,
        linkUrl: info.linkUrl,
        mediaType: info.mediaType,
        srcUrl: info.srcUrl
      }
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn('[background] Error sending context menu click to content script:', chrome.runtime.lastError.message);
            // Might happen if the content script isn't ready or injected
        }
    });
  } else {
    console.warn('[background] Context menu clicked without a valid tab ID.');
  }
});

console.log('[background] Service worker started.'); 