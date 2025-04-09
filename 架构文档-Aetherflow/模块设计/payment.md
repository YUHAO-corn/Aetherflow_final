# AetherFlow 付费功能设计文档

**文档版本**: 1.1.0  
**更新日期**: 2024-04-15  
**状态**: 待实施

## 目录
- [1. 概述](#1-概述)
- [2. 市场分析](#2-市场分析)
- [3. 付费模型](#3-付费模型)
- [4. 用户流程](#4-用户流程)
- [5. UI设计](#5-ui设计)
- [6. 技术实现](#6-技术实现)
- [7. 资金处理](#7-资金处理)
- [8. 法律合规](#8-法律合规)
- [9. 附录: Paddle接入资源](#9-附录-paddle接入资源)

## 1. 概述

```yaml
背景:
  产品阶段: 核心功能已完成（提示词管理、优化、存储和认证系统）
  当前需求: 实现付费功能作为最后一个关键模块

目标:
  - 实现商业变现，提供持续收入
  - 区分服务级别，满足不同用户需求
  - 提升付费用户体验
  - 建立可持续发展的商业模式

设计原则:
  - 简单直接: 避免复杂计费模型，用户易于理解
  - 技术可行: 利用现有基础设施，最小化自建服务
  - 国际化设计: 符合海外用户使用习惯
  - 合规性: 符合Chrome商店政策和国际支付法规
  - 轻量化开发: 避免过度工程化，专注必要功能
```

## 2. 市场分析

```yaml
Chrome扩展付费趋势:
  付费模式:
    - 一次性付费: 购买后永久使用，适合功能稳定的工具
    - 订阅制: 按月/年付费，适合持续迭代的应用
    - 免费+高级版: 基础功能免费，高级功能付费，最受欢迎
    - 应用内购买: 按功能或使用量付费，较少见于扩展
  
  用户偏好:
    价格预期: $2-5/月或$20-50/年区间
    试用期望: 7-14天试用期或有限免费版本
    付款方式: 信用卡、PayPal等国际通用支付方式
    升级动机: 更高使用限制（存储空间、API调用次数等）

竞品分析:
  市场主流: 
    - Grammarly: 免费+订阅模式，$12/月
    - LastPass: 免费+订阅模式，$3/月
  共同特点: 多采用「免费+订阅」模式，通过使用量限制区分版本
  
  推荐模式: 对于AetherFlow这类工具型扩展，最适合「免费+订阅」模式，
          基础功能免费使用，高级功能和更高使用限额付费
```

## 3. 付费模型

```yaml
定价策略:
  会员等级:
    - 免费会员: 基础功能有限制使用
    - 专业会员: 月付$4.99/月或年付$39.99/年（节省33%）
  付费渠道: Paddle（全球收款服务商）

功能差异:
  提示词存储:
    免费版: 最多5个
    专业版: 最多100个
  优化次数:
    免费版: 每日3次
    专业版: 每日50次
  专属功能:
    - 高级提示词分析（专业版独有）
    - 优先技术支持（专业版独有）
    - 多格式数据导出（专业版独有）
  共享功能:
    - 多设备同步
    - 基础提示词功能

订阅策略:
  试用机制: 新用户自动获得7天专业版试用，无需信用卡
  试用结束: 自动降级至免费版
  续费机制: 自动续订，提前7天发送提醒
  降级处理: 
    - 会员到期后，超额数据保留但标记为"只读"
    - 重新订阅后可恢复编辑
    - 超额提示词显示锁图标，点击提示恢复订阅
    - 超额数据不会被删除，但无法编辑、使用或复制
```

## 4. 用户流程

```yaml
用户旅程:
  主要阶段:
    - 免费阶段: 配额提醒、配额用尽、试用期体验
    - 付费阶段: 会员标识、扩展配额、会员管理
    - 续费阶段: 到期提醒、自动续费、续费失败处理
  
免费阶段流程:
  首次使用: 静默启用免费版，无特殊提示
  接近配额上限: 状态栏温和提示（如"还可添加1个提示词"）
  达到配额上限: 在操作区直接显示配额用尽提示和升级按钮
  试用体验: 首次登录提供7天试用，第6天发送提醒
  升级入口: 
    - 头像菜单中的"升级到专业版"选项
    - 头像旁边的置灰升级标识
    - 配额用尽处的升级按钮
    - 试用期即将结束通知中的升级按钮

付费阶段流程:
  付费成功: 显示成功反馈，头像旁升级标识变为PRO标识
  会员状态: 头像旁PRO标识，悬停可查看状态
  配额使用: 静默消耗配额，接近上限时提醒（90%）
  会员管理: 
    - 点击头像菜单中的"管理订阅"选项
    - 点击PRO标识
    - 显示内容：订阅状态、到期时间、当日剩余配额、总配额使用情况

续费阶段流程:
  续费提醒: 到期前7天发送通知，到期前1天弹出提示
  自动续费: 成功续费发送简短通知确认
  续费失败: 显示通知提示更新支付方式
  会员到期: 
    - PRO标识变回置灰的升级标识
    - 超额提示词变为只读状态
    - 只读提示词显示锁图标和半透明黑色遮罩
    - 点击只读提示词显示升级按钮

关键交互流程:
  升级流程:
    1. 用户点击任一升级入口（头像旁标识、菜单选项、配额用尽处按钮）
    2. 直接打开升级计划抽屉，显示订阅选项
    3. 用户选择月度/年度计划
    4. 抽屉切换到支付过渡模式
    5. 打开Paddle支付页面（浏览器弹窗）完成支付
    6. 支付完成后关闭弹窗，更新UI状态为会员
  
  配额用尽流程:
    1. 用户尝试超出配额操作（如创建第6个提示词）
    2. 操作被拦截，直接在操作区显示简洁提示和升级按钮
    3. 用户点击升级按钮，直接打开升级计划抽屉
    4. 用户也可选择关闭提示，稍后再决定
  
  会员管理流程:
    1. 付费用户点击PRO标识或头像菜单中的"管理订阅"
    2. 打开会员管理抽屉，显示当前订阅信息
    3. 显示内容：订阅状态、到期时间、当日剩余配额、总配额使用情况
    4. 提供续订、取消选项和账单历史查看（链接到Paddle客户门户）
  
  过期降级流程:
    1. 会员到期后，系统自动降级为免费账户
    2. PRO标识变回置灰的升级标识
    3. 超出免费配额的提示词变为只读状态
    4. 用户尝试使用只读提示词时，显示升级按钮
    5. 点击升级按钮直接打开升级计划抽屉
    6. 用户重新订阅后，所有只读内容立即恢复正常状态
```

## 5. UI设计

```yaml
核心UI组件:
  会员标识:
    位置: 用户头像旁
    未付费状态: 
      - 置灰的升级标识（如"升级"文字或向上箭头图标）
      - 点击直接打开升级计划抽屉
    付费状态: 
      - 醒目的PRO标签或小型火箭图标
      - 颜色: 与品牌一致的渐变蓝紫色
      - 交互: 悬停显示会员状态和到期时间，点击打开会员管理抽屉
  
  统一抽屉组件:
    基础设计: 复用现有SettingsDrawer组件
    交互模式: 支持两种核心模式
    视觉统一: 保持一致的头部和底部设计

抽屉组件模式:
  升级计划模式:
    - 显示两种订阅选项卡片（月度/年度）
    - 突出年度计划优惠（"节省33%"）
    - 列出专业版特权和功能对比
    - 来源: 从任何升级入口点击后显示
  
  会员管理模式:
    - 显示当前订阅状态、到期时间
    - 展示当日剩余配额和总体使用情况
    - 提供续订、取消选项和账单历史
    - 来源: 付费用户点击PRO标识或会员管理选项
  
  支付反馈模式:
    - 显示支付状态（进行中、成功、失败）
    - 提供返回选项
    - 支付成功时显示简洁的成功动画
    - 临时状态: 在支付过程中显示

配额用尽提示:
  设计原则: 简洁直观，不打断工作流
  出现位置: 直接在触发位置显示（如创建按钮处）
  内容组成:
    - 简短文字说明（"已达到免费版5个提示词上限"）
    - 醒目的升级按钮
    - 可选的关闭按钮
  交互方式: 
    - 点击升级按钮直接打开升级计划抽屉
    - 点击关闭则暂时隐藏提示

通知与提示:
  配额提醒: 状态栏临时显示，不打断操作
  升级提示: 仅在配额用尽或试用即将结束时显示
  续费通知: 到期前7天发送，可忽略或直接点击升级
  
只读状态设计:
  视觉效果:
    - 半透明黑色遮罩 (rgba(0, 0, 0, 0.5))
    - 中央锁图标（紫色，#8b5cf6）
    - 淡紫色背景发光效果
  交互设计: 
    - 点击显示简洁的升级按钮
    - 悬停锁图标放大
    - 无法编辑、复制或使用内容
  过渡动画: 平滑的淡入遮罩效果
```

## 6. 技术实现

```yaml
系统架构:
  前端: Chrome扩展实现UI层
  用户认证: Firebase Auth
  支付处理: Paddle
  数据存储: Firebase Firestore
  业务逻辑: Firebase Cloud Functions

数据模型:
  User模型扩展:
    - subscriptionStatus: 订阅状态（free/trial/premium/expired）
    - subscriptionExpiry: 订阅到期时间
    - paddleSubscriptionId: Paddle订阅ID
    - paymentHistory: 支付记录
    - usageQuotas: 使用配额信息
  
  Prompt模型扩展:
    - isReadOnly: 标记只读状态（超过免费额度）
    - tier: 创建时的用户等级（free/premium）

关键服务:
  订阅管理服务:
    - 获取订阅状态
    - 检查功能可用性
    - 处理订阅状态变更
    - 监听订阅状态
  
  配额管理服务:
    - 检查配额可用性
    - 消耗配额
    - 重置配额
    - 配额使用统计
  
  支付集成服务:
    - 创建Paddle支付链接
    - 处理Paddle Webhook回调
    - 记录交易
    - 处理退款

配额管理机制:
  存储配额:
    - 免费版: 5个提示词
    - 专业版: 100个提示词
    - 实现: 在创建/编辑前检查配额
  
  优化配额:
    - 免费版: 每日3次
    - 专业版: 每日50次
    - 重置: 每天UTC 00:00自动重置
    - 实现: 调用API前检查配额

降级处理机制:
  降级触发: 订阅到期且未续费
  数据处理: 
    - 保留所有数据，不删除
    - 超出免费限制的数据标记为只读
    - 数据库层面设置isReadOnly标记
  用户体验: 
    - UI显示锁定状态
    - 尝试操作时直接显示升级按钮
    - 重新订阅后立即恢复访问权限

Paddle接入技术实现:
  集成方式:
    - 客户端生成支付链接
    - 服务端处理Webhook通知
    - 使用Paddle Checkout API创建支付页面
  
  支付流程实现:
    1. 前端创建支付请求
      ```javascript
      // 示例代码
      const openPaddleCheckout = (planId) => {
        // 初始化Paddle
        Paddle.Setup({ vendor: PADDLE_VENDOR_ID });
        
        // 打开支付窗口
        Paddle.Checkout.open({
          product: planId,
          email: user.email,
          successCallback: handlePaymentSuccess,
          closeCallback: handlePaymentCancelled
        });
      };
      ```
    
    2. 用户完成支付后，Paddle发送Webhook到我们的Firebase Function
      ```javascript
      // Firebase Function示例
      exports.paddleWebhook = functions.https.onRequest(async (req, res) => {
        // 验证Webhook签名
        if (!verifyPaddleSignature(req)) {
          return res.status(403).send('Invalid signature');
        }
        
        // 处理不同事件类型
        const eventType = req.body.alert_name;
        
        switch (eventType) {
          case 'subscription_created':
            await handleSubscriptionCreated(req.body);
            break;
          case 'subscription_cancelled':
            await handleSubscriptionCancelled(req.body);
            break;
          case 'subscription_payment_succeeded':
            await handlePaymentSucceeded(req.body);
            break;
          // 处理其他事件...
        }
        
        res.status(200).send('Webhook processed');
      });
      ```
    
    3. 更新用户订阅状态
      ```javascript
      // 处理订阅创建
      const handleSubscriptionCreated = async (data) => {
        const { email, subscription_id, next_bill_date } = data;
        
        // 查找用户
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // 更新用户订阅信息
        await admin.firestore().collection('users').doc(userRecord.uid).update({
          subscriptionStatus: 'premium',
          subscriptionExpiry: new Date(next_bill_date).getTime(),
          paddleSubscriptionId: subscription_id
        });
      };
      ```
  
  API端点设计:
    - `/api/paddle/webhook`: 接收Paddle事件通知
    - `/api/subscriptions/status`: 获取用户订阅状态
    - `/api/subscriptions/manage`: 生成订阅管理链接
  
  操作实现流程:
    1. Paddle账户创建
       - 注册Paddle Seller账户（需个人身份证）
       - 创建产品和订阅计划
       - 设置Webhook URL指向我们的Firebase Function
    
    2. 集成准备
       - 获取Paddle Vendor ID和API密钥
       - 配置Firebase环境变量
       - 设置安全策略（CORS、验证等）
    
    3. 前端集成
       - 添加Paddle.js到应用
       - 实现支付按钮和回调处理
       - 创建订阅管理界面
    
    4. 后端处理
       - 实现Webhook接收和验证
       - 编写订阅状态管理逻辑
       - 实现配额检查机制
```

## 7. 资金处理

```yaml
Paddle收款方案:
  优势:
    - 一站式解决方案: 支付处理+订阅管理+VAT计算与缴纳
    - 无需境外公司: 个人开发者可直接使用
    - 覆盖全球主流支付方式: 信用卡、PayPal、Apple Pay等
    - 提供全面订阅管理功能: 试用、升级、降级、取消等
  
  费率结构:
    标准费用: 5% + $0.5/笔
    实际优化成本: 可降至10-12%（含税务和转账成本）
    月流水$3000+: 可申请费率降至4%
  
  资金提现:
    基本流程: Paddle → 银行账户或Wise账户
    优化路径: Paddle → Wise → 香港个人账户 → 内地
    提现周期: 每月1-2次
    最小提现额: $50

税务与合规:
  国际税务: Paddle自动处理欧盟VAT和国际销售税
  中国税务: 
    - 从境外汇入资金需缴纳个人所得税
    - 年收入低于6万元可免征个税
  必要文件:
    - 隐私政策
    - 使用条款
    - 自动续费声明
```

## 8. 法律合规

```yaml
Chrome商店政策:
  支付处理:
    - 允许通过外部支付系统处理
    - 必须明确告知支付在浏览器外进行
    - 不得在扩展内直接处理信用卡信息
  
  订阅规则:
    - 明确订阅费用、周期和自动续费机制
    - 提供简单的取消方式
    - 明确退款政策
  
  权限使用:
    - 不要求付费功能使用非必要权限
    - 基础功能不受支付影响
  
  数据处理:
    - 提供完整的隐私政策
    - 清晰说明数据收集和使用方式

用户隐私保护:
  数据收集: 明确告知收集的用户数据类型
  数据使用: 说明数据用途和共享方式
  用户权利: 提供数据导出和删除选项
  合规标准: 符合欧盟GDPR等国际隐私法规

订阅合规:
  价格透明: 明确显示价格和计费周期
  续订说明: 清晰说明自动续订机制
  取消便捷: 提供简单的取消订阅方式
  政策清晰: 说明订阅变更和退款政策 
```

## 9. 附录: Paddle接入资源

```yaml
官方文档与资源:
  基础接入:
    - 开发者中心: https://developer.paddle.com/getting-started/intro
    - Paddle账户注册: https://vendors.paddle.com/signup
    - Seller Dashboard指南: https://developer.paddle.com/reference/7ba2f1a2ec16c-paddle-dashboard

  前端接入:
    - Checkout.js文档: https://developer.paddle.com/build/checkout/quickstart
    - 支付页面定制: https://developer.paddle.com/build/checkout/custom-checkout
    - 支付完成回调: https://developer.paddle.com/reference/ZG9jOjI1MzUzOTg0-checkout-js-reference#methods

  后端集成:
    - Webhook配置与处理: https://developer.paddle.com/build/webhooks-alerting/overview
    - 验证Webhook签名: https://developer.paddle.com/build/webhooks-alerting/webhook-signature-verification
    - 订阅管理API: https://developer.paddle.com/api-reference/6fe7bf26b1220-subscription-api

  产品与订阅设置:
    - 产品创建指南: https://developer.paddle.com/build/products-prices/products
    - 价格与计划设置: https://developer.paddle.com/build/products-prices/prices-plans
    - 订阅管理: https://developer.paddle.com/build/subscription-management/subscription-lifecycle

  客户管理:
    - 客户门户设置: https://developer.paddle.com/build/checkout/customer-experience/customer-billing-portal
    - 客户数据管理: https://developer.paddle.com/build/checkout/customer-experience/customer-experience-overview

  测试与上线:
    - 沙箱环境使用: https://developer.paddle.com/getting-started/sandbox
    - 测试交易指南: https://developer.paddle.com/getting-started/c38d6e82bf72a-test-cards-and-payment-methods
    - 上线检查清单: https://developer.paddle.com/getting-started/launch-checklist

关键接入步骤简述:
  1. 注册与设置:
     - 使用个人身份证与银行卡注册Paddle账户
     - 完成KYB验证(通常1-2天)
     - 在Dashboard创建产品与订阅计划
  
  2. 前端集成:
     - 添加Paddle.js到项目: 
       ```html
       <script src="https://cdn.paddle.com/paddle/paddle.js"></script>
       ```
     - 初始化Paddle(替换VENDOR_ID为实际ID): 
       ```javascript
       Paddle.Setup({ vendor: VENDOR_ID });
       ```
     - 打开支付窗口:
       ```javascript
       Paddle.Checkout.open({
         product: PLAN_ID,
         email: user.email,
         successCallback: handleSuccess
       });
       ```
  
  3. 后端集成:
     - 设置Webhook端点(Firebase Function)
     - 实现验证签名逻辑:
       ```javascript
       // 验证Paddle Webhook签名
       function verifyPaddleSignature(req) {
         const signature = req.headers['paddle-signature'];
         // 参考文档中的验证算法实现
       }
       ```
     - 处理关键事件:
       - subscription_created: 用户首次订阅
       - subscription_updated: 订阅变更
       - subscription_cancelled: 订阅取消
       - subscription_payment_succeeded: 续订成功
  
  4. 测试流程:
     - 使用沙箱环境测试完整流程
     - 测试信用卡: 4242 4242 4242 4242 (成功) / 4000 0000 0000 0002 (失败)
     - 测试所有关键用户流程:
       - 新用户订阅
       - 订阅取消
       - 订阅恢复
       - 订阅到期
     - 验证会员状态正确更新到数据库

针对扩展应用的特殊注意事项:
  - Chrome扩展支付限制: 必须使用外部浏览器页面进行支付，不可在扩展内收集支付信息
  - 分拆部署: 前端负责引导支付，Firebase Functions负责处理Webhook
  - 数据安全: 不要在客户端存储Paddle API密钥，所有API调用通过后端处理
  - 异步设计: 支付流程是异步的，UI需处理等待状态并轮询查询最新订阅状态