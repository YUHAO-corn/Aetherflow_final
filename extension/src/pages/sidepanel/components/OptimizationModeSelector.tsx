import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Sparkles, Lightbulb, Scissors } from 'lucide-react';
import type { OptimizationMode } from '../../../services/optimization';

interface OptimizationModeOption {
  id: OptimizationMode;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface OptimizationModeSelectorProps {
  selectedMode: OptimizationMode;
  onSelectMode: (mode: OptimizationMode) => void;
  buttonClassName?: string;
  iconOnly?: boolean;
}

export function OptimizationModeSelector({
  selectedMode,
  onSelectMode,
  buttonClassName = '',
  iconOnly = true
}: OptimizationModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 优化模式选项
  const modeOptions: OptimizationModeOption[] = [
    {
      id: 'standard',
      name: '标准模式',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      description: '平衡优化效果'
    },
    {
      id: 'creative',
      name: '创意模式',
      icon: <Lightbulb className="w-4 h-4 text-blue-400" />,
      description: '增强创意表达'
    },
    {
      id: 'concise',
      name: '简洁模式',
      icon: <Scissors className="w-4 h-4 text-green-400" />,
      description: '精简冗余内容'
    }
  ];
  
  // 获取当前选中的模式
  const currentMode = modeOptions.find(mode => mode.id === selectedMode) || modeOptions[0];
  
  // 切换下拉菜单
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  
  // 选择模式
  const handleSelectMode = (mode: OptimizationMode, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectMode(mode);
    setIsOpen(false);
  };
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (buttonRef.current && !buttonRef.current.contains(event.target as Node)) &&
        (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 下拉菜单位置
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0
  });
  
  // 更新下拉菜单位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);
  
  // 渲染下拉菜单
  const renderDropdown = () => {
    if (!isOpen) return null;
    
    const menu = (
      <div 
        ref={dropdownRef}
        className="fixed w-52 bg-magic-800 rounded-lg shadow-lg border border-magic-600/30 p-1"
        style={{
          zIndex: 999999,
          top: dropdownPosition.top,
          right: dropdownPosition.right,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 150ms ease-out'
        }}
      >
        {modeOptions.map(mode => (
          <div
            key={mode.id}
            onClick={(e) => handleSelectMode(mode.id, e)}
            className={`
              flex items-start px-3 py-2 rounded-md cursor-pointer transition-colors
              ${selectedMode === mode.id ? 'bg-magic-600/15 border-l-2 border-magic-500' : 'hover:bg-magic-700/50'}
            `}
          >
            <div className="flex-shrink-0 pt-0.5">{mode.icon}</div>
            <div className="ml-2">
              <div className="text-sm font-medium text-magic-200">{mode.name}</div>
              <div className="text-xs text-magic-400">{mode.description}</div>
            </div>
          </div>
        ))}
      </div>
    );
    
    return ReactDOM.createPortal(
      menu,
      document.body
    );
  };
  
  return (
    <div className="relative inline-block">
      {/* 模式选择按钮 */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`inline-flex items-center justify-center space-x-1 px-2 py-2 rounded text-sm text-magic-200 hover:bg-magic-600/30 transition-colors ${buttonClassName}`}
        title={currentMode.name}
      >
        {currentMode.icon}
        {!iconOnly && <span className="ml-1">{currentMode.name}</span>}
        <ChevronDown className="w-3 h-3 text-magic-400 ml-1" />
      </button>
      
      {/* 使用Portal渲染下拉菜单 */}
      {renderDropdown()}
    </div>
  );
} 