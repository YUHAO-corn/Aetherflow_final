import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirebaseAuth, createGoogleProvider, mapFirebaseUser } from './firebase';
import { AuthService, LoginInput, RegisterInput, User } from './types';

// 保存用户认证状态到 Chrome 存储
const saveAuthStateToStorage = async (user: User | null) => {
  try {
    if (user) {
      // 保存用户信息到 Chrome 存储，但不包含敏感信息
      await chrome.storage.local.set({ 'auth_user': user });
      console.log('用户认证状态已保存到存储');
    } else {
      // 清除存储中的用户信息
      await chrome.storage.local.remove('auth_user');
      console.log('用户认证状态已从存储中清除');
    }
  } catch (error) {
    console.error('保存认证状态失败:', error);
  }
};

// 从 Chrome 存储加载用户认证状态
export const loadAuthStateFromStorage = async (): Promise<User | null> => {
  try {
    const result = await chrome.storage.local.get('auth_user');
    return result.auth_user || null;
  } catch (error) {
    console.error('加载认证状态失败:', error);
    return null;
  }
};

// 认证服务实现
export const authService: AuthService = {
  // 用户注册
  async registerUser(input: RegisterInput): Promise<User> {
    try {
      const auth = getFirebaseAuth();
      const { email, password, displayName } = input;
      
      // 创建用户
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // 如果提供了显示名称，则更新用户资料
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // 转换为应用 User 类型
      const appUser = mapFirebaseUser(user);
      
      // 保存到 Chrome 存储
      await saveAuthStateToStorage(appUser);
      
      return appUser;
    } catch (error: any) {
      console.error('注册失败:', error);
      throw new Error(error.message || '注册失败，请重试');
    }
  },
  
  // 用户登录
  async loginUser(input: LoginInput): Promise<User> {
    try {
      const auth = getFirebaseAuth();
      const { email, password } = input;
      
      // 登录
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // 转换为应用 User 类型
      const appUser = mapFirebaseUser(user);
      
      // 保存到 Chrome 存储
      await saveAuthStateToStorage(appUser);
      
      return appUser;
    } catch (error: any) {
      console.error('登录失败:', error);
      throw new Error(error.message || '登录失败，请检查邮箱和密码');
    }
  },
  
  // Google 登录
  async loginWithGoogle(): Promise<User> {
    try {
      const auth = getFirebaseAuth();
      const provider = createGoogleProvider();
      
      // 弹出窗口进行 Google 登录
      const { user } = await signInWithPopup(auth, provider);
      
      // 转换为应用 User 类型
      const appUser = mapFirebaseUser(user);
      
      // 保存到 Chrome 存储
      await saveAuthStateToStorage(appUser);
      
      return appUser;
    } catch (error: any) {
      console.error('Google 登录失败:', error);
      throw new Error(error.message || 'Google 登录失败，请重试');
    }
  },
  
  // 登出
  async logoutUser(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      
      // 清除 Chrome 存储中的用户信息
      await saveAuthStateToStorage(null);
    } catch (error: any) {
      console.error('登出失败:', error);
      throw new Error(error.message || '登出失败，请重试');
    }
  },
  
  // 获取当前用户
  async getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const auth = getFirebaseAuth();
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe(); // 立即取消订阅，我们只需要当前状态
        
        if (user) {
          const appUser = mapFirebaseUser(user);
          resolve(appUser);
        } else {
          // 如果 Firebase 没有记录用户，尝试从 Chrome 存储中获取
          loadAuthStateFromStorage().then(storedUser => {
            resolve(storedUser);
          });
        }
      }, (error) => {
        console.error('获取当前用户失败:', error);
        resolve(null);
      });
    });
  },
  
  // 重置密码
  async resetPassword(email: string): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('重置密码失败:', error);
      throw new Error(error.message || '重置密码失败，请重试');
    }
  },
  
  // 删除用户账户
  async deleteAccount(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('没有登录的用户');
      }
      
      await deleteUser(currentUser);
      
      // 清除 Chrome 存储中的用户信息
      await saveAuthStateToStorage(null);
    } catch (error: any) {
      console.error('删除账户失败:', error);
      throw new Error(error.message || '删除账户失败，请重试');
    }
  },
  
  // 更新用户资料
  async updateUserProfile(profile: {displayName?: string; photoURL?: string}): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('没有登录的用户');
      }
      
      await updateProfile(currentUser, profile);
      
      // 更新 Chrome 存储中的用户信息
      const updatedUser = mapFirebaseUser(currentUser);
      await saveAuthStateToStorage(updatedUser);
    } catch (error: any) {
      console.error('更新用户资料失败:', error);
      throw new Error(error.message || '更新用户资料失败，请重试');
    }
  },
  
  // 观察认证状态变化
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    
    // 添加观察者
    const unsubscribe = fbOnAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const appUser = mapFirebaseUser(firebaseUser);
        // 同时更新 Chrome 存储
        saveAuthStateToStorage(appUser).then(() => {
          callback(appUser);
        });
      } else {
        // 清除 Chrome 存储中的用户信息
        saveAuthStateToStorage(null).then(() => {
          callback(null);
        });
      }
    }, (error: Error) => {
      console.error('认证状态观察错误:', error);
      callback(null);
    });
    
    // 返回取消订阅函数
    return unsubscribe;
  },
  
  // 检查是否已认证
  isAuthenticated(): boolean {
    const auth = getFirebaseAuth();
    return !!auth.currentUser;
  }
}; 