/**
 * Firebase 认证服务实现
 */
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';
import { AuthError, AuthService, User } from './types';

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 将 Firebase 用户转换为应用用户
const mapFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL,
  isAnonymous: firebaseUser.isAnonymous,
  emailVerified: firebaseUser.emailVerified
});

/**
 * Firebase 认证服务实现
 */
export class FirebaseAuthService implements AuthService {
  /**
   * 用户注册
   * @param email 邮箱
   * @param password 密码
   */
  async registerUser(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      throw new AuthError(
        error.code || 'auth/unknown',
        error.message || '注册失败，请重试'
      );
    }
  }

  /**
   * 用户登录
   * @param email 邮箱
   * @param password 密码
   */
  async loginUser(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      throw new AuthError(
        error.code || 'auth/unknown',
        error.message || '登录失败，请检查邮箱和密码'
      );
    }
  }

  /**
   * Google 登录
   */
  async loginWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      throw new AuthError(
        error.code || 'auth/unknown',
        error.message || 'Google 登录失败，请重试'
      );
    }
  }

  /**
   * 用户登出
   */
  async logoutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new AuthError(
        error.code || 'auth/unknown',
        error.message || '登出失败，请重试'
      );
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = fbOnAuthStateChanged(auth, (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          resolve(mapFirebaseUser(firebaseUser));
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * 重置密码
   * @param email 邮箱
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new AuthError(
        error.code || 'auth/unknown',
        error.message || '发送重置密码邮件失败，请检查邮箱是否正确'
      );
    }
  }

  /**
   * 更新用户资料
   * @param displayName 显示名称
   * @param photoURL 头像 URL
   */
  async updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      await updateProfile(currentUser, {
        displayName: displayName || currentUser.displayName,
        photoURL: photoURL || currentUser.photoURL
      });
    } catch (error: any) {
      throw new AuthError(
        error.code || 'auth/unknown',
        error.message || '更新用户资料失败，请重试'
      );
    }
  }

  /**
   * 监听认证状态变化
   * @param callback 回调函数
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return fbOnAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        callback(mapFirebaseUser(firebaseUser));
      } else {
        callback(null);
      }
    });
  }
}

// 导出 Firebase 认证服务实例
export const firebaseAuthService = new FirebaseAuthService(); 