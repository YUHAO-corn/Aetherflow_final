import { STORAGE_KEYS, STORAGE_LIMITS } from '../storage/constants';
import { storageService } from '../storage';
import { MembershipState, DEFAULT_FREE_MEMBERSHIP, MembershipQuota } from './types';
import { authService } from '../auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  onSnapshot,
  Unsubscribe as FirestoreUnsubscribe
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { debounce } from '../../utils/debounce';

// 会员状态变更的观察者列表
type MembershipObserver = (state: MembershipState) => void;
const observers: MembershipObserver[] = [];

// 同步状态类型
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

// 默认的服务器同步间隔（24小时）
const DEFAULT_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

// 上次同步时间的存储键
const LAST_SYNC_TIME_KEY = 'membership_last_sync_time';

/**
 * 会员状态管理服务
 */
class MembershipService {
  private currentState: MembershipState | null = null;
  private maxRetryCount = 3;
  private retryDelay = 500; // 毫秒
  private syncStatus: SyncStatus = 'idle';
  private autoSyncInterval: number | null = null;
  private syncIntervalTime: number = DEFAULT_SYNC_INTERVAL;
  
  // 用于管理订阅的清理函数
  private authUnsubscribe: (() => void) | null = null;
  private firestoreUnsubscribe: FirestoreUnsubscribe | null = null;

  constructor() {
    // 初始化启动自动同步
    this.setupAutoSync();

    // 监听网络状态变化
    this.setupNetworkListener();
    
    // 监听用户认证状态
    this.setupAuthListener();
  }

  /**
   * 设置网络监听器
   * 网络恢复时尝试同步
   */
  private setupNetworkListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline.bind(this));
      window.addEventListener('offline', () => {
        this.syncStatus = 'offline';
        console.log('[MembershipService] 网络离线，暂停同步');
      });
    }
  }

  /**
   * 处理网络恢复在线
   */
  private async handleNetworkOnline(): Promise<void> {
    console.log('[MembershipService] 网络恢复在线，尝试同步会员状态');
    this.syncStatus = 'idle';
    
    try {
      // 检查上次同步时间，如果超过12小时，则进行同步
      const lastSyncTime = await this.getLastSyncTime();
      const now = Date.now();
      
      if (now - lastSyncTime > 12 * 60 * 60 * 1000) { // 12小时
        await this.refreshMembershipState();
      }
    } catch (error) {
      console.error('[MembershipService] 网络恢复后同步失败:', error);
    }
  }

  /**
   * 设置自动同步
   */
  private setupAutoSync(): void {
    // 清除已有的定时器
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    // 设置新的定时器，每24小时同步一次
    this.autoSyncInterval = window.setInterval(async () => {
      try {
        if (navigator.onLine && this.syncStatus !== 'syncing') {
          await this.refreshMembershipState();
        }
      } catch (error) {
        console.error('[MembershipService] 自动同步失败:', error);
      }
    }, this.syncIntervalTime);

    // 页面加载后也进行一次检查
    setTimeout(async () => {
      try {
        const lastSyncTime = await this.getLastSyncTime();
        const now = Date.now();
        
        // 如果超过24小时没同步，立即同步
        if (now - lastSyncTime > this.syncIntervalTime) {
          await this.refreshMembershipState();
        }
      } catch (error) {
        console.error('[MembershipService] 初始同步检查失败:', error);
      }
    }, 5000); // 延迟5秒，确保其他服务已初始化
  }

  /**
   * 获取上次同步时间
   */
  private async getLastSyncTime(): Promise<number> {
    try {
      const lastSyncTime = await storageService.get<number>(LAST_SYNC_TIME_KEY);
      return lastSyncTime || 0;
    } catch (error) {
      console.error('[MembershipService] 获取上次同步时间失败:', error);
      return 0;
    }
  }

  /**
   * 更新上次同步时间
   */
  private async updateLastSyncTime(): Promise<void> {
    try {
      await storageService.set(LAST_SYNC_TIME_KEY, Date.now());
    } catch (error) {
      console.error('[MembershipService] 更新上次同步时间失败:', error);
    }
  }

  /**
   * 获取当前会员状态
   * 如果本地没有会员状态记录，则初始化为默认的免费会员状态
   */
  async getCurrentMembership(): Promise<MembershipState> {
    if (this.currentState) {
      return this.currentState;
    }

    try {
      let membershipState = await storageService.get<MembershipState>(STORAGE_KEYS.MEMBERSHIP);
      
      if (!membershipState) {
        // 本地无会员状态记录，初始化为默认免费会员状态
        membershipState = DEFAULT_FREE_MEMBERSHIP;
        await this.saveMembershipState(membershipState);
      }

      this.currentState = membershipState;
      return membershipState;
    } catch (error) {
      console.error('[MembershipService] 获取会员状态失败:', error);
      // 错误处理，返回默认状态
      return DEFAULT_FREE_MEMBERSHIP;
    }
  }

  /**
   * 设置用户认证状态监听
   * 当用户登录或登出时，自动处理会员状态
   */
  private setupAuthListener(): void {
    // 清理已有的订阅
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    
    // 订阅认证状态变化
    this.authUnsubscribe = authService.onAuthStateChanged(async (user) => {
      if (user) {
        // 用户登录时
        console.log(`[MembershipService] 用户 ${user.uid} 登录，同步会员状态`);
        
        // 设置 Firestore 实时监听
        this.setupFirestoreListener(user.uid);
        
        // 刷新会员状态
        try {
          await this.refreshMembershipState();
        } catch (error) {
          console.error('[MembershipService] 用户登录后刷新会员状态失败:', error);
        }
      } else {
        // 用户登出时
        console.log('[MembershipService] 用户登出，清理监听');
        
        // 清理 Firestore 监听
        if (this.firestoreUnsubscribe) {
          this.firestoreUnsubscribe();
          this.firestoreUnsubscribe = null;
        }
      }
    });
  }
  
  /**
   * 设置 Firestore 实时监听
   * 监听用户会员状态变化，实时更新本地状态
   */
  private setupFirestoreListener(userId: string): void {
    // 清理已有的监听
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    
    try {
      console.log(`[MembershipService] 为用户 ${userId} 设置 Firestore 会员状态监听`);
      
      // 创建到会员状态文档的引用 
      const db = getFirestore(getApp());
      const membershipDoc = doc(db, 'users', userId, 'membership', 'status');
      
      // 设置实时监听
      this.firestoreUnsubscribe = onSnapshot(
        membershipDoc,
        // 监听成功回调
        (snapshot) => {
          if (snapshot.exists()) {
            const serverData = snapshot.data();
            console.log('[MembershipService] Firestore 会员状态更新:', serverData);
            
            // 处理服务器状态更新
            this.handleServerStateUpdate(serverData as MembershipState).catch(error => {
              console.error('[MembershipService] 处理服务器状态更新失败:', error);
            });
          }
        },
        // 错误处理回调
        (error) => {
          console.error('[MembershipService] Firestore 监听错误:', error);
          this.firestoreUnsubscribe = null;
        }
      );
    } catch (error) {
      console.error('[MembershipService] 设置 Firestore 监听失败:', error);
      this.firestoreUnsubscribe = null;
    }
  }
  
  /**
   * 处理来自服务器的状态更新
   */
  private async handleServerStateUpdate(serverState: MembershipState): Promise<void> {
    try {
      // 获取当前本地状态
      const localState = await this.getCurrentMembership();
      
      // 检查服务器状态是否比本地状态更新
      if (serverState.lastVerifiedAt && localState.lastVerifiedAt && 
          serverState.lastVerifiedAt <= localState.lastVerifiedAt) {
        console.log('[MembershipService] 本地状态已是最新，忽略服务器更新');
        return;
      }
      
      // 更新本地状态
      console.log('[MembershipService] 使用服务器状态更新本地状态');
      const updatedState = {
        ...serverState,
        lastVerifiedAt: Date.now()
      };
      
      await this.saveMembershipState(updatedState);
      
      // 广播会员状态变更消息
      this.broadcastStateChange();
    } catch (error) {
      console.error('[MembershipService] 处理服务器状态更新失败:', error);
    }
  }
  
  /**
   * 广播会员状态变更消息
   */
  private broadcastStateChange(): void {
    try {
      chrome.runtime.sendMessage({ 
        type: 'MEMBERSHIP_STATUS_UPDATED',
        timestamp: Date.now()
      });
      console.log('[MembershipService] 已广播会员状态更新消息');
    } catch (error) {
      console.error('[MembershipService] 广播状态更新消息失败:', error);
    }
  }
  
  /**
   * 验证本地状态是否有效，防止篡改
   */
  private async validateLocalState(): Promise<boolean> {
    try {
      const localState = await this.getCurrentMembership();
      
      // 1. Pro会员但没有订阅ID，可能是篡改
      if (localState.status === 'pro' && !localState.subscriptionId) {
        console.warn('[MembershipService] 异常会员状态: Pro会员但无订阅ID');
        return false;
      }
      
      // 2. 时间逻辑错误
      if (localState.expiresAt && localState.startedAt) {
        if (localState.expiresAt < localState.startedAt) {
          console.warn('[MembershipService] 异常会员状态: 到期时间早于开始时间');
          return false;
        }
      }
      
      // 3. 过期时间不合理
      if (localState.status === 'pro' && localState.expiresAt) {
        const now = Date.now();
        // 过期时间超过两年，不合理
        const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
        if (localState.expiresAt > (now + twoYearsMs)) {
          console.warn('[MembershipService] 异常会员状态: 到期时间超过两年');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[MembershipService] 验证本地状态失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否为Pro会员
   */
  async isProMember(): Promise<boolean> {
    try {
      const membershipState = await this.getCurrentMembership();
      
      // 检查是否为Pro状态，并且未过期
      const isPro = membershipState.status === 'pro';
      const isExpired = membershipState.expiresAt ? membershipState.expiresAt < Date.now() : false;
      
      // 验证本地状态是否有效
      const isValid = await this.validateLocalState();
      if (!isValid) {
        console.warn('[MembershipService] 检测到可能被篡改的会员状态，强制验证');
        // 强制从服务器刷新状态
        await this.refreshMembershipState();
        // 重新获取刷新后的状态
        const refreshedState = await this.getCurrentMembership();
        return refreshedState.status === 'pro' && 
               !(refreshedState.expiresAt && refreshedState.expiresAt < Date.now());
      }
      
      // 已过期，但尚未更新状态，主动更新为免费状态
      if (isPro && isExpired) {
        await this.handleMembershipExpiration();
        return false;
      }
      
      return isPro && !isExpired;
    } catch (error) {
      console.error('[MembershipService] 检查会员状态失败:', error);
      return false;
    }
  }

  /**
   * 保存会员状态到本地存储
   */
  async saveMembershipState(state: MembershipState): Promise<void> {
    let retries = 0;
    let lastError = null;

    while (retries < this.maxRetryCount) {
      try {
        await storageService.set(STORAGE_KEYS.MEMBERSHIP, state);
        this.currentState = state;
        this.notifyObservers(state);
        return;
      } catch (error) {
        lastError = error;
        console.error(`[MembershipService] 保存会员状态失败 (尝试 ${retries + 1}/${this.maxRetryCount}):`, error);
        retries++;
        
        if (retries < this.maxRetryCount) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    // 所有重试都失败
    throw lastError || new Error('保存会员状态失败');
  }

  /**
   * 更新会员状态
   * @param updates 部分更新的会员状态字段
   */
  async updateMembershipState(updates: Partial<MembershipState>): Promise<MembershipState> {
    const currentState = await this.getCurrentMembership();
    const newState = {
      ...currentState,
      ...updates,
      lastVerifiedAt: Date.now()
    };
    
    await this.saveMembershipState(newState);
    
    // 如果用户已登录，尝试将状态同步到服务器
    // 注意：这里不等待同步完成，避免阻塞主流程
    this.syncStateToServer(newState).catch(error => {
      console.error('[MembershipService] 同步状态到服务器失败:', error);
    });
    
    return newState;
  }

  /**
   * 将本地会员状态同步到Firestore
   * 仅在用户登录时进行
   * 注意：此功能已禁用，会员状态只能由服务端更新
   */
  private async syncStateToServer(state: MembershipState): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        // 用户未登录，无法同步到服务器
        return;
      }
      
      console.log(`[MembershipService] 会员状态同步已禁用。会员状态只能由服务端更新。用户: ${currentUser.uid}`);
      
      // 不再执行实际的写入操作
      // 原因：根据应用设计，客户端只负责验证用户的数据库会员状态，而不负责直接编辑会员状态
      
    } catch (error) {
      console.error('[MembershipService] 同步状态到服务器失败:', error);
      throw error;
    }
  }

  /**
   * 从服务器验证会员状态
   * 当用户登录时调用此方法从Firestore获取最新会员状态
   */
  async verifyMembershipWithServer(): Promise<MembershipState | null> {
    if (this.syncStatus === 'syncing') {
      console.log('[MembershipService] 正在进行同步，跳过此次验证');
      return null;
    }
    
    this.syncStatus = 'syncing';
    
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        // 用户未登录，无法从服务器验证
        this.syncStatus = 'idle';
        return null;
      }
      
      console.log(`[MembershipService] 验证用户 ${currentUser.uid} 的会员状态`);
      
      // 先尝试从专门的会员状态文档读取（新架构）
      const db = getFirestore(getApp());
      const membershipDoc = doc(db, 'users', currentUser.uid, 'membership', 'status');
      const membershipSnap = await getDoc(membershipDoc);
      
      if (membershipSnap.exists()) {
        console.log('[MembershipService] 从会员状态文档获取数据');
        const serverState = membershipSnap.data() as MembershipState;
        
        // 检查订阅是否过期
        const isExpired = serverState.expiresAt ? serverState.expiresAt < Date.now() : false;
        if (isExpired && serverState.status === 'pro') {
          console.log('[MembershipService] 服务器会员状态已过期，重置为免费状态');
          const freeState = { ...DEFAULT_FREE_MEMBERSHIP, lastVerifiedAt: Date.now() };
          await this.saveMembershipState(freeState);
          
          // 同步回服务器
          await this.syncStateToServer(freeState);
          
          this.syncStatus = 'synced';
          await this.updateLastSyncTime();
          return freeState;
        }
        
        // 更新本地状态
        const updatedState = {
          ...serverState,
          lastVerifiedAt: Date.now()
        };
        
        await this.saveMembershipState(updatedState);
        this.syncStatus = 'synced';
        await this.updateLastSyncTime();
        
        return updatedState;
      }
      
      // 如果没有找到专门的会员状态文档，尝试从用户文档读取（旧架构）
      console.log('[MembershipService] 会员状态文档不存在，尝试从用户文档读取');
      const userDoc = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userDoc);
      
      if (!docSnap.exists() || !docSnap.data().membership) {
        console.log('[MembershipService] 服务器上无会员记录');
        this.syncStatus = 'synced';
        await this.updateLastSyncTime();
        return null;
      }
      
      const userData = docSnap.data();
      const serverMembership = userData.membership;
      
      // 构建新的会员状态
      const newState: MembershipState = {
        status: serverMembership.status || 'free',
        plan: serverMembership.plan || null,
        startedAt: serverMembership.startedAt || null,
        expiresAt: serverMembership.expiresAt || null,
        cancelAtPeriodEnd: serverMembership.cancelAtPeriodEnd || false,
        lastVerifiedAt: Date.now(),
        subscriptionId: serverMembership.subscriptionId || null,
        customerId: serverMembership.customerId || null
      };
      
      // 检查是否过期
      const isExpired = newState.expiresAt ? newState.expiresAt < Date.now() : false;
      if (isExpired && newState.status === 'pro') {
        console.log('[MembershipService] 服务器会员状态已过期，重置为免费状态');
        const freeState = { ...DEFAULT_FREE_MEMBERSHIP, lastVerifiedAt: Date.now() };
        await this.saveMembershipState(freeState);
        
        // 同步回服务器
        await this.syncStateToServer(freeState);
        
        this.syncStatus = 'synced';
        await this.updateLastSyncTime();
        return freeState;
      }
      
      // 更新本地状态
      await this.saveMembershipState(newState);
      
      // 同时更新到会员状态文档
      await this.syncStateToServer(newState);
      
      console.log('[MembershipService] 会员状态已从服务器更新');
      this.syncStatus = 'synced';
      await this.updateLastSyncTime();
      
      return newState;
    } catch (error) {
      console.error('[MembershipService] 从服务器验证会员状态失败:', error);
      this.syncStatus = 'error';
      return null;
    }
  }

  /**
   * 刷新会员状态（从服务器获取最新状态）
   */
  async refreshMembershipState(): Promise<MembershipState> {
    try {
      // 尝试从服务器验证会员状态
      const serverState = await this.verifyMembershipWithServer();
      
      if (serverState) {
        // 服务器有更新的状态，已在verifyMembershipWithServer中保存
        return serverState;
      }
      
      // 服务器无更新或未登录，只更新本地状态的lastVerifiedAt
      const currentState = await this.getCurrentMembership();
      return await this.updateMembershipState({
        lastVerifiedAt: Date.now()
      });
    } catch (error) {
      console.error('[MembershipService] 刷新会员状态失败:', error);
      throw error;
    }
  }

  /**
   * 处理会员付款成功
   */
  async handleSuccessfulPayment(paymentData: {
    subscriptionId: string;
    customerId: string;
    plan: 'monthly' | 'annual';
    expiresAt: number;
  }): Promise<MembershipState> {
    try {
      // 更新本地会员状态
      const newState = await this.updateMembershipState({
        status: 'pro',
        plan: paymentData.plan,
        startedAt: Date.now(),
        expiresAt: paymentData.expiresAt,
        cancelAtPeriodEnd: false,
        subscriptionId: paymentData.subscriptionId,
        customerId: paymentData.customerId
      });
      
      // 强制同步到服务器，使用重试机制
      await this.syncStateToServerWithRetry(newState);
      
      // 广播状态变更消息
      this.broadcastStateChange();
      
      return newState;
    } catch (error) {
      console.error('[MembershipService] 处理付款成功失败:', error);
      throw error;
    }
  }
  
  /**
   * 带重试的服务器同步
   * 注意：此功能已禁用，会员状态只能由服务端更新
   */
  private async syncStateToServerWithRetry(state: MembershipState, retries = 3): Promise<void> {
    try {
      // 直接调用主同步函数，该函数已被修改为不执行实际写入
      await this.syncStateToServer(state);
    } catch (error) {
      if (retries > 0) {
        console.log(`[MembershipService] 同步失败，${this.retryDelay}ms后重试, 剩余重试次数: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        await this.syncStateToServerWithRetry(state, retries - 1);
      } else {
        console.error('[MembershipService] 同步到服务器失败，达到最大重试次数');
        throw error;
      }
    }
  }

  /**
   * 处理会员到期
   */
  async handleMembershipExpiration(): Promise<MembershipState> {
    try {
      const newState = await this.updateMembershipState({
        status: 'free',
        plan: null,
        // 保留历史记录
        cancelAtPeriodEnd: false
      });
      
      // 尝试同步到服务器
      try {
        await this.syncStateToServer(newState);
      } catch (syncError) {
        // 同步失败但不中断流程
        console.error('[MembershipService] 会员到期处理同步失败:', syncError);
      }
      
      return newState;
    } catch (error) {
      console.error('[MembershipService] 处理会员到期失败:', error);
      throw error;
    }
  }

  /**
   * 获取会员权益配额信息
   */
  async getMembershipQuota(): Promise<MembershipQuota> {
    const isPro = await this.isProMember();
    
    return {
      maxPrompts: isPro ? STORAGE_LIMITS.PRO_MAX_PROMPTS : STORAGE_LIMITS.FREE_MAX_PROMPTS,
      dailyOptimizations: isPro ? STORAGE_LIMITS.PRO_DAILY_OPTIMIZATIONS : STORAGE_LIMITS.FREE_DAILY_OPTIMIZATIONS,
      canExport: isPro,
      hasPrioritySupport: isPro
    };
  }

  /**
   * 订阅会员状态变化
   * @param callback 状态变化时的回调函数
   * @returns 取消订阅的函数
   */
  onMembershipChange(callback: MembershipObserver): () => void {
    observers.push(callback);
    
    // 返回取消订阅的函数
    return () => {
      const index = observers.indexOf(callback);
      if (index !== -1) {
        observers.splice(index, 1);
      }
    };
  }
  
  /**
   * 通知所有观察者
   * 使用防抖处理，避免短时间内多次通知
   */
  private notifyObservers = debounce((state: MembershipState): void => {
    observers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[MembershipService] 通知观察者失败:', error);
      }
    });
  }, 100);  // 100ms防抖时间

  // 仅开发环境使用的会员状态测试方法
  // 注意：这些方法只应该在开发环境中使用
  
  /**
   * 切换为Pro会员状态（测试用）
   */
  async _devSetProMembership(): Promise<MembershipState> {
    if (!this.isDevelopmentMode()) {
      console.warn('[MembershipService] 开发环境专用方法在生产环境被调用');
      return this.getCurrentMembership();
    }
    
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30天后
    return await this.updateMembershipState({
      status: 'pro',
      plan: 'monthly',
      startedAt: Date.now(),
      expiresAt,
      cancelAtPeriodEnd: false,
      subscriptionId: 'dev_subscription_id',
      customerId: 'dev_customer_id'
    });
  }
  
  /**
   * 切换为免费会员状态（测试用）
   */
  async _devSetFreeMembership(): Promise<MembershipState> {
    if (!this.isDevelopmentMode()) {
      console.warn('[MembershipService] 开发环境专用方法在生产环境被调用');
      return this.getCurrentMembership();
    }
    
    return await this.updateMembershipState({
      ...DEFAULT_FREE_MEMBERSHIP,
      lastVerifiedAt: Date.now()
    });
  }
  
  /**
   * 模拟会员即将到期（测试用）
   */
  async _devSetExpiringSoon(): Promise<MembershipState> {
    if (!this.isDevelopmentMode()) {
      console.warn('[MembershipService] 开发环境专用方法在生产环境被调用');
      return this.getCurrentMembership();
    }
    
    const expiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000; // 2天后
    return await this.updateMembershipState({
      status: 'pro',
      plan: 'monthly',
      startedAt: Date.now() - 28 * 24 * 60 * 60 * 1000, // 28天前
      expiresAt,
      cancelAtPeriodEnd: true,
      subscriptionId: 'dev_subscription_id',
      customerId: 'dev_customer_id'
    });
  }
  
  /**
   * 判断是否为开发环境
   */
  private isDevelopmentMode(): boolean {
    return typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.localStorage.getItem('DEV_MODE') === 'true');
  }

  /**
   * 提供给UI的会员状态刷新方法，包含加载状态管理
   */
  async refreshMembershipStatusWithUI(setLoading?: (loading: boolean) => void): Promise<boolean> {
    try {
      // 显示加载状态
      if (setLoading) setLoading(true);
      
      // 执行刷新
      const result = await this.refreshMembershipState();
      
      // 返回结果
      return !!result;
    } catch (error) {
      console.error('[MembershipService] 刷新会员状态失败:', error);
      return false;
    } finally {
      // 隐藏加载状态
      if (setLoading) setLoading(false);
    }
  }
}

// 创建并导出会员服务单例
export const membershipService = new MembershipService();

// 导出类型
export * from './types'; 