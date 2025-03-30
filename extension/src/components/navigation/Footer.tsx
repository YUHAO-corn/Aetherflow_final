/**
 * @deprecated 此组件已废弃，在src/pages/sidepanel/components/App.tsx中直接实现
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { SettingsDrawer } from './SettingsDrawer'; // 确保SettingsDrawer组件路径正确

export function Footer() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="px-4 py-2 border-t border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
      <button 
        className="flex items-center space-x-2 text-sm text-magic-400 hover:bg-magic-700/30 hover:text-magic-300 transition-colors duration-300 p-1 rounded"
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings size={14} />
        <span>设置</span>
      </button>

      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
} 