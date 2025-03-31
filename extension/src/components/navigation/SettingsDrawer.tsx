import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Check } from 'lucide-react';
import { useExport } from '../../hooks/useExport';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { exportToCSV, loading, success, error } = useExport();

  // 设置挂载状态以触发动画
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      // 延迟卸载以允许过渡动画完成
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300); // 与过渡动画持续时间相同
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 处理点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    }

    // 添加全局点击事件监听
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 添加ESC键关闭功能
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    // 添加键盘事件监听
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // 如果没有挂载，则不显示
  if (!mounted) return null;

  return (
    <>
      {/* 背景遮罩 - 点击关闭抽屉 */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* 设置抽屉 */}
      <div 
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-br from-magic-800 to-magic-900 border-l border-magic-700/30 shadow-xl z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
          <h3 className="text-lg font-semibold text-magic-200 truncate">设置</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
            aria-label="关闭设置"
          >
            <X className="w-5 h-5 text-magic-400" />
          </button>
        </div>
        
        {/* 抽屉内容 */}
        <div className="p-4">
          <h4 className="text-md font-bold text-magic-200 mb-6">数据管理</h4>
          
          <div className="space-y-4">
            <button
              onClick={exportToCSV}
              disabled={loading}
              className={`flex items-center justify-center px-4 py-2 ${
                success ? 'bg-green-600' : 
                loading ? 'bg-magic-700 cursor-not-allowed' : 
                'bg-magic-600 hover:bg-magic-500'
              } rounded-md text-white transition-colors w-full`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  导出中...
                </span>
              ) : success ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> 导出成功
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" /> 导出提示词(CSV)
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-2 text-sm text-red-400">
              <p>{error}</p>
            </div>
          )}
          
          <div className="mt-6 text-sm text-magic-400">
            <p>CSV文件将包含您的所有提示词，包括标题、内容、创建时间和使用次数等信息。</p>
          </div>
        </div>
      </div>
    </>
  );
} 