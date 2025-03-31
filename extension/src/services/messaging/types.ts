// 消息类型常量
export type MessageType = 
  // 提示词相关消息
  | 'GET_PROMPTS' 
  | 'GET_PROMPT' 
  | 'SAVE_PROMPT'
  | 'UPDATE_PROMPT'
  | 'DELETE_PROMPT'
  | 'INCREMENT_PROMPT_USE'
  | 'SEARCH_PROMPTS'
  // 其他现有消息类型
  | 'SEARCH_PROMPTS'
  | 'OPTIMIZE_PROMPT'
  | 'PROMPT_UPDATED'
  // 内容脚本相关消息类型
  | 'COPY_TO_CLIPBOARD'
  | 'INJECT_PROMPT'
  | 'CLOSE_PROMPT_SHORTCUT'
  // 选中文本捕获相关消息类型
  | 'ADD_CONTEXT_MENU_ITEM'
  | 'CAPTURE_SELECTION_AS_PROMPT'
  | 'CAPTURE_SELECTION'
  | 'SHOW_NOTIFICATION'
  // 消息通信检测
  | 'PING'
  | 'CONTENT_SCRIPT_READY'
  // 旧版兼容消息类型
  | 'LEGACY_SEARCH_PROMPTS';

/**
 * 统一消息接口
 */
export interface Message<T = any> {
  // 消息类型
  type: MessageType;
  // 消息负载
  payload?: T;
  // 可选的数据字段，主要用于新消息格式
  data?: any;
  // 请求ID，用于追踪异步请求
  requestId?: string;
}

/**
 * 消息响应接口
 */
export interface MessageResponse<T = any> {
  // 操作是否成功
  success: boolean;
  // 响应数据
  data?: T;
  // 错误信息
  error?: string;
  // 请求ID，对应请求的requestId
  requestId?: string;
}

/**
 * 消息处理回调
 * 注意：返回true表示将异步发送响应，Chrome扩展API需要这样标记
 */
export type MessageCallback = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => void | boolean | Promise<void | boolean>; 