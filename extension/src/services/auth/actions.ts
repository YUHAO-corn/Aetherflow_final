import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInAnonymously
} from 'firebase/auth/web-extension';
import { getFirebaseAuth, mapFirebaseUser } from './firebase';
import { AuthService, LoginInput, RegisterInput, User } from './types';
import { handleSessionEnd } from './sessionManager';

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
      
      return appUser;
    } catch (error: any) {
      console.error('登录失败:', error);
      throw new Error(error.message || '登录失败，请检查邮箱和密码');
    }
  },
  
  // Google 登录 (重构后)
  async loginWithGoogle(): Promise<User> {
    console.log('[AuthService] 发起 Google 登录请求...');
    return new Promise((resolve, reject) => {
      // 向后台脚本发送登录请求消息
      chrome.runtime.sendMessage({ type: 'LOGIN_WITH_GOOGLE' }, (response) => {
        if (chrome.runtime.lastError) {
          // 消息发送失败或后台脚本出错
          console.error('[AuthService] Google 登录消息发送失败:', chrome.runtime.lastError);
          return reject(new Error('无法连接到后台服务进行登录: ' + chrome.runtime.lastError.message));
        }

        if (response && response.success) {
          console.log('[AuthService] Google 登录成功，收到用户信息:', response.user);
          // 后台脚本成功后应返回 { success: true, user: User }
          // 无需在此处保存状态，后台 signInWithCredential 会触发 onAuthStateChanged
          resolve(response.user as User);
        } else {
          // 后台脚本返回失败或无效响应
          const errorMessage = response?.error?.message || '未知错误';
          console.error('[AuthService] Google 登录失败:', errorMessage, response?.error);
          reject(new Error(`Google 登录失败: ${errorMessage}`));
        }
      });
    });
  },
  
  // 登出
  async logoutUser(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error: any) {
      console.error('登出失败:', error);
      throw new Error(error.message || '登出失败，请重试');
    }
  },
  
  // 获取当前用户
  async getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const auth = getFirebaseAuth();
      // 尝试获取当前用户，如果存在则直接返回
      if (auth.currentUser) {
        console.log('[AuthService] getCurrentUser: Found currentUser directly.');
        resolve(mapFirebaseUser(auth.currentUser));
        return;
      }
      // 如果不存在，则监听一次状态变化
      console.log('[AuthService] getCurrentUser: No currentUser, subscribing once to onAuthStateChanged.');
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe(); // 立即取消订阅
        if (user) {
          console.log('[AuthService] getCurrentUser: Received user from onAuthStateChanged.');
          resolve(mapFirebaseUser(user));
        } else {
          console.log('[AuthService] getCurrentUser: Still no user after onAuthStateChanged check.');
          // 移除从 storage 加载的逻辑
          resolve(null);
        }
      }, (error) => {
        console.error('获取当前用户时 onAuthStateChanged 出错:', error);
        resolve(null); // 出错也返回 null
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
    } catch (error: any) {
      console.error('更新用户资料失败:', error);
      throw new Error(error.message || '更新用户资料失败，请重试');
    }
  },
  
  // 观察认证状态变化
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    let isSigningInAnonymously = false; // 添加一个标志防止重复匿名登录

    const unsubscribe = fbOnAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('[AuthService] onAuthStateChanged: User found', 
                    firebaseUser.uid, 
                    `isAnonymous: ${firebaseUser.isAnonymous}`);
        isSigningInAnonymously = false; // 重置标志
        const appUser = mapFirebaseUser(firebaseUser);
        callback(appUser);
      } else {
        console.log('[AuthService] onAuthStateChanged: No user found.');
        // 用户登出或初始未登录
        callback(null);

        // 修正: 如果当前没有用户且没有正在尝试匿名登录，则尝试匿名登录
        if (!isSigningInAnonymously) {
          console.log('[AuthService] Attempting anonymous sign-in...');
          isSigningInAnonymously = true;
          signInAnonymously(auth)
            .then((userCredential) => {
              // 匿名登录成功会再次触发 onAuthStateChanged
              console.log('[AuthService] Anonymous sign-in successful.', userCredential.user.uid);
              // 不需要在这里 callback，等待下一次 onAuthStateChanged 触发
            })
            .catch((error) => {
              console.error('[AuthService] Anonymous sign-in failed:', error);
              isSigningInAnonymously = false; // 登录失败，重置标志允许重试
            })
            .finally(() => {
              // 移除 finally 里的重置，因为成功后需要等 onAuthStateChanged 触发来重置
              // isSigningInAnonymously = false; 
            });
        } else {
          console.log('[AuthService] Already attempting anonymous sign-in, skipping.')
        }
        
        // 调用会话结束处理函数 (如果需要的话，可以在匿名登录尝试前或后调用)
        handleSessionEnd().catch(error => {
           console.error('处理会话结束时发生错误:', error);
        });
      }
    }, (error: Error) => {
      console.error('认证状态观察错误:', error);
      callback(null);
      isSigningInAnonymously = false; // 出错时也重置标志
    });
    
    // 初始检查：如果启动时就没有用户，也触发一次匿名登录尝试
    // 这可以加速初始匿名登录过程，避免等待 onAuthStateChanged 首次回调
    if (!auth.currentUser && !isSigningInAnonymously) {
      console.log('[AuthService] Initial check: No user, attempting anonymous sign-in...');
      isSigningInAnonymously = true;
      signInAnonymously(auth)
        .then((userCredential) => {
          console.log('[AuthService] Initial anonymous sign-in successful.', userCredential.user.uid);
        })
        .catch((error) => {
          console.error('[AuthService] Initial anonymous sign-in failed:', error);
          isSigningInAnonymously = false; 
        });
    }

    return unsubscribe;
  },
  
  // 检查是否已认证
  isAuthenticated(): boolean {
    const auth = getFirebaseAuth();
    return !!auth.currentUser;
  },

  /**
   * 生成带认证令牌的官网URL
   * 用于从扩展无缝跳转到官网并自动登录
   * @param targetPath 目标页面路径，如 '/pricing.html'
   * @param params 额外的URL参数
   * @returns 包含认证令牌的完整URL
   */
  async generateWebsiteAuthUrl(targetPath: string, params?: Record<string, string>): Promise<string> {
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      console.log('[Auth Debug] 开始生成带认证的网站URL，目标路径:', targetPath);
      
      if (!currentUser) {
        // 如果用户未登录，则只返回带参数的基础URL，不附加令牌
        console.warn('[Auth Debug] 用户未登录，无法生成带认证的URL，将跳转普通URL');
        const baseUrl = 'https://aetherflow-app.com'; // 更新为正式域名
        let url = `${baseUrl}${targetPath}`;
        if (params) {
          const urlParams = new URLSearchParams(params);
          url = `${url}?${urlParams.toString()}`;
        }
        console.log('[Auth Debug] 生成的普通URL:', url);
        return url;
      }
      
      console.log('[Auth Debug] 用户已登录，UID:', currentUser.uid);
      
      // 获取用户 Firebase ID Token
      console.log('[Auth Debug] 正在获取用户ID Token...');
      const idToken = await currentUser.getIdToken(/* forceRefresh */ true);
      console.log('[Auth Debug] 成功获取ID Token，长度:', idToken.length);
      
      // 构建基础URL - 更新为正式域名
      const baseUrl = 'https://aetherflow-app.com'; 
      let url = `${baseUrl}${targetPath}`;
      
      // 构建查询参数
      const urlParams = new URLSearchParams();
      urlParams.set('idToken', idToken); // 使用 idToken 作为参数名
      
      // 添加额外参数
      if (params) {
        console.log('[Auth Debug] 添加额外参数:', Object.keys(params).join(', '));
        Object.entries(params).forEach(([key, value]) => {
          urlParams.set(key, value);
        });
      }
      
      // 组合最终URL
      url = `${url}?${urlParams.toString()}`;
      
      // 只记录不带敏感信息的URL（截断token部分）
      const urlForLog = url.replace(/idToken=([^&]{10}).*?(&|$)/, 'idToken=$1...$2');
      console.log('[Auth Debug] 生成的认证URL:', urlForLog);
      
      return url;
    } catch (error: any) {
      console.error('[Auth Debug] 生成认证URL失败:', error);
      // 失败时返回不带令牌的基础URL
      const baseUrl = 'https://aetherflow-app.com';
      let url = `${baseUrl}${targetPath}`;
      if (params) {
        const urlParams = new URLSearchParams(params);
        url = `${url}?${urlParams.toString()}`;
      }
      console.log('[Auth Debug] 生成的降级URL:', url);
      return url; 
      // 或者可以抛出错误让调用处处理
      // throw new Error(error.message || '生成认证URL失败');
    }
  }
}; 