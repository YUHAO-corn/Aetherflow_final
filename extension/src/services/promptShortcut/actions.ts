import { GenericAdapter } from '../../content/platformAdapter';
import { injectPromptShortcut } from '../../content/PromptShortcutInjector';
import { 
  PromptShortcutState, 
  InputMethodState, 
  SearchInfo, 
  PromptShortcutEventType 
} from './types';

// 默认状态
const defaultState: PromptShortcutState = {
  active: false,
  cleanupFn: null,
  currentElement: null,
  lastSlashPosition: -1,
  lastSearchTerm: '',
  closeTimer: null,
  noMatchCount: 0,
  hasAutoDismissed: false,
  manualClosed: false,
  lastTriggerSlashPosition: -1
};

// 状态管理（模块级私有变量）
let state: PromptShortcutState = { ...defaultState };

/**
 * 重置提示词快捷输入状态
 * @returns 当前状态
 */
export function resetState(): PromptShortcutState {
  state = { ...defaultState };
  return state;
}

/**
 * 获取当前状态
 * @returns 当前状态
 */
export function getState(): PromptShortcutState {
  return { ...state };
}

/**
 * 更新部分状态
 * @param updates 状态更新
 * @returns 更新后的状态
 */
export function updateState(updates: Partial<PromptShortcutState>): PromptShortcutState {
  state = { ...state, ...updates };
  return { ...state };
}

/**
 * 检测输入法中间状态
 * @param searchTerm 搜索词
 * @returns 输入法状态对象
 */
export function detectInputMethod(searchTerm: string): InputMethodState {
  return {
    isPinyinInput: /^[a-z\s]+$/i.test(searchTerm) && searchTerm.length < 50,
    isWordInput: /^[a-zA-Z0-9]+$/.test(searchTerm) && searchTerm.length < 100,
    hasCJK: /[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/.test(searchTerm), // 包含中日韩文字
    hasLatin: /[a-zA-Z]/.test(searchTerm),  // 包含拉丁字母
  };
}

/**
 * 判断是否是新的斜杠输入
 * @param slashIndex 斜杠位置
 * @returns 是否是新的斜杠输入
 */
export function isNewSlashInput(slashIndex: number): boolean {
  return slashIndex >= 0 && slashIndex !== state.lastTriggerSlashPosition;
}

/**
 * 处理用户手动关闭事件
 * @param manualClosed 是否是手动关闭
 */
export function handleShortcutDismissed(manualClosed: boolean): void {
  state.hasAutoDismissed = true;
  state.manualClosed = manualClosed;
  console.log('[AetherFlow] 提示词快捷输入服务: 浮层关闭事件处理', { manualClosed });
}

/**
 * 增加无匹配计数
 */
export function incrementNoMatchCount(): void {
  state.noMatchCount++;
  console.log('[AetherFlow] 提示词快捷输入服务: 无匹配计数增加', state.noMatchCount);
}

/**
 * 判断是否应该激活提示词快捷输入
 * @param target 目标元素
 * @param slashIndex 斜杠位置
 * @param searchTerm 搜索词
 * @returns 是否应该激活
 */
export function shouldActivateShortcut(
  target: HTMLElement, 
  slashIndex: number, 
  searchTerm: string
): boolean {
  // 已经是手动关闭状态，且不是新的斜杠输入，不应该激活
  if (state.manualClosed && !isNewSlashInput(slashIndex)) {
    return false;
  }
  
  return (
    // 浮层未激活
    !state.active || 
    // 或者目标元素变化
    state.currentElement !== target || 
    // 或者斜杠位置变化（新输入的斜杠）
    state.lastSlashPosition !== slashIndex ||
    // 或者搜索词变化
    state.lastSearchTerm !== searchTerm
  );
}

/**
 * 显示提示词快捷输入浮层
 * @param target 目标元素
 * @param adapter 适配器
 * @param slashIndex 斜杠位置
 * @param searchTerm 搜索词
 * @returns 清理函数
 */
export function showPromptShortcut(
  target: HTMLElement,
  adapter: GenericAdapter,
  slashIndex: number,
  searchTerm: string
): () => void {
  console.log('[AetherFlow] 提示词快捷输入服务: 显示浮层', { slashIndex, searchTerm });
  
  // 清理现有浮层
  if (state.cleanupFn) {
    state.cleanupFn();
    state.cleanupFn = null;
  }
  
  // 清除可能存在的关闭计时器
  if (state.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
  
  // 更新状态
  updateState({
    active: true,
    currentElement: target,
    lastSlashPosition: slashIndex,
    lastSearchTerm: searchTerm,
    noMatchCount: 0,
    hasAutoDismissed: false
  });
  
  // 注入提示词快捷输入组件
  const cleanup = injectPromptShortcut(target, adapter, {
    slashPosition: slashIndex,
    searchTerm
  });
  
  // 记录清理函数
  state.cleanupFn = cleanup;
  
  // 返回清理函数
  return () => {
    cleanup();
    updateState({
      active: false,
      cleanupFn: null
    });
    
    // 清除可能存在的计时器
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
      state.closeTimer = null;
    }
  };
}

/**
 * 关闭提示词快捷输入浮层
 */
export function closePromptShortcut(): void {
  console.log('[AetherFlow] 提示词快捷输入服务: 关闭浮层');
  
  if (state.cleanupFn) {
    state.cleanupFn();
    state.cleanupFn = null;
  }
  
  updateState({
    active: false
  });
}

/**
 * 发送浮层关闭事件
 * @param slashPosition 斜杠位置
 * @param manualClosed 是否是手动关闭
 */
export function dispatchDismissedEvent(slashPosition: number, manualClosed: boolean = false): void {
  window.dispatchEvent(new CustomEvent(PromptShortcutEventType.DISMISSED, {
    detail: { 
      slashPosition,
      manualClosed
    }
  }));
}

/**
 * 发送无匹配结果事件
 * @param term 搜索词
 */
export function dispatchNoMatchEvent(term: string): void {
  window.dispatchEvent(new CustomEvent(PromptShortcutEventType.NO_MATCH, {
    detail: { term }
  }));
} 