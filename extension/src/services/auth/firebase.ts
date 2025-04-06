import { 
  initializeApp, 
  getApps, 
  getApp 
} from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  User as FirebaseUser
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';
import { User } from './types';

// 初始化 Firebase 应用
export const initializeFirebase = () => {
  try {
    // 检查是否已经初始化
    if (getApps().length === 0) {
      const app = initializeApp(firebaseConfig);
      console.log('Firebase 初始化成功');
      return app;
    } else {
      const app = getApp();
      console.log('Firebase 已初始化，返回现有实例');
      return app;
    }
  } catch (error) {
    console.error('Firebase 初始化错误:', error);
    throw error;
  }
};

// 获取 Firebase Auth 实例
export const getFirebaseAuth = () => {
  const app = getApps().length === 0 ? initializeFirebase() : getApp();
  return getAuth(app);
};

// 将 Firebase User 转换为应用 User 对象
export const mapFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    isAnonymous: firebaseUser.isAnonymous,
    emailVerified: firebaseUser.emailVerified,
    providerData: firebaseUser.providerData.map(provider => ({
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

// 创建 Google 认证提供者
export const createGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}; 