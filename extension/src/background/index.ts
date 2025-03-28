import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';

addMessageListener(async (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  switch (message.type) {
    case 'OPTIMIZE_PROMPT':
      // TODO: Implement prompt optimization logic
      sendResponse({ success: true, optimized: message.payload + ' [optimized]' });
      break;

    case 'GET_PROMPTS':
      // TODO: Implement prompt fetching logic
      sendResponse({ success: true, prompts: [] });
      break;

    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: Error) => {
  console.error('Failed to set panel behavior:', error);
});
