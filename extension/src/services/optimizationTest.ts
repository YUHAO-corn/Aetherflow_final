/**
 * 提示词优化测试文件
 * 这个文件用于测试CRISPE框架的效果
 */

import { optimizePrompt } from './optimizationService';

// 测试用例数组
const testCases = [
  {
    name: '简单问题优化测试',
    input: '介绍人工智能',
    expectedElements: ['角色', '要求', '意图', '标准', '风格'], // 检查是否包含CRISPE框架的元素
  },
  {
    name: '技术问题优化测试',
    input: '如何设计微服务架构',
    expectedElements: ['架构师', '设计', '原则', '组件', '考虑因素'], // 技术领域关键词
  },
  {
    name: '创意问题优化测试',
    input: '写一个故事',
    expectedElements: ['情节', '人物', '背景', '主题', '风格'], // 创意写作关键词
  },
];

/**
 * 运行测试用例
 */
async function runTests(): Promise<void> {
  console.log('=== CRISPE框架优化测试开始 ===');
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    console.log(`输入: "${testCase.input}"`);
    
    try {
      // 使用标准模式进行优化
      const optimized = await optimizePrompt(testCase.input, 'standard');
      console.log(`\n优化结果:\n${optimized}`);
      
      // 检查是否包含预期的元素
      const containsExpectedElements = testCase.expectedElements.some(element => 
        optimized.toLowerCase().includes(element.toLowerCase())
      );
      
      if (containsExpectedElements) {
        console.log('✅ 包含预期元素');
      } else {
        console.log('❌ 未找到预期元素');
      }
      
      // 检查结果长度是否合理
      if (optimized.length > testCase.input.length * 2) {
        console.log('✅ 内容丰富度合格');
      } else {
        console.log('⚠️ 内容可能不够丰富');
      }
      
      // 使用简单的启发式方法检查结构是否良好
      const hasParagraphs = optimized.split('\n\n').length > 1;
      const hasList = optimized.includes('- ') || /\d+\./.test(optimized);
      
      if (hasParagraphs && hasList) {
        console.log('✅ 结构良好');
      } else {
        console.log('⚠️ 结构可能需要改进');
      }
      
    } catch (error: any) {
      console.error(`测试失败: ${error.message}`);
    }
  }
  
  console.log('\n=== CRISPE框架优化测试结束 ===');
}

// 导出测试函数
export { runTests };

// 简化运行测试的方法，以避免Node.js特定的代码
runTests().catch(e => console.error(e)); 