import { useState, useEffect, useCallback } from 'react';
// Import Firebase User type - might not be needed directly here anymore
// import { User as FirebaseUser } from 'firebase/auth/web-extension'; 
import { 
  authService, 
  User as AppUser, // Keep our renamed User type
  LoginInput, 
  RegisterInput,
  initializeFirebase
} from '../services/auth';
// mapFirebaseUser is likely not needed here anymore as actions.ts handles it
// import { mapFirebaseUser } from '@/services/auth/firebase'; 

// 认证钩子类型
export interface UseAuthReturn {
  // 状态
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  loadingMessage: string | null;
  
  // 操作
  login: (input: LoginInput) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (profile: {displayName?: string; photoURL?: string}) => Promise<void>;
  
  // 检查
  isAuthenticated: boolean;
}

/**
 * 认证钩子，用于管理用户认证状态和提供认证操作
 */
export function useAuth(): UseAuthReturn {
  // 初始化 Firebase
  useEffect(() => {
    try {
      initializeFirebase();
      console.log('Firebase 初始化成功');
    } catch (error) {
      console.error('Firebase 初始化失败:', error);
      setError('Firebase 初始化失败，请重试'); 
    }
  }, []);
  
  // 状态管理
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  
  // 监听认证状态变化
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(
      (appUser: AppUser | null) => { 
        console.log('[useAuth] Auth state changed (AppUser):', appUser);
        setError(null); 
        if (appUser) {
          setLoadingMessage(null);
        } 
        setLoading(false); 
        setUser(appUser);
      }
    );
    
    // 清理函数
    return () => {
      console.log('[useAuth] Unsubscribing from auth state changes.');
      unsubscribe();
    };
  }, []);
  
  // Helper function to reset status before an operation
  const resetStatus = () => {
      setLoading(true);
      setError(null);
      setLoadingMessage(null);
  };
  
  // 登录方法
  const login = useCallback(async (input: LoginInput) => {
    resetStatus();
    try {
      await authService.loginUser(input);
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败，请检查邮箱和密码');
      setLoading(false);
      throw err; 
    }
  }, []);
  
  // Google 登录方法
  const loginWithGoogle = useCallback(async () => {
    resetStatus();
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      console.error('Google 登录失败:', err);
      if (err.message?.includes('trying to log you into your existing Google account')) {
        setLoadingMessage('Welcome back! Retrieving your records, please wait...');
      } else {
      setError(err.message || 'Google 登录失败，请重试');
      setLoading(false);
        throw err;
      } 
    }
  }, []);
  
  // 注册方法
  const register = useCallback(async (input: RegisterInput) => {
    resetStatus();
    try {
      await authService.registerUser(input);
    } catch (err: any) {
      console.error('注册失败:', err);
      if (err.message?.includes('trying to log you into your existing account')) {
         setLoadingMessage('Welcome back! Retrieving your records, please wait...');
      } else {
      setError(err.message || '注册失败，请重试');
      setLoading(false);
         throw err; 
      }
    }
  }, []);
  
  // 登出方法
  const logout = useCallback(async () => {
    resetStatus();
    try {
      await authService.logoutUser();
    } catch (err: any) {
      console.error('登出失败:', err);
      setError(err.message || '登出失败，请重试');
      setLoading(false);
    }
  }, []);
  
  // 重置密码方法
  const resetPassword = useCallback(async (email: string) => {
    resetStatus();
    try {
      await authService.resetPassword(email);
    } catch (err: any) {
      console.error('重置密码失败:', err);
      setError(err.message || '重置密码失败，请重试');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 更新用户资料
  const updateProfile = useCallback(async (profile: {displayName?: string; photoURL?: string}) => {
    resetStatus();
    try {
      await authService.updateUserProfile(profile);
    } catch (err: any) {
      console.error('更新资料失败:', err);
      setError(err.message || '更新资料失败，请重试');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    user,
    loading,
    error,
    loadingMessage,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user && !user.isAnonymous 
  };
} 