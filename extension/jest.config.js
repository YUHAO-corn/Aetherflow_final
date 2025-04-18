module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // 处理CSS文件
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 处理图片和其他静态文件
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/background/**/*',
    '!src/content/**/*',
    '!src/assets/**/*',
  ],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 30,
      functions: 40,
      lines: 40,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}; 