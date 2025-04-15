import { useState, useEffect, useCallback } from 'react';
import { membershipService, MembershipState, MembershipQuota } from '../services/membership';
import { authService, User } from '../services/auth';

/**
 * 会员状态钩子返回值接口
 */
interface UseMembershipReturn {
  // 会员状态
  membershipState: MembershipState;
  // 是否为Pro会员
  isProMember: boolean;
  // 会员权益配额
  quota: MembershipQuota;
  // 加载状态
  loading: boolean;
  // 错误信息
  error: Error | null;
  // 刷新会员状态
  refresh: () => Promise<void>;
  
  // 开发工具方法(仅开发环境可用)
  _devTools: {
    setProMembership: () => Promise<void>;
    setFreeMembership: () => Promise<void>;
    setExpiringSoon: () => Promise<void>;
  };
}

/**
 * 会员状态钩子
 * 提供会员状态的访问、监听和操作方法
 */
export function useMembership(): UseMembershipReturn {
  const [membershipState, setMembershipState] = useState<MembershipState | null>(null);
  const [isProMember, setIsProMember] = useState<boolean>(false);
  const [quota, setQuota] = useState<MembershipQuota>({
    maxPrompts: 5,
    dailyOptimizations: 3,
    canExport: false,
    hasPrioritySupport: false
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 刷新会员状态
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 刷新会员状态
      const state = await membershipService.refreshMembershipState();
      setMembershipState(state);
      
      // 更新Pro状态
      const isPro = await membershipService.isProMember();
      setIsProMember(isPro);
      
      // 更新会员权益配额
      const memberQuota = await membershipService.getMembershipQuota();
      setQuota(memberQuota);
    } catch (err) {
      console.error('[useMembership] 刷新会员状态失败:', err);
      setError(err instanceof Error ? err : new Error('刷新会员状态失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载会员状态
  useEffect(() => {
    let isMounted = true;
    
    const loadMembershipState = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 获取会员状态
        const state = await membershipService.getCurrentMembership();
        if (isMounted) {
          setMembershipState(state);
        }
        
        // 检查是否为Pro会员
        const isPro = await membershipService.isProMember();
        if (isMounted) {
          setIsProMember(isPro);
        }
        
        // 获取会员权益配额
        const memberQuota = await membershipService.getMembershipQuota();
        if (isMounted) {
          setQuota(memberQuota);
        }
      } catch (err) {
        console.error('[useMembership] 加载会员状态失败:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('加载会员状态失败'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadMembershipState();
    
    // 订阅会员状态变更
    const unsubscribeMembership = membershipService.onMembershipChange(async (state) => {
      if (isMounted) {
        setMembershipState(state);
        
        // 状态变更时更新Pro状态和配额
        const isPro = await membershipService.isProMember();
        if (isMounted) {
          setIsProMember(isPro);
          
          const memberQuota = await membershipService.getMembershipQuota();
          setQuota(memberQuota);
        }
      }
    });
    
    // 监听认证状态变化
    const unsubscribeAuth = authService.onAuthStateChanged(async (user: User | null) => {
      if (!isMounted) return;
      
      if (user) {
        // 用户登录，尝试从服务器获取最新会员状态
        console.log('[useMembership] 用户登录，刷新会员状态');
        await refresh();
      } else {
        // 用户登出，重新加载本地会员状态
        console.log('[useMembership] 用户登出，重置为本地会员状态');
        loadMembershipState();
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribeMembership();
      unsubscribeAuth();
    };
  }, [refresh]);

  // 开发者工具方法
  const _devTools = {
    setProMembership: async () => {
      try {
        await membershipService._devSetProMembership();
        await refresh();
      } catch (err) {
        console.error('[useMembership] 设置Pro会员状态失败:', err);
      }
    },
    
    setFreeMembership: async () => {
      try {
        await membershipService._devSetFreeMembership();
        await refresh();
      } catch (err) {
        console.error('[useMembership] 设置免费会员状态失败:', err);
      }
    },
    
    setExpiringSoon: async () => {
      try {
        await membershipService._devSetExpiringSoon();
        await refresh();
      } catch (err) {
        console.error('[useMembership] 设置即将到期状态失败:', err);
      }
    }
  };

  return {
    membershipState: membershipState || {
      status: 'free',
      plan: null,
      startedAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      lastVerifiedAt: Date.now(),
      subscriptionId: null,
      customerId: null
    },
    isProMember,
    quota,
    loading,
    error,
    refresh,
    _devTools
  };
} 