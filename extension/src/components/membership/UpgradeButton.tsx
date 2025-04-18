import React, { useCallback } from 'react';
import { Rocket, Zap } from 'lucide-react';
import { authService } from '../../services/auth';

interface UpgradeButtonProps {
  // 来源标识(用于跟踪)
  source?: string;
  
  // 是否为Pro会员
  isProMember: boolean;
  
  // 按钮文本(默认为"Upgrade")，仅在非Pro状态显示
  label?: string;
  
  // 点击处理函数
  onClick?: () => void;
  
  // 按钮变体: 'primary', 'text', 'icon'
  variant?: 'primary' | 'text' | 'icon';
  
  // 附加类名
  className?: string;
}

/**
 * 升级按钮组件
 * 显示在侧边栏左下角，用于引导用户升级到Pro版本
 */
export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  source = 'sidebar',
  isProMember,
  label = 'Upgrade',
  onClick,
  variant = 'primary',
  className = ''
}) => {
  // 处理按钮点击，附加来源信息
  const handleClick = useCallback(async () => {
    if (onClick) {
      onClick();
    } else {
      try {
        // 获取当前登录用户
        const currentUser = await authService.getCurrentUser();
        const pricingUrl = `https://aetherflow-app.github.io/pricing.html?source=${source}`;

        if (currentUser) {
          // 用户已登录，生成带认证令牌的URL并跳转到定价页面
          const targetPath = '/pricing.html';
          const params = { 
            source: source,
            uid: currentUser.uid,
            email: currentUser.email || ''
          };
          const authUrl = await authService.generateWebsiteAuthUrl(targetPath, params);
          window.open(authUrl, '_blank');
        } else {
          // 用户未登录，直接跳转到定价页面，不显示弹窗
          window.open(pricingUrl, '_blank');
        }
      } catch (error) {
        console.error('跳转到升级页面失败:', error);
        // 降级：如果生成认证URL失败或发生其他错误，使用普通URL
        const pricingUrl = `https://aetherflow-app.github.io/pricing.html?source=${source}`;
        window.open(pricingUrl, '_blank');
      }
    }
  }, [onClick, source]);
  
  // 根据会员状态和变体确定样式
  const getButtonClasses = () => {
    // 基础样式
    let baseClasses = 'flex items-center transition-all duration-300 rounded-md';
    
    // Pro会员样式(闪电按钮)
    if (isProMember) {
      return `${baseClasses} text-yellow-400 hover:text-yellow-300 p-1.5 ${className}`;
    }
    
    // 非Pro会员样式
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-brand-blue hover:bg-brand-blue-dark text-white py-1.5 px-3 ${className}`;
      case 'text':
        return `${baseClasses} text-magic-400 hover:text-magic-300 ${className}`;
      case 'icon':
        return `${baseClasses} text-brand-blue hover:text-brand-blue-dark ${className}`;
      default:
        return `${baseClasses} ${className}`;
    }
  };
  
  return (
    <button
      className={getButtonClasses()}
      onClick={handleClick}
      aria-label={isProMember ? 'Pro Membership Activated' : 'Upgrade to Pro Version'}
      title={isProMember ? 'Pro Membership Activated' : 'Upgrade to Pro Version'}
    >
      {isProMember ? (
        <Zap size={18} className="animate-pulse" />
      ) : (
        <>
          {variant !== 'text' && <Rocket size={16} className="mr-1.5" />}
          {variant !== 'icon' && <span>{label}</span>}
        </>
      )}
    </button>
  );
}; 