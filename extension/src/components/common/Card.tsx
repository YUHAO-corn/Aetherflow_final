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
  return (
    <HoverEffect>
      <div
        onClick={onClick}
        className={`relative p-4 bg-gradient-to-r from-magic-800/50 via-magic-700/30 to-magic-800/50 border border-magic-700/30 rounded-lg group ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {title && (
          <h3 className="text-sm font-medium text-magic-200 mb-2 relative z-10">{title}</h3>
        )}
        <div className="relative z-10">{children}</div>
        {actions && (
          <div className="flex items-center justify-end mt-3 relative z-10">{actions}</div>
        )}
        <Shimmer />
      </div>
    </HoverEffect>
  );
}
