import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibraryTab } from './LibraryTab';
import { AppProvider } from '../../hooks/AppContext';
import { syncStorage } from '../../services/storage';

// 模拟依赖
jest.mock('../../services/storage', () => ({
  syncStorage: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Heart: () => <div data-testid="heart-icon" />
}));

describe('LibraryTab集成测试', () => {
  // 每个测试前重置模拟
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 模拟提示词数据
    const mockPrompts = [
      {
        id: 'test-id-1',
        title: '提示词1',
        content: '这是测试提示词内容1',
        favorite: true,
        useCount: 5
      },
      {
        id: 'test-id-2',
        title: '提示词2',
        content: '这是测试提示词内容2',
        favorite: false,
        useCount: 2
      }
    ];
    
    (syncStorage.get as jest.Mock).mockResolvedValue(mockPrompts);
  });
  
  test('渲染提示词列表', async () => {
    // 渲染组件，包裹在AppProvider中
    render(
      <AppProvider>
        <LibraryTab />
      </AppProvider>
    );
    
    // 初始显示加载状态
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    
    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
    
    // 验证提示词渲染
    expect(screen.getByText('提示词1')).toBeInTheDocument();
    expect(screen.getByText('提示词2')).toBeInTheDocument();
    expect(screen.getByText('这是测试提示词内容1')).toBeInTheDocument();
    expect(screen.getByText('这是测试提示词内容2')).toBeInTheDocument();
  });
  
  test('搜索提示词功能', async () => {
    render(
      <AppProvider>
        <LibraryTab />
      </AppProvider>
    );
    
    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
    
    // 执行搜索
    const searchInput = screen.getByPlaceholderText('搜索提示词...');
    fireEvent.change(searchInput, { target: { value: '提示词1' } });
    
    // 模拟搜索结果
    (syncStorage.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve([
        {
          id: 'test-id-1',
          title: '提示词1',
          content: '这是测试提示词内容1',
          favorite: true,
          useCount: 5
        }
      ]);
    });
    
    // 等待搜索结果更新
    await waitFor(() => {
      expect(screen.queryByText('提示词2')).not.toBeInTheDocument();
    });
    
    // 验证搜索结果
    expect(screen.getByText('提示词1')).toBeInTheDocument();
    expect(screen.queryByText('提示词2')).not.toBeInTheDocument();
  });
}); 