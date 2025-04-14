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
        - 实现完整的MembershipState数据模型【部分完成】(在配置服务中定义了基本结构)
        - 创建MembershipService服务类【待完成】
        - 实现本地与服务器状态同步机制【待完成】
        - 添加状态变更通知机制【待完成】
        - 实现会员权限检查逻辑【部分完成】(在配置服务中实现了基本权限管理)
        - 设计支付成功后状态更新流程【待完成】
      
      acceptance_criteria:
        - 会员状态能在本地正确存储和更新
        - 支持定期与服务器同步验证会员状态
        - 状态变更时UI组件能及时更新
        - 权限检查机制可靠且性能良好
        - 具备完整的状态更新和冲突解决策略
      
      implementation_note: |
        已在`extension/src/services/config`中创建配置服务,可作为会员状态管理的基础。此任务对完成支付流程至关重要,应优先实现。

        已完成部分:
        - 配置服务结构设计,包含环境检测和配置值管理
        - 会员限制配置(MembershipLimits)定义,包括免费和专业版的权限区分
        - Paddle配置项定义,包括API密钥、产品ID等关键信息
        - 环境隔离和敏感信息安全管理机制
        - 配置读取的公共接口和方法

        待完成部分:
        - MembershipService完整实现
        - 与服务器同步机制
        - 状态变更订阅和通知系统
        - 支付成功后的状态更新流程
    
    task_b3: # 官网支付页面实现
      description: 创建官网支付页面，作为支付流程的入口
      work_items:
        - 基于现有GitHub Pages设计支付页面UI【已完成】(已存在于GitHub Pages)
        - 添加月度/年度计划选择功能【已完成】(已存在于GitHub Pages)
        - 集成Paddle Checkout.js脚本【待完成】
        - 实现支付按钮和Paddle结账流程【待完成】
        - 添加支付来源跟踪参数处理【待完成】
        - 设计支付成功/取消后的回调机制【待完成】
        - Paddle客户端API集成【待完成】(从B2任务移至此处)
      
      acceptance_criteria:
        - 支付页面风格与产品一致
        - 能清晰展示不同价格方案
        - 成功集成Paddle结账功能
        - 能正确处理来源跟踪参数
        - 支付完成后有明确的下一步引导
        - 能通过Paddle API查询订阅状态
      
      implementation_note: |
        支付页面UI基础已完成,需继续集成Paddle结账功能和支付流程。
        
        本任务包含所有Paddle客户端API的集成工作,这是实现完整支付流程的关键部分。具体包括:
        - 集成Paddle Checkout.js库
        - 实现支付按钮和结账流程
        - 处理支付回调和状态更新
        - 利用Paddle API查询订阅状态
    
    task_b6: # 支付流程连接与成功处理
      description: 连接支付入口与支付流程，实现支付成功后的处理
      work_items:
        - 更新UpgradeButton点击行为，连接到官网支付页面【待完成】
        - 实现ProPlanCard上升级按钮的跳转行为【待完成】
        - 创建支付成功回调页面【待完成】
        - 实现回调页面中的会员状态验证与更新【待完成】
        - 添加支付成功后的提示和引导【待完成】
        - 实现支付完成后组件状态更新(ProBadge激活等)【待完成】
      
      acceptance_criteria:
        - 点击任意升级按钮能跳转到官网支付页面
        - 支付来源能正确传递和记录
        - 支付成功后状态能自动更新
        - ProBadge能变为激活状态(金色)
        - 升级按钮能变为闪电图标
        - 用户能获得清晰的成功反馈
      
      implementation_note: 此任务依赖于B3(官网支付页面)和B5(会员状态管理)的完成,应在完成这两个任务后进行。
    
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
    
    task_b7: # 会员中心基础实现
      description: 实现基础会员中心功能，展示会员状态和基本管理选项
      work_items:
        - 创建MembershipCenter组件(侧边抽屉式)【待完成】
        - 实现会员状态概览区域【待完成】
        - 添加基础会员特权展示【待完成】
        - 实现订阅管理入口(链接到Paddle客户门户)【待完成】
        - 连接会员状态服务，动态显示内容【待完成】
      
      acceptance_criteria:
        - 点击激活的ProBadge能打开会员中心
        - 能正确显示当前订阅状态和计划
        - 提供订阅管理的入口链接
        - 会员中心样式与设计规范一致
      
      implementation_note: 此任务不在关键路径上,可在基本支付流程(B3-B6)完成后再实现。初期可只实现基本订阅状态显示和管理入口,复杂功能可推迟到阶段D。
    
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
      
      current_progress:
        - 已完成：B2(Paddle支付系统集成)和B4(webhook服务)
        - 进行中：B5(会员状态管理)部分完成
        - 待完成：B3(官网支付页面)、B5(剩余部分)、B6(支付流程连接)、B7(会员中心)
        - 推荐开发顺序：B5 > B3 > B6 > B7
    
    # 阶段C: 配额管理与限制体验 (1周)
    phase_c:
      description: 实现配额管理和限制体验，展示免费用户与会员的权益差异
      
      task_c1: # 配额数据模型设计与管理服务
        description: 设计并实现配额数据模型和核心管理服务
        work_items:
          - 实现QuotaLimits和QuotaUsage数据模型
          - 创建QuotaService配额管理服务
          - 实现存储配额检查逻辑
          - 实现优化次数配额检查和计数逻辑
          - 添加配额重置定时机制
          - 实现与会员状态的联动机制
        
        acceptance_criteria:
          - 数据模型完整实现并与存储层集成
          - 能正确检查存储和优化配额状态
          - 配额限制能根据会员状态自动调整
          - 每日配额能在适当时间重置
          - 提供准确的配额使用统计信息
      
      task_c2: # 降级处理机制实现
        description: 实现会员降级时的超额内容处理机制
        work_items:
          - 设计降级处理策略(保留最新5条提示词)
          - 实现超额内容检测逻辑
          - 添加降级通知和提示机制
          - 实现锁定而非删除超额内容的机制
          - 提供恢复访问的明确引导
        
        acceptance_criteria:
          - 会员降级后能自动处理超额内容
          - 保留策略符合"最新5条"的规则
          - 超额内容被锁定而非直接删除
          - 用户收到友好的降级通知
          - 提供清晰的恢复访问指导
      
      task_c3: # 配额限制横幅与升级引导
        description: 实现配额限制提示横幅和升级引导
        work_items:
          - 创建QuotaBanner组件
          - 支持不同类型的配额限制提示
          - 实现关闭和升级按钮行为
          - 集成到主界面适当位置
          - 与配额服务连接，自动显示/隐藏
        
        acceptance_criteria:
          - 达到限制时自动显示对应横幅
          - 横幅显示正确的限制信息
          - 可通过关闭按钮暂时隐藏
          - 点击升级按钮正确跳转到支付流程
          - 不同类型限制有差异化提示
      
      task_c4: # 锁定提示词卡片实现
        description: 实现超出配额的锁定提示词卡片
        work_items:
          - 创建LockedPromptCard组件
          - 实现锁定视觉效果和交互
          - 添加升级提示和按钮
          - 集成到提示词库列表中
          - 与配额服务连接，确定哪些卡片需要锁定
        
        acceptance_criteria:
          - 超出存储限制的提示词显示锁定状态
          - 锁定卡片有明确的视觉区分
          - 悬停时显示升级提示和按钮
          - 点击锁定卡片有适当反馈
          - 解锁过程清晰且直观
      
      task_c5: # 配额检查集成与错误处理
        description: 将配额检查集成到核心操作流程并完善错误处理
        work_items:
          - 在创建提示词前添加存储配额检查
          - 在执行优化前添加优化次数配额检查
          - 实现标准化的配额错误处理
          - 添加友好的错误提示和恢复建议
          - 设计配额相关操作的重试机制
        
        acceptance_criteria:
          - 创建超额提示词时有明确提示
          - 优化次数用尽时提示并引导升级
          - 错误提示友好且不中断工作流
          - 配额相关错误有统一处理方式
          - 在合适场景提供重试或替代方案
      
      phase_c_verification:
        scenario: "配额管理与限制体验验收"
        steps:
          - 初始状态为免费用户
          - 创建5条提示词(达到免费限制)
          - 尝试创建第6条提示词
          - 尝试使用超过3次优化
          - 测试会员降级场景
        expected:
          - 第6条提示词创建时显示配额横幅
          - 第4次优化时显示配额限制提示
          - 降级后超额内容正确处理为锁定状态
          - 所有限制场景有明确的升级引导
          - 免费用户仍能使用核心功能
    
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
      
      task_d4: # 会员中心功能完善
        description: 完善会员中心功能，提供更丰富的管理选项
        work_items:
          - 完善会员状态和特权展示
          - 添加使用统计信息展示
          - 实现订阅历史记录查看
          - 优化订阅管理选项
          - 添加常见问题解答部分
        
        acceptance_criteria:
          - 会员中心内容更完整和信息丰富
          - 能查看提示词和优化使用统计
          - 提供更全面的订阅管理选项
          - 常见问题部分可帮助解决典型问题
          - 整体用户体验流畅直观
      
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