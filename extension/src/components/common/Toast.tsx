/**
 * Toast通知组件 - 显示临时通知消息
 * 
 * @note 此组件当前未在项目中主动使用，但保留作为通用组件库的一部分
 * 可用于任何需要显示临时通知的场景
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icon =
    type === 'success' ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center space-x-2 px-4 py-2 bg-magic-800/90 border border-magic-700/30 rounded-lg shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
      }`}
    >
      {icon}
      <span className="text-sm text-magic-200">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-magic-400" />
      </button>
    </div>
  );
}
