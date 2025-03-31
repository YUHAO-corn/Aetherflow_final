/**
 * 提示词快捷输入服务类型定义
 */

/**
 * 提示词快捷输入状态
 */
export interface PromptShortcutState {
  // 是否处于活跃状态
  active: boolean;
  // 清理函数引用
  cleanupFn: (() => void) | null;
  // 当前操作的输入元素
  currentElement: HTMLElement | null;
  // 上次斜杠位置
  lastSlashPosition: number;
  // 上次搜索词
  lastSearchTerm: string;
  // 延迟关闭计时器
  closeTimer: number | null;
  // 无匹配计数
  noMatchCount: number;
  // 是否已自动关闭
  hasAutoDismissed: boolean;
  // 是否由用户手动关闭
  manualClosed: boolean;
  // 上次触发的斜杠位置
  lastTriggerSlashPosition: number;
}

/**
 * 检测输入方法状态
 */
export interface InputMethodState {
  isPinyinInput: boolean;
  isWordInput: boolean;
  hasCJK: boolean;
  hasLatin: boolean;
}

/**
 * 提示词快捷输入搜索信息
 */
export interface SearchInfo {
  slashPosition: number;
  searchTerm: string;
}

/**
 * 提示词快捷输入事件详情
 */
export interface PromptShortcutEventDetail {
  slashPosition: number;
  manualClosed?: boolean;
}

/**
 * 自定义事件名称
 */
export enum PromptShortcutEventType {
  DISMISSED = 'aetherflow-shortcut-dismissed',
  NO_MATCH = 'aetherflow-search-no-match'
} 