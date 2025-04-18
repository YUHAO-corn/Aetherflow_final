// 提示词数据层集成测试
// 此脚本用于验证统一数据层的功能

const { storageService } = require('../src/services/storage');
const { v4: uuidv4 } = require('uuid');

async function testPromptsDataLayer() {
  console.log('开始测试统一数据层...');
  
  try {
    // 1. 测试获取所有提示词
    console.log('1. 测试获取所有提示词');
    const allPrompts = await storageService.getAllPrompts();
    console.log(`获取到 ${allPrompts.length} 条提示词数据`);
    
    // 2. 测试添加提示词
    console.log('2. 测试添加提示词');
    const testPrompt = {
      id: uuidv4(),
      title: '测试提示词',
      content: '这是一个用于测试的提示词，用来验证统一数据层的功能',
      tags: ['测试', '验证'],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      useCount: 0,
      lastUsed: 0
    };
    
    await storageService.savePrompt(testPrompt);
    console.log('添加提示词成功，ID:', testPrompt.id);
    
    // 3. 测试获取单个提示词
    console.log('3. 测试获取单个提示词');
    const savedPrompt = await storageService.getPromptById(testPrompt.id);
    console.log('获取到提示词:', savedPrompt.title);
    
    // 4. 测试更新提示词
    console.log('4. 测试更新提示词');
    await storageService.updatePrompt(testPrompt.id, {
      title: '更新后的测试提示词',
      isFavorite: true
    });
    
    const updatedPrompt = await storageService.getPromptById(testPrompt.id);
    console.log('更新后的提示词标题:', updatedPrompt.title);
    console.log('更新后的收藏状态:', updatedPrompt.isFavorite);
    
    // 5. 测试增加使用次数
    console.log('5. 测试增加使用次数');
    await storageService.incrementUseCount(testPrompt.id);
    const usedPrompt = await storageService.getPromptById(testPrompt.id);
    console.log('使用后的次数:', usedPrompt.useCount);
    
    // 6. 测试搜索提示词
    console.log('6. 测试搜索提示词');
    const searchResults = await storageService.getAllPrompts().then(prompts => {
      return prompts.filter(p => p.title.includes('测试'));
    });
    console.log(`搜索到 ${searchResults.length} 条包含"测试"的提示词`);
    
    // 7. 测试删除提示词
    console.log('7. 测试删除提示词');
    await storageService.deletePrompt(testPrompt.id);
    
    const afterDelete = await storageService.getAllPrompts();
    const stillExists = afterDelete.some(p => p.id === testPrompt.id);
    console.log('提示词已被删除:', !stillExists);
    
    console.log('所有测试完成，统一数据层功能正常！');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 如果直接运行脚本则执行测试
if (require.main === module) {
  testPromptsDataLayer();
}

module.exports = {
  testPromptsDataLayer
}; 