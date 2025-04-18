import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// 扩展全局 Jest 类型
declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any> {
      mockReturnValue: (value: T) => Mock<T, Y>;
      mockResolvedValue: (value: T) => Mock<Promise<T>, Y>;
      mockRejectedValue: (value: any) => Mock<Promise<T>, Y>;
      mockImplementation: (fn: (...args: Y) => T) => Mock<T, Y>;
    }
  }
}

// 设置默认的测试超时时间
jest.setTimeout(10000); 