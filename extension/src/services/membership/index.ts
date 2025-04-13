import { STORAGE_KEYS, STORAGE_LIMITS } from '../storage/constants';
import { storageService } from '../storage';
import { MembershipState, DEFAULT_FREE_MEMBERSHIP, MembershipQuota } from './types';

// 会员状态变更的观察者列表
type MembershipObserver = (state: MembershipState) => void;
const observers: MembershipObserver[] = [];

/**
 * 会员状态管理服务
 */
class MembershipService {
  private currentState: MembershipState | null = null;
  private maxRetryCount = 3;
  private retryDelay = 500; // 毫秒

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
   * 检查用户是否为Pro会员
   */
  async isProMember(): Promise<boolean> {
    try {
      const membershipState = await this.getCurrentMembership();
      // 检查是否为Pro状态，并且未过期
      const isPro = membershipState.status === 'pro';
      const isExpired = membershipState.expiresAt ? membershipState.expiresAt < Date.now() : false;
      
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
    return newState;
  }

  /**
   * 刷新会员状态（从服务器获取最新状态）
   * 此功能在未来云端校验实现后扩展
   */
  async refreshMembershipState(): Promise<MembershipState> {
    try {
      // TODO: 从服务端获取最新会员状态
      // 目前仅更新本地状态的lastVerifiedAt
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
      return await this.updateMembershipState({
        status: 'pro',
        plan: paymentData.plan,
        startedAt: Date.now(),
        expiresAt: paymentData.expiresAt,
        cancelAtPeriodEnd: false,
        subscriptionId: paymentData.subscriptionId,
        customerId: paymentData.customerId
      });
    } catch (error) {
      console.error('[MembershipService] 处理付款成功失败:', error);
      throw error;
    }
  }

  /**
   * 处理会员到期
   */
  async handleMembershipExpiration(): Promise<MembershipState> {
    try {
      return await this.updateMembershipState({
        status: 'free',
        plan: null,
        // 保留历史记录
        cancelAtPeriodEnd: false
      });
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
   */
  private notifyObservers(state: MembershipState): void {
    observers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[MembershipService] 通知观察者失败:', error);
      }
    });
  }

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
}

// 创建并导出会员服务单例
export const membershipService = new MembershipService();

// 导出类型
export * from './types'; 