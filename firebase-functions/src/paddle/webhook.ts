import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// 初始化Firebase Admin
admin.initializeApp();

// Paddle公钥 - 需要从Paddle后台获取
const PADDLE_PUBLIC_KEY = process.env.PADDLE_PUBLIC_KEY || '';

interface WebhookEvent {
  alert_name: string;
  subscription_id?: string;
  user_id?: string;
  email?: string;
  subscription_plan_id?: string;
  status?: string;
  next_bill_date?: string;
  [key: string]: any;
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
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * 处理订阅创建事件
 */
async function handleSubscriptionCreated(event: WebhookEvent) {
  const { subscription_id, user_id, email, subscription_plan_id } = event;
  
  // 创建或更新用户文档
  await admin.firestore().collection('users').doc(user_id!).set({
    email,
    subscriptionId: subscription_id,
    planId: subscription_plan_id,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`Subscription created for user ${user_id}`);
}

/**
 * 处理订阅更新事件
 */
async function handleSubscriptionUpdated(event: WebhookEvent) {
  const { subscription_id, user_id, subscription_plan_id, status } = event;
  
  await admin.firestore().collection('users').doc(user_id!).update({
    subscriptionId: subscription_id,
    planId: subscription_plan_id,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Subscription updated for user ${user_id}`);
}

/**
 * 处理订阅取消事件
 */
async function handleSubscriptionCancelled(event: WebhookEvent) {
  const { user_id } = event;
  
  await admin.firestore().collection('users').doc(user_id!).update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    cancelledAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Subscription cancelled for user ${user_id}`);
}

/**
 * 处理订阅支付成功事件
 */
async function handleSubscriptionPaymentSucceeded(event: WebhookEvent) {
  const { user_id, next_bill_date } = event;
  
  await admin.firestore().collection('users').doc(user_id!).update({
    status: 'active',
    nextBillDate: next_bill_date,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Payment succeeded for user ${user_id}`);
}

/**
 * 处理订阅支付失败事件
 */
async function handleSubscriptionPaymentFailed(event: WebhookEvent) {
  const { user_id } = event;
  
  await admin.firestore().collection('users').doc(user_id!).update({
    status: 'payment_failed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Payment failed for user ${user_id}`);
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

    const event = req.body as WebhookEvent;
    console.log('Received webhook event:', event.alert_name);

    // 根据事件类型处理
    switch (event.alert_name) {
      case 'subscription_created':
        await handleSubscriptionCreated(event);
        break;
      
      case 'subscription_updated':
        await handleSubscriptionUpdated(event);
        break;
      
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event);
        break;
      
      case 'subscription_payment_succeeded':
        await handleSubscriptionPaymentSucceeded(event);
        break;
      
      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(event);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event.alert_name}`);
    }

    // 返回成功
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    // 即使发生错误也返回200,避免Paddle重试
    res.status(200).send('Webhook received');
  }
}); 