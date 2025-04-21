import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Search } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { getFirebaseAuth } from '../../../services/auth/firebase';
import { EmailAuthProvider, linkWithCredential } from 'firebase/auth/web-extension';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'login' | 'register' | 'reset';

const AuthDrawer: React.FC<AuthDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { loginWithGoogle, resetPassword, loading, error, user: currentUser } = useAuth();
  const [internalLoading, setInternalLoading] = useState(false);
  
  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('login');
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  // Switch tabs
  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setFormError(null);
    setSuccessMessage(null);
  };
  
  // Function to map Firebase error codes to friendly messages
  const getFriendlyErrorMessage = (err: any): string => {
    const defaultMessage = "An unexpected error occurred. Please try again later.";
    if (!err || !err.code) {
      return err.message || defaultMessage;
    }

    console.log(`[AuthModal] Mapping error code: ${err.code}`); // Keep log for debugging

    switch (err.code) {
      // Login Errors
      case 'auth/invalid-credential': // Covers user-not-found and wrong-password in v9+
        return "Invalid email or password. Please check your details and try again.";
      case 'auth/user-disabled':
        return "This account has been disabled. Please contact support.";
      case 'auth/too-many-requests':
        return "Access temporarily disabled due to too many failed login attempts. You can reset your password or try again later.";

      // Registration/Linking Errors
      case 'auth/email-already-in-use':
        return "An account with this email address already exists. Please log in or use the 'Forgot Password?' option.";
      case 'auth/weak-password':
        return "Password is too weak. It must be at least 6 characters long.";
      case 'auth/invalid-email':
          return "The email address is not valid. Please enter a correct email.";

      // Linking Specific Errors
      case 'auth/credential-already-in-use':
        return "This email or Google account is already linked to another AetherFlow account. Please sign in with that account instead.";
      case 'auth/provider-already-linked': // Should not happen with current flow, but good to have
        return "This account is already linked with this provider.";
      case 'auth/requires-recent-login': // For sensitive operations like changing email/password after linking
        return "This operation requires you to have logged in recently. Please log out and log back in.";

      // Google Sign-in Errors (from background script)
      case 'auth/identity-error':
      case 'auth/cancelled': // User closed popup or error in flow
          return err.message || "Google Sign-in could not be completed. Please try again."; // Use message from background if available
      // 'auth/credential-already-in-use' is handled above

      // Network Error
      case 'auth/network-request-failed':
        return "Network error. Please check your internet connection and try again.";

      default:
        // For other errors, log the code and show a generic message
        console.error(`[AuthModal] Unhandled error code: ${err.code}`, err);
        return defaultMessage;
    }
  };
  
  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    
    if (!email || !password) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    setInternalLoading(true);
    try {
      const auth = getFirebaseAuth();
      const credential = EmailAuthProvider.credential(email, password);

      if (auth.currentUser && auth.currentUser.isAnonymous) {
        console.log('[AuthModal] Linking anonymous user with email/password...');
        await linkWithCredential(auth.currentUser, credential);
        console.log('[AuthModal] Anonymous account linked successfully.');
      } else {
        const { signInWithEmailAndPassword } = await import('firebase/auth/web-extension');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('[AuthModal] Regular login successful.');
      }
      
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Login/Link failed:', err);
      setFormError(getFriendlyErrorMessage(err));
    } finally {
      setInternalLoading(false);
    }
  };
  
  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    
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
    
    setInternalLoading(true);
    try {
      const auth = getFirebaseAuth();
      const credential = EmailAuthProvider.credential(email, password);

      if (auth.currentUser && auth.currentUser.isAnonymous) {
        console.log('[AuthModal] Linking anonymous user with new email/password...');
        await linkWithCredential(auth.currentUser, credential);
        if (displayName && auth.currentUser) {
          const { updateProfile } = await import('firebase/auth/web-extension');
          await updateProfile(auth.currentUser, { displayName });
        }
        console.log('[AuthModal] Anonymous account linked and profile updated (if provided).');
      } else {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth/web-extension');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        console.log('[AuthModal] Regular registration successful.');
      }
      
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Register/Link failed:', err);
      setFormError(getFriendlyErrorMessage(err));
    } finally {
       setInternalLoading(false);
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
    
    setInternalLoading(true);
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset link has been sent to your email');
    } catch (err: any) {
      console.error('[AuthModal] Reset Password failed:', err);
      setFormError(getFriendlyErrorMessage(err));
    } finally {
      setInternalLoading(false);
    }
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    setFormError(null);
    setSuccessMessage(null);
    setInternalLoading(true);
    console.log('[AuthModal] Initiating Google Login flow...');
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Google login/link failed:', err);
      setFormError(getFriendlyErrorMessage(err));
    } finally {
        setInternalLoading(false);
    }
  };
  
  return (
    <>
      {/* Drawer backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-drawer-backdrop ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>
      
      {/* Drawer container */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-gradient-to-b from-magic-800 to-magic-900 shadow-xl border-l border-magic-700/30 transform transition-transform duration-300 ease-in-out z-drawer-container ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-magic-700/30">
          <h2 className="text-xl font-semibold text-magic-100">
            {activeTab === 'login' ? 'Log In' : activeTab === 'register' ? 'Register' : 'Reset Password'}
          </h2>
          <button 
            onClick={onClose}
            className="text-magic-400 hover:text-magic-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
          {/* Tab switching */}
          <div className="flex border-b border-magic-700/30">
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
          {(formError) && (
            <div className="bg-red-500/20 text-red-200 px-4 py-2 text-sm">
              {formError}
            </div>
          )}
          
          {/* Success alerts */}
          {successMessage && (
            <div className="bg-green-500/20 text-green-200 px-4 py-2 text-sm">
              {successMessage}
            </div>
          )}
          
          {/* Form content */}
          <div className="p-6 flex-1">
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
                      disabled={internalLoading}
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
                      disabled={internalLoading}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-gradient-to-r from-magic-600 to-magic-500 hover:from-magic-700 hover:to-magic-600 text-white font-medium rounded-md shadow transition-all disabled:opacity-50"
                    disabled={internalLoading}
                  >
                    {internalLoading ? 'Logging in...' : 'Log In'}
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
                      disabled={internalLoading}
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
                      disabled={internalLoading}
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
                      disabled={internalLoading}
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
                      disabled={internalLoading}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-gradient-to-r from-magic-600 to-magic-500 hover:from-magic-700 hover:to-magic-600 text-white font-medium rounded-md shadow transition-all disabled:opacity-50"
                    disabled={internalLoading}
                  >
                    {internalLoading ? 'Registering...' : 'Register'}
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
                      disabled={internalLoading}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-gradient-to-r from-magic-600 to-magic-500 hover:from-magic-700 hover:to-magic-600 text-white font-medium rounded-md shadow transition-all disabled:opacity-50"
                    disabled={internalLoading}
                  >
                    {internalLoading ? 'Sending...' : 'Send Reset Link'}
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
              <div className="mt-6">
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
                    disabled={internalLoading}
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
    </>
  );
};

export default AuthDrawer; 