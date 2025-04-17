import React, { useState } from 'react';
import { useCloudSync } from '../../../hooks';
import { formatDistanceToNow } from 'date-fns';

type TooltipProps = {
  children: React.ReactNode;
  content: string;
  isError?: boolean;
};

// 简单的悬停提示组件
const Tooltip: React.FC<TooltipProps> = ({ children, content, isError }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div 
          className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded-lg text-sm 
                     bg-slate-900 text-white shadow-lg transition-opacity duration-150 
                     ${isError ? 'w-[180px]' : 'w-[140px]'}`}
        >
          {content}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
        </div>
      )}
    </div>
  );
};

// 同步状态指示器组件
const SyncStatusIndicator: React.FC = () => {
  const { 
    syncStatus, 
    lastSyncTime, 
    syncAll, 
    syncError, 
    isSyncing,
    pendingOperationsCount,
    isOnline
  } = useCloudSync();
  
  // 处理点击事件
  const handleClick = async () => {
    if (syncStatus.status === 'error') {
      // 重置错误状态（通过重新同步）
    }
    
    if (syncStatus.status !== 'syncing' && isOnline) {
      try {
        await syncAll();
      } catch (error) {
        console.error('手动同步失败:', error);
      }
    }
  };
  
  // 计算tooltip内容
  const getTooltipContent = () => {
    switch (syncStatus.status) {
      case 'idle':
        if (lastSyncTime) {
          return `已同步: ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`;
        }
        return '点击开始同步';
      case 'syncing':
        return '同步中...';
      case 'error':
        return syncError ? `同步错误: ${syncError}` : '同步错误，点击重试';
      case 'offline':
        return '离线模式';
      default:
        return '点击开始同步';
    }
  };
  
  // 获取同步状态图标和颜色
  const getStatusStyles = () => {
    switch (syncStatus.status) {
      case 'idle':
        return {
          bgColor: '#10b981', // 绿色
          fillColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10b981',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )
        };
      case 'syncing':
        return {
          bgColor: '#6366f1', // 蓝紫色
          fillColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: '#6366f1',
          icon: (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: '#f43f5e', // 红色
          fillColor: 'rgba(244, 63, 94, 0.1)',
          borderColor: '#f43f5e',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )
        };
      case 'offline':
        return {
          bgColor: '#6b7280', // 灰色
          fillColor: 'rgba(107, 114, 128, 0.1)',
          borderColor: '#6b7280',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1l22 22m-4-4H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10M10 10l4 4m0-4l-4 4" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )
        };
      default:
        return {
          bgColor: '#64748b', // 默认蓝灰色
          fillColor: 'rgba(100, 116, 139, 0.1)',
          borderColor: '#64748b',
          icon: null
        };
    }
  };
  
  const { bgColor, fillColor, borderColor, icon } = getStatusStyles();
  
  // 渲染指示器
  return (
    <Tooltip content={getTooltipContent()} isError={syncStatus.status === 'error'}>
      <button
        onClick={handleClick}
        disabled={syncStatus.status === 'syncing'}
        aria-label={`同步状态: ${syncStatus.status}`}
        className={`relative flex items-center justify-center w-6 h-6 rounded-full 
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 
                   focus-visible:ring-2 transition-transform duration-200 hover:scale-105
                   ${syncStatus.status === 'syncing' ? 'cursor-wait' : 'cursor-pointer'}`}
        style={{ color: bgColor }}
      >
        {/* 圆环指示器 */}
        <div 
          className="absolute inset-0.5 rounded-full"
          style={{ backgroundColor: fillColor, border: `1.5px solid ${borderColor}` }}
        />
        
        {/* 状态图标 */}
        <div className="relative z-10">
          {icon}
        </div>
        
        {/* 待处理操作指示器 */}
        {pendingOperationsCount > 0 && syncStatus.status !== 'syncing' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">{pendingOperationsCount > 9 ? '9+' : pendingOperationsCount}</span>
          </div>
        )}
      </button>
    </Tooltip>
  );
};

export default SyncStatusIndicator; 