import React from 'react';
import { HoverEffect } from './HoverEffect';
import { Shimmer } from './Shimmer';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ title, children, actions, className = '', onClick }: CardProps) {
  const cardClassNames = `
    bg-gradient-to-br from-magic-800 to-magic-900 border border-magic-700/30
    rounded-lg p-3 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}
  `;
  
  const content = (
    <div className={cardClassNames} onClick={onClick}>
      <div className="relative">
        {title && (
          <h3 className="text-sm font-medium text-magic-200 mb-2 relative z-raised overflow-hidden text-ellipsis whitespace-nowrap w-full">{title}</h3>
        )}
        
        <div className="relative z-raised">{children}</div>
        
        {actions && (
          <div className="flex items-center justify-end mt-3 relative z-raised">{actions}</div>
        )}
      </div>
    </div>
  );
  
  return onClick ? <HoverEffect>{content}</HoverEffect> : content;
}
