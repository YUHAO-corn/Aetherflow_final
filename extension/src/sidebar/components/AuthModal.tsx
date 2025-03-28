import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement authentication logic
    console.log('Auth submitted:', { email, password, username });
  };

  return (
    <div className="fixed inset-0 bg-magic-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-magic-800 to-magic-900 rounded-lg w-full max-w-md shadow-xl border border-magic-700/30">
        <div className="flex items-center justify-between p-4 border-b border-magic-700/30">
          <h3 className="text-lg font-semibold text-magic-200">{isLogin ? '登录' : '注册'}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-magic-700/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-magic-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-magic-400" />
              <input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-magic-400" />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-magic-400" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-magic-600 text-white rounded-lg text-sm font-medium hover:bg-magic-500 transition-colors flex items-center justify-center space-x-2 group"
          >
            <span>{isLogin ? '登录' : '注册'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-magic-400 hover:text-magic-300 transition-colors"
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？立即登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
