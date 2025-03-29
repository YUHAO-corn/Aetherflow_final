// platformAdapter.ts - 平台适配器，用于处理输入框的文本插入逻辑

/**
 * 平台适配器接口
 */
export interface PlatformAdapter {
  /**
   * 向输入框中插入文本
   * @param element 输入框元素
   * @param text 要插入的文本
   * @returns 是否成功插入
   */
  insertText(element: HTMLElement, text: string): boolean;
  
  /**
   * 获取输入框中的文本
   * @param element 输入框元素
   * @returns 输入框中的文本
   */
  getText(element: HTMLElement): string;
  
  /**
   * 触发输入事件，使平台能够识别输入变化
   * @param element 输入框元素
   * @returns 是否成功触发事件
   */
  triggerInputEvent(element: HTMLElement): boolean;
}

/**
 * 标准文本区域适配器（用于textarea元素）
 */
class TextareaAdapter implements PlatformAdapter {
  insertText(element: HTMLElement, text: string): boolean {
    if (!(element instanceof HTMLTextAreaElement)) return false;
    
    const textarea = element as HTMLTextAreaElement;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentText = textarea.value;
    
    // 组合新文本：前部分 + 新内容 + 后部分
    const newText = currentText.substring(0, start) + text + currentText.substring(end);
    textarea.value = newText;
    
    // 设置光标位置到插入文本的末尾
    const newPosition = start + text.length;
    textarea.selectionStart = newPosition;
    textarea.selectionEnd = newPosition;
    
    return true;
  }
  
  getText(element: HTMLElement): string {
    if (!(element instanceof HTMLTextAreaElement)) return '';
    return (element as HTMLTextAreaElement).value;
  }
  
  triggerInputEvent(element: HTMLElement): boolean {
    if (!(element instanceof HTMLTextAreaElement)) return false;
    
    // 创建输入事件
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
    
    return true;
  }
}

/**
 * 可编辑内容适配器（用于contenteditable元素）
 */
class ContentEditableAdapter implements PlatformAdapter {
  insertText(element: HTMLElement, text: string): boolean {
    if (!element.isContentEditable) return false;
    
    // 保存当前选择
    const selection = window.getSelection();
    if (!selection) return false;
    
    if (selection.rangeCount === 0) {
      // 如果没有选择范围，创建一个新的并将其设置到元素的开始
      const range = document.createRange();
      range.setStart(element, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    const range = selection.getRangeAt(0);
    
    // 如果范围不在元素内部，则移动到元素内部
    if (!element.contains(range.commonAncestorContainer)) {
      range.setStart(element, 0);
      range.collapse(true);
    }
    
    // 插入文本
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // 更新选择范围
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    return true;
  }
  
  getText(element: HTMLElement): string {
    if (!element.isContentEditable) return '';
    return element.textContent || '';
  }
  
  triggerInputEvent(element: HTMLElement): boolean {
    if (!element.isContentEditable) return false;
    
    // 创建输入事件
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
    
    // 许多contenteditable实现还需要其他事件
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return true;
  }
}

/**
 * 通用输入适配器（尝试自动识别元素类型并使用相应的适配器）
 */
export class GenericAdapter implements PlatformAdapter {
  private textareaAdapter = new TextareaAdapter();
  private contentEditableAdapter = new ContentEditableAdapter();
  
  insertText(element: HTMLElement, text: string): boolean {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return this.textareaAdapter.insertText(element, text);
    } else if (element.isContentEditable) {
      return this.contentEditableAdapter.insertText(element, text);
    }
    return false;
  }
  
  getText(element: HTMLElement): string {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return this.textareaAdapter.getText(element);
    } else if (element.isContentEditable) {
      return this.contentEditableAdapter.getText(element);
    }
    return '';
  }
  
  triggerInputEvent(element: HTMLElement): boolean {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return this.textareaAdapter.triggerInputEvent(element);
    } else if (element.isContentEditable) {
      return this.contentEditableAdapter.triggerInputEvent(element);
    }
    return false;
  }
} 