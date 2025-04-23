import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth/web-extension';
import { getFirebaseAuth, mapFirebaseUser } from './firebase';
import { AuthService, LoginInput, RegisterInput, User } from './types';
import { handleSessionEnd } from './sessionManager';

// 认证服务实现
export const authService: AuthService = {
  // 用户注册
  async registerUser(input: RegisterInput): Promise<User> {
      const auth = getFirebaseAuth();
      const { email, password, displayName } = input;
    let userCredential; // Use let to assign later

    try {
      const currentUser = auth.currentUser;

      // Check if there is a currently signed-in anonymous user
      if (currentUser && currentUser.isAnonymous) {
        console.log('[AuthService] Linking email/password to anonymous user...');
        // Create credentials for email/password linking
        const credential = EmailAuthProvider.credential(email, password);
        
        // Link the credential to the anonymous user
        userCredential = await linkWithCredential(currentUser, credential);
        console.log('[AuthService] Anonymous user successfully linked with email/password.');
      } else {
        console.log('[AuthService] Creating new user with email/password...');
        // No anonymous user, create a new user as before
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      const user = userCredential.user; // Get the user from the credential

      // 如果提供了显示名称，并且是新创建的用户或者链接后需要更新
      // (linkWithCredential 也会返回最新的 User 对象，可以更新)
      if (displayName) {
        // Check if profile update is needed (optional, but good practice)
        if (user.displayName !== displayName) { 
          console.log(`[AuthService] Updating profile for user ${user.uid}...`);
        await updateProfile(user, { displayName });
      }
      }
      
      // 转换为应用 User 类型 (使用更新后的 user 对象)
      // 需要重新获取最新的 user 对象，因为它可能已被 updateProfile 更新
      const updatedUser = auth.currentUser; 
      if (!updatedUser) {
         throw new Error("User not found after registration/linking.");
      }
      const appUser = mapFirebaseUser(updatedUser); 
      
      return appUser;
    } catch (error: any) {
      console.error('注册/链接失败:', error.code, error.message);

      // --- Auto Sign-in Logic for Existing Email --- 
      // Check if the error is specifically credential-already-in-use during the linking phase
      const currentUser = auth.currentUser; // Re-check current user state within catch
      if (error.code === 'auth/credential-already-in-use' && currentUser && currentUser.isAnonymous) {
        console.log('[AuthService] Credential already in use detected during anonymous link. Attempting standard login...');
        try {
          // Step 1: Sign out the anonymous user silently
          await authService.logoutUser(); // Use authService instance to call logout
          console.log('[AuthService] Anonymous user signed out successfully.');
          
          // Step 2: Attempt to sign in with the provided email and password
          console.log('[AuthService] Attempting sign-in with existing credentials...');
          const loggedInUser = await authService.loginUser({ email, password }); // Use authService instance
          console.log('[AuthService] Successfully signed in existing user after conflict.');
          
          // If login is successful, return the logged-in user
          // Note: Display name update won't happen in this path, but the user is logged in.
          return loggedInUser;
          
        } catch (signInError: any) {
          // Handle errors during the sign-out or sign-in attempt
          console.error('[AuthService] Error during automatic sign-in after conflict:', signInError);
          // Throw a specific error for the UI to potentially handle differently
          throw new Error('An error occurred while trying to log you into your existing account. Please try logging in directly.'); 
        }
      }
      // --- End Auto Sign-in Logic ---

      // Handle other specific errors or re-throw generic error
      if (error.code === 'auth/email-already-in-use') {
        // This case might still happen if a non-anonymous user tries to register
        throw new Error('该邮箱已被注册，请尝试登录或使用其他邮箱。');
      } 
      // If it wasn't the specific credential-in-use error during linking, re-throw the original error
      throw new Error(error.message || '注册或账户链接失败，请重试');
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
    console.log('[AuthService] 发起 Google 登录/链接请求...');
    // Add a check here to inform the background script if we are anonymous
    const auth = getFirebaseAuth();
    const isAnonymous = !!(auth.currentUser && auth.currentUser.isAnonymous);
    
    return new Promise((resolve, reject) => {
      // 向后台脚本发送登录请求消息, 附加是否为匿名用户的信息
      chrome.runtime.sendMessage({ 
        type: 'LOGIN_WITH_GOOGLE', 
        payload: { isAnonymousUser: isAnonymous } // Send anonymous status
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AuthService] Google 登录/链接消息发送失败:', chrome.runtime.lastError);
          return reject(new Error('无法连接到后台服务进行登录/链接: ' + chrome.runtime.lastError.message));
        }

        if (response && response.success) {
          console.log('[AuthService] Google 登录/链接成功，收到用户信息:', response.user);
          resolve(response.user as User);
        } else {
          const errorMessage = response?.error?.message || '未知错误';
          const errorCode = response?.error?.code;
          console.error(`[AuthService] Google 登录/链接失败: ${errorMessage}`, response?.error);
          // Provide more specific error messages based on code
          if (errorCode === 'auth/credential-already-in-use') {
             reject(new Error('此 Google 账户已关联到其他用户，请尝试使用其他账户登录。'));
          } else if (errorCode === 'auth/account-exists-with-different-credential') {
             reject(new Error('您已使用其他方式（如邮箱）注册过，请先使用该方式登录。')); // Or guide to link
          }
          else {
             reject(new Error(`Google 登录/链接失败: ${errorMessage}`));
          }
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
    let potentialLogoutTimer: ReturnType<typeof setTimeout> | null = null; // 用于延迟处理登出/匿名登录

    const unsubscribe = fbOnAuthStateChanged(auth, (firebaseUser) => {
      // 清除可能存在的登出延迟计时器
      if (potentialLogoutTimer) {
        clearTimeout(potentialLogoutTimer);
        potentialLogoutTimer = null;
      }

      if (firebaseUser) {
        console.log('[AuthService] onAuthStateChanged: User found',
                    firebaseUser.uid,
                    `isAnonymous: ${firebaseUser.isAnonymous}`);
        isSigningInAnonymously = false; // 确认用户存在，重置匿名登录标志
        const appUser = mapFirebaseUser(firebaseUser);
        callback(appUser);
      } else {
        console.log('[AuthService] onAuthStateChanged: Received null user state.');
        // 不要立即回调 null 或尝试匿名登录
        // 设置一个短暂的延迟，比如 1 秒，再次检查状态
        potentialLogoutTimer = setTimeout(async () => {
           console.log('[AuthService] Re-checking auth state after delay...');
           const currentAuth = getFirebaseAuth(); // 获取最新的 Auth 实例
           const latestUser = currentAuth.currentUser;

           if (latestUser) {
             // 如果延迟后用户又存在了（说明之前的 null 是暂时的），则忽略这次 null 事件
             console.log('[AuthService] Auth state recovered after delay. User:', latestUser.uid);
             // 可选：如果需要，可以再次调用 callback 以确保 UI 更新
             // callback(mapFirebaseUser(latestUser));
           } else {
             // 如果延迟后用户仍然是 null，那么才真正处理登出状态
             console.log('[AuthService] Confirmed user is null after delay. Proceeding with logout state.');
             callback(null); // 真正通知 UI 用户已登出

             // 只有在确认用户确实为 null 后，才考虑匿名登录
             if (!isSigningInAnonymously) {
               console.log('[AuthService] Attempting anonymous sign-in after confirmed logout...');
               isSigningInAnonymously = true;
               try {
                 const userCredential = await signInAnonymously(auth);
                 console.log('[AuthService] Anonymous sign-in successful after confirmed logout.', userCredential.user.uid);
                 // 成功会再次触发 onAuthStateChanged
               } catch (error) {
                 console.error('[AuthService] Anonymous sign-in failed after confirmed logout:', error);
                 isSigningInAnonymously = false;
               } finally {
                   // 无论成功失败，匿名登录尝试结束后都应该重置标志，允许下次尝试
                   // isSigningInAnonymously = false; // 放在 finally 可能更安全，但当前逻辑是成功后等 onAuthStateChanged 触发时重置
                   // 保持原逻辑：失败时重置，成功时等下一次 onAuthStateChanged
               }
             } else {
               console.log('[AuthService] Already attempting anonymous sign-in, skipping.');
             }
             
             // 调用会话结束处理函数 (如果需要的话)
             handleSessionEnd().catch(error => {
                console.error('处理会话结束时发生错误:', error);
             });
           }
           potentialLogoutTimer = null; // 清理计时器引用
        }, 1000); // 延迟 1 秒，可以根据测试调整

      }
    }, (error: Error) => {
       // 处理错误情况
       if (potentialLogoutTimer) {
         clearTimeout(potentialLogoutTimer);
         potentialLogoutTimer = null;
       }
      console.error('认证状态观察错误:', error);
      callback(null);
      isSigningInAnonymously = false; // 出错时也重置标志
    });

    // 初始检查：如果启动时就没有用户，也触发一次匿名登录尝试
    // 这可以加速初始匿名登录过程，避免等待 onAuthStateChanged 首次回调
    // 注意：这里的匿名登录也可能和 Auth 状态恢复竞争，如果启动时快速恢复了登录状态，可能不需要这里的匿名登录
    // 可以考虑也给这里的初始匿名登录加一个小的延迟检查
    if (!auth.currentUser && !isSigningInAnonymously) {
        console.log('[AuthService] Initial check: No user, scheduling potential anonymous sign-in...');
        // 也给初始检查加个延迟，给 Auth 状态恢复一点时间
        setTimeout(() => {
            const currentAuth = getFirebaseAuth();
            if (!currentAuth.currentUser && !isSigningInAnonymously) {
                console.log('[AuthService] Initial check after delay: Still no user, attempting anonymous sign-in...');
                isSigningInAnonymously = true;
                signInAnonymously(auth)
                  .then((userCredential) => {
                    console.log('[AuthService] Initial anonymous sign-in successful.', userCredential.user.uid);
                    // 成功后 onAuthStateChanged 会处理
                  })
                  .catch((error) => {
                    console.error('[AuthService] Initial anonymous sign-in failed:', error);
                    isSigningInAnonymously = false;
                  });
            } else {
                 console.log('[AuthService] Initial check after delay: User found or already signing in anonymously, skipping initial attempt.');
            }
        }, 500); // 短暂延迟 500ms
    }


    return () => {
      // 组件卸载或服务停止时确保清除计时器
      if (potentialLogoutTimer) {
        clearTimeout(potentialLogoutTimer);
      }
      unsubscribe(); // 调用 Firebase 返回的取消订阅函数
    };
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