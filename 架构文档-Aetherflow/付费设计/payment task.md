---
title: AetherFlow付费功能任务规划
version: 1.0
date: 2023-12-01
---
``` yaml
# 文档关联说明
- 本文档(`payment task.md`)包含AetherFlow付费功能的具体任务规划和实现进度
- 与`payment.md`文档相互补充，`payment.md`包含付费功能的详细设计方案
- 开发者应先阅读本文档了解任务内容，然后参考`payment.md`获取具体设计细节
- 任务按照推荐的开发优先级顺序排列，请按照此顺序实施
- **重要说明**：当开发者发现两份文档有矛盾之处,或发现任务不合理之处时,应立即指出并要求澄清。请勿基于有疑问的信息进行开发

# 参考文档
参考文档
-付费功能规划： `payment.md` 
-付费任务设计：`payment task.md` 
-paddle官方文档（权威）： `paddle official references`
-paddle人工配置后得到的信息： `paddle 配置信息`

# 渐进式任务设计:
implementation_tasks:
  # 开发原则
  development_principles:
    - 按垂直功能切片，而非水平技术层次
    - 每个任务产出可独立验收的功能
    - 按用户体验流程设计开发顺序
    - 确保每个阶段都有完整可用的产品体验
  
  # 阶段A: 基础会员标识与升级入口 (1周)
  phase_a:
    description: 实现基础会员状态显示和升级入口，完成用户发现付费功能的第一步体验
    
    task_a1: # 会员状态数据设计与存储
      description: 设计并实现会员状态数据模型与存储
      work_items:
        - 设计MembershipState数据结构，包含status, plan, expiresAt等字段
        - 实现本地会员状态存储(chrome.storage.local)
        - 创建会员状态服务(MembershipService)的基础API
        - 添加会员状态存取和状态判断方法
      
      acceptance_criteria:
        - 能正确存储和读取会员状态信息
        - 能通过API判断当前是否为Pro会员
        - 提供默认的免费会员状态初始化
        - 所有API有适当的类型定义和错误处理
    
    task_a2: # ProBadge组件实现
      description: 实现PRO标识组件，显示会员状态
      work_items:
        - 创建ProBadge组件，支持active/inactive状态
        - 连接会员状态服务，动态显示状态
        - 实现悬停效果(暂不包含会员计划预览)
        - 添加点击事件(暂时只记录日志)
        - 集成到Navigation组件中
      
      acceptance_criteria:
        - ProBadge组件在用户头像左边正确显示
        - 免费用户显示灰色未激活状态
        - 组件样式与设计规范一致
        - 鼠标悬停有适当的视觉反馈
    
    task_a3: # UpgradeButton组件实现
      description: 实现升级按钮组件，提供明确的升级入口
      work_items:
        - 创建UpgradeButton组件，支持不同显示状态
        - 在侧边栏左下角位置集成组件
        - 实现基础点击行为(打开新标签)
        - 添加鼠标悬停提示
        - 支持不同来源标记(用于后续数据分析)
      
      acceptance_criteria:
        - 按钮在侧边栏左下角正确显示
        - 按钮样式与设计规范一致
        - 点击按钮能打开新的标签页
        - 鼠标悬停显示提示文本
    
    task_a4: # 会员状态测试工具
      description: 创建开发环境下的会员状态模拟切换工具
      work_items:
        - 创建简单的状态切换UI(仅开发环境可见)
        - 实现手动切换会员状态的功能
        - 添加状态重置和模拟到期的功能
        - 确保状态变更能实时反映在UI上
      
      acceptance_criteria:
        - 开发环境中能看到状态切换工具
        - 能手动切换免费/专业版状态
        - 切换后UI组件立即更新状态
        - 状态能持久化保存(页面刷新后保持)
    
    phase_a_verification:
      scenario: "基础会员标识与升级入口验收"
      steps:
        - 启动应用，观察UI显示
        - 检查ProBadge和UpgradeButton组件
        - 测试组件的基本交互功能
        - 使用状态测试工具切换会员状态
      expected:
        - 用户能看到PRO标识(灰色非激活状态)
        - 用户能看到侧边栏左下角的升级按钮
        - 点击升级按钮可打开预设URL
        - 开发者能使用测试工具模拟不同状态
  
  # 阶段B: 支付流程与会员计划预览 (1周)
  phase_b:
    description: 实现支付流程和会员计划预览功能，使用户能了解会员权益并完成付费
    
    task_b1: # 会员计划预览卡片
      description: 实现会员计划预览卡片，展示会员权益
      work_items:
        - 创建ProPlanCard组件，展示会员权益和价格
        - 实现卡片动画和样式
        - 添加升级按钮和查看详情链接
        - 将卡片与ProBadge/upgrade_button悬停事件关联
      
      acceptance_criteria:
        - 鼠标悬停在ProBadge上显示预览卡片
        - 卡片内容完整展示核心会员权益
        - 卡片有平滑的显示/隐藏动画
        - 卡片上的按钮可点击并正确跳转
    
    task_b2: # Paddle支付系统集成
      description: 注册并集成Paddle支付系统，包括账户设置、API集成和Webhook处理
      work_items:
        - 注册Paddle开发者账户【已完成】
        - 设置产品和订阅计划【已完成】
        - 配置Webhook和回调URL【已完成】
        - 实现敏感密钥的安全访问机制【已完成】
        - 实现开发和生产环境独立配置【已完成】
        - 添加Webhook处理服务【已完成】(通过Google Cloud Run实现)
        - 集成Paddle客户端API【不属于本任务】(移至B3任务)
        
      acceptance_criteria:
        - Paddle账户正确配置且可用
        - 可安全访问敏感密钥
        - 开发和生产环境配置独立
        - Webhook能接收并处理支付事件
        - 系统能正确响应支付状态变更
      
      implementation_note: |
        已完成各项配置和系统集成准备工作:
        
        已完成部分:
        - 域名注册和DNS配置(aetherflow-app.com)
        - HTTPS证书设置和激活
        - 配置API子域名(api.aetherflow-app.com)
        - Paddle账户注册和验证
        - Paddle产品和订阅计划设置
        - Webhook服务实现(通过Google Cloud Run):
          * 已成功接收subscription.created等事件
          * 已实现webhook事件处理逻辑
          * 已与Firestore数据库集成
        - 配置服务实现:
          * 环境检测和配置隔离机制
          * Paddle配置集中管理(vendorId, apiKey, productIds等)
          * 敏感信息安全访问机制
          * 开发与生产环境配置分离

        **注意**: Paddle客户端API集成不属于本任务范围,应在B3任务(官网支付页面实现)中完成。
    
    task_b5: # 会员状态管理核心实现
      description: 实现会员状态管理的核心服务和数据模型
      work_items:
        - 实现完整的MembershipState数据模型【已完成】(在types.ts中定义了完整的数据模型)
        - 创建MembershipService服务类【已完成】(在index.ts中实现了完整的服务类)
        - 实现本地与服务器状态同步机制【已完成】(添加了与Firestore的双向同步功能)
        - 添加状态变更通知机制【已完成】(使用观察者模式与防抖处理实现)
        - 实现会员权限检查逻辑【已完成】(提供了isProMember和getMembershipQuota等API)
        - 设计支付成功后状态更新流程【已完成】(实现了handleSuccessfulPayment处理流程)
      
      acceptance_criteria:
        - 会员状态能在本地正确存储和更新
        - 支持定期与服务器同步验证会员状态
        - 状态变更时UI组件能及时更新
        - 权限检查机制可靠且性能良好
        - 具备完整的状态更新和冲突解决策略
      
      implementation_note: |
        会员状态管理服务已完整实现，包括状态存储、同步和权限检查等核心功能。

        主要完成内容:
        - 完整实现了MembershipState数据模型(在types.ts中)
        - 创建了MembershipService服务类，实现了所有核心功能
        - 添加了本地存储与Firestore的双向同步机制
        - 实现了状态变更通知系统(使用观察者模式和防抖处理)
        - 提供了会员权限检查API(isProMember等)
        - 实现了支付成功和会员到期的处理流程
        - 添加了定期自动同步和网络恢复后同步
        - 完善了错误处理、重试机制和日志记录
        - 提供了开发环境下的状态模拟工具
        - 创建了详细的README文档和CHANGELOG记录

        该服务现已完全满足付费功能的核心需求，支持后续B3和B6任务的实现。
    
    task_b3: # 官网支付页面实现
      description: 创建官网支付页面，作为支付流程的入口
      work_items:
        - 基于现有GitHub Pages设计支付页面UI【已完成】(已存在于GitHub Pages)
        https://github.com/Aetherflow-app/Aetherflow-app.github.io.git
        https://aetherflow-app.com/
        - 添加月度/年度计划选择功能【已完成】(已存在于GitHub Pages)
        - 集成Paddle Checkout.js脚本【已完成】
        - 实现支付按钮和Paddle结账流程【已完成】
        - 添加支付来源跟踪参数处理【已完成】
        - 设计支付成功/取消后的回调机制【已完成】
        - Paddle客户端API集成【已完成】(从B2任务移至此处)
      
      acceptance_criteria:
        - 支付页面风格与产品一致
        - 能清晰展示不同价格方案
        - 成功集成Paddle结账功能
        - 能正确处理来源跟踪参数
        - 支付完成后有明确的下一步引导
        - 能通过Paddle API查询订阅状态
      
      implementation_note: |
        任务完成状态：【已全部完成】
        
        已完成所有工作项，实现了完整的支付流程：
        
        1. 集成实现：
           - 成功集成了Paddle Checkout.js v2 API
           - 实现了月度/年度支付按钮功能
           - 添加了UTM参数跟踪和存储机制
           - 完善了支付成功后的回调处理
        
        2. 环境处理：
           - 实现了灵活的环境检测机制，可通过URL参数(?env=sandbox)控制
           - 在页面中添加了明显的沙盒环境标识
           - 保证在生产域名下也能安全地进行沙盒测试
        
        3. 验证测试：
           - 在沙盒环境成功完成支付流程测试
           - Paddle后台成功记录交易事件
           - 多个webhook事件成功触发(payment_method.saved, transaction.updated, transaction.completed, subscription.created等)
           - Cloud Run服务器成功接收并处理webhook事件
           - 支付成功页面正确显示交易信息
        
        所有acceptance_criteria均已满足，实现了完整可用的支付流程。为B6任务做好了准备。
    
    # B3与B6任务连接说明
    沙盒环境与生产环境支付流程说明：
    
    1. **安全风险提示**：
       - 当前实现中，支付完成后会员状态与设备/浏览器绑定，而非用户账户
       - 存在用户重装浏览器、更换设备、修改本地存储等导致会员权益丢失或被盗用的风险
       - B8任务将通过官网认证功能解决这些问题，确保会员权益与用户账户绑定
    
    2. **沙盒与生产环境的会员状态更新机制**：
       - 支付成功页面(success.html)会通过chrome.runtime.sendMessage向扩展发送消息
       - 消息包含checkoutId和planType，用于更新会员状态
       - 在B8任务实现后，这些信息还将与用户账户ID关联存储
       - 本地会在支付成功时立即更新会员状态，同时尝试同步到服务器
       - 如无法立即通信，会使用localStorage作为备份，在扩展启动时恢复处理
    
    3. **验证方法**：
       - 支付成功后ProBadge会变为激活状态(金色)
       - 用户权限会立即更新，可访问专业版功能
       - 可在开发者控制台查看支付处理和会员状态更新的日志
       - 支持断网等异常场景下的恢复机制
    
    4. **无缝登录体验优化**：
       - B8任务将实现扩展与官网间的无缝登录状态传递
       - 若用户已在扩展登录，跳转到官网时将自动使用相同账户登录
       - 若用户未在扩展登录，将在支付前引导完成登录流程
       - 这种无缝体验将大幅提升用户转化率并减少支付流程摩擦
       - 行业最佳实践表明，减少认证步骤可提高支付完成率约15-25%
    
    task_b8: # 官网认证功能实现
      description: 实现官网用户认证系统，提供基础认证功能和扩展与官网间的无缝登录体验
      work_items:
        - 参考详细设计文档 `架构文档-Aetherflow/模块设计/website-auth` 【已完成】
        - 在官网集成Firebase Authentication 【已完成】
        - 实现基本认证功能:
          * 登录/注册 【已完成】
          * 忘记密码 【已完成】
          * Google一键登录 【已完成】
        - 设计并实现认证UI组件(登录按钮、模态框) 【已完成】
        - 实现登录状态管理和显示 【已完成】
        - 从扩展到官网的无缝登录传递机制开发 【已完成】
        - 提供用户认证状态API供支付流程使用 【已完成】

      acceptance_criteria:
        - 用户能在官网完成基本认证流程 【已满足】
        - 认证UI与官网风格一致，不破坏整体布局 【已满足】
        - 扩展登录用户访问官网时无需重新登录 【已满足】
        - 提供明确的API供支付流程获取认证状态 【已满足】
        - 认证功能可靠且具有适当的错误处理 【已满足】
      
      implementation_note: |
        任务完成状态：【已全部完成】
        详细设计见`架构文档-Aetherflow/模块设计/website-auth`文档。
        
        关键实现点:
        - 使用Firebase Auth UI简化实现
        - 保持官网静态网站架构，仅通过客户端JS实现认证
        - 专注于最小化实现，避免复杂功能
        - 扩展到官网的无缝登录体验已实现并通过ID Token -> Custom Token流程完成认证同步
        - Cloud Run服务 (`create-custom-token`) 用于处理Token转换，相关服务账号需具备`Service Account Token Creator`角色
        - 此任务只负责认证系统本身，支付流程集成由B6任务负责
    
    task_b6: # 支付流程连接与成功处理
      description: 连接支付入口与支付流程，集成用户认证，实现支付成功后的处理
      work_items:
        # 1. 用户认证集成 (User Authentication Integration)
        - 未登录用户尝试支付时，被正确引导至官网登录/注册流程。
        - 支付表单能自动预填已登录用户的邮箱地址。

        # 2. 支付与用户身份关联 (Payment & User Identity Association)
        - 用户唯一标识符 (如 Firebase User ID) 成功传递给 Paddle 并与订阅记录关联。
        - 后端数据库 (Firestore) 中的订阅信息与正确的用户账户准确关联。

        # 3. 支付成功处理与状态更新 (Payment Success Handling & Status Update)
        - 支付成功后，用户的会员状态在扩展和后端 (Firestore) 自动、准确地更新。
        - 扩展内的 UI 元素 (如 ProBadge 变为金色、升级按钮更新样式) 实时反映更新后的会员状态。
        - 用户在支付成功后收到清晰、及时的成功反馈信息。
        - 同一账户登录的多设备/浏览器实例能同步获取更新后的会员状态。

        # 4. 环境区分处理 (Environment Differentiation Handling)
        - 沙盒环境支付能成功触发测试状态更新，且不影响生产环境数据。
        - 生产环境支付能成功触发真实状态更新，且沙盒/生产数据严格隔离。

        # 5. 健壮性与用户体验 (Robustness & User Experience)
        - 支付流程中的常见异常（如用户取消、支付失败、网络问题）有合适的处理逻辑和用户提示。
        - 支付来源信息能被正确传递和记录（用于分析或调试）。
      
      acceptance_criteria:
        # 1. 用户认证集成 (User Authentication Integration)
        - 未登录用户尝试支付时，被正确引导至官网登录/注册流程。
        - 支付表单能自动预填已登录用户的邮箱地址。

        # 2. 支付与用户身份关联 (Payment & User Identity Association)
        - 用户唯一标识符 (如 Firebase User ID) 成功传递给 Paddle 并与订阅记录关联。
        - 后端数据库 (Firestore) 中的订阅信息与正确的用户账户准确关联。

        # 3. 支付成功处理与状态更新 (Payment Success Handling & Status Update)
        - 支付成功后，用户的会员状态在扩展和后端 (Firestore) 自动、准确地更新。
        - 扩展内的 UI 元素 (如 ProBadge 变为金色、升级按钮更新样式) 实时反映更新后的会员状态。
        - 用户在支付成功后收到清晰、及时的成功反馈信息。
        - 同一账户登录的多设备/浏览器实例能同步获取更新后的会员状态。

        # 4. 环境区分处理 (Environment Differentiation Handling)
        - 沙盒环境支付能成功触发测试状态更新，且不影响生产环境数据。
        - 生产环境支付能成功触发真实状态更新，且沙盒/生产数据严格隔离。

        # 5. 健壮性与用户体验 (Robustness & User Experience)
        - 支付流程中的常见异常（如用户取消、支付失败、网络问题）有合适的处理逻辑和用户提示。
        - 支付来源信息能被正确传递和记录（用于分析或调试）。
      
      implementation_note: |
        此任务依赖于B3(官网支付页面)、B5(会员状态管理)和B8(官网认证功能)的完成，应在完成这些任务后进行。
        
        B6任务主要负责将B8实现的认证系统与支付流程整合，确保：
        1. 支付前验证用户登录状态
        2. 支付过程中将用户ID与订阅关联
        3. 支付成功后将会员权益与用户账户(而非设备)绑定
        
        这种任务分配可以确保B8专注于认证基础设施，而B6专注于支付流程与认证的集成，提高开发效率和模块化。
    
    task_b4: # 后端webhook服务实现
      description: 实现接收和处理Paddle支付事件的后端服务
      work_items:
        - 创建基于Firebase Functions的webhook接收端点【已完成】(使用Google Cloud Run代替)
        - 实现webhook签名验证逻辑【已完成】(但生产环境需配置公钥并启用)
        - 处理subscription_created, subscription_updated, subscription_cancelled等关键事件【已完成】
        - 实现会员状态数据库记录创建和更新【已完成】(使用Firestore存储)
        - 添加webhook处理日志和错误监控【已完成】
        - 设计幂等处理机制避免重复事件问题【已完成】
      
      acceptance_criteria:
        - webhook端点可正确接收Paddle事件
        - 所有关键事件都有对应的处理逻辑
        - 能正确验证webhook签名确保安全
        - 订阅数据能准确存储到Firebase数据库
        - 有完整的错误处理和日志记录
      
      implementation_note: 已经使用Google Cloud Run实现,代码位于`架构文档-Aetherflow/付费设计/cloud run代码`。
    
    task_b7: # 会员中心基础实现 (MVP)
      description: 实现会员中心初始版本(MVP)，为Pro会员提供状态概览、权益列表、基础用量展示(静态)和订阅管理入口。
      # 注意：此任务范围已根据 `架构文档-Aetherflow/模块设计/membership centre` PRD v1.1 调整，包含部分原D4功能。
      work_items:
        - 创建 MembershipCenter 组件 (侧边抽屉式)【待完成】
        - 实现会员状态概览区域：显示 Pro 状态、关联邮箱、当前计划、到期/续费日期、会员开始日期 【待完成】
        - 实现会员特权展示区域：静态列表展示核心权益 【待完成】
        - 实现配额用量展示区域的 **静态 UI 布局**：包含存储用量和优化用量的标签及数值/进度条占位符【待完成】
        - 实现订阅管理入口：添加"管理我的订阅"按钮，链接至 **可配置的** Paddle 客户门户 URL 【待完成】
        - 连接 MembershipService 和 AuthService，动态显示会员状态、邮箱、计划、日期等 **非配额** 信息 【待完成】
        - 实现基础的加载和错误状态处理逻辑 【待完成】
      
      acceptance_criteria:
        - 点击激活的ProBadge或闪电按钮能打开会员中心抽屉。
        - 能正确显示 Pro 状态、用户邮箱、当前计划、到期日期和开始日期。
        - 能静态展示核心会员权益列表。
        - **存在** 用于显示存储和优化用量的 UI 区域布局 (初始无需真实数据)。
        - 提供"管理我的订阅"按钮，点击能跳转 (初始 URL 可为占位符)。
        - 会员信息 (非配额部分) 能在状态变更时自动更新。
        - 具备基本的加载和错误状态显示。
        - 会员中心样式与设计规范一致。
      
      implementation_note: |
        此任务旨在交付会员中心的 MVP 版本，具体需求见 `架构文档-Aetherflow/模块设计/membership centre` PRD v1.1。
        
        **后续依赖与任务:**
        - **动态配额数据对接:** 依赖阶段 C 的 `QuotaService` 实现，届时需更新此组件以显示真实用量数据。
        - **Paddle 门户 URL 配置:** "管理我的订阅" 按钮的目标 URL 需要在后续配置正确的 Paddle 客户门户地址。
        
        原定于阶段 D 的其他会员中心功能 (如产品更新、FAQ、应用内计划更改等) 已被移除或推迟。
    
    phase_b_verification:
      scenario: "基础支付流程验收"
      steps:
        - 初始状态为免费用户
        - 点击升级按钮或ProBadge
        - 跳转到官网支付页面
        - 完成Paddle支付流程
        - 返回应用观察状态变化
        - 检查会员中心功能
      expected:
        - 能顺利完成从升级点击到支付完成的全流程
        - 支付成功后会员状态能正确更新
        - 会员中心能显示正确的订阅信息
        - 会员状态变化有适当的视觉反馈
        - 在B8任务完成后，会员状态应与用户账户绑定而非设备
        - 同一账户可在多设备上使用会员功能
      
      current_progress:
        - 已完成：B2(Paddle支付系统集成)、B3(官网支付页面)、B4(webhook服务)和B5(会员状态管理)
        - 待完成：B8(官网认证功能)、B6(支付流程连接)、B7(会员中心 MVP)
        - 推荐开发顺序：B8 > B6 > B7 (会员中心 MVP)
    
    # 阶段C: 配额管理与限制体验 (1周)
    phase_c:
      description: 实现配额管理和限制体验，清晰展示免费与Pro会员在核心功能使用上的差异，并自然引导升级。
      # 详细设计参考: `架构文档-Aetherflow/模块设计/quota and overlay`
      # 注意：以下任务项提供了推荐的实现路径，但开发者在执行时若发现与现有代码冲突或有更优方案，应及时沟通并调整。
      
      # --- 模块 C.1: 配额服务基础 --- 
      module_c1:
        name: Quota Service Foundation
        description: 构建配额管理的核心服务 (`QuotaService`)，定义、存储和计算配额。
        tasks_included: [task_c1]
        work_items:
          - 定义 `QuotaLimits` 和 `QuotaUsage` 数据模型 (包含 storage, optimization 计数和 optimization lastReset 时间戳)。
          - 创建 `QuotaService` 服务类 (位置: `extension/src/services/quota/`)。
          - 实现配额数据存储 (倾向于独立 Firestore 文档 `users/{userId}/quota/status`)。
          - 实现获取用户当前配额限制的逻辑 (根据 `MembershipService` 状态确定免费/Pro限制：Storage 5/100, Opti 3/50)。
          - 实现查询当前用量和检查是否可使用某功能 (`getUsage`, `getLimits`, `canUseFeature`) 的 API。
          - 实现更新用量 (`incrementUsage`) 和重置优化次数 (`resetOptimizationUsage`) 的 API。
          - 实现与 `MembershipService` 状态变更的联动，当会员状态变化时自动更新 `QuotaLimits`。
          - 实现用量/限制状态变更的通知机制 (观察者模式)。
          - 处理匿名用户和新用户的配额初始化逻辑。
          - (后台任务) 使用 `chrome.alarms` API 设置每日定时器，在用户本地时间凌晨 00:00 调用 `resetOptimizationUsage`。
        acceptance_criteria:
          - `QuotaService` 能根据会员状态正确返回存储和优化配额的限制值。
          - 能正确存储、读取和更新用户的存储用量和每日优化用量。
          - `canUseFeature` API 能准确判断用户是否超出某项配额。
          - 会员状态变更后，`QuotaService` 能自动更新并应用新的配额限制。
          - 每日优化次数能在用户本地时间凌晨 00:00 准确重置 (免费=3, Pro=50)。
          - 匿名用户和新用户的配额状态被正确初始化。
          - 提供清晰的 API 供其他服务调用，并包含必要的类型定义和错误处理。
        dependencies: 
          - MembershipService (Phase B)

      # --- 模块 C.2: 降级处理与锁定内容 UI --- 
      module_c2:
        name: Downgrade Handling & Locked Content UI
        description: 实现会员降级时的超额内容处理逻辑，并提供对应的锁定状态 UI 展示。
        tasks_included: [task_c2, task_c4]
        work_items:
          # C2 - Downgrade Logic
          - 在 `MembershipService` 中，当检测到状态从 `pro` 变为 `free` 时，触发降级处理逻辑。
          - （降级逻辑主体可能在 `PromptService` 中）获取免费存储配额 (5 条)。
          - 统计当前用户提示词总数，若 > 5，则根据 **创建时间 (`createdAt`)** 降序排序，保留最新的 5 条。
          - 将其余旧提示词的 Firestore 文档字段 `locked` 更新为 `true`。
          - 添加 `locked` 字段到 `Prompt` 的 TypeScript 定义中。
          - 实现用户重新升级为 Pro 时，自动将所有提示词 `locked` 字段更新为 `false` 或移除的逻辑。
          # C4 - Locked Content UI
          - 修改现有 `PromptCard` 组件，增加对 `locked` 状态的处理逻辑。
          - 当 `prompt.locked === true` 时，应用锁定的视觉样式 (灰色遮罩、锁定图标、内容透明度降低)。
          - 实现鼠标悬停 (Hover) 效果 (遮罩变暗、显示升级提示文本和 "升级解锁" 按钮)。
          - 阻止锁定卡片的默认点击行为 (如加载到编辑器)。
          - "升级解锁" 按钮点击跳转至官网支付页 (携带来源参数)。
          - 实现锁定状态的 UI 设计 (遮罩、图标、文本、按钮样式、动画)，遵循 `quota and overlay` PRD 中的规范。
        acceptance_criteria:
          # C2
          - 用户从 Pro 降级为 Free 且提示词数量 > 5 时，除最新创建的 5 条外，其余提示词的 `locked` 字段被设为 `true`。
          - 排序依据是提示词的 `createdAt` 字段。
          - 提示词的类型定义已更新包含 `locked` 字段。
          - 用户重新升级为 Pro 后，所有提示词的 `locked` 状态被正确移除。
          # C4
          - `locked: true` 的提示词在列表中显示为锁定状态。
          - 锁定状态的视觉效果 (遮罩、图标、透明度) 符合设计。
          - 鼠标悬停效果和升级提示、按钮显示正常。
          - 点击锁定卡片本身无反应。
          - 点击 "升级解锁" 按钮能正确跳转到支付页面。
        dependencies:
          - Module C.1 (QuotaService)
          - MembershipService (Phase B)

      # --- 模块 C.3: 配额集成与限制触达 UI --- 
      module_c3:
        name: Quota Integration & Limit Reached UI
        description: 将配额检查集成到核心操作流程，并实现达到限制时的 UI 反馈（横幅及 Toast）。
        tasks_included: [task_c5, task_c3]
        work_items:
          # C5 - Integration & Error Handling
          - 在创建新提示词的服务/Hook (如 `PromptService`) 中，调用 `quotaService.canUseFeature('storage')` 进行检查。
          - 在执行优化功能的服务/Hook 中，调用 `quotaService.canUseFeature('optimization')` 进行检查。
          - 在优化成功完成后，调用 `quotaService.incrementUsage('optimization')` 更新用量。
          - 定义并实现特定的错误类型 `QuotaExceededError` (携带配额类型信息)。
          - 当 `canUseFeature` 返回 `false` 时，对应服务/Hook 应抛出 `QuotaExceededError` 并阻止操作。
          - 实现上层 (如 UI 或调用 Hook 的地方) 对 `QuotaExceededError` 的捕获和处理逻辑，触发相应的 UI 反馈 (首次横幅，后续或 Pro 限制使用 Toast)。
          - 实现 Toast 提示的显示逻辑和 UI 设计 (遵循 PRD)。
          # C3 - Quota Banner UI
          - 创建 `QuotaBanner` React 组件 (位置: `components/common/` 或 `components/quota/`)。
          - 组件能接收配额类型 (`storage` 或 `optimization`) 作为 prop，并显示对应的文案 (包含当前限制和 Pro 权益)。
          - 实现 "升级到 Pro" 按钮，点击跳转至官网支付页 (携带来源参数)。
          - 实现 "了解更多" 按钮/链接，行为复用 `UpgradeButton` 组件 (跳转官网、hover卡片、带token)。
          - 实现 "关闭" 按钮，点击后隐藏横幅 (当前会话内同类型不再自动弹出)。
          - 实现横幅的 UI 设计 (样式、布局、图标、动画)，遵循 `quota and overlay` PRD 中的规范。
        acceptance_criteria:
          # C5
          - 免费用户创建第 6 条提示词时，操作被阻止并抛出 `QuotaExceededError(type='storage')`。
          - 免费用户尝试第 4 次优化时，操作被阻止并抛出 `QuotaExceededError(type='optimization')`。
          - Pro 用户创建第 101 条提示词时，操作被阻止并抛出 `QuotaExceededError(type='storage')`。
          - Pro 用户尝试第 51 次优化时，操作被阻止并抛出 `QuotaExceededError(type='optimization')`。
          - 优化操作只有在成功后才增加优化次数计数。
          - 错误处理逻辑能区分不同类型的配额超限，并根据规则触发 Banner 或 Toast。
          # C3
          - 当免费用户首次尝试创建第 6 条提示词时，在提示词列表顶部显示存储限制横幅。
          - 当免费用户首次尝试执行第 4 次优化时，在优化区域显示优化限制横幅。
          - 横幅内容根据配额类型正确显示。
          - "升级" 和 "了解更多" 按钮功能符合预期 (正确跳转、携带参数/token)。
          - "关闭" 按钮能隐藏横幅，且同会话同类型不再自动触发。
          - 横幅 UI 符合设计规范。
          - Toast 提示按规则正确显示并符合设计。
        dependencies:
          - Module C.1 (QuotaService)

      phase_c_verification:
        scenario: "配额管理与限制体验验收 (按模块)"
        steps:
          - **模块 C.1 验收:**
            - (开发者) 调用 QuotaService API 验证：不同会员状态下的 `getLimits` 返回值。
            - (开发者) 调用 API 验证 `incrementUsage` 和 `getUsage` 功能。
            - (模拟) 修改 Firestore 数据，验证 `QuotaService` 对用量/限制变化的通知。
            - (模拟) 验证每日重置功能是否按本地时间触发。
            - (开发者) 验证匿名/新用户初始化。
          - **模块 C.2 验收:**
            - (模拟) Pro 用户拥有 > 5 条提示词，将其状态降级为 Free。
            - 检查 Firestore 中提示词的 `locked` 字段是否按 `createdAt` 规则正确设置。
            - 在扩展 UI 中检查对应的旧提示词是否显示为锁定状态，并验证锁定卡片 UI (遮罩、图标、Hover 效果、升级按钮)。
            - 点击锁定卡片升级按钮，验证跳转。
            - (模拟) 将用户升级回 Pro，验证 `locked` 字段被移除，UI 恢复正常。
          - **模块 C.3 验收:**
            - 免费用户创建 5 条提示词，尝试创建第 6 条 -> 阻止操作，显示存储横幅。
            - 关闭横幅，再次尝试创建 -> 阻止操作，显示 Toast。
            - 免费用户使用 3 次优化，尝试第 4 次 -> 阻止操作，显示优化横幅。
            - 关闭横幅，再次尝试优化 -> 阻止操作，显示 Toast。
            - Pro 用户 (模拟 100 条提示词)，尝试创建第 101 条 -> 阻止操作，显示 Toast。
            - Pro 用户 (模拟 50 次优化)，尝试第 51 次 -> 阻止操作，显示 Toast。
            - 验证横幅/Toast 内容、样式、交互 ("升级", "了解更多", "关闭") 符合设计。
        expected:
          - 每个模块的功能符合其验收标准。
          - 各项配额检查准确，超额操作按预期被阻止。
          - 达到限制时有清晰且符合规则的 UI 反馈（横幅/Toast）。
          - 降级后超额内容按创建时间正确处理为锁定状态，并有相应 UI 展示。
          - 所有限制场景有明确的升级引导，且跳转正确。
          - 每日优化次数能正确重置。

    # 阶段D: 功能完善与异常处理 (1周)
    phase_d:
      description: 完善特权功能，处理异常情况，优化整体体验
      
      task_d1: # 会员特权功能实现
        description: 实现会员专属功能与权限控制
        work_items:
          - 实现提示词导出功能(仅会员可用)
          - 创建ProFeatureGate组件控制功能访问
          - 设计统一的特权功能访问控制机制
          - 添加特权功能的视觉标识
          - 实现非会员尝试使用特权功能时的引导
        
        acceptance_criteria:
          - 会员可使用导出等特权功能
          - 非会员尝试使用时得到友好提示
          - 特权功能有明确的视觉标识
          - 访问控制机制工作正常且性能良好
          - 升级引导自然而非强制
      
      task_d2: # 订阅生命周期管理
        description: 实现完整的订阅生命周期管理功能
        work_items:
          - 处理订阅取消事件
          - 处理订阅更新(升级/降级)事件
          - 实现订阅续费失败处理
          - 添加订阅即将到期提醒
          - 设计退款处理流程
        
        acceptance_criteria:
          - 能正确处理各种订阅状态变更事件
          - 订阅取消后状态正确更新
          - 即将到期时用户收到适当提醒
          - 续费失败有明确的处理和通知
          - 退款请求有规范的处理流程
      
      task_d3: # 异常处理与恢复机制
        description: 实现支付和会员状态的异常处理与恢复机制
        work_items:
          - 处理支付过程中断的恢复流程
          - 实现网络问题下的状态同步重试
          - 添加状态不一致检测与修复
          - 设计支付超时和验证失败的处理流程
          - 实现用户可触发的状态手动刷新
        
        acceptance_criteria:
          - 支付中断后可以恢复或重新开始
          - 网络问题不会导致用户状态错误
          - 能检测并修复状态不一致问题
          - 支付验证失败有友好提示和后续步骤
          - 用户可在出现问题时手动刷新状态
      
      task_d4: # 会员中心功能完善 (已合并部分至 B7 MVP，剩余推迟)
        description: 完善会员中心功能 (此任务大部分内容已合并入 B7 MVP 或推迟)
        work_items:
          # - 完善会员状态和特权展示 (已在 B7 MVP)
          # - 添加使用统计信息展示 (动态部分推迟至 C 阶段)
          # - 实现订阅历史记录查看 (移除，统一由 Paddle 门户处理)
          # - 优化订阅管理选项 (移除，统一由 Paddle 门户处理)
          - (可选) 添加常见问题解答部分 【推迟】
          - (可选) 添加产品更新与公告区域 【推迟】
        
        acceptance_criteria:
          # - 会员中心内容更完整和信息丰富 (部分已在 B7 MVP)
          # - 能查看提示词和优化使用统计 (动态部分推迟至 C 阶段)
          # - 提供更全面的订阅管理选项 (已移除)
          - (可选) 常见问题部分可帮助解决典型问题
          - (可选) 能展示最新动态
          # - 整体用户体验流畅直观 (基础交互在 B7 MVP)
        
        implementation_note: | 
          此阶段主要关注可选的、非核心的会员中心功能完善。
          核心功能已包含在 B7 MVP 中。
          动态用量显示将在 C 阶段与 QuotaService 对接时完成。
      
      task_d5: # 整体体验优化与分析埋点
        description: 优化整体付费体验，添加关键行为分析埋点
        work_items:
          - 添加会员状态变化的过渡动画
          - 优化各组件的加载状态
          - 实现关键付费行为的分析埋点
          - 添加升级转化漏斗分析
          - 进行端到端用户流程测试和修复
        
        acceptance_criteria:
          - 状态变化有平滑的视觉过渡
          - 加载状态提供良好的用户反馈
          - 关键用户行为有适当的分析埋点
          - 能跟踪和分析升级转化漏斗
          - 端到端流程测试无严重问题
      
      phase_d_verification:
        scenario: "功能完善与异常处理验收"
        steps:
          - 测试完整订阅生命周期
          - 模拟各种异常和恢复场景
          - 检查会员专属功能
          - 评估整体用户体验流畅度
        expected:
          - 订阅变更事件处理正确
          - 异常情况有恰当的处理和恢复
          - 会员专属功能可正常使用
          - 整体体验连贯流畅
          - 数据分析埋点正常工作