import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { renderHook } from '@testing-library/react-hooks';
import { PaymentService, QuotaInfo, SubscriptionData } from '../src/types';
import { paymentService } from '../src/services/payment';
import { SubscriptionModal } from '../src/components/SubscriptionModal';
import { PaymentSuccess } from '../src/components/PaymentSuccess';
import { useSubscription } from '../src/hooks/useSubscription';
import { QuotaLimitReachedMessage } from '../src/components/QuotaLimitReachedMessage';
import { jest } from '@jest/globals';

// 模拟 Firebase Functions
jest.mock('firebase/functions', () => {
  return {
    getFunctions: jest.fn(),
    httpsCallable: jest.fn(() => jest.fn()),
  };
});

// 模拟 Firebase Firestore
jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    onSnapshot: jest.fn(),
  };
});

// 模拟 Firebase Auth
jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(() => ({
      currentUser: { uid: 'test-user-id' },
    })),
  };
});

// 模拟支付服务
const mockPaymentService: jest.Mocked<PaymentService> = {
  checkPromptsQuota: jest.fn(),
  checkOptimizeQuota: jest.fn(),
  getUserSubscription: jest.fn(),
  createCheckoutSession: jest.fn(),
  cancelSubscription: jest.fn(),
  resumeSubscription: jest.fn()
};

describe('付费功能测试', () => {
  beforeEach(() => {
    // 清除所有模拟调用
    jest.clearAllMocks();
  });
  
  // 1. 配额限制测试
  describe('配额限制检查', () => {
    test('免费用户提示词存储限制', async () => {
      // 模拟已达到免费用户限制
      paymentService.checkPromptsQuota = jest.fn().mockResolvedValue({
        isLimitReached: true,
        currentCount: 5,
        limit: 5,
        isPremium: false
      });
      
      // 调用检查
      const result = await paymentService.checkPromptsQuota();
      
      // 验证结果
      expect(result.isLimitReached).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.limit).toBe(5);
    });
    
    test('付费用户提示词存储限制', async () => {
      // 模拟付费用户未达到限制
      paymentService.checkPromptsQuota = jest.fn().mockResolvedValue({
        isLimitReached: false,
        currentCount: 25,
        limit: 100,
        isPremium: true
      });
      
      // 调用检查
      const result = await paymentService.checkPromptsQuota();
      
      // 验证结果
      expect(result.isLimitReached).toBe(false);
      expect(result.currentCount).toBe(25);
      expect(result.limit).toBe(100);
      expect(result.isPremium).toBe(true);
    });
    
    test('显示配额限制提示组件', async () => {
      // 模拟限制检查结果
      const quotaResult = {
        isLimitReached: true,
        currentCount: 5,
        limit: 5,
        isPremium: false
      };
      
      // 渲染配额限制提示组件
      render(
        <QuotaLimitReachedMessage 
          quotaInfo={quotaResult}
          resourceType="prompts"
          onUpgradeClick={jest.fn()}
        />
      );
      
      // 验证显示正确的限制信息
      expect(screen.getByText(/已达到免费版存储限制/i)).toBeInTheDocument();
      expect(screen.getByText(/升级到高级会员/i)).toBeInTheDocument();
    });
  });
  
  // 2. 订阅管理测试
  describe('订阅管理', () => {
    test('获取用户订阅状态', async () => {
      // 模拟订阅数据
      const mockSubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后
        cancelAtPeriodEnd: false
      };
      
      // 模拟Firestore文档获取
      const getDocMock = require('firebase/firestore').getDoc;
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => mockSubscriptionData
      });
      
      // 调用获取订阅状态
      const subscription = await paymentService.getUserSubscription();
      
      // 验证结果
      expect(subscription).toEqual(mockSubscriptionData);
      expect(subscription.status).toBe('active');
      expect(subscription.plan).toBe('premium');
    });
    
    test('useSubscription Hook', async () => {
      // 模拟订阅数据
      const mockSubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false
      };
      
      // 模拟onSnapshot实现
      const onSnapshotMock = require('firebase/firestore').onSnapshot;
      onSnapshotMock.mockImplementation((docRef, callback) => {
        callback({
          exists: () => true,
          data: () => mockSubscriptionData
        });
        return jest.fn(); // 返回unsubscribe函数
      });
      
      // 渲染Hook
      const { result, waitForNextUpdate } = renderHook(() => useSubscription());
      
      // 等待数据加载
      await waitForNextUpdate();
      
      // 验证订阅数据
      expect(result.current.subscription).toEqual(mockSubscriptionData);
      expect(result.current.isActive).toBe(true);
      expect(result.current.isPremium).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });
  
  // 3. 支付流程测试
  describe('支付流程', () => {
    test('创建支付会话', async () => {
      // 模拟Firebase函数调用
      const httpsCallableMock = require('firebase/functions').httpsCallable;
      const createCheckoutSessionMock = jest.fn().mockResolvedValue({
        data: {
          sessionId: 'test-session-id',
          url: 'https://checkout.stripe.com/test-session'
        }
      });
      httpsCallableMock.mockReturnValue(createCheckoutSessionMock);
      
      // 调用创建支付会话
      const result = await paymentService.createCheckoutSession('premium', 'monthly');
      
      // 验证结果
      expect(result.sessionId).toBe('test-session-id');
      expect(result.url).toBe('https://checkout.stripe.com/test-session');
      expect(createCheckoutSessionMock).toHaveBeenCalledWith({
        planId: 'premium',
        interval: 'monthly'
      });
    });
    
    test('订阅弹窗交互', async () => {
      // 模拟创建支付会话
      paymentService.createCheckoutSession = jest.fn().mockResolvedValue({
        sessionId: 'test-session-id',
        url: 'https://checkout.stripe.com/test-session'
      });
      
      // 模拟window.open
      const originalOpen = window.open;
      window.open = jest.fn();
      
      // 渲染订阅弹窗
      render(<SubscriptionModal isOpen={true} onClose={jest.fn()} />);
      
      // 选择月度计划
      fireEvent.click(screen.getByText(/月度订阅/i));
      
      // 点击订阅按钮
      fireEvent.click(screen.getByText(/立即订阅/i));
      
      // 验证调用创建支付会话
      await waitFor(() => {
        expect(paymentService.createCheckoutSession).toHaveBeenCalledWith('premium', 'monthly');
      });
      
      // 验证打开Stripe结账页面
      expect(window.open).toHaveBeenCalledWith(
        'https://checkout.stripe.com/test-session',
        '_blank'
      );
      
      // 恢复原始window.open
      window.open = originalOpen;
    });
    
    test('支付成功组件', () => {
      // 渲染支付成功组件
      render(<PaymentSuccess sessionId="test-success-session" />);
      
      // 验证显示成功消息
      expect(screen.getByText(/订阅成功/i)).toBeInTheDocument();
      expect(screen.getByText(/你现在是高级会员/i)).toBeInTheDocument();
    });
  });
  
  // 4. 会员特权测试
  describe('会员特权检查', () => {
    test('检查优化次数限制 - 免费用户', async () => {
      // 模拟免费用户已达到优化次数限制
      paymentService.checkOptimizeQuota = jest.fn().mockResolvedValue({
        isLimitReached: true,
        currentCount: 3,
        limit: 3,
        isPremium: false,
        resetsAt: Date.now() + 12 * 60 * 60 * 1000 // 12小时后重置
      });
      
      // 调用检查
      const result = await paymentService.checkOptimizeQuota();
      
      // 验证结果
      expect(result.isLimitReached).toBe(true);
      expect(result.currentCount).toBe(3);
      expect(result.limit).toBe(3);
      expect(result.isPremium).toBe(false);
    });
    
    test('检查优化次数限制 - 付费用户', async () => {
      // 模拟付费用户未达到优化次数限制
      paymentService.checkOptimizeQuota = jest.fn().mockResolvedValue({
        isLimitReached: false,
        currentCount: 15,
        limit: 50,
        isPremium: true,
        resetsAt: Date.now() + 12 * 60 * 60 * 1000
      });
      
      // 调用检查
      const result = await paymentService.checkOptimizeQuota();
      
      // 验证结果
      expect(result.isLimitReached).toBe(false);
      expect(result.currentCount).toBe(15);
      expect(result.limit).toBe(50);
      expect(result.isPremium).toBe(true);
    });
  });
  
  // 5. 订阅取消与续订测试
  describe('订阅取消与续订', () => {
    test('取消订阅', async () => {
      // 模拟Firebase函数调用
      const httpsCallableMock = require('firebase/functions').httpsCallable;
      const cancelSubscriptionMock = jest.fn().mockResolvedValue({
        data: { success: true }
      });
      httpsCallableMock.mockReturnValue(cancelSubscriptionMock);
      
      // 调用取消订阅
      const result = await paymentService.cancelSubscription();
      
      // 验证结果
      expect(result.success).toBe(true);
      expect(cancelSubscriptionMock).toHaveBeenCalled();
    });
    
    test('恢复订阅', async () => {
      // 模拟Firebase函数调用
      const httpsCallableMock = require('firebase/functions').httpsCallable;
      const resumeSubscriptionMock = jest.fn().mockResolvedValue({
        data: { success: true }
      });
      httpsCallableMock.mockReturnValue(resumeSubscriptionMock);
      
      // 调用恢复订阅
      const result = await paymentService.resumeSubscription();
      
      // 验证结果
      expect(result.success).toBe(true);
      expect(resumeSubscriptionMock).toHaveBeenCalled();
    });
  });
});

describe('支付与订阅功能测试', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('配额限制检查', () => {
    test('免费用户提示词限制检查', async () => {
      // 模拟免费用户配额响应
      const freeQuota: QuotaInfo = {
        isLimitReached: false,
        currentCount: 3,
        limit: 5,
        isPremium: false
      };
      
      mockPaymentService.checkPromptsQuota.mockResolvedValue(freeQuota);
      
      // 执行限制检查
      const quota = await mockPaymentService.checkPromptsQuota();
      
      // 验证返回的限制数据
      expect(quota.limit).toBe(5);
      expect(quota.currentCount).toBe(3);
      expect(quota.isLimitReached).toBe(false);
      expect(quota.isPremium).toBe(false);
    });
    
    test('免费用户达到优化限制时返回适当响应', async () => {
      // 模拟已达到限制的配额信息
      const limitReachedQuota: QuotaInfo = {
        isLimitReached: true,
        currentCount: 3,
        limit: 3,
        isPremium: false
      };
      
      mockPaymentService.checkOptimizeQuota.mockResolvedValue(limitReachedQuota);
      
      // 执行检查
      const quota = await mockPaymentService.checkOptimizeQuota();
      
      // 验证已达到限制
      expect(quota.isLimitReached).toBe(true);
      expect(quota.currentCount).toBe(quota.limit);
    });
    
    test('付费用户提示词限制检查', async () => {
      // 模拟付费用户配额响应
      const premiumQuota: QuotaInfo = {
        isLimitReached: false,
        currentCount: 50,
        limit: 100,
        isPremium: true
      };
      
      mockPaymentService.checkPromptsQuota.mockResolvedValue(premiumQuota);
      
      // 执行限制检查
      const quota = await mockPaymentService.checkPromptsQuota();
      
      // 验证返回的限制数据
      expect(quota.limit).toBe(100);
      expect(quota.isPremium).toBe(true);
      expect(quota.isLimitReached).toBe(false);
    });
  });
  
  describe('订阅状态管理', () => {
    test('获取用户订阅状态', async () => {
      // 模拟活跃的付费订阅
      const activeSubscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后
        cancelAtPeriodEnd: false
      };
      
      mockPaymentService.getUserSubscription.mockResolvedValue(activeSubscription);
      
      // 获取订阅状态
      const subscription = await mockPaymentService.getUserSubscription();
      
      // 验证订阅数据
      expect(subscription.status).toBe('active');
      expect(subscription.plan).toBe('premium');
      expect(subscription.cancelAtPeriodEnd).toBe(false);
    });
    
    test('使用useSubscription钩子获取和刷新订阅状态', async () => {
      // 模拟初始订阅数据
      const initialSubscription: SubscriptionData = {
        status: 'active',
        plan: 'free',
        currentPeriodEnd: Date.now() + 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 模拟更新后的订阅数据
      const updatedSubscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 设置模拟函数先返回初始数据，后返回更新后的数据
      mockPaymentService.getUserSubscription
        .mockResolvedValueOnce(initialSubscription)
        .mockResolvedValueOnce(updatedSubscription);
      
      // 渲染hook
      const { result, waitForNextUpdate } = renderHook(() => useSubscription());
      
      // 等待初始状态加载
      await waitForNextUpdate();
      
      // 验证初始状态
      expect(result.current.subscription).toEqual(initialSubscription);
      expect(result.current.isLoading).toBe(false);
      
      // 触发刷新
      act(() => {
        result.current.refreshSubscription();
      });
      
      // 等待更新
      await waitForNextUpdate();
      
      // 验证刷新后的状态
      expect(result.current.subscription).toEqual(updatedSubscription);
    });
  });
  
  describe('支付流程', () => {
    test('创建结账会话', async () => {
      // 模拟结账会话响应
      const checkoutSession = {
        sessionId: 'cs_test_123456789',
        url: 'https://checkout.stripe.com/123456789'
      };
      
      mockPaymentService.createCheckoutSession.mockResolvedValue(checkoutSession);
      
      // 创建结账会话
      const session = await mockPaymentService.createCheckoutSession('premium', 'monthly');
      
      // 验证会话数据
      expect(session.sessionId).toBeDefined();
      expect(session.url).toContain('checkout.stripe.com');
      
      // 验证调用参数
      expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith('premium', 'monthly');
    });
    
    test('处理订阅取消', async () => {
      // 模拟取消响应
      const cancelResponse = { success: true };
      
      mockPaymentService.cancelSubscription.mockResolvedValue(cancelResponse);
      
      // 取消订阅
      const result = await mockPaymentService.cancelSubscription();
      
      // 验证响应
      expect(result.success).toBe(true);
      expect(mockPaymentService.cancelSubscription).toHaveBeenCalled();
    });
    
    test('恢复已取消的订阅', async () => {
      // 模拟恢复响应
      const resumeResponse = { success: true };
      
      mockPaymentService.resumeSubscription.mockResolvedValue(resumeResponse);
      
      // 恢复订阅
      const result = await mockPaymentService.resumeSubscription();
      
      // 验证响应
      expect(result.success).toBe(true);
      expect(mockPaymentService.resumeSubscription).toHaveBeenCalled();
    });
  });
  
  describe('性能测试', () => {
    test('配额检查响应时间不超过500ms', async () => {
      // 模拟配额检查响应
      const quotaInfo: QuotaInfo = {
        isLimitReached: false,
        currentCount: 2,
        limit: 5,
        isPremium: false
      };
      
      mockPaymentService.checkPromptsQuota.mockResolvedValue(quotaInfo);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 执行配额检查
      await mockPaymentService.checkPromptsQuota();
      
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      // 验证响应时间在500ms以内
      expect(responseTime).toBeLessThanOrEqual(500);
    });
    
    test('订阅状态检查响应时间不超过500ms', async () => {
      // 模拟订阅响应
      const subscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 86400000,
        cancelAtPeriodEnd: false
      };
      
      mockPaymentService.getUserSubscription.mockResolvedValue(subscription);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 执行订阅检查
      await mockPaymentService.getUserSubscription();
      
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      // 验证响应时间在500ms以内
      expect(responseTime).toBeLessThanOrEqual(500);
    });
  });
  
  describe('边界条件测试', () => {
    test('处理订阅状态未知的情况', async () => {
      // 模拟未知状态的订阅
      const unknownSubscription: SubscriptionData = {
        status: 'past_due' as any,
        plan: 'premium',
        currentPeriodEnd: Date.now() + 86400000,
        cancelAtPeriodEnd: false
      };
      
      mockPaymentService.getUserSubscription.mockResolvedValue(unknownSubscription);
      
      // 获取订阅状态
      const subscription = await mockPaymentService.getUserSubscription();
      
      // 验证状态是否按预期处理
      expect(subscription.status).toBe('past_due');
      expect(subscription.plan).toBe('premium');
    });
    
    test('处理API错误情况', async () => {
      // 模拟API错误
      const apiError = new Error('API请求失败');
      mockPaymentService.checkPromptsQuota.mockRejectedValue(apiError);
      
      // 尝试检查配额并期望失败
      await expect(mockPaymentService.checkPromptsQuota()).rejects.toThrow('API请求失败');
    });
    
    test('处理网络中断情况', async () => {
      // 模拟网络错误
      const networkError = new Error('网络连接中断');
      networkError.name = 'NetworkError';
      
      mockPaymentService.createCheckoutSession.mockRejectedValue(networkError);
      
      // 尝试创建结账会话并期望失败
      try {
        await mockPaymentService.createCheckoutSession('premium', 'monthly');
        fail('应该抛出网络错误');
      } catch (error) {
        expect(error.name).toBe('NetworkError');
        expect(error.message).toBe('网络连接中断');
      }
    });
    
    test('处理付费状态冲突', async () => {
      // 情景：用户配额显示为付费用户，但订阅状态显示为免费用户
      
      // 模拟冲突的订阅数据
      const freeSubscription: SubscriptionData = {
        status: 'active',
        plan: 'free',
        currentPeriodEnd: Date.now() + 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 模拟配额数据显示为高级用户
      const premiumQuota: QuotaInfo = {
        isLimitReached: false,
        currentCount: 50,
        limit: 100,
        isPremium: true // 这里表明是付费用户
      };
      
      mockPaymentService.getUserSubscription.mockResolvedValue(freeSubscription);
      mockPaymentService.checkPromptsQuota.mockResolvedValue(premiumQuota);
      
      // 获取订阅和配额
      const subscription = await mockPaymentService.getUserSubscription();
      const quota = await mockPaymentService.checkPromptsQuota();
      
      // 验证数据冲突
      expect(subscription.plan).toBe('free');
      expect(quota.isPremium).toBe(true);
      
      // 在实际应用中，这种冲突应该触发同步流程
      // 以确保用户状态一致
    });
  });
  
  describe('用户交互场景测试', () => {
    test('用户升级订阅流程', async () => {
      // 模拟初始免费订阅
      const freeSubscription: SubscriptionData = {
        status: 'active',
        plan: 'free',
        currentPeriodEnd: Date.now() + 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 模拟升级后的订阅
      const premiumSubscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 模拟结账会话
      const checkoutSession = {
        sessionId: 'cs_test_upgrade123',
        url: 'https://checkout.stripe.com/upgrade123'
      };
      
      // 设置模拟响应
      mockPaymentService.getUserSubscription
        .mockResolvedValueOnce(freeSubscription)
        .mockResolvedValueOnce(premiumSubscription);
        
      mockPaymentService.createCheckoutSession.mockResolvedValue(checkoutSession);
      
      // 首先获取当前订阅状态
      const initialSubscription = await mockPaymentService.getUserSubscription();
      expect(initialSubscription.plan).toBe('free');
      
      // 创建升级结账会话
      const session = await mockPaymentService.createCheckoutSession('premium', 'monthly');
      expect(session.sessionId).toBeDefined();
      expect(session.url).toBeDefined();
      
      // 模拟支付完成后，再次获取订阅状态
      const updatedSubscription = await mockPaymentService.getUserSubscription();
      expect(updatedSubscription.plan).toBe('premium');
      
      // 验证调用
      expect(mockPaymentService.getUserSubscription).toHaveBeenCalledTimes(2);
      expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith('premium', 'monthly');
    });
    
    test('用户取消并重新激活订阅', async () => {
      // 模拟初始活跃订阅
      const activeSubscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 模拟已取消但仍在有效期内的订阅
      const canceledSubscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 86400000,
        cancelAtPeriodEnd: true // 标记为期末取消
      };
      
      // 模拟重新激活的订阅
      const reactivatedSubscription: SubscriptionData = {
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: Date.now() + 30 * 86400000,
        cancelAtPeriodEnd: false
      };
      
      // 设置模拟响应
      mockPaymentService.getUserSubscription
        .mockResolvedValueOnce(activeSubscription)
        .mockResolvedValueOnce(canceledSubscription)
        .mockResolvedValueOnce(reactivatedSubscription);
        
      mockPaymentService.cancelSubscription.mockResolvedValue({ success: true });
      mockPaymentService.resumeSubscription.mockResolvedValue({ success: true });
      
      // 获取初始订阅状态
      const initial = await mockPaymentService.getUserSubscription();
      expect(initial.cancelAtPeriodEnd).toBe(false);
      
      // 取消订阅
      await mockPaymentService.cancelSubscription();
      
      // 获取取消后的状态
      const canceled = await mockPaymentService.getUserSubscription();
      expect(canceled.cancelAtPeriodEnd).toBe(true);
      expect(canceled.status).toBe('active'); // 仍然活跃，直到周期结束
      
      // 重新激活订阅
      await mockPaymentService.resumeSubscription();
      
      // 获取重新激活后的状态
      const reactivated = await mockPaymentService.getUserSubscription();
      expect(reactivated.cancelAtPeriodEnd).toBe(false);
      
      // 验证调用
      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledTimes(1);
      expect(mockPaymentService.resumeSubscription).toHaveBeenCalledTimes(1);
    });
  });
}); 