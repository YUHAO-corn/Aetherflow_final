import { membershipService } from '../src/services/membership';
import { STORAGE_KEYS } from '../src/services/storage/constants';
import { storageService } from '../src/services/storage';

// 测试前清理
beforeEach(async () => {
  // 清除会员状态数据
  await storageService.remove(STORAGE_KEYS.MEMBERSHIP);
});

describe('会员状态服务测试', () => {
  test('初始状态应该是免费会员', async () => {
    const membership = await membershipService.getCurrentMembership();
    expect(membership.status).toBe('free');
    expect(membership.plan).toBeNull();
    expect(membership.subscriptionId).toBeNull();
    expect(membership.expiresAt).toBeNull();
  });

  test('isProMember 正确判断会员状态', async () => {
    // 初始应该是免费会员
    let isPro = await membershipService.isProMember();
    expect(isPro).toBe(false);

    // 设置为Pro会员
    await membershipService.updateMembershipState({
      status: 'pro',
      plan: 'monthly',
      startedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      subscriptionId: 'test_sub_id',
      customerId: 'test_customer_id'
    });

    // 现在应该是Pro会员
    isPro = await membershipService.isProMember();
    expect(isPro).toBe(true);
  });

  test('过期的Pro会员应该变为免费会员', async () => {
    // 设置为过期的Pro会员
    await membershipService.updateMembershipState({
      status: 'pro',
      plan: 'monthly',
      startedAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60天前
      expiresAt: Date.now() - 1000, // 刚过期
      subscriptionId: 'test_sub_id',
      customerId: 'test_customer_id'
    });

    // 检查状态，应自动降级为免费会员
    const isPro = await membershipService.isProMember();
    expect(isPro).toBe(false);

    // 确认状态已更新
    const membership = await membershipService.getCurrentMembership();
    expect(membership.status).toBe('free');
  });

  test('获取会员权益配额', async () => {
    // 免费会员配额
    let quota = await membershipService.getMembershipQuota();
    expect(quota.maxPrompts).toBe(5);
    expect(quota.dailyOptimizations).toBe(3);
    expect(quota.canExport).toBe(false);

    // 设置为Pro会员
    await membershipService.updateMembershipState({
      status: 'pro',
      plan: 'monthly',
      startedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    // Pro会员配额
    quota = await membershipService.getMembershipQuota();
    expect(quota.maxPrompts).toBe(100);
    expect(quota.dailyOptimizations).toBe(50);
    expect(quota.canExport).toBe(true);
  });

  test('观察者模式正确通知状态变化', async () => {
    const mockObserver = jest.fn();
    
    // 添加观察者
    const unsubscribe = membershipService.onMembershipChange(mockObserver);
    
    // 更新状态
    await membershipService.updateMembershipState({
      status: 'pro'
    });
    
    // 观察者应该被调用
    expect(mockObserver).toHaveBeenCalledTimes(1);
    expect(mockObserver.mock.calls[0][0].status).toBe('pro');
    
    // 取消订阅
    unsubscribe();
    
    // 再次更新状态
    await membershipService.updateMembershipState({
      status: 'free'
    });
    
    // 观察者不应该被再次调用
    expect(mockObserver).toHaveBeenCalledTimes(1);
  });
}); 