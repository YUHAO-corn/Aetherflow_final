import React from 'react';
import { User, Star, Clock, Settings, LogOut } from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  _onClose: () => void;
  onOpenSettings: () => void;
}

export function UserProfile({ isOpen, _onClose, onOpenSettings }: UserProfileProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-4 w-64 bg-gradient-to-br from-magic-800 to-magic-900 rounded-lg shadow-xl border border-magic-700/30 z-50">
      <div className="p-4 border-b border-magic-700/30">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-magic-700/30 flex items-center justify-center">
            <User className="w-6 h-6 text-magic-400" />
          </div>
          <div>
            <h3 className="text-magic-200 font-medium">用户名</h3>
            <p className="text-sm text-magic-400">user@example.com</p>
          </div>
        </div>
      </div>
      <div className="p-2">
        <button className="w-full px-3 py-2 text-left text-sm text-magic-200 hover:bg-magic-700/30 rounded-lg transition-colors flex items-center space-x-3">
          <Star className="w-4 h-4 text-magic-400" />
          <span>收藏的提示词</span>
        </button>
        <button className="w-full px-3 py-2 text-left text-sm text-magic-200 hover:bg-magic-700/30 rounded-lg transition-colors flex items-center space-x-3">
          <Clock className="w-4 h-4 text-magic-400" />
          <span>使用记录</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full px-3 py-2 text-left text-sm text-magic-200 hover:bg-magic-700/30 rounded-lg transition-colors flex items-center space-x-3"
        >
          <Settings className="w-4 h-4 text-magic-400" />
          <span>设置</span>
        </button>
        <button className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-magic-700/30 rounded-lg transition-colors flex items-center space-x-3">
          <LogOut className="w-4 h-4" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
}
