import React from 'react';

interface HoverEffectProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverEffect({ children, className = '' }: HoverEffectProps) {
  return (
    <div
      className={`transform transition-all duration-300 hover:-rotate-1 hover:scale-[1.02] ${className}`}
    >
      {children}
    </div>
  );
}
