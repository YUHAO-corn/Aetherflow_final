import { 
  initializeApp, 
  getApps, 
  getApp 
} from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth/web-extension';
import { firebaseConfig } from './firebaseConfig';
import { User } from './types';

// 初始化 Firebase 应用
export const initializeFirebase = () => {
  try {
    // 检查是否已经初始化
    if (getApps().length === 0) {
      const app = initializeApp(firebaseConfig);
      console.log('Firebase App 初始化成功 (web-extension context)');
      return app;
    } else {
      const app = getApp();
      console.log('Firebase App 已初始化，返回现有实例 (web-extension context)');
      return app;
    }
  } catch (error) {
    console.error('Firebase App 初始化错误:', error);
    throw error;
  }
};

// 获取 Firebase Auth 实例
export const getFirebaseAuth = () => {
  const app = getApps().length === 0 ? initializeFirebase() : getApp();
  // 使用 initializeAuth 并传入持久化选项
  return initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
  });
};

// 将 Firebase User 转换为应用 User 对象
export const mapFirebaseUser = (firebaseUser: any): User => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    isAnonymous: firebaseUser.isAnonymous,
    emailVerified: firebaseUser.emailVerified,
    providerData: firebaseUser.providerData.map((provider: any) => ({
      providerId: provider.providerId,
      uid: provider.uid,
      displayName: provider.displayName,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      photoURL: provider.photoURL
    })),
    lastLoginAt: firebaseUser.metadata.lastSignInTime || undefined,
    createdAt: firebaseUser.metadata.creationTime || undefined
  };
}; 