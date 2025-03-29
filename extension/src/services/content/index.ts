import ReactDOM from 'react-dom/client';
import React from 'react';
import { GenericAdapter } from '../../content/platformAdapter';
import { PromptShortcutComponent } from '../../content/PromptShortcutComponent';
import { PromptShortcutPosition, PromptShortcutService } from './types';
import { sendMessage } from '../messaging';

/**
 * 内容脚本服务实现类
 */
class ContentServiceImpl implements PromptShortcutService {
  private containerElement: HTMLDivElement;
  private root: ReactDOM.Root | null = null;
  private isActive = false;
  
  constructor() {
    console.log('[AetherFlow] 构造内容服务实例');
    // 创建容器元素
    this.containerElement = document.createElement('div');
    this.containerElement.id = 'aetherflow-shortcut-container';
    document.body.appendChild(this.containerElement);
    console.log('[AetherFlow] 创建容器元素完成:', this.containerElement.id);
    
    // 添加样式
    this.injectStyles();
  }
  
  /**
   * 注入CSS样式
   */
  private injectStyles(): void {
    console.log('[AetherFlow] 开始注入样式');
    const styles = `
      .af-shortcut-container {
        position: absolute;
        width: 320px;
        max-height: 300px;
        background-color: #1a1c2a;
        border: 1px solid #2f3146;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
        color: #e2e8f0;
      }
      
      .af-shortcut-header {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid #2f3146;
      }
      
      .af-shortcut-search {
        width: 100%;
        background-color: #252736;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        color: #e2e8f0;
        font-size: 14px;
        outline: none;
      }
      
      .af-shortcut-list {
        max-height: 250px;
        overflow-y: auto;
        padding: 6px;
      }
      
      .af-shortcut-item {
        padding: 8px 10px;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 4px;
        transition: background-color 0.2s;
      }
      
      .af-shortcut-item:hover {
        background-color: #252736;
      }
      
      .af-shortcut-item.af-active {
        background-color: #323552;
      }
      
      .af-shortcut-title {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .af-shortcut-content {
        font-size: 12px;
        color: #94a3b8;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      
      .af-shortcut-favorite {
        color: #f0d166;
        margin-left: 4px;
      }
      
      .af-shortcut-empty {
        padding: 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 14px;
      }
      
      .af-shortcut-footer {
        padding: 8px 12px;
        font-size: 12px;
        color: #94a3b8;
        border-top: 1px solid #2f3146;
        display: flex;
        justify-content: space-between;
      }
      
      .af-shortcut-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .af-shortcut-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #3f4565;
        border-bottom-color: #8357f6;
        border-radius: 50%;
        animation: af-spinner 1s linear infinite;
      }
      
      @keyframes af-spinner {
        to { transform: rotate(360deg); }
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    console.log('[AetherFlow] 样式注入完成');
  }
  
  /**
   * 激活提示词快捷输入
   */
  public activatePromptShortcut(
    inputElement: HTMLElement, 
    position: PromptShortcutPosition, 
    onClose: () => void
  ): void {
    console.log('[AetherFlow] 开始激活提示词快捷输入');
    
    if (this.isActive) {
      console.log('[AetherFlow] 快捷输入已经处于激活状态，跳过');
      return;
    }
    
    this.isActive = true;
    const adapter = new GenericAdapter();
    
    try {
      console.log('[AetherFlow] 开始创建React根元素');
      this.root = ReactDOM.createRoot(this.containerElement);
      
      console.log('[AetherFlow] 渲染PromptShortcutComponent组件');
      this.root.render(
        React.createElement(PromptShortcutComponent, {
          inputElement,
          adapter,
          position,
          onClose: () => {
            console.log('[AetherFlow] 组件触发关闭回调');
            this.closePromptShortcut();
            onClose();
          }
        })
      );
      console.log('[AetherFlow] 组件渲染完成');
    } catch (error) {
      console.error('[AetherFlow] 激活提示词快捷输入失败:', error);
      this.isActive = false;
    }
  }
  
  /**
   * 关闭提示词快捷输入
   */
  public closePromptShortcut(): void {
    console.log('[AetherFlow] 开始关闭提示词快捷输入');
    
    if (!this.isActive) {
      console.log('[AetherFlow] 快捷输入未处于激活状态，跳过');
      return;
    }
    
    try {
      console.log('[AetherFlow] 卸载React组件');
      this.root?.unmount();
      this.root = null;
      this.isActive = false;
      console.log('[AetherFlow] 快捷输入关闭成功');
    } catch (error) {
      console.error('[AetherFlow] 关闭提示词快捷输入失败:', error);
    }
  }
  
  /**
   * 向当前活跃的输入框插入文本
   */
  public insertTextToActiveElement(text: string): boolean {
    console.log('[AetherFlow] 开始向活跃元素插入文本');
    
    const activeElement = document.activeElement as HTMLElement;
    if (
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLInputElement ||
      activeElement.isContentEditable
    ) {
      console.log('[AetherFlow] 找到有效输入元素，类型:', activeElement.tagName);
      
      const adapter = new GenericAdapter();
      const success = adapter.insertText(activeElement, text);
      if (success) {
        adapter.triggerInputEvent(activeElement);
        console.log('[AetherFlow] 文本插入成功');
      } else {
        console.error('[AetherFlow] 文本插入失败');
      }
      return success;
    }
    
    console.warn('[AetherFlow] 未找到有效的活跃输入元素');
    return false;
  }
  
  /**
   * 复制文本到剪贴板
   */
  public async copyToClipboard(text: string): Promise<boolean> {
    console.log('[AetherFlow] 开始复制文本到剪贴板');
    
    try {
      await navigator.clipboard.writeText(text);
      console.log('[AetherFlow] 复制到剪贴板成功');
      return true;
    } catch (error) {
      console.error('[AetherFlow] 复制到剪贴板失败:', error);
      return false;
    }
  }
  
  /**
   * 处理斜杠键触发提示词快捷输入
   */
  public setupShortcutTrigger(): void {
    console.log('[AetherFlow] 开始设置斜杠键触发器');
    
    document.addEventListener('keydown', (e) => {
      // 输出所有按键，以便诊断
      if (e.key) {
        console.log('[AetherFlow] 按下按键:', e.key, '活跃元素类型:', document.activeElement?.tagName);
      }
      
      // 如果快捷键已激活或按键不是'/'，则跳过
      if (this.isActive || e.key !== '/') return;
      
      const activeElement = document.activeElement as HTMLElement;
      console.log('[AetherFlow] 检测到斜杠键，活跃元素:', activeElement?.tagName);
      
      // 检查激活元素是否为输入框或可编辑区域
      if (
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        activeElement.isContentEditable
      ) {
        console.log('[AetherFlow] 找到有效输入框，激活提示词快捷输入');
        e.preventDefault(); // 阻止默认的'/'输入
        
        // 获取输入框位置
        const rect = activeElement.getBoundingClientRect();
        const position = {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        };
        console.log('[AetherFlow] 计算位置:', position);
        
        // 激活提示词快捷输入
        this.activatePromptShortcut(
          activeElement,
          position,
          () => { console.log('[AetherFlow] 快捷输入关闭完成'); }
        );
      } else {
        console.log('[AetherFlow] 当前没有有效的输入框元素');
      }
    });
    
    console.log('[AetherFlow] 斜杠键触发器设置完成');
  }
}

// 导出单例实例
export const contentService = new ContentServiceImpl();

// 导出类型
export * from './types'; 