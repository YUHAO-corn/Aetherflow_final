import React from 'react';

interface ProBadgeProps {
  // 是否为活跃PRO会员
  isActive: boolean;
  
  // 点击处理函数
  onClick?: () => void;
  
  // 尺寸变体: 'sm', 'md', 'lg'
  size?: 'sm' | 'md' | 'lg';
  
  // 附加类名
  className?: string;
}

/**
 * 会员PRO标识组件
 * 显示在用户头像左边，指示用户的会员状态
 */
export const ProBadge: React.FC<ProBadgeProps> = ({
  isActive,
  onClick,
  size = 'md',
  className = ''
}) => {
  // 根据尺寸确定样式
  const sizeClasses = {
    sm: 'text-[8px] py-0.5 px-1.5 h-4',
    md: 'text-xs py-0.5 px-2 h-5',
    lg: 'text-sm py-1 px-2.5 h-6'
  };
  
  // 根据激活状态确定样式
  const activeClasses = isActive
    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold shadow-sm'
    : 'bg-magic-700/50 text-magic-400/70 font-medium';
  
  // 基础样式
  const baseClasses = 'rounded-md uppercase tracking-wider cursor-pointer transition-all duration-300 select-none';
  
  // 悬停和聚焦状态
  const hoverClasses = isActive
    ? 'hover:from-yellow-300 hover:to-amber-400 hover:shadow-md'
    : 'hover:bg-magic-700 hover:text-magic-300';
  
  // 完整样式类名
  const badgeClasses = `${baseClasses} ${activeClasses} ${sizeClasses[size]} ${hoverClasses} ${className}`;
  
  return (
    <div
      className={badgeClasses}
      onClick={onClick}
      aria-label={isActive ? 'Pro 会员' : '升级到 Pro'}
      title={isActive ? 'Pro 会员' : '升级到 Pro'}
      role="button"
      tabIndex={0}
    >
      PRO
    </div>
  );
}; 