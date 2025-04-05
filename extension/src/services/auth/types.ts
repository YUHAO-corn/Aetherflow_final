/**
 * 认证服务的类型定义
 */

// 用户信息类型
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
}

// 认证服务接口
export interface AuthService {
  // 用户注册
  registerUser(email: string, password: string): Promise<User>;
  
  // 用户登录
  loginUser(email: string, password: string): Promise<User>;
  
  // 第三方登录(Google)
  loginWithGoogle(): Promise<User>;
  
  // 用户登出
  logoutUser(): Promise<void>;
  
  // 获取当前用户
  getCurrentUser(): Promise<User | null>;
  
  // 重置密码
  resetPassword(email: string): Promise<void>;
  
  // 更新用户资料
  updateUserProfile(displayName?: string, photoURL?: string): Promise<void>;
  
  // 监听认证状态变化
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}

// 认证错误类型
export enum AuthErrorCode {
  INVALID_EMAIL = 'auth/invalid-email',
  USER_DISABLED = 'auth/user-disabled',
  USER_NOT_FOUND = 'auth/user-not-found',
  WRONG_PASSWORD = 'auth/wrong-password',
  EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
  WEAK_PASSWORD = 'auth/weak-password',
  OPERATION_NOT_ALLOWED = 'auth/operation-not-allowed',
  POPUP_CLOSED_BY_USER = 'auth/popup-closed-by-user',
  UNAUTHORIZED_DOMAIN = 'auth/unauthorized-domain',
  NETWORK_ERROR = 'auth/network-request-failed',
  TOO_MANY_REQUESTS = 'auth/too-many-requests',
  INTERNAL_ERROR = 'auth/internal-error',
  REQUIRES_RECENT_LOGIN = 'auth/requires-recent-login',
  UNKNOWN = 'auth/unknown'
}

// 认证错误类
export class AuthError extends Error {
  code: AuthErrorCode;
  
  constructor(code: string, message: string) {
    super(message);
    this.code = (Object.values(AuthErrorCode).includes(code as AuthErrorCode))
      ? code as AuthErrorCode
      : AuthErrorCode.UNKNOWN;
    this.name = 'AuthError';
  }
}

// 认证状态类型
export enum AuthStatus {
  INITIAL = 'initial',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  LOADING = 'loading'
} 