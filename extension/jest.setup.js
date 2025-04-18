/* global jest, expect, beforeEach */

// 添加 Jest-DOM 扩展断言
require('@testing-library/jest-dom');

// 全局声明 jest 变量
global.jest = jest;
global.expect = expect;

// 模拟 chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
};

// 清除所有模拟调用
beforeEach(() => {
  jest.clearAllMocks();
}); 