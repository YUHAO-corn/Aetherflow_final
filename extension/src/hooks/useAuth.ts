/**
 * useAuth 钩子
 * 用于连接认证服务和 UI 组件
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  AuthStatus, 
  registerUser, 
  loginUser, 
  logoutUser, 
  loginWithGoogle,
  getCurrentUser,
  resetPassword,
  updateUserProfile,
  getAuthErrorMessage
} from '../services/auth';
import { firebaseAuthService } from '../services/auth/firebase';

/**
 * 认证钩子返回类型
 */
interface UseAuthReturn {
  // 状态
  user: User | null;
  status: AuthStatus;
  error: string | null;
  
  // 操作函数
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (displayName?: string, photoURL?: string) => Promise<void>;
  clearError: () => void;
}

/**
 * 认证钩子
 * 提供认证状态和操作函数
 */
export function useAuth(): UseAuthReturn {
  // 状态
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.INITIAL);
  const [error, setError] = useState<string | null>(null);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    try {
      setStatus(AuthStatus.LOADING);
      clearError();
      const user = await loginUser(email, password);
      setUser(user);
      setStatus(AuthStatus.AUTHENTICATED);
    } catch (error) {
      setStatus(AuthStatus.UNAUTHENTICATED);
      setError(getAuthErrorMessage(error));
      throw error;
    }
  }, [clearError]);

  // 注册
  const register = useCallback(async (email: string, password: string) => {
    try {
      setStatus(AuthStatus.LOADING);
      clearError();
      const user = await registerUser(email, password);
      setUser(user);
      setStatus(AuthStatus.AUTHENTICATED);
    } catch (error) {
      setStatus(AuthStatus.UNAUTHENTICATED);
      setError(getAuthErrorMessage(error));
      throw error;
    }
  }, [clearError]);

  // 谷歌登录
  const googleLogin = useCallback(async () => {
    try {
      setStatus(AuthStatus.LOADING);
      clearError();
      const user = await loginWithGoogle();
      setUser(user);
      setStatus(AuthStatus.AUTHENTICATED);
    } catch (error) {
      setStatus(AuthStatus.UNAUTHENTICATED);
      setError(getAuthErrorMessage(error));
      throw error;
    }
  }, [clearError]);

  // 登出
  const logout = useCallback(async () => {
    try {
      setStatus(AuthStatus.LOADING);
      clearError();
      await logoutUser();
      setUser(null);
      setStatus(AuthStatus.UNAUTHENTICATED);
    } catch (error) {
      setError(getAuthErrorMessage(error));
      // 即使登出失败，也将状态设为未认证
      setStatus(AuthStatus.UNAUTHENTICATED);
      throw error;
    }
  }, [clearError]);

  // 重置密码
  const resetPasswordFn = useCallback(async (email: string) => {
    try {
      clearError();
      await resetPassword(email);
    } catch (error) {
      setError(getAuthErrorMessage(error));
      throw error;
    }
  }, [clearError]);

  // 更新用户资料
  const updateProfileFn = useCallback(async (displayName?: string, photoURL?: string) => {
    try {
      clearError();
      await updateUserProfile(displayName, photoURL);
      // 更新本地用户状态
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
    } catch (error) {
      setError(getAuthErrorMessage(error));
      throw error;
    }
  }, [clearError]);

  // 监听认证状态变化
  useEffect(() => {
    console.log('[useAuth] 设置认证状态监听器');
    setStatus(AuthStatus.LOADING);
    
    // 首次加载检查用户状态
    getCurrentUser().then(user => {
      setUser(user);
      setStatus(user ? AuthStatus.AUTHENTICATED : AuthStatus.UNAUTHENTICATED);
    }).catch(error => {
      console.error('[useAuth] 获取当前用户失败:', error);
      setStatus(AuthStatus.UNAUTHENTICATED);
    });
    
    // 监听认证状态变化
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      console.log('[useAuth] 认证状态变化:', user ? `用户 ${user.uid}` : '无用户');
      setUser(user);
      setStatus(user ? AuthStatus.AUTHENTICATED : AuthStatus.UNAUTHENTICATED);
    });
    
    // 组件卸载时取消监听
    return () => {
      console.log('[useAuth] 清除认证状态监听器');
      unsubscribe();
    };
  }, []);

  return {
    user,
    status,
    error,
    login,
    register,
    logout,
    loginWithGoogle: googleLogin,
    resetPassword: resetPasswordFn,
    updateProfile: updateProfileFn,
    clearError
  };
} 