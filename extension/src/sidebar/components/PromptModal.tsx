import React from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: {
    title?: string;
    content: string;
  };
}

export function PromptModal({ isOpen, onClose, prompt }: PromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-magic-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-magic-800 to-magic-900 rounded-lg w-full max-w-2xl shadow-xl border border-magic-700/30">
        <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
          <h3 className="text-lg font-semibold text-magic-200">{prompt.title || '提示词详情'}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-magic-400" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-magic-200 whitespace-pre-wrap">{prompt.content}</p>
        </div>
      </div>
    </div>
  );
}
