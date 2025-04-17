/**
 * 提示词快捷输入服务
 * 负责处理提示词快捷输入的核心业务逻辑
 */

import { 
  PromptShortcutState,
  InputMethodState,
  SearchInfo,
  PromptShortcutEventType,
  PromptShortcutEventDetail
} from './types';

import {
  resetState,
  getState,
  updateState,
  detectInputMethod,
  isNewSlashInput,
  handleShortcutDismissed,
  incrementNoMatchCount,
  shouldActivateShortcut,
  showPromptShortcut,
  closePromptShortcut,
  dispatchDismissedEvent,
  dispatchNoMatchEvent
} from './actions';

// 导出类型
export type {
  PromptShortcutState,
  InputMethodState,
  SearchInfo,
  PromptShortcutEventDetail
};

// 导出枚举
export { PromptShortcutEventType };

// 创建服务接口
export const promptShortcutService = {
  // 状态管理
  resetState,
  getState,
  updateState,
  
  // 业务逻辑
  detectInputMethod,
  isNewSlashInput,
  handleShortcutDismissed,
  incrementNoMatchCount,
  shouldActivateShortcut,
  showPromptShortcut,
  closePromptShortcut,
  
  // 事件分发
  dispatchDismissedEvent,
  dispatchNoMatchEvent
};

// 导出所有方法供单独使用
export {
  resetState,
  getState,
  updateState,
  detectInputMethod,
  isNewSlashInput,
  handleShortcutDismissed,
  incrementNoMatchCount,
  shouldActivateShortcut,
  showPromptShortcut,
  closePromptShortcut,
  dispatchDismissedEvent,
  dispatchNoMatchEvent
}; 