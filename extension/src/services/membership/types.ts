/**
 * 会员状态类型
 */
export type MembershipStatus = 'free' | 'pro' | 'trial';

/**
 * 订阅计划类型
 */
export type SubscriptionPlan = 'monthly' | 'annual' | null;

/**
 * 会员状态数据结构
 */
export interface MembershipState {
  // 会员状态: free(免费), pro(专业版), trial(试用)
  status: MembershipStatus;
  
  // 订阅计划: monthly(月付), annual(年付), 未订阅为null
  plan: SubscriptionPlan;
  
  // 当前订阅开始时间戳
  startedAt: number | null;
  
  // 当前订阅结束时间戳(下次续费日)
  expiresAt: number | null;
  
  // 是否在当前周期结束后取消
  cancelAtPeriodEnd: boolean;
  
  // 上次验证时间(本地状态刷新时间)
  lastVerifiedAt: number;
  
  // 订阅ID(支付平台返回)
  subscriptionId: string | null;
  
  // 客户ID(支付平台返回)
  customerId: string | null;
}

/**
 * 默认的免费会员状态
 */
export const DEFAULT_FREE_MEMBERSHIP: MembershipState = {
  status: 'free',
  plan: null,
  startedAt: null,
  expiresAt: null,
  cancelAtPeriodEnd: false,
  lastVerifiedAt: Date.now(),
  subscriptionId: null,
  customerId: null
};

/**
 * 会员权益配额信息
 */
export interface MembershipQuota {
  // 最大提示词数量
  maxPrompts: number;
  
  // 每日优化次数上限
  dailyOptimizations: number;
  
  // 是否能使用导出功能
  canExport: boolean;
  
  // 是否有优先支持特权
  hasPrioritySupport: boolean;
} 