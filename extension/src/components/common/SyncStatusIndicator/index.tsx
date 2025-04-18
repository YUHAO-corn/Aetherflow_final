import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { cloudStorageService } from '../../../services/storage/cloudStorage';
import { SyncStatusMessage } from '../../../services/storage/cloudStorage';

interface SyncStatusIndicatorProps {
  className?: string;
}

/**
 * 同步状态指示器组件
 * 显示云同步状态，并提供手动触发同步的功能
 */
const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusMessage>({ 
    status: 'idle', 
    timestamp: Date.now() 
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 监听同步状态变化
  useEffect(() => {
    const unsubscribe = cloudStorageService.onSyncStatusChange((status) => {
      setSyncStatus(status);
      if (status.status === 'syncing') {
        setIsSyncing(true);
      } else {
        // 延迟关闭同步状态，以便显示完成动画
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    });
    
    // 清理函数
    return unsubscribe;
  }, []);

  // 获取状态图标
  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'synced':
        return <Cloud size={18} className="text-green-400"><Check size={12} /></Cloud>;
      case 'syncing':
        return <RefreshCw size={18} className="text-blue-400 animate-spin" />;
      case 'error':
        return <AlertTriangle size={18} className="text-red-400" />;
      case 'offline':
        return <CloudOff size={18} className="text-gray-400" />;
      case 'idle':
      default:
        return <Cloud size={18} className="text-gray-400" />;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    if (syncStatus.message) {
      return syncStatus.message;
    }
    
    switch (syncStatus.status) {
      case 'synced':
        return '已同步';
      case 'syncing':
        return '同步中...';
      case 'error':
        return '同步失败';
      case 'offline':
        return '离线状态';
      case 'idle':
      default:
        return '未同步';
    }
  };

  // 手动触发同步
  const handleSync = async () => {
    if (syncStatus.status === 'syncing' || isSyncing) {
      return;
    }
    
    try {
      setIsSyncing(true);
      await cloudStorageService.syncAllPrompts();
    } catch (error) {
      console.error('手动同步失败:', error);
    }
  };

  // 计算样式类
  const getContainerClass = () => {
    let baseClass = 'flex items-center rounded-full px-2 py-1 transition-all duration-300 cursor-pointer ';
    
    if (isHovered) {
      baseClass += 'bg-magic-700 ';
    }
    
    if (isSyncing) {
      baseClass += 'opacity-100 ';
    } else {
      baseClass += 'opacity-80 hover:opacity-100 ';
    }
    
    return baseClass + className;
  };

  return (
    <div
      className={getContainerClass()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSync}
      title="点击手动同步"
    >
      <div className="mr-1.5">
        {getStatusIcon()}
      </div>
      
      <div className={`overflow-hidden transition-all duration-300 ${isHovered ? 'max-w-xs' : 'max-w-0'}`}>
        <span className="text-xs whitespace-nowrap">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default SyncStatusIndicator; 