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
    
    # 配额数据模型
    quota_model:
      description: 描述用户资源使用配额的数据结构
      schema: |
        interface QuotaLimits {
          // 提示词存储上限
          maxPrompts: number;
          
          // 每日优化次数上限
          dailyOptimizations: number;
          
          // 是否允许导出功能
          canExport: boolean;
          
          // 是否有优先支持特权
          hasPrioritySupport: boolean;
        }
        
        interface QuotaUsage {
          // 已存储提示词数量
          promptCount: number;
          
          // 今日已使用优化次数
          optimizationsUsedToday: number;
          
          // 优化次数重置时间
          optimizationResetTime: number;
          
          // 上次使用时间
          lastUsedAt: number;
        }
      
      constants:
        free_limits:
          maxPrompts: 5
          dailyOptimizations: 3
          canExport: false
          hasPrioritySupport: false
        
        pro_limits:
          maxPrompts: 100
          dailyOptimizations: 50
          canExport: true
          hasPrioritySupport: true
      
      storage_strategy:
        - 本地存储: chrome.storage.local
        - 使用计数: 操作执行前增加计数
        - 重置机制: 基于用户本地时区每日0点重置
    
    # 订阅计划数据模型
    subscription_plan:
      description: 描述可用订阅计划的数据结构
      schema: |
        interface SubscriptionPlan {
          // 计划ID(用于支付系统)
          id: string;
          
          // 计划名称: monthly(月付), annual(年付)
          name: 'monthly' | 'annual';
          
          // 价格(美元)
          price: number;
          
          // 周期(天数)
          interval: number;
          
          // 显示名称
          displayName: string;
          
          // 是否推荐(在UI中突出显示)
          isRecommended: boolean;
          
          // 折扣信息(相比另一计划)
          discount?: {
            percent: number;
            reference: 'monthly' | 'annual';
          };
        }
      
      constants:
        plans:
          - id: 'pro_monthly'
            name: 'monthly'
            price: 3.99
            interval: 30
            displayName: '月度订阅'
            isRecommended: false
          
          - id: 'pro_annual'
            name: 'annual'
            price: 39.99
            interval: 365
            displayName: '年度订阅'
            isRecommended: true
            discount:
              percent: 17
              reference: 'monthly'
    
    # 支付结果数据模型
    payment_result:
      description: 描述支付处理结果的数据结构
      schema: |
        interface PaymentResult {
          // 是否成功
          success: boolean;
          
          // 会话ID
          sessionId: string;
          
          // 订单ID
          orderId?: string;
          
          // 订阅ID
          subscriptionId?: string;
          
          // 客户ID
          customerId?: string;
          
          // 状态
          status: 'completed' | 'pending' | 'failed';
          
          // 消息(错误原因或成功提示)
          message?: string;
          
          // 订阅信息
          subscription?: {
            plan: 'monthly' | 'annual';
            startedAt: number;
            expiresAt: number;
          }
        }

## 状态管理设计:
  state_management:
    # 状态管理架构
    architecture:
      description: 会员状态管理的整体架构
      approach:
        - 采用观察者模式进行状态变更通知
        - 单一数据源确保状态一致性
        - 本地缓存与服务器验证相结合
      
      implementation: |
        // 会员状态管理类
        class MembershipStateManager {
          private state: MembershipState;
          private listeners: Array<(state: MembershipState) => void> = [];
          
          // 获取当前状态
          getState(): MembershipState { ... }
          
          // 更新状态并通知监听器
          updateState(newState: Partial<MembershipState>): void { ... }
          
          // 添加状态变化监听器
          subscribe(listener: (state: MembershipState) => void): () => void { ... }
          
          // 从服务器验证状态
          async verifyStateWithServer(): Promise<void> { ... }
          
          // 持久化状态到本地存储
          private persistState(): Promise<void> { ... }
          
          // 从本地存储加载状态
          private loadStateFromStorage(): Promise<void> { ... }
        }
    
    # 状态同步策略
    sync_strategy:
      description: 确保本地与服务器状态一致的策略
      key_approaches:
        - 定期同步：每次启动扩展和每24小时自动同步一次
        - 关键操作同步：支付完成、配额检查等关键点强制同步
        - 乐观本地更新：本地立即更新状态，异步确认服务器状态
        - 冲突解决策略：服务器状态优先，本地状态作为回退
      
      implementation: |
        async function syncMembershipState() {
          try {
            // 尝试从服务器获取最新状态
            const serverState = await apiClient.getMembershipState();
            
            // 获取本地状态
            const localState = await storageService.getMembershipState();
            
            // 合并状态(服务器优先)
            const mergedState = {
              ...localState,
              ...serverState,
              lastVerifiedAt: Date.now()
            };
            
            // 更新本地状态
            await storageService.setMembershipState(mergedState);
            
            // 通知状态变化
            membershipStateManager.updateState(mergedState);
            
            return mergedState;
          } catch (error) {
            // 服务器验证失败，使用本地状态
            console.error('Failed to sync membership state:', error);
            return membershipStateManager.getState();
          }
        }
    
    # 权限检查机制
    permission_checks:
      description: 基于会员状态进行功能和资源访问控制
      implementation:
        - 前端权限控制: UI显示/隐藏、操作允许/禁止
        - 服务层权限控制: 业务逻辑中的配额和权限检查
        - 全局HOC组件: 用于包装需要会员权限的React组件
      
      example_code: |
        // React高阶组件示例 - 会员功能访问控制
        function withProMemberAccess<P>(
          Component: React.ComponentType<P>,
          fallback: React.ReactNode = <UpgradePrompt />
        ) {
          return function ProProtectedComponent(props: P) {
            const { isProMember, loading } = useMembership();
            
            // 加载中显示加载状态
            if (loading) return <LoadingSpinner />;
            
            // 非会员显示升级提示
            if (!isProMember) return fallback;
            
            // 会员显示实际组件
            return <Component {...props} />;
          };
        }
        
        // 使用示例
        const ExportFeature = withProMemberAccess(ExportComponent);
    
    # 状态变更处理
    state_transitions:
      description: 处理会员状态变更的策略
      key_events:
        - 首次付费: free → pro
        - 订阅续费: pro → pro (更新expiresAt)
        - 订阅取消: pro → free (保持pro权益至周期结束)
        - 订阅失败: pro → free (立即降级)
        - 降级处理: 超出配额处理、锁定内容
      
      handling_approach:
        - 使用状态机模式管理转换
        - 每种转换配有明确的处理逻辑
        - 转换前后触发相应的生命周期钩子
        - 提供撤销机制(如订阅恢复)

## 支付系统集成:
  payment_integration:
    # Paddle集成架构
    paddle_integration:
      description: 与Paddle支付平台的集成方案
      components:
        - 前端结账流程: Paddle Checkout.js
        - 后端验证: Paddle API
        - 事件处理: Webhook接收与处理
      
      implementation_steps:
        - 初始化Paddle: 在官方网站注册并获取API密钥
        - 配置产品: 在Paddle后台创建订阅产品
        - 前端集成: 引入Paddle Checkout.js
        - 处理回调: 实现支付成功回调页面
        - 配置Webhook: 设置事件通知URL
      
      code_example: |
        // Paddle前端初始化示例
        function initPaddleCheckout() {
          const script = document.createElement('script');
          script.src = 'https://cdn.paddle.com/paddle/paddle.js';
          script.async = true;
          
          script.onload = () => {
            // 初始化Paddle
            window.Paddle.Setup({ 
              vendor: PADDLE_VENDOR_ID,
              eventCallback: handlePaddleEvent
            });
          };
          
          document.body.appendChild(script);
        }
        
        // 打开Paddle结账窗口
        function openPaddleCheckout(planId: string) {
          window.Paddle.Checkout.open({
            product: planId,
            email: userService.getCurrentUser()?.email,
            successCallback: handleCheckoutSuccess,
            closeCallback: handleCheckoutClose
          });
        }
    
    # 支付流程设计
    payment_flow:
      description: 完整的支付处理流程
      sequence:
        - 用户点击升级按钮
        - 前端应用引导至官网支付页面
        - 用户选择订阅计划
        - 初始化Paddle结账流程
        - 用户填写支付信息并确认
        - Paddle处理支付并返回结果
        - 返回应用并更新会员状态
      
      success_flow:
        - 支付成功后Paddle回调成功页面
        - 传递订阅ID和客户ID等信息
        - 前端接收参数并调用会员服务
        - 会员服务验证订阅状态并更新
        - 更新UI以反映会员状态变化
      
      error_handling:
        - 用户取消支付: 返回应用不做状态更改
        - 支付处理失败: 显示友好错误信息，提供重试选项
        - 验证失败: 显示临时会员状态，后台异步重试验证
    
    # Webhook处理
    webhook_handling:
      description: 处理Paddle发送的事件通知
      key_events:
        - subscription_created: 订阅创建成功
        - subscription_updated: 订阅信息更新
        - subscription_cancelled: 订阅被取消
        - subscription_payment_succeeded: 订阅支付成功
        - subscription_payment_failed: 订阅支付失败
      
      implementation: |
        // Webhook处理函数示例
        async function handlePaddleWebhook(req, res) {
          try {
            // 验证webhook签名
            const isValid = verifyPaddleWebhookSignature(req.body);
            if (!isValid) {
              return res.status(401).send('Invalid signature');
            }
            
            const { alert_name, ...data } = req.body;
            
            // 根据事件类型处理
            switch (alert_name) {
              case 'subscription_created':
                await handleSubscriptionCreated(data);
                break;
              
              case 'subscription_payment_succeeded':
                await handleSubscriptionPaymentSucceeded(data);
                break;
              
              case 'subscription_cancelled':
                await handleSubscriptionCancelled(data);
                break;
              
              // 处理其他事件...
            }
            
            // 返回成功响应
            res.status(200).send('Webhook processed');
          } catch (error) {
            console.error('Webhook processing error:', error);
            // 即使出错也返回200以避免Paddle重试
            // 但记录错误并触发告警
            res.status(200).send('Webhook received');
          }
        }
      
      security_considerations:
        - 验证webhook签名确保请求真实性
        - 实现幂等处理避免重复事件问题
        - 使用队列机制处理高峰期事件
        - 提供手动重试机制应对处理失败
    
    # 数据安全处理
    payment_security:
      description: 支付相关数据的安全处理策略
      key_practices:
        - 不存储敏感支付信息(如信用卡)
        - 使用Paddle托管支付页面处理支付
        - 验证所有支付相关回调和webhook
        - 实现防重放攻击机制
      
      implementation:
        - 对webhook请求进行签名验证
        - 使用HTTPS加密所有API通信
        - 订阅状态定期验证防止篡改
        - 会员权益访问前进行权限检查

## UI组件体系:
  ui_component_system:
    # 关键业务组件
    key_business_components:
      description: 基于UI设计定义的6个核心业务组件
      components:
        - ProBadge (PRO标识): 显示在用户头像旁的会员状态标识
        - UpgradeButton (升级按钮): 左下角的会员升级按钮(云存储旁)
        - ProPlanCard (会员计划预览卡片): 悬浮显示的会员计划简介
        - QuotaBanner (配额限制横幅): 当用户达到免费限制时显示的横幅
        - LockedPromptCard (锁定提示词卡片): 超出免费配额的只读提示词卡片
        - MembershipCenter (会员中心页面): 会员状态和订阅管理页面(侧边抽屉)
      
      implementation_focus:
        - 确保核心业务组件的完整功能实现
        - 保持组件间风格和交互的一致性
        - 优先完成这些组件以实现基本业务流程
    
    # 组件拆分与复用策略
    component_reuse_strategy:
      description: 从实现角度对组件进行合理拆分和复用
      reusable_components:
        # 可复用的UI元素
        ui_elements:
          - ProBadge: 从PRO标识中抽取的可复用徽章组件
          - UpgradeButton: 从升级按钮中抽取的可复用按钮组件
          - QuotaIndicator: 用于显示资源使用情况的指示器组件
          - PlanCard: 用于展示计划信息的卡片组件
        
        # 功能性容器组件
        container_components:
          - MembershipProvider: 提供会员状态Context的容器组件
          - QuotaManager: 管理配额状态的功能性组件
          - ProFeatureGate: 控制Pro功能访问权限的组件
      
      component_relationship: |
        ProBadge (PRO标识) → 可作为独立基础组件复用
        UpgradeButton (升级按钮) → 可作为独立基础组件复用
        ProPlanCard (会员计划预览卡片) → 由PlanCard等基础组件组合而成
        QuotaBanner (配额限制横幅) → 可包含QuotaIndicator等指示器
        LockedPromptCard (锁定提示词卡片) → 特化的卡片组件，可包含基础UI元素
        MembershipCenter (会员中心页面) → 由多个基础组件和容器组件组成
    
    # 组件接口设计
    component_api:
      description: 关键组件的接口设计
      
      # ProBadge组件
      pro_badge_api: |
        // ProBadge组件接口
        interface ProBadgeProps {
          // 是否为活跃PRO会员
          isActive: boolean;
          
          // 点击处理函数
          onClick?: () => void;
          
          // 尺寸变体: 'sm', 'md', 'lg'
          size?: 'sm' | 'md' | 'lg';
          
          // 附加类名
          className?: string;
        }
      
      # UpgradeButton组件
      upgrade_button_api: |
        // UpgradeButton组件接口
        interface UpgradeButtonProps {
          // 来源标识(用于跟踪)
          source: string;
          
          // 按钮文本(默认为"Upgrade")
          label?: string;
          
          // 点击处理函数(默认为打开升级页面)
          onClick?: () => void;
          
          // 按钮变体: 'primary', 'text', 'icon'
          variant?: 'primary' | 'text' | 'icon';
          
          // 是否显示图标
          showIcon?: boolean;
        }
      
      # QuotaBanner组件
      quota_banner_api: |
        // QuotaBanner组件接口
        interface QuotaBannerProps {
          // 配额类型
          type: 'storage' | 'optimization';
          
          // 当前使用量
          current: number;
          
          // 限制值
          limit: number;
          
          // 关闭处理函数
          onClose?: () => void;
          
          // 升级点击处理函数
          onUpgradeClick?: () => void;
          
          // 自定义消息
          message?: string;
        }
    
    # 组件状态管理
    component_state:
      description: 组件状态管理策略
      patterns:
        - 使用React Context提供会员状态
        - 实现自定义hooks简化状态访问
        - 确保一致的状态传递和更新
      
      implementation: |
        // 会员状态Context
        const MembershipContext = React.createContext<MembershipContextValue | null>(null);
        
        // 会员状态Provider
        function MembershipProvider({ children }) {
          const [state, setState] = useState<MembershipState>(initialState);
          const [loading, setLoading] = useState(true);
          
          // 初始化和同步逻辑
          useEffect(() => {
            async function initMembershipState() {
              try {
                setLoading(true);
                const membershipState = await membershipService.getCurrentMembership();
                setState(membershipState);
              } catch (error) {
                console.error('Failed to initialize membership state:', error);
              } finally {
                setLoading(false);
              }
            }
            
            initMembershipState();
            
            // 订阅状态变更
            const unsubscribe = membershipService.onMembershipChange((newState) => {
              setState(newState);
            });
            
            return unsubscribe;
          }, []);
          
          // 暴露API
          const contextValue = {
            ...state,
            loading,
            isProMember: state.status === 'pro',
            refresh: async () => {
              setLoading(true);
              try {
                const newState = await membershipService.refreshMembershipState();
                setState(newState);
                return newState;
              } finally {
                setLoading(false);
              }
            }
          };
          
          return (
            <MembershipContext.Provider value={contextValue}>
              {children}
            </MembershipContext.Provider>
          );
        }
        
        // 自定义Hook
        function useMembership() {
          const context = useContext(MembershipContext);
          if (!context) {
            throw new Error('useMembership must be used within MembershipProvider');
          }
          return context;
        }
    
    # 视觉一致性策略
    visual_consistency:
      description: 确保会员相关UI元素视觉一致的策略
      key_approaches:
        - 定义Pro元素专用色彩变量
        - 统一使用指定图标和徽章样式
        - 确保所有升级入口风格一致
        - 在设计系统中添加会员状态变体
      
      implementation:
        - 使用CSS变量定义会员状态样式
        - 创建专有设计令牌(design tokens)
        - 实现一致的会员状态过渡动画
        - 统一错误和限制状态的视觉反馈

## 权限控制机制:
  permission_control:
    # 前端权限控制
    frontend_permissions:
      description: 在前端实现的会员权限控制机制
      mechanisms:
        # React组件权限控制
        component_level:
          - 使用高阶组件(HOC)包装需要权限的组件
          - 实现专用的ProFeatureGate组件
          - 针对锁定内容实现视觉反馈
        
        # 操作权限控制  
        action_level:
          - 在关键操作前检查会员状态
          - 针对非会员提供适当升级提示
          - 保留基本功能确保良好体验
        
        # 路由权限控制
        route_level:
          - 会员中心页面仅对会员可见
          - 特定设置项目需要会员权限
      
      code_example: |
        // 操作级别权限检查示例
        async function handleExportAction() {
          // 检查会员权限
          const { isProMember } = useMembership();
          
          if (!isProMember) {
            // 显示升级提示
            upgradeService.showUpgradePrompt('export_feature');
            return;
          }
          
          // 执行导出逻辑
          await exportService.exportPrompts();
        }
    
    # 服务层权限控制
    service_permissions:
      description: 在服务层实现的会员权限控制机制
      mechanisms:
        # 配额限制实现
        quota_enforcement:
          - 在核心服务方法前添加配额检查
          - 返回标准格式的配额状态信息
          - 在达到限制时提供清晰错误信息
        
        # 权限验证中间件
        permission_middleware:
          - 实现通用权限检查逻辑
          - 用装饰器标记需要会员权限的方法
          - 统一处理权限错误和升级提示
      
      code_example: |
        // 服务方法配额检查示例
        class PromptService {
          // 创建提示词方法
          async createPrompt(input: CreatePromptInput): Promise<Prompt> {
            // 检查存储配额
            const quotaInfo = await quotaService.checkPromptStorageQuota();
            
            // 如果达到限制，抛出标准错误
            if (quotaInfo.isLimitReached) {
              throw new QuotaExceededError('prompt_storage', quotaInfo);
            }
            
            // 配额未达限制，继续创建提示词
            const prompt = await this._createPrompt(input);
            return prompt;
          }
        }
    
    # 配额管理实现
    quota_management:
      description: 配额检查和限制的实现机制
      key_aspects:
        - 在多个层次实现配额检查
        - 明确定义不同会员级别的配额限制
        - 提供配额监控和预警机制
        - 实现降级时的超额内容处理
      
      implementation:
        - 存储配额: 基于已存储提示词数量
        - 优化配额: 基于24小时周期的使用次数
        - 导出功能: 基于会员状态的功能开关
        - 数据同步: 本地与远程双重验证
      
      quota_reset:
        - 周期性配额: 基于用户本地时区每日0点重置
        - 重置实现: 使用定时任务检查和更新
        - 状态持久化: 记录上次重置时间和下次重置时间
      
      downgrade_handling:
        - 存储超额处理: 保留最近使用的5条提示词
        - 功能降级: 优雅禁用Pro专属功能
        - 用户通知: 明确说明降级原因和处理方式
    
    # 错误处理策略
    error_handling:
      description: 处理权限和配额相关错误的策略
      error_types:
        - QuotaExceededError: 配额超出限制
        - PermissionDeniedError: 没有访问权限
        - SubscriptionExpiredError: 订阅已过期
        - PaymentRequiredError: 需要付费访问
      
      handling_approach:
        - 在UI层捕获并显示友好错误提示
        - 提供明确的后续操作指引
        - 避免中断用户工作流程
        - 保持错误状态的一致性
      
      code_example: |
        // 错误处理示例
        try {
          await promptService.createPrompt(newPrompt);
        } catch (error) {
          if (error instanceof QuotaExceededError) {
            // 显示配额限制提示
            notificationService.showQuotaExceededNotification({
              type: error.quotaType,
              currentUsage: error.quotaInfo.currentCount,
              limit: error.quotaInfo.limit,
              onUpgradeClick: () => upgradeService.showUpgradePrompt('quota_exceeded')
            });
          } else {
            // 处理其他错误
            notificationService.showErrorNotification({
              message: 'Failed to create prompt',
              details: error.message
            });
          }
        }

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