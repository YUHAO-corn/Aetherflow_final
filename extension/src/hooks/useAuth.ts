import { useState, useEffect, useCallback } from 'react';
import { 
  authService, 
  User, 
  LoginInput, 
  RegisterInput,
  initializeFirebase
} from '../services/auth';

// 认证钩子类型
export interface UseAuthReturn {
  // 状态
  user: User | null;
  loading: boolean;
  error: string | null;
  
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 加载初始用户状态
  useEffect(() => {
    const loadInitialUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err: any) {
        console.error('加载用户状态失败:', err);
        setError(err.message || '加载用户状态失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialUser();
  }, []);
  
  // 监听认证状态变化
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    
    // 清理函数
    return () => {
      unsubscribe();
    };
  }, []);
  
  // 登录方法
  const login = useCallback(async (input: LoginInput) => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.loginUser(input);
      // 不需要设置 user，因为 onAuthStateChanged 会处理
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败，请检查邮箱和密码');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Google 登录方法
  const loginWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.loginWithGoogle();
      // 不需要设置 user，因为 onAuthStateChanged 会处理
    } catch (err: any) {
      console.error('Google 登录失败:', err);
      setError(err.message || 'Google 登录失败，请重试');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 注册方法
  const register = useCallback(async (input: RegisterInput) => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.registerUser(input);
      // 不需要设置 user，因为 onAuthStateChanged 会处理
    } catch (err: any) {
      console.error('注册失败:', err);
      setError(err.message || '注册失败，请重试');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 登出方法
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.logoutUser();
      // 不需要设置 user，因为 onAuthStateChanged 会处理
    } catch (err: any) {
      console.error('登出失败:', err);
      setError(err.message || '登出失败，请重试');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 重置密码方法
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
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
    try {
      setLoading(true);
      setError(null);
      
      await authService.updateUserProfile(profile);
      // 不需要设置 user，因为 onAuthStateChanged 会处理
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
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user
  };
} 