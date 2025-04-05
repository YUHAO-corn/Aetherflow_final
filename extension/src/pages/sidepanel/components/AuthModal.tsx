import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { AuthStatus } from '../../../services/auth';

// 导入公共组件
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';

// 表单模式类型
type AuthMode = 'login' | 'register' | 'resetPassword';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 认证模态框组件
 */
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // 表单模式
  const [mode, setMode] = useState<AuthMode>('login');
  
  // 表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 验证状态
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // 表单消息
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState<'success' | 'error'>('error');
  
  // 获取认证钩子
  const { login, register, loginWithGoogle, resetPassword, status, error, clearError } = useAuth();
  
  // 判断是否处于加载状态
  const isLoading = status === AuthStatus.LOADING;
  
  // 清除表单错误
  const clearFormErrors = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormMessage('');
    clearError();
  };
  
  // 切换模式
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    clearFormErrors();
  };
  
  // 验证表单
  const validateForm = (): boolean => {
    let isValid = true;
    clearFormErrors();
    
    // 验证邮箱
    if (!email) {
      setEmailError('请输入邮箱');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('请输入有效的邮箱地址');
      isValid = false;
    }
    
    // 仅在登录和注册模式下验证密码
    if (mode !== 'resetPassword') {
      if (!password) {
        setPasswordError('请输入密码');
        isValid = false;
      } else if (password.length < 6) {
        setPasswordError('密码长度至少6个字符');
        isValid = false;
      }
      
      // 在注册模式下验证确认密码
      if (mode === 'register') {
        if (!confirmPassword) {
          setConfirmPasswordError('请确认密码');
          isValid = false;
        } else if (password !== confirmPassword) {
          setConfirmPasswordError('两次输入的密码不一致');
          isValid = false;
        }
      }
    }
    
    return isValid;
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(email, password);
        onClose();
      } else if (mode === 'resetPassword') {
        await resetPassword(email);
        setFormMessage('重置密码链接已发送到您的邮箱');
        setFormMessageType('success');
      }
    } catch (err) {
      // 错误已在 useAuth 中处理并显示
    }
  };
  
  // 处理谷歌登录
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      // 错误已在 useAuth 中处理并显示
    }
  };
  
  // 渲染模态框标题
  const renderTitle = () => {
    switch (mode) {
      case 'login':
        return '登录';
      case 'register':
        return '注册';
      case 'resetPassword':
        return '重置密码';
    }
  };
  
  // 自定义模态框内容
  const modalContent = (
    <div className="p-6">
      {/* 错误消息 */}
      {(error || formMessage) && (
        <div className={`mb-4 p-3 rounded ${formMessageType === 'error' || error ? 'bg-red-900/30 text-red-200' : 'bg-green-900/30 text-green-200'}`}>
          <div className="flex items-start">
            <AlertCircle size={18} className="mr-2 mt-0.5" />
            <span>{error || formMessage}</span>
          </div>
        </div>
      )}
      
      {/* 表单 */}
      <form onSubmit={handleSubmit}>
        {/* 邮箱输入框 */}
        <div className="mb-4">
          <label className="block text-magic-300 mb-1 text-sm">邮箱</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoading}
            error={emailError}
            icon={<Mail size={18} className="text-magic-400" />}
          />
        </div>
        
        {/* 密码输入框 (登录和注册模式) */}
        {mode !== 'resetPassword' && (
          <div className="mb-4">
            <label className="block text-magic-300 mb-1 text-sm">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              disabled={isLoading}
              error={passwordError}
              icon={<Lock size={18} className="text-magic-400" />}
            />
          </div>
        )}
        
        {/* 确认密码输入框 (仅注册模式) */}
        {mode === 'register' && (
          <div className="mb-4">
            <label className="block text-magic-300 mb-1 text-sm">确认密码</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              disabled={isLoading}
              error={confirmPasswordError}
              icon={<Lock size={18} className="text-magic-400" />}
            />
          </div>
        )}
        
        {/* 提交按钮 */}
        <div className="mt-6">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            icon={
              mode === 'login' 
                ? <LogIn size={18} /> 
                : mode === 'register' 
                  ? <UserPlus size={18} /> 
                  : <Mail size={18} />
            }
          >
            {mode === 'login' 
              ? '登录' 
              : mode === 'register' 
                ? '注册' 
                : '发送重置链接'}
          </Button>
        </div>
        
        {/* Google 登录按钮 (仅登录和注册模式) */}
        {mode !== 'resetPassword' && (
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isLoading}
              icon={
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              }
              onClick={handleGoogleLogin}
            >
              使用 Google 账号{mode === 'login' ? '登录' : '注册'}
            </Button>
          </div>
        )}
        
        {/* 模式切换链接 */}
        <div className="mt-4 text-center text-sm">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => handleModeChange('resetPassword')}
                className="text-blue-400 hover:text-blue-300 underline focus:outline-none"
                disabled={isLoading}
              >
                忘记密码？
              </button>
              <span className="mx-2 text-magic-400">|</span>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className="text-blue-400 hover:text-blue-300 underline focus:outline-none"
                disabled={isLoading}
              >
                创建新账号
              </button>
            </>
          )}
          
          {mode === 'register' && (
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="text-blue-400 hover:text-blue-300 underline focus:outline-none"
              disabled={isLoading}
            >
              已有账号？登录
            </button>
          )}
          
          {mode === 'resetPassword' && (
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="text-blue-400 hover:text-blue-300 underline focus:outline-none"
              disabled={isLoading}
            >
              返回登录
            </button>
          )}
        </div>
      </form>
    </div>
  );
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={renderTitle()}
      className="max-w-md"
    >
      {modalContent}
    </Modal>
  );
} 