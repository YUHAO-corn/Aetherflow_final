// extension/src/background/optimizationHandler.ts

// Import the centralized optimization service
import { optimizePrompt } from '../services/optimizationService'; 

/**
 * Handles the OPTIMIZE_SELECTION message by calling the centralized optimization service.
 */
export async function handleOptimizeSelection(
  payload: { content?: string }, // Define payload structure
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): Promise<void> {
  console.log('[OptimizationHandler] Received OPTIMIZE_SELECTION request, content length:', payload?.content?.length);

  if (!sender.tab?.id || !payload?.content) {
    console.error('[OptimizationHandler] Invalid request: Missing tab ID or content.', { payload, sender });
    sendResponse({ success: false, error: 'Invalid payload or sender tab info for OPTIMIZE_SELECTION' });
    return; // Exit early if validation fails
  }

  const tabId = sender.tab.id;
  const originalContent = payload.content;

  try {
    console.log('[OptimizationHandler] Calling optimizationService.optimizePrompt with universal mode...');
    // Call the centralized service with the 'universal' mode
    const optimizedContent = await optimizePrompt(originalContent, 'universal');

    console.log('[OptimizationHandler] Optimization successful via service:', optimizedContent.substring(0, 100) + '...');

    // Send the result back to the content script
    chrome.tabs.sendMessage(tabId, {
        type: 'OPTIMIZATION_RESULT',
        payload: { optimizedContent: optimizedContent }
    }).catch(error => {
        // Log error but don't prevent acknowledging the main request
        console.error(`[OptimizationHandler] Error sending OPTIMIZATION_RESULT to Tab ${tabId}:`, error);
    });

    // Acknowledge successful processing of the background message
    sendResponse({ success: true });

  } catch (error: any) {
    // Handle errors from the optimizationService (e.g., API key missing, API error)
    console.error('[OptimizationHandler] Error calling optimizationService:', error);
    // Send a structured error back
    sendResponse({ 
        success: false, 
        error: { 
            code: error.code || 'optimization/service-failed', // Provide a default code
            message: error.message || 'Optimization failed' // Use error message from service
        }
    });
  }
  // sendResponse is handled asynchronously. Listener needs to return true.
}

// No separate initializer needed for this handler
 