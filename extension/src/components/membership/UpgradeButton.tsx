import React from 'react';
import { Rocket, Zap } from 'lucide-react';

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
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // 默认行为：开启新标签页访问升级页面
      window.open(`https://aetherflow-app.github.io/pricing.html?source=${source}`, '_blank');
    }
  };
  
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
      aria-label={isProMember ? 'Pro 会员已激活' : '升级到 Pro 版本'}
      title={isProMember ? 'Pro 会员已激活' : '升级到 Pro 版本'}
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