import React from 'react';
import { X, Moon, Globe, Bell, Shield, Palette } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-magic-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-magic-800 to-magic-900 rounded-lg w-full max-w-md shadow-xl border border-magic-700/30">
        <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
          <h3 className="text-lg font-semibold text-magic-200">设置</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-magic-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-magic-700/30 rounded-lg">
                  <Moon className="w-5 h-5 text-magic-400" />
                </div>
                <span className="text-magic-200">深色模式</span>
              </div>
              <button className="w-12 h-6 bg-magic-600 rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-magic-700/30 rounded-lg">
                  <Globe className="w-5 h-5 text-magic-400" />
                </div>
                <span className="text-magic-200">语言</span>
              </div>
              <select className="bg-magic-700/30 border border-magic-700/50 rounded-lg px-3 py-1 text-sm text-magic-200">
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-magic-700/30 rounded-lg">
                  <Bell className="w-5 h-5 text-magic-400" />
                </div>
                <span className="text-magic-200">通知提醒</span>
              </div>
              <button className="w-12 h-6 bg-magic-700/30 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-magic-400 rounded-full" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-magic-700/30 rounded-lg">
                  <Shield className="w-5 h-5 text-magic-400" />
                </div>
                <span className="text-magic-200">隐私设置</span>
              </div>
              <button className="px-3 py-1 text-sm text-magic-400 hover:text-magic-300 transition-colors">
                管理
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-magic-700/30 rounded-lg">
                  <Palette className="w-5 h-5 text-magic-400" />
                </div>
                <span className="text-magic-200">主题色</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="w-6 h-6 rounded-full bg-blue-500" />
                <button className="w-6 h-6 rounded-full bg-purple-500" />
                <button className="w-6 h-6 rounded-full bg-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
