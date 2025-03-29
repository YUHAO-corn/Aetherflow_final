import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Lightbulb, Scissors } from 'lucide-react';

type OptimizationMode = 'standard' | 'creative' | 'concise';

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
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // 选择模式
  const handleSelectMode = (mode: OptimizationMode) => {
    onSelectMode(mode);
    setIsOpen(false);
  };
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* 模式选择按钮 */}
      <button
        onClick={toggleDropdown}
        className={`inline-flex items-center justify-center space-x-1 px-2 py-2 rounded text-sm text-magic-200 hover:bg-magic-600/30 transition-colors ${buttonClassName}`}
        title={currentMode.name}
      >
        {currentMode.icon}
        {!iconOnly && <span className="ml-1">{currentMode.name}</span>}
        <ChevronDown className="w-3 h-3 text-magic-400 ml-1" />
      </button>
      
      {/* 下拉菜单 */}
      {isOpen && (
        <div 
          className="fixed right-0 mt-1 w-52 bg-magic-800 backdrop-blur-sm rounded-lg shadow-lg border border-magic-600/30 p-1"
          style={{
            zIndex: 9999,
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 5 : 0,
            right: dropdownRef.current ? window.innerWidth - dropdownRef.current.getBoundingClientRect().right : 0,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 150ms ease-out'
          }}
        >
          {modeOptions.map(mode => (
            <div
              key={mode.id}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectMode(mode.id);
              }}
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
      )}
    </div>
  );
} 