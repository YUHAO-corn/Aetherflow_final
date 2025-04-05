/**
 * 认证服务统一导出
 */

// 导出类型
export type { User, AuthService } from './types';
export { AuthError, AuthErrorCode, AuthStatus } from './types';

// 导出 Firebase 服务实例
export { firebaseAuthService } from './firebase';

// 导出认证操作函数
export {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  getCurrentUser,
  resetPassword,
  updateUserProfile,
  getAuthErrorMessage
} from './actions';

// 提供默认认证服务
import { firebaseAuthService } from './firebase';
export default firebaseAuthService; 