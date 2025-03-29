import React from 'react';
import { Settings } from 'lucide-react';

export function Footer() {
  return (
    <div className="px-4 py-2 border-t border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
      <button className="flex items-center space-x-2 text-sm text-magic-400 hover:text-magic-300 transition-colors duration-300">
        <Settings size={14} />
        <span>设置</span>
      </button>
    </div>
  );
} 