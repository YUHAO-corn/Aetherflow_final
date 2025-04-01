import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  confirmText?: string;
  cancelText?: string;
  noAnimation?: boolean;
  fastAnimation?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  noAnimation = false,
  fastAnimation = false
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 根据参数选择动画类名
  const animationClass = noAnimation 
    ? "" 
    : fastAnimation 
      ? "animate-magic-reveal-fast" 
      : "animate-magic-reveal";

  return (
    <div className="fixed inset-0 bg-magic-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-gradient-to-br from-magic-800 to-magic-900 rounded-lg max-w-xs w-full shadow-xl border border-magic-700/30 ${animationClass}`}>
        <div className="flex items-center justify-between p-3 border-b border-magic-700/30">
          <h3 className="text-sm font-semibold text-magic-200">Confirm</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-magic-400" />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-magic-200 text-center">{message}</p>
        </div>
        
        <div className="flex justify-end p-3 space-x-2 border-t border-magic-700/30">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-magic-700 hover:bg-magic-600 rounded-md text-xs text-magic-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-md text-xs text-white transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
} 