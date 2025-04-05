/**
 * @deprecated 此组件已废弃，请使用 src/pages/sidepanel/components/Navigation.tsx 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import React from 'react';
import { BookMarked, Wand2 } from 'lucide-react';

interface NavigationProps {
  activeTab: 'library' | 'optimize';
  onTabChange: (tab: 'library' | 'optimize') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="flex border-b border-magic-700/30">
      <button
        onClick={() => onTabChange('library')}
        className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 ${
          activeTab === 'library'
            ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
            : 'text-magic-400 hover:text-magic-300'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <BookMarked size={16} />
          <span>提示词收藏夹</span>
        </div>
      </button>
      <button
        onClick={() => onTabChange('optimize')}
        className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 ${
          activeTab === 'optimize'
            ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
            : 'text-magic-400 hover:text-magic-300'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <Wand2 size={16} />
          <span>提示词优化</span>
        </div>
      </button>
    </div>
  );
} 