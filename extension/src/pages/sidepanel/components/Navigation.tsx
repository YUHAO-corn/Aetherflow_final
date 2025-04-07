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
        className={`flex-1 px-4 py-2 text-xs font-medium transition-all duration-300 ${
          activeTab === 'library'
            ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
            : 'text-magic-400 hover:text-magic-300'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <BookMarked size={14} />
          <span>Prompt Library</span>
        </div>
      </button>
      <button
        onClick={() => onTabChange('optimize')}
        className={`flex-1 px-4 py-2 text-xs font-medium transition-all duration-300 ${
          activeTab === 'optimize'
            ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
            : 'text-magic-400 hover:text-magic-300'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <Wand2 size={14} />
          <span className="whitespace-nowrap">Prompt Optimizer</span>
        </div>
      </button>
    </div>
  );
} 