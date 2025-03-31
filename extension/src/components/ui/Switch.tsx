import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ 
  checked, 
  onChange, 
  label, 
  description, 
  disabled = false,
  className = ''
}: SwitchProps) {
  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex-1">
        {label && (
          <label className="text-sm font-medium text-magic-200 cursor-pointer">
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-magic-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex flex-shrink-0 h-6 w-11 rounded-full 
          transition-colors ease-in-out duration-200 focus:outline-none 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${checked 
            ? 'bg-indigo-500 border-indigo-600' 
            : 'bg-magic-700 border-magic-600'
          }
        `}
      >
        <span 
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full 
            bg-white shadow transform ring-0 transition ease-in-out duration-200 
            ${checked ? 'translate-x-5' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
} 