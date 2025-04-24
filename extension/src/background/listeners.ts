// extension/src/background/listeners.ts

// --- Import dependencies from other modules ---
// Use path alias '@' to resolve potential Linter issue
import { openSidePanelForTab } from '@/background/sidepanelManager';
// Import necessary prompt handlers
import { 
  captureSelectionAsPrompt, 
  handleSavePromptCapture, 
  searchPrompts 
} from '@/background/promptHandler'; // Also use alias here for consistency
import { handleLoginWithGoogle, handleCheckAuthState, handleLogout } from '@/background/authHandler'; // Use alias
import { markContentScriptReady } from '@/background/contentScriptManager'; // Use alias
import { handleOptimizeSelection, handleOptimizeModalContent } from '@/background/optimizationHandler'; // Add handleOptimizeModalContent
// Import the new AI feature handler
import { handleGenerateTitle } from '@/background/aiFeaturesHandler'; // Use alias
import { createErrorResponse } from '@/services/messaging'; // Use alias
import { Message } from '@/services/messaging/types'; // Use alias
// Remove unused imports if any after refactoring
// import { PromptFilter, CreatePromptInput } from '../services/prompt/types';
// import { storageService } from '../services/storage';

// --- Removed Placeholder Handler Functions ---
// handleSavePromptCapture was removed
// handleGenerateTitle REMOVED
// handleLegacySearchPrompts was removed

// Handle prompt update broadcast
function handlePromptUpdatedBroadcast() {
    console.log('[Listeners] Broadcasting PROMPT_UPDATED to all tabs.');
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'PROMPT_UPDATED', from: 'background' })
                    .catch(error => console.debug(`[Listeners] Failed to send PROMPT_UPDATED to tab ${tab.id}:`, error.message));
            }
        });
    });
}

// Handle HEARTBEAT
function handleHeartbeat(payload: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    // Respond immediately to keep alive
    sendResponse({ alive: true, count: payload?.count });
}


// --- Unified Message Listener ---

export function initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
        console.log('[Listeners] Received message:', message.type);
        let isAsync = false; // Flag to indicate if sendResponse will be called asynchronously

        try {
            switch (message.type) {
                // --- Messages previously in first onMessage listener ---
                case 'OPEN_SIDEBAR':
                    if (sender.tab) {
                        // Use the imported function from sidepanelManager
                        openSidePanelForTab(sender.tab).then(() => {
                            sendResponse({ success: true, message: 'Sidebar opened or focused.' });
                        }).catch((error: Error) => {
                            console.error('[Listeners] Error handling OPEN_SIDEBAR:', error);
                            sendResponse({ success: false, error: error.message });
                        });
                        isAsync = true;
                    } else {
                         console.error('[Listeners] OPEN_SIDEBAR request missing sender tab info.');
                         sendResponse({ success: false, error: 'Sender tab information missing.' });
                    }
                    break;

                case 'SAVE_PROMPT_CAPTURE':
                    // Call the imported handler
                    handleSavePromptCapture(message.payload, sender, sendResponse);
                    isAsync = true;
                    break;

                case 'GENERATE_TITLE':
                    // Call the imported handler from aiFeaturesHandler
                    handleGenerateTitle(message.payload, sender, sendResponse);
                    isAsync = true;
                    break;

                 case 'OPTIMIZE_SELECTION':
                     // Now calls the imported function from optimizationHandler
                     handleOptimizeSelection(message.payload, sender, sendResponse);
                     isAsync = true; // API call is async
                     break;

                case 'OPTIMIZE_MODAL_CONTENT':
                    // Call the new handler from optimizationHandler
                    handleOptimizeModalContent(message.payload, sender, sendResponse);
                    isAsync = true; // API call is async
                    break;

                // --- Message previously in second onMessage listener ---
                case 'PROMPT_UPDATED':
                    // This message might originate from background itself OR other parts.
                    // If it's just for broadcasting, maybe handle it differently?
                    // For now, assume it means "broadcast this update".
                    handlePromptUpdatedBroadcast();
                    sendResponse({ success: true }); // Acknowledge receipt
                    isAsync = true; // Broadcasting involves async tab queries/sends
                    break;

                // --- Message previously in keepAlive's onMessage listener ---
                case 'HEARTBEAT':
                    handleHeartbeat(message.payload, sender, sendResponse);
                    // sendResponse is called synchronously inside handleHeartbeat
                    break; // Not async

                // --- Messages previously in addMessageListener ---
                case 'CONTENT_SCRIPT_READY':
                    if (sender.tab?.id) {
                        markContentScriptReady(sender.tab.id, message.data?.url); // Call imported function
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'Missing sender tab ID'});
                    }
                     // Technically sync, but let's return true just in case markContentScriptReady becomes async
                     isAsync = true;
                    break;

                // --- Authentication ---
                case 'LOGIN_WITH_GOOGLE':
                    handleLoginWithGoogle(message.payload, sender, sendResponse);
                    isAsync = true; 
                    break;
                case 'CHECK_AUTH_STATE':
                    // Call the synchronous handler
                    handleCheckAuthState(message.payload, sender, sendResponse);
                    // isAsync remains false
                    break;
                case 'LOGOUT':
                    // Call the asynchronous handler
                    handleLogout(message.payload, sender, sendResponse);
                    isAsync = true; 
                    break;

                 case 'LEGACY_SEARCH_PROMPTS':
                     // Call the imported handler. Assumes payload { keyword, limit } is compatible
                     // with the PromptFilter expected by searchPrompts.
                     searchPrompts(message.payload, sender, sendResponse);
                     isAsync = true;
                     break;

                 case 'ADD_CONTEXT_MENU_ITEM':
                     // Original logic was just sendResponse({ success: true });
                     sendResponse({ success: true });
                     // Not async
                     break;

                 case 'CAPTURE_SELECTION_AS_PROMPT':
                     const content = message.data?.content || '';
                     if (!content) {
                         sendResponse({ success: false, error: '选中内容为空' });
                     } else {
                         // Call the imported handler
                         captureSelectionAsPrompt(content)
                             .then(success => sendResponse({ success })) // Simplified response sending
                             .catch(error => {
                                 console.error('[Listeners] Error handling CAPTURE_SELECTION_AS_PROMPT:', error);
                                 sendResponse({ success: false, error: String(error) });
                             });
                         isAsync = true;
                     }
                     break;

                default:
                    console.warn(`[Listeners] Unhandled message type: ${message.type}`);
                    // Indicate that we are not handling this message and won't call sendResponse
                    return false; // Explicitly return false for unhandled types
            }
        } catch (error: any) {
             console.error(`[Listeners] Error processing message type ${message.type}:`, error);
             try {
                 // Try to send an error response if possible
                 sendResponse(createErrorResponse(error));
                 isAsync = true; // We called sendResponse
             } catch (responseError) {
                 console.error(`[Listeners] Failed to send error response:`, responseError);
             }
        }

        // Return true if sendResponse will be called asynchronously, otherwise let Chrome handle it (implicitly false).
        return isAsync;
    });

    console.log('[AetherFlow] Unified message listener initialized.');
}