/**
 * 提示词快捷输入组件的样式
 */
export const promptShortcutStyles = `
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
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  border-bottom: 1px solid #2f3146;
}

.af-shortcut-header-icon {
  margin-right: 6px;
  color: #8357f6;
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
  scrollbar-width: thin;
  scrollbar-color: #3f4565 transparent;
}

.af-shortcut-list::-webkit-scrollbar {
  width: 6px;
}

.af-shortcut-list::-webkit-scrollbar-track {
  background: transparent;
}

.af-shortcut-list::-webkit-scrollbar-thumb {
  background-color: #3f4565;
  border-radius: 3px;
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

.af-shortcut-highlight {
  background-color: rgba(131, 87, 246, 0.3);
  padding: 0 2px;
  border-radius: 2px;
}

.af-shortcut-recommended-label {
  font-size: 11px;
  color: #8357f6;
  margin-left: 5px;
  padding: 1px 5px;
  background-color: rgba(131, 87, 246, 0.1);
  border-radius: 3px;
}
`; 