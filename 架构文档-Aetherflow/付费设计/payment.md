---
title: AetherFlow付费功能设计方案
version: 1.0
date: 2023-12-01
---

```yaml
# AetherFlow付费功能设计

## 📋 开发者指南
  development_guide:
    # 如何使用本文档
    document_usage:
      - 本文档包含付费功能的规划和详细设计
      - 具体任务规划和实现进度已移至`payment task.md`文档
      - 开发者应首先阅读`payment task.md`了解任务内容,然后参考本文档获取设计细节
      - 无需通读整篇文档，按需查阅相关部分即可高效完成开发
      - **重要说明**：当开发者发现两份文档有矛盾之处,或发现任务不合理之处时,应立即指出并要求澄清。请勿基于有疑问的信息进行开发
    
    # 阅读顺序建议
    reading_sequence:
      - 第一步: 查看`payment task.md`中的"渐进式任务设计",找到你负责的任务和验收标准
      - 第二步: 如果任务涉及UI组件，查看本文档"组件设计"部分了解具体UI规范
      - 第三步: 如果需要了解用户体验流程，查看本文档"用户旅程分析"部分
      - 第四步: 对于技术实现，查看本文档相应的"技术实现规划"部分
    
    # 文档结构索引
    document_structure:
      - 文档关联: payment task.md(任务规划和实现进度)与payment.md(设计方案)相互补充
      - 用户旅程分析: 付费功能的用户体验流程
      - 布局及UI变更: UI相关的变更内容
      - 组件设计: 6个核心UI组件的详细规范
      - 付费权益设计: 免费版与付费版的权益差异
      - 定价策略: 产品定价和展示策略
      - 技术实现规划: 系统架构设计和数据模型等

## 用户旅程分析:
  free_to_paid_journey:
    # 付费入口发现阶段
    discovery_phase:
      - 用户在侧边栏看到付费指示器：
        - 未付费状态下的暗淡"PRO"标识（位于用户头像旁）
        - 左下角的"Upgrade"按钮在云存储旁边（配小火箭图标）
      - 参考设计: Notion的右下角升级按钮、Grammarly的crown图标
    
    # 付费价值展示阶段
    value_presentation_phase:
      - 主要入口:
        - hover在PRO标识上：显示轻量级付费计划预览窗口
        - 点击Upgrade按钮：直接跳转到官网付费页面
      - 参考设计: 
        - Figma的悬浮价格卡片，简洁展示免费版和专业版差异
        - Arc浏览器的会员特权展示，强调核心价值而非价格
    
    # 付费流程阶段
    payment_process_phase:
      - 跳转至官网付费页面(独立页面)
      - 选择月度/年度计划
      - 通过Paddle完成支付
      - 支付成功提示
      - 返回扩展，状态自动更新为PRO
      - 参考设计: 
        - Raindrop.io的简洁付费页，突出核心价值而非功能列表
        - 官网复用现有GitHub pages界面: https://aetherflow-app.github.io/pricing.html
    
    # 会员使用阶段
    member_usage_phase:
      - 会员状态指示:
        - PRO标识亮起
        - Upgrade按钮变为"闪电按钮"(表示已激活高级功能)
      - 会员中心访问:
        - 点击PRO标识或用户菜单中的会员选项
        - 查看会员状态、权益情况和订阅管理
      - 参考设计: Notion的会员中心，简洁展示订阅状态和管理选项
    
    # 会员权益提醒阶段
    membership_reminder_phase:
      - 非会员限制提醒:
        - 存储达上限时提示横幅
        - 优化次数用尽时提示横幅
        - 点击Pro功能时的升级提示
      - 参考设计: 
        - Pocket的友好限制提示，不阻断体验但明确指出升级价值
        - Todoist的配额用尽提醒，提示清晰但不打断工作流

## 布局及UI变更:
  ui_changes:
    # 导航区域变更
    navigation_area:
      - 用户头像旁添加PRO标识
        style: 
          - 未付费: 暗灰色半透明，低对比度
          - 已付费: 明亮金色渐变，带轻微光效
      - 参考: ChatGPT的GPT-4标记，简洁但明确
    
    # 功能区域变更
    feature_area:
      - 左下角添加Upgrade/闪电按钮(在云存储旁边)
        style:
          - 未付费: 火箭图标+"Upgrade"文字，突出但不刺眼
          - 已付费: 闪电图标，hover显示"Pro features unlocked"
      - 参考: Notion升级按钮，引人注目但不打扰体验
    
    # 内容区域变更
    content_area:
      - 配额限制横幅(位于内容区顶部)
        style: 
          - 浅色背景
          - 明确的升级按钮
          - 可关闭但会在条件触发时再次显示
      - 非会员提示词卡片(超出配额部分)
        style:
          - 半透明灰色遮罩
          - 居中锁图标
          - hover时显示升级提示和明确的"升级"按钮
      - 参考: Copilot的限制提示，简洁友好但信息完整

## 组件设计:
  required_components:
    # PRO标识组件 (ProBadge)
    pro_badge:
      description: 显示在用户头像旁的会员状态标识
      states:
        - inactive: 低对比度灰色
        - active: 明亮金色渐变
      interactions:
        - hover: 显示会员计划简介卡片
        - click: 跳转会员中心/付费页面
      styling:
        - 字体: 小号粗体sans-serif
        - 尺寸: 36px × 18px
        - 圆角: 4px
      reference: Figma的Professional徽章，小巧但辨识度高
    
    # 升级按钮组件 (UpgradeButton)
    upgrade_button:
      description: 左下角的会员升级按钮(云存储旁)
      states:
        - free_user: "🚀 Upgrade"
        - pro_user: "⚡" (仅图标)
      interactions:
        - hover: 显示tooltip解释
        - click: 跳转付费页/会员中心
      styling:
        - 主色调: #4A90E2 (品牌蓝)
        - 尺寸: 100px × 32px
        - 位置: 左下角云存储图标旁，不影响主界面
      reference: Grammarly的升级按钮，位置固定且不打扰主体验
    
    # 会员计划简介卡片 (ProPlanCard)
    pro_plan_card:
      description: 悬浮显示的会员计划简介
      content:
        # 核心价值主张
        - 醒目标题: "your best AI conversations, always at your fingertips"
        - 图标: 火箭图标(渐变紫蓝色)
        
        # 核心权益(简洁精炼)
        - 核心权益列表:
          - "✓ 存储空间扩展至100条提示词"
          - "✓ 每日优化次数提升至50次"
          - "✓ 多设备同步与导出功能"
          - "✓ 抢先体验新功能"
        
        # 引导按钮(单一明确)
        - 主按钮: "Upgrade Now" (醒目深色底色，白色文字)
        - 次链接: "View all plans >" (小号紫色文字链接)
        
        # 可选促销标签
        - 促销标签: "30% OFF" (右上角醒目标签)
        
      styling:
        - 尺寸: 300px × 280px (控制在合理范围内)
        - 背景: 浅色背景(淡紫色至白色渐变)
        - 主色调: 紫色系(与品牌色调一致)
        - 排版: 宽松有序，重点突出
        - 动画: 平滑的滑出效果(根据位置上滑或下滑)，120ms
        - 圆角: 12px边角圆润
        - 阴影: 轻微阴影增强立体感
      reference: 图片中示例的简洁升级卡片，只展示核心价值和明确升级路径
    
    # 配额限制横幅 (QuotaBanner)
    quota_banner:
      description: 当用户达到免费限制时显示的横幅
      variants:
        - storage_limit: "存储数量已达上限"
        - optimization_limit: "今日优化次数用尽"
      content:
        - 限制说明
        - "升级会员解锁更多潜力"按钮
        - 关闭按钮
      styling:
        - 高度: 48px
        - 背景: 浅色带轻微渐变
        - 位置: 内容区顶部，固定
      reference: GitHub的通知横幅，信息清晰且不打扰使用
    
    # 锁定提示词卡片 (LockedPromptCard)
    locked_prompt_card:
      description: 超出免费配额的只读提示词卡片
      visual:
        - 半透明灰色遮罩层
        - 居中锁图标
        - hover时显示升级提示和明确的升级按钮
      interactions:
        - hover: 显示文字提示"升级解锁更多存储空间"和醒目的"升级"按钮
        - click_card: 显示升级提示而非卡片详情
        - click_upgrade_button: 直接跳转到付费页面
      styling:
        - 遮罩: 50%透明度灰色
        - 锁图标: 居中，半透明白色，28px
        - 升级按钮: 品牌蓝色，白色文字，高对比度
        - 提示文字: 简短清晰，14px白色半透明
      reference: Notion的锁定页面，明确但不生硬的访问限制提示
    
    # 会员中心页面 (MembershipCenter)
    membership_center:
      description: 仅对已付费会员开放的会员状态和订阅管理页面(使用侧边抽屉样式)
      layout:
        - 类型: 侧边抽屉(与设置/提示词详情一致风格)
        - 宽度: 420px
        - 位置: 从右侧滑入
        - 背景: 主题配色，顶部带有关闭按钮
      
      content:
        # 会员状态概览
        - 会员状态部分:
          - 醒目标题: "Pro 会员" (配合金色光效标识)
          - 当前计划: "月度计划" / "年度计划"
          - 下次续费: "下次扣款: 2023年12月1日"
          - 账户信息: 关联邮箱和会员开始日期
        
        # 会员特权概览
        - 会员特权部分:
          - 标题: "您的Pro特权"
          - 特权列表: 带对勾图标的会员特权列表
          - 使用统计: "已使用优化次数: 125次" / "已存储提示词: 37条"
          - 价值展示: "已为您节省约xx小时写作时间" (基于使用统计估算)
        
        # 产品更新与公告
        - 产品动态部分:
          - 标题: "最新功能更新"
          - 内容: 1-2条最新功能或更新公告 
          - Pro专属标签: 某些即将推出的功能标记为"Pro专属"
        
        # 订阅管理选项
        - 订阅管理部分:
          - "管理订阅"按钮(链接到Paddle会员中心)
          - "更改计划"按钮(月付↔年付切换)
          - "查看账单历史"链接
      
      interactions:
        - 点击"闪电按钮"或亮起的"PRO"标识打开
        - 点击关闭按钮或侧边区域关闭
        - 点击管理订阅按钮跳转到Paddle会员中心
      
      styling:
        - 布局: 卡片式分区设计，区域间有明确视觉分隔
        - 配色: 与主题一致，Pro元素添加金色高级感
        - 动画: 平滑的抽屉滑入/滑出效果
        - 响应式: 适应不同屏幕高度，支持内容滚动
      reference: Notion的会员页面，简洁展示当前状态和管理选项

## 付费权益设计:
  pro_benefits:
    storage_increase:
      free: 5条提示词
      pro: 100条提示词
      display: 进度条+数字(如"5/100")
    
    optimization_quota:
      free: 每天3次
      pro: 每天50次
      display: 计数器(如"已使用3/50次")
    
    export_feature:
      free: 禁用
      pro: 可导出为CSV/Markdown
      display: 仅Pro显示导出按钮
    
    priority_support:
      free: 标准支持
      pro: 优先支持
      display: 支持请求表单中的优先标记
    
    early_access:
      free: 无
      pro: 抢先体验新功能
      display: 新功能角标显示"Pro"或"Early Access"

## 定价策略:
  pricing:
    monthly_plan:
      price: $3.99/month
      positioning: 灵活选择，适合短期使用
    
    annual_plan:
      price: $39.99/year
      positioning: 最佳价值，节省17%(相比月付)
      highlight: true
    
    display_strategy:
      - 并排比较两个选项
      - 年付方案视觉上更突出
      - 清晰标明节省比例
      - 相同功能权益，仅价格不同
    
    reference: Bitwarden的双选项定价页，简单明了无混淆

## 技术实现要点:
  implementation_notes:
    # 会员状态管理
    membership_state:
      - 本地存储用户订阅状态(chrome.storage.local)
      - 每次启动和操作前验证订阅状态
      - 使用Firebase/后端API验证真实订阅状态
    
    # Paddle集成
    paddle_integration:
      - 使用Paddle Checkout.js创建支付界面
      - 实现webhook接收支付状态更新
      - 处理订阅创建、更新和取消事件
    
    # 配额限制实现
    quota_implementation:
      - 在本地和云端双重追踪使用配额
      - 优化次数每天0点重置(用户本地时区)
      - 会员降级后智能处理超额内容(保留最新5条)

## 交互细节示例:
  interaction_examples:
    hover_pro_badge:
      trigger: 鼠标悬停在PRO标识上
      response: 
        - 轻微放大效果(scale 1.05)
        - 120ms滑出显示会员计划简介卡片(根据位置上滑或下滑)
        - 卡片位置根据空间自动调整
      reference: Dropbox的会员提示，平滑且不打断使用流
    
    upgrade_flow:
      trigger: 点击任意升级按钮
      response:
        - 直接打开官网付费页面(新标签或新窗口)
        - 支付完成后返回扩展自动刷新状态
      reference: Notion的支付完成返回流程，无缝且有明确成功提示
    
    quota_reached:
      trigger: 用户尝试创建超出限制的内容
      response:
        - 轻微震动反馈(移动端)或警示色闪烁(桌面端)
        - 显示配额限制横幅(如不存在)
        - 模态提示"已达到免费版限制"
        - 提供明确升级按钮
      reference: Canva的使用限制提示，清晰但不刺激用户
    
    locked_card_hover:
      trigger: 鼠标悬停在锁定提示词卡片上
      response:
        - 遮罩轻微变暗，增强对比度
        - 显示文字提示"升级解锁更多存储空间"
        - 显示醒目的"升级"按钮
        - 光标变为指针样式
      reference: Notion的锁定内容交互，清晰指引下一步操作

## 开发优先级与渐进式交付:
  development_priorities:
    # 渐进开发，体验连贯，生产与体验并行，确保每个步骤都能连贯验收
    
    phase_1: # 付费入口与基础支付(1周)
      - 添加PRO标识(暗淡状态)和左下角Upgrade按钮
      - 实现Paddle支付集成(Checkout.js)
      - 简单会员计划预览卡片(hover显示)
      - 支付成功反馈机制
      verification: 
        - 可体验付费引导和支付流程
        - 能接收支付成功信号但暂不改变会员状态
    
    phase_2: # 会员状态管理(1周)
      - 实现会员状态存储和验证系统
      - 完成PRO标识亮起与Upgrade→闪电按钮转变
      - 实现基础会员中心抽屉(显示状态和计划)
      - webhook接入，处理支付状态变更
      verification:
        - 可完整体验支付前后的界面状态变化
        - 能在付费后看到会员状态改变
        - 但尚未实现实际权限差别
    
    phase_3: # 配额限制与会员权益(1周)
      - 实现存储配额限制逻辑
      - 开发锁定提示词卡片样式和交互
      - 添加配额限制横幅
      - 实现优化次数限制逻辑
      verification:
        - 可体验会员与非会员的实际权限差别
        - 能在会员降级后看到锁定内容效果
    
    phase_4: # 功能完善与精细交互(1-2周)
      - 完善会员中心所有功能
      - 优化会员计划预览卡片设计和内容
      - 实现导出等Pro专属功能
      - 添加细节交互动效
      verification:
        - 完整的付费体验流程
        - 所有会员特权功能可用

    # 避免过度工程化
    simplification:
      - 不开发复杂的分析仪表板
      - 不实现多层级会员体系
      - 简化取消流程(直接链接到Paddle)
      - 无需开发复杂的推荐机制
      - 官网付费页面复用现有GitHub pages: https://aetherflow-app.github.io/pricing.html

    # 升级引导逻辑
    upgrade_flow:
      description: 针对免费用户的升级引导逻辑
      trigger_points:
        - 点击暗淡的"PRO"标识
        - 点击"Upgrade"按钮
        - 点击锁定提示词上的升级按钮
        - 点击配额限制横幅上的升级按钮
      
      behavior:
        - 所有触发点均直接跳转到官网付费页面(新标签或窗口)
        - 不显示会员中心页面(会员中心仅对已付费会员开放)
        - 跳转时可携带来源参数，便于分析不同入口的转化率
      
      styling:
        - 所有升级按钮统一使用相同色调和样式，确保一致性
        - 升级入口在视觉上应有足够辨识度，但不喧宾夺主

## 技术实现规划:
  system_architecture:
    # 整体架构
    overview:
      - 采用分层架构设计：
        - 表现层(UI组件)：负责付费相关UI展示
        - 业务逻辑层(Services)：处理会员状态、配额逻辑
        - 数据层(Storage)：负责数据持久化和同步
        - 集成层(Integration)：处理第三方支付系统集成
      
      - 模块划分：
        - membership: 会员状态管理核心模块
        - quota: 配额检查与控制模块
        - payment: 支付流程管理模块
        - ui: 会员UI组件模块
      
      - 数据流向：
        - UI事件 → 业务服务 → 状态更新 → UI响应
        - 支付完成 → webhook → 状态更新 → UI变化
        - 用户操作 → 配额检查 → 限制/通过 → 用户反馈
    
    # 核心模块设计
    modules:
      # 会员状态管理服务
      membership_service:
        description: 管理用户会员状态的核心服务
        responsibilities:
          - 提供会员状态的读取和更新接口
          - 处理会员到期、降级等状态变化
          - 同步本地与远程的会员状态
          - 提供会员身份验证与权限检查
        
        interface_design: |
          // 会员服务接口定义
          interface MembershipService {
            // 获取当前会员状态
            getCurrentMembership(): Promise<MembershipState>;
            
            // 检查用户是否为Pro会员
            isProMember(): Promise<boolean>;
            
            // 刷新会员状态(从服务器)
            refreshMembershipState(): Promise<MembershipState>;
            
            // 监听会员状态变化
            onMembershipChange(callback: (state: MembershipState) => void): () => void;
            
            // 处理会员付款成功
            handleSuccessfulPayment(data: PaymentResult): Promise<void>;
            
            // 处理会员取消/过期
            handleMembershipExpiration(): Promise<void>;
          }
        
        implementation_approach:
          - 使用观察者模式实现会员状态变更通知
          - 本地缓存会员状态，定期与服务器同步
          - 使用多重验证确保会员状态真实性
      
      # 配额管理服务
      quota_service:
        description: 管理和限制用户资源使用的服务
        responsibilities:
          - 检查用户是否达到配额限制
          - 提供各类资源的使用统计
          - 处理用户会员类型变更时的配额调整
          - 实现配额重置逻辑(如每日优化次数)
        
        interface_design: |
          // 配额服务接口定义
          interface QuotaService {
            // 检查提示词存储配额
            checkPromptStorageQuota(): Promise<QuotaInfo>;
            
            // 增加已使用的优化次数
            incrementOptimizationCount(): Promise<QuotaInfo>;
            
            // 获取优化次数配额信息
            getOptimizationQuota(): Promise<QuotaInfo>;
            
            // 降级处理(处理超额内容)
            handleDowngrade(): Promise<void>;
            
            // 重置周期性配额(如每日限额)
            resetPeriodicQuotas(): Promise<void>;
          }
        
        implementation_approach:
          - 配额检查前置于核心操作(创建/优化提示词)
          - 使用定时任务处理周期性配额重置
          - 本地与服务端双重配额验证
      
      # 支付集成服务
      payment_service:
        description: 处理支付流程和集成的服务
        responsibilities:
          - 生成支付链接和初始化结账流程
          - 处理支付回调和webhook
          - 验证支付状态和订单有效性
          - 处理订阅更新和取消
        
        interface_design: |
          // 支付服务接口定义
          interface PaymentService {
            // 创建结账会话
            createCheckoutSession(plan: 'monthly' | 'annual'): Promise<{sessionId: string, url: string}>;
            
            // 验证支付状态
            verifyPayment(sessionId: string): Promise<PaymentResult>;
            
            // 处理webhook回调
            handleWebhook(payload: any): Promise<void>;
            
            // 获取订阅详情
            getSubscriptionDetails(): Promise<SubscriptionDetails>;
            
            // 取消订阅
            cancelSubscription(): Promise<{success: boolean}>;
          }
        
        implementation_approach:
          - 使用Paddle结账JS API处理前端支付流
          - 实现安全的webhook处理机制
          - 采用幂等设计防止重复处理支付事件
      
      # 升级引导服务
      upgrade_service:
        description: 处理升级引导和提示的服务
        responsibilities:
          - 确定何时显示升级提示
          - 管理不同类型的升级入口
          - 跟踪升级转化数据
          - 提供一致的升级体验
        
        interface_design: |
          // 升级引导服务接口定义
          interface UpgradeService {
            // 显示升级提示
            showUpgradePrompt(source: string): void;
            
            // 获取升级页面URL(带来源跟踪)
            getUpgradePageUrl(source: string): string;
            
            // 检查并自动显示配额限制警告
            checkAndShowQuotaWarning(): Promise<boolean>;
            
            // 跟踪升级点击事件
            trackUpgradeClick(source: string): void;
          }
        
        implementation_approach:
          - 统一管理所有升级入口和提示
          - 根据用户行为智能显示升级提示
          - 实现非侵入式的升级引导

## 数据模型设计:
  data_models:
    # 会员状态数据模型
    membership_state:
      description: 描述用户订阅状态的核心数据结构
      schema: |
        interface MembershipState {
          // 会员状态: free(免费), pro(专业版), trial(试用)
          status: 'free' | 'pro' | 'trial';
          
          // 订阅计划: monthly(月付), annual(年付), 未订阅为null
          plan: 'monthly' | 'annual' | null;
          
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
      storage_strategy:
        - 本地存储: chrome.storage.local
        - 同步方式: 定期与服务器验证
        - 加密策略: 无需额外加密(不包含敏感信息)
        - 缓存策略: 每次启动和关键操作时验证
    
      actual_implementation:
        - 已在extension/src/services/membership/types.ts中完整实现
        - 添加了会员状态类型和订阅计划类型定义
        - 提供了默认免费会员状态的常量定义
        - 实现了自动过期检测机制
        - 网络离线时依赖本地存储，恢复后自动同步
    
    # 同步状态类型
    sync_status:
      description: 描述会员状态同步的当前状态
      implementation: |
        // 同步状态类型
        type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
          
        // 默认的服务器同步间隔（24小时）
        const DEFAULT_SYNC_INTERVAL = 24 * 60 * 60 * 1000;
          
        // 上次同步时间的存储键
        const LAST_SYNC_TIME_KEY = 'membership_last_sync_time';
      
      sync_mechanisms:
        - 定时自动同步: 每24小时自动同步一次
        - 网络恢复同步: 从离线恢复后自动同步
        - 登录触发同步: 用户登录时自动从服务器获取最新状态
        - 状态更新同步: 本地状态更新后异步同步到服务器
        - 支付成功同步: 支付成功后强制同步到服务器
    
    # 网络状态监控
    network_monitoring:
      description: 监控网络状态变化，确保离线与在线时的服务可用性
      implementation: |
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
      
      auto_sync:
        - 设计意图: 确保用户会员状态始终与服务器保持一致
        - 关键场景: 
            1. 用户在多设备上使用时保持状态一致
            2. 支付事件发生后及时更新本地状态
            3. 网络不稳定时保持服务可用性
        - 实现方式:
            1. 使用window事件监听网络状态变化
            2. 网络恢复后自动检查同步时间间隔
            3. 使用setInterval实现定期同步
        - 优化策略:
            1. 阻止重复同步请求
            2. 同步失败时使用本地状态作为回退
            3. 非阻塞式异步同步减少对用户体验的影响
    
    # 防抖处理
    debounce_handling:
      description: 避免短时间内频繁触发状态更新通知
      implementation: |
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
      
      benefits:
        - 减少UI重渲染频率，提高性能
        - 避免由于频繁状态更新导致的闪烁
        - 确保观察者收到最终稳定的状态
        - 降低对React渲染周期的干扰
      
      implementation_details:
        - 使用自定义debounce工具函数(utils/debounce.ts)
        - 配置100ms的延迟时间
        - 确保在连续调用结束后才执行通知
        - 错误隔离确保单个观察者失败不影响其他观察者

## 状态管理设计:
  state_management:
    # 状态管理架构
    architecture:
      description: 会员状态管理的整体架构
      approach:
        - 采用观察者模式进行状态变更通知
        - 单一数据源确保状态一致性
        - 本地缓存与服务器验证相结合
        - 防抖处理避免短时间内频繁通知
        - 网络状态监听确保离线与在线无缝切换
      
      implementation: |
        // 会员状态管理服务
        class MembershipService {
          private currentState: MembershipState | null = null;
          private maxRetryCount = 3;
          private retryDelay = 500; // 毫秒
          private syncStatus: SyncStatus = 'idle';
          private autoSyncInterval: number | null = null;
          private syncIntervalTime: number = 24 * 60 * 60 * 1000; // 24小时
          
          constructor() {
            // 初始化启动自动同步
            this.setupAutoSync();
            // 监听网络状态变化
            this.setupNetworkListener();
          }
          
          // 获取当前会员状态
          async getCurrentMembership(): Promise<MembershipState> { ... }
          
          // 检查用户是否为Pro会员
          async isProMember(): Promise<boolean> { ... }
          
          // 更新会员状态
          async updateMembershipState(updates: Partial<MembershipState>): Promise<MembershipState> { ... }
          
          // 从服务器验证会员状态
          async verifyMembershipWithServer(): Promise<MembershipState | null> { ... }
          
          // 刷新会员状态(从服务器获取最新状态)
          async refreshMembershipState(): Promise<MembershipState> { ... }
          
          // 订阅会员状态变化
          onMembershipChange(callback: MembershipObserver): () => void { ... }
          
          // 使用防抖处理的通知观察者方法
          private notifyObservers = debounce((state: MembershipState): void => { ... }, 100);
        }
    
    # 状态同步策略
    sync_strategy:
      description: 确保本地与服务器状态一致的策略
      key_approaches:
        - 定期同步：每次启动扩展和每24小时自动同步一次
        - 关键操作同步：支付完成、配额检查等关键点强制同步
        - 乐观本地更新：本地立即更新状态，异步确认服务器状态
        - 冲突解决策略：服务器状态优先，本地状态作为回退
        - 网络恢复同步：检测网络从离线恢复后自动同步
        - 同步状态跟踪：维护最后同步时间和当前同步状态
      
      implementation: |
        /**
         * 将本地会员状态同步到Firestore
         * 仅在用户登录时进行
         */
        private async syncStateToServer(state: MembershipState): Promise<void> {
          try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
              // 用户未登录，无法同步到服务器
              return;
            }
            
            const db = getFirestore(getApp());
            const userDoc = doc(db, 'users', currentUser.uid);
            
            // 更新用户文档中的会员信息
            await setDoc(userDoc, {
              membership: {
                status: state.status,
                plan: state.plan,
                startedAt: state.startedAt,
                expiresAt: state.expiresAt,
                cancelAtPeriodEnd: state.cancelAtPeriodEnd,
                subscriptionId: state.subscriptionId,
                customerId: state.customerId,
                updatedAt: Date.now()
              }
            }, { merge: true });
            
            console.log('[MembershipService] 会员状态已同步到服务器');
          } catch (error) {
            console.error('[MembershipService] 同步状态到服务器失败:', error);
            throw error;
          }
        }
    
        /**
         * 从服务器验证会员状态
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
            
            const db = getFirestore(getApp());
            const userDoc = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDoc);
            
            if (!docSnap.exists() || !docSnap.data().membership) {
              console.log('[MembershipService] 服务器上无会员记录');
              this.syncStatus = 'synced';
              await this.updateLastSyncTime();
              return null;
        }
    
            const serverMembership = docSnap.data().membership;
            
            // 构建新的会员状态(服务器数据优先)
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
            
            // 更新本地状态
            await this.saveMembershipState(newState);
            
            this.syncStatus = 'synced';
            await this.updateLastSyncTime();
            
            return newState;
          } catch (error) {
            console.error('[MembershipService] 从服务器验证会员状态失败:', error);
            this.syncStatus = 'error';
            return null;
          }
        }
    
    # 权限检查机制
    permission_checks:
      description: 基于会员状态进行功能和资源访问控制
      implementation:
        - 前端权限控制: UI显示/隐藏、操作允许/禁止
        - 服务层权限控制: 业务逻辑中的配额和权限检查
        - 全局Hook: useMembership钩子提供状态和权限检查
        - 自动过期检测: 主动检测会员过期并更新状态
      
      actual_implementation: |
        // useMembership钩子提供会员状态访问
        export function useMembership(): UseMembershipReturn {
          const [membershipState, setMembershipState] = useState<MembershipState | null>(null);
          const [isProMember, setIsProMember] = useState<boolean>(false);
          const [quota, setQuota] = useState<MembershipQuota>({
            maxPrompts: 5,
            dailyOptimizations: 3,
            canExport: false,
            hasPrioritySupport: false
          });
          
          // 初始化加载会员状态
          useEffect(() => {
            // 订阅会员状态变更
            const unsubscribeMembership = membershipService.onMembershipChange(async (state) => {
              // 状态变更时更新UI组件
            });
            
            // 监听认证状态变化
            const unsubscribeAuth = authService.onAuthStateChanged(async (user) => {
              if (user) {
                // 用户登录，尝试从服务器获取最新会员状态
                await refresh();
              } else {
                // 用户登出，重新加载本地会员状态
                loadMembershipState();
              }
            });
            
            return () => {
              unsubscribeMembership();
              unsubscribeAuth();
            };
          }, []);
          
          // 组件API
          return {
            membershipState,
            isProMember,
            quota,
            loading,
            error,
            refresh
          };
        }
        
        // 会员权限检查实现
        async function isProMember(): Promise<boolean> {
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
        }
    
    # 状态变更处理
    state_transitions:
      description: 处理会员状态变更的策略
      key_events:
        - 首次付费: free → pro
        - 订阅续费: pro → pro (更新expiresAt)
        - 订阅取消: pro → free (保持pro权益至周期结束)
        - 订阅失败: pro → free (立即降级)
        - 降级处理: 超出配额处理、锁定内容
      
      implemented_features:
        - 实现了handleSuccessfulPayment处理支付成功
        - 实现了handleMembershipExpiration处理会员到期
        - 自动检测过期状态并降级
        - 状态变更通知所有已注册的观察者
        - 状态变更异步同步到服务器