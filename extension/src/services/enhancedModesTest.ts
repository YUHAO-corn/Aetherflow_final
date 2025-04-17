import { optimizePrompt } from './optimizationService';

/**
 * 增强模式功能测试接口
 */
interface TestCase {
  name: string;
  input: string;
  mode: 'creative' | 'concise';
  expectedFeatures: string[];
  originalLength: number;
}

/**
 * 测试用例数组
 */
const testCases: TestCase[] = [
  // 简洁模式测试用例
  {
    name: "简洁模式-长提示词测试",
    input: `我需要一篇关于人工智能对就业市场影响的分析报告，内容应该包括以下几个方面：1. 人工智能技术的发展现状和趋势；2. 人工智能在不同行业的应用情况；3. 人工智能对传统就业岗位的替代效应；4. 人工智能创造的新型就业机会；5. 对未来工作者的技能要求变化；6. 政府、企业和个人应对这一变化的策略建议。报告需要客观、全面，同时要有一定的前瞻性，能够预测未来5-10年的可能发展方向。请尽量使用具体数据和案例来支持观点，确保分析的可信度。`,
    mode: 'concise',
    expectedFeatures: [
      "精华提取框架",
      "核心任务",
      "关键约束",
      "输出规范",
      "简洁表达"
    ],
    originalLength: 300
  },
  {
    name: "简洁模式-专业术语测试",
    input: "解释量子计算的基本原理和应用前景",
    mode: 'concise',
    expectedFeatures: [
      "精确专业术语",
      "结构化信息",
      "极简级或精要级"
    ],
    originalLength: 17
  },
  {
    name: "简洁模式-复杂任务测试",
    input: "如何设计一个机器学习系统来预测股票市场走势？需要考虑哪些因素和技术？",
    mode: 'concise',
    expectedFeatures: [
      "平衡级简洁度",
      "任务描述保留",
      "关键限制条件"
    ],
    originalLength: 35
  },

  // 创意模式测试用例
  {
    name: "创意模式-故事创作测试",
    input: "写一个关于月球殖民地的科幻故事",
    mode: 'creative',
    expectedFeatures: [
      "创意方向框架",
      "故事元素",
      "创意思维技巧"
    ],
    originalLength: 15
  },
  {
    name: "创意模式-设计任务测试",
    input: "设计一款未来的智能家居系统",
    mode: 'creative',
    expectedFeatures: [
      "联想型创意",
      "跨领域比喻",
      "用户情境"
    ],
    originalLength: 12
  },
  {
    name: "创意模式-概念开发测试",
    input: "提出一个解决城市交通拥堵的创新方案",
    mode: 'creative',
    expectedFeatures: [
      "转换型创意",
      "多维度评价框架",
      "创意平衡原则"
    ],
    originalLength: 18
  }
];

/**
 * 运行增强模式测试
 */
async function runTests(): Promise<void> {
  console.log("===== 开始增强模式功能测试 =====");
  
  for (const testCase of testCases) {
    console.log(`\n测试用例: ${testCase.name}`);
    
    try {
      // 获取优化后的提示词
      const optimized = await optimizePrompt(testCase.input, testCase.mode);
      console.log(`原始长度: ${testCase.originalLength} 字符`);
      console.log(`优化后长度: ${optimized.length} 字符`);
      
      // 检查预期特性是否存在
      const featureResults = testCase.expectedFeatures.map(feature => {
        const hasFeature = checkFeatureInOptimized(optimized, feature, testCase.mode);
        return { feature, hasFeature };
      });
      
      console.log("特性检查结果:");
      featureResults.forEach(({ feature, hasFeature }) => {
        console.log(`- ${feature}: ${hasFeature ? '✓ 通过' : '✗ 未通过'}`);
      });
      
      // 长度控制检查
      if (testCase.mode === 'concise') {
        checkConciseLengthControl(testCase.originalLength, optimized.length);
      } else if (testCase.mode === 'creative') {
        checkCreativeLengthControl(testCase.originalLength, optimized.length, optimized);
      }
      
      // 结构检查
      checkStructure(optimized, testCase.mode);
      
    } catch (error: any) {
      console.error(`测试失败: ${error.message}`);
    }
  }
  
  console.log("\n===== 增强模式功能测试完成 =====");
}

/**
 * 检查优化结果中是否包含特定特性
 */
function checkFeatureInOptimized(optimized: string, feature: string, mode: 'creative' | 'concise'): boolean {
  const lowerOptimized = optimized.toLowerCase();
  
  // 基于特性类型检查不同的模式
  switch (feature) {
    // 简洁模式特性
    case "精华提取框架":
      return (
        (lowerOptimized.includes("核心任务") || lowerOptimized.includes("关键要求")) &&
        (lowerOptimized.includes("约束") || lowerOptimized.includes("限制"))
      );
    case "核心任务":
      return lowerOptimized.includes("任务") || lowerOptimized.includes("目标") || lowerOptimized.includes("分析");
    case "关键约束":
      return lowerOptimized.includes("要求") || lowerOptimized.includes("限制") || lowerOptimized.includes("条件");
    case "输出规范":
      return lowerOptimized.includes("格式") || lowerOptimized.includes("结构") || lowerOptimized.includes("输出");
    case "精确专业术语":
      if (lowerOptimized.includes("量子")) {
        return lowerOptimized.includes("叠加") || lowerOptimized.includes("纠缠") || lowerOptimized.includes("量子比特");
      } else if (lowerOptimized.includes("机器学习")) {
        return lowerOptimized.includes("算法") || lowerOptimized.includes("模型") || lowerOptimized.includes("特征");
      }
      return false;
    case "结构化信息":
      return optimized.includes("- ") || optimized.includes("1. ") || optimized.includes("• ");
    case "极简级或精要级":
      return optimized.length < testCases[1].originalLength * 3;
    case "平衡级简洁度":
      return optimized.includes("：") || optimized.includes(":") || (optimized.split("\n").length > 3);
    case "任务描述保留":
      return lowerOptimized.includes("机器学习") && lowerOptimized.includes("股票");
    case "简洁表达":
      return !lowerOptimized.includes("您可以") && !lowerOptimized.includes("我认为") && !lowerOptimized.includes("如您所知");
      
    // 创意模式特性
    case "创意方向框架":
      return (
        lowerOptimized.includes("发散") || lowerOptimized.includes("联想") || 
        lowerOptimized.includes("转换") || lowerOptimized.includes("深化") ||
        lowerOptimized.includes("方向")
      );
    case "故事元素":
      return (
        (lowerOptimized.includes("角色") || lowerOptimized.includes("人物")) &&
        (lowerOptimized.includes("背景") || lowerOptimized.includes("设定")) &&
        (lowerOptimized.includes("冲突") || lowerOptimized.includes("问题"))
      );
    case "创意思维技巧":
      return (
        lowerOptimized.includes("思考") || lowerOptimized.includes("比喻") || 
        lowerOptimized.includes("角度") || lowerOptimized.includes("视角")
      );
    case "联想型创意":
      return lowerOptimized.includes("联想") || lowerOptimized.includes("比喻") || lowerOptimized.includes("隐喻");
    case "跨领域比喻":
      return (
        (lowerOptimized.includes("像") || lowerOptimized.includes("如同")) &&
        (lowerOptimized.includes("自然") || lowerOptimized.includes("生物") || lowerOptimized.includes("艺术"))
      );
    case "用户情境":
      return lowerOptimized.includes("用户") || lowerOptimized.includes("使用场景") || lowerOptimized.includes("体验");
    case "转换型创意":
      return lowerOptimized.includes("转换") || lowerOptimized.includes("视角") || lowerOptimized.includes("重新思考");
    case "多维度评价框架":
      return (
        (lowerOptimized.includes("评估") || lowerOptimized.includes("评价")) &&
        (lowerOptimized.includes("维度") || lowerOptimized.includes("标准") || lowerOptimized.includes("指标"))
      );
    case "创意平衡原则":
      return (
        (lowerOptimized.includes("平衡") || lowerOptimized.includes("兼顾")) &&
        (lowerOptimized.includes("实用") || lowerOptimized.includes("可行") || lowerOptimized.includes("创新"))
      );
    default:
      return false;
  }
}

/**
 * 检查简洁模式的长度控制
 */
function checkConciseLengthControl(originalLength: number, optimizedLength: number): void {
  // 简洁模式应在100-300字之间
  if (optimizedLength >= 100 && optimizedLength <= 300) {
    console.log(`长度控制: ✓ 简洁模式长度(${optimizedLength}字)在理想范围内(100-300字)`);
  } else if (optimizedLength < 100) {
    console.log(`长度控制: ✗ 简洁模式长度(${optimizedLength}字)低于理想范围(100-300字)`);
  } else {
    console.log(`长度控制: ✗ 简洁模式长度(${optimizedLength}字)超出理想范围(100-300字)`);
  }
}

/**
 * 检查创意模式的长度控制
 */
function checkCreativeLengthControl(originalLength: number, optimizedLength: number, optimized: string): void {
  // 创意模式应在300-800字之间
  if (optimizedLength >= 300 && optimizedLength <= 800) {
    console.log(`长度控制: ✓ 创意模式长度(${optimizedLength}字)在理想范围内(300-800字)`);
  } else if (optimizedLength < 300) {
    console.log(`长度控制: ✗ 创意模式长度(${optimizedLength}字)低于理想范围(300-800字)`);
  } else {
    console.log(`长度控制: ✗ 创意模式长度(${optimizedLength}字)超出理想范围(300-800字)`);
  }
  
  // 检查创意模式的结构
  const hasCreativeDirection = optimized.includes("【创意方向】");
  const hasThinkingTechnique = optimized.includes("【思维技巧】");
  
  if (hasCreativeDirection && hasThinkingTechnique) {
    console.log("创意标记: ✓ 包含必要的创意方向和思维技巧标记");
  } else {
    if (!hasCreativeDirection) {
      console.log("创意标记: ✗ 缺少【创意方向】标记");
    }
    if (!hasThinkingTechnique) {
      console.log("创意标记: ✗ 缺少【思维技巧】标记");
    }
  }
}

/**
 * 检查优化结果的结构
 */
function checkStructure(optimized: string, mode: 'creative' | 'concise'): void {
  const lines = optimized.split("\n");
  const hasHeadings = lines.some(line => line.includes("【") && line.includes("】"));
  const hasBulletPoints = lines.some(line => line.trim().startsWith("-") || line.trim().startsWith("•"));
  const hasNumberedList = lines.some(line => /^\d+\./.test(line.trim()));
  
  if (mode === 'creative') {
    if ((hasHeadings || hasBulletPoints || hasNumberedList) && lines.length > 5) {
      console.log("结构检查: ✓ 创意模式结构良好");
    } else {
      console.log("结构检查: ✗ 创意模式结构不够丰富");
    }
  } else {
    if (hasBulletPoints || hasNumberedList) {
      console.log("结构检查: ✓ 简洁模式使用了高效结构");
    } else {
      console.log("结构检查: ✗ 简洁模式结构可以更高效");
    }
  }
}

// 如果直接运行此文件，则执行测试
runTests().catch(e => console.error(e)); 