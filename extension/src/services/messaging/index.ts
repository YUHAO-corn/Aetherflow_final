import { Message, MessageCallback } from './types';

export function addMessageListener(callback: MessageCallback): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const response = callback(message, sender, sendResponse);
    if (response instanceof Promise) {
      response.then(sendResponse);
      return true; // 告诉Chrome我们会异步调用sendResponse
    }
    return response;
  });
}

export function sendMessage(message: Message): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export * from './types';
