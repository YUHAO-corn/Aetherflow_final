import { addMessageListener } from '../services/messaging';
import type { Message } from '../services/messaging/types';

console.log('AetherFlow content script loaded');

addMessageListener(async (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  try {
    if (message.type === 'COPY_TO_CLIPBOARD') {
      const textToCopy =
        typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload);

      await navigator.clipboard.writeText(textToCopy);
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Content script error:', error);
    sendResponse({ success: false, error: String(error) });
  }
});
