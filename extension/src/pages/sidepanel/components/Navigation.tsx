import React from 'react';
import { BookMarked, Wand2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface NavigationProps {
  activeTab: 'library' | 'optimize';
  onTabChange: (tab: 'library' | 'optimize') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="flex flex-col border-b border-magic-700/30">
      {/* 用户头像区域 */}
      <div className="flex justify-end p-2 border-b border-magic-700/20">
        <UserAvatar />
      </div>
      
      {/* 标签导航 */}
      <div className="flex">
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
            <span>Prompt Library</span>
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
            <span>Prompt Optimizer</span>
          </div>
        </button>
      </div>
    </div>
  );
} 