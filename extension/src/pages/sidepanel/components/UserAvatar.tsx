import React, { useState } from 'react';
import { User, LogIn, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { AuthStatus } from '../../../services/auth';
import { AuthModal } from './AuthModal';

/**
 * 用户头像组件
 * 显示登录状态和用户信息
 */
export function UserAvatar() {
  // 获取认证状态
  const { user, status, logout } = useAuth();
  
  // 菜单状态
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 认证模态框状态
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // 获取用户初始字母
  const getUserInitial = () => {
    if (user?.displayName) {
      return user.displayName[0].toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    } else {
      return 'U';
    }
  };
  
  // 切换菜单
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // 关闭菜单
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  // 打开认证模态框
  const openAuthModal = () => {
    setIsAuthModalOpen(true);
    closeMenu();
  };
  
  // 处理登出
  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };
  
  // 渲染已登录状态
  const renderAuthenticated = () => (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-1 bg-magic-700 hover:bg-magic-600 rounded-full px-2 py-1 text-sm transition"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium">
          {getUserInitial()}
        </div>
        <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* 下拉菜单 */}
      {isMenuOpen && (
        <>
          {/* 点击外部关闭菜单 */}
          <div
            className="fixed inset-0 z-10"
            onClick={closeMenu}
          />
          
          <div className="absolute right-0 mt-2 w-48 py-2 bg-magic-800 border border-magic-700 rounded-lg shadow-lg z-20">
            {/* 用户信息 */}
            <div className="px-4 py-2 border-b border-magic-700">
              <div className="font-medium text-magic-200">
                {user?.displayName || '用户'}
              </div>
              <div className="text-xs text-magic-400 truncate">
                {user?.email || ''}
              </div>
            </div>
            
            {/* 菜单项 */}
            <button
              onClick={closeMenu}
              className="w-full px-4 py-2 text-left text-magic-300 hover:bg-magic-700 flex items-center text-sm"
            >
              <Settings size={16} className="mr-2" />
              设置
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-magic-300 hover:bg-magic-700 flex items-center text-sm"
            >
              <LogOut size={16} className="mr-2" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
  
  // 渲染未登录状态
  const renderUnauthenticated = () => (
    <button
      onClick={openAuthModal}
      className="flex items-center space-x-1 bg-blue-700 hover:bg-blue-600 rounded-lg px-3 py-1 text-sm transition"
    >
      <LogIn size={16} className="mr-1" />
      登录/注册
    </button>
  );
  
  // 渲染加载状态
  const renderLoading = () => (
    <div className="w-7 h-7 rounded-full bg-magic-700 flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-t-transparent border-magic-400 rounded-full animate-spin" />
    </div>
  );
  
  return (
    <>
      {status === AuthStatus.LOADING && renderLoading()}
      {status === AuthStatus.AUTHENTICATED && renderAuthenticated()}
      {status === AuthStatus.UNAUTHENTICATED && renderUnauthenticated()}
      
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
} 