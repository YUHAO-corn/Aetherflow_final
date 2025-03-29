import { GenericAdapter } from '../../content/platformAdapter';

/**
 * 提示词快捷输入位置接口
 */
export interface PromptShortcutPosition {
  top: number;
  left: number;
}

/**
 * 提示词快捷输入服务接口
 */
export interface PromptShortcutService {
  /**
   * 激活提示词快捷输入
   * @param inputElement 输入元素
   * @param position 显示位置
   * @param onClose 关闭回调
   */
  activatePromptShortcut(
    inputElement: HTMLElement, 
    position: PromptShortcutPosition, 
    onClose: () => void
  ): void;
  
  /**
   * 关闭提示词快捷输入
   */
  closePromptShortcut(): void;
  
  /**
   * 向当前活跃的输入框插入文本
   * @param text 要插入的文本
   * @returns 是否成功插入
   */
  insertTextToActiveElement(text: string): boolean;
} 