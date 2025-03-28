export interface Message {
  type: string;
  payload?: unknown;
}

export type MessageCallback = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => void | boolean | Promise<void>; 