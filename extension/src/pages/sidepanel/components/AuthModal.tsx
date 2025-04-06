import React, { useState } from 'react';
import { X, Mail, Lock, User, Search } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'login' | 'register' | 'reset';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { login, register, loginWithGoogle, resetPassword, loading, error } = useAuth();
  
  // Don't render if modal is closed
  if (!isOpen) return null;
  
  // Switch tabs
  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setFormError(null);
    setSuccessMessage(null);
  };
  
  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate form
    if (!email || !password) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    try {
      await login({ email, password });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Login failed, please check your credentials');
    }
  };
  
  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate form
    if (!email || !password || !confirmPassword) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      await register({ email, password, displayName });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Registration failed, please try again');
    }
  };
  
  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    
    if (!email) {
      setFormError('Please enter your email address');
      return;
    }
    
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset link has been sent to your email');
    } catch (err: any) {
      setFormError(err.message || 'Password reset failed, please try again');
    }
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Google login failed, please try again');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-magic-800 to-magic-900 rounded-lg shadow-xl w-full max-w-[350px] fixed top-[50px] left-1/2 transform -translate-x-1/2 overflow-hidden border border-magic-700 border-opacity-30">
        {/* Header bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-magic-700">
          <h2 className="text-xl font-semibold text-magic-100">
            {activeTab === 'login' ? 'Log In' : activeTab === 'register' ? 'Register' : 'Reset Password'}
          </h2>
          <button 
            onClick={onClose}
            className="text-magic-400 hover:text-magic-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tab switching */}
        <div className="flex border-b border-magic-700">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'login'
                ? 'text-magic-200 border-b-2 border-purple-500'
                : 'text-magic-400 hover:text-magic-300'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'register'
                ? 'text-magic-200 border-b-2 border-purple-500'
                : 'text-magic-400 hover:text-magic-300'
            }`}
          >
            Register
          </button>
        </div>
        
        {/* Error alerts */}
        {(formError || error) && (
          <div className="bg-red-500/20 text-red-200 px-4 py-2 text-sm">
            {formError || error}
          </div>
        )}
        
        {/* Success alerts */}
        {successMessage && (
          <div className="bg-green-500/20 text-green-200 px-4 py-2 text-sm">
            {successMessage}
          </div>
        )}
        
        {/* Form content */}
        <div className="p-6">
          {activeTab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-md text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-md text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-gradient-to-r from-magic-600 to-magic-500 hover:from-magic-700 hover:to-magic-600 text-white font-medium rounded-md shadow transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchTab('reset')}
                    className="text-sm text-magic-400 hover:text-magic-300"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {activeTab === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-lg text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <User size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display Name (optional)"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-lg text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-lg text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-lg text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-gradient-to-r from-magic-600 to-magic-500 hover:from-magic-700 hover:to-magic-600 text-white font-medium rounded-md shadow transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          )}
          
          {activeTab === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail size={16} className="text-magic-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full pl-10 pr-4 py-2 bg-magic-700 border border-magic-600 rounded-lg text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-gradient-to-r from-magic-600 to-magic-500 hover:from-magic-700 hover:to-magic-600 text-white font-medium rounded-md shadow transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="text-sm text-magic-400 hover:text-magic-300"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {/* Social login */}
          {activeTab !== 'reset' && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-magic-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-b from-magic-800 to-magic-900 text-magic-500">
                    or
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center py-2 px-4 border border-magic-600 rounded-md shadow-sm text-magic-200 bg-magic-700 hover:bg-magic-600 transition-all"
                  disabled={loading}
                >
                  <Search className="w-4 h-4 mr-2 text-red-500" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 