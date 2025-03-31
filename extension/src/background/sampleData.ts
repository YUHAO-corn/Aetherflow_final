import { storageService } from '../services/storage';
import { Prompt } from '../services/prompt/types';
import { v4 as uuidv4 } from 'uuid';

// 初始示例提示词数据
const samplePrompts: Omit<Prompt, 'id'>[] = [
  {
    title: '如何高效学习',
    content: `# 如何高效学习

## 背景与目标
请提供一套系统化的高效学习策略，帮助提升知识获取、记忆保持和应用能力。

## 具体要求
1. **学习前准备**
   - 如何设定明确的学习目标
   - 环境优化建议
   - 时间管理技巧

2. **核心学习技巧**
   - 主动学习方法
   - 信息处理策略
   - 注意力管理

3. **记忆与巩固**
   - 有效的记忆技巧
   - 间隔重复系统
   - 知识应用方法

4. **评估与调整**
   - 学习效果评估指标
   - 常见问题解决方案
   - 个性化调整建议

## 输出要求
- 采用分步骤的清晰结构
- 包含科学依据和实用技巧
- 提供具体可操作的示例
- 适合不同学习场景的变通方案
- 语言简洁明了，避免学术术语堆砌`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 50000,
    useCount: 15,
    lastUsed: Date.now() - 10000,
    tags: ['学习', '效率', '方法论'],
    source: 'predefined',
    category: '学习方法',
    isActive: true
  },
  {
    title: '科学有效的身材管理',
    content: `# 如何科学有效地身材管理

## 核心目标
**通过系统化的方法实现健康、可持续的身材管理**，包括体重控制、体型塑造和整体健康提升。

## 关键要素

### 1. 营养管理
- **均衡饮食**：采用多样化膳食结构，确保三大营养素合理配比
- **热量控制**：根据目标（减脂/增肌/维持）制定合理的热量摄入计划
- **饮食质量**：优先选择天然、未加工食品，控制精制糖和反式脂肪摄入

### 2. 运动方案
- **有氧运动**：每周3-5次，每次30-60分钟（如跑步、游泳、骑行）
- **力量训练**：每周2-3次全身性抗阻训练
- **灵活性训练**：每周2-3次拉伸或瑜伽练习

### 3. 生活习惯
- **睡眠管理**：保证7-9小时优质睡眠
- **压力调节**：通过冥想、深呼吸等方式管理压力水平
- **水分摄入**：每日保持1.5-2升水摄入量

## 监测与调整
- 定期测量体脂率、围度等关键指标
- 建立饮食和运动记录系统
- 每4-6周评估进展并调整方案

## 注意事项
- 避免极端节食或过度运动
- 设定现实可行的阶段性目标
- 必要时寻求专业营养师或健身教练指导

**期望输出**：请提供一份为期4周的个性化身材管理计划，包含具体的饮食建议、运动安排和生活习惯调整方案，要求内容科学、可执行且符合健康原则。`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 900000,
    updatedAt: Date.now() - 80000,
    useCount: 8,
    lastUsed: Date.now() - 40000,
    tags: ['健康', '运动', '饮食'],
    source: 'predefined',
    category: '健康管理',
    isActive: true
  },
  {
    title: '心情调节指南',
    content: `# 我的心情不好怎么办？

请提供一份**全面且结构化**的情绪调节指南，包含以下要素：

1. **即时情绪调节技巧**
   - 快速缓解负面情绪的身体调节方法
   - 认知重构的实用步骤
   - 环境调整建议

2. **中长期情绪管理策略**
   - 日常情绪维护习惯
   - 预防性情绪调节方法
   - 建立情绪韧性的训练方案

3. **专业支持建议**
   - 何时需要寻求专业帮助的判断标准
   - 心理咨询/治疗的选择指南
   - 自助资源的可靠推荐

**输出要求**：
- 按上述结构分章节呈现
- 每项建议需说明科学依据
- 包含具体可操作步骤
- 使用通俗易懂的语言
- 避免笼统建议，提供细节说明`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 700000,
    updatedAt: Date.now() - 70000,
    useCount: 12,
    lastUsed: Date.now() - 20000,
    tags: ['心理', '情绪', '健康'],
    source: 'predefined',
    category: '心理健康',
    isActive: true
  },
  {
    title: '前端模板集成指南',
    content: `# 如何以前端为模版实现集成
请基于以下要求，详细说明如何将前端界面设计和模块作为模板实现全流程跑通：

**背景信息：**
- 前端界面设计和功能模块已通过验收
- 需要以现有前端为基准进行全流程开发

**具体要求：**
1. **技术实现方案**：
   - 说明如何将前端设计转化为可复用的模板
   - 详细描述接口对接的具体方法
   - 列出必要的技术栈和工具链

2. **流程跑通步骤**：
   - 分阶段说明从模板到实际运行的完整流程
   - 每个阶段的关键节点和验收标准
   - 可能遇到的技术难点及解决方案

3. **质量保证措施**：
   - 如何确保前后端数据一致性
   - 性能优化和异常处理方案
   - 测试策略和验证方法

**输出要求：**
- 采用分步骤的详细说明格式
- 包含必要的技术细节但不失可读性
- 重点突出从设计到实现的转换过程
- 提供可量化的评估指标`,
    isFavorite: true,
    favorite: true,
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 30000,
    useCount: 5,
    lastUsed: Date.now() - 15000,
    tags: ['前端', '开发', '集成'],
    source: 'predefined',
    category: '技术开发',
    isActive: true
  }
];

/**
 * 初始化示例提示词数据
 * 用于新安装或无数据时
 */
export async function initializeSampleData(): Promise<void> {
  try {
    console.log('[SampleData] 开始初始化示例提示词数据...');
    
    // 批量保存示例提示词
    for (const samplePrompt of samplePrompts) {
      const prompt: Prompt = {
        ...samplePrompt,
        id: uuidv4() // 生成唯一ID
      };
      
      await storageService.savePrompt(prompt);
    }
    
    console.log('[SampleData] 示例提示词数据初始化完成');
  } catch (error) {
    console.error('[SampleData] 初始化示例数据失败:', error);
    throw error;
  }
} 