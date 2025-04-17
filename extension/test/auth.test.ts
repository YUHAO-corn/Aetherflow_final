import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// 模拟 Firebase Auth
jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  
  return {
    __esModule: true,
    ...originalModule,
    getAuth: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    signInWithPopup: jest.fn(),
    onAuthStateChanged: jest.fn(),
    updateProfile: jest.fn(),
  };
});

// 导入相关服务和组件（实际路径可能需要修改）
import { authService } from '../src/services/auth';
import { UserStatus } from '../src/components/UserStatus';
import { LoginForm } from '../src/components/LoginForm';
import { RegisterForm } from '../src/components/RegisterForm';

describe('认证功能测试', () => {
  beforeEach(() => {
    // 清除所有模拟调用
    jest.clearAllMocks();
  });
  
  // 1. 用户注册测试
  describe('用户注册', () => {
    test('注册表单提交 - 成功场景', async () => {
      const createUserMock = require('firebase/auth').createUserWithEmailAndPassword;
      createUserMock.mockResolvedValue({ 
        user: { uid: 'test-uid', email: 'test@example.com' }
      });
      
      // 渲染注册表单组件（假设存在这样的组件）
      render(<RegisterForm />);
      
      // 填写表单字段
      fireEvent.change(screen.getByLabelText(/电子邮件/i), {
        target: { value: 'test@example.com' },
      });
      
      fireEvent.change(screen.getByLabelText(/密码/i), {
        target: { value: 'Password123' },
      });
      
      fireEvent.change(screen.getByLabelText(/确认密码/i), {
        target: { value: 'Password123' },
      });
      
      // 确认同意隐私政策
      fireEvent.click(screen.getByRole('checkbox', { name: /隐私政策/i }));
      
      // 点击注册按钮
      fireEvent.click(screen.getByRole('button', { name: /注册/i }));
      
      // 验证注册函数被调用
      await waitFor(() => {
        expect(createUserMock).toHaveBeenCalledWith(
          expect.anything(),
          'test@example.com',
          'Password123'
        );
      });
      
      // 验证成功消息显示
      expect(await screen.findByText(/注册成功/i)).toBeInTheDocument();
    });
    
    test('注册表单提交 - 验证错误', async () => {
      // 渲染注册表单组件
      render(<RegisterForm />);
      
      // 仅填写无效的电子邮件
      fireEvent.change(screen.getByLabelText(/电子邮件/i), {
        target: { value: 'invalid-email' },
      });
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /注册/i }));
      
      // 验证显示验证错误
      expect(await screen.findByText(/请输入有效的电子邮件地址/i)).toBeInTheDocument();
      
      // 验证未调用创建用户函数
      const createUserMock = require('firebase/auth').createUserWithEmailAndPassword;
      expect(createUserMock).not.toHaveBeenCalled();
    });
    
    test('注册表单提交 - Firebase错误处理', async () => {
      // 模拟Firebase抛出错误
      const createUserMock = require('firebase/auth').createUserWithEmailAndPassword;
      createUserMock.mockRejectedValue({ 
        code: 'auth/email-already-in-use',
        message: 'Email already in use'
      });
      
      // 渲染注册表单
      render(<RegisterForm />);
      
      // 填写有效信息
      fireEvent.change(screen.getByLabelText(/电子邮件/i), {
        target: { value: 'test@example.com' },
      });
      
      fireEvent.change(screen.getByLabelText(/密码/i), {
        target: { value: 'Password123' },
      });
      
      fireEvent.change(screen.getByLabelText(/确认密码/i), {
        target: { value: 'Password123' },
      });
      
      // 确认同意隐私政策
      fireEvent.click(screen.getByRole('checkbox', { name: /隐私政策/i }));
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /注册/i }));
      
      // 验证错误消息显示
      expect(await screen.findByText(/该邮箱已被注册/i)).toBeInTheDocument();
    });
  });
  
  // 2. 用户登录测试
  describe('用户登录', () => {
    test('登录表单提交 - 成功场景', async () => {
      const signInMock = require('firebase/auth').signInWithEmailAndPassword;
      signInMock.mockResolvedValue({ 
        user: { uid: 'test-uid', email: 'test@example.com' }
      });
      
      // 渲染登录表单组件
      render(<LoginForm />);
      
      // 填写登录信息
      fireEvent.change(screen.getByLabelText(/电子邮件/i), {
        target: { value: 'test@example.com' },
      });
      
      fireEvent.change(screen.getByLabelText(/密码/i), {
        target: { value: 'Password123' },
      });
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /登录/i }));
      
      // 验证登录函数被调用
      await waitFor(() => {
        expect(signInMock).toHaveBeenCalledWith(
          expect.anything(),
          'test@example.com',
          'Password123'
        );
      });
      
      // 验证登录成功
      expect(await screen.findByText(/登录成功/i)).toBeInTheDocument();
    });
    
    test('登录表单提交 - 密码错误', async () => {
      const signInMock = require('firebase/auth').signInWithEmailAndPassword;
      signInMock.mockRejectedValue({ 
        code: 'auth/wrong-password',
        message: 'Wrong password'
      });
      
      // 渲染登录表单
      render(<LoginForm />);
      
      // 填写登录信息
      fireEvent.change(screen.getByLabelText(/电子邮件/i), {
        target: { value: 'test@example.com' },
      });
      
      fireEvent.change(screen.getByLabelText(/密码/i), {
        target: { value: 'WrongPassword' },
      });
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /登录/i }));
      
      // 验证错误消息显示
      expect(await screen.findByText(/密码错误/i)).toBeInTheDocument();
    });
    
    test('Google登录按钮', async () => {
      const signInWithPopupMock = require('firebase/auth').signInWithPopup;
      signInWithPopupMock.mockResolvedValue({ 
        user: { uid: 'google-uid', email: 'google@example.com' }
      });
      
      // 渲染登录表单
      render(<LoginForm />);
      
      // 点击Google登录按钮
      fireEvent.click(screen.getByRole('button', { name: /用Google账号登录/i }));
      
      // 验证Google登录函数被调用
      await waitFor(() => {
        expect(signInWithPopupMock).toHaveBeenCalled();
      });
    });
  });
  
  // 3. 认证状态管理测试
  describe('认证状态管理', () => {
    test('认证状态监听器', () => {
      const onAuthStateChangedMock = require('firebase/auth').onAuthStateChanged;
      const mockCallback = jest.fn();
      
      // 直接调用服务方法进行测试
      authService.onAuthStateChanged(mockCallback);
      
      // 验证监听器设置
      expect(onAuthStateChangedMock).toHaveBeenCalled();
      
      // 模拟触发认证状态变化
      const authStateCallback = onAuthStateChangedMock.mock.calls[0][1];
      const mockUserData = { uid: 'test-uid', email: 'test@example.com' };
      authStateCallback(mockUserData);
      
      // 验证回调被触发
      expect(mockCallback).toHaveBeenCalledWith(mockUserData);
    });
    
    test('用户状态组件显示 - 已登录状态', () => {
      // 模拟用户已登录
      const onAuthStateChangedMock = require('firebase/auth').onAuthStateChanged;
      onAuthStateChangedMock.mockImplementation((auth, callback) => {
        callback({ uid: 'test-uid', email: 'test@example.com', displayName: 'Test User' });
        return jest.fn(); // 返回模拟的unsubscribe函数
      });
      
      // 渲染用户状态组件
      render(<UserStatus />);
      
      // 验证显示用户头像或姓名
      expect(screen.getByText(/Test User/i)).toBeInTheDocument();
      // 或验证显示用户头像
      // expect(screen.getByAltText(/user avatar/i)).toBeInTheDocument();
    });
    
    test('用户状态组件显示 - 未登录状态', () => {
      // 模拟用户未登录
      const onAuthStateChangedMock = require('firebase/auth').onAuthStateChanged;
      onAuthStateChangedMock.mockImplementation((auth, callback) => {
        callback(null);
        return jest.fn(); // 返回模拟的unsubscribe函数
      });
      
      // 渲染用户状态组件
      render(<UserStatus />);
      
      // 验证显示登录按钮
      expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
    });
    
    test('登出功能', async () => {
      const signOutMock = require('firebase/auth').signOut;
      signOutMock.mockResolvedValue(undefined);
      
      // 模拟用户已登录
      const onAuthStateChangedMock = require('firebase/auth').onAuthStateChanged;
      onAuthStateChangedMock.mockImplementation((auth, callback) => {
        callback({ uid: 'test-uid', email: 'test@example.com', displayName: 'Test User' });
        return jest.fn();
      });
      
      // 渲染用户状态组件
      render(<UserStatus />);
      
      // 打开用户菜单并点击登出
      fireEvent.click(screen.getByText(/Test User/i));
      fireEvent.click(screen.getByText(/退出登录/i));
      
      // 验证登出函数被调用
      await waitFor(() => {
        expect(signOutMock).toHaveBeenCalled();
      });
    });
  });
}); 