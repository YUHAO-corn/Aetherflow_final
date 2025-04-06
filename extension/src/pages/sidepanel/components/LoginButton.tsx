import React, { useState } from 'react';
import { User, LogIn, UserCircle, Crown } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import AuthModal from '../components/AuthModal';

interface LoginButtonProps {
  className?: string;
}

const LoginButton: React.FC<LoginButtonProps> = ({ className = '' }) => {
  const { user, loading, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Show auth modal
  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };
  
  // Close auth modal
  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };
  
  // Toggle user menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // User menu
  const UserMenu = () => (
    <div className={`absolute right-0 top-full mt-2 w-[180px] rounded-md shadow-lg bg-magic-800/90 backdrop-blur-[15px] ring-1 ring-magic-700 ${isMenuOpen ? 'block' : 'hidden'} transition-all duration-300`}>
      <div className="py-1" role="menu" aria-orientation="vertical">
        <div className="px-4 py-2 text-sm text-magic-300 border-b border-magic-700 border-opacity-10">
          {user?.email}
        </div>
        <button
          className="block w-full text-left px-4 py-2 text-sm text-magic-200 hover:bg-magic-700 hover:border-l-2 hover:border-purple-500"
          role="menuitem"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
  
  // Show different content based on login status
  if (loading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-8 h-8 animate-pulse rounded-full bg-magic-700"></div>
      </div>
    );
  }
  
  if (user) {
    // Logged in: show user avatar or initial
    const userInitial = user.displayName?.[0] || user.email?.[0] || '?';
    const isPremium = user.providerData?.[0]?.providerId === 'google.com'; // Assume Google users are premium
    
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={toggleMenu}
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#8b5cf6] text-white font-medium hover:opacity-90 hover:shadow-[0_0_15px_rgba(99,102,241,0.6)] transition-all"
        >
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-full h-full rounded-full object-cover" 
            />
          ) : (
            <span className="text-sm">{userInitial.toUpperCase()}</span>
          )}
          {isPremium && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-[2px]">
              <Crown size={12} className="text-magic-900" />
            </div>
          )}
        </button>
        <UserMenu />
      </div>
    );
  }
  
  // Not logged in: show login button
  return (
    <div className={className}>
      <button
        onClick={handleOpenAuthModal}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-gray-500 to-gray-600 text-white hover:shadow-[0_2px_8px_rgba(79,70,229,0.3)] transition-all transform hover:rotate-[5deg]"
      >
        <UserCircle className="w-5 h-5" />
      </button>
      
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuthModal} />
      )}
    </div>
  );
};

export default LoginButton; 