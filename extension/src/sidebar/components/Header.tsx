import React from 'react';
import { UserProfile } from './UserProfile';

interface HeaderProps {
  magicianLevel: number;
  isLoggedIn: boolean;
  isUserProfileOpen: boolean;
  setIsUserProfileOpen: (isOpen: boolean) => void;
  setIsAuthModalOpen: (isOpen: boolean) => void;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
}

export function Header({
  magicianLevel,
  isLoggedIn,
  isUserProfileOpen,
  setIsUserProfileOpen,
  setIsAuthModalOpen,
  setIsSettingsModalOpen,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        <h1 className="text-lg font-semibold text-white">AetherFlow</h1>
        <div className="flex items-center space-x-1 px-2 py-0.5 bg-magic-700/30 rounded-full">
          <span className="text-xs text-magic-300">Lv.{magicianLevel}</span>
        </div>
      </div>
      <div className="relative">
        <button
          onClick={() =>
            isLoggedIn ? setIsUserProfileOpen(!isUserProfileOpen) : setIsAuthModalOpen(true)
          }
          className="px-3 py-1 text-sm text-magic-200 hover:bg-magic-700/30 rounded-full transition-all duration-300"
        >
          {isLoggedIn ? '个人中心' : '登录'}
        </button>
        {isUserProfileOpen && (
          <UserProfile
            isOpen={isUserProfileOpen}
            _onClose={() => setIsUserProfileOpen(false)}
            onOpenSettings={() => {
              setIsUserProfileOpen(false);
              setIsSettingsModalOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
