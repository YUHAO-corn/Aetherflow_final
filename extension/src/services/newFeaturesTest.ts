/**
 * 提示词优化新功能测试文件
 * 这个文件用于测试长度控制和自动分类优化功能的效果
 */

import { optimizePrompt } from './optimizationService';

interface TestCase {
  name: string;
  input: string;
  category: 'question' | 'instruction' | 'creative' | 'analysis';
  expectedFeatures: string[];
  originalLength: number;
}

// 测试用例数组
const testCases: TestCase[] = [
  // 简短问题型提示词测试
  {
    name: '简短问题型提示词测试',
    input: '什么是量子计算',
    category: 'question',
    expectedFeatures: ['教授', '解释', '概念', '应用', '例子'],
    originalLength: 6
  },
  // 简短指令型提示词测试
  {
    name: '简短指令型提示词测试',
    input: '写一份简历',
    category: 'instruction',
    expectedFeatures: ['步骤', '格式', '标准', '专业'],
    originalLength: 5
  },
  // 简短创作型提示词测试
  {
    name: '简短创作型提示词测试',
    input: '写一个故事',
    category: 'creative',
    expectedFeatures: ['角色', '情节', '背景', '主题'],
    originalLength: 5
  },
  // 中等长度分析型提示词测试
  {
    name: '中等长度分析型提示词测试',
    input: '分析人工智能对未来就业市场的影响，包括可能被取代的工作和新创造的机会',
    category: 'analysis',
    expectedFeatures: ['分析', '框架', '数据', '趋势', '建议'],
    originalLength: 31
  },
  // 长篇提示词测试
  {
    name: '长篇提示词测试',
    input: '解释气候变化的成因、当前状况和未来趋势。包括温室气体排放、全球变暖机制、极端天气事件增加、海平面上升等现象。同时分析各国减排政策的有效性，以及个人可以采取的减少碳足迹的方法。最后讨论技术创新如何帮助解决气候危机，例如可再生能源、碳捕获技术和可持续农业实践等。',
    category: 'question',
    expectedFeatures: ['结构', '组织', '明确', '专业'],
    originalLength: 146
  }
];

/**
 * 运行测试用例
 */
async function runTests(): Promise<void> {
  console.log('=== 长度控制和自动分类优化功能测试开始 ===');
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    console.log(`输入: "${testCase.input}"`);
    console.log(`输入长度: ${testCase.originalLength} 字/词`);
    console.log(`预期类型: ${testCase.category}`);
    
    try {
      // 使用标准模式进行优化
      const optimized = await optimizePrompt(testCase.input, 'standard');
      console.log(`\n优化结果:\n${optimized}`);
      
      // 计算优化后长度
      const optimizedLength = optimized.length;
      console.log(`优化后长度: ${optimizedLength} 字符`);
      
      // 检查长度控制是否生效
      let lengthMultiple = optimizedLength / testCase.originalLength;
      console.log(`扩展倍数: ${lengthMultiple.toFixed(2)}x`);
      
      // 根据原始提示词长度检查长度控制
      if (testCase.originalLength < 20) {
        if (lengthMultiple >= 3 && lengthMultiple <= 5) {
          console.log('✅ 长度控制（短提示词）：3-5倍范围内');
        } else if (lengthMultiple < 3) {
          console.log('⚠️ 长度控制（短提示词）：扩展不足3倍');
        } else {
          console.log('⚠️ 长度控制（短提示词）：扩展超过5倍');
        }
      } else if (testCase.originalLength >= 20 && testCase.originalLength <= 100) {
        if (lengthMultiple >= 2 && lengthMultiple <= 3) {
          console.log('✅ 长度控制（中等提示词）：2-3倍范围内');
        } else if (lengthMultiple < 2) {
          console.log('⚠️ 长度控制（中等提示词）：扩展不足2倍');
        } else {
          console.log('⚠️ 长度控制（中等提示词）：扩展超过3倍');
        }
      } else {
        // 长提示词主要检查是否重点关注结构而非扩展内容
        if (lengthMultiple <= 2) {
          console.log('✅ 长度控制（长提示词）：适当控制了长度');
        } else {
          console.log('⚠️ 长度控制（长提示词）：扩展过多');
        }
      }
      
      // 检查是否包含预期的类型特定特征
      const containsExpectedFeatures = testCase.expectedFeatures.filter(feature => 
        optimized.toLowerCase().includes(feature.toLowerCase())
      );
      
      console.log(`包含预期特征: ${containsExpectedFeatures.length}/${testCase.expectedFeatures.length}`);
      if (containsExpectedFeatures.length / testCase.expectedFeatures.length >= 0.7) {
        console.log('✅ 自动分类：正确应用了类型特定优化策略');
      } else {
        console.log('⚠️ 自动分类：未充分应用类型特定优化策略');
      }
      
      // 根据类型检查特定元素
      switch (testCase.category) {
        case 'question':
          if (optimized.toLowerCase().includes('教授') || 
              optimized.toLowerCase().includes('专家') || 
              optimized.toLowerCase().includes('讲师')) {
            console.log('✅ 问题型提示词：添加了适当的教学角色');
          }
          break;
        case 'instruction':
          if (optimized.toLowerCase().includes('步骤') || 
              optimized.toLowerCase().includes('流程') || 
              optimized.toLowerCase().includes('方法')) {
            console.log('✅ 指令型提示词：添加了任务步骤/流程');
          }
          break;
        case 'creative':
          if (optimized.toLowerCase().includes('角色') || 
              optimized.toLowerCase().includes('情节') || 
              optimized.toLowerCase().includes('背景')) {
            console.log('✅ 创作型提示词：添加了创作元素');
          }
          break;
        case 'analysis':
          if (optimized.toLowerCase().includes('分析') || 
              optimized.toLowerCase().includes('评估') || 
              optimized.toLowerCase().includes('框架')) {
            console.log('✅ 分析型提示词：添加了分析框架/方法');
          }
          break;
      }
      
    } catch (error: any) {
      console.error(`测试失败: ${error.message}`);
    }
  }
  
  console.log('\n=== 长度控制和自动分类优化功能测试结束 ===');
}

// 导出测试函数
export { runTests };

// 运行测试
runTests().catch(e => console.error(e)); 