/**
 * @deprecated 此组件已废弃，在src/pages/sidepanel/components/App.tsx中直接实现
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import React from 'react';

interface HeaderProps {
  magicianLevel: number;
}

export function Header({ magicianLevel }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        <h1 className="text-lg font-semibold text-white">AetherFlow</h1>
        <div className="flex items-center space-x-1 px-2 py-0.5 bg-magic-700/30 rounded-full">
          <span className="text-xs text-magic-300">Lv.{magicianLevel}</span>
        </div>
      </div>
      <button className="px-3 py-1 text-sm text-magic-200 hover:bg-magic-700/30 rounded-full transition-all duration-300">
        登录
      </button>
    </div>
  );
} 