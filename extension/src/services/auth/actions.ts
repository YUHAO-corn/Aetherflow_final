/**
 * 认证服务操作函数
 * 这些函数是对 Firebase 认证服务的进一步封装
 * 主要用于处理一些业务逻辑，如错误处理、日志记录等
 */
import { firebaseAuthService } from './firebase';
import { User, AuthError } from './types';

/**
 * 注册新用户
 * @param email 邮箱
 * @param password 密码
 * @returns 注册成功的用户信息
 */
export async function registerUser(email: string, password: string): Promise<User> {
  try {
    console.log('[Auth] 开始注册新用户:', email);
    const user = await firebaseAuthService.registerUser(email, password);
    console.log('[Auth] 用户注册成功:', user.uid);
    return user;
  } catch (error) {
    console.error('[Auth] 用户注册失败:', error);
    throw error;
  }
}

/**
 * 用户登录
 * @param email 邮箱
 * @param password 密码
 * @returns 登录成功的用户信息
 */
export async function loginUser(email: string, password: string): Promise<User> {
  try {
    console.log('[Auth] 开始用户登录:', email);
    const user = await firebaseAuthService.loginUser(email, password);
    console.log('[Auth] 用户登录成功:', user.uid);
    return user;
  } catch (error) {
    console.error('[Auth] 用户登录失败:', error);
    throw error;
  }
}

/**
 * 使用 Google 登录
 * @returns 登录成功的用户信息
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    console.log('[Auth] 开始 Google 登录');
    const user = await firebaseAuthService.loginWithGoogle();
    console.log('[Auth] Google 登录成功:', user.uid);
    return user;
  } catch (error) {
    console.error('[Auth] Google 登录失败:', error);
    throw error;
  }
}

/**
 * 用户登出
 */
export async function logoutUser(): Promise<void> {
  try {
    console.log('[Auth] 开始用户登出');
    await firebaseAuthService.logoutUser();
    console.log('[Auth] 用户登出成功');
  } catch (error) {
    console.error('[Auth] 用户登出失败:', error);
    throw error;
  }
}

/**
 * 获取当前用户
 * @returns 当前用户信息或 null（未登录）
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await firebaseAuthService.getCurrentUser();
    if (user) {
      console.log('[Auth] 获取当前用户成功:', user.uid);
    } else {
      console.log('[Auth] 当前没有登录用户');
    }
    return user;
  } catch (error) {
    console.error('[Auth] 获取当前用户失败:', error);
    return null;
  }
}

/**
 * 重置密码
 * @param email 邮箱
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    console.log('[Auth] 开始发送密码重置邮件:', email);
    await firebaseAuthService.resetPassword(email);
    console.log('[Auth] 密码重置邮件发送成功');
  } catch (error) {
    console.error('[Auth] 密码重置邮件发送失败:', error);
    throw error;
  }
}

/**
 * 更新用户资料
 * @param displayName 显示名称
 * @param photoURL 头像 URL
 */
export async function updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
  try {
    console.log('[Auth] 开始更新用户资料');
    await firebaseAuthService.updateUserProfile(displayName, photoURL);
    console.log('[Auth] 用户资料更新成功');
  } catch (error) {
    console.error('[Auth] 用户资料更新失败:', error);
    throw error;
  }
}

/**
 * 获取易于理解的错误信息
 * @param error 认证错误
 * @returns 友好的错误信息
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return '邮箱格式不正确';
      case 'auth/user-disabled':
        return '该用户已被禁用';
      case 'auth/user-not-found':
        return '用户不存在';
      case 'auth/wrong-password':
        return '密码错误';
      case 'auth/email-already-in-use':
        return '该邮箱已被使用';
      case 'auth/weak-password':
        return '密码强度不够，请使用至少6个字符';
      case 'auth/operation-not-allowed':
        return '操作不被允许';
      case 'auth/popup-closed-by-user':
        return '登录窗口被关闭';
      case 'auth/unauthorized-domain':
        return '未授权的域名';
      case 'auth/network-request-failed':
        return '网络请求失败，请检查网络连接';
      case 'auth/too-many-requests':
        return '请求次数过多，请稍后再试';
      case 'auth/requires-recent-login':
        return '此操作需要重新登录，请退出后重新登录';
      default:
        return error.message;
    }
  }
  
  return '发生未知错误，请重试';
} 