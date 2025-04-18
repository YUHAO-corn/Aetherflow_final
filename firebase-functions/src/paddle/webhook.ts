import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// 初始化Firebase Admin
admin.initializeApp();

// Paddle公钥 - 需要从Paddle后台获取
const PADDLE_PUBLIC_KEY = process.env.PADDLE_PUBLIC_KEY || '';

// 会员状态类型
type MembershipStatus = 'free' | 'pro' | 'trial';

interface WebhookEvent {
  alert_name: string;
  subscription_id?: string;
  user_id?: string;
  email?: string;
  subscription_plan_id?: string;
  status?: string;
  next_bill_date?: string;
  cancel_url?: string;
  update_url?: string;
  checkout_id?: string;
  passthrough?: string; // Paddle老版本API中的passthrough
  custom_data?: any;    // Paddle新版本API中的customData
  [key: string]: any;
}

// 会员状态数据结构
interface MembershipState {
  status: MembershipStatus;
  plan: 'monthly' | 'annual' | null;
  startedAt: number | null;
  expiresAt: number | null;
  cancelAtPeriodEnd: boolean;
  lastVerifiedAt: number;
  subscriptionId: string | null;
  customerId: string | null;
  updatedAt: number;
}

/**
 * 验证Paddle webhook签名
 */
function verifyPaddleWebhook(data: any, signature: string): boolean {
  try {
    // 序列化数据
    const serialized = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('');

    // 使用Paddle公钥验证签名
    const verifier = crypto.createVerify('sha1WithRSAEncryption');
    verifier.update(serialized);
    return verifier.verify(PADDLE_PUBLIC_KEY, signature, 'base64');
  } catch (error) {
    console.error('Webhook签名验证失败:', error);
    return false;
  }
}

/**
 * 从订阅计划ID确定订阅类型
 */
function getPlanTypeFromId(planId: string): 'monthly' | 'annual' | null {
  // 根据实际的计划ID进行映射
  // 这里需要根据实际的Paddle计划ID进行配置
  if (planId.includes('monthly')) {
    return 'monthly';
  } else if (planId.includes('annual')) {
    return 'annual';
  }
  return null;
}

/**
 * 从事件数据中提取Firebase用户ID
 * 同时支持旧版API的passthrough和新版API的customData
 */
function extractFirebaseUserId(event: WebhookEvent): string | null {
  try {
    // 尝试从新版API的customData中获取
    if (event.custom_data) {
      // 如果customData是字符串，尝试解析为JSON
      const customData = typeof event.custom_data === 'string' 
        ? JSON.parse(event.custom_data) 
        : event.custom_data;
      
      if (customData && customData.userId) {
        return customData.userId;
      }
    }
    
    // 尝试从旧版API的passthrough中获取
    if (event.passthrough) {
      const passthrough = JSON.parse(event.passthrough);
      if (passthrough && passthrough.userId) {
        return passthrough.userId;
      }
      // 兼容性：有些旧版可能直接存储了userId
      if (passthrough && passthrough.firebaseUserId) {
        return passthrough.firebaseUserId;
      }
    }
    
    // 如果找不到，返回null
    return null;
  } catch (error) {
    console.error('提取Firebase用户ID失败:', error);
    return null;
  }
}

/**
 * 创建或更新Paddle客户ID与Firebase用户ID的映射
 */
async function createUserIdMapping(paddleCustomerId: string, firebaseUserId: string): Promise<void> {
  try {
    const db = admin.firestore();
    
    // 在映射集合中创建文档
    await db.collection('customerMapping').doc(paddleCustomerId).set({
      paddleCustomerId,
      firebaseUserId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`已创建/更新用户ID映射: Paddle ID ${paddleCustomerId} -> Firebase ID ${firebaseUserId}`);
  } catch (error) {
    console.error(`创建/更新用户ID映射失败:`, error);
  }
}

/**
 * 查找与Paddle客户ID对应的Firebase用户ID
 */
async function findFirebaseUserIdByPaddleCustomerId(paddleCustomerId: string): Promise<string | null> {
  try {
    const db = admin.firestore();
    
    // 查询映射集合
    const mappingDoc = await db.collection('customerMapping').doc(paddleCustomerId).get();
    
    if (mappingDoc.exists) {
      return mappingDoc.data()?.firebaseUserId || null;
    }
    
    return null;
  } catch (error) {
    console.error(`查找Firebase用户ID失败:`, error);
    return null;
  }
}

/**
 * 更新用户的会员状态
 */
async function updateUserMembership(userId: string, membershipState: MembershipState): Promise<void> {
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    
    // 更新用户文档中的会员信息
    await userRef.set({
      membership: {
        status: membershipState.status,
        plan: membershipState.plan,
        startedAt: membershipState.startedAt,
        expiresAt: membershipState.expiresAt,
        cancelAtPeriodEnd: membershipState.cancelAtPeriodEnd,
        subscriptionId: membershipState.subscriptionId,
        customerId: membershipState.customerId,
        updatedAt: Date.now()
      }
    }, { merge: true });
    
    // 更新专门的会员状态文档
    const membershipRef = userRef.collection('membership').doc('status');
    await membershipRef.set(membershipState);
    
    console.log(`会员状态已更新，用户ID: ${userId}, 状态: ${membershipState.status}`);
  } catch (error) {
    console.error(`更新用户会员状态失败，用户ID: ${userId}:`, error);
    throw error;
  }
}

/**
 * 处理订阅创建事件
 */
async function handleSubscriptionCreated(event: WebhookEvent) {
  const { subscription_id, user_id, email, subscription_plan_id, next_bill_date } = event;
  
  if (!user_id || !subscription_id) {
    console.error('缺少必要的用户ID或订阅ID:', event);
    return;
  }
  
  // 提取Firebase用户ID（从passthrough或customData）
  let firebaseUserId = extractFirebaseUserId(event);
  
  // 如果找不到Firebase用户ID，尝试从映射中查找
  if (!firebaseUserId) {
    firebaseUserId = await findFirebaseUserIdByPaddleCustomerId(user_id);
  }
  
  // 如果还是找不到，记录错误并使用Paddle用户ID
  const userId = firebaseUserId || user_id;
  
  // 如果找到了Firebase用户ID，创建/更新映射
  if (firebaseUserId) {
    await createUserIdMapping(user_id, firebaseUserId);
  } else {
    console.warn(`无法找到对应的Firebase用户ID，使用Paddle用户ID: ${user_id}`);
  }
  
  // 计算到期日期
  const expiresAt = next_bill_date ? new Date(next_bill_date).getTime() : null;
  
  // 确定订阅计划类型
  const planType = subscription_plan_id ? getPlanTypeFromId(subscription_plan_id) : null;
  
  // 构建会员状态
  const membershipState: MembershipState = {
    status: 'pro',
    plan: planType,
    startedAt: Date.now(),
    expiresAt,
    cancelAtPeriodEnd: false,
    lastVerifiedAt: Date.now(),
    subscriptionId: subscription_id,
    customerId: user_id,
    updatedAt: Date.now()
  };
  
  // 更新用户会员状态
  await updateUserMembership(userId, membershipState);
  
  // 更新用户基本信息
  await admin.firestore().collection('users').doc(userId).set({
    email,
    paddleCustomerId: user_id, // 添加Paddle客户ID到用户记录
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`订阅已创建，用户ID: ${userId}, Paddle客户ID: ${user_id}, 订阅ID: ${subscription_id}`);
}

/**
 * 处理订阅更新事件
 */
async function handleSubscriptionUpdated(event: WebhookEvent) {
  const { subscription_id, user_id, subscription_plan_id, status, next_bill_date } = event;
  
  if (!user_id || !subscription_id) {
    console.error('缺少必要的用户ID或订阅ID:', event);
    return;
  }
  
  // 提取Firebase用户ID（从passthrough或customData）
  let firebaseUserId = extractFirebaseUserId(event);
  
  // 如果找不到Firebase用户ID，尝试从映射中查找
  if (!firebaseUserId) {
    firebaseUserId = await findFirebaseUserIdByPaddleCustomerId(user_id);
  }
  
  // 如果还是找不到，记录错误并使用Paddle用户ID
  const userId = firebaseUserId || user_id;
  
  // 如果找到了Firebase用户ID，创建/更新映射
  if (firebaseUserId) {
    await createUserIdMapping(user_id, firebaseUserId);
  } else {
    console.warn(`无法找到对应的Firebase用户ID，使用Paddle用户ID: ${user_id}`);
  }
  
  // 获取当前的会员状态
  const db = admin.firestore();
  const membershipDoc = await db.collection('users').doc(userId).collection('membership').doc('status').get();
  
  let currentState: MembershipState | null = null;
  if (membershipDoc.exists) {
    currentState = membershipDoc.data() as MembershipState;
  } else {
    // 尝试从用户文档中获取
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.membership) {
      const userData = userDoc.data()!;
      currentState = {
        status: userData.membership.status || 'free',
        plan: userData.membership.plan || null,
        startedAt: userData.membership.startedAt || null,
        expiresAt: userData.membership.expiresAt || null,
        cancelAtPeriodEnd: userData.membership.cancelAtPeriodEnd || false,
        lastVerifiedAt: Date.now(),
        subscriptionId: userData.membership.subscriptionId || null,
        customerId: userData.membership.customerId || null,
        updatedAt: Date.now()
      };
    }
  }
  
  // 如果没有找到会员状态，创建一个新的
  if (!currentState) {
    currentState = {
      status: 'free',
      plan: null,
      startedAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      lastVerifiedAt: Date.now(),
      subscriptionId: null,
      customerId: null,
      updatedAt: Date.now()
    };
  }
  
  // 计算到期日期
  const expiresAt = next_bill_date ? new Date(next_bill_date).getTime() : currentState.expiresAt;
  
  // 确定订阅计划类型
  const planType = subscription_plan_id ? getPlanTypeFromId(subscription_plan_id) : currentState.plan;
  
  // 确定会员状态
  // 如果状态为active或trialing，则设为pro
  const membershipStatus: MembershipStatus = 
    status === 'active' || status === 'trialing' ? 'pro' :
    status === 'paused' ? 'pro' : 'free';
  
  // 确定是否将在周期结束后取消
  // 如果status为active但有pending_cancel标记，则设为true
  const cancelAtPeriodEnd = event.paused_at ? false :
                           (status === 'active' && event.pending_cancel === '1');
  
  // 构建更新后的会员状态
  const updatedState: MembershipState = {
    ...currentState,
    status: membershipStatus,
    plan: planType,
    expiresAt,
    cancelAtPeriodEnd,
    lastVerifiedAt: Date.now(),
    subscriptionId: subscription_id,
    customerId: user_id,
    updatedAt: Date.now()
  };
  
  // 更新用户会员状态
  await updateUserMembership(userId, updatedState);

  console.log(`订阅已更新，用户ID: ${userId}, Paddle客户ID: ${user_id}, 订阅ID: ${subscription_id}`);
}

/**
 * 处理订阅取消事件
 */
async function handleSubscriptionCancelled(event: WebhookEvent) {
  const { user_id, subscription_id } = event;
  
  if (!user_id) {
    console.error('缺少必要的用户ID:', event);
    return;
  }
  
  // 提取Firebase用户ID（从passthrough或customData）
  let firebaseUserId = extractFirebaseUserId(event);
  
  // 如果找不到Firebase用户ID，尝试从映射中查找
  if (!firebaseUserId) {
    firebaseUserId = await findFirebaseUserIdByPaddleCustomerId(user_id);
  }
  
  // 如果还是找不到，记录错误并使用Paddle用户ID
  const userId = firebaseUserId || user_id;
  
  // 获取当前的会员状态
  const db = admin.firestore();
  const membershipDoc = await db.collection('users').doc(userId).collection('membership').doc('status').get();
  
  let currentState: MembershipState | null = null;
  if (membershipDoc.exists) {
    currentState = membershipDoc.data() as MembershipState;
  } else {
    // 尝试从用户文档中获取
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.membership) {
      const userData = userDoc.data()!;
      currentState = {
        status: userData.membership.status || 'free',
        plan: userData.membership.plan || null,
        startedAt: userData.membership.startedAt || null,
        expiresAt: userData.membership.expiresAt || null,
        cancelAtPeriodEnd: userData.membership.cancelAtPeriodEnd || false,
        lastVerifiedAt: Date.now(),
        subscriptionId: userData.membership.subscriptionId || null,
        customerId: userData.membership.customerId || null,
        updatedAt: Date.now()
      };
    }
  }
  
  // 如果没有找到会员状态，创建一个新的
  if (!currentState) {
    currentState = {
      status: 'free',
      plan: null,
      startedAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      lastVerifiedAt: Date.now(),
      subscriptionId: null,
      customerId: null,
      updatedAt: Date.now()
    };
  }
  
  // 处理不同的取消情况
  // 1. 立即取消（subscription_end_date为当前日期）
  // 2. 周期结束后取消（subscription_end_date为将来日期）
  const endDate = event.subscription_end_date ? new Date(event.subscription_end_date).getTime() : null;
  const now = Date.now();
  
  // 如果结束日期是当前或过去，立即将状态设为free
  // 否则标记为在周期结束后取消，但保持pro状态直到结束日期
  if (endDate && endDate <= now) {
    // 立即取消
    const updatedState: MembershipState = {
      ...currentState,
      status: 'free',
      cancelAtPeriodEnd: false,
      expiresAt: endDate || now,
      lastVerifiedAt: now,
      updatedAt: now
    };
    
    await updateUserMembership(userId, updatedState);
  } else {
    // 周期结束后取消
    const updatedState: MembershipState = {
      ...currentState,
      cancelAtPeriodEnd: true,
      expiresAt: endDate || currentState.expiresAt,
      lastVerifiedAt: now,
      updatedAt: now
    };
    
    await updateUserMembership(userId, updatedState);
  }

  console.log(`订阅已取消，用户ID: ${userId}, Paddle客户ID: ${user_id}, 订阅ID: ${subscription_id || 'unknown'}`);
}

/**
 * 处理订阅支付成功事件
 */
async function handleSubscriptionPaymentSucceeded(event: WebhookEvent) {
  const { user_id, subscription_id, next_bill_date } = event;
  
  if (!user_id) {
    console.error('缺少必要的用户ID:', event);
    return;
  }
  
  // 提取Firebase用户ID（从passthrough或customData）
  let firebaseUserId = extractFirebaseUserId(event);
  
  // 如果找不到Firebase用户ID，尝试从映射中查找
  if (!firebaseUserId) {
    firebaseUserId = await findFirebaseUserIdByPaddleCustomerId(user_id);
  }
  
  // 如果还是找不到，记录错误并使用Paddle用户ID
  const userId = firebaseUserId || user_id;
  
  // 如果找到了Firebase用户ID，创建/更新映射
  if (firebaseUserId) {
    await createUserIdMapping(user_id, firebaseUserId);
  } else {
    console.warn(`无法找到对应的Firebase用户ID，使用Paddle用户ID: ${user_id}`);
  }
  
  // 获取当前的会员状态
  const db = admin.firestore();
  const membershipDoc = await db.collection('users').doc(userId).collection('membership').doc('status').get();
  
  let currentState: MembershipState | null = null;
  if (membershipDoc.exists) {
    currentState = membershipDoc.data() as MembershipState;
  } else {
    // 尝试从用户文档中获取
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.membership) {
      const userData = userDoc.data()!;
      currentState = {
        status: userData.membership.status || 'free',
        plan: userData.membership.plan || null,
        startedAt: userData.membership.startedAt || null,
        expiresAt: userData.membership.expiresAt || null,
        cancelAtPeriodEnd: userData.membership.cancelAtPeriodEnd || false,
        lastVerifiedAt: Date.now(),
        subscriptionId: userData.membership.subscriptionId || null,
        customerId: userData.membership.customerId || null,
        updatedAt: Date.now()
      };
    }
  }
  
  // 如果没有找到会员状态，创建一个新的
  if (!currentState) {
    currentState = {
      status: 'free',
      plan: null,
      startedAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      lastVerifiedAt: Date.now(),
      subscriptionId: null,
      customerId: null,
      updatedAt: Date.now()
    };
  }
  
  // 计算新的到期日期
  const expiresAt = next_bill_date ? new Date(next_bill_date).getTime() : currentState.expiresAt;
  
  // 更新会员状态
  const updatedState: MembershipState = {
    ...currentState,
    status: 'pro', // 支付成功，确保状态为pro
    expiresAt,
    lastVerifiedAt: Date.now(),
    subscriptionId: subscription_id || currentState.subscriptionId,
    customerId: user_id,
    updatedAt: Date.now()
  };
  
  // 更新用户会员状态
  await updateUserMembership(userId, updatedState);
  
  // 记录支付历史
  await admin.firestore().collection('users').doc(userId)
    .collection('paymentHistory').add({
      subscriptionId: subscription_id,
      amount: event.amount,
      currency: event.currency,
      paymentDate: Date.now(),
      nextBillDate: expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log(`支付成功，用户ID: ${userId}, Paddle客户ID: ${user_id}, 订阅ID: ${subscription_id || 'unknown'}`);
}

/**
 * 处理订阅支付失败事件
 */
async function handleSubscriptionPaymentFailed(event: WebhookEvent) {
  const { user_id, subscription_id } = event;
  
  if (!user_id) {
    console.error('缺少必要的用户ID:', event);
    return;
  }
  
  // 提取Firebase用户ID（从passthrough或customData）
  let firebaseUserId = extractFirebaseUserId(event);
  
  // 如果找不到Firebase用户ID，尝试从映射中查找
  if (!firebaseUserId) {
    firebaseUserId = await findFirebaseUserIdByPaddleCustomerId(user_id);
  }
  
  // 如果还是找不到，记录错误并使用Paddle用户ID
  const userId = firebaseUserId || user_id;
  
  // 注意：不要立即将用户降级为免费用户
  // 支付失败通常会有多次重试，此时应该记录失败状态但不改变会员状态
  // 如果多次失败后订阅被取消，会触发subscription_cancelled事件
  
  // 记录支付失败历史
  await admin.firestore().collection('users').doc(userId)
    .collection('paymentHistory').add({
      subscriptionId: subscription_id,
      status: 'failed',
      failureReason: event.error || '未知错误',
      failureDate: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  // 将失败信息添加到用户文档，但不改变会员状态
  await admin.firestore().collection('users').doc(userId).set({
    paymentFailures: admin.firestore.FieldValue.increment(1),
    lastPaymentFailure: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`支付失败，用户ID: ${userId}, Paddle客户ID: ${user_id}, 订阅ID: ${subscription_id || 'unknown'}`);
}

/**
 * 处理交易完成事件
 */
async function handleTransactionCompleted(event: WebhookEvent) {
  try {
    const data = event.data;
    if (!data || !data.subscription_id) {
      console.log('交易完成事件中没有订阅ID，跳过处理');
      return;
    }
    
    // 获取相关订阅的信息
    const subscriptionId = data.subscription_id;
    const customerId = data.customer_id;
    
    if (!customerId) {
      console.error('交易完成事件中缺少客户ID:', event);
      return;
    }
    
    console.log(`处理交易完成事件，订阅ID: ${subscriptionId}, 客户ID: ${customerId}`);
    
    // 提取Firebase用户ID
    let firebaseUserId = extractFirebaseUserId(event);
    
    // 如果找不到Firebase用户ID，尝试从映射中查找
    if (!firebaseUserId) {
      firebaseUserId = await findFirebaseUserIdByPaddleCustomerId(customerId);
    }
    
    // 如果还是找不到，记录错误并使用Paddle用户ID
    const userId = firebaseUserId || customerId;
    
    // 如果找到了Firebase用户ID，创建/更新映射
    if (firebaseUserId) {
      await createUserIdMapping(customerId, firebaseUserId);
    } else {
      console.warn(`无法找到对应的Firebase用户ID，使用Paddle用户ID: ${customerId}`);
    }
    
    // 查询订阅信息
    // 注意：实际实现可能需要调用Paddle API获取订阅详情
    // 这里简化处理，假设订阅是有效的
    const membershipState: MembershipState = {
      status: 'pro',
      plan: data.items && data.items[0] && data.items[0].price && data.items[0].price.billing_cycle 
            ? (data.items[0].price.billing_cycle.interval === 'month' ? 'monthly' : 'annual')
            : null,
      startedAt: Date.now(),
      expiresAt: data.next_payment ? new Date(data.next_payment.date).getTime() : null,
      cancelAtPeriodEnd: false,
      lastVerifiedAt: Date.now(),
      subscriptionId: subscriptionId,
      customerId: customerId,
      updatedAt: Date.now()
    };
    
    // 更新用户会员状态
    await updateUserMembership(userId, membershipState);
    
    console.log(`交易完成，已更新会员状态，用户ID: ${userId}, 订阅ID: ${subscriptionId}`);
  } catch (error) {
    console.error('处理交易完成事件失败:', error);
  }
}

/**
 * Paddle webhook处理函数
 */
export const handlePaddleWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // 只允许POST请求
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signature = req.get('Paddle-Signature');
    if (!signature) {
      res.status(400).send('Missing signature');
      return;
    }

    // 验证webhook签名
    if (!verifyPaddleWebhook(req.body, signature)) {
      res.status(401).send('Invalid signature');
      return;
    }

    // 新版Paddle API (v2)使用event_type，旧版使用alert_name
    const eventType = req.body.event_type || req.body.alert_name;
    console.log('收到webhook事件:', eventType);

    // 根据事件类型处理
    switch (eventType) {
      // 旧版API事件
      case 'subscription_created':
        await handleSubscriptionCreated(req.body);
        break;
      
      case 'subscription_updated':
        await handleSubscriptionUpdated(req.body);
        break;
      
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(req.body);
        break;
      
      case 'subscription_payment_succeeded':
        await handleSubscriptionPaymentSucceeded(req.body);
        break;
      
      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(req.body);
        break;
      
      // 新版API事件
      case 'subscription.created':
        await handleSubscriptionCreated(req.body);
        break;
      
      case 'subscription.updated':
        await handleSubscriptionUpdated(req.body);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(req.body);
        break;
      
      case 'subscription.activated':
        await handleSubscriptionUpdated(req.body);
        break;
      
      case 'transaction.completed':
        await handleTransactionCompleted(req.body);
        break;
      
      case 'subscription.payment.succeeded':
        await handleSubscriptionPaymentSucceeded(req.body);
        break;
      
      case 'subscription.payment.failed':
        await handleSubscriptionPaymentFailed(req.body);
        break;
      
      default:
        console.log(`未处理的webhook事件: ${eventType}`);
    }

    // 返回成功
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('处理webhook时出错:', error);
    // 即使发生错误也返回200,避免Paddle重试
    res.status(200).send('Webhook received');
  }
}); 